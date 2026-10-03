-- RMS Pro: force all authenticated client payment writes through the
-- idempotent create and atomic cancellation RPCs.
-- Guard revokes for Staging databases that do not yet have the legacy RPCs.

do $migration$
begin
  if to_regprocedure('public.rms_supplier_payment_create_secure(uuid,uuid,date,numeric,text,text,uuid)') is not null then
    execute 'revoke all on function public.rms_supplier_payment_create_secure(uuid, uuid, date, numeric, text, text, uuid) from public, anon, authenticated';
  end if;
  if to_regprocedure('public.rms_supplier_payment_cancel_secure(uuid,text)') is not null then
    execute 'revoke all on function public.rms_supplier_payment_cancel_secure(uuid, text) from public, anon, authenticated';
  end if;
end;
$migration$;

grant execute on function public.rms_supplier_payment_create_idempotent(uuid, uuid, date, numeric, text, text, uuid, text) to authenticated;
grant execute on function public.rms_supplier_payment_cancel_batch_secure(uuid[], text, text) to authenticated;
