import fs from 'node:fs'
import vm from 'node:vm'
import assert from 'node:assert/strict'
import {execFileSync} from 'node:child_process'

const file='src/main.parts/part-04.jsxpart'
const baseline=execFileSync('git',['show','ee04297604aa03919624a345d092f4d2ecc28286:'+file],{encoding:'utf8'})
const candidate=fs.readFileSync(file,'utf8')
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms))
const serialize=value=>JSON.stringify(value,(_key,v)=>v instanceof Set?[...v]:v instanceof Map?[...v.entries()]:v)
const clone=value=>JSON.parse(serialize(value))
const months=['2026-10','2026-09','2026-08','2025-10','2024-02','2024-03']
const sourceRows=Array.from({length:1204},(_,i)=>{
  const date=months[i%months.length]+'-'+String(i%28+1).padStart(2,'0')
  const product=i%79, quantity=i%5+1, price=(i%23+1)/10
  return {id:'purchase-'+String(i).padStart(5,'0'),supplier_id:'s'+i%5,branch_id:'b'+i%3,purchase_date:date,created_at:date+'T'+String(i%24).padStart(2,'0')+':00:00Z',invoice_number:'INV-'+i,
    suppliers:{name:'Synthetic supplier '+i%5},branches:{name:'Synthetic branch '+i%3},deleted_at:i%101===0?'2026-10-18':null,
    ...(i%103===0?{status:'cancelled'}:{}),...(i%107===0?{cancelled_at:'2026-10-18'}:{}),...(i%109===0?{is_canceled:true}:{}),
    supplier_purchase_items:[{id:'item-'+i,product_id:'product-'+product,quantity,unit:i%17===0?'g':'kg',unit_price:price,total_amount:i%7===0?0:quantity*price,supplier_products:{name:'Synthetic product '+product,category:'Category '+product%4,base_unit:'kg'}},
      ...(i%13===0?[{id:'zero-'+i,product_id:'zero',quantity:0,unit:'pcs',unit_price:0,total_amount:0,supplier_products:{name:'Zero line',base_unit:'pcs'}}]:[])]}
}).sort((a,b)=>b.purchase_date.localeCompare(a.purchase_date)||b.created_at.localeCompare(a.created_at)||a.id.localeCompare(b.id))
const unitHelpers=fs.readFileSync('src/main.parts/part-00.jsxpart','utf8').split('// v257')[0]
function loadCode(source){const begin=source.indexOf('  const beginRmsProductsReportProgress');return source.slice(begin,source.indexOf('\n  useEffect(() => {\n    if (!branches.length) return',begin))}
function harness(source,{scope='all',month='all',from='',to='',mode='period',data=sourceRows,rpcFails=false,directFails=false,mainProjectionFails=false,failDirectAfter=Infinity,accessDenied=false,rpcStatus=0,directStatus=0,workspaceStatus=0,lag=0}={},shared){
  const state=shared||{report:{},progress:{},request:{current:0},timer:{current:null},timers:new Map(),timerCounter:0,writes:[]}
  const calls=[];let active=0,maxActive=0
  const context={Date,Map,Set,Promise,console,
    branchFilter:scope,monthFilter:month,productsReportDateFrom:from,productsReportDateTo:to,productsPriceCompareMode:mode,isAdmin:true,
    reportBranchesLoaded:true,productsReportSelectionKey:JSON.stringify([scope,month,from,to]),
    rmsProductsReportRequestRef:state.request,rmsProductsReportProgressTimerRef:state.timer,
    branches:[0,1,2].map(i=>({id:'b'+i,name:'Synthetic branch '+i})),
    parseNum:x=>Number(x)||0,normalizeSalesKey:x=>String(x).toLowerCase(),todayISO:()=> '2026-10-18',parseISODateLocal:iso=>new Date(iso+'T12:00:00Z'),toLocalISODate:d=>d.toISOString().slice(0,10),
    rmsNextMonthStart:key=>{const d=new Date(key+'-01T12:00:00Z');d.setUTCMonth(d.getUTCMonth()+1);return d.toISOString().slice(0,10)},
    setRmsProductsReport:value=>{state.report=typeof value==='function'?value(state.report):value;state.writes.push({kind:'report',value:clone(state.report)})},
    setRmsProductsReportProgress:value=>{state.progress=typeof value==='function'?value(state.progress):value;state.writes.push({kind:'progress',value:clone(state.progress)})},
    window:{setTimeout:f=>{const id=++state.timerCounter;state.timers.set(id,f);return id},clearTimeout:id=>state.timers.delete(id)},
    fetchRmsSuppliersWorkspace:async()=>{calls.push({kind:'workspace'});return {data:{supplier_purchases:clone(data)},error:null}},
    supabase:{rpc:async(name,args)=>{calls.push({kind:'rpc',name,args});active++;maxActive=Math.max(maxActive,active);await delay(lag);active--;
      if(name==='rms_suppliers_workspace')return workspaceStatus?{data:null,error:{message:'Forbidden'},status:workspaceStatus}:{data:{supplier_purchases:clone(data)},error:null}
      if(rpcStatus)return {data:null,error:{message:'Forbidden'},status:rpcStatus}
      if(accessDenied)return {data:null,error:{code:'42501',message:'Synthetic permission denied'}}
      return rpcFails?{data:null,error:new Error('Synthetic RPC unavailable')}:{data:clone(data),error:null}
    },from(table){const filters=[];let start=0,end=999;const q=new Proxy({}, {get(_,key){if(key==='then')return (ok,no)=>{calls.push({kind:'direct',table,start,end});let rows=data;
        for(const [op,k,v]of filters){if(op==='eq')rows=rows.filter(r=>r[k]===v);if(op==='gte')rows=rows.filter(r=>r[k]>=v);if(op==='lt')rows=rows.filter(r=>r[k]<v);if(op==='is')rows=rows.filter(r=>r[k]==null)}
        return Promise.resolve(directStatus?{data:null,error:{message:'Forbidden'},status:directStatus}:(directFails||start>=failDirectAfter||(mainProjectionFails&&filters.some(([op,value])=>op==='select'&&value.includes('cancelled_at'))))?{data:null,error:Error('Synthetic direct unavailable')}:{data:clone(rows.slice(start,end+1)),error:null}).then(ok,no)}
        return (...args)=>{if(key==='range')[start,end]=args;else filters.push([key,...args]);return q}}});return q}}
  }
  vm.createContext(context);vm.runInContext(unitHelpers+loadCode(source)+';globalThis.load = loadRmsProductsReport',context)
  return {load:()=>context.load(),context,state,calls,maxActive:()=>maxActive,result:()=>{const result=clone(state.report);delete result.selectionKey;return result}}
}

