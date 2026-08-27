-- Atomically move one supplier and all of its financial history between RMS legal entities.
-- This migration is intentionally shipped with the Preview branch and must be applied separately.

create or replace function public.rms_supplier_transfer_legal_entity_secure(
  p_supplier_id uuid,
  p_source_legal_entity_id uuid,
  p_target_legal_entity_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_row record;
  v_after jsonb;
  v_event_id uuid;
  v_purchase_count integer := 0;
  v_payment_count integer := 0;
  v_opening_debt_count integer := 0;
  v_e_invoice_count integer := 0;
begin
  perform public.rms_internal_require_admin();

  if p_supplier_id is null or p_source_legal_entity_id is null or p_target_legal_entity_id is null then
    raise exception 'supplier, source VOEN and target VOEN are required';
  end if;
  if p_source_legal_entity_id = p_target_legal_entity_id then
    raise exception 'source and target VOEN must be different';
  end if;
  if not exists (select 1 from public.suppliers where id = p_supplier_id) then
    raise exception 'supplier not found: %', p_supplier_id;
  end if;
  if not exists (select 1 from public.legal_entities where id = p_source_legal_entity_id) then
    raise exception 'source VOEN not found: %', p_source_legal_entity_id;
  end if;
  if not exists (select 1 from public.legal_entities where id = p_target_legal_entity_id) then
    raise exception 'target VOEN not found: %', p_target_legal_entity_id;
  end if;

  -- Prevent two concurrent transfers for the same supplier.
  perform pg_advisory_xact_lock(hashtextextended(p_supplier_id::text, 0));

  for v_row in
    select p.id, to_jsonb(p) as before_data
    from public.supplier_purchases p
    where p.supplier_id = p_supplier_id
      and p.legal_entity_id = p_source_legal_entity_id
    for update
  loop
    update public.supplier_purchases p
       set legal_entity_id = p_target_legal_entity_id,
           updated_at = now(),
           updated_by = auth.uid()
     where p.id = v_row.id
     returning to_jsonb(p) into v_after;

    v_event_id := public.rms_erp_event_write(
      'supplier.purchase.legal_entity_transferred',
      'supplier_purchase', v_row.id, p_supplier_id, p_target_legal_entity_id,
      (v_after->>'branch_id')::uuid, 'supplier_purchases', v_row.id,
      v_row.before_data, v_after,
      jsonb_build_object('source_legal_entity_id', p_source_legal_entity_id, 'target_legal_entity_id', p_target_legal_entity_id)
    );
    perform public.rms_supplier_ledger_upsert_purchase(v_row.id, v_event_id);
    v_purchase_count := v_purchase_count + 1;
  end loop;

  for v_row in
    select p.id, to_jsonb(p) as before_data
    from public.supplier_payments p
    where p.supplier_id = p_supplier_id
      and p.legal_entity_id = p_source_legal_entity_id
    for update
  loop
    update public.supplier_payments p
       set legal_entity_id = p_target_legal_entity_id,
           updated_at = now(),
           updated_by = auth.uid()
     where p.id = v_row.id
     returning to_jsonb(p) into v_after;

    v_event_id := public.rms_erp_event_write(
      'supplier.payment.legal_entity_transferred',
      'supplier_payment', v_row.id, p_supplier_id, p_target_legal_entity_id,
      null, 'supplier_payments', v_row.id,
      v_row.before_data, v_after,
      jsonb_build_object('source_legal_entity_id', p_source_legal_entity_id, 'target_legal_entity_id', p_target_legal_entity_id)
    );
    perform public.rms_supplier_ledger_upsert_payment(v_row.id, v_event_id);
    v_payment_count := v_payment_count + 1;
  end loop;

  for v_row in
    select d.id, to_jsonb(d) as before_data
    from public.supplier_opening_debts d
    where d.supplier_id = p_supplier_id
      and d.legal_entity_id = p_source_legal_entity_id
    for update
  loop
    update public.supplier_opening_debts d
       set legal_entity_id = p_target_legal_entity_id,
           updated_at = now(),
           updated_by = auth.uid()
     where d.id = v_row.id
     returning to_jsonb(d) into v_after;

    v_event_id := public.rms_erp_event_write(
      'supplier.opening_debt.legal_entity_transferred',
      'supplier_opening_debt', v_row.id, p_supplier_id, p_target_legal_entity_id,
      null, 'supplier_opening_debts', v_row.id,
      v_row.before_data, v_after,
      jsonb_build_object('source_legal_entity_id', p_source_legal_entity_id, 'target_legal_entity_id', p_target_legal_entity_id)
    );
    perform public.rms_supplier_ledger_upsert_opening_debt(v_row.id, v_event_id);
    v_opening_debt_count := v_opening_debt_count + 1;
  end loop;

  for v_row in
    select i.id, to_jsonb(i) as before_data
    from public.supplier_e_invoices i
    where i.supplier_id = p_supplier_id
      and i.legal_entity_id = p_source_legal_entity_id
    for update
  loop
    update public.supplier_e_invoices i
       set legal_entity_id = p_target_legal_entity_id,
           updated_at = now(),
           updated_by = auth.uid()
     where i.id = v_row.id
     returning to_jsonb(i) into v_after;

    perform public.rms_erp_event_write(
      'supplier.e_invoice.legal_entity_transferred',
      'supplier_e_invoice', v_row.id, p_supplier_id, p_target_legal_entity_id,
      (v_after->>'branch_id')::uuid, 'supplier_e_invoices', v_row.id,
      v_row.before_data, v_after,
      jsonb_build_object('source_legal_entity_id', p_source_legal_entity_id, 'target_legal_entity_id', p_target_legal_entity_id)
    );
    v_e_invoice_count := v_e_invoice_count + 1;
  end loop;

  if v_purchase_count + v_payment_count + v_opening_debt_count + v_e_invoice_count = 0 then
    raise exception 'no supplier operations found for source VOEN';
  end if;

  insert into public.supplier_legal_entity_status(supplier_id, legal_entity_id, is_active, updated_at)
  values (p_supplier_id, p_source_legal_entity_id, false, now())
  on conflict (supplier_id, legal_entity_id)
  do update set is_active = false, updated_at = excluded.updated_at;

  insert into public.supplier_legal_entity_status(supplier_id, legal_entity_id, is_active, updated_at)
  values (p_supplier_id, p_target_legal_entity_id, true, now())
  on conflict (supplier_id, legal_entity_id)
  do update set is_active = true, updated_at = excluded.updated_at;

  return jsonb_build_object(
    'ok', true,
    'supplier_id', p_supplier_id,
    'source_legal_entity_id', p_source_legal_entity_id,
    'target_legal_entity_id', p_target_legal_entity_id,
    'purchases', v_purchase_count,
    'payments', v_payment_count,
    'opening_debts', v_opening_debt_count,
    'e_invoices', v_e_invoice_count
  );
end;
$function$;

revoke all on function public.rms_supplier_transfer_legal_entity_secure(uuid, uuid, uuid) from public;
revoke all on function public.rms_supplier_transfer_legal_entity_secure(uuid, uuid, uuid) from anon;
grant execute on function public.rms_supplier_transfer_legal_entity_secure(uuid, uuid, uuid) to authenticated;

comment on function public.rms_supplier_transfer_legal_entity_secure(uuid, uuid, uuid)
  is 'Admin-only atomic transfer of one supplier financial history between RMS legal entities.';

