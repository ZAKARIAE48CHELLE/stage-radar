from datetime import date
from pathlib import Path

import scraper.run as run
from scraper import supabase_sync
from scraper.models import Offer
from scraper.storage import Store

ROOT = Path(__file__).resolve().parent.parent
CFG = run.load_cfg(ROOT / "config" / "profile.yaml")


def offer(url, title, desc="Stage PFE en développement logiciel Python", company="Co", **kw):
    return Offer(url=url, source=kw.pop("source", "dreamjob.ma"), title=title, company=company,
                 description=desc, date_posted=kw.pop("date_posted", "2026-10-05"), **kw)


def make_store(tmp_path):
    st = Store(tmp_path / "s.db")
    st.upsert(offer("u1", "Stage PFE Développeur Java", "Spring Boot, Angular, stage de fin d'études"))
    st.upsert(offer("u2", "Stage PFE Développeur Java", "Spring Boot", source="stagiaires.ma"))  # duplicate
    st.upsert(offer("u3", "Stage Génie Industriel", "Lean, amélioration continue, méthodes", company="Valeo"))
    st.upsert(offer("u4", "Stagiaire RH", "Recrutement et paie", company="X"))               # field not covered
    st.upsert(offer("u5", "Ingénieur DevOps", "CDI, 3 ans d'expérience Kubernetes"))         # not an internship
    st.upsert(offer("u6", "Stage Data", "SQL", valid_through="2026-09-01"))                   # expired
    return st


def test_select_rows_broad_filter_and_dedupe(tmp_path):
    rows, reasons = supabase_sync.select_rows(CFG, make_store(tmp_path), today=date(2026, 10, 10))
    titles = sorted(r["title"] for r in rows)
    assert titles == ["Stage Génie Industriel", "Stage PFE Développeur Java"]
    java = next(r for r in rows if "Java" in r["title"])
    assert java["url"] == "u1" and java["also_on"] == [{"source": "stagiaires.ma", "url": "u2"}]
    assert java["is_pfe"] and java["text_norm"].startswith("stage pfe developpeur java")
    assert reasons["duplicate"] == 1 and reasons["expired"] == 1
    assert reasons["not an internship"] == 1 and reasons["field not covered"] == 1


class FakeClient:
    def __init__(self):
        self.calls = []

    def post(self, path, payload, prefer="return=minimal"):
        self.calls.append((path, payload, prefer))

        class R:
            def json(self_inner):
                return 7
        return R()


def test_push_upserts_then_deactivates_and_logs_run(tmp_path, monkeypatch):
    monkeypatch.setattr(supabase_sync, "select_rows",
                        lambda cfg, store: ([{"url": "a", "source": "s"}, {"url": "b", "source": "s"}], {"ok": 2}))
    c = FakeClient()
    stats = supabase_sync.push(CFG, make_store(tmp_path), client=c)
    paths = [p for p, _, _ in c.calls]
    assert paths == ["offers?on_conflict=url", "rpc/deactivate_unsynced", "scrape_runs"]
    rows = c.calls[0][1]
    assert all(r["active"] and r["synced_at"] == c.calls[1][1]["run_started"] for r in rows)
    assert "merge-duplicates" in c.calls[0][2]
    assert stats["synced"] == 2 and stats["deactivated"] == 7


def test_push_never_deactivates_on_empty_run(tmp_path, monkeypatch):
    monkeypatch.setattr(supabase_sync, "select_rows", lambda cfg, store: ([], {}))
    c = FakeClient()
    supabase_sync.push(CFG, Store(tmp_path / "e.db"), client=c)
    assert [p for p, _, _ in c.calls] == ["scrape_runs"]


def test_push_skipped_without_credentials(tmp_path, monkeypatch):
    monkeypatch.delenv("SUPABASE_URL", raising=False)
    monkeypatch.delenv("SUPABASE_SERVICE_ROLE_KEY", raising=False)
    assert supabase_sync.push(CFG, Store(tmp_path / "n.db")) is None
