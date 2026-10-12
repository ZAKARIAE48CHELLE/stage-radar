# Stage Radar — internship radar for Morocco, for you and your friends

Every morning a scraper collects new internship offers from stagiaires.ma, dreamjob.ma and
job-alert e-mails (LinkedIn, Indeed, ReKrute, Emploi.ma). They feed two front ends:

- **The multi-user app** (`docs/index.html`): friends create an account, you approve them,
  each person sets their own field and skills and gets their own scores, tracks their
  applications (status, notes, CV, cover-letter drafts). You get a back office.
- **Your personal dashboard** (`docs/perso.html`): the original single-user page.

```
stagiaires.ma sitemap ─┐                                   ┌─► docs/perso.html (your dashboard)
dreamjob.ma JSON API ──┼──► SQLite store ──► filter/score ─┤
alert e-mails (IMAP) ──┘    (GitHub Actions, daily)        └─► Supabase ──► docs/index.html (app)
                                                                 auth · offers · applications · CVs
```

## Multi-user app — setup (free, ~20 min)

Stack: **Supabase** (accounts, Postgres database, CV storage; free tier) + the static site on
**Cloudflare Pages** (free, clean URLs, fast CDN) + the daily scraper on **GitHub Actions**.
No server to run. The app is an installable PWA (add-to-home-screen on phone).

1. **Create the Supabase project** at supabase.com (free plan; pick an EU region).
2. **Create the database:** *SQL Editor* → paste all of `supabase/schema.sql` → *Run*.
   (Safe to re-run after updates.)
3. **Auth settings:** *Authentication → Sign In / Providers → Email*: turn **off**
   "Confirm email". Supabase's built-in mailer only sends to your own team (2 mails/hour),
   so friends could never confirm; your admin approval is the gate instead.
4. **Connect the site:** *Project Settings → API*: copy the *Project URL* and the *anon public*
   key into `docs/config.js`. The anon key is meant to be public; security comes from the
   row-level-security rules in the schema.
5. **Deploy on Cloudflare Pages** (free): dash.cloudflare.com → *Workers & Pages* → *Create*
   → *Pages* → *Connect to Git* → pick your `stage-radar` repo. Build settings:
   **Framework preset: None**, **Build command: empty**, **Build output directory: `docs`**.
   Deploy. Your app is at `https://<project>.pages.dev` (add a custom domain later for free).
   Clean URLs (`/offres`, `/profil`) and the app shell work out of the box via `docs/_redirects`.
   Every push to the repo redeploys automatically.
6. **Point Supabase at that URL:** *Authentication → URL Configuration* → *Site URL* =
   `https://<project>.pages.dev` (and add it under *Redirect URLs*). This makes sign-up and
   password-reset links return to the app.
7. **Connect the scraper:** add GitHub repo **secrets** `SUPABASE_URL` (same URL) and
   `SUPABASE_SERVICE_ROLE_KEY` (*service_role* key: secret, never put it in `docs/`).
   Then *Actions → Daily internship scrape → Run workflow*.
8. **Sign up first.** The very first account becomes the admin automatically. Then, in
   *Admin*, invite friends by e-mail (they are approved on sign-up) or approve them when
   they register, and send them the link.

*(Netlify works the same way — New site from Git, publish directory `docs`; the `_redirects`
and `_headers` files are shared. Vercel: set the root/output to `docs`; its free tier is
non-commercial only.)*

**Why not GitHub Pages?** It can't do clean URLs (forces `#/…` hashes), is slow to update, and
lives on a subpath. Cloudflare Pages fixes all three and is just as free. The repo still lives
on GitHub; only the *hosting* of `docs/` moves.

**Optional, for "mot de passe oublié":** password-reset e-mails need a real mailer. Create a
free SMTP account (e.g. Brevo, 300 mails/day) and enter it under *Authentication → Emails →
SMTP Settings*. Without it, you can reset a friend's password from the Supabase dashboard
(*Authentication → Users*).

### What each person sees
| Page | Content |
|---|---|
| **Offres** | All active offers matching *their* keywords, scored for *their* profile, filters, "NOUVEAU" for the last 48 h |
| Offer detail | Matched skills, description, status (à postuler → envoyée → entretien → offre/refus), notes, date, generated cover letter, "Postuler" link to the original site |
| **Mes candidatures** | Pipeline counts, inline status changes, CSV export |
| **Marché** | Offers by city/source, their priorities vs demand, most requested skills |
| **Profil** | Field template (IA & Data, Dev, Cyber, BI/ERP, Industriel, Électrique/Embarqué, custom), weighted skill axes, preferred cities, PFE preference, pitch, private PDF CV |
| **Admin** (you) | Members with application counts, approve/block/make admin, invitations, last scrape status |

