import assert from 'node:assert/strict'
import { readFile, mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { createRequire } from 'node:module'
import { build } from 'esbuild'
const require = createRequire(import.meta.url)
const chromium = process.env.HANDLERS_ONLY === '1' || process.env.EXPORT_FIXTURE_ONLY === '1' ? null : require('playwright').chromium
const root = process.cwd()
const evidence = process.env.PAYROLL_BROWSER_EVIDENCE || path.join(root, '.test-results', 'payroll')
await mkdir(evidence, {recursive:true})
const source = await readFile('src/main.parts/part-03.jsxpart', 'utf8')
const slice = (start,end) => {const a=source.indexOf(start),b=source.indexOf(end,a);assert.ok(a>=0&&b>a,`Missing source boundary ${start}`);return source.slice(a,b)}
const salaryHandler = slice('  async function addSalaryPayment()', '  async function cancelSalaryPayment(')
const accrualHandlers = slice('  function previewAccrualPatch()', '  async function recalcSalaryRow(')
const advanceHandlers = slice('  async function refreshSalaryForEmployee(', '  function startEditAdvance(')
const salaryTitle = source.indexOf('<h3>Выплата зарплаты за выбранный месяц</h3>')
const salaryFormStart = source.indexOf('className="form-grid compact"',salaryTitle)
const salaryForm = source.slice(source.lastIndexOf('<',salaryFormStart),source.indexOf('        {selectedPaymentRow',salaryTitle))
const advanceTitle = source.indexOf('<h3>Новый аванс</h3>')
const advanceForm = source.slice(advanceTitle, source.indexOf('\n      </div>',advanceTitle))
const accrualForm = slice('<details><summary>Обновить сопоставленные начисления</summary>', '\n        </details>') + '\n</details>'
const reconcileButton = source.split('\n').find(line=>line.includes('onClick={() => reconcileAdvancePeriod(a)}'))
assert.ok(reconcileButton)
const fixture = `
import React,{useState,useRef} from 'react'
import {createRoot} from 'react-dom/client'
import {payrollRequestKey,payrollWriteError,writePayrollAtomic,matchedAccrualOperations} from './src/payroll-write.js'
import './src/styles.css'
const parseNum=(v)=>Number(String(v??'0').replace(',','.').replace(/\\s/g,''))||0
const fmt=v=>Number(v).toFixed(2)
const todayISO=()=>'2026-10-04'
const monthStart=(year,month)=>year+'-'+String(month).padStart(2,'0')+'-01'
const prevMonth=(year,month)=>month===1?{year:year-1,month:12}:{year,month:month-1}
const t=x=>x==='saved'?'Сохранено':x
const DateInput=props=><input type="date" {...props}/>
const branches=[{id:'synthetic-branch',name:'Synthetic branch'}]
const staffGroupOptions=x=>x
const employeeGroupId=e=>e.branch_id
const employeeGroupName=e=>'Synthetic branch'
const positionGroup=x=>x
window.__calls=[];window.__reads=[];window.__persisted=[];window.__loadCalls=0;window.__mutationAttempts=[]
window.__rpcMode=new URLSearchParams(location.search).get('rpc')||'success';window.__refreshMode=new URLSearchParams(location.search).get('refresh')||'success';window.__defer=new URLSearchParams(location.search).get('defer')==='1'
const supabase={
 rpc:async(name,args)=>{
  window.__calls.push(JSON.parse(JSON.stringify({name,args})))
  if(window.__defer)await new Promise(resolve=>{window.__release=resolve})
  if(window.__rpcMode==='fail')return {data:null,error:{message:'Synthetic RPC rejection'}}
  if(window.__rpcMode==='missing')return {data:null,error:{code:'PGRST202',message:'Synthetic missing RPC'}}
  if(window.__rpcMode==='network')throw new Error('Synthetic network failure')
  if(window.__rpcMode==='invalid')return {data:{operations:[]},error:null}
  const result={operations:args.p_operations.map((op,i)=>({id:'synthetic-journal-'+i,period:{id:'synthetic-period',salary_month:op.salary_month||(op.advance_date.slice(0,7)+'-01')}}))}
  window.__persisted.push(JSON.parse(JSON.stringify(args)))
  return {data:result,error:null}
 },
 from:table=>{
  const query={table,filters:[]};window.__reads.push(query)
  const chain={select:()=>chain,eq:(name,value)=>{query.filters.push([name,value]);return chain},single:async()=>({data:{id:'synthetic-period',employee_id:'synthetic-employee',branch_id:'synthetic-branch',salary_gross:40,updated_at:'2026-10-01T00:00:00Z',salary_month:query.filters.find(x=>x[0]==='salary_month')?.[1]},error:null})}
  for(const action of ['insert','update','upsert','delete'])chain[action]=()=>{window.__mutationAttempts.push({table,action});throw new Error('Forbidden direct mutation')}
  return chain
 }
}
function Harness(){
 const employees=[{id:'synthetic-employee',branch_id:'synthetic-branch',full_name:'Synthetic Employee',position:'Synthetic role'}]
 const rows=[{id:'synthetic-period',employee_id:'synthetic-employee',branch_id:'synthetic-branch',opening_balance:Number(new URLSearchParams(location.search).get('debt')||0),employees:employees[0]}]
 const year=2026,month=11,monthDate='2026-11-01'
 const [paymentForm,setPaymentForm]=useState({employee_id:'synthetic-employee',payment_date:'2026-11-03',amount:'',previous_amount:'',manual_previous_balance:'',method:'cash',comment:''})
 const [paymentBranchId,setPaymentBranchId]=useState('all')
 const paymentRows=rows
 const [dailyPaymentDate,setDailyPaymentDate]=useState('2026-11-03')
 const [useManualPreviousSalaryBalance,setUseManualPreviousSalaryBalance]=useState(false)
 const [usePreviousSalaryBalance,setUsePreviousSalaryBalance]=useState(false)
 const [message,setMessage]=useState('')
 const [payrollSaving,setPayrollSaving]=useState(false)
 const [advanceSaving,setAdvanceSaving]=useState(false)
 const payrollInFlightRef=useRef(false),payrollRequestRef=useRef(null),accrualRequestRef=useRef(null)
 const advanceInFlightRef=useRef(false),advanceRequestRef=useRef(null),reconcileRequestRef=useRef(null)
 const [form,setForm]=useState({employee_id:'synthetic-employee',advance_date:'2026-10-03',amount:'',comment:''})
 const [advanceGroupId,setAdvanceGroupId]=useState('synthetic-branch')
 const formEmployees=employees
 const [accrualPatchText,setAccrualPatchText]=useState('')
 const [accrualPatchRows,setAccrualPatchRows]=useState([])
 const a={id:'synthetic-existing-journal',employee_id:'synthetic-employee',advance_date:'2026-09-15',amount:15}
 const load=async()=>{window.__loadCalls++;if(window.__refreshMode==='throw')throw new Error('Synthetic refresh failed');return window.__refreshMode!=='false'}
 ${salaryHandler}
 ${accrualHandlers}
 ${advanceHandlers}
 return <main className="rms-pro-shell rms-pro-content" style={{padding:24,maxWidth:1100,margin:'0 auto'}}>
  <h1>Payroll repair · synthetic verification</h1><p>Real source handlers and form controls. Isolated mock RPC; external network blocked.</p>
  <p>Selected fixture period: November 2026. Original advance: September 2026.</p>
  <details><summary>Synthetic test controls</summary><label>RPC mode<select aria-label="RPC mode" defaultValue={window.__rpcMode} onChange={e=>{window.__rpcMode=e.target.value}}><option>success</option><option>fail</option><option>invalid</option><option>missing</option><option>network</option></select></label><label>Refresh mode<select aria-label="Refresh mode" defaultValue={window.__refreshMode} onChange={e=>{window.__refreshMode=e.target.value}}><option>success</option><option>false</option><option>throw</option></select></label><button onClick={()=>{window.__defer=false;window.__release?.()}}>Release pending RPC</button></details>
  <details open><summary>Synthetic RPC evidence</summary><pre data-testid="evidence">{JSON.stringify({calls:window.__calls,persisted:window.__persisted,reads:window.__reads,mutations:window.__mutationAttempts},null,2)}</pre></details>
  <div role="status" style={{border:'1px solid #d2d9e4',padding:12,minHeight:44,marginBottom:16}}>{message}</div>
  <section data-testid="advance" className="card">${advanceForm}<div className="notice"><p>Existing synthetic journal row: 15 AZN · 2026-09-15</p>${reconcileButton}</div></section>
  <section data-testid="salary" className="card"><h3>Выплата зарплаты за выбранный месяц</h3>${salaryForm}</section>
  <section data-testid="accrual" className="card">${accrualForm}</section>
 </main>
}
createRoot(document.getElementById('root')).render(<Harness/>);
`

// Deterministic handler fallback for environments where Chromium process sockets
// are unavailable. This executes the same extracted async handlers, not copies.
if (process.env.HANDLERS_ONLY === '1') {
 const moduleText=await readFile('src/payroll-write.js','utf8')
 const api=await import('data:text/javascript;base64,'+Buffer.from(moduleText).toString('base64'))
 const matched={id:'synthetic-period',employee_id:'synthetic-employee',branch_id:'synthetic-branch',salary_month:'2026-09-01',expected:{updated_at:'2026-10-01T00:00:00Z',worked_days:10,salary_gross:100},patch:{worked_days:12,salary_gross:120}}
 const create=()=>{
  const context={...api,parseNum:v=>Number(String(v??'0').replace(',','.').replace(/\s/g,''))||0,fmt:v=>Number(v).toFixed(2),todayISO:()=>'2026-10-04',t:x=>x==='saved'?'Сохранено':x,year:2026,month:11,monthDate:'2026-11-01',monthStart:(y,m)=>y+'-'+String(m).padStart(2,'0')+'-01',prevMonth:(y,m)=>m===1?{year:y-1,month:12}:{year:y,month:m-1},message:'',payrollSaving:false,advanceSaving:false,
   employees:[{id:'synthetic-employee',branch_id:'synthetic-branch'}],rows:[{employee_id:'synthetic-employee',branch_id:'synthetic-branch',opening_balance:30}],
   form:{employee_id:'synthetic-employee',advance_date:'2026-10-03',amount:'12.34',comment:'Synthetic source fixture'},paymentForm:{employee_id:'synthetic-employee',payment_date:'2026-11-03',amount:'10',previous_amount:'50',manual_previous_balance:'',method:'cash',comment:'Synthetic payment'},usePreviousSalaryBalance:true,useManualPreviousSalaryBalance:false,accrualPatchText:JSON.stringify([matched]),accrualPatchRows:api.matchedAccrualOperations(JSON.stringify([matched])),
   advanceInFlightRef:{current:false},advanceRequestRef:{current:null},reconcileRequestRef:{current:null},payrollInFlightRef:{current:false},payrollRequestRef:{current:null},accrualRequestRef:{current:null},calls:[],reads:[],persisted:[],mutationAttempts:[],rpcMode:'success',refreshMode:'success',defer:false,prior:{id:'synthetic-period',employee_id:'synthetic-employee',branch_id:'synthetic-branch',salary_gross:40,updated_at:'2026-10-01T00:00:00Z'}}
  for(const [fn,key] of Object.entries({setForm:'form',setPaymentForm:'paymentForm',setMessage:'message',setPayrollSaving:'payrollSaving',setAdvanceSaving:'advanceSaving',setAccrualPatchText:'accrualPatchText',setAccrualPatchRows:'accrualPatchRows',setUsePreviousSalaryBalance:'usePreviousSalaryBalance',setUseManualPreviousSalaryBalance:'useManualPreviousSalaryBalance'})) context[fn]=value=>{context[key]=typeof value==='function'?value(context[key]):value}
  context.load=async()=>{if(context.refreshMode==='throw')throw Error('Synthetic refresh failed');return context.refreshMode!=='false'}
  context.supabase={rpc:async(name,args)=>{context.calls.push(structuredClone({name,args}));if(context.defer)await new Promise(r=>context.release=r);if(context.rpcMode==='stale')return{error:{code:'40001',message:'Synthetic stale state'}};if(context.rpcMode==='fail')return{error:{message:'Synthetic RPC rejection'}};if(context.rpcMode==='missing')return{error:{code:'PGRST202'}};if(context.rpcMode==='network')throw Error('Synthetic network failure');if(context.rpcMode==='invalid')return{data:{operations:[]}};const priorCommit=context.persisted.find(x=>x.p_request_key===args.p_request_key);if(priorCommit)assert.deepEqual(args,priorCommit,'Mock idempotent replay requires original operations');else context.persisted.push(structuredClone(args));if(context.rpcMode==='persist-unconfirmed')throw Error('Synthetic network failure after commit');return {data:{operations:args.p_operations.map((o,i)=>({id:'synthetic-journal-'+i,period:{id:'synthetic-period'}}))}}},from:table=>{const entry={table,filters:[]};context.reads.push(entry);const chain={select:()=>chain,eq:(key,value)=>{entry.filters.push([key,value]);return chain},single:async()=>({data:structuredClone(context.prior),error:null})};for(const action of ['insert','update','upsert','delete'])chain[action]=()=>{context.mutationAttempts.push(action);throw Error('Forbidden direct mutation')};return chain}}
  for (const name of new Set((salaryHandler+accrualHandlers+advanceHandlers).match(/\b[A-Za-z]+Ref\b/g)||[])) if (!(name in context)) context[name]={current:null}
  Object.assign(context,new Function('context',`with(context){${salaryHandler}\n${accrualHandlers}\n${advanceHandlers}\nreturn {addAdvance,addSalaryPayment,previewAccrualPatch,saveAccrualPatch,reconcileAdvancePeriod}}`)(context))
  return context
 }
 if(process.env.REPRO_UNCERTAIN_MANUAL==='1'){
  const c=create();c.useManualPreviousSalaryBalance=true;c.usePreviousSalaryBalance=false;c.paymentForm.manual_previous_balance='60';c.rpcMode='persist-unconfirmed';await c.addSalaryPayment();const first=c.calls[0].args.p_request_key;c.prior.salary_gross=60;c.prior.updated_at='2026-10-04T06:45:00Z';c.rpcMode='success';await c.addSalaryPayment();console.log(JSON.stringify({firstKey:first,retryKey:c.calls[1].args.p_request_key,commits:c.persisted.length,operations:c.calls.map(x=>x.args.p_operations)},null,2));assert.equal(c.calls[1].args.p_request_key,first,'Unconfirmed manually adjusted payment must replay its original request');process.exit(0)
 }
 const checks=[];const test=async(name,fn)=>{await fn();checks.push(name);console.log('PASS '+name)}
 const recoverRow={employee_id:'synthetic-employee',advance_date:'2026-09-15'}
 for(const [handler,formField,inputField] of [['addAdvance','form','amount'],['addSalaryPayment','paymentForm','amount'],['saveAccrualPatch','accrualPatchText',null]]){
  await test(handler+': retain values on failure, lock duplicate submit, retry same key, clear only after persistence',async()=>{
   const c=create();c.rpcMode='fail';c.defer=true;const initial=structuredClone(c[formField]);const pending=c[handler]();await c[handler]();assert.equal(c.calls.length,1);assert.deepEqual(c[formField],initial);assert.equal(c.persisted.length,0);c.release();await pending;assert.deepEqual(c[formField],initial);assert.match(c.message,/Операция не сохранена/);const key=c.calls[0].args.p_request_key;c.rpcMode='success';c.defer=false;await c[handler]();assert.equal(c.calls[1].args.p_request_key,key);assert.equal(c.persisted.length,1);assert.equal(inputField?c[formField][inputField]:c[formField],'');assert.deepEqual(c.mutationAttempts,[])
  })
 }
 for(const mode of ['missing','invalid','network'])await test('advance '+mode+' error fails closed and preserves retryable form',async()=>{const c=create();c.rpcMode=mode;await c.addAdvance();assert.equal(c.form.amount,'12.34');assert.equal(c.persisted.length,0);assert.deepEqual(c.mutationAttempts,[]);assert.match(c.message,mode==='missing'?/обновление базы/:/Не удалось подтвердить/)})

 await test('lost manual-payment response replays original operations and key without another prior-period read',async()=>{
  const c=create();c.useManualPreviousSalaryBalance=true;c.usePreviousSalaryBalance=false;c.paymentForm.manual_previous_balance='60';c.rpcMode='persist-unconfirmed';await c.addSalaryPayment();const first=structuredClone(c.calls[0]);assert.equal(c.persisted.length,1);assert.equal(c.paymentForm.amount,'10');c.prior.salary_gross=60;c.prior.updated_at='2026-10-04T06:45:00Z';c.rpcMode='success';await c.addSalaryPayment();assert.deepEqual(c.calls[1],first);assert.equal(c.reads.length,1);assert.equal(c.persisted.length,1);assert.equal(c.paymentForm.amount,'')
 })
 for(const mode of ['persist-unconfirmed','invalid'])await test(mode+': changed intent blocked until original request is retried',async()=>{
  const c=create();c.usePreviousSalaryBalance=false;c.rpcMode=mode;await c.addSalaryPayment();const first=structuredClone(c.calls[0]);c.paymentForm.amount='20';c.rpcMode='success';await c.addSalaryPayment();assert.equal(c.calls.length,1);assert.equal(c.paymentForm.amount,'20');assert.match(c.message,/Сначала повторите её с прежними полями/);c.paymentForm.amount='10';await c.addSalaryPayment();assert.deepEqual(c.calls[1],first);assert.equal(c.persisted.length,1)
 })
 await test('confirmed stale transaction permits re-preparation using fresh expected version',async()=>{
  const c=create();c.useManualPreviousSalaryBalance=true;c.paymentForm.manual_previous_balance='60';c.rpcMode='stale';await c.addSalaryPayment();const first=c.calls[0];assert.equal(c.persisted.length,0);assert.equal(c.payrollRequestRef.current,null);assert.match(c.message,/Данные изменились/);c.prior.salary_gross=45;c.prior.updated_at='2026-10-04T06:45:00Z';c.rpcMode='success';await c.addSalaryPayment();assert.notEqual(c.calls[1].args.p_request_key,first.args.p_request_key);assert.equal(c.calls[1].args.p_operations[0].expected.salary_gross,45)
 })

 await test('advance source date survives selected-month mismatch',async()=>{const c=create();await c.addAdvance();assert.equal(c.calls[0].args.p_operations[0].advance_date,'2026-10-03');assert.equal(c.calls[0].args.p_operations[0].salary_month,undefined)})
 await test('recovery uses source month and reconcile only, without journal insert',async()=>{const c=create();await c.reconcileAdvancePeriod(recoverRow);assert.deepEqual(c.calls[0].args.p_operations,[{type:'reconcile',id:'synthetic-period',employee_id:'synthetic-employee',branch_id:'synthetic-branch',salary_month:'2026-09-01'}]);assert.deepEqual(c.mutationAttempts,[]);assert.match(c.message,/Новая выплата не создавалась/)})
 await test('zero debt prior payment becomes advance only',async()=>{const c=create();c.rows[0].opening_balance=0;c.paymentForm.amount='';await c.addSalaryPayment();const ops=c.calls[0].args.p_operations;assert.equal(ops.length,1);assert.equal(ops[0].type,'advance');assert.equal(ops[0].amount,50);assert.equal(ops[0].expected_prior_debt,0)})
 await test('mixed prior payment, excess advance and current payment use one RPC',async()=>{const c=create();await c.addSalaryPayment();assert.equal(c.calls.length,1);assert.deepEqual(c.calls[0].args.p_operations.map(o=>[o.type,o.amount,o.salary_month||o.advance_date]),[['payment',30,'2026-10-01'],['advance',20,'2026-11-03'],['payment',10,'2026-11-01']])})
 await test('manual accrual and payment batched with expected updated_at and original gross',async()=>{const c=create();c.useManualPreviousSalaryBalance=true;c.paymentForm.manual_previous_balance='60';await c.addSalaryPayment();assert.equal(c.calls.length,1);const op=c.calls[0].args.p_operations[0];assert.equal(op.type,'accrual_patch');assert.deepEqual(op.expected,{updated_at:'2026-10-01T00:00:00Z',salary_gross:40});assert.deepEqual(op.patch,{salary_gross:60})})
 await test('accrual preview is read-only and rejects non-accrual patch fields',async()=>{const c=create();c.previewAccrualPatch();assert.equal(c.calls.length,0);assert.equal(c.accrualPatchRows.length,1);c.accrualPatchText=JSON.stringify([{...matched,patch:{card_payment:1}}]);c.previewAccrualPatch();assert.equal(c.accrualPatchRows.length,0);assert.match(c.message,/Импорт меняет только/)})
 for(const mode of ['false','throw'])for(const handler of ['addAdvance','addSalaryPayment','saveAccrualPatch','reconcileAdvancePeriod'])await test(handler+': committed RPC and '+mode+' refresh reports saved',async()=>{const c=create();c.refreshMode=mode;await c[handler](recoverRow);assert.equal(c.persisted.length,1);assert.match(c.message,/(сохранён|сохранена|сохранены), но список не обновился/);assert.doesNotMatch(c.message,/Операция не сохранена/)})
 await writeFile(path.join(evidence,'payroll-handler-results.json'),JSON.stringify({passed:checks.length,checks,method:'Actual handler source + actual payroll-write exports, Node with synthetic state setters/RPC only. Browser rendering not covered.'},null,2))
 console.log('Payroll source-handler checks: '+checks.length+' passed. No network or database access. Browser rendering is not covered by this mode.')
 process.exit(0)
}

const result = await build({stdin:{contents:fixture,resolveDir:root,loader:'jsx'},bundle:true,write:false,outfile:'app.js',loader:{'.css':'css'},define:{'process.env.NODE_ENV':'"production"'},logLevel:'silent'})
const js=result.outputFiles.find(f=>f.path.endsWith('.js')).text
const css=result.outputFiles.find(f=>f.path.endsWith('.css')).text
const origin='http://127.0.0.1:31989'
const html='<!doctype html><html lang="ru"><meta charset="utf-8"><title>Isolated payroll verification</title><link rel="stylesheet" href="/app.css"><div id="root"></div><script src="/app.js"></script></html>'
if(process.env.EXPORT_FIXTURE_ONLY==='1'){
 const filename=path.join(evidence,'payroll-fixture.html')
 await writeFile(filename,'<!doctype html><html lang="ru"><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src \'none\'; script-src \'unsafe-inline\'; style-src \'unsafe-inline\'; connect-src \'none\'; img-src data:; font-src \'none\'; frame-src \'none\'"><title>Isolated payroll verification</title><style>'+css+'</style><div id="root"></div><script>'+js.replaceAll('</script','<\\/script')+'</script></html>')
 console.log('FIXTURE_FILE='+filename);process.exit(0)
}
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium'})
const page=await browser.newPage({viewport:{width:1440,height:1100}})
const errors=[],blocked=[];const checks=[]
page.on('pageerror',error=>errors.push(error.message))
page.on('console',msg=>{if(msg.type()==='error')errors.push(msg.text())})
await page.route('**/*',route=>{const url=new URL(route.request().url());if(url.origin!==origin){blocked.push(url.origin);return route.abort()}const body=url.pathname==='/app.js'?js:url.pathname==='/app.css'?css:html;return route.fulfill({status:200,contentType:url.pathname==='/app.js'?'text/javascript':url.pathname==='/app.css'?'text/css':'text/html',body})})
const open=async(query='')=>{await page.goto(origin+query);await page.getByRole('heading',{name:'Payroll repair · synthetic verification'}).waitFor();assert.ok((await page.locator('body').innerText()).length>200);assert.equal(await page.locator('[data-nextjs-dialog], .vite-error-overlay').count(),0)}
const calls=()=>page.evaluate(()=>window.__calls)
const status=()=>page.getByRole('status').innerText()
const screenshot=async(name)=>page.screenshot({path:path.join(evidence,name),fullPage:true})
const waitStatus=async(text)=>page.waitForFunction(text=>document.querySelector('[role="status"]').textContent.includes(text),text)
const advance=()=>page.getByTestId('advance')
const salary=()=>page.getByTestId('salary')
const accrual=()=>page.getByTestId('accrual')
const fillAdvance=async()=>{await advance().getByLabel('Сумма',{exact:true}).fill('12.34');await advance().getByLabel('Комментарий',{exact:true}).fill('Synthetic cash source fixture')}
const saveAdvance=()=>advance().getByRole('button',{name:'+ Добавить аванс',exact:true})
const saveSalary=()=>salary().getByRole('button',{name:'+ Сохранить операцию',exact:true})
const test=async(name,fn)=>{await fn();checks.push(name);console.log('PASS '+name)}
const matchedRow={id:'synthetic-period',employee_id:'synthetic-employee',branch_id:'synthetic-branch',salary_month:'2026-09-01',expected:{updated_at:'2026-10-01T00:00:00Z',worked_days:10,salary_gross:100},patch:{worked_days:12,salary_gross:120}}
try{
 await test('advance failure retains inputs; duplicate click one RPC; retry same key; clear after persistence',async()=>{
  await open();await fillAdvance();await page.evaluate(()=>{window.__rpcMode='fail';window.__defer=true})
  await saveAdvance().evaluate(el=>{el.click();el.click()})
  await page.waitForFunction(()=>window.__calls.length===1)
  assert.equal(await advance().getByRole('button',{name:'Сохранение...',exact:true}).isDisabled(),true)
  assert.equal(await advance().getByLabel('Сумма',{exact:true}).inputValue(),'12.34')
  assert.equal(await page.evaluate(()=>window.__persisted.length),0)
  await page.evaluate(()=>window.__release());await waitStatus('Операция не сохранена')
  assert.equal(await advance().getByLabel('Комментарий',{exact:true}).inputValue(),'Synthetic cash source fixture')
  await screenshot('payroll-advance-rpc-failure.png')
  const key=(await calls())[0].args.p_request_key
  await page.evaluate(()=>{window.__rpcMode='success';window.__defer=false});await saveAdvance().click();await waitStatus('Сохранено')
  assert.equal((await calls()).length,2);assert.equal((await calls())[1].args.p_request_key,key)
  assert.equal(await advance().getByLabel('Сумма',{exact:true}).inputValue(),'')
  assert.equal(await advance().getByLabel('Комментарий',{exact:true}).inputValue(),'')
  assert.equal(await page.evaluate(()=>window.__persisted.length),1)
  assert.equal((await calls())[1].args.p_operations[0].advance_date,'2026-10-03')
  assert.equal((await calls())[1].args.p_operations[0].salary_month,undefined)
  await screenshot('payroll-advance-persisted.png')
 })
 await test('missing migration fails closed without legacy writes',async()=>{
  await open();await fillAdvance();await page.evaluate(()=>window.__rpcMode='missing');await saveAdvance().click();await waitStatus('обновление базы ещё не установлено')
  assert.equal(await advance().getByLabel('Сумма',{exact:true}).inputValue(),'12.34');assert.deepEqual(await page.evaluate(()=>window.__mutationAttempts),[])
 })
 await test('invalid result is not accepted as persistence; form retained',async()=>{
  await open();await fillAdvance();await page.evaluate(()=>window.__rpcMode='invalid');await saveAdvance().click();await waitStatus('подтвердить результат')
  assert.equal(await advance().getByLabel('Сумма',{exact:true}).inputValue(),'12.34')
 })
 await test('recovery reconciles source month only; no new journal operation',async()=>{
  await open();await advance().getByRole('button',{name:'Обновить остаток',exact:true}).evaluate(el=>{el.click();el.click()});await waitStatus('Новая выплата не создавалась')
  assert.equal((await calls()).length,1);assert.deepEqual((await calls())[0].args.p_operations,[{type:'reconcile',id:'synthetic-period',employee_id:'synthetic-employee',branch_id:'synthetic-branch',salary_month:'2026-09-01'}])
  assert.deepEqual(await page.evaluate(()=>window.__mutationAttempts),[])
  assert.deepEqual(await page.evaluate(()=>window.__reads[0].filters),[['employee_id','synthetic-employee'],['salary_month','2026-09-01']])
  await screenshot('payroll-recovery-source-month.png')
 })
 await test('zero prior debt routes prior payment entirely to advance',async()=>{
  await open('?debt=0');await salary().getByRole('checkbox',{name:'Оплатить долг / остаток зарплаты прошлого месяца',exact:true}).check();await salary().getByLabel('Сумма оплаты долга прошлого месяца',{exact:true}).fill('50');await saveSalary().click();await waitStatus('превышение перенесено в аванс')
  const ops=(await calls())[0].args.p_operations;assert.equal(ops.length,1);assert.equal(ops[0].type,'advance');assert.equal(ops[0].amount,50);assert.equal(ops[0].expected_prior_debt,0);assert.equal(ops[0].advance_date,'2026-11-03')
 })
 await test('mixed prior/current amounts use one RPC; failures retain state and retry identity',async()=>{
  await open('?debt=30');await salary().getByRole('checkbox',{name:'Оплатить долг / остаток зарплаты прошлого месяца',exact:true}).check();await salary().getByLabel('Сумма оплаты долга прошлого месяца',{exact:true}).fill('50');await salary().getByLabel('Оплата зарплаты выбранного месяца',{exact:true}).fill('10');await salary().getByLabel('Комментарий',{exact:true}).fill('Synthetic mixed payment')
  await page.evaluate(()=>{window.__rpcMode='fail';window.__defer=true});await saveSalary().evaluate(el=>{el.click();el.click()});await page.waitForFunction(()=>window.__calls.length===1)
  assert.equal(await salary().getByLabel('Оплата зарплаты выбранного месяца',{exact:true}).inputValue(),'10')
  await page.evaluate(()=>window.__release());await waitStatus('Операция не сохранена')
  assert.equal(await salary().getByLabel('Сумма оплаты долга прошлого месяца',{exact:true}).inputValue(),'50')
  const request=(await calls())[0];assert.equal(request.args.p_operations.length,3)
  assert.deepEqual(request.args.p_operations.map(x=>[x.type,x.amount,x.salary_month||x.advance_date]),[['payment',30,'2026-10-01'],['advance',20,'2026-11-03'],['payment',10,'2026-11-01']])
  await screenshot('payroll-mixed-payment-rpc-failure.png')
  await page.evaluate(()=>{window.__rpcMode='success';window.__defer=false});await saveSalary().click();await waitStatus('закрыт остаток прошлого месяца')
  assert.equal((await calls()).length,2);assert.equal((await calls())[1].args.p_request_key,request.args.p_request_key)
  assert.equal(await salary().getByLabel('Оплата зарплаты выбранного месяца',{exact:true}).inputValue(),'')
  assert.equal(await salary().getByRole('checkbox',{name:'Оплатить долг / остаток зарплаты прошлого месяца',exact:true}).isChecked(),false)
 })
 await test('manual prior accrual and payment remain in one batch with optimistic expected gross',async()=>{
  await open('?debt=40');await salary().getByRole('checkbox',{name:'Ввести долг / остаток зарплаты прошлого месяца вручную',exact:true}).check();await salary().getByLabel('Сумма долга прошлого месяца',{exact:true}).fill('60');await salary().getByLabel('Оплата зарплаты выбранного месяца',{exact:true}).fill('10');await saveSalary().click();await waitStatus('сохранено начисление прошлого месяца')
  const ops=(await calls())[0].args.p_operations;assert.equal((await calls()).length,1);assert.equal(ops.length,2);assert.equal(ops[0].type,'accrual_patch');assert.deepEqual(ops[0].expected,{updated_at:'2026-10-01T00:00:00Z',salary_gross:40});assert.deepEqual(ops[0].patch,{salary_gross:60})
 })
 await test('matched accrual preview is read-only; failure retains rows; retry same key',async()=>{
  await open();await accrual().locator('summary').click();await accrual().getByLabel('JSON сопоставленных строк').fill(JSON.stringify([matchedRow],null,2));await accrual().getByRole('button',{name:'Проверить строки',exact:true}).click();await waitStatus('Проверено строк: 1')
  assert.equal((await calls()).length,0);assert.match(await accrual().innerText(),/10 → 12/)
  await page.evaluate(()=>{window.__rpcMode='fail';window.__defer=true});await accrual().getByRole('button',{name:'Сохранить 1 строк',exact:true}).evaluate(el=>{el.click();el.click()});await page.waitForFunction(()=>window.__calls.length===1)
  assert.equal(await accrual().getByLabel('JSON сопоставленных строк').isDisabled(),true)
  await page.evaluate(()=>window.__release());await waitStatus('Операция не сохранена')
  assert.equal(await accrual().getByLabel('JSON сопоставленных строк').inputValue(),JSON.stringify([matchedRow],null,2))
  await screenshot('payroll-accrual-preview-failure.png')
  const first=(await calls())[0];assert.deepEqual(first.args.p_operations,[{type:'accrual_patch',...matchedRow}])
  await page.evaluate(()=>{window.__rpcMode='success';window.__defer=false});await accrual().getByRole('button',{name:'Сохранить 1 строк',exact:true}).click();await waitStatus('Сопоставленные начисления сохранены')
  assert.equal((await calls())[1].args.p_request_key,first.args.p_request_key);assert.equal(await accrual().getByLabel('JSON сопоставленных строк').inputValue(),'');assert.equal(await accrual().getByRole('button',{name:'Сохранить 0 строк',exact:true}).isDisabled(),true)
 })
 await test('invalid matched accrual changes cannot be saved',async()=>{
  await open();await accrual().locator('summary').click();await accrual().getByLabel('JSON сопоставленных строк').fill(JSON.stringify([{...matchedRow,patch:{card_payment:12}}]));await accrual().getByRole('button',{name:'Проверить строки',exact:true}).click();await waitStatus('Импорт меняет только')
  assert.equal((await calls()).length,0);assert.equal(await accrual().getByRole('button',{name:'Сохранить 0 строк',exact:true}).isDisabled(),true)
 })
 for(const mode of ['false','throw']){
  await test('committed advance + '+mode+' refresh is explicitly reported as saved',async()=>{
   await open();await fillAdvance();await page.evaluate(mode=>window.__refreshMode=mode,mode);await saveAdvance().click();await page.waitForFunction(()=>document.querySelector('[role="status"]').textContent.length>0)
   assert.equal(await page.evaluate(()=>window.__persisted.length),1)
   assert.equal(await advance().getByLabel('Сумма',{exact:true}).inputValue(),'')
   assert.match(await status(),/(Аванс сохранён|Операция сохранена), но список не обновился/)
   assert.doesNotMatch(await status(),/Операция не сохранена/)
  })
  await test('committed salary + '+mode+' refresh is explicitly reported as saved',async()=>{
   await open();await salary().getByLabel('Оплата зарплаты выбранного месяца',{exact:true}).fill('10');await page.evaluate(mode=>window.__refreshMode=mode,mode);await saveSalary().click();await page.waitForFunction(()=>document.querySelector('[role="status"]').textContent.length>0)
   assert.equal(await page.evaluate(()=>window.__persisted.length),1);assert.match(await status(),/Операция сохранена, но список не обновился/)
  })
  await test('committed accrual + '+mode+' refresh is explicitly reported as saved',async()=>{
   await open();await accrual().locator('summary').click();await accrual().getByLabel('JSON сопоставленных строк').fill(JSON.stringify([matchedRow]));await accrual().getByRole('button',{name:'Проверить строки',exact:true}).click();await page.evaluate(mode=>window.__refreshMode=mode,mode);await accrual().getByRole('button',{name:'Сохранить 1 строк',exact:true}).click();await page.waitForFunction(()=>window.__persisted.length===1&&document.querySelector('[role="status"]').textContent.length>0)
   assert.match(await status(),/(Начисления сохранены|Операция сохранена), но список не обновился/)
  })
 }
 assert.deepEqual(errors,[],'No browser runtime or console errors')
 assert.deepEqual(blocked,[],'No external network requests attempted')
 await writeFile(path.join(evidence,'payroll-browser-results.json'),JSON.stringify({passed:checks.length,checks,errors,blocked,method:'Source-extracted actual React handlers and production form controls; esbuild, Playwright, Chromium; route-fulfilled synthetic origin; no server and no external requests'},null,2))
 console.log('Payroll browser checks: '+checks.length+' passed; no external requests, auth, or database writes.')
}catch(error){await screenshot('payroll-browser-failure.png');await writeFile(path.join(evidence,'payroll-browser-results.json'),JSON.stringify({passed:checks.length,checks,failure:error.stack,errors,blocked},null,2));throw error}
finally{await browser.close()}
