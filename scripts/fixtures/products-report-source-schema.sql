-- Synthetic isolated fixture. No production/customer data.
create role anon;
create role authenticated;
create schema auth;
grant usage on schema auth, public to anon, authenticated;
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;
create table public.user_profiles(id uuid primary key, is_active boolean, role text);
-- Fixture of the already-existing helper; the new source adds no definer.
create function public.rms_internal_current_is_admin() returns boolean
language sql stable security definer set search_path = pg_catalog, public, pg_temp as $$
  select exists(select 1 from public.user_profiles
    where id = auth.uid() and is_active = true and role::text = 'admin');
$$;
revoke all on function public.rms_internal_current_is_admin() from public, anon;
grant execute on function public.rms_internal_current_is_admin() to authenticated;

create table public.suppliers(id uuid primary key, name text, bulky_unused text);
create table public.branches(id uuid primary key, name text, bulky_unused text);
create table public.supplier_products(id uuid primary key, name text, category text, base_unit text, bulky_unused text);
create table public.supplier_purchases(
  id uuid primary key, supplier_id uuid, branch_id uuid, purchase_date date,
  invoice_number text, created_at timestamptz, deleted_at timestamptz,
  comment text, bulky_unused jsonb
);
-- Deliberately no status/cancelled_at/is_cancelled: production cancellation is
-- deleted_at only. product_name models an older full-row fallback dependency.
create table public.supplier_purchase_items(
  id uuid primary key, purchase_id uuid, product_id uuid, quantity numeric,
  unit text, unit_price numeric, total_amount numeric, product_name text,
  bulky_unused jsonb
);
create index on public.supplier_purchase_items(purchase_id);
create index on public.supplier_purchases(purchase_date desc, created_at desc);
grant select on public.suppliers, public.branches, public.supplier_products,
  public.supplier_purchases, public.supplier_purchase_items to authenticated;
alter table public.suppliers enable row level security;
alter table public.branches enable row level security;
alter table public.supplier_products enable row level security;
alter table public.supplier_purchases enable row level security;
alter table public.supplier_purchase_items enable row level security;
create policy fixture_read on public.suppliers for select to authenticated using(true);
create policy fixture_read on public.branches for select to authenticated using(true);
create policy fixture_read on public.supplier_products for select to authenticated using(true);
create policy fixture_read on public.supplier_purchases for select to authenticated using(true);
create policy fixture_read on public.supplier_purchase_items for select to authenticated using(true);

-- Reference source has the legacy ordering, global cap and full-row payload.
create function public.fixture_legacy_products_source() returns jsonb
language sql stable security invoker set search_path = pg_catalog, public, pg_temp as $$
  select coalesce(jsonb_agg(to_jsonb(x)
    order by x.purchase_date desc nulls last, x.created_at desc nulls last), '[]'::jsonb)
  from (
    select p.*,
      case when s.id is null then null else jsonb_build_object('name', s.name) end as suppliers,
      case when b.id is null then null else jsonb_build_object('name', b.name) end as branches,
      coalesce((select jsonb_agg(to_jsonb(y) order by y.id)
        from (select i.*,
          case when sp.id is null then null else jsonb_build_object(
            'name', sp.name, 'category', sp.category, 'base_unit', sp.base_unit)
          end as supplier_products
          from public.supplier_purchase_items i
          left join public.supplier_products sp on sp.id = i.product_id
          where i.purchase_id = p.id) y), '[]'::jsonb) as supplier_purchase_items
    from public.supplier_purchases p
    left join public.suppliers s on s.id = p.supplier_id
    left join public.branches b on b.id = p.branch_id
    order by p.purchase_date desc nulls last, p.created_at desc nulls last
    limit 50000
  ) x;
$$;
