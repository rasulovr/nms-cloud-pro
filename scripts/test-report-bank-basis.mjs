import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'

const source = fs.readFileSync('src/main.parts/part-04.jsxpart', 'utf8')
const common = fs.readFileSync('src/main.parts/part-00.jsxpart', 'utf8')
const helpers = source.slice(source.indexOf('function rmsReportBankBasis('), source.indexOf('function Reports({'))
const loaderStart = source.indexOf('  async function loadRmsProfitabilityReport()')
const loaderEnd = source.indexOf('\n  }', source.indexOf('    } catch (error) {', loaderStart)) + 5
const loader = source.slice(loaderStart, loaderEnd)
const rateHelper = common.slice(common.indexOf('const RMS_DEFAULT_BANK_COMMISSION_RATE'), common.indexOf('const rmsNetRevenueParts'))
const base = { id: 'synthetic-row', source: 'fixture-import', external_id: 'fixture-transaction', branch_id: 'branch-a', revenue_date: '2040-03-10', cash_amount: 300, bank_amount: 1000, wolt_amount: 200, comment: 'Original provenance' }
const marker = { version: 1, basis: 'gross', branchId: base.branch_id, date: base.revenue_date, grossAmount: base.bank_amount, sourceUrl: 'https://example.com/synthetic-source', source: base.source, externalId: base.external_id }
const marked = (changes = {}) => ({ ...base, comment: `${base.comment}\nRMS_BANK_BASIS_V1=${JSON.stringify({ ...marker, ...changes })}` })
async function run(row, { fallback = false, rate = 3 } = {}) {
  let result
  const selections = []
  const tables = {
    daily_revenue_entries: fallback ? [] : [row, { ...base, id: 'other', branch_id: 'branch-b', cash_amount: 500, bank_amount: 0, wolt_amount: 0 }],
    daily_revenue: fallback ? [row] : [],
    daily_expenses: [], supplier_purchases: [{ id: 'supplier-fixture', total_amount: 100 }],
    employees: [{ id: 'manager', full_name: 'Fixture manager', position: 'Менеджеры' }],
    salary_periods: [{ employee_id: 'manager', salary_gross: 200 }], monthly_branch_service_charge_cost: []
  }
  const ctx = vm.createContext({
    URL, console, parseNum: v => Number(v) || 0,
    RMS_BRANCH_TAX_RATE_SETTING: 'tax', RMS_BANK_COMMISSION_RATE_SETTING: 'bank',
    readRmsAppSetting: async (key, defaultValue) => key === 'tax' ? { 'branch-a': 10 } : rate === 'default' ? defaultValue : rate,
    monthFilter: 'all', branchFilter: 'all', branches: [{ id: 'branch-a', name: 'Fixture A' }, { id: 'branch-b', name: 'Fixture B' }],
    setRmsProfitabilityReport: value => { if (typeof value !== 'function') result = value },
    financeExpenseNameFromRow: () => '', normalizeExpenseText: s => s,
    rmsSalaryPeriodTotal: p => p.salary_gross, positionGroup: s => s,
    pct: v => String(v), fmt: v => String(v),
    supabase: { from(table) {
      const query = { then(resolve) { return Promise.resolve({ data: tables[table] || [], error: null }).then(resolve) } }
      for (const name of ['select', 'is', 'gte', 'lt', 'order', 'range', 'eq']) query[name] = (...args) => { if (name === 'select') selections.push([table, args[0]]); return query }
      return query
    } }
  })
  vm.runInContext(`${rateHelper}\n${helpers}\n${loader}\nthis.load = loadRmsProfitabilityReport`, ctx)
  await ctx.load()
  return { result: JSON.parse(JSON.stringify(result)), selections }
}
const unmarked = (await run(base)).result
assert.equal(unmarked.error, '')
const before = unmarked.rows.find(r => r.id === base.branch_id)
assert.equal(before.bankCommission, 0)
assert.equal(before.revenue, 1500)
assert.equal(before.tax, 150)
assert.equal(before.supplierFoodCost, 75)
assert.equal(before.managerSalary, 150)
assert.equal(before.net, 1125)
const normalized = marked()
const snapshot = JSON.stringify(normalized)
const first = (await run(normalized)).result
const after = first.rows.find(r => r.id === base.branch_id)
assert.equal(after.bankCommission, 30)
assert.equal(after.net, 1095)
assert.equal(after.totalExpenses - before.totalExpenses, 30)
assert.equal(after.operatingExpenses - before.operatingExpenses, 30)
for (const field of ['revenue', 'tax', 'revenueShare', 'supplierFoodCost', 'managerSalary', 'baseRevenue']) assert.equal(after[field], before[field], `${field} must retain gross basis`)
assert.equal(after.expenseCategories.filter(c => c.key === 'bank-commission').length, 1)
assert.equal(after.expenseCategories.find(c => c.key === 'bank-commission').details[0].amount, 30)
assert.deepEqual((await run(normalized)).result, first, 'repeated builds must not accumulate fees')
assert.equal(JSON.stringify(normalized), snapshot, 'report must not mutate revenue input')
assert.equal((await run(marked(), { rate: 'default' })).result.rows.find(r => r.id === base.branch_id).bankCommission, 20)
assert.equal((await run(marked(), { rate: 0 })).result.rows.find(r => r.id === base.branch_id).bankCommission, 0)
const fallback = await run(marked(), { fallback: true })
assert.equal(fallback.result.rows[0].bankCommission, 30)
for (const [table, columns] of fallback.selections.filter(([t]) => t.startsWith('daily_revenue'))) {
  for (const field of ['source', 'external_id', 'comment']) assert.ok(columns.split(',').includes(field), `${table} must read ${field}`)
}
for (const invalid of [
  marked({ version: 2 }), marked({ basis: 'net' }), marked({ branchId: 'wrong' }), marked({ date: '2040-03-11' }),
  marked({ grossAmount: 999 }), marked({ source: 'other' }), marked({ externalId: 'other' }),
  marked({ sourceUrl: 'javascript:alert(1)' }), marked({ sourceUrl: 'https://user:secret@example.com' }),
  marked({ grossAmount: '1000' }), { ...marked(), bank_amount: 999 },
  { ...base, comment: 'RMS_BANK_BASIS_V1={broken' },
  { ...base, comment: `${marked().comment}\nRMS_BANK_BASIS_V1=${JSON.stringify(marker)}` }
]) {
  const rejected = (await run(invalid)).result
  assert.ok(rejected.error, 'invalid/stale/duplicate marker must fail closed')
  assert.equal(rejected.rows.length, 0)
}
console.log('Report bank basis: synthetic integration checks passed')
