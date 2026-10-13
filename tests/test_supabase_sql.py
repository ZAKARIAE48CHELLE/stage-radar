"""Tests supabase/schema.sql on a real Postgres (RLS, approval flow, per-user scoring).

Skipped unless SR_TEST_PG_DSN points to a Postgres superuser connection, e.g.
  SR_TEST_PG_DSN="host=localhost port=5432 user=postgres" python -m pytest tests/test_supabase_sql.py
A temporary database is created and dropped for each run.
"""
import os
import uuid
from pathlib import Path

import pytest

psycopg2 = pytest.importorskip("psycopg2")
DSN = os.getenv("SR_TEST_PG_DSN")
pytestmark = pytest.mark.skipif(not DSN, reason="SR_TEST_PG_DSN not set")

from scraper.scoring import compute_score  # noqa: E402
from scraper.text import norm, find_keywords  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
AXES = [
    {"label": "IA", "weight": 40, "keywords": ["LLM", "RAG", "LangChain", "machine learning", "NLP"]},
    {"label": "Data", "weight": 20, "keywords": ["Spark", "SQL", "Airflow", "ETL"]},
    {"label": "Web", "weight": 10, "keywords": ["React", "FastAPI", "Node.js", "C++"]},
]
OFFERS = [
    ("Stage PFE LLM & RAG", "Construire un RAG avec LangChain, déployer avec FastAPI. Pipelines Spark et SQL.",
     "Tanger", "Hybride", True),
    ("Stagiaire Data Engineer", "ETL avec Airflow et Spark, modélisation SQL, un peu de machine learning.",
     "Casablanca", "Sur site", False),
    ("Stage développeur React", "Front-end React, back-end Node.js et C++ embarqué.", "Rabat", "Télétravail", False),
    ("Stage comptabilité", "Saisie comptable et rapprochements bancaires.", "Fès", "Sur site", False),
]


@pytest.fixture(scope="module")
def db():
    name = "sr_test_" + uuid.uuid4().hex[:8]
    admin = psycopg2.connect(DSN, dbname="postgres")
    admin.autocommit = True
    admin.cursor().execute(f"create database {name} encoding 'UTF8' template template0")
    conn = psycopg2.connect(DSN, dbname=name)
    conn.autocommit = True
    cur = conn.cursor()
    cur.execute("select 1 from pg_roles where rolname = 'authenticated'")
    if not cur.fetchone():
        cur.execute((ROOT / "tests" / "supabase_stub.sql").read_text())
    else:  # roles are cluster-wide: create only the schemas in this fresh database
        stub = (ROOT / "tests" / "supabase_stub.sql").read_text().split("create schema auth;", 1)[1]
        cur.execute("create schema auth;" + stub)
    schema = (ROOT / "supabase" / "schema.sql").read_text()
    cur.execute(schema)
    cur.execute(schema)  # must be idempotent
    yield conn
    conn.close()
    admin.cursor().execute(f"drop database {name} with (force)")
    admin.close()


def new_user(cur, email):
    cur.execute("reset role; insert into auth.users (email) values (%s) returning id", (email,))
    return str(cur.fetchone()[0])


def as_user(cur, uid):
    cur.execute("reset role")
    cur.execute("select set_config('request.jwt.claim.sub', %s, false)", (uid,))
    cur.execute("set role authenticated")


def as_superuser(cur):
    cur.execute("reset role; select set_config('request.jwt.claim.sub', '', false)")


@pytest.fixture(scope="module")
def users(db):
    cur = db.cursor()
    a = new_user(cur, "Admin@Example.com")
    b = new_user(cur, "bob@example.com")
    cur.execute("insert into public.invites (email) values ('carol@example.com')")
    c = new_user(cur, "carol@example.com")
    return {"a": a, "b": b, "c": c}


def q(cur, sql, *args):
    cur.execute(sql, args or None)
    return cur.fetchall()


