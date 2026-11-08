import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import * as period from '../src/revenue-period.mjs'
import {actualProfitabilityView} from '../src/profitability-metrics.mjs'
const {completedRevenuePeriod,currentRevenueComparison,revenueComparisonValues,currentRevenueMonth,revenueBusinessDate}=period
const now=new Date('2026-11-08T08:00:00Z')
const rows=(month,count,ids=['a','b'],cash=100)=>Array.from({length:count},(_,i)=>ids.map(branch_id=>({branch_id,revenue_date:`${month}-${String(i+1).padStart(2,'0')}`,cash_amount:cash,bank_amount:50,wolt_amount:10}))).flat()
const base={year:2026,month:11,now,branches:[{id:'unused',is_active:true}],rows:rows('2026-11',7),previousRows:rows('2026-10',31),rate:2}
let result=currentRevenueComparison(base)
assert.equal(result.completedDays,7);assert.equal(result.currentRevenue,2226);assert.equal(result.previousRevenue,2226)
assert.equal(revenueComparisonValues(result,999,9999).percent,0)
const actual=actualProfitabilityView({comparison:result,forecastRevenue:9540},{available:true,revenue:999,expenses:40,branches:[]},{available:true,revenue:9999,expenses:50})
assert.equal(actual.comparison,result);assert.equal(actual.revenue,999);assert.equal(actual.previous.revenue,9999)
assert.equal(revenueComparisonValues(actual.comparison,actual.revenue,actual.previous.revenue).percent,0)
assert.equal(actualProfitabilityView({comparison:null},{revenue:20},{available:true,revenue:10}).comparison,null)
assert.equal(revenueComparisonValues(null,20,10).percent,100) // historic full-month semantics
// Today/future rows don't enter numerator; observed late branch still requires coverage.
result=completedRevenuePeriod({...base,rows:[...base.rows,...rows('2026-11',9).filter(r=>r.revenue_date>='2026-11-08')]})
assert.equal(result.completedDays,7);assert.equal(result.revenue,2226)
assert.equal(result.revenue/result.completedDays*result.monthDays,9540)
const partial=base.rows.filter(r=>r.branch_id!=='b'||r.revenue_date<'2026-11-06')
assert.equal(completedRevenuePeriod({...base,rows:partial}).completedDays,5)
assert.equal(completedRevenuePeriod({...base,rows:partial,branchId:'a'}).completedDays,7)
const gap=base.rows.filter(r=>!(r.branch_id==='b'&&r.revenue_date==='2026-11-03'))
assert.equal(completedRevenuePeriod({...base,rows:gap}).completedDays,2)
assert.equal(completedRevenuePeriod({...base,rows:[]}).available,false)
assert.equal(currentRevenueComparison({...base,now:new Date('2026-11-01T08:00:00Z')}).available,false)
assert.equal(currentRevenueComparison({...base,previousRows:base.previousRows.filter(r=>r.revenue_date!=='2026-10-02')}).available,false)
assert.equal(currentRevenueComparison({...base,previousRows:[...base.previousRows,...rows('2026-10',1,['missing'])]}).available,false)
assert.equal(currentRevenueComparison({...base,previousRows:[...base.previousRows,...rows('2026-10',1,['missing'])],branchId:'a'}).available,true)
assert.equal(completedRevenuePeriod({...base,expectedBranchIds:['missing']}).available,false)
// Zero is a recorded observation; absent/null/invalid is not fabricated zero.
const zeros=base.rows.map(r=>({...r,cash_amount:0,bank_amount:0,wolt_amount:0}))
assert.equal(completedRevenuePeriod({...base,rows:zeros}).completedDays,7)
assert.equal(revenueComparisonValues(currentRevenueComparison({...base,previousRows:zeros.map(r=>({...r,revenue_date:r.revenue_date.replace('11','10')}))})).percent,null)
assert.throws(()=>completedRevenuePeriod({...base,rows:[{...base.rows[0],cash_amount:null}]}))
assert.throws(()=>completedRevenuePeriod({...base,rows:[{...base.rows[0],bank_amount:'bad'}]}))
assert.equal(completedRevenuePeriod({...base,rows:base.rows.map(r=>r.revenue_date==='2026-11-02'?{...r,deleted_at:'deleted'}:r)}).completedDays,1)
assert.throws(()=>completedRevenuePeriod({...base,rows:[...base.rows,{...base.rows[0],cash_amount:1,bank_amount:0,wolt_amount:0}]}))
// Periodic Wolt postings stay on their source date; no invented accrual/spreading.
assert.equal(currentRevenueComparison({...base,previousRows:base.previousRows.map(r=>r.revenue_date==='2026-10-15'?{...r,wolt_amount:9000}:r)}).previousRevenue,2226)
for(const [year,month,day,py,pm,previousDays] of [[2027,1,8,2026,12,31],[2027,3,31,2027,2,28],[2028,3,31,2028,2,29],[2026,5,31,2026,4,30],[2026,4,30,2026,3,31]]){
 const date=new Date(`${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}T08:00:00Z`),mk=`${year}-${String(month).padStart(2,'0')}`,pk=`${py}-${String(pm).padStart(2,'0')}`
 const opts={...base,year,month,now:date,rows:rows(mk,day-1),previousRows:rows(pk,previousDays)}
 assert.equal(currentRevenueComparison(opts).completedDays,Math.min(day-1,previousDays))
 assert.equal(completedRevenuePeriod(opts).completedDays,day-1)
}
assert.deepEqual(revenueBusinessDate(new Date('2026-10-31T20:01:00Z')),{year:2026,month:11,day:1})
assert.equal(currentRevenueMonth(2026,11,new Date('2026-10-31T20:01:00Z')),true)
assert.equal(completedRevenuePeriod({...base,now:new Date('2026-11-07T20:01:00Z')}).completedDays,7)
// Actual async read path: matching periods, explicit error state, and no fallback.
const source=fs.readFileSync('src/main.parts/part-03.jsxpart','utf8')
const start=source.indexOf('async function rmsLoadRevenueComparison('),end=source.indexOf('async function rmsCalculateNetworkForecastForMonth(',start)
class FixedDate extends Date {constructor(...args){super(...(args.length?args:[now]))}}
let fail=false,queries=[]
const supabase={from(table){let start,end;const q={select(){return q},gte(k,v){start=v;return q},lt(k,v){end=v;return q},is(){return q},then(resolve){queries.push([table,start,end]);return Promise.resolve(fail?{error:new Error('synthetic read failure')}:{data:[...base.rows,...base.previousRows].filter(r=>r.revenue_date>=start&&r.revenue_date<end)}).then(resolve)}};return q}}
const context=vm.createContext({...period,Date:FixedDate,supabase,console:{error(){}},monthStart:(y,m)=>`${y}-${String(m).padStart(2,'0')}-01`,rmsNextMonthStart:month=>{const d=new Date(month+'-01T00:00:00Z');d.setUTCMonth(d.getUTCMonth()+1);return d.toISOString().slice(0,10)},readRmsAppSetting:async()=>2,rmsBankCommissionRate:Number,RMS_BANK_COMMISSION_RATE_SETTING:'bank',RMS_DEFAULT_BANK_COMMISSION_RATE:2})
vm.runInContext(source.slice(start,end)+'\nglobalThis.load=rmsLoadRevenueComparison',context)
assert.equal((await context.load(2026,11,'__all__')).currentRevenue,2226)
assert.equal(queries.length,2);assert.equal(await context.load(2026,10,'__all__'),null)
fail=true;const missing=await context.load(2026,11,'__all__');assert.equal(missing.available,false)
assert.equal(revenueComparisonValues(missing,100,10000).percent,null)
const engineStart=source.indexOf('async function rmsFinanceForecastEngine('),engineEnd=source.indexOf('// Daily revenue is the source',engineStart)
const engineContext=vm.createContext({...period,rmsCalculateNetworkForecastForMonth:async()=>period.unavailableRevenueForecast(),parseNum:Number,Math,Array,console})
vm.runInContext(source.slice(engineStart,engineEnd)+'\nglobalThis.engine=rmsFinanceForecastEngine',engineContext)
assert.equal((await engineContext.engine(2026,11)).forecastRevenue,null)
assert.equal((await engineContext.engine(2026,11)).forecastAvailable,false)
assert.equal(completedRevenuePeriod({...base,year:2027,month:1,rows:rows('2027-01',10)}).available,false)
assert.match(source,/forecastAvailable === false \? '—'/)
assert.match(source,/currentRevenueMonth\(y, m, now\)/)
console.log('PASS revenue periods: same dates/net basis, adapter, network/branch completeness, today/future, gaps, zero/missing/error states, Wolt dates, prior branch absence, calendar/year/Baku boundaries, historical monthly semantics')
