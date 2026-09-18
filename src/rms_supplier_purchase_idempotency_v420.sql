-- RMS Pro v420: idempotent supplier purchase creation.
-- Cancelled rows and their audit trail remain in the database. Repeated browser
-- or RPC submissions resolve to one active purchase instead of creating copies.

alter table public.supplier_purchases
  add column if not exists request_key text,
  add column if not exists dedupe_signature text;

create unique index if not exists ux_supplier_purchases_request_key
  on public.supplier_purchases (request_key)
  where request_key is not null;

create index if not exists idx_supplier_purchases_recent_dedupe
  on public.supplier_purchases (dedupe_signature, created_at desc)
  where deleted_at is null and dedupe_signature is not null;

create or replace function public.rms_supplier_purchase_create_idempotent(
  p_supplier_id uuid,
  p_legal_entity_id uuid,
  p_branch_id uuid,
  p_purchase_date date,
  p_invoice_number text,
  p_comment text,
  p_items jsonb default '[]'::jsonb,
  p_manual_amount numeric default null,
  p_request_key text default null
)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_purchase_id uuid;
  v_existing_id uuid;
  v_total numeric(12,2) := 0;
  v_item jsonb;
  v_product record;
  v_qty numeric;
  v_unit text;
  v_unit_price numeric;
  v_line_total numeric;
  v_base_qty numeric;
  v_event_id uuid;
  v_request_key text := nullif(trim(coalesce(p_request_key, '')), '');
  v_invoice_number text := nullif(trim(coalesce(p_invoice_number, '')), '');
  v_comment text := nullif(trim(coalesce(p_comment, '')), '');
  v_normalized_items jsonb := '[]'::jsonb;
  v_signature text;