**Privacy by design:** each user's applications, notes, letters and CV are readable only by
that user, enforced in the database (not just hidden in the UI). The admin sees counts only.

### Sécurité — vérifier que vos données sont protégées

Your Supabase URL and **anon key live in `docs/config.js` and are public** — that is how
Supabase is designed. Your data is protected not by hiding that key but by the **Row-Level
Security (RLS) policies** in `supabase/schema.sql`. If you ever forget to run the schema, or
disable RLS on a table, anyone with the (public) key can download everything — including your
friends' CVs, e-mails and private application notes.

So before inviting anyone, run the self-audit — it probes your live project with only the
public key, exactly as an outsider could:

```bash
bash supabase/security_check.sh "https://<your-project>.supabase.co" "<your anon key>"
```

Every table must come back "no data". Any `❌ LEAK` means that table is world-readable — fix
it before putting real data in. Also confirm in the Supabase dashboard:
- *Authentication → Policies*: RLS **enabled** on `profiles`, `offers`, `applications`,
  `invites`, `scrape_runs` (re-running `schema.sql` guarantees this).
- *Storage → cvs* bucket is **Private** (not public).
- The **service_role** key appears only in GitHub **secrets**, never in `docs/` or git.
- Rotate keys in *Project Settings → API* if the service_role key was ever committed or shared.

What this does **not** protect against: an approved member is trusted — they can see every
active offer (not other members' applications). Only approve people you know.

### Free-tier limits worth knowing
Supabase free: 500 MB database, 1 GB files, 2 projects; a project **pauses after 7 days
without activity** (the daily scraper sync normally keeps it awake; if it pauses, click
*Restore* in the dashboard). One year of offers is a few MB, CVs ~200 KB each.

## Quick start (local)

```bash
python -m venv .venv && source .venv/bin/activate      # Windows: .venv\Scripts\activate
pip install -r requirements.txt
python -m pytest -q                                     # offline tests (DB tests need SR_TEST_PG_DSN)
python -m scraper.run --max 40 -v                       # first small run (~1 min)
python -m http.server -d docs 8000                      # app: /  ·  personal dashboard: /perso.html
```

The first full run fetches every offer from the last 45 days (a few hundred pages at
1.5 s each, ~5–10 min). Later runs only fetch what is new, usually a few dozen pages.

Open the dashboard through the local server, not by double-clicking `index.html`:
browsers block `fetch()` of the JSON from `file://`.

## Run it every day for free (GitHub Actions + Pages)

1. Push this folder to a new GitHub repo (public for free Pages; private works for the scraper).
2. For the **personal dashboard only**, GitHub Pages is fine: *Settings → Pages* → *Deploy
   from a branch*, `main`, `/docs`. (The multi-user app is hosted on Cloudflare Pages — see above.)
3. **Actions** tab → enable workflows → *Daily internship scrape* → **Run workflow** once.
4. The personal dashboard is then at `https://<user>.github.io/<repo>/perso.html`, refreshed
   daily at ~07:17 Morocco time. (The multi-user app lives at your Cloudflare `*.pages.dev` URL.)

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
The same formula runs in the personal dashboard (`docs/perso.html::computeScore`) and, per
user with their own axes, in the database (`supabase/schema.sql::my_matches`). Change all three
together; `tests/test_supabase_sql.py` checks the SQL against the Python version.

### Database tests
`tests/test_supabase_sql.py` runs the real schema on a local Postgres 15+ (with a stub of
Supabase's `auth`/`storage` schemas) and checks sign-up/approval, row-level security,
CV folder isolation and scoring. `pip install psycopg2-binary`, then
`SR_TEST_PG_DSN="host=localhost user=postgres" python -m pytest -q`.

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
scraper/supabase_sync.py     pushes offers to Supabase (broad filter: config `platform:`)
supabase/schema.sql          tables, row-level security, approval flow, per-user scoring
supabase/security_check.sh   anonymous-access self-audit (run before inviting friends)
docs/index.html, app.js      multi-user app (Supabase auth + data)
docs/config.js               Supabase URL + anon key (public)
docs/sw.js, manifest.webmanifest, icon-*.png   PWA (installable, offline shell)
docs/_redirects, _headers    Cloudflare Pages / Netlify config (SPA routing, cache headers)
docs/perso.html              personal dashboard (reads docs/data/offers.json)
tests/                       parsers, pipeline, sync, database (RLS + scoring)
.github/workflows/daily-scrape.yml
AGENTS.md                    context + task prompts for Antigravity / coding agents
```
