-- Wallet foundation. Run this entire file in the Wallet project's SQL Editor.
-- Safe to run again. All changes are applied together or rolled back together.
begin;
create schema if not exists wallet_private;
revoke all on schema wallet_private from public, anon, authenticated;

create table if not exists wallet_private.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 1 and 80),
  currency text not null default 'INR' check (currency = 'INR'),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);
create table if not exists wallet_private.members (
  group_id uuid not null references wallet_private.groups(id),
  user_id uuid not null references auth.users(id),
  role text not null check (role in ('admin','member')),
  joined_at timestamptz not null default now(),
  primary key (group_id,user_id)
);
create index if not exists wallet_members_user on wallet_private.members(user_id);
create table if not exists wallet_private.invitations (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references wallet_private.groups(id),
  email text not null,
  invited_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '14 days',
  accepted_at timestamptz,
  unique(group_id,email)
);
create index if not exists wallet_invitation_email on wallet_private.invitations(email);
create table if not exists wallet_private.expenses (
  id uuid primary key,
  group_id uuid not null references wallet_private.groups(id),
  description text not null check (length(trim(description)) between 1 and 160),
  amount bigint not null check (amount between 1 and 1000000000000),
  paid_by uuid not null,
  spent_on date not null,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  foreign key (group_id,paid_by) references wallet_private.members(group_id,user_id)
);
create index if not exists wallet_expenses_group on wallet_private.expenses(group_id);
create table if not exists wallet_private.shares (
  expense_id uuid not null references wallet_private.expenses(id),
  user_id uuid not null references auth.users(id),
  amount bigint not null check (amount >= 0),
  primary key (expense_id,user_id)
);
create table if not exists wallet_private.settlements (
  id uuid primary key,
  group_id uuid not null references wallet_private.groups(id),
  sender uuid not null,
  recipient uuid not null,
  amount bigint not null check (amount between 1 and 1000000000000),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  check (sender <> recipient),
  foreign key (group_id,sender) references wallet_private.members(group_id,user_id),
  foreign key (group_id,recipient) references wallet_private.members(group_id,user_id)
);
create index if not exists wallet_settlements_group on wallet_private.settlements(group_id);

alter table wallet_private.groups enable row level security;
alter table wallet_private.members enable row level security;
alter table wallet_private.invitations enable row level security;
alter table wallet_private.expenses enable row level security;
alter table wallet_private.shares enable row level security;
alter table wallet_private.settlements enable row level security;
revoke all on all tables in schema wallet_private from public, anon, authenticated;

create or replace function wallet_private.viewer() returns uuid
language plpgsql security definer set search_path = '' as $$
declare actor uuid := auth.uid();
begin
  if actor is null or not exists (select 1 from auth.users where id=actor and email_confirmed_at is not null) then
    raise exception 'Please sign in with a verified email address.';
  end if;
  return actor;
end $$;
create or replace function wallet_private.require_member(gid uuid, admin_only boolean default false) returns uuid
language plpgsql security definer set search_path = '' as $$
declare actor uuid := wallet_private.viewer();
begin
  if not exists (select 1 from wallet_private.members where group_id=gid and user_id=actor and (not admin_only or role='admin')) then
    raise exception 'You do not have access to this group.';
  end if;
  return actor;
end $$;

create or replace function public.wallet_dashboard() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare actor uuid := wallet_private.viewer(); address text;
begin
  select lower(email) into address from auth.users where id=actor;
  return jsonb_build_object(
    'groups', coalesce((select jsonb_agg(row_to_json(g) order by g.created_at desc)
      from (select x.id,x.name,x.currency,x.created_at,m.role,
        (select count(*) from wallet_private.members mm where mm.group_id=x.id) as member_count
        from wallet_private.groups x join wallet_private.members m on m.group_id=x.id where m.user_id=actor) g), '[]'::jsonb),
    'invitations', coalesce((select jsonb_agg(jsonb_build_object('id',i.id,'group_name',g.name,'expires_at',i.expires_at))
      from wallet_private.invitations i join wallet_private.groups g on g.id=i.group_id
      where i.email=address and i.accepted_at is null and i.expires_at>now()), '[]'::jsonb)
  );
end $$;

