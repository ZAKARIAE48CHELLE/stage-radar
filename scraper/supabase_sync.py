"""Push offers from the local store to the Supabase `offers` table (multi-user app).

Every user gets their own scores in the app (SQL function my_matches), so here we only
select *broadly*: internships in tech/engineering fields (config `platform:`), not expired,
not removed from the source site, de-duplicated across sites.

Needs env vars SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (GitHub secrets). The service
role key bypasses row-level security: keep it out of the website and out of git.
"""
from __future__ import annotations

import logging
import os
from datetime import date, datetime, timedelta, timezone

import requests

from .models import Offer
from .storage import Store
from .text import norm, contains_any

log = logging.getLogger(__name__)
BATCH = 200
DESC_MAX = 4000


def _keep(o: Offer, pcfg: dict, today: date) -> tuple[bool, str]:
    title_n = norm(o.title)
    full = title_n + " " + norm(o.description)
    if pcfg.get("require_internship", True):
        if "INTERN" not in o.employment_type.upper() and not contains_any(full, pcfg["internship_any"]):
            return False, "not an internship"
    if pcfg.get("title_exclude_any") and contains_any(title_n, pcfg["title_exclude_any"]):
        return False, "title excluded"
    if pcfg.get("field_any") and not contains_any(full, pcfg["field_any"]):
        return False, "field not covered"
    try:
        if o.date_posted and date.fromisoformat(o.date_posted) < today - timedelta(days=pcfg["max_age_days"]):
            return False, "too old"
        if o.valid_through and date.fromisoformat(o.valid_through) < today:
            return False, "expired"
    except ValueError:
        pass
    return True, "ok"


def select_rows(cfg: dict, store: Store, today: date | None = None,
                sitemap_source: str = "stagiaires.ma") -> tuple[list[dict], dict]:
    pcfg = cfg["platform"]
    today = today or datetime.now(timezone.utc).date()
    rows = store.all()
    latest = max((r[2] for r in rows if r[0].source == sitemap_source), default="")
    stale_before = (datetime.fromisoformat(latest) - timedelta(days=3)).isoformat() if latest else ""

    reasons: dict[str, int] = {}
    kept: list[dict] = []
    for o, first_seen, last_seen in rows:
        if o.source == sitemap_source and stale_before and last_seen < stale_before:
            why = "removed from site"
        else:
            ok, why = _keep(o, pcfg, today)
        reasons[why] = reasons.get(why, 0) + 1
        if why != "ok":
            continue
        desc = o.description[:DESC_MAX]
        full_n = norm(o.title + " " + desc)
        kept.append({
            "url": o.url, "source": o.source, "title": o.title[:300], "company": o.company[:150],
            "city": o.city, "modality": o.modality,
            "date_posted": o.date_posted or None, "valid_through": o.valid_through or None,
            "is_pfe": contains_any(full_n, ["pfe", "fin d'etudes", "fin d etudes", "projet de fin"]),
            "description": desc, "title_norm": norm(o.title), "text_norm": full_n,
            "first_seen": first_seen[:10], "also_on": [],
        })

    # one row per real offer: keep the most detailed copy, list the others in also_on
    best: dict[str, dict] = {}
    for r in sorted(kept, key=lambda r: len(r["description"]), reverse=True):
        k = r["title_norm"][:70] + "|" + norm(r["company"])[:30]
        if k in best:
            best[k]["also_on"].append({"source": r["source"], "url": r["url"]})
            best[k]["first_seen"] = min(best[k]["first_seen"], r["first_seen"])
        else:
            best[k] = r
    if len(best) < len(kept):
        reasons["duplicate"] = len(kept) - len(best)
    return list(best.values()), reasons


class SupabaseREST:
    def __init__(self, url: str, key: str, session: requests.Session | None = None):
        self.base = url.rstrip("/") + "/rest/v1"
        self.s = session or requests.Session()
        self.s.headers.update({"apikey": key, "Authorization": f"Bearer {key}",
                               "Content-Type": "application/json"})

    def post(self, path: str, payload, prefer: str = "return=minimal"):
        r = self.s.post(f"{self.base}/{path}", json=payload, headers={"Prefer": prefer}, timeout=60)
        if r.status_code >= 300:
            raise RuntimeError(f"Supabase {path} → HTTP {r.status_code}: {r.text[:300]}")
        return r


def push(cfg: dict, store: Store, client: SupabaseREST | None = None, stats_extra: dict | None = None) -> dict | None:
    url, key = os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    if client is None:
        if not (url and key):
            log.info("Supabase not configured (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY) — sync skipped")
            return None
        client = SupabaseREST(url, key)

    run_started = datetime.now(timezone.utc).isoformat()
    rows, reasons = select_rows(cfg, store)
    for r in rows:
        r["active"] = True
        r["synced_at"] = run_started
    for i in range(0, len(rows), BATCH):
        client.post("offers?on_conflict=url", rows[i:i + BATCH],
                    prefer="resolution=merge-duplicates,return=minimal")

    deactivated = 0
    if rows:  # never wipe the board because of an empty run
        r = client.post("rpc/deactivate_unsynced", {"run_started": run_started}, prefer="return=representation")
        try:
            deactivated = int(r.json())
        except (ValueError, TypeError):
            deactivated = 0
    stats = {"synced": len(rows), "deactivated": deactivated, "filter_reasons": reasons,
             "by_source": {}, **(stats_extra or {})}
    for r in rows:
        stats["by_source"][r["source"]] = stats["by_source"].get(r["source"], 0) + 1
    client.post("scrape_runs", {"stats": stats})
    log.info("Supabase: %d offers synced, %d deactivated", len(rows), deactivated)
    return stats
