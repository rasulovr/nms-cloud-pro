import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import {manualPeriod, periodMonths} from '../src/profitability-period.mjs'
import {reportMonths} from '../src/profitability-bank.mjs'
for(const [a,b] of [['','2025-01'],['2025-01',''],['2025-13','2026-01'],['2025-00','2025-03'],['2026-01','2025-12'],['2025-1','2025-12'],['foo','bar']]) assert.equal(manualPeriod(a,b),null)
for(const [a,b,length,to] of [['2025-01','2025-01',1,'2025-02-01'],['2025-12','2026-02',3,'2026-03-01'],['2024-02','2024-02',1,'2024-03-01'],['2025-01','2026-12',24,'2027-01-01']]) {
const p=manualPeriod(a,b);assert.equal(p.toExclusive,to);assert.equal(reportMonths(p.from,p.toExclusive).length,length);assert.deepEqual(periodMonths(p),{start:a,end:b})
}
assert.deepEqual(reportMonths('2025-13-01','2026-01-01'),[])
assert.deepEqual(reportMonths('2025-01-15','2025-02-01'),[])
const source=fs.readFileSync(new URL('../src/main.parts/part-04.jsxpart',import.meta.url),'utf8')
const view=source.slice(source.indexOf('const ReportsProfitabilityView'),source.indexOf('const supplierReportNormalizedSearch'))
assert.match(view,/ReportsProfitabilityAnalytics/)
assert.match(source,/Сравнение филиалов/)
assert.match(source,/Детальная рентабельность филиалов/)
assert.match(view,/ProfitabilityBankReport/)
assert.match(source,/const selectedPeriod = manualPeriod\(start, end\)/)
console.log('Manual month range PASS: inclusive bounds, leap/cross-year, >12 months, malformed/reversed/empty validation, interactive branch analytics retained separately from bank export.')

const loader = source.slice(source.indexOf('  async function loadRmsProfitabilityReport()'), source.indexOf('  async function loadRmsSuppliersReport()'))
const expenses = source.slice(source.indexOf('  async function loadRmsExpensesReport()'), source.indexOf('  async function loadRmsProfitabilityReport()'))
assert.doesNotMatch(expenses,/profitabilityPeriodKey|manualPeriod/,'profitability selection must not affect expense report')
const periodExpression = loader.slice(loader.indexOf('const period = ') + 'const period = '.length, loader.indexOf('const applyDateRange')).trim()
for (const key of ['range:2025-09:2026-09','range:2025-01:2025-12','range:2026-02:2026-02']) {
  const period = vm.runInNewContext(periodExpression,{profitabilityPeriodKey:key,manualPeriod})
  const [,start,end] = key.split(':'); const expected=manualPeriod(start,end)
  assert.equal(period.from, expected.from); assert.equal(period.toExclusive,expected.toExclusive)
  assert.ok(reportMonths(period.from,period.toExclusive).length)
}
assert.throws(()=>vm.runInNewContext(periodExpression,{profitabilityPeriodKey:'range:2026-09:2025-09',manualPeriod}),/Некорректный/)
console.log('Actual profitability loader period closure PASS: user 13-month reproduction; correct bounded range, expense loader independent.')