let equivalenceCases=0
for(const options of [{},{scope:'b1'},{month:'2026-10'},{month:'2026-09'},{month:'year:2026'},{month:'2024-02'},{from:'2026-09-13',to:'2026-10-12'},{to:'2026-09-15'},{from:'2026-10-01'},{mode:'last'},{scope:'missing'},{data:[]}]){
  const old=harness(baseline,options),next=harness(candidate,options)
  await old.load();await next.load();assert.deepEqual(next.result(),old.result(),'financial/metadata equivalence '+JSON.stringify({...options,data:options.data?'empty':undefined}));equivalenceCases++

}
for(const fallback of [{rpcFails:true},{rpcFails:true,directFails:true}]){
const old=harness(baseline,{month:'2026-10',...fallback}),next=harness(candidate,{month:'2026-10',...fallback});await old.load();await next.load();assert.deepEqual(next.result(),old.result(),'legacy fallback equivalence');equivalenceCases++
}
// Nested item order is explicit in full RPC but unspecified in direct/workspace
// fallback. Both fallback paths must reproduce full-source results, including
// equal-date items and amount/price comparisons, without sorting purchase ties.
const item=(id,price)=>({id,product_id:'source-tie',quantity:2,unit:'kg',unit_price:price,total_amount:price*2,supplier_products:{name:'Synthetic source tie',category:'Parity',base_unit:'kg'}})
const tiedPurchase=(id,date,prices)=>({id,supplier_id:'s0',branch_id:'b0',purchase_date:date,created_at:'2026-10-18T00:00:00Z',invoice_number:id,suppliers:{name:'Synthetic supplier 0'},deleted_at:null,supplier_purchase_items:[item('00000000-0000-0000-0000-000000000001',prices[0]),item('ffffffff-ffff-ffff-ffff-ffffffffffff',prices[1])]})
const fullSource=[tiedPurchase('purchase-z','2026-10-18',[1,9]),tiedPurchase('purchase-a','2026-10-18',[2,8]),...clone(sourceRows),tiedPurchase('purchase-prior','2026-09-18',[3,7])]
for(const p of fullSource)p.supplier_purchase_items.sort((a,b)=>a.id<b.id?-1:a.id>b.id?1:0)
const fallbackSource=clone(fullSource);for(const p of fallbackSource)p.supplier_purchase_items.reverse()
const inputBefore=serialize(fallbackSource)
let sourcePathCases=0
for(const options of [{},{month:'2026-10'},{scope:'b0'},{from:'2026-09-01',to:'2026-10-18'},{mode:'last'}]){
 const reference=harness(baseline,{...options,data:fullSource});await reference.load()
 for(const fallback of [{rpcFails:true},{rpcFails:true,mainProjectionFails:true},{rpcFails:true,directFails:true},{rpcFails:true,failDirectAfter:1000}]){
  const test=harness(candidate,{...options,data:fallbackSource,...fallback});await test.load()
  assert.deepEqual(test.result(),reference.result(),'full-source parity '+JSON.stringify({options,fallback}))
  assert.equal(test.result().rows.find(r=>r.product_id==='source-tie').latest_price,8,'purchase ties retain original order')
  if(!options.month&&!options.scope&&!options.from&&!options.mode&&!fallback.directFails)assert.ok(test.calls.filter(c=>c.kind==='direct').some(c=>c.start===1000),'fallback completes multiple pages')
  sourcePathCases++
 }
}
assert.equal(serialize(fallbackSource),inputBefore,'fallback normalization never mutates supplied rows')
// Exercise the normalization itself without the harness cloning its source.
const normalizeStart=candidate.indexOf('      const orderFallbackPurchaseItemsLikeFullRpc =')
const normalizeEnd=candidate.indexOf('      const isProductsReportAccessError',normalizeStart)
const immutable=clone(fallbackSource.slice(0,2));immutable.forEach(p=>{Object.freeze(p.supplier_purchase_items);Object.freeze(p)});Object.freeze(immutable)
const normalized=vm.runInNewContext(candidate.slice(normalizeStart,normalizeEnd)+';orderFallbackPurchaseItemsLikeFullRpc(input)',{input:immutable})
assert.deepEqual(Array.from(normalized,p=>p.id),['purchase-z','purchase-a'])
assert.equal(normalized[0].supplier_purchase_items[0].id,'00000000-0000-0000-0000-000000000001')
assert.notEqual(normalized[0],immutable[0]);assert.notEqual(normalized[0].supplier_purchase_items,immutable[0].supplier_purchase_items)

