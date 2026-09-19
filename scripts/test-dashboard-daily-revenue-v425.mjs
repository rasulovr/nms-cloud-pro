import fs from 'node:fs'
import assert from 'node:assert/strict'

const source = fs.readFileSync(new URL('../src/main.parts/part-03.jsxpart', import.meta.url), 'utf8')
const loader = source.match(/async function rmsLoadDailyRevenueRowsForChart[\s\S]*?\n}\n\nfunction rmsSalaryPeriodTotal/)?.[0] || ''

assert.ok(loader, 'daily revenue chart loader must exist')
assert.match(
  loader,
  /const value = parseNum\(row\.cash_amount\) \+ parseNum\(row\.bank_amount\)/,
  'daily chart must use cash + bank'
)
assert.doesNotMatch(
  loader,
  /const value =[^\n]*wolt_amount/,
  'Wolt must not be included in daily chart values'
)

assert.match(
  source,
  /title="Выручка по дням"[\s\S]*?без Wolt/,
  'dashboard daily chart must explain that Wolt is excluded'
)

assert.match(
  source,
  /const revenue = parseNum\(rev\.total_revenue\)/,
  'overall dashboard revenue must keep the full revenue total'
)

assert.match(
  source,
  /const woltRevenue = Math\.max\(0, parseNum\(rev\.wolt_amount\)\)/,
  'overall dashboard calculations must keep Wolt revenue available'
)

console.log('Dashboard v425 daily revenue checks passed')
