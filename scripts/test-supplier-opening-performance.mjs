import fs from 'node:fs'
import vm from 'node:vm'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { performance } from 'node:perf_hooks'

// Executes the actual component loader with read-only delayed fixtures.
// These timings describe this synthetic network, not production or a user session.
const journalFile = 'src/main.parts/part-04.jsxpart'
const readVersion = (path, old) => old ? execFileSync('git', ['show', '7d8ad962581e0667a2379766cb21ef7ea7866b07:' + path], {encoding:'utf8'}) : fs.readFileSync(path,'utf8')
function builtSource(old=false) {
  const assembled=Array.from({length:6},(_,i)=>readVersion(`src/main.parts/part-0${i}.jsxpart`,old)).join('')
  const transform=vm.runInNewContext(readVersion('build/rms-secure-auth-transform.js',old).replace('export function rmsSecureAuthTransform','function rmsSecureAuthTransform')+'\nrmsSecureAuthTransform')
  return transform(assembled)
}
const candidate=builtSource(),baseline=builtSource(true)
const delay = ms => new Promise(resolve => setTimeout(resolve, ms))
const plain = value => JSON.parse(JSON.stringify(value))
const suppliers = [{id:'s1',name:'First',is_active:true},{id:'s2',name:'Second',is_active:true}]
const purchases = Array.from({length:1501}, (_,i) => ({
  id:`p${i}`,supplier_id:i%2?'s2':'s1',legal_entity_id:i%3?'l1':'l2',
  purchase_date:i%2?'2026-10-20':'2026-10-01',created_at:`2026-10-20T00:00:00Z`,
  total_amount:i+1,invoice_number:`INV-${i}`,deleted_at:i===7?'2026-10-21':null,
  suppliers:{name:i%2?'Second':'First'},supplier_purchase_items:[{id:`item${i}`,quantity:2,unit_price:(i+1)/2,total_amount:i+1}]
}))
const payments=[{id:'pay1',amount:30},{id:'pay2',amount:10,deleted_at:'2026-10-01'},{id:'pay3',amount:2,comment:'v255b: merged into payment'}]
const invoices=Array.from({length:1108},(_,i)=>({id:`e${i}`,invoice_number:`EQ-${i}`,amount:i+1}))
const links=[{id:'link1',purchase_id:'p1',e_invoice_id:'e1'}]
const fixture={suppliers,legal_entities:[{id:'l1',name:'Company'}],supplier_products:[{id:'prod',is_active:true}],supplier_balances_v2:[{supplier_id:'s1',balance:80}],supplier_purchases:purchases,supplier_payments:payments,supplier_opening_debts:[{id:'opening',amount:80}],supplier_legal_entity_status:[],user_profiles:[{id:'u1',full_name:'Test User'}],supplier_e_invoices:invoices,supplier_e_invoice_purchase_links:links}

