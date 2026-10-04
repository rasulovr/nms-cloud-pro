-- Synthetic, isolated PostgreSQL fixture. No production/customer data.
create role anon;
create role authenticated;
create schema auth;
grant usage on schema auth, public to anon, authenticated;
create table auth.users(id uuid primary key);
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;
create table public.rms_internal_auth_accounts(auth_user_id uuid primary key, is_active boolean, is_admin boolean);
alter table public.rms_internal_auth_accounts enable row level security;
create table public.user_profiles(id uuid primary key, is_active boolean, role text);
create function public.rms_has_permission(uuid, text) returns boolean language sql stable as $$
  select exists(select 1 from public.user_profiles where id=$1 and role='admin');
$$;
grant select on public.user_profiles to authenticated;
create table public.employees(id uuid primary key, branch_id uuid);
create table public.salary_periods(
  id uuid primary key default gen_random_uuid(), employee_id uuid not null references public.employees(id),
  branch_id uuid, salary_month date not null, worked_days numeric not null default 0,
  salary_gross numeric not null default 0, card_payment numeric not null default 0, cash_payment numeric not null default 0,
  advance_amount numeric not null default 0, deduction_amount numeric not null default 0, salary_net numeric not null default 0,
  comment text, previous_balance_amount numeric not null default 0, created_by uuid,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(employee_id,salary_month)
);
create table public.salary_advances(
  id uuid primary key default gen_random_uuid(), employee_id uuid not null references public.employees(id), branch_id uuid,
  advance_date date not null, amount numeric not null, comment text, operation_type text not null default 'advance',
  is_cancelled boolean not null default false, created_by uuid, updated_by uuid,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.salary_payments(
  id uuid primary key default gen_random_uuid(), employee_id uuid not null references public.employees(id), branch_id uuid,
  salary_month date not null, payment_date date not null, amount numeric not null, method text not null, comment text,
  is_cancelled boolean not null default false, created_by uuid,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.audit_logs(id uuid primary key default gen_random_uuid(), user_id uuid, action text, table_name text, record_id uuid, old_data jsonb, new_data jsonb);
create function public.audit_table_changes() returns trigger language plpgsql security definer as $$
begin
  insert into public.audit_logs(user_id,action,table_name,record_id,old_data,new_data)
  values(auth.uid(),tg_op,tg_table_name,new.id,case when tg_op='UPDATE' then to_jsonb(old) else null end,to_jsonb(new));
  return new;
end;$$;
create function public.set_updated_at() returns trigger language plpgsql as $$begin new.updated_at=now();return new;end;$$;
create trigger trg_audit_salary_periods after insert or update on public.salary_periods for each row execute function public.audit_table_changes();
create trigger trg_salary_periods_updated_at before update on public.salary_periods for each row execute function public.set_updated_at();
grant select,insert,update on public.salary_periods, public.salary_advances, public.salary_payments to authenticated;
grant select on public.employees to authenticated;
alter table public.salary_periods enable row level security;
alter table public.salary_advances enable row level security;
alter table public.salary_payments enable row level security;
create policy period_read on public.salary_periods for select to authenticated using(true);
create policy period_insert on public.salary_periods for insert to authenticated with check(true);
create policy advance_read on public.salary_advances for select to authenticated using(true);
create policy advance_insert on public.salary_advances for insert to authenticated with check(true);
create policy payment_read on public.salary_payments for select to authenticated using(true);
create policy payment_insert on public.salary_payments for insert to authenticated with check(true);
