import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import {buildOperationalProfitability} from '../src/profitability-operational.mjs'
import {operationalMetrics} from '../src/profitability-metrics.mjs'
import {buildProfitabilitySummary} from '../src/profitability-summary.mjs'
import {createRequire} from 'node:module'
import {build} from 'esbuild'

// Execute the real source helpers and callbacks, not a duplicate normalization.
const common=fs.readFileSync('src/main.parts/part-00.jsxpart','utf8')
const reportSource=fs.readFileSync('src/main.parts/part-04.jsxpart','utf8')
const helpers=common.slice(common.indexOf('const normalizeExpenseText ='),common.indexOf('const RMS_LOGIN_GUARD_KEY'))
const callbacks=reportSource.slice(reportSource.indexOf('          expenseName:row=>'),reportSource.indexOf(',serviceCost:rmsServiceChargeStaffCostFromDailyRevenue'))
const ctx=vm.createContext({})
vm.runInContext(helpers+'\nglobalThis.options={'+callbacks+'};globalThis.label=financeExpenseDisplayName;globalThis.sourceName=financeExpenseNameFromRow;',ctx)
const expense=(id,name,amount,branch='a',date='2026-10-15')=>({id,branch_id:branch,expense_date:date,amount,expense_categories:{name},comment:date.startsWith('2026-10')?'DSMF за сентябрь':'DSMF за август'})
const input={branchRows:[{id:'a',name:'Synthetic A'},{id:'b',name:'Synthetic B'}],dailyExpenseRows:[expense('oct-a','DMSF',4711),expense('oct-b','DSMF',2636,'b'),expense('sep-a','DSMF',8162,'a','2026-09-15')],revenueRows:[],salaryPeriods:[],supplierPurchases:[],employeeRows:[]}
const before=structuredClone(input)
const options={...ctx.options,period:{from:'2026-10-01',toExclusive:'2026-11-01'},bankRate:2,serviceCost:()=>0}
const run=(data=input,opts=options)=>buildOperationalProfitability(data,opts)
const october=run(),metrics=operationalMetrics(october.model)
assert.equal(metrics.expenseRows.length,1)
assert.equal(metrics.expenseRows[0].name,'DSMF')
assert.equal(metrics.expenseRows[0].amount,7347)
assert.deepEqual(metrics.expenseRows[0].details.map(d=>[d.id,d.branch_id,d.amount,d.date]),[['oct-a','a',4711,'2026-10-15'],['oct-b','b',2636,'2026-10-15']])
for(const [id,amount] of [['a',4711],['b',2636]]) {
 const single=run(input,{...options,branchIds:[id]})
 assert.equal(single.model.total.expenses,amount)
 assert.equal(operationalMetrics(single.model).expenseRows[0].name,'DSMF')
}
const sameBranch=run({...input,dailyExpenseRows:input.dailyExpenseRows.map(row=>({...row,branch_id:'a'}))})
const sameCategory=sameBranch.model.branches[0].categories.filter(c=>c.name==='DSMF')
assert.equal(sameCategory.length,1);assert.equal(sameCategory[0].amount,7347);assert.equal(sameCategory[0].details.length,2)
const september=run(input,{...options,period:{from:'2026-09-01',toExclusive:'2026-10-01'}})
const previous=operationalMetrics(september.model).expenseRows
assert.equal(previous[0].name,metrics.expenseRows[0].name)
assert.equal(metrics.expenseRows[0].amount-previous[0].amount,-815,'Comparison is by record month, not accrual month')
// The real dashboard growth selector must not report the typo as a new expense.
const dashboard=fs.readFileSync('src/main.parts/part-03.jsxpart','utf8')
const growthCode=dashboard.slice(dashboard.indexOf('  const expenseRows = data.expenseRows || []'),dashboard.indexOf('  const expenseGrowthRows ='))
const growthCtx=vm.createContext({data:{expenseRows:metrics.expenseRows,previous:{expenseRows:previous}},parseNum:v=>Number(v)||0})
vm.runInContext(growthCode+';globalThis.growth=expenseGrowthCandidates;',growthCtx)
assert.equal(growthCtx.growth.length,0,'No false DSMF growth from alias split')
const range=run(input,{...options,period:{from:'2026-09-01',toExclusive:'2026-11-01'}})
assert.deepEqual(range.model.branches.map(b=>b.monthly.map(m=>m.categories['daily-DSMF']||0)),[[8162,4711],[0,2636]])
assert.equal(operationalMetrics(range.model).expenseRows[0].amount,15509)
assert.deepEqual(input,before,'Source rows, names, dates, comments and branch IDs remain untouched')
for(const spelling of ['DSMF','DMSF','dsmf',' dMsF ']) {
 const row=expense('spelling',spelling,7347)
 assert.equal(ctx.options.expenseName(row),'DSMF')
 assert.equal(ctx.sourceName(row),spelling,'Classification helper keeps original name')
 assert.equal(run({...input,dailyExpenseRows:[row]}).model.total.expenses,7347)
}
for(const name of ['Social insurance','Sosial','Социальные расходы','DSMF penalty','DMSF tax','Rent','Налоги','Vergi','Tax','']) {
 assert.equal(ctx.label(name),name,'Only exact aliases are canonicalized')
}
const neighbors=[expense('social','Social insurance',11),expense('penalty','DSMF penalty',12),expense('rent','Rent',13),expense('tax','Налоги',99),{...expense('water','Налоги',14),comment:'water'},expense('tax-dsmf','Tax DSMF',88)]
const mixed=run({...input,dailyExpenseRows:[...input.dailyExpenseRows,...neighbors]})
const unchanged=run({...input,dailyExpenseRows:[...input.dailyExpenseRows,...neighbors]},{...options,expenseName:ctx.sourceName})
assert.equal(mixed.model.total.expenses,unchanged.model.total.expenses)
assert.equal(operationalMetrics(mixed.model).taxPaid,operationalMetrics(unchanged.model).taxPaid)
assert.equal(operationalMetrics(mixed.model).taxCalculated,operationalMetrics(unchanged.model).taxCalculated)
const names=operationalMetrics(mixed.model).expenseRows.map(r=>r.name)
for(const name of ['Social insurance','DSMF penalty','Rent','Коммунальные'])assert.ok(names.includes(name))
assert.ok(!names.includes('Налоги')&&!names.includes('Tax DSMF'))
assert.equal(ctx.options.expenseName({...neighbors[3],reviewedCategory:'dsmf'}),'DSMF')
assert.equal(ctx.options.excludeExpense({...neighbors[3],reviewedCategory:'dsmf'}),false)

