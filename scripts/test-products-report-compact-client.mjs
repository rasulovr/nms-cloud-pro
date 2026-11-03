import fs from 'node:fs'
import assert from 'node:assert/strict'

// Reuse the actual application extraction harness, pinned to the released PR27
// oracle. Fixture-only: this does not imply live source-order or latency parity.
const tests = fs.readFileSync('scripts/test-products-report-performance.mjs', 'utf8')
const prefix = tests.slice(0, tests.indexOf('\nlet equivalenceCases=')).replace('ee04297604aa03919624a345d092f4d2ecc28286', '848617c66f645aa84778b5cd2157300ef18cbf61')
const viewStart = tests.indexOf('function view(source,report,overrides={})')
const viewEnd = tests.indexOf('\nfor(const options of', viewStart)
const api = await import('data:text/javascript;base64,' + Buffer.from(prefix + '\n' + tests.slice(viewStart, viewEnd) + '\nexport {harness,baseline,candidate,sourceRows,clone,view,delay};').toString('base64'))
const {harness,baseline,candidate,clone,view,delay}=api
// Current database schema has deleted_at, not these hypothetical legacy flags.
const data=clone(api.sourceRows).map(row=>{for(const key of ['status','cancelled_at','is_canceled'])delete row[key];return row})
function compactRows(rows,args) {
  return rows.filter(row=>!row.deleted_at && (!args.p_branch_id||row.branch_id===args.p_branch_id) && (!args.p_date_from||row.purchase_date>=args.p_date_from) && (!args.p_date_to_exclusive||row.purchase_date<args.p_date_to_exclusive)).map(row=>({
    id:row.id,supplier_id:row.supplier_id,branch_id:row.branch_id,purchase_date:row.purchase_date,created_at:row.created_at,invoice_number:row.invoice_number,deleted_at:row.deleted_at,
    suppliers:row.suppliers,branches:row.branches,supplier_purchase_items:row.supplier_purchase_items.slice().sort((a,b)=>a.id<b.id?-1:a.id>b.id?1:0).map(item=>({...item,supplier_products:{name:item.supplier_products.name,category:item.supplier_products.category??null,base_unit:item.supplier_products.base_unit??null}}))
  }))
}
function make(options={},behavior={}) {
  const h=harness(candidate,{...options,data:options.data||data})
  h.context.isAdmin=behavior.admin!==false
  const original=h.context.supabase.rpc
  h.context.supabase.rpc=async(name,args)=>{
    if(name!=='rms_products_report_source_v1')return original(name,args)
    h.calls.push({kind:'compact',name,args})
    if(behavior.lag)await delay(behavior.lag)
    if(behavior.error)return {data:null,error:behavior.error,status:behavior.status}
    const rows=compactRows(options.data||data,args)
    const result={version:1,complete:true,legacyRequired:false,rows,source_count:(options.data||data).length,matching_count:rows.length,purchase_count:rows.length,item_count:rows.reduce((n,row)=>n+row.supplier_purchase_items.length,0)}
    return {data:behavior.result?behavior.result(result):result,error:null,status:200}
  }
  return h
}
let cases=0
for(const options of [{},{scope:'b1'},{month:'2026-10'},{month:'2026-09'},{month:'year:2026'},{month:'2024-02'},{from:'2026-09-13',to:'2026-10-12'},{to:'2026-09-15'},{from:'2026-10-01'},{mode:'last'},{scope:'missing'},{data:[]}]){
  // The full RPC's nested order is explicit; normalize fixtures to that source.
  const rows=clone(options.data||data);for(const row of rows)row.supplier_purchase_items.sort((a,b)=>a.id<b.id?-1:a.id>b.id?1:0)
  const old=harness(baseline,{...options,data:rows}),next=make({...options,data:rows})
  old.context.isAdmin=true
  await old.load();await next.load()
  assert.deepEqual(next.result(),old.result(),'released calculation parity '+JSON.stringify(options))
  assert.equal(next.calls.length,1,'one compact read, including empty authoritative response')
  assert.equal(next.calls[0].kind,'compact')
  if(options.month==='2026-10')assert.deepEqual(clone(next.calls[0].args),{p_date_from:'2026-09-01',p_date_to_exclusive:'2026-11-01',p_branch_id:null})
  if(options.from==='2026-09-13')assert.equal(next.calls[0].args.p_date_from,'2026-08-13','amount prior-month and equal-span ranges both included')
  if(options.scope==='b1')assert.equal(next.calls[0].args.p_branch_id,'b1')
  cases++
}
const legacy=harness(baseline,{month:'2026-10',data});await legacy.load()
for(const reason of ['ambiguous_purchase_order','global_source_limit','missing_product_metadata']){
  const h=make({month:'2026-10'},{result:()=>({version:1,complete:false,legacyRequired:true,reason,rows:[],source_count:reason==='global_source_limit'?50001:data.length,matching_count:reason==='global_source_limit'?null:1,purchase_count:0,item_count:0})})
  await h.load();assert.deepEqual(h.result(),legacy.result(),reason+' preserves released path')
  assert.equal(h.calls.filter(c=>c.kind==='compact').length,1)
  assert.equal(h.calls.filter(c=>c.name==='rms_supplier_purchases_full').length,1)
}
for(const behavior of [{error:{code:'PGRST202',message:'Missing function'}},{error:{message:'Transient unavailable'},status:500}]){
  const h=make({month:'2026-10'},behavior);await h.load();assert.deepEqual(h.result(),legacy.result())
}
for(const behavior of [{error:{code:'42501',message:'Permission denied'}},{error:{message:'Forbidden'},status:403},{error:{message:'Unauthorized'},status:401}]){
  const h=make({},behavior);await h.load();assert.ok(h.result().error);assert.equal(h.result().rows.length,0);assert.equal(h.calls.length,1,'authorization cannot fall back')
}
const corrupt=[r=>({...r,legacyRequired:undefined}),r=>({...r,source_count:undefined}),r=>({...r,matching_count:r.matching_count+1}),r=>({...r,source_count:0}),r=>({...r,legacyRequired:true,complete:false,rows:[],purchase_count:0,item_count:0,reason:'unexpected'}),r=>({...r,rows:r.rows.map((p,i)=>i?p:{...p,purchase_date:undefined})}),r=>({...r,rows:r.rows.map((p,i)=>i?p:{...p,supplier_purchase_items:p.supplier_purchase_items.map((item,j)=>j?item:{...item,quantity:undefined})})}),r=>({...r,complete:false}),r=>({...r,purchase_count:r.purchase_count+1}),r=>({...r,item_count:r.item_count+1}),r=>({...r,version:2}),r=>({...r,rows:[...r.rows,r.rows[0]],purchase_count:r.purchase_count+1}),r=>({...r,rows:r.rows.map((p,i)=>i? p:{...p,supplier_purchase_items:[p.supplier_purchase_items[0],p.supplier_purchase_items[0]]})}),()=>({version:1,complete:false,legacyRequired:true,rows:[data[0]]})]
for(const result of corrupt){const h=make({},{result});await h.load();assert.match(h.result().error,/неполные данные/);assert.equal(h.result().rows.length,0);assert.equal(h.calls.length,1,'invalid response never publishes or takes partial fallback')}
const nonAdmin=make({month:'2026-10'},{admin:false});await nonAdmin.load();assert.equal(nonAdmin.calls.length,1);assert.equal(nonAdmin.calls[0].name,'rms_supplier_purchases_full');assert.deepEqual(nonAdmin.result(),legacy.result())
const repeat=make();await repeat.load();await repeat.load();assert.equal(repeat.calls.length,2,'fresh scope on repeat')
const stale=make({},{lag:15});const pending=stale.load();stale.state.request.current++;await pending;assert.equal(stale.calls.length,1);assert.equal(stale.state.writes.filter(w=>w.kind==='report'&&!w.value.loading).length,0,'stale compact response cannot commit or start legacy')
const oracle=harness(baseline,{month:'2026-10',data});await oracle.load();const fast=make({month:'2026-10'});await fast.load()
for(const opts of [{},{productsReportSearch:'product 1'},{productsReportCategory:'Category 2'},{productsReportSupplierId:'s1'},{productsReportSort:{field:'name',dir:'asc'}},{productsReportSort:{field:'quantity',dir:'desc'}},{productsReportPage:2},{productsReportPage:999},{productsPriceCompareMode:'last'},{productsPriceDynamicsTab:'down'}])assert.deepEqual(view(candidate,fast.state.report,opts),view(baseline,oracle.state.report,opts))
console.log(JSON.stringify({fixtureOnly:true,compactParityCases:cases,viewCases:10,allDatesComplete:true,selectedPeriodUnion:true,ambiguityUsesLegacy:true,nonAdminUnchanged:true,incompleteAndAuthTerminal:true,staleAndRepeat:'passed'}))
