-- ═══════════════════════════════════════════════════════════════════════════
--  Stage Radar — Supabase schema
--  Paste this whole file into Supabase → SQL Editor → Run. Safe to re-run.
-- ═══════════════════════════════════════════════════════════════════════════

create extension if not exists unaccent with schema extensions;
create extension if not exists pgcrypto with schema extensions;

-- ───────────────────────────── tables ─────────────────────────────

create table if not exists public.profiles (
  id                uuid primary key references auth.users(id) on delete cascade,
  email             text not null,
  full_name         text not null default '',
  school            text not null default '',
  field             text not null default '',          -- template key chosen at onboarding
  headline          text not null default '',          -- "Élève ingénieur IA & Data — EMSI Tanger"
  pitch             text not null default '',          -- 2-4 sentences reused in cover letters
  preferred_cities  text[] not null default '{}',
  wants_pfe         boolean not null default true,
  -- [{ "label": "IA & GenAI", "weight": 35, "keywords": ["llm","rag", …] }, …]
  axes              jsonb not null default '[]'::jsonb,
  cv_path           text,
  features          jsonb not null default '{}'::jsonb,
  role              text not null default 'user'    check (role in ('user','admin')),
  status            text not null default 'pending' check (status in ('pending','approved','blocked')),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
alter table public.profiles add column if not exists features jsonb not null default '{}'::jsonb;

create table if not exists public.offers (
  id              bigint generated always as identity primary key,
  url             text not null unique,
  source          text not null,
  title           text not null,
  company         text not null default '',
  city            text not null default '',
  modality        text not null default '',
  date_posted     date,
  valid_through   date,
  is_pfe          boolean not null default false,
  description     text not null default '',
  title_norm      text not null default '',           -- lowercased, accents stripped (scraper)
  text_norm       text not null default '',           -- title + description, normalised
  also_on         jsonb not null default '[]'::jsonb, -- same offer on other sites
  first_seen      date not null default current_date,
  active          boolean not null default true,
  synced_at       timestamptz not null default now()
);
create index if not exists offers_active_idx on public.offers (active, date_posted desc);

create table if not exists public.applications (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  offer_id    bigint references public.offers(id) on delete cascade,
  status      text not null default 'a_postuler'
              check (status in ('a_postuler','envoyee','relance','entretien','offre','refus','abandon')),
  notes       text not null default '',
  letter      text not null default '',
  applied_at  date,
  is_external boolean not null default false,
  ext_title   text,
  ext_company text,
  ext_city    text,
  ext_url     text,
  ext_source  text,
  ext_date    date,
  interview_at timestamptz,
  interview_type text not null default 'visio',
  interview_notes text not null default '',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (user_id, offer_id)
);
alter table public.applications alter column offer_id drop not null;
alter table public.applications add column if not exists is_external boolean not null default false;
alter table public.applications add column if not exists ext_title text;
alter table public.applications add column if not exists ext_company text;
alter table public.applications add column if not exists ext_city text;
alter table public.applications add column if not exists ext_url text;
alter table public.applications add column if not exists ext_source text;
alter table public.applications add column if not exists ext_date date;
alter table public.applications add column if not exists interview_at timestamptz;
alter table public.applications add column if not exists interview_type text not null default 'visio';
alter table public.applications add column if not exists interview_notes text not null default '';

alter table public.applications drop constraint if exists applications_source_check;
alter table public.applications add constraint applications_source_check
  check ((not is_external and offer_id is not null) or (is_external and ext_title is not null));

create index if not exists applications_user_idx on public.applications (user_id);

create table if not exists public.career_sites (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  name        text not null,
  url         text not null,
  category    text not null default 'Général',
  notes       text not null default '',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists career_sites_user_idx on public.career_sites (user_id);

create table if not exists public.invites (
  email       text primary key,                       -- stored lowercase
  invited_by  uuid references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now()
);

create table if not exists public.scrape_runs (
  id          bigint generated always as identity primary key,
  run_at      timestamptz not null default now(),
  stats       jsonb not null default '{}'::jsonb
);

-- ───────────────────────────── helpers ─────────────────────────────

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'admin' and status = 'approved');
$$;

create or replace function public.is_approved() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and status = 'approved');
$$;

create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$ begin new.updated_at := now(); return new; end $$;

drop trigger if exists profiles_touch on public.profiles;
create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();
drop trigger if exists applications_touch on public.applications;
create trigger applications_touch before update on public.applications
  for each row execute function public.touch_updated_at();
drop trigger if exists career_sites_touch on public.career_sites;
create trigger career_sites_touch before update on public.career_sites
  for each row execute function public.touch_updated_at();

-- New auth user → profile. The very first user becomes the approved admin;
-- invited e-mails are auto-approved; everyone else waits for admin approval.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  first_user boolean;
  invited    boolean;
