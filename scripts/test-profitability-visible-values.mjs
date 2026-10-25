import assert from 'node:assert/strict'
import {buildProfitabilitySummary} from '../src/profitability-summary.mjs'
import {presentProfitabilitySection} from '../src/profitability-presentation.mjs'
import {createRequire} from 'node:module'
import {build} from 'esbuild'
const require=createRequire(import.meta.url),React=require('react'),{renderToStaticMarkup}=require('react-dom/server')
const branch=id=>({id,name:id,revenue:300,totalExpenses:180,net:120,taxRate:0,expenseCategories:[{key:'salary',name:'Salary',amount:180,details:[{id:id+'-1',date:'2026-09-01',amount:60},{id:id+'-2',date:'2026-10-01',amount:120}]}]})
const report={rows:[branch('A'),branch('B')],summaryInputs:{period:{from:'2026-09-01',toExclusive:'2026-11-01'},mixedBasis:true,monthlyAllocationIsolated:true,revenueRows:['A','B'].flatMap(branch_id=>[{id:branch_id+'s',branch_id,revenue_date:'2026-09-01',cash_amount:100,bank_amount:0,wolt_amount:0},{id:branch_id+'o',branch_id,revenue_date:'2026-10-01',cash_amount:200,bank_amount:0,wolt_amount:0}]),coverageIssues:[{month:'2026-10',branchId:'A',severity:'blocking_runtime_basis',reason:'stale-or-invalid-bank-evidence'}]}}
const model=buildProfitabilitySummary(report),frozen=JSON.stringify(model)
assert.equal(model.total.profitAvailable,false);assert.equal(model.total.net,null)
const combined={period:model.total,monthly:model.monthly,reconciled:model.reconciled}
const display=presentProfitabilitySection(combined)
assert.equal(display.period.net,240);assert.equal(display.period.expenses,360);assert.equal(display.period.displayPreliminary,true)
assert.equal(display.period.profitAvailable,false,'Verification guard must remain false')
assert.equal(display.monthly[1].displayProfitAvailable,true)
assert.equal(display.monthly[0].displayPreliminary,false)
assert.equal(model.branches[0].monthly[1].net,null,'Canonical hidden net must remain null')
assert.equal(JSON.stringify(model),frozen)
for(const value of [null,undefined,NaN,Infinity,'12']){
 const bad=presentProfitabilitySection({reconciled:true,period:{revenue:100,expenses:value},monthly:[{month:'2026-10',revenue:100,expenses:value,revenueRecords:1}]})
 assert.equal(bad.period.net,null);assert.equal(bad.period.displayExpensesAvailable,false);assert.equal(bad.monthly[0].net,null)
}
const empty=presentProfitabilitySection({reconciled:true,period:{revenue:0,expenses:50},monthly:[{month:'2026-10',revenue:0,expenses:50,revenueRecords:0,categories:{salary:50}}]})
assert.equal(empty.period.displayRevenueAvailable,false);assert.equal(empty.period.net,null);assert.equal(empty.period.displayExpensesAvailable,true)
const noCosts=presentProfitabilitySection({reconciled:true,period:{revenue:100,expenses:0},monthly:[{month:'2026-09',revenue:100,expenses:0,revenueRecords:1,categories:{}}]});assert.equal(noCosts.period.net,null);assert.equal(noCosts.period.displayExpensesAvailable,false)
const closed=presentProfitabilitySection({reconciled:true,period:{revenue:0,expenses:0,operatingExcluded:true},monthly:[{month:'2026-09',revenue:0,expenses:50,revenueRecords:0,operatingExcluded:true,categories:{salary:50}}]})
assert.equal(closed.period.net,null);assert.equal(closed.monthly[0].displayExpensesAvailable,false)
const built=await build({entryPoints:['src/ProfitabilityReferenceReport.jsx'],bundle:true,platform:'node',format:'cjs',write:false,external:['react','react-dom/server'],plugins:[{name:'css-fixture',setup(b){b.onLoad({filter:/\.css(?:\?raw)?$/},()=>({contents:'export default ""',loader:'js'}))}}]})
const module={exports:{}};new Function('require','module','exports',built.outputFiles[0].text)(require,module,module.exports)
for(const lang of ['ru','az']){
 const html=renderToStaticMarkup(React.createElement(module.exports.ProfitabilityReferenceDocument,{model,periodLabel:'September–October',lang,expanded:true}))
 assert.match(html,/360[,.]00 AZN/);assert.match(html,/240[,.]00 AZN/);assert.match(html,/40[,.]00%/)
 assert.doesNotMatch(html,/>—<|>NaN<|Infinity|скрыты до сверки|göstərilmir/)
 assert.match(html,lang==='ru'?/Нужно уточнить/:/Dəqiqləşdirilməlidir/)
 assert.match(html,/stroke-dasharray="4 3"/)
 assert.ok(html.indexOf('reference-table-scroll')<html.indexOf('reference-preliminary-note'))
 assert.equal((html.match(/<caption>(Статьи расходов|Xərc maddələri)/g)||[]).length,3,'Network and branch expense details')
}
assert.equal(JSON.stringify(model),frozen)
console.log('PASS visible values: stale bank evidence, mixed months, network, branches, unchanged guards/model, missing revenue, closed periods, finite/null checks, RU/AZ, graphs and shared PDF renderer')
