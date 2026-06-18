-- LeXora schema (PostgreSQL / Supabase)

create extension if not exists pgcrypto;

-- Enums
do $$ begin
  create type user_role as enum ('victim','lawyer','admin');
exception when duplicate_object then null; end $$;

do $$ begin
  create type account_status as enum ('pending','active','suspended');
exception when duplicate_object then null; end $$;

do $$ begin
  create type urgency_level as enum ('low','medium','high','critical');
exception when duplicate_object then null; end $$;

do $$ begin
  create type case_status as enum ('open','in_progress','closed','cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type proposal_status as enum ('pending','accepted','declined');
exception when duplicate_object then null; end $$;

do $$ begin
  create type engagement_status as enum ('active','completed','disputed','cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type credential_status as enum ('pending','approved','rejected');
exception when duplicate_object then null; end $$;

do $$ begin
  create type payment_status as enum ('pending','held','released','refunded');
exception when duplicate_object then null; end $$;

do $$ begin
  create type dispute_status as enum ('open','resolved','dismissed');
exception when duplicate_object then null; end $$;

-- 1) users (aligned with Supabase Auth: id == auth.users.id)
create table if not exists public.users (
  id uuid primary key,
  email varchar unique not null,
  password_hash text,
  role user_role not null,
  account_status account_status not null default 'pending',
  created_at timestamptz not null default now()
);

create index if not exists idx_users_role on public.users(role);
create index if not exists idx_users_account_status on public.users(account_status);

-- 2) victim_profiles
create table if not exists public.victim_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.users(id) on delete cascade,
  full_name varchar,
  cnic varchar unique,
  contact_number varchar,
  location text,
  preferred_language varchar not null default 'Urdu',
  created_at timestamptz not null default now()
);

create index if not exists idx_victim_profiles_user_id on public.victim_profiles(user_id);

-- 3) lawyer_profiles
create table if not exists public.lawyer_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.users(id) on delete cascade,
  full_name varchar,
  bio text,
  specializations text[] not null default '{}',
  years_of_experience int,
  bar_council_number varchar unique,
  office_location text,
  fee_range_min numeric,
  fee_range_max numeric,
  avg_rating numeric not null default 0,
  is_verified boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_lawyer_profiles_verified on public.lawyer_profiles(is_verified);
create index if not exists idx_lawyer_profiles_rating on public.lawyer_profiles(avg_rating);
create index if not exists idx_lawyer_profiles_specializations on public.lawyer_profiles using gin (specializations);

-- 4) lawyer_credentials
create table if not exists public.lawyer_credentials (
  id uuid primary key default gen_random_uuid(),
  lawyer_id uuid not null references public.lawyer_profiles(id) on delete cascade,
  file_type varchar not null,
  file_url text not null,
  verified_by uuid references public.users(id) on delete set null,
  verification_status credential_status not null default 'pending',
  created_at timestamptz not null default now()
);

create index if not exists idx_lawyer_credentials_lawyer_id on public.lawyer_credentials(lawyer_id);
create index if not exists idx_lawyer_credentials_status on public.lawyer_credentials(verification_status);

-- 5) cases
create table if not exists public.cases (
  id uuid primary key default gen_random_uuid(),
  victim_id uuid not null references public.victim_profiles(id) on delete cascade,
  title varchar not null,
  description text not null,
  legal_domain varchar not null,
  urgency_level urgency_level not null,
  location text not null,
  budget_min numeric,
  budget_max numeric,
  status case_status not null default 'open',
  created_at timestamptz not null default now(),
  closed_at timestamptz,
  delay_note text
);

create index if not exists idx_cases_victim_id on public.cases(victim_id);
create index if not exists idx_cases_status on public.cases(status);
create index if not exists idx_cases_legal_domain on public.cases(legal_domain);

-- 6) proposals
create table if not exists public.proposals (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases(id) on delete cascade,
  lawyer_id uuid not null references public.lawyer_profiles(id) on delete cascade,
  proposed_fee numeric not null,
  estimated_timeline text not null,
  cover_note text,
  consultation_timeline text,
  short_note text,
  status proposal_status not null default 'pending',
  created_at timestamptz not null default now(),
  unique(case_id, lawyer_id)
);

create index if not exists idx_proposals_case_id on public.proposals(case_id);
create index if not exists idx_proposals_lawyer_id on public.proposals(lawyer_id);
create index if not exists idx_proposals_status on public.proposals(status);

