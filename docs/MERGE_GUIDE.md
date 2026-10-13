# Merge Guide — combining this version with your current project

**For the coding agent (Antigravity):** You are merging two copies of `stage-radar`:

- **This version** (the one this guide ships in) — adds a multi-user web app, Supabase backend,
  Cloudflare Pages hosting, clean URLs, and PWA support.
- **The user's current version** — same project with some **local modifications** the user made.

Goal: end up with one project that has **this version's new capabilities** *and* **the user's
local changes**. Do not blindly overwrite in either direction. Where both changed the same
place, reconcile and keep both intents.

---

## 1. Files that are brand new here — just add them

These don't exist in the older project, so copy them in as-is:

```
docs/sw.js                      PWA service worker (offline shell; never caches Supabase data)
docs/manifest.webmanifest       PWA manifest (installable app)
docs/icon-192.png               app icons
docs/icon-512.png
docs/icon-maskable.png
docs/apple-touch-icon.png
docs/_redirects                 Cloudflare Pages / Netlify SPA fallback
docs/_headers                   cache + security headers
supabase/schema.sql             DB tables, Row-Level Security, approval flow, per-user scoring
supabase/security_check.sh      anonymous-access self-audit
scraper/supabase_sync.py        pushes offers to Supabase
tests/test_sync.py              tests for the sync
tests/test_supabase_sql.py      tests the SQL schema (RLS + scoring) on a local Postgres
tests/supabase_stub.sql         Supabase auth/storage stub used by that test
```

## 2. Files likely to conflict — merge carefully

| File | What this version changed | How to merge |
|---|---|---|
| `docs/index.html` | Became the multi-user app shell + PWA `<head>` tags + **absolute** script srcs | Take this version's structure; re-apply any of the user's head/meta tweaks on top |
| `docs/app.js` | The whole multi-user app (auth, offers, applications, profile, admin) + clean-URL routing | Take this version as base; port in any user logic changes |
| `docs/config.js` | Holds Supabase URL + anon key | **KEEP THE USER'S REAL KEYS.** Never overwrite with blanks; never put the `service_role` key here |
| `docs/perso.html` | The original single-user dashboard (kept) | Keep whichever has the user's latest tweaks; preserve the `computeScore` formula (see invariant 3) |
| `config/profile.yaml` | Added `platform:` block (broad filter for the app) + more fields | Union both: keep user's keyword/weight edits AND this version's `platform:` block |
| `scraper/run.py` | Calls `supabase_sync.push()`; multi-source fetch | Keep this version's pipeline; re-apply user source/logic edits |
| `scraper/sources/*` | stagiaires_ma, dreamjob_ma, email_alerts | Union: keep all source modules from both |
| `.github/workflows/daily-scrape.yml` | Added `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` env | Keep both sets of secrets/env |
| `README.md`, `AGENTS.md` | Rewritten for the app + Cloudflare Pages | Take this version; fold in any user notes |

## 3. Invariants — must still hold after the merge

1. **Absolute script paths.** In `docs/index.html`, scripts must be `<script src="/app.js">` and
   `<script src="/config.js">` (leading slash). Relative paths break deep-link reloads like `/profil`.
2. **Clean-URL routing.** The app uses the History API, not hash routing. Routes are the last
   path segment (`/offres`, `/candidatures`, `/marche`, `/profil`, `/admin`). Internal links are
   `<a href="/route">` handled by a global click listener (`go()`), and `docs/_redirects`
   provides the SPA fallback. Do **not** reintroduce `#/` hashes.
3. **One score formula, three copies — keep them identical:**
   `scraper/scoring.py::compute_score`, `docs/perso.html::computeScore`, and
   `supabase/schema.sql::my_matches` (the SQL version generalises it to each user's own axes).
   `tests/test_supabase_sql.py` checks the SQL matches the Python. If you change the formula,
   change all three and update that test.
4. **Escape all untrusted strings** in the frontend (`esc()` / `textContent`). Offers and
   profiles are user/scraped input — never inject them raw into `innerHTML`.
5. **Security lives in the database.** Every table in `supabase/schema.sql` has RLS enabled.
   Applications, notes, cover letters and CVs are readable only by their owner; the admin gets
   counts only (`admin_users()`). Never weaken an RLS policy to make a UI feature work. The
   `service_role` key belongs only in GitHub Actions secrets — never in `docs/` or in git.
6. **`supabase/schema.sql` stays idempotent** — the user re-runs it in the Supabase SQL editor,
   so every statement must be safe to run again (`create ... if not exists`, `drop ... if exists`
   before `create`, etc.).
7. **The service worker must not cache Supabase or cross-origin responses** — only the same-origin
   app shell. This keeps account data and CVs out of the browser cache. If you edit the cached
   shell file list in `sw.js`, bump its `VERSION` constant so clients update.

## 4. After merging — verify

```bash
# 1. Python tests (offline). DB tests also run if a local Postgres is available:
pip install -r requirements.txt
python -m pytest -q
#    For the SQL/RLS tests:  SR_TEST_PG_DSN="host=localhost user=postgres" python -m pytest -q

# 2. Serve the app locally and check by hand:
python -m http.server -d docs 8000
#    - open http://localhost:8000  → login screen (needs real keys in config.js)
#    - after login, URL shows /offres (no '#')
#    - hard-refresh on http://localhost:8000/profil → still loads (SPA fallback; note a plain
#      http.server returns 404 here — that's expected locally; Cloudflare/_redirects handles it)
```

If `python -m pytest -q` is green and `docs/config.js` still has the user's real Supabase keys,
the merge is sound.

## 5. Things NOT to do

- Don't move hosting back to GitHub Pages (it can't do clean URLs; that's why we left it).
- Don't commit the `service_role` key or real secrets into the repo.
- Don't delete `docs/perso.html` — it's the user's standalone personal dashboard.
- Don't drop any scraper source module when unioning `scraper/sources/`.
