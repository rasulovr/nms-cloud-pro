import {validateMonthRange} from '../src/profitability-range.mjs'
import {componentInputsFingerprint, ALLOCATION_BASIS, COMPONENT_SNAPSHOT_TYPE, readComponentRecords, resolveComponentRecords, resolveCoverageManifests, resolveBankEvidence} from '../src/profitability-reviewed-components.mjs'
import {buildReviewedAdjustments} from '../src/profitability-adjustments.mjs'
import {buildMonthlyAllocationBasis} from '../src/profitability-allocation.mjs'
import {profitabilityAccrualIssues} from '../src/profitability-source-completeness.mjs'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'

const source = fs.readFileSync('src/main.parts/part-04.jsxpart', 'utf8')
const common = fs.readFileSync('src/main.parts/part-00.jsxpart', 'utf8')
const helpers = source.slice(source.indexOf('function rmsReportBankBasis('), source.indexOf('function Reports({'))
const loaderStart = source.indexOf('  async function loadRmsProfitabilityReport()')
const loaderEnd = source.indexOf('\n  }', source.indexOf('    } catch (error) {', loaderStart)) + 5
const loader = source.slice(loaderStart, loaderEnd)
const expenseHelpers=common.slice(common.indexOf('const normalizeExpenseText ='),common.indexOf('const RMS_LOGIN_GUARD_KEY'))
const rateHelper = common.slice(common.indexOf('const RMS_DEFAULT_BANK_COMMISSION_RATE'), common.indexOf('const rmsNetRevenueParts'))
const base = { id: 'synthetic-row', source: 'fixture-import', external_id: 'fixture-transaction', branch_id: 'branch-a', revenue_date: '2040-03-10', cash_amount: 300, bank_amount: 1000, wolt_amount: 200, comment: 'Original provenance' }
const marker = { version: 1, basis: 'gross', branchId: base.branch_id, date: base.revenue_date, grossAmount: base.bank_amount, sourceUrl: 'https://example.com/synthetic-source', source: base.source, externalId: base.external_id }
const marked = (changes = {}) => ({ ...base, comment: `${base.comment}\nRMS_BANK_BASIS_V1=${JSON.stringify({ ...marker, ...changes })}` })
async function run(row, { fallback = false, rate = 3, overrides = {}, failTable = null, makeRecords = null } = {}) {
  let result
  const selections = []
  const tables = {
    daily_revenue_entries: fallback ? [] : [row, { ...base, id: 'other', branch_id: 'branch-b', cash_amount: 500, bank_amount: 0, wolt_amount: 0 }],
    daily_revenue: fallback ? [row] : [],
    daily_expenses: [], supplier_purchases: [{ id: 'supplier-fixture', purchase_date:'2040-03-01', total_amount: 100 }],
    employees: [{ id: 'manager', full_name: 'Fixture manager', position: 'Менеджеры' }],
    salary_periods: [{ id:'salary-fixture', employee_id: 'manager', salary_month:'2040-03-01', salary_gross: 200 }], monthly_branch_service_charge_cost: [], ...overrides
  }
  if (makeRecords) tables.rms_data_snapshots = await makeRecords(tables)
  const ctx = vm.createContext({
    validateMonthRange, readComponentRecords, resolveComponentRecords, resolveCoverageManifests, resolveBankEvidence,
    buildReviewedAdjustments, buildMonthlyAllocationBasis, profitabilityAccrualIssues,
    profitabilityRequestId:{current:0}, profitabilitySelection:{from:'2040-03-01',to:'2040-03-31',branchIds:['branch-a','branch-b']},
    URL, console, parseNum: v => Number(v) || 0,
    RMS_BRANCH_TAX_RATE_SETTING: 'tax', RMS_BANK_COMMISSION_RATE_SETTING: 'bank',
    readRmsAppSetting: async (key, defaultValue) => key === 'tax' ? { 'branch-a': 10 } : rate === 'default' ? defaultValue : rate,
    monthFilter: 'all', branchFilter: 'all', branches: [{ id: 'branch-a', name: 'Fixture A' }, { id: 'branch-b', name: 'Fixture B' }],
    setRmsProfitabilityReport: value => { if (typeof value !== 'function') result = value },
    rmsIsWoltCommissionName: () => false,
    rmsSalaryPeriodTotal: p => p.salary_gross, positionGroup: s => s,
    pct: v => String(v), fmt: v => String(v),
    supabase: { from(table) {
      const query = { then(resolve) { return Promise.resolve({ data: failTable===table ? null : tables[table] || [], error: failTable===table ? {message:'source read failed'} : null }).then(resolve) } }
      for (const name of ['select', 'is', 'gte', 'lt', 'order', 'range', 'eq', 'like']) query[name] = (...args) => { if (name === 'select') selections.push([table, args[0]]); return query }
      return query
    } }
  })
  vm.runInContext(`${expenseHelpers}\n${rateHelper}\n${helpers}\n${loader}\nthis.load = loadRmsProfitabilityReport`, ctx)
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

const observedZero = (await run(marked(), {overrides:{salary_periods:[{id:'zero',employee_id:'manager',salary_month:'2040-03-01',salary_gross:0,salary_net:999}]}})).result
assert.equal(observedZero.rows.find(row=>row.id==='branch-a').salary,0,'zero accrued gross must not fall back to net payment balance')
const inactive = (await run(marked(), {overrides:{employees:[{id:'manager',is_active:false,position:'Менеджеры',monthly_salary:999999}]}})).result
assert.equal(inactive.rows.find(row=>row.id==='branch-a').managerSalary,150,'inactive employee and current salary cannot erase or replace historical accrual')
const missingPayroll=(await run(marked(), {overrides:{salary_periods:[]}})).result
assert.equal(missingPayroll.rows.find(row=>row.id==='branch-a').salary,0)
assert.ok(missingPayroll.summaryInputs.coverageIssues.some(issue=>issue.reason==='missing-payroll-accruals'))
for(const failTable of ['salary_periods','monthly_branch_service_charge_cost','employees','daily_expenses','supplier_purchases']) {
 const failed=(await run(marked(),{failTable})).result
 assert.equal(failed.error,'source read failed')
 assert.equal(failed.rows.length,0)
}
console.log('PASS report integration: zero gross versus net, inactive history, no salary estimate, required source errors')

const components = (await run(marked(), {makeRecords:async tables=>{
 const inputs={revenueRows:tables.daily_revenue_entries,dailyExpenseRows:tables.daily_expenses,supplierPurchases:tables.supplier_purchases}
 const fingerprint=await componentInputsFingerprint(inputs,'2040-03')
 return ['dsmf','partner_fee','food_market'].map(category=>{
  const pool=category==='food_market', amount=pool?197:25
  return {id:category,snapshot_type:COMPONENT_SNAPSHOT_TYPE,snapshot_scope:`profitability-components:2040-03:${category}`,snapshot_data:{kind:'component_adjustment',version:2,month:'2040-03',componentKey:category,status:'verified',approvalRef:'fixture',source:{fileId:'fixture',gid:0,cells:[category],readAt:'2040-04-01',recomputedAmount:amount,datedRows:[{date:'2040-03-01',amount,source_cell:category}]},target:{inputsFingerprint:fingerprint,representationIds:[],excludedIds:[],expectedRows:[]},category,action:pool?'add_missing_pool':'add_missing_branch',scope:pool?'network':'branch',branchId:pool?null:'branch-a',allocationBasis:pool?ALLOCATION_BASIS:undefined,amount}}
 })
}})).result
assert.equal(components.error,'')
const componentBranch=components.rows.find(row=>row.id==='branch-a')
assert.equal(componentBranch.supplierFoodCost,222,'ordinary gross allocation 75 plus reviewed net-bank allocation 147')
assert.equal(componentBranch.expenseCategories.find(row=>row.name==='DSMF').amount,25)
assert.equal(componentBranch.expenseCategories.find(row=>row.name==='Partner Fee').amount,25)
assert.equal(components.rows.reduce((sum,row)=>sum+row.supplierFoodCost,0),297,'all pool amounts conserved')
console.log('PASS future report components: DSMF, Partner Fee, source-declared pool basis, ordinary allocation unchanged')
