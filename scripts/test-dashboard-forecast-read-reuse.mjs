import fs from 'node:fs'
import vm from 'node:vm'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'

// Public first-stage release commit, with the same tree as production main.
// Pin it so committing the candidate does not erase the oracle.
const baselineRevision = '5fa2dffcb7425c1afd10f1e64541f603f0f22058'
const partPath = 'src/main.parts/part-03.jsxpart'
const commonPath = 'src/main.parts/part-00.jsxpart'
const candidate = fs.readFileSync(partPath, 'utf8')
const baseline = execFileSync('git', ['show', `${baselineRevision}:${partPath}`], { encoding: 'utf8' })
const common = fs.readFileSync(commonPath, 'utf8')
const oldCommon = execFileSync('git', ['show', `${baselineRevision}:${commonPath}`], { encoding: 'utf8' })
process.env.TZ = 'UTC'

const clone = value => JSON.parse(JSON.stringify(value))
function between(source, start, end) {
  const from = source.indexOf(start)
  const to = source.indexOf(end, from + start.length)
  assert.ok(from >= 0 && to > from, `Missing source markers: ${start} / ${end}`)
  return source.slice(from, to)
}
class FixedDate extends Date {
  constructor(...args) { super(...(args.length ? args : ['2026-10-18T12:00:00.000Z'])) }
  static now() { return new Date('2026-10-18T12:00:00.000Z').getTime() }
}
function fields(select) {
  const result = []
  let depth = 0, start = 0
  for (let i = 0; i < select.length; i++) {
    if (select[i] === '(') depth++
    if (select[i] === ')') depth--
    if (select[i] === ',' && !depth) { result.push(select.slice(start, i).trim()); start = i + 1 }
  }
  result.push(select.slice(start).trim())
  return result
}
function project(row, select = '*') {
  if (select === '*') return clone(row)
  const result = {}
  for (const field of fields(select)) {
    const nested = field.match(/^([^()]+)\((.*)\)$/)
    const name = nested ? nested[1] : field
    if (!(name in row)) continue
    result[name] = nested
      ? Array.isArray(row[name]) ? row[name].map(value => project(value, nested[2])) : row[name] && project(row[name], nested[2])
      : clone(row[name])
  }
  return result
}

