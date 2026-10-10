"""Daily pipeline: discover → fetch new → store → filter & score everything → export JSON/CSV → alert.

Usage:
  python -m scraper.run                 # full daily run
  python -m scraper.run --no-fetch      # re-score stored offers only (after editing profile.yaml)
  python -m scraper.run --max 20 -v     # quick test run, verbose
"""
from __future__ import annotations

import argparse
import csv
import json
import logging
import os
from datetime import datetime, timedelta, timezone
from pathlib import Path

import yaml

from . import notify, supabase_sync
from .http import PoliteSession
from .scoring import analyse, is_relevant
from .sources import stagiaires_ma, dreamjob_ma, email_alerts
from .text import norm
from .storage import Store

ROOT = Path(__file__).resolve().parent.parent
log = logging.getLogger("stage-radar")


def load_cfg(path: Path) -> dict:
    with open(path, encoding="utf-8") as f:
        return yaml.safe_load(f)


def fetch(cfg: dict, store: Store, max_new: int | None) -> set[str]:
    """Fetch offers not yet in the store from every enabled source. Returns URLs inserted this run."""
    srcs, f = cfg["sources"], cfg["filters"]
    inserted: set[str] = set()

    def save(offers):
        for o in offers:
            if store.upsert(o):
                inserted.add(o.url)

    def run_source(name, fn):
        try:
            fn()
        except Exception as e:  # one broken source must never kill the others
            log.exception("source %s failed: %s", name, e)

    # 1) stagiaires.ma — sitemap discovery + JSON-LD detail pages
    sm = srcs.get("stagiaires_ma", {})
    if sm.get("enabled", True):
        def _stagiaires():
            session = PoliteSession(delay=sm.get("crawl_delay_seconds", 1.5))
            listed = stagiaires_ma.discover(session, sm["sitemaps"], f["max_age_days"])
            store.touch([u for u, _ in listed])
            known = store.known()
            todo = [u for u, _ in listed if u not in known]
            cap = max_new if max_new is not None else sm.get("max_new_per_run", 250)
            todo = todo[:cap]
            log.info("stagiaires.ma: %d new offer pages to fetch (cap %d)", len(todo), cap)
            for i, url in enumerate(todo, 1):
                o = stagiaires_ma.fetch_offer(session, url)
                if o:
                    save([o])
                if i % 25 == 0:
                    log.info("  … %d/%d", i, len(todo))
        run_source("stagiaires.ma", _stagiaires)

    # 2) dreamjob.ma — WordPress REST API
    dj = srcs.get("dreamjob_ma", {})
    if dj.get("enabled", False):
        def _dreamjob():
            session = PoliteSession(delay=dj.get("crawl_delay_seconds", 1.5))
            cap = max_new if max_new is not None else dj.get("max_new_per_run", 1500)
            save(dreamjob_ma.collect(session, dj, f["max_age_days"], store.known(), cap))
        run_source("dreamjob.ma", _dreamjob)

    # 3) job-alert e-mails (LinkedIn, Indeed, ReKrute, Emploi.ma…) from your own inbox
    em = srcs.get("email_alerts", {})
    if em.get("enabled", False):
        run_source("email", lambda: save(email_alerts.collect(em, store.known())))

    log.info("%d new offers stored this run", len(inserted))
    return inserted


def dedupe_key(o: dict) -> str:
    return norm(o["title"])[:70] + "|" + norm(o.get("company") or "")[:30]


