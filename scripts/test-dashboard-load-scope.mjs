import fs from 'node:fs'
import vm from 'node:vm'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { performance } from 'node:perf_hooks'
import { transformSync } from 'esbuild'

const file = 'src/main.parts/part-03.jsxpart'
const candidate = fs.readFileSync(file, 'utf8')
// Public first-stage release commit: same tree as production merge 20476976.
const baseline = execFileSync('git', ['show', '5fa2dffcb7425c1afd10f1e64541f603f0f22058:' + file], {encoding:'utf8'})
const lag = 5
const delay = ms => new Promise(resolve => setTimeout(resolve, ms))
const clone = value => JSON.parse(JSON.stringify(value))
const branches = [{id:'b1',name:'Synthetic North'},{id:'b2',name:'Synthetic South'}]
const months = ['2026-10','2026-09','2024-03','2024-02']
const revenue = months.flatMap((m,i) => [
  {branch_id:'b1',revenue_date:m+'-01',cash_amount:100+i,bank_amount:20,wolt_amount:5},
  {branch_id:'b2',revenue_date:m+'-03',cash_amount:80+i,bank_amount:0,wolt_amount:7},
  {branch_id:'b1',revenue_date:m+'-17',cash_amount:0,bank_amount:0,wolt_amount:9},
  {branch_id:'b2',revenue_date:m+'-18',cash_amount:0,bank_amount:0,wolt_amount:0},
  {branch_id:'b1',revenue_date:m+'-28',cash_amount:50,bank_amount:0,wolt_amount:0}
])

