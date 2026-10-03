-- RMS Pro: force all authenticated client payment writes through the
-- idempotent create and atomic cancellation RPCs.
-- The secure low-level functions remain callable by their owner for RPC composition.

revoke all on function public.rms_supplier_payment_create_secure(uuid, uuid, date, numeric, text, text, uuid) from public, anon, authenticated;
revoke all on function public.rms_supplier_payment_cancel_secure(uuid, text) from public, anon, authenticated;

grant execute on function public.rms_supplier_payment_create_idempotent(uuid, uuid, date, numeric, text, text, uuid, text) to authenticated;
grant execute on function public.rms_supplier_payment_cancel_batch_secure(uuid[], text, text) to authenticated;