begin
  if p_supplier_id is null then raise exception 'supplier_id is required'; end if;
  if p_purchase_date is null then raise exception 'purchase_date is required'; end if;
  if p_items is not null and jsonb_typeof(p_items) <> 'array' then raise exception 'purchase items must be json array'; end if;
  if v_request_key is not null and length(v_request_key) > 160 then raise exception 'request key is too long'; end if;

  if p_items is not null and jsonb_array_length(p_items) > 0 then
    for v_item in select * from jsonb_array_elements(p_items)
    loop
      select id, base_unit into v_product
      from public.supplier_products
      where id = (v_item->>'product_id')::uuid and coalesce(is_active, true) is true;
      if not found then raise exception 'Invalid product_id: %', v_item->>'product_id'; end if;

      v_qty := public.rms_to_numeric(v_item->'quantity');
      v_unit := coalesce(nullif(v_item->>'unit', ''), 'kg');
      v_unit_price := public.rms_to_numeric(v_item->'unit_price');
      if v_qty <= 0 or v_unit_price <= 0 then raise exception 'Invalid quantity or unit_price'; end if;

      v_line_total := round(v_qty * v_unit_price, 2);
      v_total := v_total + v_line_total;
      v_normalized_items := v_normalized_items || jsonb_build_array(jsonb_build_object(
        'product_id', v_product.id,
        'quantity', v_qty,
        'unit', v_unit,
        'unit_price', v_unit_price
      ));
    end loop;
  elsif coalesce(p_manual_amount, 0) > 0 then
    v_total := round(p_manual_amount, 2);
  else
    raise exception 'purchase items or manual amount are required';
  end if;

  v_signature := md5(jsonb_build_object(
    'supplier_id', p_supplier_id,
    'legal_entity_id', p_legal_entity_id,
    'branch_id', p_branch_id,
    'purchase_date', p_purchase_date,
    'invoice_number', v_invoice_number,
    'comment', v_comment,
    'total_amount', v_total,
    'items', v_normalized_items
  )::text);

  perform pg_advisory_xact_lock(hashtextextended(coalesce(v_request_key, v_signature), 0));

  if v_request_key is not null then
    select id into v_existing_id
    from public.supplier_purchases
    where request_key = v_request_key
    order by created_at desc
    limit 1;
    if found then return v_existing_id; end if;
  end if;

  -- Compatibility guard for clients that do not yet send a request key.
  select id into v_existing_id
  from public.supplier_purchases
  where dedupe_signature = v_signature
    and deleted_at is null
    and created_at >= clock_timestamp() - interval '10 minutes'
  order by created_at desc
  limit 1;
  if found then return v_existing_id; end if;

  insert into public.supplier_purchases(
    supplier_id, legal_entity_id, branch_id, purchase_date, invoice_number,
    total_amount, comment, created_by, updated_by, request_key, dedupe_signature
  ) values (
    p_supplier_id, p_legal_entity_id, p_branch_id, p_purchase_date,
    v_invoice_number, v_total, v_comment, auth.uid(), auth.uid(), v_request_key, v_signature
  ) returning id into v_purchase_id;

  for v_item in select * from jsonb_array_elements(v_normalized_items)
  loop
    select id, base_unit into v_product
    from public.supplier_products
    where id = (v_item->>'product_id')::uuid and coalesce(is_active, true) is true;

    v_qty := public.rms_to_numeric(v_item->'quantity');
    v_unit := coalesce(nullif(v_item->>'unit', ''), 'kg');
    v_unit_price := public.rms_to_numeric(v_item->'unit_price');
    v_line_total := round(v_qty * v_unit_price, 2);
    v_base_qty := public.rms_supplier_base_qty(v_qty, v_unit, v_product.base_unit);

    insert into public.supplier_purchase_items(
      purchase_id, product_id, quantity, unit, unit_price, total_amount,
      base_quantity, base_unit, price_per_base_unit, updated_by
    ) values (
      v_purchase_id, v_product.id, v_qty, v_unit, v_unit_price, v_line_total,
      v_base_qty, v_product.base_unit,
      case when v_base_qty > 0 then v_line_total / v_base_qty else 0 end,
      auth.uid()
    );
  end loop;

  v_event_id := public.rms_erp_event_write(
    'supplier.purchase.created', 'supplier_purchase', v_purchase_id,
    p_supplier_id, p_legal_entity_id, p_branch_id, 'supplier_purchases', v_purchase_id,
    null, (select to_jsonb(sp) from public.supplier_purchases sp where sp.id = v_purchase_id),
    jsonb_build_object(
      'items', coalesce(p_items, '[]'::jsonb),
      'manual_amount', p_manual_amount,
      'total_amount', v_total,
      'request_key', v_request_key,
      'dedupe_signature', v_signature
    )
  );

  perform public.rms_supplier_ledger_upsert_purchase(v_purchase_id, v_event_id);
  return v_purchase_id;
end;
$function$;

revoke all on function public.rms_supplier_purchase_create_idempotent(uuid, uuid, uuid, date, text, text, jsonb, numeric, text) from public;
grant execute on function public.rms_supplier_purchase_create_idempotent(uuid, uuid, uuid, date, text, text, jsonb, numeric, text) to anon, authenticated, service_role;

create or replace function public.rms_supplier_purchase_create_secure(
  p_supplier_id uuid,
  p_legal_entity_id uuid,
  p_branch_id uuid,
  p_purchase_date date,
  p_invoice_number text,
  p_comment text,
  p_items jsonb default '[]'::jsonb,
  p_manual_amount numeric default null
)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  return public.rms_supplier_purchase_create_idempotent(
    p_supplier_id,
    p_legal_entity_id,
    p_branch_id,
    p_purchase_date,
    p_invoice_number,
    p_comment,
    p_items,
    p_manual_amount,
    null
  );
end;
$function$;

revoke all on function public.rms_supplier_purchase_create_secure(uuid, uuid, uuid, date, text, text, jsonb, numeric) from public;
grant execute on function public.rms_supplier_purchase_create_secure(uuid, uuid, uuid, date, text, text, jsonb, numeric) to anon, authenticated, service_role;