function fixtures({ employeesPresent = true, periodsPresent = true, noRevenue = false } = {}) {
  const branches = [
    { id: 'fixture-a', name: 'Synthetic A', service_charge_enabled: true, service_charge_percent: 10, service_staff_cost_percent: 4 },
    { id: 'fixture-b', name: 'Synthetic B', service_charge_enabled: false, service_charge_percent: 10, service_staff_cost_percent: 4 }
  ]
  const employees = [
    { id: 'fixture-staff-a', branch_id: 'fixture-a', position: 'Бариста', monthly_salary: 70, daily_rate: 0, salary_type: 'monthly', is_active: true, employment_status: 'active' },
    { id: 'fixture-staff-b', branch_id: 'fixture-b', position: 'Повар', monthly_salary: 90, daily_rate: 0, salary_type: 'monthly', is_active: true, employment_status: 'active' },
    { id: 'fixture-manager', branch_id: null, position: 'Менеджер', monthly_salary: 30, daily_rate: 0, salary_type: 'monthly', is_active: true, employment_status: 'active' }
  ]
  const salaryFor = (month, amounts) => employees.map((employee, index) => ({
    employee_id: employee.id, branch_id: employee.branch_id, salary_month: month,
    salary_gross: amounts[index], salary_net: amounts[index] - 1, card_payment: 1, cash_payment: 2,
    advance_amount: 3, deduction_amount: 1, previous_balance_amount: 2, employees: clone(employee)
  }))
  const revenue = [], monthly = [], expenses = [], purchases = [], salary = []
  for (const month of ['2026-07', '2026-08', '2026-09', '2026-10']) {
    for (const [index, branch] of branches.entries()) {
      revenue.push({ branch_id: branch.id, revenue_date: `${month}-05`, cash_amount: 100 + index * 40, bank_amount: 50 + index * 10, wolt_amount: 20 + index * 5, deleted_at: null })
      // Wolt-only last-filled day must remain financial revenue.
      revenue.push({ branch_id: branch.id, revenue_date: `${month}-16`, cash_amount: 0, bank_amount: 0, wolt_amount: 7 + index, deleted_at: null })
      monthly.push({ branch_id: branch.id, month: `${month}-01`, total_revenue: 999, cash_amount: 200, bank_amount: 100, wolt_amount: 30 })
      expenses.push({ branch_id: branch.id, expense_date: `${month}-04`, amount: 9 + index, custom_category: 'Коммунальные', expense_categories: null, comment: '', deleted_at: null })
      expenses.push({ branch_id: branch.id, expense_date: `${month}-06`, amount: 13, custom_category: 'Food Cost', expense_categories: null, comment: 'SUPPLIER_PURCHASE_fixture', deleted_at: null })
      expenses.push({ branch_id: branch.id, expense_date: `${month}-07`, amount: 11, custom_category: 'vergi', expense_categories: null, comment: 'water', deleted_at: null })
    }
    expenses.push({ branch_id: 'fixture-a', expense_date: `${month}-03`, amount: 20, custom_category: 'Аренда', expense_categories: null, comment: '', deleted_at: null })
    purchases.push({ id: `fixture-purchase-${month}`, supplier_id: 'fixture-supplier', branch_id: 'fixture-b', purchase_date: `${month}-03`, invoice_number: `TEST-${month}`, total_amount: 18, deleted_at: null, supplier_purchase_items: [{ total_amount: 18, supplier_products: { name: 'Synthetic food', category: 'food' } }] })
    if (month !== '2026-10' || periodsPresent) salary.push(...salaryFor(`${month}-01`, [23, 31, 7]))
  }
  revenue.push({ branch_id: 'fixture-a', revenue_date: '2026-10-17', cash_amount: 9999, bank_amount: 0, wolt_amount: 0, deleted_at: '2026-10-17' })
  const snapshotEmployees = employees.map(row => ({ ...row, monthly_salary: row.monthly_salary + 100 }))
  return {
    tables: {
      branches, employees: employeesPresent ? employees : [],
      salary_periods: salary,
      daily_revenue: noRevenue ? [] : revenue,
      monthly_branch_revenue: noRevenue ? [] : monthly,
      monthly_branch_expenses: [], daily_expenses: expenses, supplier_purchases: purchases,
      monthly_branch_service_charge_cost: [{ branch_id: 'fixture-a', month: '2026-10-01', staff_cost_amount: 4 }],
      supplier_balances_v2: [{ supplier_id: 'fixture-supplier', supplier_name: 'Synthetic supplier', balance: 7 }],
      supplier_balances: [], suppliers: [{ id: 'fixture-supplier', name: 'Synthetic supplier', is_active: true, payment_term_days: 1, credit_limit: 3 }],
      supplier_payments: [{ supplier_id: 'fixture-supplier', amount: 3 }],
      rms_app_settings: [
        { key: 'branch_rent_forecast_v1', value: { 'fixture-a': 25 } },
        { key: 'branch_tax_rate_v1', value: { 'fixture-a': 8, 'fixture-b': 6 } },
        { key: 'bank_commission_rate_v1', value: 2 }
      ]
    },
    snapshot: { employees: snapshotEmployees, salary_periods: [...salaryFor('2026-10-01', [29, 37, 11]), ...salaryFor('2026-09-01', [999, 999, 999])] }
  }
}