def test_signup_roles_and_statuses(db, users):
    cur = db.cursor()
    as_superuser(cur)
    rows = dict((r[0], r[1:]) for r in q(cur, "select email, role, status from profiles"))
    assert rows["admin@example.com"] == ("admin", "approved")      # first user
    assert rows["bob@example.com"] == ("user", "pending")
    assert rows["carol@example.com"] == ("user", "approved")       # invited
    assert q(cur, "select count(*) from invites")[0][0] == 0        # invite consumed


def test_pending_user_is_locked_out(db, users):
    cur = db.cursor()
    as_superuser(cur)
    cur.execute("insert into offers (url, source, title) values ('u0', 's', 't')")
    as_user(cur, users["b"])
    assert q(cur, "select count(*) from offers")[0][0] == 0
    with pytest.raises(psycopg2.Error):
        cur.execute("select * from my_matches()")
    with pytest.raises(psycopg2.Error):
        cur.execute("update profiles set status = 'approved' where id = auth.uid()")
    with pytest.raises(psycopg2.Error):
        cur.execute("select * from admin_users()")
    # can still read and edit own non-privileged fields
    cur.execute("update profiles set full_name = 'Bob' where id = auth.uid()")
    assert q(cur, "select count(*) from profiles")[0][0] == 1       # only own row visible


def test_admin_approves_and_cannot_lock_self_out(db, users):
    cur = db.cursor()
    as_user(cur, users["a"])
    listed = q(cur, "select email, status from admin_users()")
    assert len(listed) == 3 and listed[0][1] == "pending"           # pending users first
    cur.execute("update profiles set status = 'approved' where id = %s", (users["b"],))
    with pytest.raises(psycopg2.Error):
        cur.execute("update profiles set role = 'user' where id = auth.uid()")
    cur.execute("insert into invites (email) values ('dave@example.com')")
    as_user(cur, users["c"])
    with pytest.raises(psycopg2.Error):
        cur.execute("insert into invites (email) values ('eve@example.com')")
    assert q(cur, "select count(*) from invites")[0][0] == 0        # non-admin sees none


def expected_score(title, desc, city, modality, is_pfe, prefs, wants_pfe=True):
    t, full = norm(title), norm(title + " " + desc)
    hits = {}
    for ax in AXES:
        kws = [norm(k) for k in ax["keywords"]]
        in_title, in_full = find_keywords(t, kws), find_keywords(full, kws)
        hits[ax["label"]] = len(set(in_full) | set(in_title)) + len(in_title)
    weights = {ax["label"]: ax["weight"] for ax in AXES}
    bonus = (5 if wants_pfe and is_pfe else 0)
    if norm(city) in [norm(p) for p in prefs] or (modality == "Télétravail" and "teletravail" in [norm(p) for p in prefs]):
        bonus += 3
    return compute_score(hits, weights, bonus), hits


def test_scoring_matches_python(db, users):
    import json
    cur = db.cursor()
    as_superuser(cur)
    cur.execute("delete from offers")
    for i, (title, desc, city, mod, pfe) in enumerate(OFFERS):
        cur.execute("""insert into offers (url, source, title, company, city, modality, date_posted,
                       is_pfe, description, title_norm, text_norm)
                       values (%s,'test',%s,'Co',%s,%s,current_date,%s,%s,%s,%s)""",
                    (f"https://x/{i}", title, city, mod, pfe, desc, norm(title), norm(title + " " + desc)))
    prefs = ["Tanger", "Télétravail"]
    as_user(cur, users["b"])
    cur.execute("update profiles set axes = %s, preferred_cities = %s where id = auth.uid()",
                (json.dumps(AXES), prefs))
    rows = q(cur, "select title, score, axis_hits, matched from my_matches()")
    got = {r[0]: r for r in rows}
    assert "Stage comptabilité" not in got                          # no keyword → hidden
    for title, desc, city, mod, pfe in OFFERS[:3]:
        exp, hits = expected_score(title, desc, city, mod, pfe, prefs)
        assert got[title][1] == exp, (title, got[title], exp, hits)
        assert got[title][2] == hits
    assert "c++" in got["Stage développeur React"][3] and "node.js" in got["Stage développeur React"][3]
    assert [r[1] for r in rows] == sorted((r[1] for r in rows), reverse=True)