// Exercise the legacy detail grouping after its unchanged classification layer.
const detailCode=reportSource.slice(reportSource.indexOf('        const displayName = financeExpenseDisplayName(name)'),reportSource.indexOf('        expensesByBranch.set(id, current)'))
const detailCtx=vm.createContext({current:{categories:new Map()},financeExpenseDisplayName:ctx.label})
for(const row of input.dailyExpenseRows.slice(0,2)) {Object.assign(detailCtx,{row,name:ctx.sourceName(row),amount:row.amount});vm.runInContext('{'+detailCode+'}',detailCtx)}
assert.equal(detailCtx.current.categories.size,1)
const detail=detailCtx.current.categories.get('DSMF')
assert.equal(detail.amount,7347);assert.equal(detail.transactions,2)
assert.deepEqual(Array.from(detail.details,d=>[d.id,d.date,d.amount,d.description]),[['oct-a','2026-10-15',4711,'DMSF'],['oct-b','2026-10-15',2636,'DSMF']])

// Render the actual expanded report/print document using synthetic data only.
const require=createRequire(import.meta.url),React=require('react'),{renderToStaticMarkup}=require('react-dom/server')
const built=await build({entryPoints:['src/ProfitabilityReferenceReport.jsx'],bundle:true,platform:'node',format:'cjs',write:false,external:['react','react-dom/server'],plugins:[{name:'css-fixture',setup(b){b.onLoad({filter:/\.css(?:\?raw)?$/},()=>({contents:'export default ""',loader:'js'}))}}]})
const module={exports:{}};new Function('require','module','exports',built.outputFiles[0].text)(require,module,module.exports)
const model=buildProfitabilitySummary({operational:october})
for(const lang of ['ru','az']) {
 const html=renderToStaticMarkup(React.createElement(module.exports.ProfitabilityReferenceDocument,{model,lang,expanded:true,printing:true}))
 assert.doesNotMatch(html,/>DMSF</)
 assert.equal((html.match(/<th>DSMF<\/th>/g)||[]).length,3,'One DSMF row for network and each branch')
 assert.match(html.replace(/\s/g,''),/7\.?347,00/)
 assert.match(html,/2026-10/)
}
assert.deepEqual(input,before)
console.log('PASS DSMF exact aliases: 4711+2636=7347; branch/detail preservation; record-month comparison; immutable sources; neighboring articles/tax unchanged; expanded RU/AZ report and print')