const {buildBankReport,BANK_BRANCH_IDS}=await import('../src/profitability-bank.mjs')
const {bankScopeTaxRate,partialHistoricalPayrollMonths}=await import('../src/profitability-persistent-sources.mjs')
function createLoaderHarness({source,initialKey='range:2025-09:2026-09',onState=()=>{}}={}) {
 source ||= fs.readFileSync(new URL('../src/main.parts/part-04.jsxpart',import.meta.url),'utf8')
 const loader=source.slice(source.indexOf('async function loadRmsProfitabilityReport()'),source.indexOf('async function loadRmsSuppliersReport()'))
 const months=Array.from({length:13},(_,i)=>{const d=new Date(Date.UTC(2025,8+i,1));return d.toISOString().slice(0,10)})
 const rows=BANK_BRANCH_IDS.flatMap(id=>months.map((date,i)=>({id:id+i,branch_id:id,revenue_date:date,cash_amount:100,bank_amount:50,wolt_amount:0})))
 const state={report:{},key:initialKey,queries:[],fail:false,gate:null}
 const context={rmsProfitabilityRequestRef:{current:0},setRmsProfitabilityReport:value=>{state.report=typeof value==='function'?value(state.report):value;onState(state.report)},branches:BANK_BRANCH_IDS.map((id,i)=>({id,name:'Synthetic '+i})),branchFilter:'all',monthFilter:'',manualPeriod,parseNum:v=>Number(v)||0,bankScopeTaxRate,partialHistoricalPayrollMonths,pct:String,fmt:String,RMS_BRANCH_TAX_RATE_SETTING:'test',readRmsAppSetting:async()=>({}),loadBank2025Snapshot:async()=>null,loadPurchaseReportClassifications:async()=>new Map(),isBank2025Period:()=>false}
 context.supabase={from(table){const query={table,filters:[]};state.queries.push(query);const chain={select(){return chain},is(){return chain},eq(){return chain},order(){return chain},gte(field,value){query.filters.push(['gte',field,value]);return chain},lt(field,value){query.filters.push(['lt',field,value]);return chain},async range(){const gate=state.gate;state.gate=null;if(gate)await gate;if(state.fail)return {data:null,error:new Error('Synthetic read failed')};let data=table==='daily_revenue_entries'?rows:[];data=data.filter(row=>query.filters.every(([op,field,value])=>op==='gte'?row[field]>=value:row[field]<value));return {data,error:null}}};return chain}}
 state.run=()=>{const scope={...context,profitabilityPeriodKey:state.key};return new Function(...Object.keys(scope),`return (${loader})()`)(...Object.values(scope))}
 state.load=key=>{state.key=key;return state.run()};state.setBranch=value=>{context.branchFilter=value};state.queryLog=state.queries;state.requestRef=context.rmsProfitabilityRequestRef;state.setFailure=value=>{state.fail=value}
 return state
}
async function testFullLoader(){
 const h=createLoaderHarness();await h.run();assert.equal(h.report.error,'');assert.equal(h.report.loading,false);assert.equal(h.report.periodKey,h.key);assert.equal(h.report.period.from,'2025-09-01');assert.equal(h.report.period.toExclusive,'2026-10-01');assert.equal(h.report.rows.length,2)
 const model=buildBankReport(h.report,BANK_BRANCH_IDS);assert.equal(model.months.length,13);assert.equal(model.branches.length,2);assert.equal(model.combined.totals.revenue,3900)
 const fields={daily_revenue_entries:'revenue_date',daily_expenses:'expense_date',supplier_purchases:'purchase_date',salary_periods:'salary_month',monthly_branch_service_charge_cost:'month'}
 for(const [table,field]of Object.entries(fields)){const q=h.queries.find(q=>q.table===table);assert.ok(q,table);assert.deepEqual(q.filters,[['gte',field,'2025-09-01'],['lt',field,'2026-10-01']])}
 h.setBranch(BANK_BRANCH_IDS[0]);await h.run();assert.equal(h.report.rows.length,1);assert.equal(h.report.rows[0].id,BANK_BRANCH_IDS[0]);assert.equal(h.report.totals.revenue,1950);assert.equal(h.report.allRows.length,2);h.setBranch('all');await h.run();assert.equal(h.report.rows.length,2);assert.equal(h.report.totals.revenue,3900)
 h.fail=true;await h.run();assert.equal(h.report.loading,false);assert.equal(h.report.periodKey,h.key);assert.equal(h.report.error,'Synthetic read failed')
 h.fail=false;await h.run();assert.equal(h.report.error,'');assert.equal(buildBankReport(h.report,BANK_BRANCH_IDS).months.length,13)
 let release;h.gate=new Promise(resolve=>release=resolve);const stale=h.run();h.key='range:2026-09:2026-09';await h.run();const newest=h.report;assert.equal(newest.periodKey,h.key);release();await stale;assert.equal(h.report,newest);assert.equal(buildBankReport(h.report,BANK_BRANCH_IDS).months.length,1)
 h.key='range:2026-10:2026-09';await h.run();assert.match(h.report.error,/Некорректный/);assert.equal(h.report.periodKey,h.key)
 console.log('PASS actual full async profitability loader: 13-month model, all branches with blank global filter, all date bounds, error key, retry, stale guard, reversed range')
}

await testFullLoader()

