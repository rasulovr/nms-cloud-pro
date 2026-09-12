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

-- Rollback for phase 1 schema objects:
-- drop function if exists public.rms_supplier_purchases_page_secure(integer, integer);
-- drop table if exists public.rms_internal_auth_attempts;
-- drop table if exists public.rms_internal_auth_accounts;