function harness(source, helperSource, options = {}) {
  const fixture = fixtures(options)
  const calls = [], writes = [], errors = []
  const supabase = {
    from(table) {
      const query = { table, select: '*', filters: [], single: false }
      const builder = {
        select(value) { query.select = value; return this },
        eq(key, value) { query.filters.push(['eq', key, value]); return this },
        gte(key, value) { query.filters.push(['gte', key, value]); return this },
        lt(key, value) { query.filters.push(['lt', key, value]); return this },
        is(key, value) { query.filters.push(['is', key, value]); return this },
        maybeSingle() { query.single = true; return this },
        then(resolve, reject) {
          // Supabase builders execute every time they are assimilated. Counting
          // here catches caches that accidentally retain a builder, not a Promise.
          calls.push(clone(query))
          return Promise.resolve().then(() => {
            assert.ok(table in fixture.tables, `Unexpected table ${table}`)
            let rows = fixture.tables[table].filter(row => query.filters.every(([op, key, value]) =>
              op === 'eq' ? row[key] === value : op === 'gte' ? row[key] >= value : op === 'lt' ? row[key] < value : row[key] == null && value == null))
            rows = rows.map(row => project(row, query.select))
            return { data: query.single ? rows[0] || null : rows, error: null }
          }).then(resolve, reject)
        }
      }
      return builder
    },
    async rpc(name, args) {
      assert.equal(name, 'rms_staff_workspace_snapshot')
      assert.equal(args.p_month, '2026-10-01')
      calls.push({ rpc: name })
      if (options.snapshot === 'throw') throw new Error('Synthetic snapshot rejection')
      if (options.snapshot === 'error') return { data: null, error: new Error('Synthetic snapshot error') }
      if (options.snapshot === 'empty') return { data: null, error: null }
      return { data: clone(fixture.snapshot), error: null }
    }
  }
  let stateIndex = 0
  const context = vm.createContext({
    console: { error: (...args) => errors.push(args) }, Date: FixedDate, Map, Set, Promise, supabase,
    localStorage: { getItem: () => null },
    monthStart: (year, month) => `${year}-${String(month).padStart(2, '0')}-01`,
    daysInMonth: (year, month) => new FixedDate(Number(year), Number(month), 0).getDate(),
    rmsNextMonthStart: key => { const date = new FixedDate(`${key.slice(0, 7)}-01T00:00:00.000Z`); date.setUTCMonth(date.getUTCMonth() + 1); return date.toISOString().slice(0, 10) },
    prevMonth: (year, month) => month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 },
    useBranches: (_includeInactive, withStatus) => withStatus ? { branches: clone(fixture.tables.branches), loaded: true } : clone(fixture.tables.branches),
    useRef: value => ({ current: value }), useEffect() {},
    useState: initial => { const index = stateIndex++; return [index === 0 ? options.scope || '__all__' : initial, value => writes.push({ index, value: clone(value) })] }
  })
  const helperCode = [
    between(helperSource, 'const fmt =', 'const RMS_LOGIN_GUARD_KEY'),
    between(helperSource, 'const rmsFinanceExpenseGroupName =', 'const pad2 ='),
    between(helperSource, 'const positionGroup =', 'const isManagerStaff ='),
    between(helperSource, "const RMS_APP_SETTINGS_TABLE =", 'const RMS_SOURCE_VERSION'),
    between(helperSource, 'async function readRmsAppSetting(', 'async function writeRmsAppSetting('),
    between(helperSource, 'async function fetchRmsStaffWorkspaceSnapshot(', 'async function fetchRmsRevenueWorkspace('),
    between(source, 'function rmsForecastMonthWindow(', 'function DashboardStyles('),
    between(source, 'async function rmsLoadDailyRevenueRowsForChart(', 'function Dashboard({ t })')
  ].join('\n')
  const dashboardCode = between(source, 'function Dashboard({ t })', '  if (!data) return')
    + '\nreturn { load, calcMonth, loadRequestRef }; }\n'
  vm.runInContext(helperCode + dashboardCode, context)
  const api = vm.runInContext('({ forecast: rmsFinanceForecastEngine, dashboard: Dashboard({ t: value => value }) })', context)
  let makeReadOnce
  if (source.includes('const reads = new Map()')) {
    const readerCode = between(source, '    const reads = new Map()', '    try {\n      const pm = prevMonth(year, month)')
    makeReadOnce = () => vm.runInContext(`(() => {${readerCode}\nreturn readOnce })()`, context)
  }
  return { api, calls, writes, errors, makeReadOnce }
}

let equivalenceCases = 0
for (const employeesPresent of [true, false]) {
  for (const periodsPresent of [true, false]) {
    for (const snapshot of ['available', 'empty', 'error', 'throw']) {
      for (const scope of ['all', '__all__', 'fixture-a', 'fixture-b']) {
        const options = { employeesPresent, periodsPresent, snapshot }
        const before = harness(baseline, oldCommon, options)
        const after = harness(candidate, common, options)
        const expected = await before.api.forecast(2026, 10, scope)
        const actual = await after.api.forecast(2026, 10, scope)
        const label = JSON.stringify({ ...options, scope })
        assert.deepEqual(clone(actual), clone(expected), `Forecast changed: ${label}`)
        assert.equal(before.calls.filter(call => call.rpc).length, 1, `Baseline snapshot: ${label}`)
        assert.equal(after.calls.filter(call => call.rpc).length, employeesPresent && periodsPresent ? 0 : 1, `Candidate snapshot: ${label}`)
        equivalenceCases++
      }
    }
  }
}

