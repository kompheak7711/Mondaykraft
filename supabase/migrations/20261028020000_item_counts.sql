-- Update counts per item for the chat bubble on each row. A security-invoker view, so RLS on updates applies.
create or replace view public.item_update_counts with (security_invoker = true) as
  select item_id, board_id, count(*)::integer as count
  from updates where deleted_at is null
  group by item_id, board_id;
grant select on public.item_update_counts to authenticated;