function harness(source,{internal=false,lag=5,purchaseLag=35,failTable='',failOffset=0,workspaceError=false,emptyPurchases=false,largeMetadata=false}={}) {
  const purchaseRows=emptyPurchases?[]:purchases
  const localFixture={...fixture}
  if(largeMetadata)for(const table of ['supplier_legal_entity_status','supplier_e_invoice_purchase_links','supplier_opening_debts'])localFixture[table]=Array.from({length:1001},(_,i)=>({id:`${table}-${i}`,supplier_id:'s1',legal_entity_id:'l1',is_active:true,amount:i+1}))
  const component=source.slice(source.indexOf('function Suppliers('))
  const start=component.indexOf('  function normalizeSupplierPurchasesFullPayload(')
  const end=component.indexOf('  function userName(')
  assert.ok(start>0 && end>start,'loader extraction boundaries')
  const loader=component.slice(start,end)
  const states={},writes=[],calls=[],refs={},started=performance.now()
  const context={console,Promise,Map,Set,Date,Math,Number,String,Array,Boolean,Error,setTimeout,clearTimeout,
    getInternalSessionStorage:()=>internal?{rms_internal:true}:null,
    parseNum:x=>Number(x)||0,fixtureFailure:{table:failTable,offset:failOffset},
  }
  // Keep ref and state setter discovery resilient to new load-state fields.
  for(const match of component.slice(0,start).matchAll(/const\s+(\w+)\s*=\s*useRef\(([^\n]*)\)/g)) {
    let value;try{value=vm.runInNewContext(match[2])}catch{value=null}
    context[match[1]]=refs[match[1]]={current:value}
  }
  for(const name of new Set([...component.matchAll(/\b(set[A-Z]\w*)\s*\(/g)].map(m=>m[1]))) {
    context[name]=value=>{if(typeof value==='function')value=value(states[name]);states[name]=value;writes.push({name,value:plain(value??null),ms:performance.now()-started})}
  }
  async function result(call) {
    calls.push({...call,ms:performance.now()-started})
    await delay(call.table==='supplier_purchases'||call.table==='rms_supplier_purchases_page_secure'?purchaseLag:lag)
    if(call.table===context.fixtureFailure.table && (call.from??call.offset??0)>=context.fixtureFailure.offset)return {data:null,error:new Error('fixture unavailable')}
    let rows=call.table==='supplier_purchases'?purchaseRows:(localFixture[call.table]||[])
    for(const [key,value] of call.is||[]) rows=rows.filter(r=>(r[key]??null)===value)
    if(call.from!=null)rows=rows.slice(call.from,call.to+1)
    if(call.limit!=null)rows=rows.slice(0,call.limit)
    return {data:rows,error:null}
  }
  context.supabase={from(table){
    const call={table};let promise
    const q=new Proxy({}, {get(_target,key){
      if(key==='then')return (resolve,reject)=>(promise??=result(call)).then(resolve,reject)
      return (...args)=>{if(key==='range')[call.from,call.to]=args;if(key==='limit')call.limit=args[0];if(key==='is')(call.is??=[]).push(args);if(key==='select')call.select=args[0];return q}
    }});return q
  },async rpc(table,args){
    if(table==='rms_supplier_purchases_page_secure'){
      const r=await result({table,offset:args.p_offset});return r.error?r:{data:{rows:purchaseRows.slice(args.p_offset,args.p_offset+args.p_limit),total_count:purchaseRows.length},error:null}
    }
    if(table==='rms_supplier_purchases_full'){calls.push({table});return {data:purchaseRows,error:null}}
    throw new Error(`Unexpected fixture RPC: ${table}`)
  }}
  context.fetchRmsSuppliersWorkspace=async()=>{
    calls.push({table:'workspace',ms:performance.now()-started});await delay(purchaseLag)
    return workspaceError?{data:null,error:new Error('workspace forbidden')}:{error:null,data:{...fixture,supplier_balances:fixture.supplier_balances_v2,supplier_purchases:purchaseRows.slice(0,500),supplier_payments:payments,supplier_products:fixture.supplier_products}}
  }
  if(refs.supplierMounted)refs.supplierMounted.current=true
  const api=vm.runInNewContext(loader+'\n({load,fetchAllSupplierPurchasesRows,fetchSupplierPurchasesFullRowsViaRpc,requireSupplierData:typeof requireSupplierData === \"function\" ? requireSupplierData : null})',context)
  return {api,states,writes,calls,refs,context,started,elapsed:()=>performance.now()-started}
}

function finalData(run){return Object.fromEntries(['setSuppliers','setPurchases','setPayments','setEInvoices','setEInvoiceLinks','setOpeningDebts','setProfiles','setLegalEntities','setProducts','setBalances','setSupplierEntityStatuses'].map(k=>[k,plain(run.states[k])]))}
for(const internal of [false,true]){
  const before=harness(baseline,{internal}),after=harness(candidate,{internal})
  const beforeStart=performance.now();await before.api.load();const beforeMs=performance.now()-beforeStart
  const afterStart=performance.now();await after.api.load();const afterMs=performance.now()-afterStart
  assert.deepEqual(finalData(after),finalData(before),'Complete final datasets must match baseline')
  assert.equal(after.states.setPurchases.length,1501,'No page-size cap on complete history')
  assert.equal(after.states.setEInvoices.length,1108,'No 500-row e-invoice fallback')
  assert.ok(after.calls.length<=before.calls.length,'No extra reads for the small fixture despite complete opening-debt paging')
  assert.equal(after.calls.filter(c=>['supplier_purchases','supplier_payments','supplier_e_invoices'].includes(c.table)&&c.limit===500).length,0,'Duplicate initial 500-row reads removed')
  if(!internal)assert.ok(afterMs<beforeMs*.85,`Reduced fixture waterfall: ${afterMs} vs ${beforeMs}`)
  const supplierMs=after.writes.find(w=>w.name==='setSuppliers').ms-(afterStart-after.started)
  console.log(JSON.stringify({test:'supplier fixture waterfall',internal,beforeMs:+beforeMs.toFixed(1),afterMs:+afterMs.toFixed(1),beforeReads:before.calls.length,afterReads:after.calls.length,supplierPublishedMs:+supplierMs.toFixed(1),purchases:1501,eInvoices:1108,financialDatasets:'identical'}))
}

// Execute the actual journal filter/pagination/aggregate block with every page
// and a cross-product of relevant filters, not a reimplementation of its sums.
function journal(source,{filters={},page=1,pageSize=10,focus=''}={}) {
  const start=source.indexOf('  const recentPurchasesPageSizeNumber =')
  const end=source.indexOf('  const supplierJournalSelectedSupplier =',start)
  assert.ok(start>0&&end>start)
  const context={purchases,suppliers,activeSupplierIds:new Set(suppliers.map(s=>s.id)),supplierEntityStatusMap:new Map(),
    recentPurchasesPageSize:pageSize,recentPurchasesPage:page,purchaseJournalFilters:filters,purchaseJournalFocusId:focus,
    parseNum:x=>Number(x)||0,useMemo:fn=>fn(),isSupplierActiveForLegal:()=>true,
    purchaseLinkedEInvoices:id=>id==='p1'?[{invoice_number:'EQ-1'}]:[],
    supplierPurchaseReconciliation:p=>({eInvoiceNumber:p.id==='p3'?'EQ-3':''})}
  return plain(vm.runInNewContext(source.slice(start,end)+';\n({total:supplierJournalTotal,rows:recentPurchasesRows.map(p=>p.id),count:filteredPurchases.length,page:safeRecentPurchasesPage})',context))
}
const filters=[{}, {date_from:'2026-10-15'}, {date_to:'2026-10-15'}, {supplier_id:'s1'}, {legal_entity_id:'l2'}, {invoice:'INV-12'}, {e_invoice:'EQ-1'}, {e_invoice:'EQ-3'}, {supplier_id:'s2',date_from:'2026-10-10',legal_entity_id:'l1'}, {invoice:'missing'}]
for(const filter of filters)for(const pageSize of [10,20,50])for(const page of [1,2,999]) {
  const options={filters:filter,pageSize,page}
  const actual=journal(candidate,options),old=journal(baseline,options)
  assert.deepEqual(actual,old,'Filters, pages, complete totals, and reconciled e-invoice search retain baseline semantics')
  assert.deepEqual(actual.total,journal(candidate,{...options,page:1,pageSize:10}).total,'Totals must not depend on visible page')
}
assert.equal(journal(candidate,{focus:'p1500'}).count,1,'Reopening off-page purchase can focus it')
assert.equal(journal(candidate,{focus:'p7'}).count,0,'Cancelled purchase remains excluded')
console.log('PASS: date/supplier/legal-entity/invoice/e-invoice filters, page sizes, page clamp, focus/reopen and full-period totals')

for(const internal of [false,true]) {
  const early=harness(candidate,{internal})
  const pending=early.api.load()
  assert.equal(early.api.requireSupplierData(),false,'Mutations blocked before complete read')
  assert.equal(early.states.setSupplierDataState,'loading')
  await delay(internal?45:15)
  assert.ok(early.states.setSuppliers,'Directory is available before full history')
  assert.equal(early.states.setPurchases,undefined,'Do not publish partial journal')
  assert.equal(early.states.setSupplierDataState,'loading','No partial totals marked ready')
  await pending
  assert.equal(early.states.setSupplierDataState,'ready')
  assert.equal(early.api.requireSupplierData(),true)
  const reloading=early.api.load()
  assert.equal(early.api.requireSupplierData(),false,'Reload immediately invalidates complete-data guard')
  await reloading
  assert.equal(early.api.requireSupplierData(),true)

  const empty=harness(candidate,{internal,emptyPurchases:true})
  await empty.api.load()
  assert.deepEqual(plain(empty.states.setPurchases),[],'A complete empty history is valid, not a stale snapshot')
  assert.equal(empty.states.setSupplierDataState,'ready')
  if(internal)assert.equal(empty.calls.filter(c=>c.table==='supplier_purchases').length,0,'Empty internal RPC must not fall through to direct read')

  const failure=harness(candidate,{internal,failTable:internal?'rms_supplier_purchases_page_secure':'supplier_purchases',failOffset:1000})
  await failure.api.load()
  assert.equal(failure.states.setSupplierDataState,'error','Mid-history failure is explicit')
  assert.ok(failure.states.setSupplierDataError)
  assert.equal(failure.states.setPurchases,undefined,'Failed history must not publish 500-row fallback')
  assert.equal(failure.api.requireSupplierData(),false,'No mutation on incomplete dataset')

  const stale=harness(candidate,{internal}),staleLoad=stale.api.load()
  await delay(1)
  const writesAtCancel=stale.writes.length
  stale.refs.supplierLoadGeneration.current++
  await staleLoad
  assert.equal(stale.writes.length,writesAtCancel,'Superseded request cannot publish data or readiness')

  const unmounted=harness(candidate,{internal}),unmountLoad=unmounted.api.load()
  await delay(1)
  const writesAtUnmount=unmounted.writes.length
  unmounted.refs.supplierMounted.current=false
  await unmountLoad
  assert.equal(unmounted.writes.length,writesAtUnmount,'Unmount prevents late state updates')

  const race=harness(candidate,{internal}),first=race.api.load()
  await delay(1)
  const second=race.api.load()
  await Promise.all([first,second])
  assert.equal(race.writes.filter(w=>w.name==='setPurchases').length,1,'Only latest reload publishes complete history')
  assert.equal(race.writes.filter(w=>w.name==='setSupplierDataState'&&w.value==='ready').length,1)
  assert.equal(race.refs.supplierDataReady.current,true)
}
const denied=harness(candidate,{internal:true,workspaceError:true})
await denied.api.load()
assert.equal(denied.states.setSupplierDataState,'error')
assert.equal(denied.calls.length,1,'Workspace denial must not fall back to direct tables')
console.log('PASS: early directory, pending/reload mutation guards, empty history, partial failure, superseded/unmounted requests, overlapping reload, internal authorization boundary')
for(const internal of [false,true])for(const table of ['supplier_e_invoices','supplier_e_invoice_purchase_links','supplier_legal_entity_status','supplier_opening_debts']) {
  const failed=harness(candidate,{internal,failTable:table})
  await failed.api.load()
  assert.equal(failed.states.setSupplierDataState,'error',`${table} failure cannot publish reconciliations as complete`)
  assert.equal(failed.refs.supplierDataReady.current,false)
}
const retry=harness(candidate)
await retry.api.load()
assert.equal(retry.states.setSupplierDataState,'ready')
retry.context.fixtureFailure.table='supplier_purchases'
await retry.api.load()
assert.equal(retry.states.setSupplierDataState,'error')
assert.equal(retry.refs.supplierDataReady.current,false,'Old complete data cannot authorize operations after failed reload')
retry.context.fixtureFailure.table=''
await retry.api.load()
assert.equal(retry.states.setSupplierDataState,'ready','Retry after error can recover')
assert.equal(retry.refs.supplierDataReady.current,true)
console.log('PASS: reconciliation/status/link failure isolation and failed reload → retry recovery')
for(const internal of [false,true]) {
  const metadata=harness(candidate,{internal,largeMetadata:true})
  await metadata.api.load()
  assert.equal(metadata.states.setSupplierDataState,'ready')
  for(const setter of ['setSupplierEntityStatuses','setEInvoiceLinks','setOpeningDebts'])assert.equal(metadata.states[setter].length,1001,`${setter} must not truncate at API page limit`)
  const failedDirectory=harness(candidate,{internal,failTable:internal?'supplier_e_invoices':'legal_entities'})
  await failedDirectory.api.load()
  assert.equal(failedDirectory.states.setSupplierDataState,'error')
  const finalWrites=failedDirectory.writes.length
  await delay(80)
  assert.equal(failedDirectory.writes.length,finalWrites,'Failure invalidates all pending setters')
}
console.log('PASS: >1000 metadata rows fully paged and failed generation cannot publish late setters')
