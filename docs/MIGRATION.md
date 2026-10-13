# MIGRATION.md — Stage Radar front-end → React + Vite + TypeScript

Target architecture and phased plan for migrating the hand-written `docs/app.js` SPA to a
component-based, scalable front-end. **The backend does not change**: the Python scraper,
`supabase/schema.sql` + all RLS, the GitHub Actions workflow, and hosting on Cloudflare Pages
stay exactly as they are. Only the browser app is rebuilt.

Read `AGENTS.md` and `MERGE_GUIDE.md` first — every invariant there still applies.

---

## 1. Why this migration

- `docs/app.js` is one ~2000-line file; each feature makes it harder to change safely.
- A component structure + TypeScript gives: isolated, testable units; compile-time safety on
  Supabase row shapes; easy room to grow (new views, roles, sources).
- It stays the **same product**: a PWA, installable, French UI, Supabase backend, Cloudflare Pages.
  Users see no difference; the code becomes maintainable.

## 2. Stack (fixed decisions)

| Concern | Choice | Why |
|---|---|---|
| Build tool | **Vite** | Fast, static output → Cloudflare Pages (no SSR needed; app is behind auth) |
| Language | **TypeScript** (strict) | Catches row-shape / null bugs before shipping |
| UI | **React 18** | Largest ecosystem, best agent/tutorial support |
| Styling | **Tailwind** (PostCSS build, not CDN) | Same classes as today, now tree-shaken |
| Routing | **React Router v6** | Clean URLs, nested layouts, route guards |
| Server state | **@tanstack/react-query** | Caching, refetch, loading/error states for all Supabase reads |
| Backend SDK | **@supabase/supabase-js v2** | Unchanged API |
| Charts | **Recharts** | Declarative, React-native (replaces Chart.js) |
| Excel/CSV | **exceljs** | Keep current export behaviour |
| PWA | **vite-plugin-pwa** (Workbox) | Generates manifest + service worker; replaces hand-written `sw.js` |
| Forms | **react-hook-form** + **zod** | Typed validation for profile / application / external forms |
| Tests | **Vitest** + **React Testing Library** + **Playwright** (e2e) | Unit + component + flow |
| Lint/format | **ESLint** + **Prettier** | Consistency |

Pin every dependency to an exact version. No other UI frameworks.

## 3. Repository layout (after migration)

The Vite app lives in `app/`. The Python scraper, `supabase/`, `config/`, `tests/` (Python) and
`docs/perso.html` are untouched. `docs/` stops hosting the main app once parity is reached.

