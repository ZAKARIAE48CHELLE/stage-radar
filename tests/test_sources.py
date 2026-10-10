import json
from datetime import date
from pathlib import Path

import scraper.run as run
from scraper.models import Offer
from scraper.scoring import analyse, is_relevant
from scraper.sources import dreamjob_ma, email_alerts
from scraper.storage import Store

ROOT = Path(__file__).resolve().parent.parent
CFG = run.load_cfg(ROOT / "config" / "profile.yaml")

WP_POST = {
    "id": 1, "date": "2026-10-08T10:00:00",
    "link": "https://www.dreamjob.ma/emploi/dataco-recrute-des-stagiaires-pfe-data-ia-a-tanger/",
    "title": {"rendered": "DataCo recrute des stagiaires PFE Data &amp; IA à Tanger"},
    "content": {"rendered": "<p>Dans le cadre de sa croissance, DataCo recrute des stagiaires PFE.</p>"
                "<ul><li>Développer des pipelines Spark et Airflow</li><li>Mettre en place un RAG avec LangChain"
                "</li><li>Déployer avec Docker</li></ul><p>Mode hybride. Profil : machine learning, SQL.</p>"},
}


class FakeResp:
    def __init__(self, data): self._d = data
    def json(self): return self._d


class FakeSession:
    def __init__(self, pages): self.pages, self.urls = pages, []
    def get(self, url):
        self.urls.append(url)
        page = int(url.split("&page=")[1].split("&")[0])
        return FakeResp(self.pages[page - 1]) if page <= len(self.pages) else None


def test_dreamjob_post_to_offer():
    o = dreamjob_ma.post_to_offer(WP_POST)
    assert o.title == "DataCo recrute des stagiaires PFE Data & IA à Tanger"
    assert o.company == "DataCo"
    assert o.city == "Tanger"
    assert o.modality == "Hybride"
    assert o.employment_type == "INTERN"
    assert o.date_posted == "2026-10-08"
    o = analyse(o, CFG)
    assert is_relevant(o, CFG, today=date(2026, 10, 9))[0]


def test_dreamjob_collect_stops_at_known_and_respects_cap():
    other = dict(WP_POST, link="https://www.dreamjob.ma/emploi/x/")
    s = FakeSession([[WP_POST] * 1 + [other], [other]])
    got = dreamjob_ma.collect(s, {}, 45, known={other["link"]}, cap=10)
    assert [o.url for o in got] == [WP_POST["link"]]
    assert all("/wp-json/wp/v2/posts?" in u and "after=" in u for u in s.urls)


ALERT = """<html><body><table>
<tr><td><a href="https://www.linkedin.com/comm/jobs/view/4012345678/?trackingId=abc"><img src="logo.png"></a></td>
<td><a href="https://www.linkedin.com/comm/jobs/view/4012345678/?trackingId=abc">Stage PFE - Data Scientist / LLM</a>
<p>Inwi · Casablanca, Maroc (Hybride)</p></td></tr>
<tr><td><a href="https://ma.indeed.com/rc/clk?jk=9f8e7d6c5b4a3210&from=ja">Stagiaire Data Engineer Spark</a>
<span>OCP Group - Benguerir</span></td></tr>
<tr><td><a href="https://click.example.com/track?url=https%3A%2F%2Fwww.rekrute.com%2Foffre-emploi-stage-pfe-ia-123456.html">Stage PFE Intelligence Artificielle</a>
<span>Capgemini - Rabat</span></td></tr>
<tr><td><a href="https://www.linkedin.com/comm/jobs/alerts">Gérer vos alertes</a></td></tr>
</table></body></html>"""


def test_email_alert_parsing():
    offers = {o.url: o for o in email_alerts.parse_alert_html(ALERT, "2026-10-09")}
    li = offers["https://www.linkedin.com/jobs/view/4012345678/"]
    assert li.title == "Stage PFE - Data Scientist / LLM"
    assert li.source == "email:LinkedIn" and li.city == "Casablanca" and li.modality == "Hybride"
    assert li.company.startswith("Inwi")
    ind = offers["https://ma.indeed.com/viewjob?jk=9f8e7d6c5b4a3210"]
    assert ind.city == "Benguerir"
    assert "https://www.rekrute.com/offre-emploi-stage-pfe-ia-123456.html" in offers
    assert len(offers) == 3  # the "manage alerts" link is ignored
    # short e-mail offers still pass the relevance filter with the relaxed threshold
    assert is_relevant(analyse(li, CFG), CFG, today=date(2026, 10, 9))[0]


def test_email_collect_without_credentials_is_noop(monkeypatch):
    monkeypatch.delenv("IMAP_USER", raising=False)
    assert email_alerts.collect({"senders": ["linkedin.com"]}, set()) == []


def test_cross_source_dedupe(tmp_path):
    store = Store(tmp_path / "d.db")
    a = dreamjob_ma.post_to_offer(WP_POST)
    b = Offer(**{**a.to_dict(), "url": "https://www.stagiaires.ma/stage-emploi-maroc/1-x",
                 "source": "stagiaires.ma"})
    for o in (a, b):
        store.upsert(o)
    real = run.datetime

    class Fixed(real):
        @classmethod
        def now(cls, tz=None):
            return real(2026, 10, 9, 8, 0, tzinfo=tz)
    run.datetime = Fixed
    try:
        kept = run.export(CFG, store, tmp_path, set())
    finally:
        run.datetime = real
    assert len(kept) == 1 and len(kept[0]["also_on"]) == 1
    data = json.loads((tmp_path / "offers.json").read_text(encoding="utf-8"))
    assert data["stats"]["filter_reasons"]["duplicate"] == 1