-- 7) engagements
create table if not exists public.engagements (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null unique references public.cases(id) on delete cascade,
  lawyer_id uuid not null references public.lawyer_profiles(id) on delete restrict,
  proposal_id uuid not null references public.proposals(id) on delete restrict,
  status engagement_status not null default 'active',
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_engagements_lawyer_id on public.engagements(lawyer_id);
create index if not exists idx_engagements_status on public.engagements(status);

-- 8) attachments
create table if not exists public.attachments (
  id uuid primary key default gen_random_uuid(),
  message_id uuid,
  file_type varchar not null,
  file_size int,
  file_url text not null,
  uploaded_by uuid not null references public.users(id) on delete restrict,
  created_at timestamptz not null default now()
);

create index if not exists idx_attachments_uploaded_by on public.attachments(uploaded_by);

-- 9) messages
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  engagement_id uuid not null references public.engagements(id) on delete cascade,
  sender_id uuid not null references public.users(id) on delete restrict,
  content text not null default '',
  attachment_id uuid references public.attachments(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.attachments
  drop constraint if exists attachments_message_id_fkey,
  add constraint attachments_message_id_fkey foreign key (message_id) references public.messages(id) on delete set null;

create index if not exists idx_messages_engagement_id on public.messages(engagement_id);
create index if not exists idx_messages_sender_id on public.messages(sender_id);

-- 10) payments
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  engagement_id uuid not null references public.engagements(id) on delete cascade,
  payer_id uuid not null references public.users(id) on delete restrict,
  payee_id uuid not null references public.users(id) on delete restrict,
  amount numeric not null,
  status payment_status not null default 'pending',
  escrow_held boolean not null default true,
  invoice_url text,
  created_at timestamptz not null default now(),
  released_at timestamptz
);

create index if not exists idx_payments_engagement_id on public.payments(engagement_id);
create index if not exists idx_payments_payer on public.payments(payer_id);
create index if not exists idx_payments_payee on public.payments(payee_id);
create index if not exists idx_payments_status on public.payments(status);

-- 11) reviews
create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  engagement_id uuid not null references public.engagements(id) on delete cascade,
  reviewer_id uuid not null references public.users(id) on delete restrict,
  reviewed_id uuid not null references public.users(id) on delete restrict,
  rating int not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now()
);

create index if not exists idx_reviews_engagement on public.reviews(engagement_id);
create index if not exists idx_reviews_reviewed on public.reviews(reviewed_id);

-- 12) notifications
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  type varchar not null,
  content text not null,
  is_read boolean not null default false,
  reference_id uuid,
  created_at timestamptz not null default now()
);

create index if not exists idx_notifications_user_id on public.notifications(user_id);
create index if not exists idx_notifications_is_read on public.notifications(is_read);

-- 13) admin_logs
create table if not exists public.admin_logs (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references public.users(id) on delete restrict,
  action_type varchar not null,
  target_user_id uuid references public.users(id) on delete set null,
  description text,
  created_at timestamptz not null default now()
);

create index if not exists idx_admin_logs_admin on public.admin_logs(admin_id);
create index if not exists idx_admin_logs_target on public.admin_logs(target_user_id);

