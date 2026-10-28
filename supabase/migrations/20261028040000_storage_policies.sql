-- B-007: in the storage policies `name` resolved to assets.name inside the subquery, so no upload ever matched its
-- asset row and every upload was refused. Qualify the column so it is the object's path.
drop policy if exists assets_read on storage.objects;
drop policy if exists assets_upload on storage.objects;
drop policy if exists assets_remove on storage.objects;

create policy assets_read on storage.objects for select to authenticated using (
  bucket_id = 'assets' and exists (select 1 from public.assets a where a.storage_path = objects.name and app.can_read_board(a.board_id)));
create policy assets_upload on storage.objects for insert to authenticated with check (
  bucket_id = 'assets' and exists (select 1 from public.assets a where a.storage_path = objects.name and a.uploaded_by = (select auth.uid())));
create policy assets_remove on storage.objects for delete to authenticated using (
  bucket_id = 'assets' and exists (select 1 from public.assets a where a.storage_path = objects.name
    and (a.uploaded_by = (select auth.uid()) or app.board_role(a.board_id) = 'owner')));