```
stage-radar/
├─ app/                          # NEW — the Vite + React front-end
│  ├─ index.html                 # Vite entry (single root <div id="root">)
│  ├─ vite.config.ts             # Vite + vite-plugin-pwa config
│  ├─ tsconfig.json
│  ├─ tailwind.config.ts
│  ├─ postcss.config.js
│  ├─ .env.example               # VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY
│  ├─ public/                    # static assets copied as-is
│  │  ├─ icon-192.png  icon-512.png  icon-maskable.png  apple-touch-icon.png
│  │  ├─ _redirects              # /*  /index.html  200   (Cloudflare SPA fallback)
│  │  └─ _headers                # cache + security headers
│  └─ src/
│     ├─ main.tsx                # ReactDOM root; mounts <App/> + providers
│     ├─ App.tsx                 # Router + top-level providers
│     ├─ vite-env.d.ts
│     │
│     ├─ app/                    # app-wide wiring
│     │  ├─ router.tsx           # route table (clean URLs) + guards
│     │  ├─ providers.tsx        # QueryClient, AuthProvider, Toaster
│     │  └─ queryClient.ts
│     │
│     ├─ lib/                    # framework-agnostic utilities (no React)
│     │  ├─ supabase.ts          # createClient from import.meta.env (anon key only)
│     │  ├─ scoring.ts           # ⚠ SAME formula as scraper/scoring.py + schema.sql my_matches
│     │  ├─ paid.ts              # rémunéré detection + negation (mirrors scraper helper)
│     │  ├─ text.ts              # norm(), keyword helpers (mirror scraper/text.py)
│     │  ├─ format.ts            # dates, "il y a N j", currency
│     │  ├─ csv.ts  xlsx.ts      # exports
│     │  └─ constants.ts         # STATUSES, CITIES, AXIS_COLORS, FIELD templates
│     │
│     ├─ types/                  # TypeScript types mirroring DB rows & RPC results
│     │  ├─ db.ts                # Profile, Offer, Application, CareerSite, Invite…
│     │  └─ api.ts               # my_matches / my_applications / admin_* return shapes
│     │
│     ├─ features/               # ⭐ one folder per domain feature (scalable unit)
│     │  ├─ auth/
│     │  │  ├─ AuthProvider.tsx          # session, profile, status; onAuthStateChange
│     │  │  ├─ useAuth.ts
│     │  │  ├─ LoginPage.tsx  SignupPage.tsx  ForgotPage.tsx  ResetPage.tsx
│     │  │  └─ PendingPage.tsx
│     │  ├─ offers/
│     │  │  ├─ api.ts                     # useMatches() (react-query wraps rpc my_matches)
│     │  │  ├─ OffersPage.tsx
│     │  │  ├─ OfferTable.tsx  OfferRow.tsx  OfferFilters.tsx  OfferModal.tsx
│     │  │  └─ KpiRow.tsx
│     │  ├─ applications/
│     │  │  ├─ api.ts                     # useApplications(), useUpdateAppStatus(), useSaveInterview()
│     │  │  ├─ ApplicationsPage.tsx        # Multi-view container (Table · Kanban · Calendar) + filter bar
│     │  │  ├─ ApplicationsTable.tsx       # Table: sorting, page size (10/15/20/30), pagination
│     │  │  ├─ ApplicationRow.tsx          # Table row with in-place status select + countdown badge
│     │  │  ├─ KanbanPipeline.tsx          # 7-column Kanban board with dynamic width (1-2 cols wide)
│     │  │  ├─ KanbanColSelect.tsx         # Column dropdown (All, Active, 1-by-1) + live toggle chips
│     │  │  ├─ KanbanCard.tsx              # Kanban card with move status select + interview details
│     │  │  ├─ InterviewCalendar.tsx       # Monthly interactive calendar for scheduled interviews
│     │  │  ├─ InterviewModal.tsx          # Schedule/edit interview (date/time, format, link/notes)
│     │  │  ├─ ExternalAppModal.tsx        # Add/edit external application (is_external: true)
│     │  │  ├─ ApplicationModal.tsx        # Internal offer application (status, notes, letter, interview)
│     │  │  ├─ AppKpis.tsx                 # 7 status KPI badges + scheduled interviews counter
│     │  │  └─ exportExcel.ts              # Excel (.xlsx) export with external apps & interviews
│     │  ├─ profile/
│     │  │  ├─ api.ts  ProfilePage.tsx  AxesEditor.tsx  CvUpload.tsx
│     │  ├─ market/
│     │  │  └─ MarketPage.tsx  + chart components
│     │  ├─ career-sites/
│     │  │  ├─ api.ts  CareerSitesPage.tsx  CareerSiteModal.tsx   # /carrieres route
│     │  └─ admin/
│     │     ├─ api.ts  AdminPage.tsx  UsersTable.tsx  InvitesPanel.tsx  RunStatus.tsx
│     │
│     ├─ components/             # shared, dumb UI (no data fetching)
│     │  ├─ ui/                  # Button, Input, Select, Modal, Toast, Badge, Card, Table…
│     │  ├─ layout/              # AppShell, TopBar, NavBar, UserMenuDropdown, RequireAuth, RequireAdmin
│     │  └─ feedback/            # Spinner, EmptyState, ErrorState
│     │
│     ├─ hooks/                  # cross-feature hooks (useDebounce, useLocalStorage…)
│     └─ styles/
│        └─ index.css           # Tailwind directives + base tokens
│
├─ scraper/      supabase/      config/      tests/      docs/perso.html   # UNCHANGED
└─ .github/workflows/           # add a front-end test/build job to ci.yml
```

### Layering rule (keeps it scalable)
```
components/ui  ◄─ features/*  ◄─ app/router
      ▲              │
      └──── lib/ , types/  (no React, no feature imports)
```
- `lib/` and `types/` never import from `features/` or React.
- `features/*` never import from each other's internals — share via `lib/`, `types/`, or `components/`.
- `components/ui` are presentational only (props in, events out; no Supabase calls).
- Each feature owns its data access in its `api.ts` (react-query hooks). Views call hooks, not
  the Supabase client directly.

## 4. Critical invariants (do not break)

1. **Score formula = one source of truth, three mirrors.** `app/src/lib/scoring.ts` must match
   `scraper/scoring.py::compute_score` and `supabase/schema.sql::my_matches` exactly. Add a Vitest
   test with fixed inputs/outputs; document the mirror in a comment in all three.
