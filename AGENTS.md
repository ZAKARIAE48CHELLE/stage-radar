# AGENTS.md — context for Antigravity (or any coding agent)

## What this project is
A personal daily scraper + dashboard for AI/Data internships in Morocco for one candidate
(Zakariae Chelle, AI & Data engineering student, EMSI Tanger). Python 3.11+, no framework.
Output is a static site in `docs/` served by GitHub Pages; a GitHub Action runs daily.

## Rules
- Respect robots.txt and site terms. Never fetch pages from rekrute.com, emploi.ma, Indeed,
  LinkedIn or Glassdoor (they disallow or block it); their offers arrive only via the
  e-mail-alert source, which reads the user's own inbox read-only and never follows links.
- Never add query-string URLs for stagiaires.ma (robots.txt `Disallow: /*?*`).
- Sources: `stagiaires_ma` (sitemap + JSON-LD), `dreamjob_ma` (WordPress REST API),
  `email_alerts` (IMAP). A failing source must not stop the others (`run_source` wrapper).
- All network access goes through `scraper.http.PoliteSession` (robots check, crawl delay, retries).
- The score formula exists twice: `scraper/scoring.py::compute_score` and
  `docs/index.html::computeScore`. Any change must be made in both, and tests updated.
- Dashboard must escape every scraped string (`esc()` / `textContent`) — offers are untrusted input.
- Keep the dashboard a single static HTML file (Tailwind CDN + Chart.js), French UI.
- Run `python -m pytest -q` after every change; add a fixture test for any new parser.

## Commands
- Tests: `python -m pytest -q`
- Small live run: `python -m scraper.run --max 30 -v`
- Re-score only: `python -m scraper.run --no-fetch`
- Preview: `python server.py 8000` (or `python -m http.server -d docs 8000`)

## Ready-to-use task prompts
1. *"Run a live scrape with `--max 40 -v`, then review 10 kept and 10 rejected offers in
   `data/offers.db`. Propose keyword / exclude-list changes in `config/profile.yaml` that
   fix the misclassifications, apply them, and show the before/after counts."*
2. *"Add a 'Candidatures' tracker to the dashboard: per offer, a status (à postuler / envoyée /
   entretien / refus) and a note, stored in localStorage (wrapped in try/catch), with a filter
   on status and a column in the CSV export."*
3. *"Add an e-mail digest in `scraper/notify.py` using SMTP settings from env vars
   (SMTP_HOST, SMTP_USER, SMTP_PASS, MAIL_TO), same selection rule as the Telegram alert."*
4. *"Add a source for company career pages using their official public ATS APIs
   (SmartRecruiters, Lever, Greenhouse, Workable) from a list of company slugs in profile.yaml,
   keeping only Morocco-based postings. Verify each slug returns data before adding it."*
5. *"Add a new source module for <site> following `sources/stagiaires_ma.py`. First check its
   robots.txt and terms; stop and report if scraping is not allowed."*
6. *"Generate a tailored cover-letter draft per offer: add `scraper/letters.py` that writes a
   short French letter from the offer's keywords and the pitch text in profile.yaml."*
