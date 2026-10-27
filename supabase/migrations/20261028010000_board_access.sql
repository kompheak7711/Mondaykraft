-- What the signed-in user may do on a board, in one call, so the client can lock cells and hide structure actions.
-- The policies remain the real check; this only decides what to show.
create or replace function public.board_access(p_board uuid) returns jsonb
language sql stable security invoker set search_path = public as $$
  select jsonb_build_object(
    'role', app.board_role(p_board),
    'permission_set', b.permission_set,
    'can_edit_structure', app.can_edit_structure(p_board),
    'can_edit_items', app.can_edit_items(p_board),
    'can_comment', app.can_comment(p_board),
    'is_owner', app.board_role(p_board) = 'owner',
    'workspace_role', app.workspace_role(b.workspace_id))
  from boards b where b.id = p_board
$$;

-- Members of a workspace with their profile, for people pickers and presence.
create or replace function public.workspace_people(p_workspace uuid)
returns table (id uuid, name text, email text, avatar_url text, role workspace_role)
language sql stable security invoker set search_path = public as $$
  select p.id, p.name, p.email, p.avatar_url, wm.role
  from workspace_members wm join profiles p on p.id = wm.user_id
  where wm.workspace_id = p_workspace
  order by p.name
$$;
