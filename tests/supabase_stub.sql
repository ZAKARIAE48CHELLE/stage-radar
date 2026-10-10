-- Minimal stand-in for the parts of Supabase that schema.sql relies on,
-- so the schema can be tested on a plain local Postgres.
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;

create schema auth;
create table auth.users (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  raw_user_meta_data jsonb not null default '{}'
);
create function auth.uid() returns uuid language sql stable as
  $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
grant usage on schema auth to anon, authenticated;

create schema extensions;
grant usage on schema extensions to anon, authenticated;

create schema storage;
create table storage.buckets (id text primary key, name text, public boolean,
                              file_size_limit bigint, allowed_mime_types text[]);
create table storage.objects (id uuid primary key default gen_random_uuid(),
                              bucket_id text, name text);
alter table storage.objects enable row level security;
create function storage.foldername(name text) returns text[] language sql immutable as
  $$ select (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'), 1) - 1] $$;
grant usage on schema storage to authenticated;
grant all on storage.objects to authenticated;

grant usage on schema public to anon, authenticated, service_role;
