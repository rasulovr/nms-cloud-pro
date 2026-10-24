import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import { componentInputsFingerprint } from '../src/profitability-reviewed-components.mjs'

const part = fs.readFileSync('src/main.parts/part-04.jsxpart', 'utf8')
const start = part.indexOf('      const fetchPaged = async (buildQuery) =>', part.indexOf('  async function loadRmsProfitabilityReport()'))
const end = part.indexOf('      const [{ data: employeeRowsRaw', start)
assert.ok(start >= 0 && end > start)
const querySource = part.slice(start, end)
const configs = [['daily_revenue_entries','revenue_date'], ['daily_expenses','expense_date'], ['supplier_purchases','purchase_date']]
const fixture = Object.fromEntries(configs.map(([table,date]) => [table, Array.from({length: 3107}, (_,i) => ({id:`id-${String(i).padStart(5,'0')}`, [date]: i < 1500 ? '2026-01-10' : '2026-09-10', branch_id:i%2?'a':'b', amount:i + 0.25}))]))
const expected = rows => [...rows].sort((a,b)=>a.id.localeCompare(b.id))
async function load(source, data, fault=false) {
 const orders=[]
 class Query {
  constructor(table){ this.table=table; this.sorts=[]; this.lo=0; this.hi=Infinity }
  select(){return this} is(){return this}
  order(key, options){this.sorts.push({key,...options});return this}
  range(lo,hi){this.lo=lo;this.hi=hi;return this}
  then(resolve){
   orders.push({table:this.table, sorts:this.sorts})
   let rows=[...(data[this.table]||[])]
   // Valid but different tie ordering for independently planned offset queries.
   rows.sort((a,b)=>{
    for(const {key,ascending} of this.sorts){const c=String(a[key]).localeCompare(String(b[key]));if(c)return ascending?c:-c}
    const c=a.id.localeCompare(b.id);return this.lo===0?c:-c
   })
   rows=rows.slice(this.lo,this.hi+1)
   if(fault && this.table==='daily_expenses' && this.lo===1000) rows[0]={...data[this.table][0]}
   return Promise.resolve({data:rows,error:null}).then(resolve)
  }
 }
 const context={supabase:{from:table=>new Query(table)},pageSize:1000,applyDateRange:q=>q}
 vm.createContext(context)
 const out=await vm.runInContext(`(async()=>{${source};return {revenueRows,dailyExpenseRows:rawDailyExpenseRows,supplierPurchases:rawSupplierPurchases}})()`,context)
 return {out,orders}
}
const fixed=await load(querySource,fixture)
for(const [table,key] of [['daily_revenue_entries','revenueRows'],['daily_expenses','dailyExpenseRows'],['supplier_purchases','supplierPurchases']]) {
 assert.deepEqual(JSON.parse(JSON.stringify(expected(fixed.out[key]))),expected(fixture[table]))
 assert.equal(new Set(fixed.out[key].map(r=>r.id)).size,3107)
}
for(const request of fixed.orders) assert.equal(request.sorts.at(-1).key,'id')
const oldSource=querySource.replaceAll(".order('id', { ascending: true })",'')
const broken=await load(oldSource,fixture)
assert.ok(new Set(broken.out.dailyExpenseRows.map(r=>r.id)).size<3107,'old order must reproduce lost/overlapping rows')
await assert.rejects(componentInputsFingerprint(broken.out,'2026-01'),/duplicate input identity/)
await componentInputsFingerprint(fixed.out,'2026-01')
await componentInputsFingerprint(fixed.out,'2026-09')
const fault=await load(querySource,fixture,true)
await assert.rejects(componentInputsFingerprint(fault.out,'2026-01'),/duplicate input identity/,'guard is not bypassed')
const fallback=await load(querySource,{...fixture,daily_revenue_entries:[],daily_revenue:fixture.daily_revenue_entries})
assert.equal(fallback.out.revenueRows.length,3107)
assert.deepEqual(JSON.parse(JSON.stringify(expected(fallback.out.revenueRows))),expected(fixture.daily_revenue_entries))
console.log('PASS profitability pagination: full row parity for 3 sources, multi-page date ties, revenue fallback, old-order reproduction and intact identity guard')
