-- Update 2: every group expense follows the group's current membership.
begin;
alter table wallet_private.expenses add column if not exists share_mode text not null default 'everyone' check (share_mode in ('everyone','selected'));

create or replace function public.wallet_setup_version() returns integer
language plpgsql security definer set search_path = '' as $$
begin
  perform wallet_private.viewer();
  return 2;
end $$;

create or replace function public.wallet_add_expense(gid uuid, expense_id uuid, title text, total bigint, payer uuid, expense_date date, splits jsonb) returns uuid
language plpgsql security definer set search_path = '' as $$
declare actor uuid := wallet_private.require_member(gid); item jsonb; share_total bigint := 0; person uuid; share_value bigint;
begin
  if expense_id is null or title is null or length(trim(title)) not between 1 and 160 or total is null or total not between 1 and 1000000000000 or expense_date is null then raise exception 'Check the expense description, amount, and date.'; end if;
  if not exists(select 1 from wallet_private.members where group_id=gid and user_id=payer) then raise exception 'The payer must belong to this group.'; end if;
  if jsonb_typeof(splits) is distinct from 'array' then raise exception 'Choose participants for this expense.'; end if;
  if jsonb_array_length(splits) not between 1 and 100 then raise exception 'Choose 1–100 participants.'; end if;
  for item in select value from jsonb_array_elements(splits) loop
    person := (item->>'user_id')::uuid;
    if (item->>'amount') is null or (item->>'amount') !~ '^[0-9]+$' then raise exception 'Each share must be a whole number of paise.'; end if;
    share_value := (item->>'amount')::bigint;
    if share_value>total or not exists(select 1 from wallet_private.members where group_id=gid and user_id=person) then raise exception 'Shares must belong to group members and fit the total.'; end if;
    share_total := share_total+share_value;
  end loop;
  if share_total<>total then raise exception 'The shares must add up exactly to the expense total.'; end if;
  if (select count(distinct value->>'user_id') from jsonb_array_elements(splits))<>jsonb_array_length(splits) then raise exception 'A participant cannot appear twice.'; end if;
  if exists(select 1 from wallet_private.expenses where id=expense_id) then
    if not exists(select 1 from wallet_private.expenses where id=expense_id and created_by=actor and group_id=gid and description=trim(title) and amount=total and paid_by=payer and spent_on=expense_date)
      or exists(select s.user_id,s.amount from wallet_private.shares s where s.expense_id=wallet_add_expense.expense_id except select (value->>'user_id')::uuid,(value->>'amount')::bigint from jsonb_array_elements(splits))
      or exists(select (value->>'user_id')::uuid,(value->>'amount')::bigint from jsonb_array_elements(splits) except select s.user_id,s.amount from wallet_private.shares s where s.expense_id=wallet_add_expense.expense_id)
      then raise exception 'This request was already saved with different details. Refresh the group.'; end if;
    return expense_id;
  end if;
  insert into wallet_private.expenses(id,group_id,description,amount,paid_by,spent_on,created_by,created_at) values(expense_id,gid,trim(title),total,payer,expense_date,actor,now());
  insert into wallet_private.shares select expense_id,(value->>'user_id')::uuid,(value->>'amount')::bigint from jsonb_array_elements(splits);
  return expense_id;
end $$;

