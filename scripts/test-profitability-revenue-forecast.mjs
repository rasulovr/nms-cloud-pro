import {execFileSync} from 'node:child_process'
import {profitabilityManagerPosition} from '../src/profitability-payroll-allocation.mjs'
import fs from 'node:fs'
import vm from 'node:vm'
import assert from 'node:assert/strict'
import * as revenuePeriod from '../src/revenue-period.mjs'

const partPath='src/main.parts/part-03.jsxpart',commonPath='src/main.parts/part-00.jsxpart'
const candidate=fs.readFileSync(partPath,'utf8'),common=fs.readFileSync(commonPath,'utf8')
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

function fixtures({ employeesPresent = true, periodsPresent = true, noRevenue = false, zeroRevenue = false, missingBranch = false, partial = false, readError = false } = {}) {
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
      for(let day=1;day<=18;day++) {
        if(month==='2026-10' && (missingBranch && index===1 || partial && index===1 && day>15))continue
        revenue.push({ branch_id:branch.id,revenue_date:`${month}-${String(day).padStart(2,'0')}`,cash_amount:zeroRevenue&&month==='2026-10'?0:100+index*40,bank_amount:zeroRevenue&&month==='2026-10'?0:50+index*10,wolt_amount:zeroRevenue&&month==='2026-10'?0:20+index*5,deleted_at:null })
      }
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
            return options.readError && table==='daily_revenue' ? {data:null,error:new Error('Synthetic read failure')} : { data: query.single ? rows[0] || null : rows, error: null }
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
    ...revenuePeriod, profitabilityManagerPosition, futureRevenueMonth:(y,m)=>revenuePeriod.futureRevenueMonth(y,m,new FixedDate()),
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
    between(source, 'function rmsSalaryPeriodTotal(', '// Shared live source read')
  ].join('\n')
  vm.runInContext(helperCode, context)
  const api=vm.runInContext('({forecast:rmsFinanceForecastEngine})',context)
  return {api,calls,errors}
}
const normal=harness(candidate,common)
const network=await normal.api.forecast(2026,10,'__all__')
// A:100+50*.98+20=169; B:140+60*.98+25=223.8.
assert.equal(network.forecastAvailable,true)
assert.ok(Math.abs(network.forecastRevenue-(169+223.8)*31)<1e-8)
assert.match(network.forecastLabel,/1–17/)
assert.equal(normal.errors.length,0)
for(const id of ['fixture-a','fixture-b']){
 const result=await harness(candidate,common).api.forecast(2026,10,id)
 assert.equal(result.forecastAvailable,true)
 assert.ok(Math.abs(result.forecastRevenue-(id==='fixture-a'?169:223.8)*31)<1e-8)
}
const partial=await harness(candidate,common,{partial:true}).api.forecast(2026,10,'__all__')
assert.match(partial.forecastLabel,/1–15/)
assert.ok(Math.abs(partial.forecastRevenue-(169+223.8)*31)<1e-8)
const selected=await harness(candidate,common,{partial:true}).api.forecast(2026,10,'fixture-a')
assert.match(selected.forecastLabel,/1–17/)
for(const opts of [{noRevenue:true},{missingBranch:true},{readError:true}]){
 const result=await harness(candidate,common,opts).api.forecast(2026,10,'__all__')
 assert.equal(result.forecastAvailable,false,JSON.stringify(opts))
 assert.equal(result.forecastRevenue,null)
}
const zero=await harness(candidate,common,{zeroRevenue:true}).api.forecast(2026,10,'__all__')
assert.equal(zero.forecastAvailable,true)
assert.equal(zero.forecastRevenue,0)
console.log('PASS actual forecast engine: network and selected branch, complete-day numerator, partial day truncation, missing branch/read errors, zero observations, unchanged expense pipeline executes')

const baseline=execFileSync('git',['show','698b42390efa1d03b0cb170b08853f4dc842bec8:src/main.parts/part-03.jsxpart'],{encoding:'utf8'})
for(const options of [{},{partial:true}]) {
 const before=await harness(baseline,common,options).api.forecast(2026,10,'__all__')
 const after=await harness(candidate,common,options).api.forecast(2026,10,'__all__')
 assert.equal(after.forecastExpenses,before.forecastExpenses)
 assert.deepEqual(clone(after.expenseRows),clone(before.expenseRows))
}
console.log('PASS existing expense/tax/rent/accrual forecast output unchanged against pinned pre-fix baseline')
