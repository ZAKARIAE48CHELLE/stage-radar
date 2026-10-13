# AGENTS.md — context for Antigravity (or any coding agent)

## What this project is
A daily internship scraper for Morocco (Python 3.11+, no framework, GitHub Actions) feeding:
- a multi-user React PWA for the owner (Zakariae Chelle) and friends: `app/` (React 18 + Vite +
  Tailwind + Lucide + Supabase), hosted on Cloudflare Pages (build: `cd app && npm ci && npm run build`,
  output: `app/dist`); it's a PWA with clean-URL routing via React Router + `_redirects`.
- the owner's original single-user dashboard `app/public/perso.html` (reads `/data/offers.json`,
  exported by the scraper to `app/public/data/`).

## Rules
- Respect robots.txt and site terms. Never fetch pages from rekrute.com, emploi.ma, Indeed,
  LinkedIn or Glassdoor (they disallow or block it); their offers arrive only via the
  e-mail-alert source, which reads the user's own inbox read-only and never follows links.
- Never add query-string URLs for stagiaires.ma (robots.txt `Disallow: /*?*`).
- Sources: `stagiaires_ma` (sitemap + JSON-LD), `dreamjob_ma` (WordPress REST API),
  `email_alerts` (IMAP). A failing source must not stop the others (`run_source` wrapper).
- All network access goes through `scraper.http.PoliteSession` (robots check, crawl delay, retries).
- The score formula exists four times: `scraper/scoring.py::compute_score`,
  `app/src/lib/scoring.ts::computeScore`, `app/public/perso.html::computeScore` and
  `supabase/schema.sql::my_matches` (per-user axes). Change all; `tests/test_supabase_sql.py`
  compares SQL vs Python and frontend tests verify TypeScript.
- Security lives in the database: every table has RLS. Applications, notes, letters and CVs
  are private to their owner (admins get counts only via `admin_users()`). Never weaken a
  policy to make a UI feature work; never put the service_role key in `app/`.
- Users cannot change their own `role`/`status` (trigger `guard_profile_update`); the last
  approved admin cannot demote themself (`guard_last_admin`).
- Front ends must sanitize/escape untrusted input: offers are untrusted input. French UI.
- Schema changes must stay idempotent (the user re-runs schema.sql in the SQL editor).
- App routing is clean URLs via React Router (`/offres`, `/candidatures`, `/carrieres`, `/marche`,
  `/profil`, `/admin`). `app/public/_redirects` provides SPA fallback on Cloudflare Pages.
- Run `python -m pytest -q` and `npm run test:run` after changes; add a fixture test for any new parser.

## Commands
- Python Tests: `python -m pytest -q` (DB tests: set `SR_TEST_PG_DSN`, needs psycopg2-binary + Postgres 15+)
- Frontend Dev: `cd app && npm run dev` (app: http://localhost:5173 · perso: http://localhost:5173/perso.html)
- Frontend Lint & Test: `cd app && npm run lint && npm run test:run`
- Frontend Build: `cd app && npm run build`
- Small live run: `python -m scraper.run --max 30 -v`
- Re-score only: `python -m scraper.run --no-fetch`

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