-- 14) disputes
create table if not exists public.disputes (
  id uuid primary key default gen_random_uuid(),
  engagement_id uuid not null references public.engagements(id) on delete cascade,
  raised_by uuid not null references public.users(id) on delete restrict,
  reason text not null,
  status dispute_status not null default 'open',
  resolution_note text,
  resolved_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_disputes_engagement on public.disputes(engagement_id);
create index if not exists idx_disputes_status on public.disputes(status);

-- RPC: accept proposal (create engagement + decline others + notify)
create or replace function public.accept_proposal(p_proposal_id uuid, p_victim_user_id uuid)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_proposal record;
  v_case record;
  v_victim_id uuid;
  v_engagement public.engagements;
  v_lawyer_user_id uuid;
begin
  select id into v_victim_id from public.victim_profiles where user_id = p_victim_user_id;
  if v_victim_id is null then
    raise exception 'Victim profile not found';
  end if;

  select * into v_proposal from public.proposals where id = p_proposal_id for update;
  if not found then
    raise exception 'Proposal not found';
  end if;

  select * into v_case from public.cases where id = v_proposal.case_id for update;
  if not found then
    raise exception 'Case not found';
  end if;

  if v_case.victim_id <> v_victim_id then
    raise exception 'Forbidden';
  end if;

  if v_case.status <> 'open' then
    raise exception 'Case is not open';
  end if;

  -- accept this proposal
  update public.proposals set status = 'accepted' where id = v_proposal.id;

  -- decline all other proposals for the case
  update public.proposals
    set status = 'declined'
    where case_id = v_proposal.case_id and id <> v_proposal.id and status <> 'declined';

  -- create engagement (one per case)
  insert into public.engagements(case_id, lawyer_id, proposal_id, status, started_at)
  values (v_proposal.case_id, v_proposal.lawyer_id, v_proposal.id, 'active', now())
  returning * into v_engagement;

  -- set case in progress
  update public.cases set status = 'in_progress' where id = v_case.id;

  -- notify lawyer
  select user_id into v_lawyer_user_id from public.lawyer_profiles where id = v_proposal.lawyer_id;
  if v_lawyer_user_id is not null then
    insert into public.notifications(user_id, type, content, reference_id)
    values (v_lawyer_user_id, 'proposal_accepted', 'Your proposal was accepted', v_engagement.id);
  end if;

  return jsonb_build_object(
    'engagement', to_jsonb(v_engagement)
  );
end;
$$;

-- RPC: release payment
create or replace function public.release_payment(p_payment_id uuid, p_user_id uuid)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_payment public.payments;
begin
  select * into v_payment from public.payments where id = p_payment_id for update;
  if not found then
    raise exception 'Payment not found';
  end if;

  -- victim payer or admin can release
  if v_payment.payer_id <> p_user_id and not exists (select 1 from public.users where id = p_user_id and role='admin') then
    raise exception 'Forbidden';
  end if;

  update public.payments
    set status = 'released',
        escrow_held = false,
        released_at = now()
    where id = p_payment_id
    returning * into v_payment;

  insert into public.notifications(user_id, type, content, reference_id)
  values (v_payment.payee_id, 'payment_released', 'Payment released from escrow', v_payment.id);

  return jsonb_build_object('payment', to_jsonb(v_payment));
end;
$$;

-- RPC: close engagement (mark completed + optionally release latest held payment)
create or replace function public.close_engagement(p_engagement_id uuid, p_user_id uuid)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_eng public.engagements;
  v_case public.cases;
  v_lawyer_user_id uuid;
  v_victim_user_id uuid;
  v_payment_id uuid;
begin
  select e.* into v_eng from public.engagements e where e.id = p_engagement_id for update;
  if not found then
    raise exception 'Engagement not found';
  end if;

  select c.* into v_case from public.cases c where c.id = v_eng.case_id for update;

  -- authorization: victim (case owner) or lawyer on engagement or admin
  if not exists (select 1 from public.users u where u.id = p_user_id and u.role='admin') then
    if not (
      exists (
        select 1
        from public.victim_profiles vp
        where vp.user_id = p_user_id and vp.id = v_case.victim_id
      )
      or exists (
        select 1
        from public.lawyer_profiles lp
        where lp.user_id = p_user_id and lp.id = v_eng.lawyer_id
      )
    ) then
      raise exception 'Forbidden';
    end if;
  end if;

  update public.engagements set status='completed', ended_at=now() where id=v_eng.id returning * into v_eng;
  update public.cases set status='closed', closed_at=now() where id=v_case.id returning * into v_case;

  -- release latest held payment (if any)
  select p.id into v_payment_id
  from public.payments p
  where p.engagement_id = v_eng.id and p.status in ('held','pending')
  order by p.created_at desc
  limit 1;

  if v_payment_id is not null then
    perform public.release_payment(v_payment_id, p_user_id);
  end if;

  select user_id into v_lawyer_user_id from public.lawyer_profiles where id = v_eng.lawyer_id;
  select user_id into v_victim_user_id from public.victim_profiles where id = v_case.victim_id;

  if v_lawyer_user_id is not null then
    insert into public.notifications(user_id, type, content, reference_id)
    values (v_lawyer_user_id, 'engagement_closed', 'Engagement closed', v_eng.id);
  end if;
  if v_victim_user_id is not null then
    insert into public.notifications(user_id, type, content, reference_id)
    values (v_victim_user_id, 'engagement_closed', 'Engagement closed', v_eng.id);
  end if;

  return jsonb_build_object('engagement', to_jsonb(v_eng), 'case', to_jsonb(v_case), 'released_payment_id', v_payment_id);
end;
$$;

-- RPC: recalc lawyer avg_rating from reviews
create or replace function public.recalc_lawyer_rating(p_lawyer_id uuid)
returns void
language plpgsql
security definer
as $$
declare
  v_user_id uuid;
  v_avg numeric;
begin
  select user_id into v_user_id from public.lawyer_profiles where id = p_lawyer_id;
  if v_user_id is null then
    raise exception 'Lawyer not found';
  end if;

  select coalesce(avg(r.rating)::numeric, 0) into v_avg
  from public.reviews r
  where r.reviewed_id = v_user_id;

  update public.lawyer_profiles set avg_rating = v_avg where id = p_lawyer_id;
end;
$$;

