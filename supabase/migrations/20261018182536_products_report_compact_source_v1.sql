-- Compact read-only source for the unchanged products-report calculations.
-- First rollout is restricted to existing, active RMS administrators.
-- This proposal changes only this new function and its EXECUTE ACL. It does not
-- change source data, table permissions, RLS, indexes, or the existing full RPC.
-- Install the function and its ACL together in a single deployment transaction.
create or replace function public.rms_products_report_source_v1(
  p_date_from date default null,
  p_date_to_exclusive date default null,
  p_branch_id uuid default null
)
returns jsonb
language plpgsql
stable
security invoker
set search_path = pg_catalog, public, pg_temp
as $function$
declare
  v_source_count bigint;
  v_result jsonb;
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if public.rms_internal_current_is_admin() is not true then
    raise exception 'Products report requires an active RMS administrator' using errcode = '42501';
  end if;

  -- The legacy full RPC applies its 50,000-purchase limit globally, before
  -- cancellation, branch, or date filtering. Never claim a filtered subset is
  -- complete when that global source would have been capped. STABLE keeps this
  -- count and the source reads on the calling statement's snapshot.
  select count(*) into v_source_count from public.supplier_purchases;
  if v_source_count > 50000 then
    return jsonb_build_object(
      'version', 1, 'complete', false, 'legacyRequired', true,
      'reason', 'global_source_limit', 'rows', '[]'::jsonb,
      'source_count', v_source_count, 'matching_count', null,
      'purchase_count', 0, 'item_count', 0
    );
  end if;

  with source_headers as materialized (
    select p.id, p.supplier_id, p.branch_id, p.purchase_date,
      p.invoice_number, p.created_at, p.deleted_at
    from public.supplier_purchases p
    order by p.purchase_date desc nulls last, p.created_at desc nulls last
    limit 50000
  ), matching_headers as materialized (
    select p.id, p.supplier_id, p.branch_id, p.purchase_date,
      p.invoice_number, p.created_at, p.deleted_at
    from source_headers p
    where p.deleted_at is null
      and (p_branch_id is null or p.branch_id = p_branch_id)
      and (p_date_from is null or p.purchase_date >= p_date_from)
      and (p_date_to_exclusive is null or p.purchase_date < p_date_to_exclusive)
  ), matching_items as materialized (
    -- Only applicable active purchases are joined to items. Never serialize
    -- p.* or i.*: imported provenance/comments can dominate the full payload.
    select i.id, i.purchase_id, i.product_id, i.quantity, i.unit,
      i.unit_price, i.total_amount,
      sp.id as joined_product_id, sp.name as product_name,
      sp.category as product_category, sp.base_unit as product_base_unit
    from matching_headers p
    join public.supplier_purchase_items i on i.purchase_id = p.id
    left join public.supplier_products sp on sp.id = i.product_id
  ), item_arrays as (
    select i.purchase_id, jsonb_agg(jsonb_build_object(
      'id', i.id, 'product_id', i.product_id, 'quantity', i.quantity,
      'unit', i.unit, 'unit_price', i.unit_price, 'total_amount', i.total_amount,
      'supplier_products', case when i.joined_product_id is null then null else jsonb_build_object(
        'name', i.product_name, 'category', i.product_category, 'base_unit', i.product_base_unit
      ) end
    ) order by i.id asc) as items
    from matching_items i
    group by i.purchase_id
  ), eligibility as (
    select case
      -- The old full row may have item.product_name as a name fallback. It is
      -- deliberately not guessed when the relational product is unavailable.
      when exists (
        select 1 from matching_items i
        where i.product_id is null or i.joined_product_id is null
          or i.product_name is null or i.product_name = ''
      ) then 'missing_product_metadata'
      -- The full RPC has no purchase-id tie-break. An arbitrary ordering of
      -- tied purchases containing the same product changes latest-price and
      -- invoice attribution. Check product identity across ALL units, across
      -- the entire requested scope (including comparison ranges in its union).
      -- Duplicate product lines within ONE purchase retain nested id ASC order.
      when exists (
        select 1
        from matching_items i
        join matching_headers p on p.id = i.purchase_id
        group by i.product_id, p.purchase_date, p.created_at
        having count(distinct i.purchase_id) > 1
      ) then 'ambiguous_purchase_order'
      else null
    end as reason
  )
  select case when e.reason is not null then
    jsonb_build_object(
      'version', 1, 'complete', false, 'legacyRequired', true,
      'reason', e.reason, 'rows', '[]'::jsonb,
      'source_count', v_source_count,
      'matching_count', (select count(*) from matching_headers),
      'purchase_count', 0, 'item_count', 0
    )
  else jsonb_build_object(
    'version', 1, 'complete', true, 'legacyRequired', false,
    'rows', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', p.id, 'supplier_id', p.supplier_id, 'branch_id', p.branch_id,
          'purchase_date', p.purchase_date, 'invoice_number', p.invoice_number,
          'created_at', p.created_at, 'deleted_at', p.deleted_at,
          'suppliers', case when s.id is null then null else jsonb_build_object('name', s.name) end,
          'branches', case when b.id is null then null else jsonb_build_object('name', b.name) end,
          'supplier_purchase_items', coalesce(ia.items, '[]'::jsonb)
        ) order by p.purchase_date desc nulls last, p.created_at desc nulls last
      )
      from matching_headers p
      left join public.suppliers s on s.id = p.supplier_id
      left join public.branches b on b.id = p.branch_id
      left join item_arrays ia on ia.purchase_id = p.id
    ), '[]'::jsonb),
    'source_count', v_source_count,
    'matching_count', (select count(*) from matching_headers),
    'purchase_count', (select count(*) from matching_headers),
    'item_count', (select count(*) from matching_items)
  ) end into v_result
  from eligibility e;

  -- Do not catch SQL/auth/RLS errors and convert them into a partial success.
  return v_result;
end;
$function$;

-- New endpoint only. Underlying SELECT privileges and RLS remain authoritative.
revoke all on function public.rms_products_report_source_v1(date, date, uuid) from public, anon;
grant execute on function public.rms_products_report_source_v1(date, date, uuid) to authenticated;
