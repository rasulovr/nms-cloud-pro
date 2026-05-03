-- RMS v22 requested changes support - FIXED SQL.
-- This version does NOT replace supplier_balances_v2, so it avoids:
-- ERROR 42P16: cannot drop columns from view

create table if not exists public.supplier_opening_debts (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid not null references public.suppliers(id) on delete cascade,
  debt_date date not null default current_date,
  amount numeric not null default 0,
  invoice_notes text,
  comment text,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists idx_supplier_opening_debts_supplier_date
on public.supplier_opening_debts(supplier_id, debt_date);

alter table public.supplier_opening_debts enable row level security;

drop policy if exists supplier_opening_debts_all_authenticated on public.supplier_opening_debts;

create policy supplier_opening_debts_all_authenticated
on public.supplier_opening_debts
for all
to authenticated
using (true)
with check (true);


create or replace function public.rms_add_supplier_opening_debt(
  p_supplier_id uuid,
  p_debt_date date,
  p_amount numeric,
  p_invoice_notes text default null,
  p_comment text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.supplier_opening_debts%rowtype;
begin
  if p_supplier_id is null then
    raise exception 'Supplier is required';
  end if;

  if coalesce(p_amount, 0) = 0 then
    raise exception 'Amount is required';
  end if;

  insert into public.supplier_opening_debts (
    supplier_id,
    debt_date,
    amount,
    invoice_notes,
    comment
  )
  values (
    p_supplier_id,
    coalesce(p_debt_date, current_date),
    coalesce(p_amount, 0),
    p_invoice_notes,
    p_comment
  )
  returning * into v_row;

  return to_jsonb(v_row);
end;
$$;

grant execute on function public.rms_add_supplier_opening_debt(uuid, date, numeric, text, text) to anon, authenticated;


create or replace function public.rms_suppliers_workspace()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
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
      select jsonb_agg(to_jsonb(p) order by p.category, p.name)
      from public.supplier_products p
      where coalesce(p.is_active, true) = true
    ), '[]'::jsonb),

    -- Balance is calculated here directly, without replacing supplier_balances_v2.
    -- Includes:
    -- previous/opening debt + purchases - payments
    'supplier_balances', coalesce((
      select jsonb_agg(to_jsonb(x) order by x.supplier_name)
      from (
        select
          s.id as supplier_id,
          s.name as supplier_name,
          coalesce(ob.opening_debt, 0)
            + coalesce(pu.purchase_total, 0)
            - coalesce(pa.payment_total, 0) as balance,
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

    'supplier_purchases', coalesce((
      select jsonb_agg(to_jsonb(x) order by x.purchase_date desc, x.created_at desc)
      from (
        select
          sp.*,
          jsonb_build_object('name', s.name) as suppliers,
          jsonb_build_object('name', le.name, 'voen', le.voen) as legal_entities,
          jsonb_build_object('name', b.name) as branches,
          coalesce((
            select jsonb_agg(
              to_jsonb(i) ||
              jsonb_build_object(
                'supplier_products',
                jsonb_build_object(
                  'name', pr.name,
                  'base_unit', pr.base_unit,
                  'category', pr.category
                )
              )
              order by i.id
            )
            from public.supplier_purchase_items i
            left join public.supplier_products pr on pr.id = i.product_id
            where i.purchase_id = sp.id
          ), '[]'::jsonb) as supplier_purchase_items
        from public.supplier_purchases sp
        left join public.suppliers s on s.id = sp.supplier_id
        left join public.legal_entities le on le.id = sp.legal_entity_id
        left join public.branches b on b.id = sp.branch_id
        where sp.deleted_at is null
        order by sp.purchase_date desc, sp.created_at desc
        limit 500
      ) x
    ), '[]'::jsonb),

    'supplier_opening_debts', coalesce((
      select jsonb_agg(to_jsonb(x) order by x.debt_date desc, x.created_at desc)
      from (
        select
          od.*,
          jsonb_build_object('name', s.name) as suppliers
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
        select
          p.*,
          jsonb_build_object('name', s.name) as suppliers
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
$$;

grant execute on function public.rms_suppliers_workspace() to anon, authenticated;


create or replace function public.rms_recipes_workspace()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  return jsonb_build_object(
    'supplier_products', coalesce((
      select jsonb_agg(to_jsonb(p) order by p.category, p.name)
      from public.supplier_products p
      where coalesce(p.is_active, true) = true
    ), '[]'::jsonb),

    'menu_items', coalesce((
      select jsonb_agg(to_jsonb(m) order by m.name)
      from public.menu_items m
      where coalesce(m.is_active, true) = true
    ), '[]'::jsonb),

    'latest_product_costs', coalesce((
      select jsonb_agg(to_jsonb(c))
      from public.latest_product_costs c
    ), '[]'::jsonb),

    'recipe_items', coalesce((
      select jsonb_agg(to_jsonb(x) order by x.id)
      from (
        select
          ri.*,
          jsonb_build_object(
            'id', sp.id,
            'name', sp.name,
            'category', sp.category,
            'base_unit', sp.base_unit
          ) as supplier_products
        from public.recipe_items ri
        left join public.supplier_products sp on sp.id = ri.product_id
      ) x
    ), '[]'::jsonb)
  );
end;
$$;

grant execute on function public.rms_recipes_workspace() to anon, authenticated;