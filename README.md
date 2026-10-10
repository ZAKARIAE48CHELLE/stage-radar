# Stage Radar — daily AI & Data internship scraper (Morocco)

Every morning it collects new internship offers from stagiaires.ma, dreamjob.ma and your
job-alert e-mails (LinkedIn, Indeed, ReKrute, Emploi.ma), keeps the ones that match an AI / Data
profile, scores them against your skills, and publishes them to an interactive dashboard
(your original design, now fed by live data). Optional Telegram alert for new high scores.

```
stagiaires.ma sitemap ─┐
dreamjob.ma JSON API ──┼──► new offers ──► SQLite store
alert e-mails (IMAP) ──┘
                                                          │
                       config/profile.yaml ──► filter + score (every run, all offers)
                                                          │
                     docs/data/offers.json + offers.csv ──► docs/index.html (GitHub Pages)
                                                          └─► Telegram alert (optional)
```

## Quick start (local)

```bash
python -m venv .venv && source .venv/bin/activate      # Windows: .venv\Scripts\activate
pip install -r requirements.txt
python -m pytest -q                                     # 10 tests, offline
python -m scraper.run --max 40 -v                       # first small run (~1 min)
python server.py 8000                                   # open http://localhost:8000 (with "Relancer" button)
```

The first full run fetches every offer from the last 45 days (a few hundred pages at
1.5 s each, ~5–10 min). Later runs only fetch what is new, usually a few dozen pages.

Open the dashboard through the local server, not by double-clicking `index.html`:
browsers block `fetch()` of the JSON from `file://`.

## Run it every day for free (GitHub Actions + Pages)

1. Push this folder to a new GitHub repo (public for free Pages; private works for the scraper).
2. **Settings → Pages** → Source *Deploy from a branch*, branch `main`, folder `/docs`.
3. **Actions** tab → enable workflows → *Daily internship scrape* → **Run workflow** once.
4. Your dashboard is at `https://<user>.github.io/<repo>/`, refreshed daily at ~07:17 Morocco time.

Optional Telegram alert: create a bot with @BotFather, message it once, read your chat id
from `https://api.telegram.org/bot<TOKEN>/getUpdates`, then add repo **secrets**
`TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` and a repo **variable** `DASHBOARD_URL`.

Note: GitHub pauses scheduled workflows in repos with no activity for 60 days; the daily
data commits normally keep it alive, but if alerts stop, check the Actions tab.

## Tuning — `config/profile.yaml`

| What | Where |
|---|---|
| Skill keywords per axis (GenAI, Big Data, Full-Stack, CV/Security) | `axes.*.keywords` |
| Default importance of each axis | `weights` (dashboard sliders start here) |
| Drop non-tech roles that mention "IA" | `filters.title_exclude_any` |
| Internships only / max age / hide expired | `filters.*` |
| Preferred cities, PFE bonus | `candidate.preferred_cities`, `scoring.*` |
| Alert threshold | `notify.min_score` |

After editing, re-score everything without re-downloading:
`python -m scraper.run --no-fetch`

### How the score works

For each axis, count the distinct skill keywords found (title mentions count twice).
`fit` = how much the offer leans toward the axes you weight highest; `intensity` = how
clearly it is a data/AI role (saturates at 12 hits).
`score = 60·fit + 40·intensity + bonus (PFE +5, preferred city/remote +3)`, capped at 100.
The same formula runs in the dashboard so the sliders recompute exactly
(`scraper/scoring.py::compute_score` ↔ `docs/index.html::computeScore` — change both).

## Sources

| Source | How | Setup |
|---|---|---|
| **stagiaires.ma** | Public offer sitemap + schema.org `JobPosting` on each page | none |
| **dreamjob.ma** | Official WordPress JSON API (`/wp-json/wp/v2/posts`), one request per 50 posts | none |
| **LinkedIn, Indeed, ReKrute, Emploi.ma, Glassdoor** | Your own job-alert e-mails, read over IMAP (read-only) | see below |

The same offer found on several sites is shown once, with "Aussi publiée sur …" links.

**Why e-mail for the big sites?** ReKrute's robots.txt blocks job-aggregator bots, Emploi.ma
blocks automated requests, and LinkedIn/Indeed/Glassdoor forbid scraping in their terms.
They all send job alerts by e-mail, though, and reading your own inbox is fine.

### Enabling e-mail alerts (Gmail, ~10 min)
1. On each site, create alerts (daily frequency): e.g. "stage data", "stage intelligence
   artificielle", "PFE machine learning", location Maroc. LinkedIn: search → *Set alert*.
2. Gmail → Google Account → Security → turn on 2-Step Verification → **App passwords** →
   create one named "stage-radar". (Use a dedicated Gmail just for alerts if you prefer.)
3. Locally: `export IMAP_USER=you@gmail.com IMAP_PASSWORD="xxxx xxxx xxxx xxxx"`
   On GitHub: repo **secrets** `IMAP_USER` and `IMAP_PASSWORD`.
   Other providers: also set variable `IMAP_HOST` (e.g. `outlook.office365.com`).

The connection is read-only: mails are not marked as read or moved. Only the last 3 days
of mails from the senders in `config/profile.yaml → sources.email_alerts.senders` are read.

### Adding another site
Create `scraper/sources/<name>.py` returning `Offer` objects (see `dreamjob_ma.py` for an
API-based source, `stagiaires_ma.py` for sitemap + HTML), then call it in
`scraper/run.py::fetch`. Check robots.txt and the site's terms first. Prefer official
APIs, RSS feeds, sitemaps or e-mail alerts over HTML scraping.

## Project layout

```
config/profile.yaml          your profile, keywords, filters, weights
scraper/run.py               CLI entry point / pipeline
scraper/sources/stagiaires_ma.py   sitemap discovery + JSON-LD parsing
scraper/sources/dreamjob_ma.py     WordPress REST API
scraper/sources/email_alerts.py    IMAP job-alert parser (LinkedIn, Indeed, ReKrute…)
scraper/scoring.py           relevance filter + score formula
scraper/storage.py           SQLite store (data/offers.db)
scraper/notify.py            Telegram alert
docs/index.html              dashboard (Tailwind + Chart.js, reads docs/data/offers.json)
tests/                       offline tests with an HTML fixture
.github/workflows/daily-scrape.yml
AGENTS.md                    context + task prompts for Antigravity / coding agents
```