def export(cfg: dict, store: Store, out_dir: Path, new_urls: set[str]) -> list[dict]:
    rows = store.all()
    today = datetime.now(timezone.utc).date()
    latest_seen = max((r[2] for r in rows if r[0].source == stagiaires_ma.NAME), default="")
    stale_before = ""
    if latest_seen:
        stale_before = (datetime.fromisoformat(latest_seen) - timedelta(days=3)).isoformat()

    kept, reasons = [], {}
    for offer, first_seen, last_seen in rows:
        if offer.source == stagiaires_ma.NAME and stale_before and last_seen < stale_before:
            reasons["removed from site"] = reasons.get("removed from site", 0) + 1
            continue
        analyse(offer, cfg)
        ok, why = is_relevant(offer, cfg, today)
        reasons[why] = reasons.get(why, 0) + 1
        if not ok:
            continue
        d = offer.to_dict()
        d["description"] = d["description"][:1800]
        d["first_seen"] = first_seen[:10]
        d["new_today"] = offer.url in new_urls or first_seen[:10] == today.isoformat()
        kept.append(d)

    # same offer posted on several sites → keep the best-scored copy, remember the others
    best: dict[str, dict] = {}
    for o in sorted(kept, key=lambda o: (o["score"], len(o["description"])), reverse=True):
        k = dedupe_key(o)
        if k in best:
            best[k].setdefault("also_on", []).append({"source": o["source"], "url": o["url"]})
            best[k]["new_today"] = best[k]["new_today"] or o["new_today"]
        else:
            best[k] = o
    if len(best) < len(kept):
        reasons["duplicate"] = len(kept) - len(best)
    kept = list(best.values())
    kept.sort(key=lambda o: (o["score"], o["date_posted"]), reverse=True)
    for i, o in enumerate(kept, 1):
        o["id"] = i
    log.info("Filter results: %s", reasons)

    payload = {
        "generated_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "profile": {
            "name": cfg["candidate"]["name"],
            "headline": cfg["candidate"]["headline"],
            "email": cfg["candidate"].get("email", ""),
            "weights": cfg["weights"],
            "axes": {k: v["label"] for k, v in cfg["axes"].items()},
            "pitch": cfg.get("pitch", {}),
            "bonus": cfg["scoring"],
        },
        "stats": {"stored": len(rows), "by_source": _count(kept, "source"), "kept": len(kept), "new_this_run": len(new_urls),
                  "filter_reasons": reasons},
        "offers": kept,
    }
    out_dir.mkdir(parents=True, exist_ok=True)
    (out_dir / "offers.json").write_text(json.dumps(payload, ensure_ascii=False, indent=1), encoding="utf-8")

    cols = ["score", "title", "company", "city", "modality", "domain", "source", "date_posted",
            "valid_through", "first_seen", "url"]
    with open(out_dir / "offers.csv", "w", newline="", encoding="utf-8-sig") as f:  # BOM → Excel-friendly
        w = csv.DictWriter(f, fieldnames=cols, extrasaction="ignore")
        w.writeheader()
        w.writerows(kept)
    log.info("Exported %d offers → %s", len(kept), out_dir)
    return kept


def _count(rows: list[dict], key: str) -> dict:
    out: dict = {}
    for r in rows:
        out[r[key]] = out.get(r[key], 0) + 1
    return out


def main(argv: list[str] | None = None) -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--config", default=ROOT / "config" / "profile.yaml", type=Path)
    ap.add_argument("--db", default=ROOT / "data" / "offers.db", type=Path)
    ap.add_argument("--out", default=ROOT / "docs" / "data", type=Path)
    ap.add_argument("--no-fetch", action="store_true", help="skip scraping, only re-score and export")
    ap.add_argument("--max", type=int, default=None, help="cap on new pages fetched this run")
    ap.add_argument("--no-sync", action="store_true", help="do not push offers to Supabase")
    ap.add_argument("--notify", action="store_true", help="send Telegram alert for new offers")
    ap.add_argument("-v", "--verbose", action="store_true")
    a = ap.parse_args(argv)
    logging.basicConfig(level=logging.DEBUG if a.verbose else logging.INFO,
                        format="%(asctime)s %(levelname)s %(message)s", datefmt="%H:%M:%S")

    cfg = load_cfg(a.config)
    store = Store(a.db)
    new_urls = set() if a.no_fetch else fetch(cfg, store, a.max)
    kept = export(cfg, store, a.out, new_urls)
    if not a.no_sync:
        try:
            supabase_sync.push(cfg, store, stats_extra={"new_this_run": len(new_urls)})
        except Exception as e:  # the personal dashboard export above is already done
            log.exception("Supabase sync failed: %s", e)
    if a.notify:
        new_picks = [o for o in kept if o["url"] in new_urls]
        notify.telegram(new_picks, cfg, os.getenv("DASHBOARD_URL", ""))
        notify.email(new_picks, cfg, os.getenv("DASHBOARD_URL", ""))


if __name__ == "__main__":
    main()
