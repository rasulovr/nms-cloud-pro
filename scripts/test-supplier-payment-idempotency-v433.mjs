import fs from 'node:fs'

const source = fs.readFileSync(new URL('../src/main.generated.jsx', import.meta.url), 'utf8')
const sql = fs.readFileSync(new URL('../src/rms_supplier_payment_idempotency_v433.sql', import.meta.url), 'utf8')
const duplicateSql = fs.readFileSync(new URL('../src/rms_supplier_payment_duplicate_guard_v434.sql', import.meta.url), 'utf8')

const saveHandler = source.slice(source.indexOf('async function savePayment()'), source.indexOf('const purchaseTotal', source.indexOf('async function savePayment()')))
const checks = [
  ['payment form blocks a second in-flight save', saveHandler.includes('paymentSaveInFlightRef.current') && saveHandler.includes('setPaymentSaving(true)') && saveHandler.includes('setPaymentSaving(false)')],
  ['both payment paths use the idempotent RPC', (saveHandler.match(/rms_supplier_payment_create_idempotent/g) || []).length === 2],
  ['both payment paths send the same request key', (saveHandler.match(/p_request_key: requestKey/g) || []).length === 2],
  ['request key binds to the complete payment payload', saveHandler.includes('requestSignature') && saveHandler.includes('paymentRequestKeyRef.current')],
  ['save buttons are disabled while the payment is pending', (source.match(/disabled={paymentSaving}/g) || []).length === 2],
  ['database serializes identical request retries', sql.includes('pg_advisory_xact_lock(hashtextextended(v_request_key, 0))')],
  ['database enforces unique request keys', sql.includes('ux_supplier_payments_request_key')],
  ['database blocks identical active payloads across request keys', duplicateSql.includes('ux_supplier_payments_active_signature') && duplicateSql.includes('supplier-payment-signature:')],
  ['database rejects unauthorized callers', sql.includes("rms_has_permission(v_user_id, 'supplier.write')") && sql.includes('auth.uid()')],
  ['database rejects reuse of a key with changed payload', sql.includes('Request key was already used for different payment data')],
  ['database does not hard-delete payment rows', !/delete\\s+from\\s+public\\.supplier_payments/i.test(sql)]
]

const failures = checks.filter(([, ok]) => !ok)
for (const [label, ok] of checks) console.log(`${ok ? 'PASS' : 'FAIL'} ${label}`)
if (failures.length) process.exit(1)