create or replace function wallet_private.resplit_everyone(gid uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare member_count bigint;
begin
  select count(*) into member_count from wallet_private.members where group_id=gid;
  if member_count=0 then raise exception 'This group has no members.'; end if;
  delete from wallet_private.shares s using wallet_private.expenses e where s.expense_id=e.id and e.group_id=gid and e.share_mode='everyone';
  insert into wallet_private.shares(expense_id,user_id,amount)
  select e.id,m.user_id,e.amount/member_count + case when m.position<=e.amount%member_count then 1 else 0 end
  from wallet_private.expenses e cross join
    (select user_id,row_number() over(order by joined_at,user_id) as position from wallet_private.members where group_id=gid) m
  where e.group_id=gid and e.share_mode='everyone';
end $$;

update wallet_private.expenses set share_mode='everyone';
-- Bring every saved expense onto the current group roster during this update.
do $$
declare gid uuid;
begin
  for gid in select id from wallet_private.groups loop
    perform wallet_private.resplit_everyone(gid);
  end loop;
end $$;

create or replace function public.wallet_accept_invite(invitation_id uuid) returns uuid
language plpgsql security definer set search_path = '' as $$
declare actor uuid := wallet_private.viewer(); address text; invitation wallet_private.invitations%rowtype;
begin
  select lower(email) into address from auth.users where id=actor;
  -- Group lock serializes joining and financial mutations, so shares cannot go stale.
  select * into invitation from wallet_private.invitations where id=invitation_id;
  if not found or invitation.email<>address then raise exception 'This invitation is unavailable or belongs to another email address.'; end if;
  perform 1 from wallet_private.groups where id=invitation.group_id for update;
  select * into invitation from wallet_private.invitations where id=invitation_id for update;
  if invitation.email<>address or invitation.expires_at<=now() or invitation.accepted_at is not null then raise exception 'This invitation is unavailable or belongs to another email address.'; end if;
  insert into wallet_private.members values(invitation.group_id,actor,'member',now()) on conflict do nothing;
  update wallet_private.invitations set accepted_at=now() where id=invitation_id;
  perform wallet_private.resplit_everyone(invitation.group_id);
  return invitation.group_id;
end $$;

create or replace function public.wallet_add_shared_expense(gid uuid, expense_id uuid, title text, total bigint, payer uuid, expense_date date, splits jsonb, mode text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare actor uuid := wallet_private.require_member(gid); result uuid; current_splits jsonb; member_count bigint;
begin
  perform 1 from wallet_private.groups where id=gid for update;
  if mode is distinct from 'everyone' then raise exception 'Expenses are shared equally with everyone in this group.'; end if;
  if exists(select 1 from wallet_private.expenses where id=expense_id) then
    if not exists(select 1 from wallet_private.expenses where id=expense_id and group_id=gid and created_by=actor and description=trim(title) and amount=total and paid_by=payer and spent_on=expense_date and share_mode=mode) then
      raise exception 'This expense request was already saved with different details. Refresh the group.';
    end if;
    if mode='everyone' then return expense_id; end if;
  end if;
  select count(*) into member_count from wallet_private.members where group_id=gid;
  select jsonb_agg(jsonb_build_object('user_id',user_id,'amount',total/member_count + case when position<=total%member_count then 1 else 0 end)) into current_splits
    from (select user_id,row_number() over(order by joined_at,user_id) as position from wallet_private.members where group_id=gid) members;
  result:=public.wallet_add_expense(gid,expense_id,title,total,payer,expense_date,current_splits);
  update wallet_private.expenses set share_mode=mode where id=result;
  return result;
end $$;

create or replace function public.wallet_share_with_everyone(gid uuid, expense_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare actor uuid := wallet_private.require_member(gid);
begin
  perform 1 from wallet_private.groups where id=gid for update;
  if not exists(select 1 from wallet_private.expenses e where e.id=expense_id and e.group_id=gid and (e.created_by=actor or exists(select 1 from wallet_private.members where group_id=gid and user_id=actor and role='admin'))) then
    raise exception 'Only the expense creator or a group admin can change this split.';
  end if;
  update wallet_private.expenses set share_mode='everyone' where id=expense_id and group_id=gid;
  perform wallet_private.resplit_everyone(gid);
end $$;

-- The original function remains available only to the trusted wrapper above.
revoke all on function public.wallet_add_expense(uuid,uuid,text,bigint,uuid,date,jsonb) from public,anon,authenticated;
revoke all on function wallet_private.resplit_everyone(uuid) from public,anon,authenticated;
revoke all on function public.wallet_setup_version(),public.wallet_add_shared_expense(uuid,uuid,text,bigint,uuid,date,jsonb,text),public.wallet_share_with_everyone(uuid,uuid) from public,anon,authenticated;
grant execute on function public.wallet_setup_version(),public.wallet_add_shared_expense(uuid,uuid,text,bigint,uuid,date,jsonb,text),public.wallet_share_with_everyone(uuid,uuid) to authenticated;
notify pgrst,'reload schema';
commit;
