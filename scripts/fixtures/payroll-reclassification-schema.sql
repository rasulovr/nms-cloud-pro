-- Isolated fixture: ledger columns/defaults/constraints and every attached trigger
-- match the inspected production schema. Support identities/branches are synthetic.
-- Synthetic, isolated PostgreSQL fixture. No production/customer data.
create role anon;
create role authenticated;
create role service_role;
create role supabase_auth_admin;
create schema auth;
grant usage on schema auth, public to anon, authenticated;
create table auth.users(id uuid primary key);
CREATE OR REPLACE FUNCTION auth.uid()
 RETURNS uuid
 LANGUAGE sql
 STABLE
AS $function$
  select
  coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::uuid
$function$;
alter function auth.uid() owner to supabase_auth_admin;
create table public.rms_internal_auth_accounts(auth_user_id uuid primary key, is_active boolean, is_admin boolean);
alter table public.rms_internal_auth_accounts enable row level security;
create table public.user_profiles(id uuid primary key, is_active boolean, role text);
create function public.rms_has_permission(uuid, text) returns boolean language sql stable as $$
  select exists(select 1 from public.user_profiles where id=$1 and role='admin');
$$;
grant select on public.user_profiles to authenticated;
create table public.employees(id uuid primary key, branch_id uuid);

