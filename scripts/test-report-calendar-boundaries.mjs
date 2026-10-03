import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import { spawnSync } from 'node:child_process'

// Run the actual extracted reporting functions in separate timezone processes.
if (!process.env.RMS_CALENDAR_TEST_CHILD) {
  for (const TZ of ['Asia/Baku', 'UTC', 'America/Los_Angeles', 'Pacific/Kiritimati']) {
    const run = spawnSync(process.execPath, [new URL(import.meta.url).pathname], {
      env: { ...process.env, TZ, RMS_CALENDAR_TEST_CHILD: '1' }, encoding: 'utf8'
    })
    process.stdout.write(run.stdout)
    process.stderr.write(run.stderr)
    assert.equal(run.status, 0, `Calendar regression failed in ${TZ}`)
  }
  process.exit(0)
}
const read = n => fs.readFileSync(new URL(`../src/main.parts/part-${n}.jsxpart`, import.meta.url), 'utf8')
const common = read('00'), daily = read('02'), reports = read('03'), other = read('04')
const extract = (source, start, end) => {
  const a = source.indexOf(start), b = source.indexOf(end, a)
  assert.ok(a >= 0 && b > a, `Missing source: ${start}`)
  return source.slice(a, b)
}
const context = vm.createContext({ Date, Intl, console })
vm.runInContext([
  extract(common, 'const pad2 =', 'const sameISODate ='),
  extract(common, 'const monthStart =', '\n'),
  extract(other, 'function rmsNextMonthStart(', '\n\n\nfunction ReportsRevenueDailyChart'),
  extract(reports, 'function rmsForecastMonthWindow(', 'function rmsForecastSumExpenseGroups('),
  extract(reports, '  function expenseDetailDateInPeriod(', '\n  const filteredExpenseDetailRows')
].join('\n'), context)
const evaluate = code => vm.runInContext(code, context)
const normalize = value => JSON.parse(JSON.stringify(value))
const scenarios = [
  [2026, 9, '2026-09-01', '2026-09-30', '2026-10-01'],
  [2024, 2, '2024-02-01', '2024-02-29', '2024-03-01'],
  [2026, 2, '2026-02-01', '2026-02-28', '2026-03-01'],
  [2026, 12, '2026-12-01', '2026-12-31', '2027-01-01'],
  [2027, 1, '2027-01-01', '2027-01-31', '2027-02-01']
]
for (const [year, month, from, last, end] of scenarios) {
  assert.deepEqual(normalize(evaluate(`rmsForecastMonthWindow(${year}, ${month})`)), { start: from, end })
  assert.equal(evaluate(`monthRangeFromISODate('${from}').to`), last)
  // Exercise the real declarations used by Dashboard and daily monthly summary.
  const dashDeclarations = extract(reports, '    const monthDate = monthStart(y, m)', '    const [')
  const dailyDeclarations = extract(daily, '    const ym = monthKeyFromDate(activeDate)', '    const [{ data: monthRows }')
  assert.equal(evaluate(`(() => { const y=${year}, m=${month}; ${dashDeclarations}; return monthEnd })()`), end)
  assert.equal(evaluate(`(() => { const activeDate='${last}'; const monthKeyFromDate = d => d.slice(0,7); ${dailyDeclarations}; return end })()`), end)
  const rows = [from, last, end]
  assert.deepEqual(rows.filter(d => d >= from && d < end), [from, last])
  Object.assign(context, { expenseDetailDate: from, expenseDetailDateFrom: from, expenseDetailDateTo: last })
  for (const period of ['month', 'range']) {
    context.expenseDetailPeriod = period
    assert.equal(evaluate(`expenseDetailDateInPeriod('${from}')`), true)
    assert.equal(evaluate(`expenseDetailDateInPeriod('${last}')`), true)
    assert.equal(evaluate(`expenseDetailDateInPeriod('${end}')`), false)
  }
}
assert.deepEqual(normalize(evaluate('rmsForecastPreviousMonths(2027, 1, 3)')), [
  { year: 2026, month: 12, start: '2026-12-01', end: '2027-01-01' },
  { year: 2026, month: 11, start: '2026-11-01', end: '2026-12-01' },
  { year: 2026, month: 10, start: '2026-10-01', end: '2026-11-01' }
])
Object.assign(context, { expenseDetailPeriod: 'week', expenseDetailDate: '2026-09-30' })
for (const [date, expected] of [['2026-09-27', false], ['2026-09-28', true], ['2026-09-30', true], ['2026-10-04', true], ['2026-10-05', false]]) {
  assert.equal(evaluate(`expenseDetailDateInPeriod('${date}')`), expected)
}
// Execute actual query-building prefixes against a recording, read-only mock.
const queries = []
context.supabase = { from(table) {
  const query = { table, filters: [] }; queries.push(query)
  const chain = new Proxy({}, { get(_, method) {
    if (method === 'then') return resolve => resolve({ data: [] })
    return (...args) => { query.filters.push([method, ...args]); return chain }
  } })
  return chain
} }
Object.assign(context, {
  readRmsAppSetting: async (_, fallback) => fallback,
  RMS_BRANCH_TAX_RATE_SETTING: 'tax', RMS_BRANCH_RENT_FORECAST_SETTING: 'rent',
  RMS_BANK_COMMISSION_RATE_SETTING: 'bank', RMS_DEFAULT_BANK_COMMISSION_RATE: 1,
  monthKeyFromDate: d => d.slice(0, 7),
  getInternalSessionStorage: () => null, branchId: 'test', date: '2026-09-30'
})
const dashPrefix = extract(reports, '  async function calcMonth(y, m)', '\n    const bankCommissionRate =')
await evaluate(`${dashPrefix}\n}; calcMonth(2026,9)`)
for (const [table, field] of [['daily_revenue','revenue_date'], ['daily_expenses','expense_date'], ['supplier_purchases','purchase_date']]) {
  const q = queries.find(q => q.table === table && q.filters.some(f => f[0] === 'gte'))
  assert.ok(q)
  assert.ok(q.filters.some(f => f[0] === 'gte' && f[1] === field && f[2] === '2026-09-01'))
  assert.ok(q.filters.some(f => f[0] === 'lt' && f[1] === field && f[2] === '2026-10-01'))
  assert.ok(q.filters.some(f => f[0] === 'is' && f[1] === 'deleted_at' && f[2] === null))
}
queries.length = 0
const dailyPrefix = extract(daily, '  async function loadMonthStats(', '    const cash = (monthRows')
await evaluate(`${dailyPrefix}\n}; loadMonthStats('test', '2026-09-30')`)
for (const table of ['daily_revenue','daily_expenses','salary_advances','daily_cash_inflows']) {
  const q = queries.find(q => q.table === table)
  assert.ok(q.filters.some(f => f[0] === 'gte' && f[2] === '2026-09-01'))
  assert.ok(q.filters.some(f => f[0] === 'lt' && f[2] === '2026-10-01'))
}
queries.length = 0
const forecastPrefix = extract(reports, 'async function rmsCalculateNetworkForecastForMonth(', '\n  const bankCommissionRate =')
await evaluate(`${forecastPrefix}\n}; rmsCalculateNetworkForecastForMonth(2027,1)`)
for (const table of ['daily_expenses', 'supplier_purchases']) {
  const current = queries.find(q => q.table === table && q.filters.some(f => f[0] === 'gte' && f[2] === '2027-01-01'))
  const history = queries.find(q => q.table === table && q.filters.some(f => f[0] === 'gte' && f[2] === '2026-10-01'))
  assert.ok(current.filters.some(f => f[0] === 'lt' && f[2] === '2027-02-01'))
  assert.ok(history.filters.some(f => f[0] === 'lt' && f[2] === '2027-01-01'))
}
// The inclusive detail date must use the same tested calendar helper.
assert.match(reports, /setExpenseDetailDateTo\(monthRangeFromISODate\(monthStart\(year, month\)\)\.to\)/)
console.log(`PASS ${process.env.TZ}: calendar boundaries, detail filters and Dashboard/daily/forecast query paths verified`)
