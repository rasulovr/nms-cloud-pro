import fs from 'node:fs'

const source = fs.readFileSync(new URL('../src/main.generated.jsx', import.meta.url), 'utf8')
const sql = fs.readFileSync(new URL('../src/rms_supplier_purchase_idempotency_v420.sql', import.meta.url), 'utf8')

const checks = [
  ['frontend uses the idempotent RPC', source.includes("callSupplierRpc('rms_supplier_purchase_create_idempotent'")],
  ['frontend sends a stable request key', source.includes('p_request_key: requestKey')],
  ['save button is disabled while pending', source.includes('disabled={purchaseCreatePending}')],
  ['cancelled purchases are hidden from the journal', source.includes('const visiblePurchases = (purchases || []).filter(p => !p.deleted_at')],
  ['cancelled purchases are hidden from supplier transactions', source.includes('const filteredPurchases = purchases.filter(p => !p.deleted_at')],
  ['database serializes matching requests', sql.includes('pg_advisory_xact_lock')],
  ['database has a unique request-key index', sql.includes('ux_supplier_purchases_request_key')],
  ['database keeps a compatibility duplicate window', sql.includes("interval '10 minutes'")],
  ['migration does not hard-delete purchases', !/delete\s+from\s+public\.supplier_purchases/i.test(sql)]
]

const failures = checks.filter(([, ok]) => !ok)
for (const [label, ok] of checks) console.log(`${ok ? 'PASS' : 'FAIL'} ${label}`)
if (failures.length) process.exit(1)