def test_applications_are_private(db, users):
    cur = db.cursor()
    as_user(cur, users["b"])
    oid = q(cur, "select id from my_matches() limit 1")[0][0]
    cur.execute("insert into applications (user_id, offer_id, status, notes) values (auth.uid(), %s, 'envoyee', 'secret')", (oid,))
    assert q(cur, "select app_status from my_matches() where id = %s", oid)[0][0] == "envoyee"
    assert q(cur, "select status, title from my_applications()")[0][0] == "envoyee"
    as_user(cur, users["c"])
    assert q(cur, "select count(*) from applications")[0][0] == 0
    with pytest.raises(psycopg2.Error):
        cur.execute("insert into applications (user_id, offer_id) values (%s, %s)", (users["b"], oid))
    as_user(cur, users["a"])                                        # admin: counts only, no notes
    assert q(cur, "select count(*) from applications")[0][0] == 0
    row = [r for r in q(cur, "select email, n_applications, n_sent from admin_users()") if r[0] == "bob@example.com"][0]
    assert row[1:] == (1, 1)
    stats = q(cur, "select admin_stats()")[0][0]
    assert stats["apps_by_status"] == {"envoyee": 1} and stats["offers_active"] == 4


def test_external_applications(db, users):
    cur = db.cursor()
    as_user(cur, users["c"])  # carol is approved
    cur.execute("""insert into applications (user_id, is_external, ext_title, ext_company, ext_city, ext_url, ext_source, ext_date, status, notes, interview_at, interview_type, interview_notes)
                   values (auth.uid(), true, 'Dev IA Externe', 'Acme Corp', 'Casablanca', 'https://acme.com/jobs/1', 'LinkedIn', '2026-10-10', 'entretien', 'Entretien tech', '2026-10-25 14:30:00+00', 'visio', 'Lien Meet')""")
    apps = q(cur, "select title, company, city, url, source, status, notes, external, interview_type, interview_notes from my_applications() where external = true")
    assert len(apps) == 1
    assert apps[0] == ('Dev IA Externe', 'Acme Corp', 'Casablanca', 'https://acme.com/jobs/1', 'LinkedIn', 'entretien', 'Entretien tech', True, 'visio', 'Lien Meet')

    # RLS: bob cannot read carol's external application
    as_user(cur, users["b"])
    assert q(cur, "select count(*) from applications where ext_title = 'Dev IA Externe'")[0][0] == 0
    assert q(cur, "select count(*) from my_applications() where title = 'Dev IA Externe'")[0][0] == 0

    # CHECK constraint: invalid row where neither an offer is linked nor valid external (offer_id null and is_external false)
    with pytest.raises(psycopg2.Error):
        cur.execute("insert into applications (user_id, is_external) values (auth.uid(), false)")

    # CHECK constraint: is_external is true but ext_title is null
    with pytest.raises(psycopg2.Error):
        cur.execute("insert into applications (user_id, is_external, ext_title) values (auth.uid(), true, null)")


def test_career_sites_are_private(db, users):
    cur = db.cursor()
    as_user(cur, users["c"])  # carol is approved
    cur.execute("insert into career_sites (user_id, name, url, category, notes) values (auth.uid(), 'OCP Careers', 'https://ocp.com', 'Industrie', 'Stage PFE')")
    assert q(cur, "select name, category from career_sites where user_id = auth.uid()")[0] == ('OCP Careers', 'Industrie')
    as_user(cur, users["b"])
    assert q(cur, "select count(*) from career_sites where name = 'OCP Careers'")[0][0] == 0
    with pytest.raises(psycopg2.Error):
        cur.execute("insert into career_sites (user_id, name, url) values (%s, 'Test', 'https://test.com')", (users["c"],))