2. **Paid detection** lives in the scraper (stored as `offers.is_paid`); `lib/paid.ts` is only a
   fallback for the detail view where the full description is present, using the SAME positive +
   **negation** logic ("non rémunéré" → not paid).
3. **Security is in the DB.** RLS is unchanged; never add a query that assumes the client will hide
   data. Applications/notes/letters/CVs stay private to their owner; admin sees counts only.
4. **Anon key only** in the front-end (via `VITE_` env). The `service_role` key never appears in
   `app/`. Env vars are set in Cloudflare Pages build settings, not committed.
5. **Clean URLs** (`/offres`, `/profil`, …) via React Router; `public/_redirects` gives the SPA
   fallback on Cloudflare. Deep-link reload must work.
6. **PWA**: installable, offline app shell; the service worker must **never cache Supabase
   responses or any cross-origin request** (privacy) — only same-origin build assets.
7. **French UI**, accessible, mobile-first (no horizontal scroll at 390px).

## 5. Routing map

| Path | Guard | Component | Note |
|---|---|---|---|
| `/login` `/signup` `/forgot` `/reset` | public | auth pages | Pages d'authentification et récupération de mot de passe |
| `/` | auth | redirect → `/offres` (ou `/profil` si aucun axe défini) | Redirection automatique selon l'état du profil |
| `/offres` | approved | `OffersPage` | Tableau des offres avec scoring personnalisé et filtres |
| `/candidatures` | approved | `ApplicationsPage` | Multi-vue : Tableau paginé, Kanban Pipeline (sélecteur colonnes), Calendrier entretiens |
| `/carrieres` | approved | `CareerSitesPage` | Sites carrières privés gérés par l'utilisateur (catégories & liens) |
| `/marche` | approved | `MarketPage` | Statistiques et graphiques Recharts du marché marocain |
| `/profil` | approved | `ProfilePage` | Accessible via le UserMenuDropdown en haut à droite (halo actif) |
| `/admin` | admin | `AdminPage` | Back-office : utilisateurs, invitations, état des collectes |
| pending/blocked | auth | `PendingPage` | Écran d'attente ou de compte désactivé |

Guards: `RequireAuth` (session), `RequireApproved` (profile.status), `RequireAdmin` (role).

## 6. Data layer pattern (react-query)

Every Supabase read is a typed hook in the feature's `api.ts`; components never touch the client:

```ts
// features/offers/api.ts
export function useMatches() {
  return useQuery({
    queryKey: ['matches'],
    queryFn: async (): Promise<Match[]> => {
      const all: Match[] = [];
      for (let from = 0; ; from += 1000) {
        const { data, error } = await supabase
          .rpc('my_matches', { max_age_days: 60 })
          .range(from, from + 999);
        if (error) throw error;
        all.push(...(data as Match[]));
        if (data.length < 1000) break;
      }
      return all;
    },
    staleTime: 5 * 60_000,
  });
}
```

Mutations (sauvegarde de candidature, mise à jour de statut, planning entretien, profil, actions admin) utilisent `useMutation` + mise à jour de cache optimiste / in-place :

```ts
// features/applications/api.ts
// Mise à jour de statut instantanée sans rechargement forcé de la liste
export function useUpdateApplicationStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ appId, status, appliedAt }: { appId: number; status: ApplicationStatus; appliedAt?: string }) => {
      const patch: Record<string, unknown> = { status };
      if (appliedAt) patch.applied_at = appliedAt;
      const { data, error } = await supabase
        .from('applications')
        .update(patch)
        .eq('id', appId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (updated) => {
      queryClient.setQueryData<ApplicationItem[]>(['applications'], (old = []) =>
        old.map(app => app.app_id === updated.id ? { ...app, ...updated } : app)
      );
      queryClient.invalidateQueries({ queryKey: ['matches'] });
    },
  });
}
```

## 7. Environment & config

- `app/.env.example` →
  ```
  VITE_SUPABASE_URL=https://xxxx.supabase.co
  VITE_SUPABASE_ANON_KEY=sb_publishable_xxx
  ```
- Local dev: copy to `app/.env.local` (gitignored).
- Cloudflare Pages: set both as **build environment variables**. Update build settings to:
  **Build command** `cd app && npm ci && npm run build`, **Output directory** `app/dist`.
- `app/.env*` must be in `.gitignore`.

## 8. Phased plan (commit after each; keep everything green; old app stays live until phase 8)

