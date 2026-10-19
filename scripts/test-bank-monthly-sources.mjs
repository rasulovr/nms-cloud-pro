import assert from 'node:assert/strict'
import { BANK_BRANCH_IDS, buildBankReport, groupBankExpenses, reportMonths } from '../src/profitability-bank.mjs'
import { isBank2025Period, loadBank2025Snapshot } from '../src/bank-report-2025-source.mjs'
const period={from:'2025-10-01',toExclusive:'2026-10-01'}, months=reportMonths(period.from,period.toExclusive), id=BANK_BRANCH_IDS[0]
assert.equal(isBank2025Period(period),true)
let reads=0
const emptyClient={from:()=>{reads++;const q={select:()=>q,eq:()=>q,order:()=>q,limit:async()=>({data:[]})};return q}}
await loadBank2025Snapshot(emptyClient,period);assert.equal(reads,1)
const salarySource={version:2,complete:true,rows:months.filter(m=>m.startsWith('2025')).map(month=>({month,branchId:id,salary:120,household:15}))}
const report={period,bankInputs:{revenueRows:months.map(month=>({branch_id:id,revenue_date:month+'-01',cash_amount:1000})),salaryPeriods:months.map(month=>({branch_id:id,salary_month:month+'-01'}))},allRows:[{id,name:'Synthetic',revenue:12000,totalExpenses:1560,net:10440,expenseCategories:[{key:'salary',name:'Salary',amount:1200,details:months.map(m=>({date:m+'-01',amount:100}))},{key:'supplier-food-cost',name:'FoodCost',amount:240,details:months.map(m=>({date:m+'-01',amount:20}))},{key:'supplier-household',name:'Household',amount:120,details:months.map(m=>({date:m+'-01',amount:10}))}]}]}
const before=JSON.stringify(report),baseline=buildBankReport(report,[id])
report.bankInputs.sourceDataset=salarySource;report.bankInputs.sourceRequired2025=true
const model=buildBankReport(report,[id]);assert.equal(model.reconciled,true);assert.equal(model.coverageBlockers.length,0);assert.equal(model.combined.totals.expenses,1560+3*20)
for(const row of model.branches[0].monthly) {assert.equal(row.categories.salary,row.month.startsWith('2025')?120:100);assert.equal(row.categories['supplier-food-cost'],row.month.startsWith('2025')?15:20);assert.equal(groupBankExpenses(model.branches[0]).monthly.find(m=>m.month===row.month).categories.household,row.month.startsWith('2025')?15:10)}
const baseline2026=baseline.branches[0].monthly.filter(r=>r.month.startsWith('2026')).map(r=>r.categories.salary)
assert.equal(JSON.stringify(model.branches[0].monthly.filter(r=>r.month.startsWith('2026')).map(r=>r.categories.salary)),JSON.stringify(baseline2026),'2026 salary byte-exact')
assert.deepEqual(buildBankReport(report,[id]),model,'repeat builds never stack household classification')
const missing=structuredClone(report);missing.bankInputs.sourceDataset.rows.pop();assert.equal(buildBankReport(missing,[id]).exportable,false,'missing2025 source month blocks export')
const partial=structuredClone(report);partial.bankInputs.partialPayrollMonths=['2025-10','2026-01'];assert(buildBankReport(partial,[id]).coverageBlockers.some(s=>s.includes('2026-01')),'household proof cannot clear partial2026 payroll')
delete report.bankInputs.sourceDataset;delete report.bankInputs.sourceRequired2025;assert.equal(JSON.stringify(report),before,'underlying report inputs untouched')
console.log('Mixed Oct2025–Sep2026: month-scoped2025 sources, procurement conservation, duplicate prevention, coverage, byte-exact2026 salary PASS')

assert.deepEqual(model.branches[0].monthly.filter(r=>r.month.startsWith('2026')),baseline.branches[0].monthly.filter(r=>r.month.startsWith('2026')),'entire2026 monthly report byte-equivalent to baseline')
const untouched2026=structuredClone(report);untouched2026.bankInputs.sourceDataset={version:2,complete:true,rows:[{branchId:id,month:'2026-01',salary:999,household:999}]};assert.equal(buildBankReport(untouched2026,[id]).branches[0].monthly.find(r=>r.month==='2026-01').categories.salary,100,'2025 source can never override2026 payroll')
const foodMixed=structuredClone(report);foodMixed.bankInputs.sourceDataset=structuredClone(salarySource);foodMixed.bankInputs.sourceDataset.rows.forEach(r=>r.foodCost=12)
const foodMixedModel=buildBankReport(foodMixed,[id]);assert.deepEqual(foodMixedModel.branches[0].monthly.filter(r=>r.month.startsWith('2026')),baseline.branches[0].monthly.filter(r=>r.month.startsWith('2026')),'food2025 source never changes any2026 monthly value');assert.equal(foodMixedModel.combined.totals.expenses,1560+3*(20-3));assert(foodMixedModel.branches[0].monthly.filter(r=>r.month.startsWith('2025')).every(r=>r.categories['supplier-food-cost']===12));assert.equal(foodMixedModel.reconciled,true)