const old=harness(baseline,{month:'2026-10'}),next=harness(candidate,{month:'2026-10'});await old.load();await next.load()
assert.equal(next.calls.filter(c=>c.kind==='rpc').length,1,'one raw history read per report load')
const beforeReads=old.calls.filter(c=>c.kind==='rpc').length
assert.ok(beforeReads>1)
await next.load();assert.equal(next.calls.filter(c=>c.kind==='rpc').length,2,'refresh/reopen reads fresh history')
const separate=harness(candidate);await separate.load();assert.equal(separate.calls.length,1,'separate component has separate source')

// A stale request cannot overwrite a newer filter or its progress, nor start
// additional fallback reads. This is the actual loader, not a rewrite.
const stale=harness(candidate,{lag:20});const first=stale.load();await delay(2)
const fresh=harness(candidate,{scope:'b1'},stale.state);await fresh.load();await first
assert.equal(fresh.state.report.selectionKey,fresh.context.productsReportSelectionKey)
assert.ok(fresh.state.report.detailRows.every(r=>r.branch_id==='b1'))
assert.equal(stale.calls.length,1,'stale load stops after outstanding source read')
const goodTimer=[...fresh.state.timers.values()][0];const again=harness(candidate,{scope:'b2',lag:10},fresh.state);const pending=again.load();goodTimer();assert.equal(again.state.progress.status,'running','old timer cannot dismiss newer progress');await pending
const denied=harness(candidate,{accessDenied:true});await denied.load();assert.equal(denied.state.report.rows.length,0);assert.match(denied.state.report.error,/permission denied/);assert.equal(denied.calls.length,1,'denied source never falls back')
const unmounted=harness(candidate,{lag:10});const underway=unmounted.load();unmounted.state.request.current++;await underway;assert.equal(unmounted.state.writes.filter(w=>w.kind==='report'&&!w.value.loading).length,0)

