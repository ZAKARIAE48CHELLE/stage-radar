# AGENTS.md — context for Antigravity (or any coding agent)

## What this project is
A daily internship scraper for Morocco (Python 3.11+, no framework, GitHub Actions) feeding:
- a multi-user app for the owner (Zakariae Chelle) and friends: `docs/index.html` + `docs/app.js`,
  Supabase for auth/DB/storage (`supabase/schema.sql`), hosted on Cloudflare Pages (output dir
  `docs`); it's a PWA (`sw.js`, `manifest.webmanifest`) with clean-URL routing via the History API.
- the owner's original single-user dashboard `docs/perso.html` (reads `docs/data/offers.json`).

## Rules
- Respect robots.txt and site terms. Never fetch pages from rekrute.com, emploi.ma, Indeed,
  LinkedIn or Glassdoor (they disallow or block it); their offers arrive only via the
  e-mail-alert source, which reads the user's own inbox read-only and never follows links.
- Never add query-string URLs for stagiaires.ma (robots.txt `Disallow: /*?*`).
- Sources: `stagiaires_ma` (sitemap + JSON-LD), `dreamjob_ma` (WordPress REST API),
  `email_alerts` (IMAP). A failing source must not stop the others (`run_source` wrapper).
- All network access goes through `scraper.http.PoliteSession` (robots check, crawl delay, retries).
- The score formula exists three times: `scraper/scoring.py::compute_score`,
  `docs/perso.html::computeScore` and `supabase/schema.sql::my_matches` (per-user axes).
  Change all three; `tests/test_supabase_sql.py` compares SQL vs Python.
- Security lives in the database: every table has RLS. Applications, notes, letters and CVs
  are private to their owner (admins get counts only via `admin_users()`). Never weaken a
  policy to make a UI feature work; never put the service_role key in `docs/`.
- Users cannot change their own `role`/`status` (trigger `guard_profile_update`); the last
  approved admin cannot demote themself (`guard_last_admin`).
- Front ends must escape every database/scraped string (`esc()` / `textContent`): offers are
  untrusted input. French UI. No build step: plain JS + Tailwind CDN + supabase-js + Chart.js.
- Schema changes must stay idempotent (the user re-runs schema.sql in the SQL editor).
- App routing is clean URLs (History API): routes are the last path segment (`/offres`, `/profil`).
  Internal links are `<a href="/route">` (a global click handler calls `go()`); `_redirects`
  gives the SPA fallback on Cloudflare/Netlify. Script srcs in index.html must stay ABSOLUTE
  (`/app.js`, `/config.js`) or deep-link reloads break. Bump `sw.js` VERSION when shell files change.
- Run `python -m pytest -q` after every change; add a fixture test for any new parser.

## Commands
- Tests: `python -m pytest -q` (DB tests: set `SR_TEST_PG_DSN`, needs psycopg2-binary + Postgres 15+)
- Small live run: `python -m scraper.run --max 30 -v`
- Re-score only: `python -m scraper.run --no-fetch`
- Preview: `python -m http.server -d docs 8000`

## Ready-to-use task prompts
1. *"Run a live scrape with `--max 40 -v`, then review 10 kept and 10 rejected offers in
   `data/offers.db`. Propose keyword / exclude-list changes in `config/profile.yaml` that
   fix the misclassifications, apply them, and show the before/after counts."*
2. *"Add a daily e-mail digest per user: for each approved user with a new offer scoring ≥ 70
   (run my_matches logic in SQL as a security-definer function callable only by service_role),
   send one e-mail via SMTP env vars. Add an opt-out checkbox in the Profil page."*
3. *"Add an e-mail digest in `scraper/notify.py` using SMTP settings from env vars
   (SMTP_HOST, SMTP_USER, SMTP_PASS, MAIL_TO), same selection rule as the Telegram alert."*
4. *"Add a source for company career pages using their official public ATS APIs
   (SmartRecruiters, Lever, Greenhouse, Workable) from a list of company slugs in profile.yaml,
   keeping only Morocco-based postings. Verify each slug returns data before adding it."*
5. *"Add a new source module for <site> following `sources/stagiaires_ma.py`. First check its
   robots.txt and terms; stop and report if scraping is not allowed."*
6. *"Add reminders: when an application has been 'envoyée' for 10 days without change, show a
   'À relancer' badge in Mes candidatures and a counter in the Offres KPIs."*
