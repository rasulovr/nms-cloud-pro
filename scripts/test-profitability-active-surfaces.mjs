import {actualProfitabilityView,isClosedProfitabilityMonth,formatProfitabilityComparison} from '../src/profitability-metrics.mjs'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import {createRequire} from 'node:module'
import {transformSync} from 'esbuild'
import {profitabilitySurface,profitabilityTrend,formatVerifiedProfit,profitStatusText,profitReasonText,profitBasisText,profitDisclosureText} from '../src/profitability-surface.mjs'
const require=createRequire(import.meta.url),React=require('react'),{renderToStaticMarkup}=require('react-dom/server')
const part=fs.readFileSync('src/main.parts/part-03.jsxpart','utf8')
const legacy={net:50014.3208,revenue:295837.3476,expenses:245823.0268,totalExpenses:245823.0268,branchRows:[{id:'A',name:'Synthetic A',net:50014.3208,revenue:295837.3476,totalExpenses:245823.0268}],previous:{net:100,revenue:100,expenses:50,branchRows:[]},expenseRows:[]}
const report={rows:[{id:'A',name:'Synthetic A',revenue:100,totalExpenses:40,net:60,taxRate:0,expenseCategories:[{key:'salary',name:'Salary',amount:40,details:[{date:'2026-10-01',amount:40}]}]}],summaryInputs:{period:{from:'2026-10-01',toExclusive:'2026-11-01'},monthlyAllocationIsolated:true,revenueRows:[{id:'r',branch_id:'A',revenue_date:'2026-10-01',cash_amount:100,bank_amount:0,wolt_amount:0}],coverageIssues:[{month:'2026-10',reason:'missing-coverage-manifest',severity:'blocking_runtime_basis'}]}}
const provisional=profitabilitySurface({...report,provisional:{available:true,sourceComplete:true,allocationComplete:true,net:60,revenue:100,expenses:40,basis:'before-unverified-bank-commission',branches:[{id:'A',available:true,net:60,revenue:100,expenses:40,basis:'before-unverified-bank-commission'}]}})
const blocked=profitabilitySurface(report),valid=profitabilitySurface({...report,summaryInputs:{...report.summaryInputs,coverageIssues:[]}})
assert.equal(blocked.net,null);assert.equal(valid.net,60)
assert.equal(profitabilityTrend(valid,blocked).percent,null)
for(const n of [null,undefined,NaN,Infinity,'50014'])assert.equal(formatVerifiedProfit(n,String),'Расчёт недоступен')
assert.equal(formatVerifiedProfit(0,String),'0')
function render(name,profit,branch='__all__',selectedMonth=10) {
 let start=part.indexOf(`function ${name}(`),end=part.indexOf('\nfunction ',start+10)
 let code=part.slice(start,end<0?undefined:end)
 if(name==='Finance')code=code.replace('\n  return (','\n  globalThis.qaExports={exportFinanceMonthlyCsv,printFinanceMonthlyReport};\n  return (')
 let state=0,csv,printed
 const props={t:x=>x,lang:'ru'}
 const ctx=vm.createContext({defaultYears:()=>[2026],MONTHS:Array(12).fill("Synthetic"),React,console,Date,Math,Number,String,Map,Set,JSON,Intl,
  useState:initial=>{const index=state++;return [index===0?branch:index===1?2026:index===2?selectedMonth:initial===null?legacy:initial,()=>{}]},
  useEffect:()=>{},useMemo:f=>f(),useRef:initial=>({current:initial===''?`2026/${selectedMonth}/${branch}`:initial}),
  useBranches:()=>({branches:[{id:'A',name:'Synthetic A'}],loaded:true}),
  useVerifiedProfitability:()=>({...profit,trend:profitabilityTrend(profit,blocked)}),
  isBazarExpenseName:()=>false,actualProfitabilityView,isClosedProfitabilityMonth,formatProfitabilityComparison,formatVerifiedProfit,profitStatusText,profitReasonText,profitBasisText,profitDisclosureText,parseNum:v=>Number(v)||0,fmt:v=>(Number(v)||0).toFixed(2),pct:v=>(Number(v)||0).toFixed(2)+'%',
  monthStart:(y,m)=>`${y}-${String(m).padStart(2,'0')}-01`,todayISO:()=> '2026-11-05',normalizeExpenseText:v=>String(v||'').toLowerCase(),rmsFinanceExpenseGroupName:()=>'',rmsNextMonthStart:()=> '2026-11-01',
  I18N:{ru:{months:Array(12).fill('Synthetic')}},
  ProfitabilitySourceNotice:({profit})=>React.createElement('p',{},profit.available?'Verified':profit.reasons.join(', ')),
  DashboardStyles:()=>null,DailyRevenueLineChart:()=>null,MiniBarChart:({rows,valueKey})=>React.createElement('div',{'data-chart':valueKey},rows.map(r=>r[valueKey]).join(',')),
  DateInput:()=>null,
  window:{open:()=>({document:{write:html=>printed=html,close:()=>{}}})},
  document:{body:{appendChild:()=>{},removeChild:()=>{}},createElement:()=>({remove:()=>{},click:()=>{},set href(v){},set download(v){}})},URL:{createObjectURL:()=>'',revokeObjectURL:()=>{}},Blob:class {constructor(v){csv=v.join('')}},
 })
 const notice=part.slice(part.indexOf('function ProfitabilitySourceNotice('),part.indexOf('\nfunction Dashboard('))
 vm.runInContext(transformSync(notice+'\n'+code+`\nglobalThis.Component=${name}`,{loader:'jsx'}).code,ctx)
 const html=renderToStaticMarkup(React.createElement(ctx.Component,props))
 if(name==='Finance'&&ctx.qaExports){ctx.qaExports.exportFinanceMonthlyCsv();ctx.qaExports.printFinanceMonthlyReport()}
 if(name==='Finance'&&!profit.available)assert.equal(ctx.qaExports,undefined,'No exports while actual sources are unavailable')
 return {html,csv,printed}
}
for(const name of ['Dashboard','Finance'])for(const branch of ['__all__','A'])for(const profit of [blocked,profitabilitySurface(null),profitabilitySurface({error:'read failed'}),{...valid,mode:'october-dashboard',verified:false,preliminary:false,basis:'october-dashboard'},provisional,{...provisional,net:0,margin:0},valid]) {
 const out=render(name,profit,branch)
 for(const [kind,text] of Object.entries(out).filter(([,v])=>v!==undefined)){
  assert.doesNotMatch(text,/50014[.,]32/,`${name}/${branch}/${kind}: legacy result escaped`)
  if(!profit.available)assert.match(text,/Расчёт недоступен/,`${name}/${kind}: unverified prior month trend must not become zero`)
  if(!profit.available)assert.doesNotMatch(text,/data-chart="net"/,`${name}: blocked profit chart`)
 }
 if(profit.available)assert.match(out.html,profit.net===0?/0\.00/:/60\.00/)
 if(profit.preliminary)for(const text of Object.values(out).filter(v=>v!==undefined)){assert.match(text,/Предварительный результат до комиссии/);assert.match(text,/не вычтена/);assert.doesNotMatch(text,/missing-coverage-manifest/)}
}
assert.ok(!part.includes('const financeNet = parseNum(stats.revenue) - financeTotalExpenses'),'No arithmetic resurrection')
console.log('PASS actual Dashboard/Finance JSX: cards, margin, trend, branch/chart, CSV, print; blocked/loading/errors/valid zero-safe canonical result; legacy 50014.3208 cannot escape')

