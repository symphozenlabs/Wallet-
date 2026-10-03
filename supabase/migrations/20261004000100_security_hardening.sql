-- Make the private-table design explicit and remove elevated code from the public API.
-- The implementations are moved unchanged into wallet_private. Public RPC entry points
-- are small SECURITY INVOKER wrappers; they can call only the explicitly granted helpers.
begin;

-- The tables stay inaccessible directly. These policies make the deny-all intent explicit
-- even if table or schema grants are changed later by mistake.
create policy "No direct role access" on wallet_private.groups
  for all to anon, authenticated using (false) with check (false);
create policy "No direct role access" on wallet_private.members
  for all to anon, authenticated using (false) with check (false);
create policy "No direct role access" on wallet_private.invitations
  for all to anon, authenticated using (false) with check (false);
create policy "No direct role access" on wallet_private.expenses
  for all to anon, authenticated using (false) with check (false);
create policy "No direct role access" on wallet_private.shares
  for all to anon, authenticated using (false) with check (false);
create policy "No direct role access" on wallet_private.settlements
  for all to anon, authenticated using (false) with check (false);

-- Move the original checked implementations out of the Data API schema without changing
-- their bodies. Their execute grants are retained for the wrappers below.
alter function public.wallet_accept_invite(uuid) set schema wallet_private;
alter function public.wallet_add_shared_expense(uuid,uuid,text,bigint,uuid,date,jsonb,text) set schema wallet_private;
alter function public.wallet_create_group(text) set schema wallet_private;
alter function public.wallet_dashboard() set schema wallet_private;
alter function public.wallet_group(uuid) set schema wallet_private;
alter function public.wallet_invite(uuid,text) set schema wallet_private;
alter function public.wallet_settle(uuid,uuid,uuid,uuid,bigint) set schema wallet_private;
alter function public.wallet_setup_version() set schema wallet_private;
alter function public.wallet_share_with_everyone(uuid,uuid) set schema wallet_private;

grant usage on schema wallet_private to authenticated;

create function public.wallet_accept_invite(invitation_id uuid) returns uuid
language sql security invoker set search_path = '' as $$
  select wallet_private.wallet_accept_invite(invitation_id)
$$;
create function public.wallet_add_shared_expense(gid uuid, expense_id uuid, title text, total bigint, payer uuid, expense_date date, splits jsonb, mode text) returns uuid
language sql security invoker set search_path = '' as $$
  select wallet_private.wallet_add_shared_expense(gid,expense_id,title,total,payer,expense_date,splits,mode)
$$;
create function public.wallet_create_group(group_name text) returns uuid
language sql security invoker set search_path = '' as $$
  select wallet_private.wallet_create_group(group_name)
$$;
create function public.wallet_dashboard() returns jsonb
language sql security invoker set search_path = '' as $$
  select wallet_private.wallet_dashboard()
$$;
create function public.wallet_group(gid uuid) returns jsonb
language sql security invoker set search_path = '' as $$
  select wallet_private.wallet_group(gid)
$$;
create function public.wallet_invite(gid uuid, invite_email text) returns void
language sql security invoker set search_path = '' as $$
  select wallet_private.wallet_invite(gid,invite_email)
$$;
create function public.wallet_settle(gid uuid, settlement_id uuid, from_user uuid, to_user uuid, total bigint) returns uuid
language sql security invoker set search_path = '' as $$
  select wallet_private.wallet_settle(gid,settlement_id,from_user,to_user,total)
$$;
create function public.wallet_setup_version() returns integer
language sql security invoker set search_path = '' as $$
  select wallet_private.wallet_setup_version()
$$;
create function public.wallet_share_with_everyone(gid uuid, expense_id uuid) returns void
language sql security invoker set search_path = '' as $$
  select wallet_private.wallet_share_with_everyone(gid,expense_id)
$$;

-- Do not inherit PostgreSQL's default EXECUTE grant to PUBLIC for newly created functions.
revoke all on function public.wallet_accept_invite(uuid),
  public.wallet_add_shared_expense(uuid,uuid,text,bigint,uuid,date,jsonb,text),
  public.wallet_create_group(text), public.wallet_dashboard(), public.wallet_group(uuid),
  public.wallet_invite(uuid,text), public.wallet_settle(uuid,uuid,uuid,uuid,bigint),
  public.wallet_setup_version(), public.wallet_share_with_everyone(uuid,uuid)
  from public, anon, authenticated;
grant execute on function public.wallet_accept_invite(uuid),
  public.wallet_add_shared_expense(uuid,uuid,text,bigint,uuid,date,jsonb,text),
  public.wallet_create_group(text), public.wallet_dashboard(), public.wallet_group(uuid),
  public.wallet_invite(uuid,text), public.wallet_settle(uuid,uuid,uuid,uuid,bigint),
  public.wallet_setup_version(), public.wallet_share_with_everyone(uuid,uuid)
  to authenticated;

notify pgrst, 'reload schema';
commit;