begin
  select not exists (select 1 from profiles) into first_user;
  select exists (select 1 from invites where email = lower(new.email)) into invited;
  insert into profiles (id, email, full_name, role, status)
  values (new.id, lower(new.email),
          coalesce(new.raw_user_meta_data->>'full_name', ''),
          case when first_user then 'admin' else 'user' end,
          case when first_user or invited then 'approved' else 'pending' end);
  delete from invites where email = lower(new.email);
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Users may edit their own profile but never their role, status, e-mail or id.
create or replace function public.guard_profile_update() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or public.is_admin() then   -- service role / admin
    return new;
  end if;
  if new.role is distinct from old.role or new.status is distinct from old.status
     or new.email is distinct from old.email or new.id is distinct from old.id
     or new.features is distinct from old.features then
    raise exception 'Not allowed to change role, status, e-mail or features';
  end if;
  return new;
end $$;

drop trigger if exists profiles_guard on public.profiles;
create trigger profiles_guard before update on public.profiles
  for each row execute function public.guard_profile_update();

-- An admin cannot demote / block themself (avoids locking everyone out).
create or replace function public.guard_last_admin() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if old.role = 'admin' and old.status = 'approved'
     and (new.role <> 'admin' or new.status <> 'approved')
     and not exists (select 1 from profiles where role = 'admin' and status = 'approved' and id <> old.id) then
    raise exception 'At least one approved admin must remain';
  end if;
  return new;
end $$;

drop trigger if exists profiles_last_admin on public.profiles;
create trigger profiles_last_admin before update on public.profiles
  for each row execute function public.guard_last_admin();

-- ───────────────────────────── row level security ─────────────────────────────

alter table public.profiles     enable row level security;
alter table public.offers       enable row level security;
alter table public.applications enable row level security;
alter table public.career_sites enable row level security;
alter table public.invites      enable row level security;
alter table public.scrape_runs  enable row level security;

drop policy if exists "profiles: read own or admin" on public.profiles;
create policy "profiles: read own or admin" on public.profiles
  for select to authenticated using (id = auth.uid() or public.is_admin());
drop policy if exists "profiles: update own or admin" on public.profiles;
create policy "profiles: update own or admin" on public.profiles
  for update to authenticated using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());
drop policy if exists "profiles: admin delete" on public.profiles;
create policy "profiles: admin delete" on public.profiles
  for delete to authenticated using (public.is_admin() and id <> auth.uid());

drop policy if exists "offers: approved users read" on public.offers;
create policy "offers: approved users read" on public.offers
  for select to authenticated using (public.is_approved());

-- Applications are private: not even the admin can read other users' notes/letters.
drop policy if exists "applications: own rows" on public.applications;
create policy "applications: own rows" on public.applications
  for all to authenticated
  using (user_id = auth.uid() and public.is_approved())
  with check (user_id = auth.uid() and public.is_approved());

-- Career sites are private to their owner.
drop policy if exists "career_sites: own rows" on public.career_sites;
create policy "career_sites: own rows" on public.career_sites
  for all to authenticated
  using (user_id = auth.uid() and public.is_approved())
  with check (user_id = auth.uid() and public.is_approved());

drop policy if exists "invites: admin" on public.invites;
create policy "invites: admin" on public.invites
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "scrape_runs: approved read" on public.scrape_runs;
create policy "scrape_runs: approved read" on public.scrape_runs
  for select to authenticated using (public.is_approved());

revoke all on public.profiles, public.offers, public.applications, public.career_sites, public.invites, public.scrape_runs from anon;
grant select, update, delete       on public.profiles     to authenticated;
grant select                       on public.offers       to authenticated;
grant select, insert, update, delete on public.applications to authenticated;
grant select, insert, update, delete on public.career_sites to authenticated;
grant select, insert, delete       on public.invites      to authenticated;
grant select                       on public.scrape_runs  to authenticated;

-- ───────────────────────────── per-user scoring ─────────────────────────────
-- Same formula as scraper/scoring.py::compute_score, generalised to the user's own axes:
--   hits_i    = distinct keywords of axis i found in title+description, + those found in the title
--   fit       = Σ (hits_i / Σhits) · (weight_i / max weight)
--   intensity = min(1, Σhits / 12)
--   score     = round(100·(0.6·fit + 0.4·intensity)) + 5 if PFE wanted & PFE + 3 if preferred city/remote

create or replace function public.kw_regex(kw text) returns text
language sql immutable as $$
  select '(^|[^a-z0-9])'
      || regexp_replace(
           regexp_replace(kw, '([^a-z0-9 ])', '\\\1', 'g'),  -- escape every symbol (c++, node.js, ci/cd)
           '\s+', '[\\s-]+', 'g')
      || '($|[^a-z0-9])';
$$;