function harness(source,{scope='__all__',year=2026,month=10,today='2026-10-18T12:00:00Z',comparisonFails=false,branchesLoaded=true,branchRows=branches}={}) {
  const events=[], states=[], refs=[], effects=[]
  let stateIndex=0, refIndex=0, loaded=branchesLoaded
  class FixedDate extends Date {constructor(...args){super(...(args.length?args:[today]))}static now(){return new Date(today).valueOf()}}
  const context={console:{error(){}},Date:FixedDate,Map,Set,Promise,
    React:{createElement:(type,props,...children)=>({type,props:props||{},children}),Fragment:'fragment'},
    useBranches:(_all,status)=>status?{branches:branchRows,loaded}:branchRows,
    useRef:initial=>refs[refIndex++] ||= {current:initial},
    useState:initial=>{const index=stateIndex++;if(!(index in states))states[index]=[scope,year,month][index]??initial;return [states[index],value=>{states[index]=value;events.push({kind:'write',index})}]},
    useEffect:fn=>effects.push(fn),
    monthStart:(y,m)=>`${y}-${String(m).padStart(2,'0')}-01`,
    rmsNextMonthStart:key=>{const d=new Date(key+'-01T12:00:00Z');d.setUTCMonth(d.getUTCMonth()+1);return d.toISOString().slice(0,10)},
    prevMonth:(y,m)=>m===1?{year:y-1,month:12}:{year:y,month:m-1},
    parseNum:x=>Number(x)||0,fmt:String,pct:x=>`${x.toFixed(1)}%`,localStorage:{getItem:()=>null},
    RMS_BRANCH_TAX_RATE_SETTING:'tax',RMS_BANK_COMMISSION_RATE_SETTING:'bank',RMS_DEFAULT_BANK_COMMISSION_RATE:1,
    rmsBankCommissionRate:x=>x,
    rmsAggregateRevenueByBranch:rows=>{const map=new Map();for(const r of rows){const sum=map.get(r.branch_id)||{branch_id:r.branch_id,cash_amount:0,bank_amount:0,wolt_amount:0};for(const k of ['cash_amount','bank_amount','wolt_amount'])sum[k]+=r[k]||0;map.set(r.branch_id,sum)}return [...map.values()]},
    rmsRevenueBranchIds:rows=>new Set(rows.filter(r=>r.cash_amount+r.bank_amount+r.wolt_amount>0).map(r=>r.branch_id)),
    rmsNetRevenueParts:r=>({cash:r.cash_amount||0,bank:r.bank_amount||0,bankCommission:(r.bank_amount||0)*.01,revenue:(r.cash_amount||0)+(r.bank_amount||0)*.99+(r.wolt_amount||0)}),
    rmsServiceChargeStaffCostFromDailyRevenue:()=>0,rmsFinanceSupplierTotalsForScope:()=>({food:0,packaging:0,household:0,other:0}),rmsFinanceExpenseGroupName:()=>'',
    positionGroup:()=>'',rmsBranchInRevenueScope:()=>true,
    readRmsAppSetting:async(key,fallback)=>{events.push({kind:'read',table:'setting:'+key});await delay(lag);return fallback},
    rmsFinanceForecastEngine:async(y,m,_scope,readOnce=(_key,read)=>read())=>{events.push({kind:'forecast-start'});await Promise.all([
      readOnce('active-employees',()=>context.supabase.from('employees').select('id,branch_id,position,monthly_salary,salary_type,daily_rate,is_active,employment_status').eq('is_active',true)),
      readOnce('setting:branch-tax',()=>context.readRmsAppSetting('tax',{})),
      readOnce('setting:bank-commission',()=>context.readRmsAppSetting('bank',1))
    ]);await delay(lag*3);events.push({kind:'forecast-end'});return {forecastRevenue:500,forecastProfit:30,details:[]}},
    defaultYears:()=>[2024,2026],I18N:{ru:{months:Array.from({length:12},(_,i)=>'Month '+(i+1))}},
    DailyRevenueLineChart:()=>null,MiniBarChart:()=>null,
    supabase:{from(table){const filters=[],call={kind:'read',table,filters};const q=new Proxy({}, {get(_target,key){
      if(key==='then')return (resolve,reject)=>{events.push(call);return delay(lag).then(()=>{
        let data=table==='daily_revenue'?revenue:table==='supplier_balances_v2'?[{supplier_id:'s',balance:0}]:[]
        for(const [op,k,v]of filters){if(op==='gte')data=data.filter(r=>r[k]>=v);if(op==='lt')data=data.filter(r=>r[k]<v);if(op==='eq')data=data.filter(r=>r[k]===v)}
        if(comparisonFails&&table==='daily_revenue'&&filters.some(([op,k,v])=>op==='lt'&&k==='revenue_date'&&!v.endsWith('-01')))return {data:null,error:Error('synthetic comparison error')}
        return {data:clone(data),error:null}
      }).then(resolve,reject)}
      return (...args)=>{if(key==='select')call.columns=args[0];else filters.push([key,...args]);return q}
    }});return q}}
  }
  const chart=source.slice(source.indexOf('async function rmsLoadDailyRevenueRowsForChart('),source.indexOf('\nfunction rmsSalaryPeriodTotal'))
  let component=source.slice(source.indexOf('function Dashboard({ t })'),source.indexOf('\nfunction Finance('))
  component=component.replace('  if (!data) return', '  if (captureLoad) return {load,loadRequestRef,loadedSelectionRef:typeof loadedSelectionRef === "undefined" ? null : loadedSelectionRef};\n  if (!data) return')
  context.captureLoad=true
  vm.createContext(context)
  vm.runInContext(chart+transformSync(component,{loader:'jsx'}).code,context)
  function render(capture=true){stateIndex=0;refIndex=0;effects.length=0;context.captureLoad=capture;return vm.runInContext('Dashboard({t:x=>x})',context)}
  const api=render()
  return {api,events,states,refs,effects,render,setLoaded:x=>{loaded=x},data:()=>clone(states[3]),setSelection:({scope,year,month})=>{if(scope)states[0]=scope;if(year)states[1]=year;if(month)states[2]=month}}
}

function textTree(node){if(node==null||node===false)return '';if(typeof node!=='object')return String(node);return (node.children||[]).flat(Infinity).map(textTree).join(' ')}
for(const options of [{},{scope:'b1'},{scope:'b2'},{month:9},{year:2024,month:3,today:'2024-03-31T12:00:00Z'},{year:2024,month:3,today:'2024-03-30T12:00:00Z'},{comparisonFails:true}]){
  const old=harness(baseline,options),next=harness(candidate,options)
  await old.api.load();await next.api.load()
  assert.deepEqual(next.data(),old.data(),'same financial results '+JSON.stringify(options))
  assert.deepEqual(clone(next.states[5]),clone(old.states[5]),'same chart '+JSON.stringify(options))
}
const old=harness(baseline), next=harness(candidate)
let start=performance.now();await old.api.load();const beforeMs=performance.now()-start
start=performance.now();await next.api.load();const afterMs=performance.now()-start
const count=(h,t)=>h.events.filter(e=>e.kind==='read'&&e.table===t).length
for(const table of ['employees','supplier_balances_v2','suppliers','supplier_payments','setting:bank','setting:tax'])assert.equal(count(next,table),1,table+' shared once')
assert.equal(count(old,'employees'),3)
assert.equal(count(old,'setting:bank'),7)
assert.equal(count(old,'setting:tax'),3)
const compareStart=next.events.findIndex(e=>e.table==='daily_revenue'&&e.filters.some(([op,k,v])=>op==='lt'&&k==='revenue_date'&&!v.endsWith('-01')))
assert.ok(compareStart<next.events.findIndex(e=>e.kind==='forecast-end'),'comparison starts before forecast ends')
const firstReads=count(next,'employees');await next.api.load();assert.equal(count(next,'employees'),firstReads+1,'new load has fresh scope')
const otherUser=harness(candidate);await otherUser.api.load();assert.equal(count(otherUser,'employees'),1,'separate component reads independently')

