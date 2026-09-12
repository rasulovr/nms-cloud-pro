-- RMS v405 phase 1: authenticated internal sessions and protected supplier paging.
-- No supplier purchase, purchase item, payment, balance or revenue row is modified.

create table if not exists public.rms_internal_auth_accounts (
  auth_user_id uuid primary key references auth.users(id) on delete cascade,
  internal_id text not null unique,
  login text not null unique,
  is_admin boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.rms_internal_auth_accounts enable row level security;
revoke all on table public.rms_internal_auth_accounts from anon, authenticated;

create table if not exists public.rms_internal_auth_attempts (
  login_hash text primary key,
  attempts integer not null default 0,
  window_started_at timestamptz not null default now(),
  locked_until timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.rms_internal_auth_attempts enable row level security;
revoke all on table public.rms_internal_auth_attempts from anon, authenticated;

insert into public.rms_internal_auth_accounts (auth_user_id, internal_id, login, is_admin, is_active)
select id, 'admin', 'rasulovr', true, true
from auth.users
where lower(email) = 'rasulovr@gmail.com' and deleted_at is null
on conflict (auth_user_id) do update
set is_admin = true, is_active = true, updated_at = now();

create or replace function public.rms_supplier_purchases_page_secure(
  p_limit integer default 250,
  p_offset integer default 0
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_account public.rms_internal_auth_accounts%rowtype;
  v_user jsonb;
  v_permission text;
  v_result jsonb;
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  select * into v_account
  from public.rms_internal_auth_accounts
  where auth_user_id = auth.uid() and is_active = true;

  if not found then
    raise exception 'RMS account is not linked' using errcode = '42501';
  end if;

  if not v_account.is_admin then
    select value -> v_account.login into v_user
    from public.rms_app_settings where key = 'internal_users_v2';

    select value -> v_account.internal_id ->> 'suppliers' into v_permission
    from public.rms_app_settings where key = 'internal_permissions_v2';

    if v_user is null
      or coalesce((v_user ->> 'is_active')::boolean, true) is not true
      or coalesce(v_permission, 'none') not in ('read', 'edit') then
      raise exception 'Supplier access denied' using errcode = '42501';
    end if;
  end if;

  select coalesce(
    jsonb_agg(to_jsonb(row_data) order by row_data.purchase_date desc nulls last, row_data.created_at desc nulls last),
    '[]'::jsonb
  ) into v_result
  from (
    select
      p.*,
      case when s.id is null then null else jsonb_build_object(
        'name', s.name, 'voen', s.voen,
        'payment_term_days', s.payment_term_days, 'credit_limit', s.credit_limit
      ) end as suppliers,
      case when le.id is null then null else jsonb_build_object('name', le.name, 'voen', le.voen) end as legal_entities,
      case when b.id is null then null else jsonb_build_object('name', b.name) end as branches,
      coalesce((
        select jsonb_agg(to_jsonb(item_data) order by item_data.id)
        from (
          select i.*, case when sp.id is null then null else jsonb_build_object(
            'name', sp.name, 'category', sp.category, 'base_unit', sp.base_unit
          ) end as supplier_products
          from public.supplier_purchase_items i
          left join public.supplier_products sp on sp.id = i.product_id
          where i.purchase_id = p.id
        ) item_data
      ), '[]'::jsonb) as supplier_purchase_items
    from public.supplier_purchases p
    left join public.suppliers s on s.id = p.supplier_id
    left join public.legal_entities le on le.id = p.legal_entity_id
    left join public.branches b on b.id = p.branch_id
    order by p.purchase_date desc nulls last, p.created_at desc nulls last
    limit greatest(1, least(coalesce(p_limit, 250), 500))
    offset greatest(0, coalesce(p_offset, 0))
  ) row_data;

  return v_result;
end;
$function$;

revoke all on function public.rms_supplier_purchases_page_secure(integer, integer) from public, anon;
grant execute on function public.rms_supplier_purchases_page_secure(integer, integer) to authenticated;


create index if not exists idx_supplier_purchase_items_purchase_id
  on public.supplier_purchase_items (purchase_id);

create index if not exists idx_supplier_purchases_page_order
  on public.supplier_purchases (purchase_date desc, created_at desc);

create or replace function public.rms_suppliers_workspace_secure()
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_account public.rms_internal_auth_accounts%rowtype;
  v_user jsonb;
  v_permission text;
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  select * into v_account
  from public.rms_internal_auth_accounts
  where auth_user_id = auth.uid() and is_active = true;

  if not found then
    raise exception 'RMS account is not linked' using errcode = '42501';
  end if;

  if not v_account.is_admin then
    select value -> v_account.login into v_user
    from public.rms_app_settings
    where key = 'internal_users_v2';

    select value -> v_account.internal_id ->> 'suppliers' into v_permission
    from public.rms_app_settings
    where key = 'internal_permissions_v2';

    if v_user is null
      or coalesce((v_user ->> 'is_active')::boolean, true) is not true
      or coalesce(v_permission, 'none') not in ('read', 'edit') then
      raise exception 'Supplier access denied' using errcode = '42501';
    end if;
  end if;

  return jsonb_build_object(
    'legal_entities', coalesce((
      select jsonb_agg(to_jsonb(le) order by le.name)
      from public.legal_entities le
      where coalesce(le.is_active, true) = true
    ), '[]'::jsonb),
    'suppliers', coalesce((
      select jsonb_agg(to_jsonb(s) order by s.name)
      from public.suppliers s
      where coalesce(s.is_active, true) = true
    ), '[]'::jsonb),
    'supplier_products', coalesce((
      select jsonb_agg(to_jsonb(sp) order by sp.category, sp.name)
      from public.supplier_products sp
      where coalesce(sp.is_active, true) = true
    ), '[]'::jsonb),
    'supplier_balances', coalesce((
      select jsonb_agg(to_jsonb(x) order by x.supplier_name)
      from (
        select
          s.id as supplier_id,
          s.name as supplier_name,
          coalesce(ob.opening_debt, 0) + coalesce(pu.purchase_total, 0) - coalesce(pa.payment_total, 0) as balance,
          coalesce(ob.opening_debt, 0) as opening_debt,
          coalesce(pu.purchase_total, 0) as purchase_total,
          coalesce(pa.payment_total, 0) as payment_total
        from public.suppliers s
        left join (
          select supplier_id, sum(amount) as opening_debt
          from public.supplier_opening_debts
          where deleted_at is null
          group by supplier_id
        ) ob on ob.supplier_id = s.id
        left join (
          select supplier_id, sum(total_amount) as purchase_total
          from public.supplier_purchases
          where deleted_at is null
          group by supplier_id
        ) pu on pu.supplier_id = s.id
        left join (
          select supplier_id, sum(amount) as payment_total
          from public.supplier_payments
          group by supplier_id
        ) pa on pa.supplier_id = s.id
        where coalesce(s.is_active, true) = true
      ) x
    ), '[]'::jsonb),
    'supplier_purchases', '[]'::jsonb,
    'supplier_opening_debts', coalesce((
      select jsonb_agg(to_jsonb(x) order by x.debt_date desc, x.created_at desc)
      from (
        select od.*, jsonb_build_object('name', s.name) as suppliers
        from public.supplier_opening_debts od
        left join public.suppliers s on s.id = od.supplier_id
        where od.deleted_at is null
        order by od.debt_date desc, od.created_at desc
        limit 500
      ) x
    ), '[]'::jsonb),
    'supplier_payments', coalesce((
      select jsonb_agg(to_jsonb(x) order by x.payment_date desc, x.created_at desc)
      from (
        select p.*, jsonb_build_object('name', s.name) as suppliers
        from public.supplier_payments p
        left join public.suppliers s on s.id = p.supplier_id
        order by p.payment_date desc, p.created_at desc
        limit 500
      ) x
    ), '[]'::jsonb),
    'user_profiles', coalesce((
      select jsonb_agg(jsonb_build_object('id', up.id, 'full_name', up.full_name) order by up.full_name)
      from public.user_profiles up
    ), '[]'::jsonb)
  );
end;
$function$;

revoke all on function public.rms_suppliers_workspace_secure() from public, anon;
grant execute on function public.rms_suppliers_workspace_secure() to authenticated;

-- Rollback for phase 1 schema objects:
-- drop function if exists public.rms_supplier_purchases_page_secure(integer, integer);
-- drop function if exists public.rms_suppliers_workspace_secure();
-- drop index if exists public.idx_supplier_purchases_page_order;
-- drop index if exists public.idx_supplier_purchase_items_purchase_id;
-- drop table if exists public.rms_internal_auth_attempts;
-- drop table if exists public.rms_internal_auth_accounts;