create table public.branches(id uuid primary key,name text);
create type public.audit_action as enum ('create','update','delete','login');
create table public.salary_periods(
  id uuid default gen_random_uuid() not null,
  employee_id uuid not null,
  branch_id uuid,
  salary_month date not null,
  worked_days numeric(6,2) default 0 not null,
  salary_gross numeric(12,2) default 0 not null,
  card_payment numeric(12,2) default 0 not null,
  cash_payment numeric(12,2) default 0 not null,
  advance_amount numeric(12,2) default 0 not null,
  deduction_amount numeric(12,2) default 0 not null,
  salary_net numeric(12,2) default 0 not null,
  comment text,
  created_by uuid,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  previous_balance_amount numeric default 0 not null,
  constraint salary_periods_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE SET NULL,
  constraint salary_periods_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id),
  constraint salary_periods_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
  constraint salary_periods_employee_id_salary_month_key UNIQUE (employee_id, salary_month),
  constraint salary_periods_pkey PRIMARY KEY (id)
);
create table public.salary_advances(
  id uuid default gen_random_uuid() not null,
  employee_id uuid not null,
  branch_id uuid,
  advance_date date default CURRENT_DATE not null,
  amount numeric(12,2) default 0 not null,
  comment text,
  created_by uuid,
  updated_by uuid,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  is_cancelled boolean default false not null,
  cancelled_at timestamp with time zone,
  cancelled_by uuid,
  cancel_comment text,
  operation_type text default 'advance'::text not null,
  created_by_text text,
  updated_by_text text,
  cancelled_by_text text,
  edited_at timestamp with time zone,
  edited_by text,
  edit_comment text,
  constraint salary_advances_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE SET NULL,
  constraint salary_advances_cancelled_by_fkey FOREIGN KEY (cancelled_by) REFERENCES auth.users(id),
  constraint salary_advances_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id),
  constraint salary_advances_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
  constraint salary_advances_pkey PRIMARY KEY (id),
  constraint salary_advances_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES auth.users(id)
);
create table public.salary_payments(
  id uuid default gen_random_uuid() not null,
  employee_id uuid not null,
  branch_id uuid,
  salary_month date not null,
  payment_date date default CURRENT_DATE not null,
  amount numeric(12,2) default 0 not null,
  method text default 'cash'::text not null,
  comment text,
  is_cancelled boolean default false not null,
  cancelled_at timestamp with time zone,
  cancelled_by uuid,
  cancel_comment text,
  created_by uuid default auth.uid(),
  updated_by uuid,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  constraint salary_payments_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE SET NULL,
  constraint salary_payments_cancelled_by_fkey FOREIGN KEY (cancelled_by) REFERENCES auth.users(id),
  constraint salary_payments_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id),
  constraint salary_payments_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
  constraint salary_payments_pkey PRIMARY KEY (id),
  constraint salary_payments_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES auth.users(id)
);
create table public.audit_logs(
  id uuid default gen_random_uuid() not null,
  user_id uuid,
  action audit_action not null,
  table_name text not null,
  record_id uuid,
  old_data jsonb,
  new_data jsonb,
  created_at timestamp with time zone default now() not null,
  constraint audit_logs_pkey PRIMARY KEY (id),
  constraint audit_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE OR REPLACE FUNCTION public.audit_table_changes()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
declare
  v_user uuid;
  v_record_id uuid;
begin
  v_user := auth.uid();

  if tg_op = 'DELETE' then
    v_record_id := old.id;
    insert into audit_logs(user_id, action, table_name, record_id, old_data, new_data)
    values (v_user, 'delete', tg_table_name, v_record_id, to_jsonb(old), null);
    return old;
  elsif tg_op = 'UPDATE' then
    v_record_id := new.id;
    insert into audit_logs(user_id, action, table_name, record_id, old_data, new_data)
    values (v_user, 'update', tg_table_name, v_record_id, to_jsonb(old), to_jsonb(new));
    return new;
  elsif tg_op = 'INSERT' then
    v_record_id := new.id;
    insert into audit_logs(user_id, action, table_name, record_id, old_data, new_data)
    values (v_user, 'create', tg_table_name, v_record_id, null, to_jsonb(new));
    return new;
  end if;

  return null;
end;
$function$;
revoke all on function public.audit_table_changes() from public,anon,authenticated;
grant execute on function public.audit_table_changes() to service_role;
CREATE OR REPLACE FUNCTION public.protect_salary_advance_24h()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  -- Allow soft-cancel anytime.
  -- This is not editing the financial content; it is audit cancellation.
  if tg_op = 'UPDATE'
     and coalesce(old.is_cancelled, false) = false
     and coalesce(new.is_cancelled, false) = true
     and new.employee_id is not distinct from old.employee_id
     and new.branch_id is not distinct from old.branch_id
     and new.advance_date is not distinct from old.advance_date
     and new.amount is not distinct from old.amount
     and coalesce(new.operation_type, '') is not distinct from coalesce(old.operation_type, '')
  then
    new.cancelled_at := coalesce(new.cancelled_at, now());
    return new;
  end if;

  -- Keep the original protection for real edits after 24 hours.
  if old.created_at < now() - interval '24 hours' then
    raise exception 'Аванс можно редактировать или отменять только в течение 24 часов после создания';
  end if;

  return new;
end;
$function$;
revoke all on function public.protect_salary_advance_24h() from public,anon,authenticated;
grant execute on function public.protect_salary_advance_24h() to service_role;
CREATE OR REPLACE FUNCTION public.set_salary_advance_audit()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  if tg_op = 'INSERT' then
    new.created_at = coalesce(new.created_at, now());
    new.updated_at = coalesce(new.updated_at, now());
    new.created_by = coalesce(new.created_by, auth.uid());
    new.updated_by = coalesce(new.updated_by, auth.uid());
  elsif tg_op = 'UPDATE' then
    new.updated_at = now();
    new.updated_by = auth.uid();

    if coalesce(old.is_cancelled, false) = false and coalesce(new.is_cancelled, false) = true then
      new.cancelled_at = coalesce(new.cancelled_at, now());
      new.cancelled_by = coalesce(new.cancelled_by, auth.uid());
    end if;
  end if;
  return new;
end;
$function$;
revoke all on function public.set_salary_advance_audit() from public,anon,authenticated;
grant execute on function public.set_salary_advance_audit() to service_role;
CREATE OR REPLACE FUNCTION public.set_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  new.updated_at = now();
  return new;
end;
$function$;
revoke all on function public.set_updated_at() from public,anon,authenticated;
grant execute on function public.set_updated_at() to service_role;
CREATE TRIGGER trg_audit_salary_periods AFTER INSERT OR DELETE OR UPDATE ON public.salary_periods FOR EACH ROW EXECUTE FUNCTION audit_table_changes();
CREATE TRIGGER trg_salary_advances_24h_delete BEFORE DELETE ON public.salary_advances FOR EACH ROW EXECUTE FUNCTION protect_salary_advance_24h();
CREATE TRIGGER trg_salary_advances_24h_update BEFORE UPDATE ON public.salary_advances FOR EACH ROW EXECUTE FUNCTION protect_salary_advance_24h();
CREATE TRIGGER trg_salary_advances_audit BEFORE INSERT OR UPDATE ON public.salary_advances FOR EACH ROW EXECUTE FUNCTION set_salary_advance_audit();
CREATE TRIGGER trg_salary_advances_updated_at BEFORE UPDATE ON public.salary_advances FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_salary_payments_updated_at BEFORE UPDATE ON public.salary_payments FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_salary_periods_updated_at BEFORE UPDATE ON public.salary_periods FOR EACH ROW EXECUTE FUNCTION set_updated_at();
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

alter table public.audit_logs enable row level security;
grant select,insert on public.audit_logs to authenticated;
create policy audit_read on public.audit_logs for select to authenticated using(true);
create policy audit_insert on public.audit_logs for insert to authenticated with check(true);
