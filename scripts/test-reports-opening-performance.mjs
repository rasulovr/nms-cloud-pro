import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import {execFileSync} from 'node:child_process'
import {currentBakuMonth} from '../src/profitability-range.mjs'
const source=fs.readFileSync('src/main.parts/part-04.jsxpart','utf8')
const baseline=execFileSync('git',['show','2aafff4:src/main.parts/part-04.jsxpart'],{encoding:'utf8'})
const prefix=s=>s.slice(s.indexOf('      const fetchPaged =',s.indexOf('async function readRmsProfitabilitySnapshot')),s.indexOf('      const [employeeRows',s.indexOf('async function readRmsProfitabilitySnapshot')))
async function run(s,{fail=false,fallback=false}={}) {
 let active=0,peak=0,calls=0
 const supabase={from(table){let lo=0,hi=0;const q={select(){return q},is(){return q},order(){return q},range(a,b){lo=a;hi=b;return q},then(resolve,reject){calls++;active++;peak=Math.max(peak,active);return new Promise(done=>setTimeout(()=>{active--;done({data:fallback&&table==='daily_revenue_entries'?[]:Array.from({length:Math.max(0,Math.min(2107,hi+1)-lo)},(_,i)=>({id:lo+i,amount:lo+i,deleted_at:null})),error:fail&&table==='daily_expenses'&&lo===1000?new Error('page failure'):null})},20)).then(resolve,reject)}};return q}}
 const started=performance.now()
 const result=await vm.runInNewContext(`(async()=>{${prefix(s)};return {revenueRows,revenueSource,rawDailyExpenseRows,rawSupplierPurchases}})()`,{supabase,pageSize:1000,applyDateRange:q=>q})
 return {result:JSON.parse(JSON.stringify(result)),calls,peak,ms:performance.now()-started}
}
const old=await run(baseline),next=await run(source)
assert.deepEqual(next.result,old.result);assert.equal(next.calls,old.calls);assert.equal(old.peak,1);assert.equal(next.peak,3)
assert.deepEqual((await run(source,{fallback:true})).result,(await run(baseline,{fallback:true})).result)
await assert.rejects(run(source,{fail:true}),/page failure/)
assert.equal((await run(source)).result.rawDailyExpenseRows.length,2107,'fresh retry reads complete data')
for(const [now,want] of [['2026-10-31T19:59:59Z','2026-10'],['2026-10-31T20:00:00Z','2026-11'],['2026-12-31T20:00:00Z','2027-01']])assert.equal(currentBakuMonth(new Date(now)),want)
const init=source.match(/const \[monthFilter, setMonthFilter\] = useState\(([^\n]+)\)/)[1]
assert.equal(vm.runInNewContext(init,{currentBakuMonth:()=> '2026-11'})(),'2026-11')
// Execute the four production effects: Overview must not start sales/recipe work.
for(const name of ['loadSalesAliasesCloud','loadHiddenKeysCloud','loadCloudReports','loadRecipeCosts']) {
 const marker=source.indexOf('async function '+name)
 const start=source.lastIndexOf('  useEffect(() => {',marker)
 const end=source.indexOf('\n  }, [',marker)
 const effect=source.slice(start,end)+'\n  }, [])'
 vm.runInNewContext(effect,{needsSalesData:false,useEffect:fn=>fn()})
}
console.log(JSON.stringify({fixture:'3 sources x 2107 rows, 20ms per page; not production latency',before:{ms:old.ms,requests:old.calls,peak:old.peak},after:{ms:next.ms,requests:next.calls,peak:next.peak},reductionPercent:(1-next.ms/old.ms)*100},null,2))
console.log('PASS full result parity, fallback, second-page failure, fresh retry, Baku month/year boundary, production initial state and lazy Overview effects')