0. **Scaffold** — create `app/` with Vite+React+TS+Tailwind+PWA+Router+react-query+ESLint/Prettier.
   App boots, shows a placeholder, installs as PWA, deploys to a Cloudflare preview.
1. **lib + types + auth + AppShell** — port `lib/*` (scoring, paid, text, constants) with Vitest tests; build
   `AuthProvider`; login/signup/pending/reset working against Supabase; `TopBar` with `NavBar` (horizontal
   tabs: Offres, Candidatures, Sites carrières, Marché, Admin — no Profil tab) and `UserMenuDropdown` (avatar initials,
   role badge, `/profil` link, `/perso.html` link, sign-out).
2. **Offres** — `useMatches`, `OfferTable`, filters (incl. paid/PFE/domain), KPIs, pagination.
3. **Offer modal + applications** — detail modal, status/notes/letter generator, interview fields (date/time,
   format, link/notes), optimistic save.
4. **Candidatures multi-vues** —
   - **Tableau** : pagination configurable (10, 15, 20, 30 lignes), tri, compte à rebours d'entretien, changement de statut in-place.
   - **Kanban Pipeline** : sélecteur de colonnes (`KanbanColSelect` avec presets "Toutes les 7 colonnes", "Pipeline actif - 5 étapes", colonnes uniques) + puces de bascule rapide (toggle chips) avec compteurs live, déplacement direct de statut, largeur adaptative (1 ou 2 colonnes élargies).
   - **Calendrier des entretiens** : vue mensuelle interactive des entretiens planifiés avec badges de format.
   - **Planification d'entretien** : modal date/heure (`datetime-local`), format (visio, présentiel, téléphone), notes/lien, calcul du compte à rebours dynamique (*Aujourd'hui !*, *Demain*, *Dans N j*, *Passé*).
   - **Candidatures externes** : modal de création / édition (`is_external: true`, titre, entreprise, ville, URL, source, date).
   - **Export Excel** (`exceljs`) et CSV complets.
5. **Profil + Marché** — axes editor, CV upload (Storage), Recharts market view.
6. **Sites carrières (`/carrieres`) + Admin** — CRUD des sites carrières privés (`career_sites`) avec recherche et catégories ; admin users/invites/run-status.
7. **e2e + a11y** — Playwright flows (login → profile → offer → apply → export; admin approve);
   mobile check; Lighthouse PWA pass.
8. **Cutover** — point Cloudflare Pages build at `app/`, remove `docs/app.js` + `docs/index.html`
   (+ old `sw.js`, `config.js`, `manifest`, `_redirects`, `_headers` now served from `app/`).
   Keep `docs/perso.html` (separate personal dashboard). Update `AGENTS.md` + `README.md`.

## 9. CI

Extend `.github/workflows/ci.yml` with a front-end job:
```yaml
  frontend:
    runs-on: ubuntu-latest
    defaults: { run: { working-directory: app } }
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'npm', cache-dependency-path: app/package-lock.json }
      - run: npm ci
      - run: npm run lint
      - run: npm run test -- --run
      - run: npm run build
```
Keep the existing Python `test` job. CI must be green before the phase-8 cutover.

## 10. Definition of done

- Feature parity with the current app:
  - Auth, onboarding, profil (CV upload, axes personnalisés).
  - Offres avec scoring personnalisé et filtres (rémunéré avec négation, PFE, domaine, ville).
  - Candidatures multi-vues : Tableau paginé (10–30), Kanban Pipeline avec sélecteur de colonnes + puces de bascule, Calendrier mensuel interactif.
  - Planification d'entretien complète (visio, présentiel, téléphone, lien/notes, compte à rebours).
  - Candidatures externes (`is_external: true`) suivies dans les 3 vues.
  - Sites carrières privés à l'URL `/carrieres`.
  - Menu utilisateur dans le header (`UserMenuDropdown` avec avatar et accès profil).
  - Marché avec graphiques Recharts.
  - Admin (utilisateurs, invitations, runs).
  - Exports Excel (.xlsx) et CSV.
  - PWA installable.
- Clean URLs + deep-link reloads work on Cloudflare Pages.
- `scoring.ts` matches Python & SQL (test-proven); `is_paid` consistent list↔modal; "non rémunéré"
  never flagged paid.
- RLS unchanged; no `service_role` key in `app/`; applications/CVs still private.
- Python `pytest` and front-end `lint + vitest + build` all green in CI.
- `docs/app.js`/`index.html` removed; `docs/perso.html` still works; docs updated.
```
