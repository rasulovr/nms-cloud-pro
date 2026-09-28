import fs from 'node:fs'

const source = fs.readFileSync(new URL('../src/main.generated.jsx', import.meta.url), 'utf8')

const checks = [
  ['purchase saves use a lightweight refresh', (source.match(/refreshMode: 'purchase'/g) || []).length >= 3],
  ['lightweight refresh keeps the full journal in memory', source.includes('mergeSupplierPurchaseSnapshot(currentRows, refreshedPurchase)')],
  ['lightweight refresh updates supplier balances', source.includes('setBalances(ws.supplier_balances || [])')],
  ['lightweight refresh fetches one workspace snapshot', source.includes('async function refreshSupplierPurchaseSnapshot(purchaseId)')],
  ['successful mutation is not reported as failed when refresh fails', source.includes('The mutation is already committed')],
  ['full reload remains available for other supplier mutations', source.includes("options.refreshMode !== 'none'") && source.includes('await load()')]
]

const failures = checks.filter(([, ok]) => !ok)
for (const [label, ok] of checks) console.log(`${ok ? 'PASS' : 'FAIL'} ${label}`)
if (failures.length) process.exit(1)