create or replace function public.my_matches(max_age_days int default 60)
returns table (
  id bigint, url text, source text, title text, company text, city text, modality text,
  date_posted date, valid_through date, is_pfe boolean, first_seen date, also_on jsonb,
  score int, axis_hits jsonb, matched text[], app_status text, app_updated timestamptz
)
language plpgsql stable security invoker set search_path = public, extensions as $$
declare
  p profiles%rowtype;
  wmax numeric;
begin
  select * into p from profiles where profiles.id = auth.uid();
  if p.id is null or p.status <> 'approved' then
    raise exception 'Account not approved';
  end if;
  select coalesce(max(greatest((a->>'weight')::numeric, 0)), 0) into wmax
    from jsonb_array_elements(p.axes) a;
  if wmax <= 0 then wmax := 1; end if;

  return query
  with axes as (
    select a.ord::int as ord, greatest(coalesce((a.val->>'weight')::numeric, 0), 0) as w,
           a.val->>'label' as label
    from jsonb_array_elements(p.axes) with ordinality a(val, ord)
  ),
  kws as (
    select distinct ax.ord, lower(extensions.unaccent(trim(k))) as kw
    from axes ax
    join lateral jsonb_array_elements_text(p.axes -> (ax.ord - 1) -> 'keywords') k on true
    where length(trim(k)) > 1
  ),
  pats as (select ord, kw, public.kw_regex(kw) as rx from kws),
  cand as (
    select o.* from offers o
    where o.active
      and (o.date_posted is null or o.date_posted >= current_date - max_age_days)
      and (o.valid_through is null or o.valid_through >= current_date)
  ),
  hits as (
    select c.id as oid, pt.ord, pt.kw,
           (c.text_norm ~ pt.rx) as in_text, (c.title_norm ~ pt.rx) as in_title
    from cand c cross join pats pt
  ),
  per_axis as (
    select oid, ord,
           count(*) filter (where in_text or in_title) + count(*) filter (where in_title) as h,
           array_agg(kw order by kw) filter (where in_text or in_title) as found
    from hits group by oid, ord
  ),
  per_offer as (
    select pa.oid,
           sum(pa.h) as total,
           sum(pa.h * ax.w) as wsum,
           jsonb_object_agg(coalesce(nullif(ax.label, ''), 'Axe ' || pa.ord), pa.h) as axis_hits
    from per_axis pa join axes ax on ax.ord = pa.ord
    group by pa.oid
  ),
  found as (
    select oid, array_agg(distinct kw order by kw) as kws
    from hits where in_text or in_title group by oid
  )
  select c.id, c.url, c.source, c.title, c.company, c.city, c.modality,
         c.date_posted, c.valid_through, c.is_pfe, c.first_seen, c.also_on,
         least(100,
           coalesce(round(100 * (0.6 * (po.wsum / nullif(po.total, 0) / wmax)
                               + 0.4 * least(1, po.total / 12.0)))::int, 0)
           + case when p.wants_pfe and c.is_pfe then 5 else 0 end
           + case when lower(extensions.unaccent(c.city)) = any (
                    select lower(extensions.unaccent(x)) from unnest(p.preferred_cities) x)
                    or (c.modality = 'Télétravail' and 'teletravail' = any (
                    select lower(extensions.unaccent(x)) from unnest(p.preferred_cities) x))
                  then 3 else 0 end
         )::int as score,
         coalesce(po.axis_hits, '{}'::jsonb), coalesce(f.kws, '{}'::text[]),
         ap.status, ap.updated_at
  from cand c
  left join per_offer po on po.oid = c.id
  left join found f on f.oid = c.id
  left join applications ap on ap.offer_id = c.id and ap.user_id = p.id
  where coalesce(po.total, 0) > 0 or ap.id is not null or not exists (select 1 from pats)
  order by 13 desc, c.date_posted desc nulls last;
end $$;

grant execute on function public.my_matches(int) to authenticated;

-- Applications on offers that are no longer active still need to show up,
-- as well as external applications tracked manually by the user.
drop function if exists public.my_applications();
create or replace function public.my_applications()
returns table (app_id bigint, offer_id bigint, status text, notes text, applied_at date,
               updated_at timestamptz, title text, company text, city text, url text,
               source text, active boolean, valid_through date, external boolean,
               letter text, ext_date date,
               interview_at timestamptz, interview_type text, interview_notes text)
language sql stable security invoker set search_path = public as $$
  select a.id, a.offer_id, a.status, a.notes,
         coalesce(a.applied_at, a.ext_date) as applied_at,
         a.updated_at,
         coalesce(o.title, a.ext_title) as title,
         coalesce(o.company, a.ext_company) as company,
         coalesce(o.city, a.ext_city) as city,
         coalesce(o.url, a.ext_url) as url,
         coalesce(o.source, a.ext_source, 'externe') as source,
         coalesce(o.active, true) as active,
         o.valid_through,
         a.is_external as external,
         a.letter,
         a.ext_date,
         a.interview_at,
         coalesce(a.interview_type, 'visio') as interview_type,
         coalesce(a.interview_notes, '') as interview_notes
  from applications a left join offers o on o.id = a.offer_id
  where a.user_id = auth.uid()
  order by a.updated_at desc;