for (const source of [baseline, candidate]) {
  const run = harness(source, source === baseline ? oldCommon : common, { noRevenue: true })
  const result = await run.api.forecast(2026, 10, 'all')
  assert.equal(result.forecastRevenue, 0)
  assert.equal(run.calls.filter(call => call.rpc).length, 0, 'No-revenue early return must not fetch snapshot')
}

function readCount(run, table, key) {
  return run.calls.filter(call => call.table === table && (!key || call.filters.some(([op, field, value]) => op === 'eq' && field === 'key' && value === key))).length
}
for (const scope of ['__all__', 'fixture-a', 'fixture-b']) {
  const before = harness(baseline, oldCommon, { scope })
  const after = harness(candidate, common, { scope })
  await before.api.dashboard.load()
  await after.api.dashboard.load()
  assert.equal(before.errors.length, 0, `Baseline Dashboard failed for ${scope}`)
  assert.equal(after.errors.length, 0, `Candidate Dashboard failed for ${scope}`)
  assert.deepEqual(after.writes, before.writes, `Actual Dashboard + forecast result changed for ${scope}`)
  assert.equal(readCount(before, 'employees'), 3)
  assert.equal(readCount(after, 'employees'), 1, 'Employees should execute once across current, previous, forecast')
  assert.equal(readCount(before, 'daily_revenue'), 7)
  assert.equal(readCount(after, 'daily_revenue'), 6, 'Exact current-month daily revenue should execute once')
  assert.equal(readCount(before, 'rms_app_settings', 'bank_commission_rate_v1'), 7)
  assert.equal(readCount(after, 'rms_app_settings', 'bank_commission_rate_v1'), 1)
  assert.equal(readCount(before, 'rms_app_settings', 'branch_tax_rate_v1'), 3)
  assert.equal(readCount(after, 'rms_app_settings', 'branch_tax_rate_v1'), 1)
  assert.equal(before.calls.length, 56, 'Baseline read count includes actual forecast and RPC')
  assert.equal(after.calls.length, 40, 'Candidate read count includes actual forecast; snapshot unused')
  const firstCount = readCount(after, 'employees')
  await after.api.dashboard.load()
  assert.equal(readCount(after, 'employees'), firstCount + 1, 'A later load must not reuse the previous load cache')
}

// Independently prove Promise assimilation, shared rejection, and no factory
// reexecution using the exact readOnce implementation extracted from Dashboard.
{
  const run = harness(candidate, common)
  const readOnce = run.makeReadOnce()
  let factories = 0, assimilations = 0
  const first = readOnce('synthetic-thenable', () => {
    factories++
    return { then(resolve) { assimilations++; resolve({ fixture: true }) } }
  })
  const second = readOnce('synthetic-thenable', () => { throw new Error('Duplicate factory must not run') })
  assert.equal(first, second)
  const [one, two] = await Promise.all([first, second])
  assert.equal(one, two)
  assert.equal(factories, 1)
  assert.equal(assimilations, 1)
  let failures = 0
  const error = new Error('Synthetic shared failure')
  const failed = readOnce('failure', () => { failures++; throw error })
  const repeated = readOnce('failure', () => { failures++; throw error })
  const results = await Promise.allSettled([failed, repeated])
  assert.equal(failures, 1)
  assert.ok(results.every(result => result.status === 'rejected' && result.reason === error))
}

console.log(JSON.stringify({ test: 'actual forecast read reuse', forecastEquivalenceCases: equivalenceCases, dashboardScopes: 3, readsBefore: 56, readsAfter: 40, snapshotFallbacks: 'passed', financialOutput: 'identical to pinned baseline', promiseAssimilation: 'passed', freshLoadScope: 'passed', network: 'none' }))