const startup=harness(candidate,{branchesLoaded:false})
startup.effects[0]();await delay(lag*2);assert.equal(startup.events.length,0,'no empty startup load')
startup.setLoaded(true);startup.render();startup.effects[0]();await delay(lag*10);assert.equal(count(startup,'employees'),1,'one load when branches resolve')
const empty=harness(candidate,{branchesLoaded:true,branchRows:[]});empty.effects[0]();await delay(lag*10);assert.ok(empty.states[3],'empty branch list settles')
const unmount=harness(candidate);const cleanup=unmount.effects[0]();cleanup();await delay(lag*10);assert.equal(unmount.states[3],null,'unmounted load cannot publish')

// Re-render after a filter event, before any effect/network result: old KPIs must disappear.
const ui=harness(candidate);await ui.api.load();assert.match(textTree(ui.render(false)),/Выручка за месяц/)
ui.setSelection({month:9});const during=ui.render(false)
assert.doesNotMatch(textTree(during),/Выручка за месяц/,'old financial panels hidden immediately')
assert.match(textTree(during),/loading/);assert.match(textTree(during),/Филиал/,'filters remain available')
const newer=ui.render();await newer.load();assert.match(textTree(ui.render(false)),/Выручка за месяц/,'fresh result shown')
// Two request closures share React refs: an older period cannot replace the latest.
const race=harness(candidate);const pending=race.api.load();race.setSelection({scope:'b1',month:9});const latest=race.render();await Promise.all([pending,latest.load()]);assert.ok(race.data().branchRows.every(x=>x.id==='b1'));assert.equal(race.refs[1].current,'2026/9/b1')

// Real useBranches hook: success, empty/RLS fallback, rejected query and unmount settle safely.
const hookSource=fs.readFileSync('src/main.parts/part-02.jsxpart','utf8').match(/function useBranches\([\s\S]*?\n}\r?\n/)?.[0]
assert.ok(hookSource)
for(const scenario of ['success','empty','rls','reject','unmount']){
  const states=[],effects=[];let idx=0;const writes=[]
  const c={console:{error(){}},Date,Map,Array,String,useState:initial=>{const i=idx++;states[i]=initial;return [initial,v=>{states[i]=v;writes.push(i)}]},useEffect:f=>effects.push(f),monthStart:()=>'',fetchRmsStaffWorkspaceSnapshot:async()=>({data:{employees:[]}}),supabase:{from(){const q={select:()=>q,order:()=>q,eq:()=>q,then:(ok,no)=>delay(lag).then(()=>{if(scenario==='reject')throw Error('synthetic failure');return {data:scenario==='success'?branches:[],error:scenario==='rls'?Error('synthetic denied'):null}}).then(ok,no)};return q}}}
  vm.runInNewContext(hookSource+';useBranches(true,true)',c);const cleanup=effects[0]();if(scenario==='unmount')cleanup();await delay(lag*4)
  if(scenario==='unmount')assert.equal(writes.length,0);else assert.equal(states[1],true,scenario+' branch loading settles')
}
console.log(JSON.stringify({test:'Dashboard scoped reads, comparison, startup and render guards',fixtureOnly:true,beforeMs:+beforeMs.toFixed(1),afterMs:+afterMs.toFixed(1),employeesBefore:3,employeesAfter:1,bankBefore:7,bankAfter:1,financialEquivalenceCases:7,branchFailureAndUnmount:'passed',filterAndRace:'passed'}))
