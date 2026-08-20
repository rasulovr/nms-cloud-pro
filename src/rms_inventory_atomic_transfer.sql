-- Atomic posting for RMS inventory transfer documents.
-- Scope: inventory documents, locations, document items, stock movements,
-- inventory balance view, and inventory audit only. No financial tables.

create or replace function public.rms_inventory_transfer_post_secure(p_document_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_doc public.rms_inventory_documents%rowtype;
  v_item public.rms_inventory_document_items%rowtype;
  v_source public.rms_inventory_locations%rowtype;
  v_target public.rms_inventory_locations%rowtype;
  v_out public.rms_stock_movements%rowtype;
  v_in public.rms_stock_movements%rowtype;
  v_balance_qty numeric;
  v_balance_cost numeric;
  v_unit_cost numeric;
  v_comment text;
  v_created_by text;
  v_movements jsonb := '[]'::jsonb;
begin
  if p_document_id is null then
    raise exception 'inventory transfer document id is required';
  end if;

  -- A row lock makes posting idempotent and serializes concurrent retries.
  select * into v_doc
  from public.rms_inventory_documents
  where id = p_document_id
  for update;

  if v_doc.id is null then
    raise exception 'inventory document not found: %', p_document_id;
  end if;
  if v_doc.document_type <> 'transfer' then
    raise exception 'inventory document % is not a transfer', v_doc.document_number;
  end if;
  if v_doc.status = 'posted' then
    return jsonb_build_object(
      'document', to_jsonb(v_doc),
      'movements', coalesce(v_doc.post_result->'movements', '[]'::jsonb),
      'already_posted', true
    );
  end if;
  if v_doc.status <> 'draft' then
    raise exception 'inventory document % cannot be posted from status %',
      v_doc.document_number, v_doc.status;
  end if;
  if v_doc.source_location_id is null or v_doc.target_location_id is null then
    raise exception 'source and target locations are required';
  end if;
  if v_doc.source_location_id = v_doc.target_location_id then
    raise exception 'source and target locations must be different';
  end if;

  select * into v_source
  from public.rms_inventory_locations
  where id = v_doc.source_location_id and is_active = true;

  select * into v_target
  from public.rms_inventory_locations
  where id = v_doc.target_location_id and is_active = true;

  if v_source.id is null then raise exception 'active source inventory location not found'; end if;
  if v_target.id is null then raise exception 'active target inventory location not found'; end if;

  if not exists (
    select 1 from public.rms_inventory_document_items i
    where i.document_id = v_doc.id and i.quantity > 0
  ) then
    raise exception 'inventory transfer document must contain positive quantities';
  end if;

  update public.rms_inventory_documents
  set status = 'posting', updated_at = now()
  where id = v_doc.id;

  v_created_by := nullif(current_setting('request.jwt.claim.sub', true), '');

  -- Stable ordering plus per-item advisory locks prevents concurrent transfers
  -- from consuming the same source balance.
  for v_item in
    select i.*
    from public.rms_inventory_document_items i
    where i.document_id = v_doc.id and i.quantity > 0
    order by coalesce(i.supplier_product_id::text, ''),
      lower(trim(i.item_name)), lower(trim(i.unit)), i.line_no, i.id
  loop
    perform pg_catalog.pg_advisory_xact_lock(
      pg_catalog.hashtextextended(
        v_doc.source_location_id::text || '|' ||
        coalesce(v_item.supplier_product_id::text, '') || '|' ||
        lower(trim(v_item.item_name)) || '|' || lower(trim(v_item.unit)), 0
      )
    );

    select coalesce(sum(b.balance_qty), 0), coalesce(sum(b.balance_cost), 0)
    into v_balance_qty, v_balance_cost
    from public.rms_inventory_stock_balance_view b
    where b.location_id = v_doc.source_location_id
      and lower(trim(b.item_name)) = lower(trim(v_item.item_name))
      and lower(trim(coalesce(b.unit, 'unit'))) = lower(trim(coalesce(v_item.unit, 'unit')))
      and ((v_item.supplier_product_id is not null and b.supplier_product_id = v_item.supplier_product_id)
        or (v_item.supplier_product_id is null and b.supplier_product_id is null));

    if v_balance_qty < v_item.quantity then
      raise exception 'Недостаточный остаток: %. Доступно % %, запрошено % %',
        v_item.item_name, v_balance_qty, v_item.unit, v_item.quantity, v_item.unit;
    end if;
    if v_balance_qty <= 0 then
      raise exception 'Нет доступного остатка для %', v_item.item_name;
    end if;

    -- Server-calculated weighted source cost; browser-supplied price is ignored.
    v_unit_cost := v_balance_cost / v_balance_qty;
    v_comment := '[' || v_doc.document_number || '] ' ||
      coalesce(nullif(trim(v_doc.comment), ''), 'Перемещение товаров') ||
      case when nullif(trim(v_item.comment), '') is not null
        then ' · ' || trim(v_item.comment) else '' end;

    update public.rms_inventory_document_items
    set unit_cost = v_unit_cost, total_cost = v_item.quantity * v_unit_cost
    where id = v_item.id;

    insert into public.rms_stock_movements (
      movement_date, location_id, branch_id, supplier_product_id, item_name,
      unit, quantity, unit_cost, movement_type, source_type, source_id,
      comment, created_by
    ) values (
      v_doc.document_date, v_doc.source_location_id, v_source.branch_id,
      v_item.supplier_product_id, v_item.item_name, v_item.unit,
      v_item.quantity, v_unit_cost, 'transfer_out', 'inventory_document',
      v_doc.id, v_comment, v_created_by
    ) returning * into v_out;

    perform public.rms_inventory_audit_event(
      'create', 'stock_movement', v_out.id, null, to_jsonb(v_out),
      'atomic inventory transfer out created'
    );

    insert into public.rms_stock_movements (
      movement_date, location_id, branch_id, supplier_product_id, item_name,
      unit, quantity, unit_cost, movement_type, source_type, source_id,
      comment, created_by
    ) values (
      v_doc.document_date, v_doc.target_location_id, v_target.branch_id,
      v_item.supplier_product_id, v_item.item_name, v_item.unit,
      v_item.quantity, v_unit_cost, 'transfer_in', 'inventory_document',
      v_doc.id, v_comment, v_created_by
    ) returning * into v_in;

    perform public.rms_inventory_audit_event(
      'create', 'stock_movement', v_in.id, null, to_jsonb(v_in),
      'atomic inventory transfer in created'
    );

    v_movements := v_movements || jsonb_build_array(jsonb_build_object(
      'item', v_item.item_name,
      'quantity', v_item.quantity,
      'unit', v_item.unit,
      'unit_cost', v_unit_cost,
      'transfer_out_id', v_out.id,
      'transfer_in_id', v_in.id
    ));
  end loop;

  update public.rms_inventory_documents
  set status = 'posted',
      posted_at = coalesce(posted_at, now()),
      post_result = jsonb_build_object(
        'atomic', true,
        'movement_pairs', jsonb_array_length(v_movements),
        'movements', v_movements
      ),
      updated_at = now()
  where id = v_doc.id
  returning * into v_doc;

  return jsonb_build_object(
    'document', to_jsonb(v_doc),
    'movements', v_movements,
    'already_posted', false
  );
end;
$function$;

revoke all on function public.rms_inventory_transfer_post_secure(uuid) from public;
grant execute on function public.rms_inventory_transfer_post_secure(uuid)
  to anon, authenticated, service_role;

comment on function public.rms_inventory_transfer_post_secure(uuid) is
  'Restricted atomic inventory transfer with server-side balance and weighted cost validation; no financial side effects.';
