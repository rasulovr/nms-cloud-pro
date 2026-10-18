import fs from 'node:fs'
import vm from 'node:vm'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { performance } from 'node:perf_hooks'

const path = 'src/main.parts/part-03.jsxpart'
const candidate = fs.readFileSync(path, 'utf8')
const baseline = execFileSync('git', ['show', '240ecbc:' + path], { encoding: 'utf8' })
const delay = ms => new Promise(resolve => setTimeout(resolve, ms))

// Run the actual Dashboard loading functions without JSX, with deterministic
// read-only network fixtures. No production credentials or writes are involved.
function harness(source, { lag = 20, previousFails = false, currentFails = false, forecastFails = false, chartFails = false } = {}) {
  let component = source.slice(source.indexOf('function Dashboard({ t })'))
  component = component.slice(0, component.indexOf('  if (!data) return'))
  component += 'return {load, calcMonth, loadRequestRef}; }\nDashboard({t: x => x})'
  const writes = [], calls = []
  let stateIndex = 0
  const context = {
    console: {error(){}}, Date, Map, Set, Promise,
    useBranches: () => [{id:"b1",name:"Fixture Branch",service_charge_enabled:false}], useRef: () => ({current:0}), useEffect(){},
    useState(initial) { const index=stateIndex++; return [initial, value => writes.push({index,value})] },
    monthStart: (y,m) => `${y}-${String(m).padStart(2,'0')}-01`,
    rmsNextMonthStart: key => { const d=new Date(key+'-01'); d.setMonth(d.getMonth()+1); return d.toISOString().slice(0,10) },
    prevMonth: (y,m) => m===1 ? {year:y-1,month:12} : {year:y,month:m-1},
    parseNum: value => Number(value)||0, fmt: String,
    localStorage:{getItem:()=>null},
    RMS_BRANCH_TAX_RATE_SETTING:'tax', RMS_BANK_COMMISSION_RATE_SETTING:'bank', RMS_DEFAULT_BANK_COMMISSION_RATE:1,
    rmsBankCommissionRate: x=>x, rmsAggregateRevenueByBranch:rows=>rows, rmsRevenueBranchIds:()=>new Set(["b1"]),
    rmsNetRevenueParts:r=>({cash:r.cash_amount||0,bank:r.bank_amount||0,bankCommission:0,revenue:(r.cash_amount||0)+(r.bank_amount||0)+(r.wolt_amount||0)}),
    rmsServiceChargeStaffCostFromDailyRevenue:()=>0,
    rmsFinanceSupplierTotalsForScope:()=>({food:0,packaging:0,household:0,other:0}),
    rmsFinanceExpenseGroupName:()=>'',
    readRmsAppSetting: async (key,fallback) => {calls.push({table:'setting:'+key}); await delay(lag); return fallback},
    rmsFinanceForecastEngine: async(y,m) => {calls.push({table:'forecast',month:m}); await delay(lag); if(forecastFails)throw Error('forecast unavailable'); return {forecastRevenue:123,forecastProfit:45,forecastExpenses:78,forecastMargin:36,details:[]}},
    rmsLoadDailyRevenueRowsForChart:async()=> {calls.push({table:'chart'});await delay(lag);if(chartFails)throw Error('chart unavailable');return [{revenue_date:'2026-10-01',amount:42}]},
    supabase:{from(table){
      const call={table}; const q=new Proxy({}, {get(_target,key){
        if(key==='then')return (resolve,reject)=>{calls.push(call);return delay(lag).then(()=>{if(currentFails && call.month===new Date().toISOString().slice(0,7)+'-01')throw Error('current unavailable');if(previousFails && call.month && call.month!==new Date().toISOString().slice(0,7)+'-01')throw Error('previous unavailable');return {data:table==='supplier_balances_v2'?[{supplier_id:'s',balance:0}]:table==='daily_revenue'?[{branch_id:'b1',revenue_date:'2026-10-01',cash_amount:1000,bank_amount:200,wolt_amount:50}]:[],error:null}}).then(resolve,reject)}
        return (...args)=>{if(key==='eq'&&['month','salary_month'].includes(args[0]))call.month=args[1];return q}
      }});return q
    }}
  }
  const api=vm.runInNewContext(component,context)
  return {api,writes,calls}
}
const before=harness(baseline), after=harness(candidate)
let start=performance.now();await before.api.load();const beforeMs=performance.now()-start
start=performance.now();await after.api.load();const afterMs=performance.now()-start
const beforeData=before.writes.find(x=>x.index===3).value
const afterData=after.writes.find(x=>x.index===3).value
// Only the unused previous forecast is intentionally omitted.
for(const key of ['forecastRevenue','forecastProfit','forecastExpenses','forecastMargin','forecastDetails'])delete beforeData.previous[key],delete afterData.previous[key]
assert.equal(JSON.stringify(afterData),JSON.stringify(beforeData),'Visible financial output must remain identical')
assert.equal(afterData.revenue,1250)
assert.equal(afterData.net,1150)
assert.equal(afterData.expenses,100)
assert.equal(before.calls.filter(x=>x.table==='forecast').length,2)
assert.equal(after.calls.filter(x=>x.table==='forecast').length,1)
assert.ok(afterMs<beforeMs*0.8,`Expected shorter waterfall: ${afterMs}/${beforeMs}`)
assert.equal(JSON.stringify(after.writes.find(x=>x.index===5).value),JSON.stringify(before.writes.find(x=>x.index===5).value))
// Optional chart failure stays isolated from financial results.
const failedChart=harness(candidate,{chartFails:true});await failedChart.api.load()
assert.equal(JSON.stringify(failedChart.writes.find(x=>x.index===5).value),'[]')
assert.equal(failedChart.writes.find(x=>x.index===3).value.forecastProfit,45)
// An overtaken request must never publish either financial data or chart rows.
const stale=harness(candidate);const loading=stale.api.load();stale.api.loadRequestRef.current++;await loading
assert.equal(stale.writes.length,0)
console.log(JSON.stringify({test:'dashboard fixture waterfall',beforeMs:+beforeMs.toFixed(1),afterMs:+afterMs.toFixed(1),beforeReads:before.calls.length,afterReads:after.calls.length,forecastCallsBefore:2,forecastCallsAfter:1,financialOutput:'identical',staleRequests:'passed',chartFailure:'passed'}))

for (const failure of ['previousFails','currentFails','forecastFails']) {
  const oldRun=harness(baseline,{[failure]:true}), newRun=harness(candidate,{[failure]:true})
  await oldRun.api.load(); await newRun.api.load()
  assert.equal(JSON.stringify(newRun.writes),JSON.stringify(oldRun.writes),failure+' must preserve existing error behavior')
}
console.log('Current-month, previous-month and forecast failures preserve baseline behavior')
