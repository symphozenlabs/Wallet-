-- Wallet security rollback for supabase/migrations/20261004000100_security_hardening.sql
-- Snapshot checked before applying the change:
--   * six wallet_private tables had RLS enabled, no policies, and no grants to anon/authenticated
--   * wallet_private schema had no USAGE grant to anon/authenticated
--   * the nine app RPC implementations were SECURITY DEFINER functions in public, with EXECUTE
--     for authenticated and service_role, and no EXECUTE for anon or PUBLIC
--   * the app implementations are moved unchanged by the migration; this script moves them back.
-- Run only if the migration or its checks fail. This does not delete any app data.
begin;

drop function if exists public.wallet_accept_invite(uuid);
drop function if exists public.wallet_add_shared_expense(uuid,uuid,text,bigint,uuid,date,jsonb,text);
drop function if exists public.wallet_create_group(text);
drop function if exists public.wallet_dashboard();
drop function if exists public.wallet_group(uuid);
drop function if exists public.wallet_invite(uuid,text);
drop function if exists public.wallet_settle(uuid,uuid,uuid,uuid,bigint);
drop function if exists public.wallet_setup_version();
drop function if exists public.wallet_share_with_everyone(uuid,uuid);

drop policy if exists "No direct role access" on wallet_private.groups;
drop policy if exists "No direct role access" on wallet_private.members;
drop policy if exists "No direct role access" on wallet_private.invitations;
drop policy if exists "No direct role access" on wallet_private.expenses;
drop policy if exists "No direct role access" on wallet_private.shares;
drop policy if exists "No direct role access" on wallet_private.settlements;

revoke usage on schema wallet_private from authenticated;
revoke execute on function wallet_private.wallet_accept_invite(uuid) from authenticated;
revoke execute on function wallet_private.wallet_add_shared_expense(uuid,uuid,text,bigint,uuid,date,jsonb,text) from authenticated;
revoke execute on function wallet_private.wallet_create_group(text) from authenticated;
revoke execute on function wallet_private.wallet_dashboard() from authenticated;
revoke execute on function wallet_private.wallet_group(uuid) from authenticated;
revoke execute on function wallet_private.wallet_invite(uuid,text) from authenticated;
revoke execute on function wallet_private.wallet_settle(uuid,uuid,uuid,uuid,bigint) from authenticated;
revoke execute on function wallet_private.wallet_setup_version() from authenticated;
revoke execute on function wallet_private.wallet_share_with_everyone(uuid,uuid) from authenticated;

alter function wallet_private.wallet_accept_invite(uuid) set schema public;
alter function wallet_private.wallet_add_shared_expense(uuid,uuid,text,bigint,uuid,date,jsonb,text) set schema public;
alter function wallet_private.wallet_create_group(text) set schema public;
alter function wallet_private.wallet_dashboard() set schema public;
alter function wallet_private.wallet_group(uuid) set schema public;
alter function wallet_private.wallet_invite(uuid,text) set schema public;
alter function wallet_private.wallet_settle(uuid,uuid,uuid,uuid,bigint) set schema public;
alter function wallet_private.wallet_setup_version() set schema public;
alter function wallet_private.wallet_share_with_everyone(uuid,uuid) set schema public;

grant execute on function public.wallet_accept_invite(uuid) to authenticated;
grant execute on function public.wallet_add_shared_expense(uuid,uuid,text,bigint,uuid,date,jsonb,text) to authenticated;
grant execute on function public.wallet_create_group(text) to authenticated;
grant execute on function public.wallet_dashboard() to authenticated;
grant execute on function public.wallet_group(uuid) to authenticated;
grant execute on function public.wallet_invite(uuid,text) to authenticated;
grant execute on function public.wallet_settle(uuid,uuid,uuid,uuid,bigint) to authenticated;
grant execute on function public.wallet_setup_version() to authenticated;
grant execute on function public.wallet_share_with_everyone(uuid,uuid) to authenticated;

notify pgrst, 'reload schema';
commit;
