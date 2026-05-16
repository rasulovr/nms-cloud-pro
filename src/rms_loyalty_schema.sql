-- RMS Loyalty Pro — Supabase schema v1

create extension if not exists pgcrypto;

create table if not exists public.rms_loyalty_clients (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'Гость',
  phone text not null unique,
  birthday date,
  notes text,
  level text not null default 'new' check (level in ('new','silver','gold','vip')),
  bonus_balance numeric(12,2) not null default 0,
  total_spent numeric(12,2) not null default 0,
  visits_count integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.rms_loyalty_transactions (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.rms_loyalty_clients(id) on delete cascade,
  client_name text,
  client_phone text,
  type text not null check (type in ('earn','redeem','adjustment','birthday','promo')),
  amount numeric(12,2) not null,
  order_total numeric(12,2),
  order_id text,
  branch_id text,
  branch_name text,
  comment text,
  created_at timestamptz not null default now()
);

create table if not exists public.rms_loyalty_rules (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  rule_type text not null default 'cashback',
  cashback_percent numeric(5,2) not null default 5,
  max_redeem_percent numeric(5,2) not null default 30,
  birthday_bonus numeric(12,2) not null default 10,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

insert into public.rms_loyalty_rules (name, rule_type, cashback_percent, max_redeem_percent, birthday_bonus)
select 'Base Loyalty Rule', 'cashback', 5, 30, 10
where not exists (select 1 from public.rms_loyalty_rules where name = 'Base Loyalty Rule');

create index if not exists idx_rms_loyalty_clients_phone on public.rms_loyalty_clients(phone);
create index if not exists idx_rms_loyalty_clients_level on public.rms_loyalty_clients(level);
create index if not exists idx_rms_loyalty_transactions_client on public.rms_loyalty_transactions(client_id, created_at desc);
create index if not exists idx_rms_loyalty_transactions_created on public.rms_loyalty_transactions(created_at desc);

-- If RLS is enabled in your project, add policies matching your RMS auth logic.