// Optional mounted React regression checks without a browser/financial backend.
// Run with REACT_TEST_MODULE=/path/to/react-test-renderer (React 18.3.1).
if (process.env.REACT_TEST_MODULE) {
  const {build} = await import('esbuild')
  const path = await import('node:path')
  const {createRequire} = await import('node:module')
  const require = createRequire(import.meta.url)
  const React = require('react')
  const TestRenderer = require(process.env.REACT_TEST_MODULE)
  const out = path.resolve('.test-results/period-mounted.cjs')
  await build({entryPoints:['src/ProfitabilityBankReport.jsx'],outfile:out,bundle:true,platform:'node',format:'cjs',external:['react','react-dom/server'],plugins:[{name:'css',setup(b){b.onLoad({filter:/\.css(?:\?raw)?$/},()=>({contents:'',loader:'text'}))}}]})
  const Component = require(out).default
  const {BANK_BRANCH_IDS,buildBankReport} = await import('../src/profitability-bank.mjs')
  let setReport, setKey, calls=0, fail=false
  const data = key => {
    const period=vm.runInNewContext(periodExpression,{profitabilityPeriodKey:key,manualPeriod})
    const rows=BANK_BRANCH_IDS.map((id,index)=>({id,name:index?'BC5':'BC4',revenue:0,totalExpenses:0,net:0,expenseCategories:[]}))
    return {period,periodKey:key,allRows:rows,bankInputs:{revenueRows:[],salaryPeriods:[]},loading:false,error:''}
  }
  function Harness() {
    const [key,updateKey]=React.useState('range:2025-01:2025-12')
    const [report,updateReport]=React.useState({loading:true})
    const harness=React.useRef(null)
    if (!harness.current) harness.current=createLoaderHarness({source,initialKey:key,onState:updateReport})
    React.useEffect(()=>{harness.current.run()},[])
    setReport=updateReport;setKey=updateKey
    const load = async next => {
      calls++;updateKey(next);harness.current.key=next;harness.current.fail=fail
      await harness.current.run()
    }
    return React.createElement(Component,{report,periodKey:key,availableYears:[2024,2025,2026],branches:BANK_BRANCH_IDS.map((id,i)=>({id,name:i?'BC5':'BC4'})),onPeriodChange:load})
  }
  let tree
  await TestRenderer.act(async()=>{tree=TestRenderer.create(React.createElement(Harness))})
  const select=(label,value)=>TestRenderer.act(()=>tree.root.findByProps({'aria-label':label}).props.onChange({target:{value}}))
  const apply=()=>tree.root.findAllByType('button').find(x=>x.children.includes('Применить период'))
  const text=()=>JSON.stringify(tree.toJSON())
  select('Начало: год','2025');select('Начало: месяц','09');select('Конец: год','2026');select('Конец: месяц','09')
  assert.equal(calls,0,'draft changes must not load')
  await TestRenderer.act(async()=>{apply().props.onClick()})
  assert.match(text(),/2025-09-01/);assert.match(text(),/2026-09-30/)
  assert.equal(buildBankReport(data('range:2025-09:2026-09'),BANK_BRANCH_IDS).months.length,13)
  assert.equal(tree.root.findAll(x=>x.type==='section'&&x.props.className==='bank-report-section').length,3)
  const expanded=()=>tree.root.findByProps({'aria-label':'Расширенный отчёт'})
  assert.equal(expanded().props.checked,false,'expanded report defaults off')
  assert.equal(tree.root.findAllByProps({className:'bank-expense-table'}).length,0)
  await TestRenderer.act(async()=>expanded().props.onChange({target:{checked:true}}))
  assert.equal(tree.root.findAllByProps({className:'bank-expense-table'}).length,3)
  await TestRenderer.act(async()=>expanded().props.onChange({target:{checked:false}}))
  assert.equal(tree.root.findAllByProps({className:'bank-expense-table'}).length,0)
  const boxes=()=>tree.root.findAll(x=>x.type==='input'&&x.props.type==='checkbox'&&x.props['aria-label']!=='Расширенный отчёт')
  await TestRenderer.act(async()=>boxes()[1].props.onChange({target:{checked:false}}))
  await TestRenderer.act(async()=>{apply().props.onClick()})
  assert.equal(calls,2,'same period must retry');assert.equal(boxes()[1].props.checked,false)
  select('Конец: год','2025');select('Конец: месяц','08');assert.equal(apply().props.disabled,true)
  select('Конец: месяц','09');fail=true
  await TestRenderer.act(async()=>{apply().props.onClick()})
  assert.match(text(),/Synthetic read failed/);assert.doesNotMatch(text(),/Загружаю расчёт/)
  assert.equal(apply().props.disabled,false,'failed request must allow retry')
  fail=false;await TestRenderer.act(async()=>{apply().props.onClick()});assert.match(text(),/2025-09-30/)
  await TestRenderer.act(async()=>{setKey('range:2026-01:2026-01')});assert.match(text(),/Загружаю расчёт/)
  assert.equal(tree.root.findByProps({id:'profitability-bank-export'}).props.disabled,true)
  await TestRenderer.act(async()=>{setReport({loading:false,error:'Legacy missing-key error'})});assert.match(text(),/Legacy missing-key error/)
  await TestRenderer.act(async()=>tree.unmount())
  console.log('Mounted React PASS: 13-month Apply renders report, explicit year/month choices, selection retention, reversed range, same-period retry, failure visibility, stale export guard.')
}
