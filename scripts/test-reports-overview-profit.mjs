import assert from 'node:assert/strict'
import fs from 'node:fs'
import {readOverviewProfit,overviewProfitView} from '../src/reports-overview-profit.mjs'
import {buildOperationalProfitability} from '../src/profitability-operational.mjs'
const branches=[{id:'a',name:'A',service_charge_enabled:true},{id:'b',name:'B'}]
const input={branchRows:branches,employeeRows:[],revenueRows:[{id:'r',branch_id:'a',revenue_date:'2026-10-01',cash_amount:100,bank_amount:100,wolt_amount:0}],dailyExpenseRows:[{id:'d',branch_id:'a',expense_date:'2026-10-01',amount:10}],supplierPurchases:[],salaryPeriods:[{employee_id:'p',branch_id:'a',salary_month:'2026-10-01',salary_gross:0,salary_net:99}]}
const operational=buildOperationalProfitability(input,{period:{from:'2026-10-01',toExclusive:'2026-11-01'},bankRate:2,expenseName:()=> 'DSMF',excludeExpense:()=>false,serviceCost:()=>5,taxSettings:{}})
const report={operational,summaryInputs:{period:{from:'2026-10-01',toExclusive:'2026-11-01'},coverageIssues:[],revenueRows:input.revenueRows}}
const view=overviewProfitView(report)
assert.equal(view.profit.net,162) // 198 - (10 DSMF + 10 service for two branches + 16 tax)
assert.equal(view.profit.revenue,198)
assert.equal(view.branches.reduce((s,b)=>s+b.result,0),162)
assert.equal(view.expenseRows.reduce((s,r)=>s+r.amount,0),36)
for(const bad of [null,{loading:true},{error:'fail'}]){const v=overviewProfitView(bad);assert.equal(v.profit.net,null);assert.deepEqual(v.branches,[]);assert.deepEqual(v.revenueRows,[])}
let received
const read=async (b,s)=>{received=s;return report}
await readOverviewProfit(null,read,branches,'2026-10','a');assert.deepEqual(received,{from:'2026-10-01',to:'2026-10-31',branchIds:['a']})
await readOverviewProfit(null,read,branches,'year:2026','all');assert.deepEqual(received,{from:'2026-01-01',to:'2026-12-31',branchIds:undefined})
const client={from(table){let field,asc;return{select(f){field=f;return this},is(){return this},order(f,o){asc=o.ascending;return this},limit(){return Promise.resolve({data:[{[field]:table==='daily_expenses'?'2024-01-01':asc?'2025-02-01':'2026-11-12'}]})}}}}
await readOverviewProfit(client,read,branches,'all','all');assert.equal(received.from,'2024-01-01');assert.equal(received.to,'2026-11-30')
const empty={from(){return {select(){return this},is(){return this},order(){return this},limit(){return Promise.resolve({data:[]})}}}}
assert.ok((await readOverviewProfit(empty,read,branches,'all','all')).error)
const p4=fs.readFileSync('src/main.parts/part-04.jsxpart','utf8'),p5=fs.readFileSync('src/main.parts/part-05.jsxpart','utf8')
assert.match(p4,/overviewSnapshot\?\.key === overviewKey/)
assert.match(p4,/if \(active\) setOverviewSnapshot/)
assert.match(p4,/return \(\) => \{ active = false; setOverviewSnapshot\(null\) \}/)
assert.doesNotMatch(p5,/const overviewResult = overviewRevenueTotal - overviewExpenseTotal/)
assert.match(p5,/setOverviewRevision\(value => value \+ 1\)/)
assert.match(p5,/ProfitabilitySourceNotice profit=\{overviewProfit\}/)
assert.match(p5,/formatVerifiedProfit\(overviewResult, fmt\)/)
console.log('PASS Reports Overview canonical cards/branch totals/categories, bank/service/DSMF/gross-zero salary, month/year/all and branch filters, empty/error/loading, synchronous invalidation and refresh wiring')
const {createRequire}=await import('node:module'),require=createRequire(import.meta.url),React=require('react'),{renderToStaticMarkup}=require('react-dom/server'),{transformSync}=require('esbuild'),vm=await import('node:vm')
const {formatVerifiedProfit}=await import('../src/profitability-surface.mjs')
const jsx=p5.slice(p5.indexOf('  const overviewModel'),p5.indexOf('  const SalesReportView'))
for(const snapshot of [report,null,{error:'read failure'}]) {
 const context=vm.createContext({React,currentOverviewSnapshot:snapshot,overviewProfitView,formatVerifiedProfit,useMemo:fn=>fn(),parseNum:v=>Number(v)||0,fmt:v=>Number(v||0).toFixed(2),pct:v=>Number(v||0).toFixed(1)+'%',rmsIsWoltCommissionName:n=>/wolt/i.test(n),overviewTrendMode:'revenue',monthFilter:'2026-10',selectedMonthLabel:'October2026',setOverviewTrendMode:()=>{},ProfitabilitySourceNotice:()=>React.createElement('div',{},'Source notice')})
 vm.runInContext(transformSync(jsx+';globalThis.output=ReportsOverview',{loader:'jsx'}).code,context)
 const html=renderToStaticMarkup(context.output)
 if(snapshot===report){assert.match(html,/162.00/);assert.match(html,/198.00/);assert.match(html,/DSMF/);assert.doesNotMatch(html,/64296.27/)}else assert.match(html,/Расчёт недоступен/)
}
console.log('PASS actual Overview JSX rendering: canonical net, expense categories, loading/error unavailable rather than zero/old legacy profit')
// Execute the production selection effect: stale deferred reads must not commit.
let saved=null,revision=0,cleanup,dependencies,requests=[]
const hook=p4.slice(p4.indexOf('  const [overviewSnapshot'),p4.indexOf('  const [profitabilitySelection'))
let stateIndex=0
const race=vm.createContext({JSON,branches,monthFilter:'2026-10',branchFilter:'all',effectiveReportsTab:'overview',reportBranchesLoaded:true,supabase:{},readRmsProfitabilitySnapshot:()=>{},readOverviewProfit:()=>new Promise(resolve=>requests.push(resolve)),
 useState:()=>stateIndex++===0?[saved,v=>saved=v]:[revision,v=>revision=typeof v==='function'?v(revision):v],
 useEffect:(fn,deps)=>{const key=JSON.stringify(deps);if(key!==dependencies){cleanup?.();cleanup=fn();dependencies=key}}
})
vm.runInContext('globalThis.render=()=>{'+hook+';return currentOverviewSnapshot}',race)
const render=()=>{stateIndex=0;return race.render()}
assert.equal(render(),null);race.monthFilter='2026-11';assert.equal(render(),null)
requests[0](report);await new Promise(r=>setImmediate(r));assert.equal(saved,null)
requests[1](report);await new Promise(r=>setImmediate(r));assert.equal(render(),report)
race.branchFilter='a';assert.equal(render(),null)
requests[2](report);await new Promise(r=>setImmediate(r));assert.equal(render(),report)
revision++;assert.equal(render(),null);cleanup()
requests[3](report);await new Promise(r=>setImmediate(r));assert.notEqual(saved?.key,JSON.stringify(['2026-11','a',revision,branches]))
console.log('PASS actual Overview deferred effect: month/branch/refresh invalidation, stale-response and unmount rejection')
// Reopening must issue a fresh read, and an error must be retryable.
race.effectiveReportsTab='sales';render()
const beforeReopen=requests.length
race.effectiveReportsTab='overview';assert.equal(render(),null)
assert.equal(requests.length,beforeReopen+1)
requests.at(-1)({error:'source unavailable'});await new Promise(r=>setImmediate(r))
assert.equal(render().error,'source unavailable')
revision++;assert.equal(render(),null)
requests.at(-1)(report);await new Promise(r=>setImmediate(r));assert.equal(render(),report)
cleanup()
console.log('PASS Overview reopen fresh read, error visibility and explicit retry recovery')