$$;
grant execute on function public.my_applications() to authenticated;

-- ───────────────────────────── admin back office ─────────────────────────────

-- Users with application counts only (no notes/letters: those stay private).
drop function if exists public.admin_users();
create or replace function public.admin_users()
returns table (id uuid, email text, full_name text, school text, field text, role text,
               status text, created_at timestamptz, n_applications bigint, n_sent bigint,
               n_interviews bigint, last_activity timestamptz, features jsonb)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  return query
  select pr.id, pr.email, pr.full_name, pr.school, pr.field, pr.role, pr.status, pr.created_at,
         count(a.id),
         count(a.id) filter (where a.status in ('envoyee','relance','entretien','offre','refus')),
         count(a.id) filter (where a.status in ('entretien','offre')),
         max(a.updated_at),
         pr.features
  from profiles pr left join applications a on a.user_id = pr.id
  group by pr.id
  order by (pr.status = 'pending') desc, pr.created_at desc;
end $$;
grant execute on function public.admin_users() to authenticated;

create or replace function public.admin_stats()
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare out jsonb;
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  select jsonb_build_object(
    'users',          (select count(*) from profiles where status = 'approved'),
    'pending',        (select count(*) from profiles where status = 'pending'),
    'offers_active',  (select count(*) from offers where active),
    'offers_by_source', (select coalesce(jsonb_object_agg(source, n), '{}') from
                          (select source, count(*) n from offers where active group by source) s),
    'apps_by_status', (select coalesce(jsonb_object_agg(status, n), '{}') from
                          (select status, count(*) n from applications group by status) s),
    'last_run',       (select to_jsonb(r) from (select run_at, stats from scrape_runs
                                                order by run_at desc limit 1) r)
  ) into out;
  return out;
end $$;
grant execute on function public.admin_stats() to authenticated;

-- Admin reset of a member's password (callable only by approved admins).
create or replace function public.admin_update_password(target_user_id uuid, new_password text)
returns boolean
language plpgsql security definer set search_path = public, extensions, auth as $$
begin
  if not public.is_admin() then
    raise exception 'Admins only';
  end if;

  if length(new_password) < 6 then
    raise exception 'Le mot de passe doit contenir au moins 6 caractères';
  end if;

  if not exists (select 1 from public.profiles where id = target_user_id) then
    raise exception 'Utilisateur introuvable';
  end if;

  update auth.users
  set encrypted_password = extensions.crypt(new_password, extensions.gen_salt('bf')),
      updated_at = now()
  where id = target_user_id;

  return true;
end $$;
revoke execute on function public.admin_update_password(uuid, text) from public, anon;
grant execute on function public.admin_update_password(uuid, text) to authenticated;

-- Used by the scraper (service role) after each sync.
create or replace function public.deactivate_unsynced(run_started timestamptz)
returns int language sql security definer set search_path = public as $$
  with u as (update offers set active = false where active and synced_at < run_started returning 1)
  select count(*)::int from u;
$$;
revoke execute on function public.deactivate_unsynced(timestamptz) from public, anon, authenticated;
grant execute on function public.deactivate_unsynced(timestamptz) to service_role;

-- The scraper (service_role) writes offers and run logs through the REST API.
grant select, insert, update on public.offers, public.scrape_runs to service_role;
grant usage, select on all sequences in schema public to service_role;

-- ───────────────────────────── CV storage ─────────────────────────────
-- Private bucket; each user can only touch files under "<their uid>/".

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('cvs', 'cvs', false, 5242880, array['application/pdf'])
on conflict (id) do nothing;

drop policy if exists "cvs: own folder read"   on storage.objects;
drop policy if exists "cvs: own folder write"  on storage.objects;
drop policy if exists "cvs: own folder update" on storage.objects;
drop policy if exists "cvs: own folder delete" on storage.objects;
create policy "cvs: own folder read" on storage.objects for select to authenticated
  using (bucket_id = 'cvs' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "cvs: own folder write" on storage.objects for insert to authenticated
  with check (bucket_id = 'cvs' and (storage.foldername(name))[1] = auth.uid()::text and public.is_approved());
create policy "cvs: own folder update" on storage.objects for update to authenticated
  using (bucket_id = 'cvs' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "cvs: own folder delete" on storage.objects for delete to authenticated
  using (bucket_id = 'cvs' and (storage.foldername(name))[1] = auth.uid()::text);