// Execute the real hook with deferred source reads, including a late result from
// the previous selection. No mounted old profit may survive the new selection.
const hookCode=part.slice(part.indexOf('function useVerifiedProfitability('),part.indexOf('function ProfitabilitySourceNotice('))
let hookState=null,cleanup,lastDeps,requests=[]
const hookCtx=vm.createContext({Date,JSON,Number,String,Promise,profitabilitySurface,profitabilityTrend,
 monthStart:(y,m)=>`${y}-${String(m).padStart(2,'0')}-01`,
 useState:()=>[hookState,v=>{hookState=v}],
 useEffect:(effect,deps)=>{const key=JSON.stringify(deps);if(lastDeps!==key){cleanup?.();cleanup=effect();lastDeps=key}},
 readRmsProfitabilitySnapshot:(_branches,selection)=>new Promise(resolve=>requests.push({selection,resolve}))
})
vm.runInContext(hookCode+'\nglobalThis.hook=useVerifiedProfitability',hookCtx)
const call=(month,branch='__all__')=>hookCtx.hook(2026,month,branch,[{id:'A'}],true)
assert.equal(call(9).net,null)
assert.equal(call(10).net,null)
requests[0].resolve({...report,summaryInputs:{...report.summaryInputs,coverageIssues:[]}});requests[1].resolve(report)
await new Promise(r=>setImmediate(r));assert.equal(hookState,null,'late previous selection cannot commit')
requests[2].resolve({...report,summaryInputs:{...report.summaryInputs,coverageIssues:[]}});requests[3].resolve(report)
await new Promise(r=>setImmediate(r));assert.equal(call(10).net,60)
assert.equal(call(11).net,null,'month switch hides old result synchronously')
assert.equal(call(11,'A').net,null,'branch switch hides old result synchronously')
cleanup?.()
console.log('PASS real shared hook: selection invalidation, deferred source reads, stale request rejection, current-only result, branch/month switching')

const imports=fs.readFileSync("src/main.parts/part-00.jsxpart","utf8").split("\n").filter(line=>line.includes("from './profitability-surface.mjs'" )).join("\n")
for(const name of ["profitBasisText","profitDisclosureText","profitStatusText","profitReasonText"])assert.ok(imports.includes(name),`Production must import ${name}`)

const unified={...valid,mode:'october-dashboard',verified:false,preliminary:false,basis:'october-dashboard',salary:10,serviceCost:0,tax:0,grossTurnover:100,foodCostAmount:50,expenseRows:[{name:'Зарплаты',amount:10},{name:'Поставщики / Food Cost',amount:50},{name:'Корректировка',amount:-20}],disclosedExpenseRows:[{name:'Закрытый период',amount:7}]}
legacy.forecastProfit=11985.34
for(const name of ['Dashboard','Finance']){
 const out=render(name,unified)
 assert.match(out.html,/40.00%/,'expense percentage must use operational40/100')
 assert.doesNotMatch(out.html,/83.09%/,'legacy percentage cannot leak')
 assert.doesNotMatch(out.html,/11985.34|Прогноз прибыли/,'closed month must not display forecast')
 for(const text of Object.values(out).filter(v=>v!==undefined))assert.match(text,/-20.00/,'negative adjustment preserved in every surface')
 if(name==='Finance')for(const text of [out.csv,out.printed]){assert.match(text,/50.00/);assert.match(text,/10.00/);assert.match(text,/7.00/);assert.doesNotMatch(text,/11985.34|Прогноз прибыли/)}
}
console.log('PASS actual UI/export consistency: unified articles50+10-20=40, expense ratio40%, disclosed cost7 separate, closed-month forecast absent')

legacy.selectionKey='2026/11/__all__';legacy.forecastProfit=200
for(const name of ['Dashboard','Finance']){const out=render(name,unified,'__all__',11);assert.match(out.html,/Прогноз прибыли/);assert.match(out.html,/200.00/)}
console.log('PASS current-month forecast preserved while closed-month forecast is suppressed')
