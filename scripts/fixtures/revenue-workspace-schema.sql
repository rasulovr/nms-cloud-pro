-- Minimal synthetic tables required by the existing read-only revenue workspace.
-- This fixture contains no production rows.
alter table public.employees add column full_name text, add column position text;
create table public.branches(id uuid primary key,name text);
create table public.daily_revenue_entries(id uuid,branch_id uuid,revenue_date date,created_at timestamptz default now());
create table public.daily_cash_register(id uuid,branch_id uuid,cash_date date);
create table public.expense_categories(id uuid,name text,is_active boolean);
create table public.daily_expenses(id uuid,branch_id uuid,expense_date date,category_id uuid,amount numeric,created_at timestamptz default now(),deleted_at timestamptz);
create table public.daily_cash_inflows(id uuid,branch_id uuid,inflow_date date,amount numeric,created_at timestamptz default now(),deleted_at timestamptz);
create table public.finance_operation_log(id uuid,branch_id uuid,operation_date date,created_at timestamptz default now());
create table public.daily_revenue(branch_id uuid,revenue_date date,cash_amount numeric,bank_amount numeric,wolt_amount numeric,deleted_at timestamptz);
create table public.monthly_branch_service_charge_cost(branch_id uuid,month date,service_charge_amount numeric,staff_cost_amount numeric);
