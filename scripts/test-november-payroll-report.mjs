import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {actualProfitabilityView,operationalMetrics} from '../src/profitability-metrics.mjs'
import {makeNovemberPayrollReport,parseNovemberPayrollConfig} from '../server/november-payroll-report.mjs'
import {containsNovemberPayroll,readNovemberPayrollReport} from '../src/november-payroll-report.mjs'
import {buildOperationalProfitability} from '../src/profitability-operational.mjs'
const ids=Array.from({length:6},(_,i)=>`00000000-0000-4000-8000-00000000000${i+1}`)
const token='synthetic.payload.token', owner='50000000-0000-4000-8000-000000000001'
const branchCents=Object.fromEntries(ids.map((id,index)=>[id,index*127]))
const config={version:1,month:'2026-11',asOf:'2026-11-20',allowedAuthUserId:owner,networkCents:1905,branchCents}
const env={VERCEL_ENV:'production',VITE_SUPABASE_URL:'https://meqttgiksyuyffuoghwx.supabase.co',VITE_SUPABASE_ANON_KEY:'public',RMS_NOVEMBER_PAYROLL_REPORT:JSON.stringify(config)}
assert(parseNovemberPayrollConfig(env.RMS_NOVEMBER_PAYROLL_REPORT))
for(const update of [{networkCents:1},{asOf:'2026-11-31'},{month:'2026-10'},{branchCents:{[owner]:1}}])assert.equal(parseNovemberPayrollConfig(JSON.stringify({...config,...update})),null)
let calls=[]
const get=async({id=owner,anonymous=false,active=true,role='admin',hide=false,permissions=true,auth=token,method='GET',activeEnv=env}={})=>{
  calls=[]
  const handler=makeNovemberPayrollReport({env:activeEnv,fetchImpl:async(url,opts)=>{
    calls.push({url,opts})
    const obj=url.endsWith('/auth/v1/user')?{id,is_anonymous:anonymous}
      :url.includes('/user_profiles?')?[{role,is_active:active,hide_manager_salaries:hide}]
      :permissions
    return {ok:true,json:async()=>obj}
  }})
  const response={headers:{},setHeader(k,v){this.headers[k]=v},status(code){this.code=code;return this},end(raw){this.data=JSON.parse(raw)}}
  await handler({method,headers:{authorization:auth===null?null:'Bearer '+auth}},response)
  return response
}
assert.equal((await get({auth:null})).code,401);assert.equal(calls.length,0)
assert.equal((await get({id:ids[0]})).code,403);assert.equal(calls.length,1)
assert.equal((await get({anonymous:true})).code,403);assert.equal(calls.length,1)
for(const opts of [{active:false},{role:'manager'},{hide:true},{permissions:false}])assert.equal((await get(opts)).code,403)
assert.equal((await get({method:'POST'})).code,405);assert.equal(calls.length,0)
assert.equal((await get({activeEnv:{...env,VERCEL_ENV:'preview'}})).code,503);assert.equal(calls.length,0)
const good=await get()
assert.equal(good.code,200);assert.equal(calls.length,4)
assert.equal(good.headers['Cache-Control'],'private, no-store, max-age=0')
assert.equal(JSON.stringify(good.data).includes(owner),false)
assert.deepEqual(good.data.branchCents,branchCents)
assert(!containsNovemberPayroll('2026-10-01','2026-11-01'))
assert(containsNovemberPayroll('2026-10-01','2026-12-01'))
const branchRows=ids.map(id=>({id,name:id}))
const client={auth:{getSession:async()=>({data:{session:{access_token:token}}})}}
assert.equal(await readNovemberPayrollReport(client,branchRows,{fetchImpl:async()=>({status:403})}),null)
const draft=await readNovemberPayrollReport(client,branchRows,{fetchImpl:async(path,opts)=>{assert.equal(opts.headers.Authorization,'Bearer '+token);assert.equal(opts.cache,'no-store');return{ok:true,json:async()=>good.data}}})
assert.match(draft.basis,/20\.11\.2026/)
await assert.rejects(readNovemberPayrollReport(client,branchRows.slice(0,5),{fetchImpl:async()=>({ok:true,json:async()=>good.data})}))
const ledger=[{employee_id:'employee-a',branch_id:ids[1],salary_month:'2026-11-01',salary_gross:55},{employee_id:'employee-b',salary_month:'2026-11-01',salary_gross:33},{employee_id:'employee-c',branch_id:ids[0],salary_month:'2026-10-01',salary_gross:17}]
const ledgerBefore=JSON.stringify(ledger), input={branchRows,salaryPeriods:ledger,revenueRows:['10','11'].flatMap(m=>ids.map(id=>({branch_id:id,revenue_date:`2026-${m}-02`,cash_amount:100,bank_amount:0,wolt_amount:0})))}
const options={period:{from:'2026-10-01',toExclusive:'2026-12-01'},bankRate:0,expenseName:()=>'',excludeExpense:()=>false,serviceCost:()=>0}
const before=buildOperationalProfitability(input,options)
const after=buildOperationalProfitability({...input,novemberPayrollReport:draft},options)
const pick=(x,m)=>x.model.branches.map(r=>r.monthly.find(n=>n.month===m))
assert.deepEqual(pick(after,'2026-10'),pick(before,'2026-10'))
const nov=pick(after,'2026-11')
assert.equal(JSON.stringify(ledger),ledgerBefore)
assert.deepEqual(nov.map(r=>Math.round(r.salary*100)),Object.values(branchCents))
assert.equal(nov.reduce((n,r)=>Math.round(r.salary*100)+n,0),config.networkCents)
assert.equal(before.model.branches.reduce((n,b)=>n+b.monthly.at(-1).salary,0),88)
assert.equal(nov.reduce((n,r)=>n+r.details.filter(d=>d.key==='salary').length,0),5)
assert.equal(buildOperationalProfitability({...input,novemberPayrollReport:draft},{...options,branchIds:[ids[1]]}).model.branches[0].monthly.at(-1).salary,1.27)
// Actual Dashboard chart and Finance KPI consume this exact projection rather than their old ledger fallback.
const selectedNov={...options,period:{from:'2026-11-01',toExclusive:'2026-12-01'}}
const authoritative=buildOperationalProfitability({...input,novemberPayrollReport:draft},selectedNov).model
const profit={...operationalMetrics(authoritative),expenses:authoritative.total.expenses,branches:authoritative.branches,novemberPayrollBasis:draft.basis}
const legacy={salary:88,expenses:88,expenseRows:[{key:'salary',amount:88}]}
const shown=actualProfitabilityView(legacy,profit,null)
assert.equal(Math.round(shown.salary*100),config.networkCents)
assert.equal(Math.round(shown.expenses*100),config.networkCents+4800)
assert.equal(Math.round(shown.expenseRows.find(x=>x.key==='salary').amount*100),config.networkCents)
const realDashboard=readFileSync(new URL('../src/main.parts/part-03.jsxpart',import.meta.url),'utf8')
assert.match(realDashboard,/actualProfitabilityView\(legacyData,verifiedProfit,verifiedProfit.previousActual\)/)
assert.match(realDashboard,/const expenseRows = data.expenseRows/)
assert.match(realDashboard,/dashboard-v416-expense-chart/)
assert.match(realDashboard,/const financeExpenseRowsAll = \(verifiedProfit.expenseRows/)
assert.match(realDashboard,/salaryAmount: parseNum\(stats.salary\)/)
assert.equal((realDashboard.match(/role="status">\{verifiedProfit.novemberPayrollBasis\}/g)||[]).length,2)
console.log('PASS: authenticated owner gate, scope and fail closed; November replacement not addition; October and ledger unchanged')
