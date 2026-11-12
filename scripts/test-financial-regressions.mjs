import {readdirSync} from 'node:fs'
import {spawnSync} from 'node:child_process'
const additional = new Set([
  'test-reports-overview-profit.mjs',
  'test-finance-accrued-payroll-v426.mjs', 'test-finance-revenue-share-v432.mjs',
  'test-salary-revenue-allocation-v424.mjs', 'test-service-charge-branches-v423.mjs',
  'test-supplier-revenue-allocation-v421.mjs', 'test-turnover-tax-dedup-v433.mjs',
  'test-report-bank-basis.mjs', 'test-report-calendar-boundaries.mjs',
  'test-bank-commission-v428.mjs', 'test-payroll-import-v427.mjs'
])
const files = readdirSync('scripts').filter(file=>file.startsWith('test-profitability-') || additional.has(file)).sort()
for (const file of files) {
  const result = spawnSync(process.execPath,['scripts/'+file],{stdio:'inherit'})
  if (result.error) throw result.error
  if (result.status!==0) process.exit(result.status || 1)
}
console.log(`PASS ${files.length} financial regression scripts`)
