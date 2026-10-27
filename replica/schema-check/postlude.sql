-- Supabase grants these by default; plain Postgres needs them for the RLS smoke test.
grant usage on schema public to anon, authenticated, service_role;
grant all on all tables in schema public to authenticated, service_role;
grant all on all sequences in schema public to authenticated, service_role;
grant execute on all functions in schema public to authenticated, service_role;
grant usage on schema realtime, storage, auth to authenticated;
grant all on realtime.messages to authenticated;
grant all on storage.objects, storage.buckets to authenticated;
grant select on auth.users to authenticated;
grant execute on all functions in schema realtime to authenticated;
grant execute on all functions in schema auth to authenticated;
