import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import {buildOperationalProfitability} from '../src/profitability-operational.mjs'
import {buildProfitabilitySummary} from '../src/profitability-summary.mjs'
import {profitabilitySurface,profitabilityTrend} from '../src/profitability-surface.mjs'
import {presentProfitabilitySection} from '../src/profitability-presentation.mjs'
const base={branchRows:[{id:'a',name:'A'},{id:'b',name:'B'}],employeeRows:[{id:'p',is_active:true,position:'cook',branch_id:'a'},{id:'m',is_active:true,position:'Менеджер',branch_id:null}],dailyExpenseRows:[{id:'paid',branch_id:'a',expense_date:'2026-10-01',amount:60,kind:'tax-paid'}],revenueRows:[{id:'r1',branch_id:'a',revenue_date:'2026-10-01',cash_amount:0,bank_amount:100,wolt_amount:0},{id:'r2',branch_id:'b',revenue_date:'2026-10-01',cash_amount:100,bank_amount:0,wolt_amount:0}],supplierPurchases:[{id:'p1',purchase_date:'2026-10-01',total_amount:198,branch_id:'a'},{id:'deleted',purchase_date:'2026-10-01',total_amount:999,deleted_at:'2026-10-02'}],salaryPeriods:[{id:'p',employee_id:'p',salary_month:'2026-10-01',branch_id:'a',salary_gross:0,salary_net:999},{id:'m',employee_id:'m',salary_month:'2026-10-01',branch_id:null,salary_gross:198}]}
const opts={period:{from:'2026-10-01',toExclusive:'2026-11-01'},bankRate:2,taxSettings:{},expenseName:()=> 'Other',excludeExpense:r=>r.kind==='tax-paid',serviceCost:()=>0}
const run=(input=base,options=opts,issues=[{reason:'missing-coverage-manifest',severity:'blocking_runtime_basis',month:'2026-10'}])=>{const operational=buildOperationalProfitability(input,options),report={operational,summaryInputs:{period:options.period,coverageIssues:issues}},model=buildProfitabilitySummary(report);return {report,model,surface:profitabilitySurface(report),display:presentProfitabilitySection({period:model.total,monthly:model.monthly,reconciled:model.reconciled})}}
const v=run();assert.equal(v.model.total.net,-214);assert.equal(v.surface.net,-214);assert.equal(v.surface.verified,false);assert.equal(v.display.period.net,-214)
assert.equal(v.model.branches[0].monthly[0].supplierFoodCost,98,'net revenue share, not gross 50%');assert.equal(v.model.branches[0].monthly[0].salary,98,'gross zero never replaced with net; manager share uses net revenue');assert.equal(v.model.total.expenses,412,'paid tax not deducted twice')
for(let month=1;month<=11;month++){
 const key=`2026-${String(month).padStart(2,'0')}`,input=JSON.parse(JSON.stringify(base).replaceAll('2026-10',key)),period={from:key+'-01',toExclusive:month===12?'2027-01-01':`2026-${String(month+1).padStart(2,'0')}-01`}
 assert.equal(run(input,{...opts,period}).surface.net,-214,`same accounting contract ${key}`)
}
for(const reason of ['missing-coverage-manifest','stale-or-invalid-bank-evidence','incomplete-network-allocation-basis','verification-read-error'])assert.equal(run(base,opts,[{reason,severity:'blocking_runtime_basis'}]).display.period.net,-214)
for(const value of [null,'',NaN,Infinity,'bad']){const input=structuredClone(base);input.revenueRows[0].bank_amount=value;assert.throws(()=>run(input),/Некорректная сумма/)}
const absent={...base,revenueRows:[]};assert.throws(()=>run(absent),/Нет выручки для распределения/)
const zero={...base,revenueRows:[{...base.revenueRows[0],bank_amount:0}],supplierPurchases:[],salaryPeriods:[],dailyExpenseRows:[]};assert.equal(run(zero).surface.net,0);assert.equal(run(zero).display.period.net,0)
const empty=run({...zero,revenueRows:[]});assert.equal(empty.surface.net,null,'absence of records is not observed zero')
const single=run(base,{...opts,branchIds:['a']});assert.equal(single.surface.net,-106);assert.equal(single.model.branches.length,1)
const combined=structuredClone(base);for(const [key,date] of [['revenueRows','revenue_date'],['supplierPurchases','purchase_date'],['salaryPeriods','salary_month'],['dailyExpenseRows','expense_date']])combined[key].push(...base[key].map(r=>({...r,[date]:String(r[date]).replace('2026-10','2026-11')})))
assert.equal(run(combined,{...opts,period:{from:'2026-10-01',toExclusive:'2026-12-01'}}).surface.net,-428,'each month allocated independently')
assert.equal(profitabilityTrend(v.surface,v.surface).percent,0);assert.equal(profitabilityTrend(v.surface,profitabilitySurface({error:'query failed'})).delta,null)
const paid=structuredClone(base);paid.dailyExpenseRows[0].amount=99999;assert.equal(run(paid).surface.net,-214,'tax payment remains informational')
// Actual setting reader must propagate errors in strict profitability mode.
const common=fs.readFileSync('src/main.parts/part-00.jsxpart','utf8'),start=common.indexOf('async function readRmsAppSetting('),end=common.indexOf('\n}',start)+2
const q={select(){return this},eq(){return this},maybeSingle:async()=>({error:Error('synthetic setting read failure')})};const c=vm.createContext({supabase:{from:()=>q},RMS_APP_SETTINGS_TABLE:'settings'});vm.runInContext(common.slice(start,end)+';globalThis.read=readRmsAppSetting',c)
await assert.rejects(c.read('bank',2,true),/synthetic setting read failure/);assert.equal(await c.read('bank',2),2)
console.log('PASS operational October contract Jan-Nov: net-bank allocation, payroll gross-only, service/tax inputs, no paid-tax double count, metadata independence, observed zero vs empty, invalid values and unavailable allocation, single branch/range, strict setting errors')
