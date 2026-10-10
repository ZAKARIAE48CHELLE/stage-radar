from datetime import date
from pathlib import Path
import json

from scraper.models import Offer
from scraper.run import load_cfg, export
from scraper.scoring import analyse, is_relevant, compute_score
from scraper.sources.stagiaires_ma import parse_offer
from scraper.storage import Store

ROOT = Path(__file__).resolve().parent.parent
CFG = load_cfg(ROOT / "config" / "profile.yaml")
FIX = Path(__file__).parent / "fixtures"
URL = "https://stagiaires.ma/stage-emploi-maroc/6873-stagiaire-en-data-f-h"


def test_parse_jsonld_offer():
    o = parse_offer((FIX / "offer_genai.html").read_text(encoding="utf-8"), URL)
    assert o.title == "Stagiaire en Data (F/H)"
    assert o.company == "SOFRECOM"
    assert o.city == "Casablanca"
    assert o.modality == "Hybride"          # from header card, not the nav "Télétravail" link
    assert o.date_posted == "2026-10-01"
    assert o.valid_through == "2026-10-31"
    assert o.employment_type == "INTERN"
    assert "LangGraph" in o.description
    assert o.url.startswith("https://www.stagiaires.ma/")


def test_scoring_genai_offer_is_relevant_and_high():
    o = analyse(parse_offer((FIX / "offer_genai.html").read_text(encoding="utf-8"), URL), CFG)
    ok, why = is_relevant(o, CFG, today=date(2026, 10, 9))
    assert ok, why
    assert o.domain == "IA Agentique & GenAI"
    assert o.is_pfe
    assert o.score >= 75
    assert "langgraph" in o.keywords


def test_expired_and_offtopic_are_dropped():
    o = analyse(parse_offer((FIX / "offer_genai.html").read_text(encoding="utf-8"), URL), CFG)
    assert is_relevant(o, CFG, today=date(2026, 11, 15)) == (False, "too old") or \
        is_relevant(o, CFG, today=date(2026, 11, 15))[1] == "expired"
    hr = analyse(Offer(url="u", source="s", title="Stagiaire RH",
                       description="Stage RH avec outils IA et data"), CFG)
    assert not is_relevant(hr, CFG)[0]


def test_remunere_detection():
    paid = analyse(Offer(url="u1", source="s", title="Stage Data Engineer Rémunéré",
                         description="Stage avec gratification mensuelle"), CFG)
    assert paid.is_paid is True

    unpaid = analyse(Offer(url="u2", source="s", title="Stage IA non rémunéré",
                           description="Stage non remunere sans remuneration"), CFG)
    assert unpaid.is_paid is False

    standard = analyse(Offer(url="u3", source="s", title="Stage PFE Machine Learning",
                             description="Conception de pipelines ML"), CFG)
    assert standard.is_paid is False


def test_compute_score_bounds():
    w = CFG["weights"]
    assert compute_score({}, w) == 0
    assert compute_score({"genai": 12}, w) == 100
    assert compute_score({"cvsec": 1}, w) < compute_score({"genai": 1}, w)


def test_export_roundtrip(tmp_path):
    store = Store(tmp_path / "t.db")
    o = parse_offer((FIX / "offer_genai.html").read_text(encoding="utf-8"), URL)
    assert store.upsert(o) is True
    assert store.upsert(o) is False
    # export uses today's date; make the fixture look fresh
    import scraper.run as run
    real = run.datetime

    class Fixed(real):
        @classmethod
        def now(cls, tz=None):
            return real(2026, 10, 9, 8, 0, tzinfo=tz)
    run.datetime = Fixed
    try:
        kept = export(CFG, store, tmp_path, {o.url})
    finally:
        run.datetime = real
    assert len(kept) == 1 and kept[0]["new_today"]
    data = json.loads((tmp_path / "offers.json").read_text(encoding="utf-8"))
    assert data["offers"][0]["company"] == "SOFRECOM"
    assert (tmp_path / "offers.csv").read_text(encoding="utf-8-sig").startswith("score,title")
