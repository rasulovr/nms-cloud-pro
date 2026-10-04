import assert from 'node:assert/strict'
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import path from 'node:path'
import { build } from 'esbuild'
const root = process.cwd()
const evidence = process.env.PAYROLL_BROWSER_EVIDENCE || path.join(root, '.test-results', 'reclassification')
await mkdir(evidence, { recursive: true })
const moduleText = await readFile('src/payroll-write.js', 'utf8')
const api = await import('data:text/javascript;base64,' + Buffer.from(moduleText).toString('base64'))
const source = await readFile('src/main.parts/part-03.jsxpart', 'utf8')
const component = source.slice(source.indexOf('function usePayrollCorrectionAccess('), source.indexOf('function Advances('))
assert.ok(component.includes('function AdvanceReclassificationDialog('))
const handlers = component.slice(component.indexOf('  async function refreshCorrectionSource()'), component.indexOf('  const source = preview?.expected'))
const closeHandler = component.slice(component.indexOf('  function closeCorrection()'), component.indexOf('  function correctionKeyboard('))
const seed = {
 advance: { id: 'synthetic-advance', employee_id: 'synthetic-employee', branch_id: 'synthetic-branch', advance_date: '2026-10-03', amount: 100, operation_type: 'advance', is_cancelled: false, comment: 'Synthetic original provenance', updated_at: '2026-10-01T00:00:00Z', created_by: null },
 advancePeriod: { id: 'synthetic-october', employee_id: 'synthetic-employee', branch_id: 'synthetic-branch', salary_month: '2026-10-01', salary_gross: 500, advance_amount: 100, salary_net: 400, cash_payment: 0, card_payment: 0, updated_at: '2026-10-01T00:00:00Z', comment: null },
 settlementPeriods: [{ id: 'synthetic-september', employee_id: 'synthetic-employee', branch_id: 'synthetic-branch', salary_month: '2026-09-01', salary_gross: 200, advance_amount: 0, salary_net: 200, cash_payment: 0, card_payment: 0, updated_at: '2026-10-01T00:00:00Z', comment: null }]
}
const form = { salary_month: '2026-09-01', amount: '60,00', reason: 'Synthetic classification correction' }
function mockResult(operation) {
 const residual = Math.round((Number(operation.expected.amount) - operation.amount) * 100) / 100
 return { replayed: false, operation: {
  id: 'synthetic-payment', type: 'advance_reclassification', audit_id: 'synthetic-audit', original_advance_id: operation.advance_id,
  advance: { ...operation.expected, is_cancelled: true },
  residual_advance: residual > 0 ? { ...operation.expected, id: 'synthetic-residual', amount: residual } : null,
  payment: { id: 'synthetic-payment', employee_id: operation.employee_id, branch_id: operation.branch_id, salary_month: operation.salary_month, payment_date: operation.expected.advance_date, amount: operation.amount, method: 'cash', is_cancelled: false },
  advance_period: { ...operation.expected_periods.advance, advance_amount: residual }, settlement_period: { ...operation.expected_periods.settlement, cash_payment: operation.amount }
 } }
}
function makeClient(state) {
 return {
  from(table) {
   const read = { table, columns: null, filters: [] }; state.reads.push(read)
   const chain = { select(columns) { read.columns = columns; return chain }, eq(key,value) { read.filters.push([key,value]); return chain }, lte(key,value) { read.filters.push([key,'<=',value]); return chain },
    async single() { return state.readError ? {error:state.readError} : { data: structuredClone(state.seed.advance), error:null } },
    async order() { return state.readError ? {error:state.readError} : {data: structuredClone([state.seed.advancePeriod, ...state.seed.settlementPeriods]), error:null} }
   }
   for (const action of ['update','insert','upsert','delete']) chain[action] = () => { state.mutations.push(action); throw Error('Forbidden direct mutation') }
   return chain
  },
  async rpc(name,args) {
   if(name === 'rms_payroll_can_write') return {data:state.allowed !== false,error:null}
   state.calls.push(structuredClone({name,args}))
   if(state.defer) await new Promise(resolve => { state.release = resolve })
   if(state.mode === 'stale') return {error:{code:'40001',message:'Synthetic stale snapshot'}}
   if(state.mode === 'missing') return {error:{code:'PGRST202',message:'Synthetic migration missing'}}
   if(state.mode === 'denied') return {error:{code:'42501',message:'Synthetic denied'}}
   if(state.mode === 'validation') return {error:{code:'P0001',message:'Synthetic debt bound rejection'}}
   if(state.mode === 'fail') return {error:{code:'22023',message:'Synthetic rejected request'}}
   if(state.mode === 'network') throw Error('Synthetic network failure')
   if(state.mode === 'invalid') return {data:{operation:{id:'synthetic-payment'}}}
   const previous = state.commits.find(item => item.args.p_request_key === args.p_request_key)
   if(previous) { assert.deepEqual(args,previous.args,'Replay must reuse frozen payload'); return {data:{...previous.result,replayed:true}} }
   const result = mockResult(args.p_operation)
   state.commits.push(structuredClone({args,result}))
   state.seed.advance.is_cancelled = true
   if(state.mode === 'lost-response') throw Error('Synthetic network failure after commit')
   return {data:result,error:null}
  }
 }
}
function harness() {
 const state = { ...api, seed:structuredClone(seed), reads:[], calls:[], commits:[], mutations:[], mode:'success', defer:false,
  snapshot:structuredClone(seed), correctionForm:structuredClone(form), preview:null, busy:false, attempted:false, result:null, correctionMessage:'', advanceId:seed.advance.id,
  correctionRequestRef:{current:null}, correctionInFlightRef:{current:false}, correctionResultRef:{current:null}, correctionReadRef:{current:0}, correctionMountedRef:{current:true}, closes:0, reloads:0, refreshMode:'success'
 }
 state.client = makeClient(state)
 for(const key of ['snapshot','correctionForm','preview','busy','attempted','result','correctionMessage']) state['set'+key[0].toUpperCase()+key.slice(1)] = value => {state[key] = typeof value === 'function' ? value(state[key]) : value}
 state.onClose = () => {state.closes++}
 state.onCommitted = async () => {state.reloads++; if(state.refreshMode==='throw') throw Error('Synthetic refresh failed');return state.refreshMode!=='false'}
 Object.assign(state,new Function('context',`with(context){${closeHandler}\n${handlers}\nreturn {refreshCorrectionSource,previewCorrection,saveCorrection,closeCorrection}}`)(state))
 return state
}
const checks = []
async function test(name, run) { await run(); checks.push(name); console.log('PASS '+name) }
if(process.env.EXPORT_FIXTURE_ONLY !== '1') {
 await test('preview/back/result transitions restore dialog focus before paint',()=>{
  const effect = component.match(/React\.useLayoutEffect\(\(\) => \{\s*correctionDialogRef\.current\?\.focus\(\)\s*\}, \[preview, result\]\)/)?.[0]
  assert.ok(effect, 'Stage transitions must restore dialog focus with a layout effect')
  let focused=0;const correctionDialogRef={current:{focus(){focused++}}}
  for(const [preview,result] of [[null,null],[{},null],[null,null],[{},{}]]) {
   const React={useLayoutEffect(callback,deps){assert.deepEqual(deps,[preview,result]);callback()}}
   new Function('React','correctionDialogRef','preview','result',effect)(React,correctionDialogRef,preview,result)
  }
  assert.equal(focused,4)
  assert.ok(component.includes('React.useLayoutEffect(() => {\n    const previousFocus = document.activeElement'), 'Original trigger focus must be captured before stage focus')
 })
 await test('fresh base-row reads preserve the entire source and both period snapshots', async()=>{
  const c=harness();const snapshot=await api.loadAdvanceReclassification(c.client,seed.advance.id)
  assert.deepEqual(snapshot,seed);assert.equal(c.reads.length,2);assert.deepEqual(c.reads[0],{table:'salary_advances',columns:'*',filters:[['id',seed.advance.id]]})
  assert.deepEqual(c.reads[1].filters,[['employee_id',seed.advance.employee_id],['salary_month','<=','2026-10-01']])
  const op=api.prepareAdvanceReclassification(snapshot,form);assert.deepEqual(op.expected,seed.advance);assert.deepEqual(op.expected_periods,{advance:seed.advancePeriod,settlement:seed.settlementPeriods[0]});assert.equal(op.amount,60)
  snapshot.advance.comment='mutated later';assert.equal(op.expected.comment,seed.advance.comment)
 })
 for(const [description,mutate] of [
  ['cancelled source',c=>{c.seed.advance.is_cancelled=true}], ['non-advance source',c=>{c.seed.advance.operation_type='salary_payment'}],
  ['missing source period',c=>{c.seed.advancePeriod.salary_month='2026-11-01'}], ['wrong-branch source period',c=>{c.seed.advancePeriod.branch_id='another-branch'}],
  ['read denied',c=>{c.readError={code:'42501',message:'Synthetic read denied'}}]
 ]) await test(description+' fails closed',async()=>{const c=harness();mutate(c);await assert.rejects(()=>api.loadAdvanceReclassification(c.client,seed.advance.id));assert.equal(c.calls.length,0)})
 await test('only earlier matching employee/branch periods are selectable',async()=>{
  const c=harness();c.seed.settlementPeriods.push({...seed.settlementPeriods[0],id:'different-branch',branch_id:null},{...seed.settlementPeriods[0],id:'different-employee',employee_id:'other'},{...seed.settlementPeriods[0],id:'future',salary_month:'2026-11-01'})
  assert.deepEqual((await api.loadAdvanceReclassification(c.client,seed.advance.id)).settlementPeriods,seed.settlementPeriods)
 })
 for(const amount of ['','0','-1','101','1.001','1e2','NaN','Infinity','1 0']) await test('invalid amount '+JSON.stringify(amount)+' rejected before RPC',()=>assert.throws(()=>api.prepareAdvanceReclassification(seed,{...form,amount})))
 for(const update of [{salary_month:'2026-10-01'},{salary_month:'2026-11-01'},{salary_month:'2026-08-01'},{reason:'  '},{reason:'ab'},{reason:'a'.repeat(1001)}]) await test('invalid month/reason '+JSON.stringify(update).slice(0,80),()=>assert.throws(()=>api.prepareAdvanceReclassification(seed,{...form,...update})))
 await test('preview reads source again and performs no writes',async()=>{const c=harness();c.seed.advance.comment='Fresh preview provenance';await c.previewCorrection();assert.equal(c.preview.expected.comment,'Fresh preview provenance');assert.equal(c.reads.length,2);assert.equal(c.calls.length,0);assert.equal(c.commits.length,0);assert.deepEqual(c.mutations,[])})
 await test('full and partial transfers validate cash conservation',async()=>{
  for(const amount of ['60','100']){const op=api.prepareAdvanceReclassification(seed,{...form,amount});const result=mockResult(op);const calls=[];assert.deepEqual(await api.reclassifySalaryAdvance({rpc:async(...args)=>{calls.push(args);return{data:result}}},'synthetic-key',op),result);assert.equal(calls[0][0],'rms_reclassify_salary_advance');assert.equal(calls[0][1].p_operation,op)}
 })
 const badResults = [r=>delete r.operation.audit_id,r=>delete r.replayed,r=>{r.operation.type='payment'},r=>{r.operation.advance.amount=40},r=>{r.operation.advance.is_cancelled=false},r=>{r.operation.original_advance_id='other'},r=>{r.operation.payment.method='bank'},r=>{r.operation.payment.amount=59},r=>{r.operation.payment.payment_date='2026-10-04'},r=>{r.operation.payment.salary_month='2026-10-01'},r=>{r.operation.payment.employee_id='other'},r=>{r.operation.payment.is_cancelled=true},r=>{r.operation.residual_advance=null},r=>{r.operation.residual_advance.amount=41},r=>{r.operation.residual_advance.branch_id=null},r=>{r.operation.residual_advance.advance_date='2026-10-04'},r=>{r.operation.residual_advance.id=seed.advance.id},r=>{r.operation.advance_period.id='other'},r=>{r.operation.settlement_period.salary_month='2026-08-01'},r=>{r.operation.advance.comment='lost provenance'},r=>{r.operation.advance.operation_type='payment'},r=>{r.operation.payment.amount=60.001},r=>{r.operation.residual_advance.amount=40.001}]
 for(const [index,mutate] of badResults.entries()) await test('invalid persisted-result field '+index+' never confirms',async()=>{const op=api.prepareAdvanceReclassification(seed,form);const result=mockResult(op);mutate(result);await assert.rejects(()=>api.reclassifySalaryAdvance({rpc:async()=>({data:result})},'synthetic-key',op),e=>e.code==='PAYROLL_UNCONFIRMED')})
 await test('same-tick duplicate clicks send one request and cannot dismiss it',async()=>{
  const c=harness();await c.previewCorrection();c.defer=true;const pending=c.saveCorrection();await c.saveCorrection();c.closeCorrection();assert.equal(c.calls.length,1);assert.equal(c.closes,0);assert.equal(c.result,null);c.release();await pending;assert.equal(c.commits.length,1);assert.ok(c.result.audit_id);c.closeCorrection();assert.equal(c.closes,1);await c.saveCorrection();assert.equal(c.calls.length,1)
 })
 for(const mode of ['network','invalid','lost-response']) await test(mode+': retains original key, snapshots and form until confirmed replay',async()=>{
  const c=harness();await c.previewCorrection();c.mode=mode;const original=structuredClone(c.preview);await c.saveCorrection();const first=structuredClone(c.calls[0]);assert.equal(c.result,null);assert.equal(c.reloads,0);c.closeCorrection();assert.equal(c.closes,0);c.correctionForm.amount='5';c.seed.advance.amount=999;c.seed.advancePeriod.updated_at='2026-10-04T00:00:00Z';await c.previewCorrection();assert.equal(c.reads.length,2);assert.deepEqual(c.preview,original);c.mode='success';await c.saveCorrection();assert.deepEqual(c.calls[1],first);assert.equal(c.commits.length,1);assert.equal(c.reloads,1);assert.equal(c.correctionRequestRef.current,null)
 })
 for(const mode of ['missing','denied','fail','validation']) await test(mode+': confirmed rejection allows closing and same-key retry without legacy writes',async()=>{
  const c=harness();await c.previewCorrection();c.mode=mode;await c.saveCorrection();c.closeCorrection();assert.equal(c.closes,1);assert.equal(c.commits.length,0);assert.deepEqual(c.mutations,[]);const first=structuredClone(c.calls[0]);c.mode='success';await c.saveCorrection();assert.deepEqual(c.calls[1],first);assert.equal(c.commits.length,1)
 })
 await test('confirmed stale rejection requires a new fresh preview and request key',async()=>{
  const c=harness();await c.previewCorrection();c.mode='stale';await c.saveCorrection();assert.equal(c.preview,null);assert.equal(c.snapshot,null);assert.equal(c.correctionRequestRef.current,null);assert.match(c.correctionMessage,/Данные изменились/);const first=c.calls[0];c.seed.advance.comment='New snapshot';await c.refreshCorrectionSource();await c.previewCorrection();c.mode='success';await c.saveCorrection();assert.notEqual(c.calls[1].args.p_request_key,first.args.p_request_key);assert.equal(c.calls[1].args.p_operation.expected.comment,'New snapshot')
 })
 for(const mode of ['false','throw']) await test('committed result with '+mode+' refresh remains saved',async()=>{const c=harness();await c.previewCorrection();c.refreshMode=mode;await c.saveCorrection();assert.ok(c.result);assert.equal(c.commits.length,1);assert.match(c.correctionMessage,/сохранено, но список не обновился/);assert.equal(c.correctionRequestRef.current,null);await c.saveCorrection();assert.equal(c.calls.length,1)})
 await test('dismissed source reads cannot update replacement dialog state',async()=>{const c=harness();let release;c.client.from=()=>({select(){return this},eq(){return this},single:()=>new Promise(resolve=>{release=()=>resolve({data:seed.advance})})});const pending=c.refreshCorrectionSource();c.correctionMountedRef.current=false;c.correctionReadRef.current++;release();await pending;assert.equal(c.snapshot.advance.id,seed.advance.id);assert.equal(c.calls.length,0)})
 assert.ok(source.includes('{canCorrectAdvance && <button'))
 assert.ok(component.includes("client.rpc('rms_payroll_can_write')"))
 assert.ok(component.includes('data === true'))
 await writeFile(path.join(evidence,'reclassification-results.json'),JSON.stringify({passed:checks.length,checks,method:'Real client exports and real extracted React handlers; isolated synthetic state and RPC; no network/database writes.'},null,2))
 console.log(`Reclassification client/handler checks: ${checks.length} passed`)
}

