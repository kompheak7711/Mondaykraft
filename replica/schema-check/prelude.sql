-- Stubs for the Supabase-managed schemas so schema.sql can run on plain Postgres.
create schema auth;
create table auth.users (id uuid primary key default gen_random_uuid(), email text, raw_user_meta_data jsonb default '{}');
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
create role anon nologin; create role authenticated nologin; create role service_role nologin;
create schema realtime;
create table realtime.messages (id bigserial primary key, topic text, extension text, payload jsonb, inserted_at timestamptz default now());
create function realtime.topic() returns text language sql stable as $$ select current_setting('realtime.topic', true) $$;
create function realtime.broadcast_changes(topic text, event text, operation text, table_name text, table_schema text, new record, old record, level text default 'ROW')
returns void language plpgsql as $$ begin insert into realtime.messages(topic, extension, payload) values (topic, 'broadcast', jsonb_build_object('event', event, 'op', operation, 'table', table_name)); end $$;
create function realtime.send(payload jsonb, event text, topic text, private boolean default true)
returns void language plpgsql as $$ begin insert into realtime.messages(topic, extension, payload) values (topic, 'broadcast', payload || jsonb_build_object('event', event)); end $$;
create schema storage;
create table storage.buckets (id text primary key, name text, public boolean default false, file_size_limit bigint, allowed_mime_types text[]);
create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text, owner uuid);
create schema cron;
create function cron.schedule(job_name text, schedule text, command text) returns bigint language sql as $$ select 1::bigint $$;
create extension if not exists pgcrypto;
