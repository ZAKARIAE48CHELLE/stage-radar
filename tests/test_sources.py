import json
from datetime import date
from pathlib import Path

import scraper.run as run
from scraper.models import Offer
from scraper.scoring import analyse, is_relevant
from scraper.sources import dreamjob_ma, email_alerts, france_travail
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


FT_SEARCH_ITEM_1 = {
    "id": "182ABCD",
    "intitule": "Stagiaire Data Engineer / IA (H/F)",
    "description": "Nous recherchons un stagiaire PFE pour nos projets Big Data et LLM. Connaissances en Python, Spark et LangChain. Télétravail partiel.",
    "dateCreation": "2026-10-10T09:30:00.000Z",
    "typeContrat": "FS",
    "typeContratLibelle": "Formation / Stage",
    "alternance": False,
    "entreprise": {
        "nom": "Capgemini Engineering"
    },
    "lieuTravail": {
        "libelle": "75 - Paris"
    },
    "origineOffre": {
        "origine": "2",
        "urlOrigine": "https://carrieres.capgemini.com/jobs/182ABCD"
    }
}

FT_SEARCH_ITEM_2 = {
    "id": "999XYZW",
    "intitule": "Alternant Data Analyst (H/F)",
    "description": "Alternance en analyse de données et business intelligence.",
    "dateCreation": "2026-10-11T14:15:00.000Z",
    "typeContrat": "E2",
    "typeContratLibelle": "Contrat de professionnalisation",
    "alternance": True,
    "entreprise": {
        "nom": "Atos"
    },
    "lieuTravail": {
        "libelle": "69 - Lyon"
    },
    "origineOffre": {
        "origine": "1"
    }
}


def test_france_travail_offer_json_to_offer():
    # 1) Offer with urlOrigine
    o1 = france_travail.offer_json_to_offer(FT_SEARCH_ITEM_1)
    assert o1 is not None
    assert o1.title == "Stagiaire Data Engineer / IA (H/F)"
    assert o1.company == "Capgemini Engineering"
    assert o1.city == "75 - Paris"
    assert o1.date_posted == "2026-10-10"
    assert o1.url == "https://carrieres.capgemini.com/jobs/182ABCD"
    assert o1.source == "france_travail"
    assert o1.employment_type == "INTERN"
    assert o1.is_pfe is True
    assert o1.modality == "Télétravail"

    # 2) Offer with fallback public URL
    o2 = france_travail.offer_json_to_offer(FT_SEARCH_ITEM_2)
    assert o2 is not None
    assert o2.title == "Alternant Data Analyst (H/F)"
    assert o2.company == "Atos"
    assert o2.city == "69 - Lyon"
    assert o2.date_posted == "2026-10-11"
    assert o2.url == "https://candidat.francetravail.fr/offres/recherche/detail/999XYZW"
    assert o2.source == "france_travail"
    assert o2.employment_type == "INTERN"


def test_france_travail_collect_without_credentials_is_noop(monkeypatch):
    monkeypatch.delenv("FRANCE_TRAVAIL_CLIENT_ID", raising=False)
    monkeypatch.delenv("FRANCE_TRAVAIL_CLIENT_SECRET", raising=False)
    session = FakeSession([])
    res = france_travail.collect(session, {"keywords": "data"}, 45, known=set(), cap=50)
    assert res == []


def test_france_travail_collect_with_mock_api(monkeypatch):
    monkeypatch.setenv("FRANCE_TRAVAIL_CLIENT_ID", "mock_id")
    monkeypatch.setenv("FRANCE_TRAVAIL_CLIENT_SECRET", "mock_secret")

    class MockApiResponse:
        def __init__(self, data, headers=None, status_code=200):
            self._data = data
            self.headers = headers or {}
            self.status_code = status_code

        def json(self):
            return self._data

    class MockFtSession:
        def __init__(self):
            self.posts = []
            self.gets = []

        def post(self, url, data=None, headers=None, ok_statuses=(200,)):
            self.posts.append((url, data, headers))
            return MockApiResponse({"access_token": "mock_token_123"})

        def get(self, url, headers=None, params=None, ok_statuses=(200,)):
            self.gets.append((url, headers, params))
            resp_headers = {"Content-Range": "offres 0-1/2"}
            return MockApiResponse({"resultats": [FT_SEARCH_ITEM_1, FT_SEARCH_ITEM_2]}, headers=resp_headers, status_code=206)

    sess = MockFtSession()
    cfg_src = {
        "keywords": "data",
        "type_contrat": "FS,E2",
        "departements": ["75", "69"],
    }
    known = {"https://candidat.francetravail.fr/offres/recherche/detail/999XYZW"}
    offers = france_travail.collect(sess, cfg_src, max_age_days=30, known=known, cap=10)

    # Verifies OAuth token was requested
    assert len(sess.posts) == 1
    assert sess.posts[0][1]["client_id"] == "mock_id"
    assert sess.posts[0][1]["scope"] == "api_offresdemploiv2"

    # Verifies search request headers and params
    assert len(sess.gets) == 1
    req_headers = sess.gets[0][1]
    assert req_headers["Authorization"] == "Bearer mock_token_123"
    assert "Range" in req_headers
    req_params = sess.gets[0][2]
    assert req_params["motsCles"] == "data"
    assert req_params["typeContrat"] == "FS,E2"
    assert req_params["departement"] == "75,69"
    assert "minCreationDate" in req_params

    # Deduplication against known should leave only item 1
    assert len(offers) == 1
    assert offers[0].url == "https://carrieres.capgemini.com/jobs/182ABCD"