if(process.env.EXPORT_FIXTURE_ONLY==='1' || process.env.BROWSER==='1') {
 const fixture = `import React,{useState,useRef,useEffect} from 'react';import {createRoot} from 'react-dom/client';import {createPortal} from 'react-dom';import {payrollRequestKey,payrollWriteError,loadAdvanceReclassification,prepareAdvanceReclassification,reclassifySalaryAdvance} from './src/payroll-write.js';import './src/styles.css';
 const fmt=v=>Number(v).toFixed(2);const seed=${JSON.stringify(seed)};${mockResult.toString()}
 const state={seed:structuredClone(seed),reads:[],calls:[],commits:[],mutations:[],mode:new URLSearchParams(location.search).get('rpc')||'success',allowed:new URLSearchParams(location.search).get('allowed')!=='false',defer:false};window.__correction=state;
 ${makeClient.toString().replace("assert.deepEqual(args,previous.args,'Replay must reuse frozen payload');", "if(JSON.stringify(args)!==JSON.stringify(previous.args))throw Error('Replay changed');")}
 const supabase=makeClient(state);${component}
 function Harness(){const allowed=usePayrollCorrectionAccess();const[open,setOpen]=useState(false);const[message,setMessage]=useState('');return <main style={{padding:24,maxWidth:900,margin:'auto'}}><h1>Payroll reclassification · synthetic verification</h1><p>100.00 AZN issued on 2026-10-03. Earlier salary period: September 2026.</p><p>No credentials. All external connections blocked by CSP.</p><label>RPC mode<select aria-label="RPC mode" value={state.mode} onChange={e=>{state.mode=e.target.value;setMessage(e.target.value)}}>{['success','fail','network','invalid','missing','denied','stale','lost-response'].map(x=><option key={x}>{x}</option>)}</select></label><p role="status">{message}</p>{allowed&&<button onClick={()=>setOpen(true)}>Исправить назначение</button>}{!allowed&&<p>Correction unavailable: server capability denied.</p>}{open&&<AdvanceReclassificationDialog advanceId={seed.advance.id} employeeName="Synthetic Employee" onClose={()=>setOpen(false)} onCommitted={async()=>{setMessage('Reloaded after confirmed save');return true}}/>}</main>};createRoot(document.getElementById('root')).render(<Harness/>);`
 const built=await build({stdin:{contents:fixture,resolveDir:root,loader:'jsx'},bundle:true,write:false,outfile:'app.js',loader:{'.css':'css'},define:{'process.env.NODE_ENV':'"production"'},logLevel:'silent'})
 const js=built.outputFiles.find(x=>x.path.endsWith('.js')).text,css=built.outputFiles.find(x=>x.path.endsWith('.css')).text
 const html='<!doctype html><html lang="ru"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src \'none\'; script-src \'unsafe-inline\'; style-src \'unsafe-inline\'; connect-src \'none\'; img-src data:; font-src \'none\'; frame-src \'none\'"><title>Synthetic payroll reclassification</title><style>'+css+'</style><div id="root"></div><script>'+js.replaceAll('</script','<\\/script')+'</script></html>'
 await writeFile(path.join(evidence,'reclassification-fixture.html'),html)
 console.log('Synthetic correction fixture exported: '+path.join(evidence,'reclassification-fixture.html'))
 if(process.env.BROWSER==='1') {
  const {chromium}=await import('playwright');const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH || '/usr/bin/chromium',args:['--no-sandbox']});const page=await browser.newPage({viewport:{width:1200,height:900}})
  await page.route('**/*',route=>route.fulfill({contentType:'text/html',body:html}))
  await page.goto('http://synthetic.test/');await page.getByRole('button',{name:'Исправить назначение'}).click();const dialog=page.getByRole('dialog');await dialog.getByLabel('Из аванса в погашение зарплаты, AZN').fill('60');await dialog.getByLabel('Причина исправления').fill('Synthetic test correction');await dialog.getByRole('button',{name:'Предпросмотр исправления'}).click();await dialog.getByRole('button',{name:'Подтвердить исправление'}).waitFor();await page.screenshot({path:path.join(evidence,'reclassification-preview.png'),fullPage:true});assert.equal(await dialog.evaluate(el=>el===document.activeElement),true);await dialog.getByRole('button',{name:'Назад к полям',exact:true}).click();assert.equal(await dialog.evaluate(el=>el===document.activeElement),true);assert.equal(await dialog.getByLabel('Из аванса в погашение зарплаты, AZN').inputValue(),'60');await page.keyboard.press('Escape');assert.equal(await page.getByRole('dialog').count(),0);assert.equal(await page.getByRole('button',{name:'Исправить назначение'}).evaluate(el=>el===document.activeElement),true);await page.getByRole('button',{name:'Исправить назначение'}).click();await dialog.getByLabel('Из аванса в погашение зарплаты, AZN').fill('60');await dialog.getByLabel('Причина исправления').fill('Synthetic test correction');await dialog.getByRole('button',{name:'Предпросмотр исправления'}).click();await dialog.getByRole('button',{name:'Подтвердить исправление'}).click();await dialog.getByText('Исправление сохранено',{exact:true}).waitFor();assert.equal(await page.evaluate(()=>window.__correction.commits.length),1);await page.screenshot({path:path.join(evidence,'reclassification-confirmed.png'),fullPage:true});await dialog.getByRole('button',{name:'Закрыть',exact:true}).click();assert.equal(await page.getByRole('dialog').count(),0)
  await page.goto('http://synthetic.test/?allowed=false');assert.equal(await page.getByRole('button',{name:'Исправить назначение'}).count(),0)
  await browser.close();console.log('Browser rendering and confirmation checks passed')
 }
}