for(const options of [{rpcStatus:401},{rpcStatus:403},{rpcFails:true,directStatus:403},{rpcFails:true,directFails:true,workspaceStatus:403}]){
  const forbidden=harness(candidate,options);await forbidden.load();assert.equal(forbidden.state.report.rows.length,0);assert.match(forbidden.state.report.error,/Forbidden/)
  if(options.rpcStatus)assert.equal(forbidden.calls.length,1,'HTTP auth error cannot fall back')
  if(options.directStatus)assert.equal(forbidden.calls.filter(c=>c.kind==='direct').length,1,'HTTP auth error cannot try a different projection')
}

// Exercise the actual mount/filter effect and immediate display guard.
const effectStart=candidate.indexOf('  useEffect(() => {\n    if (!isProductsReportTab || !reportBranchesLoaded) return')
const effectEnd=candidate.indexOf('\n\n  useEffect(',effectStart)
assert.ok(effectStart>0)
const boot=harness(candidate);boot.context.reportBranchesLoaded=false;boot.context.isProductsReportTab=true
let effect;boot.context.useEffect=fn=>{effect=fn};vm.runInContext(candidate.slice(effectStart,effectEnd),boot.context)
assert.equal(effect(),undefined);assert.equal(boot.calls.length,0,'branch lookup must settle before source read')
boot.context.reportBranchesLoaded=true;const cleanup=effect();assert.equal(boot.calls.length,1);cleanup();await delay(2)
assert.equal(boot.state.writes.filter(w=>w.kind==='report'&&!w.value.loading).length,0,'effect cleanup prevents unmounted commit')
const reopened=harness(candidate);reopened.context.isProductsReportTab=true;let reopenEffect;reopened.context.useEffect=fn=>{reopenEffect=fn};vm.runInContext(candidate.slice(effectStart,effectEnd),reopened.context)
const close=reopenEffect();await delay(5);close();reopenEffect();await delay(5);assert.equal(reopened.calls.length,2,'tab re-entry refreshes rather than reusing stale history')
const displayStart=candidate.indexOf('  const productsReportSelectionKey =');const displayEnd=candidate.indexOf('\n  const [supplierReportSort',displayStart)
const displayContext={rmsProductsReportData:next.state.report,branchFilter:'all',monthFilter:'2026-10',productsReportDateFrom:'',productsReportDateTo:''}
assert.equal(vm.runInNewContext(candidate.slice(displayStart,displayEnd)+';rmsProductsReport.rows.length',displayContext),next.state.report.rows.length)
displayContext.monthFilter='2026-09'
assert.equal(vm.runInNewContext(candidate.slice(displayStart,displayEnd)+';rmsProductsReport.rows.length',{...displayContext}),0,'old selection hidden synchronously')

// Existing filter/sort/paging code is exercised unchanged against identical data.
function view(source,report,overrides={}){
 const start=source.indexOf('  const filteredProductReportRows = useMemo(');const end=source.indexOf('\n  const setProductSort',start)
 const context={rmsProductsReport:report,productsReportSearch:'',productsReportCategory:'all',productsReportSupplierId:'all',productsReportSort:{field:'amount',dir:'desc'},productsPriceCompareMode:'period',productsPriceDynamicsTab:'up',productsReportDateFrom:'',productsReportDateTo:'',monthFilter:'all',productsReportPage:1,productsReportDetailsOpen:false,parseNum:x=>Number(x)||0,normalizeSalesKey:x=>String(x).toLowerCase(),useMemo:f=>f(),...overrides}
 vm.createContext(context);vm.runInContext(source.slice(start,end)+';globalThis.output={filteredProductReportRows,filteredProductTotals,visibleProductReportRows,productReportTotalPages,safeProductsReportPage,productUnitMismatchRows,activeProductPriceDynamicsRows}',context);return clone(context.output)
}
for(const options of [{},{productsReportSearch:'product 1'},{productsReportCategory:'Category 2'},{productsReportSupplierId:'s1'},{productsReportSort:{field:'name',dir:'asc'}},{productsReportSort:{field:'quantity',dir:'desc'}},{productsReportPage:2},{productsReportPage:999},{productsPriceCompareMode:'last'},{productsPriceDynamicsTab:'down'}])assert.deepEqual(view(candidate,next.state.report,options),view(baseline,old.state.report,options),'view parity '+JSON.stringify(options))

console.log(JSON.stringify({fixtureOnly:true,equivalenceCases,sourcePathCases,currentMonthFullReadsBefore:beforeReads,currentMonthFullReadsAfter:1,viewCases:10,staleAndTimers:'passed',permissionDenial:'terminal',financialAndMetadataParity:'exact'}))
