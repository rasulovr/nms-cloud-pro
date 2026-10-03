-- RMS Pro: block identical active payment submissions even when retries
-- originate from separate browser tabs/sessions with different request keys.
-- Exact matching includes supplier, legal entity, date, amount, invoice notes,
-- comment, and e-invoice link. Different payloads remain allowed.
-- RMS Pro: idempotent supplier payment creation.
-- Retries of one form submission return the same payment; authorization and
-- the payment ledger writes remain inside one database transaction.

alter table public.supplier_payments
  add column if not exists request_key text,
  add column if not exists request_signature text;

create unique index if not exists ux_supplier_payments_request_key
  on public.supplier_payments (request_key)
  where request_key is not null;

create unique index if not exists ux_supplier_payments_active_signature
  on public.supplier_payments (request_signature)
  where request_signature is not null and deleted_at is null;

create or replace function public.rms_supplier_payment_create_idempotent(
  p_supplier_id uuid,
  p_legal_entity_id uuid,
  p_payment_date date,
  p_amount numeric,
  p_invoice_notes text default null,
  p_comment text default null,
  p_e_invoice_id uuid default null,
  p_request_key text default null
)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_user_id uuid := auth.uid();
  v_request_key text := nullif(trim(coalesce(p_request_key, '')), '');
  v_signature text;
  v_existing_id uuid;
  v_existing_signature text;
  v_existing_deleted_at timestamptz;
  v_duplicate_id uuid;
  v_payment_id uuid;
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

  if p_supplier_id is null then
    raise exception 'supplier_id is required';
  end if;
  if p_legal_entity_id is null or not exists (
    select 1 from public.legal_entities le where le.id = p_legal_entity_id
  ) then
    raise exception 'A valid legal entity is required';
  end if;
  if coalesce(p_amount, 0) <= 0 then
    raise exception 'payment amount must be greater than zero';
  end if;
  if v_request_key is null or length(v_request_key) > 160 then
    raise exception 'A valid request key is required';
  end if;

  v_signature := md5(jsonb_build_object(
    'supplier_id', p_supplier_id,
    'legal_entity_id', p_legal_entity_id,
    'payment_date', coalesce(p_payment_date, current_date),
    'amount', round(p_amount, 2),
    'invoice_notes', nullif(trim(coalesce(p_invoice_notes, '')), ''),
    'comment', nullif(trim(coalesce(p_comment, '')), ''),
    'e_invoice_id', p_e_invoice_id
  )::text);

  perform pg_advisory_xact_lock(hashtextextended(v_request_key, 0));
  perform pg_advisory_xact_lock(hashtextextended('supplier-payment-signature:' || v_signature, 0));

  select id, request_signature, deleted_at
    into v_existing_id, v_existing_signature, v_existing_deleted_at
  from public.supplier_payments
  where request_key = v_request_key
  for update;

  if found then
    if v_existing_signature is distinct from v_signature then
      raise exception 'Request key was already used for different payment data';
    end if;
    if v_existing_deleted_at is not null then
      raise exception 'This payment request was already cancelled';
    end if;
    return v_existing_id;
  end if;

  select id into v_duplicate_id
  from public.supplier_payments
  where deleted_at is null
    and supplier_id = p_supplier_id
    and legal_entity_id = p_legal_entity_id
    and payment_date = coalesce(p_payment_date, current_date)
    and round(amount, 2) = round(p_amount, 2)
    and coalesce(nullif(trim(invoice_notes), ''), '') = coalesce(nullif(trim(p_invoice_notes), ''), '')
    and coalesce(nullif(trim(comment), ''), '') = coalesce(nullif(trim(p_comment), ''), '')
    and e_invoice_id is not distinct from p_e_invoice_id
  order by created_at, id
  limit 1
  for update;

  if found then
    return v_duplicate_id;
  end if;

  v_payment_id := public.rms_supplier_payment_create_secure(
    p_supplier_id,
    p_legal_entity_id,
    p_payment_date,
    p_amount,
    p_invoice_notes,
    p_comment,
    p_e_invoice_id
  );

  update public.supplier_payments
     set request_key = v_request_key,
         request_signature = v_signature
   where id = v_payment_id and deleted_at is null;

  if not found then
    raise exception 'Payment was not persisted as an active record';
  end if;

  return v_payment_id;
end;
$function$;

revoke all on function public.rms_supplier_payment_create_idempotent(uuid, uuid, date, numeric, text, text, uuid, text) from public;
revoke all on function public.rms_supplier_payment_create_idempotent(uuid, uuid, date, numeric, text, text, uuid, text) from anon;
grant execute on function public.rms_supplier_payment_create_idempotent(uuid, uuid, date, numeric, text, text, uuid, text) to authenticated;