create or replace function public.wallet_create_group(group_name text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare actor uuid := wallet_private.viewer(); gid uuid;
begin
  if group_name is null or length(trim(group_name)) not between 1 and 80 then raise exception 'Enter a group name of 1–80 characters.'; end if;
  insert into wallet_private.groups(name,created_by) values(trim(group_name),actor) returning id into gid;
  insert into wallet_private.members values(gid,actor,'admin',now());
  return gid;
end $$;

create or replace function public.wallet_invite(gid uuid, invite_email text) returns void
language plpgsql security definer set search_path = '' as $$
declare actor uuid := wallet_private.require_member(gid,true); address text := lower(trim(invite_email));
begin
  if address is null or length(address)>254 or address !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then raise exception 'Enter a valid email address.'; end if;
  if exists(select 1 from auth.users u join wallet_private.members m on m.user_id=u.id where m.group_id=gid and lower(u.email)=address) then raise exception 'That person is already a member.'; end if;
  insert into wallet_private.invitations(group_id,email,invited_by) values(gid,address,actor)
  on conflict(group_id,email) do update set invited_by=actor,expires_at=now()+interval '14 days',accepted_at=null;
end $$;

create or replace function public.wallet_accept_invite(invitation_id uuid) returns uuid
language plpgsql security definer set search_path = '' as $$
declare actor uuid := wallet_private.viewer(); address text; invitation wallet_private.invitations%rowtype;
begin
  select lower(email) into address from auth.users where id=actor;
  select * into invitation from wallet_private.invitations where id=invitation_id for update;
  if not found or invitation.email<>address or invitation.expires_at<=now() or invitation.accepted_at is not null then raise exception 'This invitation is unavailable or belongs to another email address.'; end if;
  insert into wallet_private.members values(invitation.group_id,actor,'member',now()) on conflict do nothing;
  update wallet_private.invitations set accepted_at=now() where id=invitation_id;
  return invitation.group_id;
end $$;

create or replace function public.wallet_group(gid uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare actor uuid := wallet_private.require_member(gid);
begin
  return jsonb_build_object(
    'group',(select to_jsonb(g) from wallet_private.groups g where id=gid),
    'members',coalesce((select jsonb_agg(jsonb_build_object('user_id',m.user_id,'role',m.role,'name',coalesce(nullif(u.raw_user_meta_data->>'display_name',''),'Member')) order by m.joined_at,m.user_id)
      from wallet_private.members m join auth.users u on u.id=m.user_id where m.group_id=gid),'[]'::jsonb),
    'expenses',coalesce((select jsonb_agg(to_jsonb(e) order by e.spent_on desc,e.created_at desc) from wallet_private.expenses e where e.group_id=gid),'[]'::jsonb),
    'shares',coalesce((select jsonb_agg(to_jsonb(s)) from wallet_private.shares s join wallet_private.expenses e on e.id=s.expense_id where e.group_id=gid),'[]'::jsonb),
    'settlements',coalesce((select jsonb_agg(to_jsonb(s) order by s.created_at desc) from wallet_private.settlements s where s.group_id=gid),'[]'::jsonb),
    'invitations', case when exists(select 1 from wallet_private.members where group_id=gid and user_id=actor and role='admin') then
      coalesce((select jsonb_agg(jsonb_build_object('email',email,'expires_at',expires_at)) from wallet_private.invitations where group_id=gid and accepted_at is null and expires_at>now()),'[]'::jsonb) else '[]'::jsonb end
  );
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

create or replace function public.wallet_settle(gid uuid, settlement_id uuid, from_user uuid, to_user uuid, total bigint) returns uuid
language plpgsql security definer set search_path = '' as $$
declare actor uuid := wallet_private.require_member(gid);
begin
  if settlement_id is null or total is null or total not between 1 and 1000000000000 or from_user=to_user or (actor<>from_user and actor<>to_user) then raise exception 'Record a positive repayment involving yourself and another member.'; end if;
  if not exists(select 1 from wallet_private.members where group_id=gid and user_id=from_user) or not exists(select 1 from wallet_private.members where group_id=gid and user_id=to_user) then raise exception 'Both people must belong to this group.'; end if;
  if exists(select 1 from wallet_private.settlements where id=settlement_id) then
    if not exists(select 1 from wallet_private.settlements where id=settlement_id and created_by=actor and group_id=gid and sender=from_user and recipient=to_user and amount=total) then raise exception 'This repayment request was already saved with different details.'; end if;
    return settlement_id;
  end if;
  insert into wallet_private.settlements values(settlement_id,gid,from_user,to_user,total,actor,now());
  return settlement_id;
end $$;

revoke all on all functions in schema wallet_private from public, anon, authenticated;
revoke all on function public.wallet_dashboard(), public.wallet_create_group(text), public.wallet_invite(uuid,text), public.wallet_accept_invite(uuid), public.wallet_group(uuid), public.wallet_add_expense(uuid,uuid,text,bigint,uuid,date,jsonb), public.wallet_settle(uuid,uuid,uuid,uuid,bigint) from public, anon, authenticated;
grant execute on function public.wallet_dashboard(), public.wallet_create_group(text), public.wallet_invite(uuid,text), public.wallet_accept_invite(uuid), public.wallet_group(uuid), public.wallet_add_expense(uuid,uuid,text,bigint,uuid,date,jsonb), public.wallet_settle(uuid,uuid,uuid,uuid,bigint) to authenticated;
notify pgrst, 'reload schema';
commit;
