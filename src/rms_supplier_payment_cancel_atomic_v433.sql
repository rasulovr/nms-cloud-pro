-- RMS Pro: atomic, auditable supplier payment cancellation batches.
-- Each batch is all-or-nothing, serialized by an idempotency key, and
-- deactivates the exact supplier-ledger credit within the same transaction.
-- Invoice paid_amount is deliberately left untouched: the legacy form updated
-- it separately and did not persist allocation rows, so historical allocations
-- cannot safely be inferred during cancellation.

create table if not exists public.supplier_payment_cancel_batches (
  request_key text primary key,
  payment_ids uuid[] not null,
  reason text not null,
  result jsonb not null,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

alter table public.supplier_payment_cancel_batches enable row level security;
revoke all on public.supplier_payment_cancel_batches from public, anon, authenticated;

create or replace function public.rms_supplier_payment_cancel_batch_secure(
  p_payment_ids uuid[],
  p_reason text,
  p_request_key text
)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_user_id uuid := auth.uid();
  v_request_key text := nullif(trim(coalesce(p_request_key, '')), '');
  v_reason text := nullif(trim(coalesce(p_reason, '')), '');
  v_ids uuid[];
  v_existing_ids uuid[];
  v_existing_result jsonb;
  v_payment public.supplier_payments%rowtype;
  v_before jsonb;
  v_event_id uuid;
  v_active_rows integer;
  v_active_credit numeric;
  v_total numeric := 0;
  v_result jsonb;
  v_id uuid;
begin
  if v_user_id is null then
    raise exception using errcode = '28000', message = 'Authentication required';
  end if;

  if not exists (
    select 1 from public.user_profiles up
    where up.id = v_user_id and up.is_active is true
  ) or not public.rms_has_permission(v_user_id, 'supplier.write') then
    raise exception using errcode = '42501', message = 'Supplier payment permission denied';
  end if;

  if p_payment_ids is null or cardinality(p_payment_ids) = 0 then
    raise exception using errcode = '22023', message = 'At least one payment ID is required';
  end if;
  if v_request_key is null then
    raise exception using errcode = '22023', message = 'Cancellation request key is required';
  end if;
  if v_reason is null then
    raise exception using errcode = '22023', message = 'Cancellation reason is required';
  end if;

  select array_agg(x.id order by x.id)
    into v_ids
  from (select distinct unnest(p_payment_ids) as id) x;

  if cardinality(v_ids) <> cardinality(p_payment_ids) then
    raise exception using errcode = '22023', message = 'Duplicate payment IDs are not allowed';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(v_request_key, 0));

  select b.payment_ids, b.result
    into v_existing_ids, v_existing_result
  from public.supplier_payment_cancel_batches b
  where b.request_key = v_request_key;

  if found then
    if v_existing_ids is distinct from v_ids then
      raise exception using errcode = '22023', message = 'Cancellation request key was already used for a different ID set';
    end if;
    return v_existing_result;
  end if;

  for v_id in select unnest(v_ids) order by 1 loop
    select * into v_payment
    from public.supplier_payments
    where id = v_id
    for update;

    if not found or v_payment.deleted_at is not null then
      raise exception using errcode = 'P0002', message = format('Active payment not found: %s', v_id);
    end if;

    select count(*)::integer, coalesce(sum(sl.credit), 0)
      into v_active_rows, v_active_credit
    from public.supplier_ledger sl
    where sl.source_table = 'supplier_payments'
      and sl.source_id = v_id
      and coalesce(sl.movement_type, sl.entry_type) = 'payment'
      and sl.is_active is true;

    if v_active_rows <> 1 or round(v_active_credit, 2) <> round(v_payment.amount, 2) then
      raise exception using errcode = '23514',
        message = format('Expected one matching active supplier-ledger credit for payment %s; found %s rows / %s AZN', v_id, v_active_rows, v_active_credit);
    end if;

    v_before := to_jsonb(v_payment);

    update public.supplier_payments
       set deleted_at = now(),
           deleted_by = v_user_id,
           updated_at = now(),
           updated_by = v_user_id,
           comment = concat_ws(' · ', nullif(comment, ''), v_reason)
     where id = v_id
     returning * into v_payment;

    v_event_id := public.rms_erp_event_write(
      'supplier.payment.cancelled',
      'supplier_payment',
      v_id,
      v_payment.supplier_id,
      v_payment.legal_entity_id,
      null,
      'supplier_payments',
      v_id,
      v_before,
      to_jsonb(v_payment),
      jsonb_build_object('reason', v_reason, 'request_key', v_request_key)
    );

    perform public.rms_supplier_ledger_upsert_payment(v_id, v_event_id);

    select count(*)::integer into v_active_rows
    from public.supplier_ledger sl
    where sl.source_table = 'supplier_payments'
      and sl.source_id = v_id
      and coalesce(sl.movement_type, sl.entry_type) = 'payment'
      and sl.is_active is true;

    if v_active_rows <> 0 then
      raise exception using errcode = '23514',
        message = format('Supplier-ledger credit remained active after cancelling payment %s', v_id);
    end if;

    v_total := v_total + v_payment.amount;
  end loop;

  v_result := jsonb_build_object(
    'request_key', v_request_key,
    'cancelled_ids', to_jsonb(v_ids),
    'cancelled_count', cardinality(v_ids),
    'cancelled_amount', round(v_total, 2),
    'invoice_paid_amounts_changed', false
  );

  insert into public.supplier_payment_cancel_batches(request_key, payment_ids, reason, result, created_by)
  values (v_request_key, v_ids, v_reason, v_result, v_user_id);

  return v_result;
end;
$function$;

revoke all on function public.rms_supplier_payment_cancel_batch_secure(uuid[], text, text) from public, anon;
grant execute on function public.rms_supplier_payment_cancel_batch_secure(uuid[], text, text) to authenticated;
