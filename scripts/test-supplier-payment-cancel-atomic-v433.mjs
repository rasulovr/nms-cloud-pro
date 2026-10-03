import fs from 'node:fs'

const source = fs.readFileSync(new URL('../src/main.generated.jsx', import.meta.url), 'utf8')
const cancelSql = fs.readFileSync(new URL('../src/rms_supplier_payment_cancel_atomic_v433.sql', import.meta.url), 'utf8')
const createSql = fs.readFileSync(new URL('../src/rms_supplier_payment_idempotency_v433.sql', import.meta.url), 'utf8')
const duplicateSql = fs.readFileSync(new URL('../src/rms_supplier_payment_duplicate_guard_v436.sql', import.meta.url), 'utf8')
const accessSql = fs.readFileSync(new URL('../src/rms_supplier_payment_rpc_access_v435.sql', import.meta.url), 'utf8')

const checks = [
  ['both payment cancellation paths use atomic batch RPC', (source.match(/rms_supplier_payment_cancel_batch_secure/g) || []).length === 2],
  ['legacy cancellation RPC is no longer called by the UI', !/callSupplierRpc\(['"]rms_supplier_payment_cancel_secure['"]/.test(source)],
  ['cancellation handler sends idempotency key', (source.match(/p_request_key: globalThis\.crypto/g) || []).length === 2],
  ['cancellation locks payment rows', /for update/i.test(cancelSql)],
  ['cancellation validates active ledger credits before changes', cancelSql.includes('Expected one matching active supplier-ledger credit')],
  ['cancellation writes ERP event audit', cancelSql.includes("supplier.payment.cancelled") && cancelSql.includes('rms_erp_event_write')],
  ['cancellation deactivates ledger in the same transaction', cancelSql.includes('rms_supplier_ledger_upsert_payment')],
  ['cancellation batch is idempotent by request key', cancelSql.includes('pg_advisory_xact_lock') && cancelSql.includes('supplier_payment_cancel_batches')],
  ['create retries return the original request result', createSql.includes('Request key was already used for different payment data')],
  ['identical active payloads are serialized across sessions', duplicateSql.includes('supplier-payment-signature:') && duplicateSql.includes('ux_supplier_payments_active_signature')],
  ['signature check matches full payment payload', duplicateSql.includes('e_invoice_id is not distinct from p_e_invoice_id') && duplicateSql.includes('request_signature')],
  ['clients cannot bypass the guarded write RPCs', accessSql.includes('rms_supplier_payment_create_secure') && accessSql.includes('rms_supplier_payment_cancel_secure') && accessSql.includes('from public, anon, authenticated')],
]

let failed = false
for (const [label, passed] of checks) {
  process.stdout.write(`${passed ? 'PASS' : 'FAIL'} ${label}\n`)
  if (!passed) failed = true
}
if (failed) process.exitCode = 1