def test_cv_storage_own_folder_only(db, users):
    cur = db.cursor()
    as_user(cur, users["b"])
    cur.execute("insert into storage.objects (bucket_id, name) values ('cvs', %s)", (f"{users['b']}/cv.pdf",))
    with pytest.raises(psycopg2.Error):
        cur.execute("insert into storage.objects (bucket_id, name) values ('cvs', %s)", (f"{users['c']}/cv.pdf",))
    as_user(cur, users["c"])
    assert q(cur, "select count(*) from storage.objects")[0][0] == 0


def test_scraper_function_not_callable_by_users(db, users):
    cur = db.cursor()
    as_user(cur, users["a"])
    with pytest.raises(psycopg2.Error):
        cur.execute("select deactivate_unsynced(now())")
    cur.execute("reset role; set role service_role")                 # what the scraper uses
    cur.execute("insert into scrape_runs (stats) values ('{}')")
    assert q(cur, "select deactivate_unsynced(now() + interval '1 minute')")[0][0] == 4
    as_superuser(cur)


def test_sync_rows_fit_offers_table(db, users, tmp_path):
    """Rows built by the scraper must match the offers table (names + types) and upsert on url."""
    import json
    from datetime import date
    import scraper.run as run
    from scraper import supabase_sync
    from tests.test_sync import make_store
    cfg = run.load_cfg(ROOT / "config" / "profile.yaml")
    rows, _ = supabase_sync.select_rows(cfg, make_store(tmp_path), today=date.today())
    for r in rows:
        r.update(active=True, synced_at="2026-10-10T06:00:00+00:00", date_posted=str(date.today()))
    cur = db.cursor()
    as_superuser(cur)
    sql = """insert into offers (url, source, title, company, city, modality, date_posted, valid_through,
               is_pfe, description, title_norm, text_norm, first_seen, also_on, active, synced_at)
             select url, source, title, company, city, modality, date_posted, valid_through,
               is_pfe, description, title_norm, text_norm, first_seen, also_on, active, synced_at
             from jsonb_populate_recordset(null::offers, %s::jsonb)
             on conflict (url) do update set title = excluded.title, synced_at = excluded.synced_at"""
    cur.execute(sql, (json.dumps(rows),))
    cur.execute(sql, (json.dumps(rows),))  # second run updates, no duplicates
    assert q(cur, "select count(*) from offers where url in ('u1','u3')")[0][0] == 2
    as_user(cur, users["b"])
    cur.execute("update profiles set axes = %s where id = auth.uid()",
                (json.dumps([{"label": "Java", "weight": 50, "keywords": ["Spring Boot", "Angular", "Java"]}]),))
    top = q(cur, "select title, score, matched from my_matches() order by score desc limit 1")[0]
    assert top[0] == "Stage PFE Développeur Java" and set(top[2]) == {"spring boot", "angular", "java"}


def test_admin_update_password(db, users):
    cur = db.cursor()
    # Admin (user 'a') can update password of user 'b'
    as_user(cur, users["a"])
    assert q(cur, "select admin_update_password(%s, %s)", (users["b"], "newPassword123!"))[0][0] is True

    # Password was hashed into auth.users
    as_superuser(cur)
    cur.execute("select encrypted_password from auth.users where id = %s", (users["b"],))
    hashed = cur.fetchone()[0]
    assert hashed is not None and hashed.startswith("$2")

    # Too short password raises error
    as_user(cur, users["a"])
    with pytest.raises(psycopg2.Error):
        cur.execute("select admin_update_password(%s, %s)", (users["b"], "123"))

    # Non-admin user 'b' cannot update user 'c' password
    as_user(cur, users["b"])
    with pytest.raises(psycopg2.Error):
        cur.execute("select admin_update_password(%s, %s)", (users["c"], "hacked1234"))

