import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import { transform } from 'esbuild'
const raw = await fs.readFile('src/main.parts/part-02.jsxpart','utf8')
const source = raw.replaceAll('\r\n','\n')
const section = source.slice(source.indexOf('function Revenue('), source.indexOf('function RevenueEntryRow('))
const slice = (text,start,end) => { const a=text.indexOf(start),b=text.indexOf(end,a);assert.ok(a>=0&&b>a,start);return text.slice(a,b) }
const helper = slice(source,'function rmsRevenueCorrectionSnapshot(', 'function Revenue(')
const normalize = new Function(helper+';return rmsRevenueCorrectionSnapshot')()
const loadHandler = slice(section,'  async function load() {','  async function loadLogs(')
const monthHandler = slice(section,'  async function loadMonthStats(','  async function addRevenueEntry(')
const totals = slice(section,'  const activeRevenueEntries =','  const recentRevenueLogs =')
const saveHandler = slice(section,'  async function saveCashRegister() {','  async function saveServiceCharge(')
const csvHandler = slice(section,'  function exportRevenueDayCsv() {','  function printRevenueDayReport() {')
const printHandler = slice(section,'  function printRevenueDayReport() {','\n  if (correctionReadyKey !==')
const branch='synthetic-branch',date='2026-10-03'
const correction={id:'synthetic-original',original_advance_id:'synthetic-original',employee_id:'synthetic-employee',branch_id:branch,payment_date:date,amount:60,employees:{full_name:'Synthetic Employee',position:'Synthetic role'},branches:{name:'Synthetic branch'}}
const manual=[{id:'synthetic-expense',branch_id:branch,expense_date:date,amount:20,deleted_at:null},{id:'synthetic-wolt',branch_id:branch,expense_date:date,amount:15,is_wolt:true,deleted_at:null}]
const revenue=[{id:'synthetic-revenue',branch_id:branch,revenue_date:date,cash_amount:500,bank_amount:40,wolt_amount:30,deleted_at:null}]
const wsSeed={salary_correction_expenses:[correction],salary_advances:[{id:'synthetic-residual',branch_id:branch,advance_date:date,amount:40,is_cancelled:false}],expenses:manual,revenue_entries:revenue,cash_register:{opening_cash:100,counted_cash:505},inflows:[{amount:25}],expense_categories:[],logs:[],month_stats:{cash:500,bank:40,wolt:30,revenue:570,expenses:135,reclassification_cash:60,reclassification_advance_cash:40,inflows:25,serviceCharge:0,serviceCost:0}}
function harness(internal=false) {
 const c={branchId:branch,date,internal,workspace:structuredClone(wsSeed),rpcCalls:[],reads:[],revenueLoadRef:{current:0},correctionExpenses:[],correctionReadyKey:'',correctionLoadError:'',advanceExpenses:[],expenses:[],inflows:[],revenueEntries:[],cashForm:{opening_cash:100,counted_cash:505},serviceForm:{enabled:false},form:{},woltEnabledForBranch:true,selectedBranchName:'Synthetic branch',message:'',monthStats:null,logs:[],parseNum:v=>Number(v)||0,fmt:v=>(Number(v)||0).toFixed(2),rmsRevenueCorrectionSnapshot:normalize,monthKeyFromDate:v=>v.slice(0,7),rmsNextMonthStart:()=> '2026-11-01',rmsIsWoltCommissionExpenseRow:r=>r.is_wolt,expenseNameFromRow:()=> 'Synthetic expense',html:null,csv:null}
 for (const name of ['RevenueEntries','CashRow','ManualOpeningCashEnabled','CashForm','ServiceForm','Expenses','AdvanceExpenses','CorrectionExpenses','Inflows','Categories','Logs','MonthStats','CorrectionReadyKey','CorrectionLoadError','Message']) c['set'+name]=value=>{const key=name[0].toLowerCase()+name.slice(1);c[key]=typeof value==='function'?value(c[key]):value}
 c.getInternalSessionStorage=()=>internal?{rms_internal:true}:null
 c.fetchRmsRevenueWorkspace=async(b,d)=>{c.rpcCalls.push({name:'rms_revenue_day_workspace',args:{p_branch_id:b,p_date:d}});if(c.workspaceError)return{error:c.workspaceError};return{data:structuredClone(c.workspace),error:null}}
 c.supabase={rpc:async(name,args)=>{c.rpcCalls.push({name,args});return{data:{id:'synthetic-cash-save'},error:null}},from:table=>{
  const query={table,filters:[]};c.reads.push(query)
  const chain={select(){return this},eq(k,v){query.filters.push([k,v]);return this},gte(){return this},lt(){return this},is(){return this},or(){return this},order(){return this},limit(){return this},maybeSingle(){return this},then(resolve,reject){
   const data={daily_revenue_entries:c.workspace.revenue_entries,daily_cash_register:c.workspace.cash_register,branches:{id:branch},daily_expenses:c.workspace.expenses,salary_advances:c.workspace.salary_advances,daily_cash_inflows:c.workspace.inflows,expense_categories:[],daily_revenue:c.workspace.revenue_entries,monthly_branch_service_charge_cost:[],finance_operation_log:[]}[table]
   return Promise.resolve({data:structuredClone(data),error:null}).then(resolve,reject)
  }};return chain
 }}
 c.loadLogs=async()=>{}
 c.downloadRevenueReportCsv=(filename,rows)=>{c.csv={filename,rows}}
 c.window={open:()=>({document:{write:html=>{c.html=html},close(){}}})}
 Object.assign(c,new Function('context',`with(context){${loadHandler}\n${monthHandler}\n${saveHandler}\n${csvHandler}\n${printHandler}\nreturn {load,loadMonthStats,saveCashRegister,exportRevenueDayCsv,printRevenueDayReport}}`)(c))
 c.calculate=()=>Object.assign(c,new Function('context',`with(context){${totals}\nreturn {dailyRevenueTotal,dailyCashRevenue,dailyBankRevenue,dailyWoltRevenue,dailyManualExpenseTotal,dailyAdvanceExpenseTotal,dailyCorrectionExpenseTotal,dailyExpenseTotal,dailyCashExpenseTotal,dailyInflowTotal,calculatedClosingCash,cashDifference,dailyServiceChargeAmount,dailyServiceStaffCost}}`)(c))
 return c
}
let checks=0
async function test(name,fn){await fn();checks++;console.log('PASS '+name)}
await test('same original payout survives partial and full correction in day cash, monthly totals and cash-save payload',async()=>{
 for(const portion of [0,60,100]){
  const c=harness();c.workspace.salary_correction_expenses=portion?[{...correction,amount:portion}]:[];c.workspace.month_stats.reclassification_cash=portion;c.workspace.month_stats.reclassification_advance_cash=100-portion;c.workspace.salary_advances=portion===100?[]:[{id:portion?'synthetic-residual':'synthetic-original',amount:100-portion,advance_date:date,branch_id:branch}]
  assert.equal(await c.load(),true);c.calculate();assert.equal(c.dailyExpenseTotal,135);assert.equal(c.dailyCashExpenseTotal,120);assert.equal(c.calculatedClosingCash,505);assert.equal(c.monthStats.expenses,135);assert.equal(c.monthStats.reclassification_cash,portion);assert.equal(c.rpcCalls.length,1,'full direct load must not repeat workspace read')
  await c.saveCashRegister();const saved=c.rpcCalls.find(x=>x.name==='rms_cash_register_save_secure');assert.equal(saved.args.p_closing_cash,490,'preserve existing save formula; correction does not change cash')
 }
})
await test('internal workspace monthly expense already includes correction and is not counted twice',async()=>{
 const c=harness(true);await c.load();c.calculate();assert.equal(c.monthStats.expenses,135);assert.equal(c.dailyCorrectionExpenseTotal,60);assert.equal(c.dailyCashExpenseTotal,120);assert.equal(c.rpcCalls.length,1);assert.equal(c.reads.length,0)
 await c.loadMonthStats();assert.equal(c.monthStats.expenses,135)
})
await test('month-only refresh fetches linked subtotal once, existing subtotal avoids full workspace duplicate',async()=>{
 const c=harness();await c.loadMonthStats();assert.equal(c.rpcCalls.length,1);assert.equal(c.monthStats.expenses,135);await c.loadMonthStats(branch,date,{monthTotal:60,monthAdvanceTotal:40});assert.equal(c.rpcCalls.length,1);assert.equal(c.monthStats.expenses,135)
})
await test('cancelled rows excluded; repeated original ID counted once; conflicting duplicates rejected',()=>{
 const ws=structuredClone(wsSeed);ws.salary_correction_expenses.push(structuredClone(correction),{...correction,id:'cancelled-original',original_advance_id:'cancelled-original',amount:99,is_cancelled:true});assert.equal(normalize(ws,branch,date).rows.length,1);assert.equal(normalize(ws,branch,date).monthTotal,60);ws.salary_correction_expenses.push({...correction,amount:61});assert.throws(()=>normalize(ws,branch,date),/Противоречивые/)
})
await test('payment identity and salary month never enter new read-side fields or exports',async()=>{
 const c=harness();await c.load();c.calculate();c.exportRevenueDayCsv();c.printRevenueDayReport();const csv=JSON.stringify(c.csv.rows);assert.match(csv,/synthetic-original/);assert.match(csv,/2026-10-03/);assert.match(csv,/Зарплата из исправленного аванса/);assert.match(c.html,/Исходный аванс: synthetic-original/);assert.doesNotMatch(csv,/salary_month|payment_id|Месяц:|выплата:/);assert.doesNotMatch(c.html,/salary_month|payment_id|Месяц:|выплата:/)
 assert.ok(!c.reads.some(x=>x.table==='salary_payments'),'ordinary native salary payments are never loaded')
 assert.ok(!c.reads.some(x=>x.table==='salary_advances'),'day/month advances must come from the same snapshot as corrections')
 const line=section.split('\n').find(x=>x.includes('correctionExpenses.map(row => <tr'));assert.match(line,/Только просмотр/);assert.ok(!/onClick|onSave|onCancel|salary_month/.test(line))
})
await test('HTML export escapes the existing employee display name',async()=>{
 const c=harness();c.workspace.salary_correction_expenses[0].employees.full_name='<script>unsafe</script>';await c.load();c.calculate();c.printRevenueDayReport();assert.ok(c.html.includes('&lt;script&gt;unsafe&lt;/script&gt;'));assert.ok(!c.html.includes('<script>unsafe</script>'))
})
for(const [name,mutate] of [
 ['missing array',w=>delete w.salary_correction_expenses],['missing month subtotal',w=>delete w.month_stats.reclassification_cash],['missing coherent advance subtotal',w=>delete w.month_stats.reclassification_advance_cash],['wrong date',w=>w.salary_correction_expenses[0].payment_date='2026-09-01'],['wrong branch',w=>w.salary_correction_expenses[0].branch_id='other'],['unlinked native payment',w=>delete w.salary_correction_expenses[0].original_advance_id],['new payment ID instead of original ID',w=>w.salary_correction_expenses[0].id='payment-id'],['invalid amount',w=>w.salary_correction_expenses[0].amount='NaN'],['invalid month amount',w=>w.month_stats.reclassification_cash=-1],['month below day',w=>w.month_stats.reclassification_cash=0]
])await test(name+' fails closed before displaying or saving/exporting inaccurate cash',async()=>{
 const c=harness();mutate(c.workspace);assert.equal(await c.load(),false);assert.equal(c.correctionReadyKey,'');assert.match(c.correctionLoadError,/Расчёт кассы недоступен/);assert.equal(c.reads.length,0);await c.saveCashRegister();c.exportRevenueDayCsv();c.printRevenueDayReport();assert.equal(c.csv,null);assert.equal(c.html,null);assert.equal(c.rpcCalls.length,1)
})
await test('RPC errors fail closed in daily and standalone monthly reads',async()=>{
 const c=harness();c.workspaceError={code:'42501',message:'Synthetic denied'};assert.equal(await c.load(),false);assert.match(c.correctionLoadError,/Synthetic denied/);assert.equal(c.correctionReadyKey,'');assert.equal(await c.loadMonthStats(),false);assert.equal(c.monthStats,null)
})
await test('superseded workspace request cannot overwrite newer correction state',async()=>{
 const c=harness();let release;const first=structuredClone(c.workspace);c.fetchRmsRevenueWorkspace=()=>new Promise(resolve=>{release=()=>resolve({data:first})});const pending=c.load();c.revenueLoadRef.current++;release();assert.equal(await pending,false);assert.equal(c.correctionExpenses.length,0);assert.equal(c.correctionReadyKey,'')
})
await test('day selection uses actual original payment date rather than settlement month',()=>{
 assert.equal(normalize(wsSeed,branch,'2026-10-03').rows[0].payment_date,'2026-10-03');assert.throws(()=>normalize(wsSeed,branch,'2026-09-01'),/дату/)
})
await test('cash view is withheld until validated scope is ready; existing source keeps CRLF',async()=>{
 assert.match(section,/if \(correctionReadyKey !== `\$\{branchId\}\|\$\{date\}` \|\| correctionLoadError\) return <section/)
 assert.ok(raw.includes('\r\n'));assert.equal((raw.match(/(?<!\r)\n/g)||[]).length,6,'pre-existing six lone LF lines preserved')
 await transform(helper+section,{loader:'jsx',format:'esm'})
})
console.log(`Payroll correction cash read-side: ${checks} checks passed`)

if(process.env.EXPORT_FIXTURE_ONLY==='1') {
 const {build}=await import('esbuild')
 const fixtureDir=process.env.PAYROLL_BROWSER_EVIDENCE || '.test-results/payroll-preview'
 await fs.mkdir(fixtureDir,{recursive:true})
 const rowMarkup=section.split('\n').find(line=>line.includes('correctionExpenses.map(row => <tr'))
 const fixture=`import React,{useEffect,useRef,useState} from 'react';import {createRoot} from 'react-dom/client';import './src/styles.css';
 const branch=${JSON.stringify(branch)},dateValue=${JSON.stringify(date)},seed=${JSON.stringify(wsSeed)},correctionSeed=${JSON.stringify(correction)};
 const parseNum=value=>Number(value)||0,fmt=value=>(Number(value)||0).toFixed(2),monthKeyFromDate=value=>value.slice(0,7),rmsNextMonthStart=()=>'2026-11-01',rmsIsWoltCommissionExpenseRow=row=>row.is_wolt,expenseNameFromRow=()=>'Synthetic expense';
 ${helper}
 function CashHarness(){
 const [scenario,setScenario]=useState('partial'),[internal,setInternal]=useState(false);
 const branchId=branch,date=dateValue,selectedBranchName='Synthetic branch';
 const ws=structuredClone(seed),portion=scenario==='before'?0:scenario==='full'?100:60;
 ws.salary_correction_expenses=portion?[{...correctionSeed,amount:portion}]:[];ws.month_stats.reclassification_cash=portion;ws.month_stats.reclassification_advance_cash=100-portion;ws.salary_advances=portion===100?[]:[{id:portion?'synthetic-residual':'synthetic-original',branch_id:branch,advance_date:date,amount:100-portion,is_cancelled:false}];
 if(scenario==='invalid')delete ws.salary_correction_expenses;
 const [correctionExpenses,setCorrectionExpenses]=useState([]),[advanceExpenses,setAdvanceExpenses]=useState([]),[expenses,setExpenses]=useState([]),[revenueEntries,setRevenueEntries]=useState([]),[inflows,setInflows]=useState([]),[cashForm,setCashForm]=useState({}),[serviceForm,setServiceForm]=useState({enabled:false}),[monthStats,setMonthStats]=useState(null),[correctionReadyKey,setCorrectionReadyKey]=useState(''),[correctionLoadError,setCorrectionLoadError]=useState(''),[exportedCsv,setExportedCsv]=useState(null),[printedHtml,setPrintedHtml]=useState('');
 const revenueLoadRef=useRef(0);const setCashRow=()=>{},setManualOpeningCashEnabled=()=>{},setCategories=()=>{},setLogs=()=>{},setMessage=()=>{},loadLogs=async()=>{};
 const form={},woltEnabledForBranch=true;
 const getInternalSessionStorage=()=>internal?{rms_internal:true}:null;
 const fetchRmsRevenueWorkspace=async()=>scenario==='denied'?{error:{code:'42501',message:'Synthetic required read denied'}}:{data:ws,error:null};
 const supabase={from:table=>{const chain={select(){return this},eq(){return this},gte(){return this},lt(){return this},is(){return this},or(){return this},order(){return this},limit(){return this},maybeSingle(){return this},then(resolve,reject){const data={daily_revenue_entries:ws.revenue_entries,daily_cash_register:ws.cash_register,branches:{id:branch},daily_expenses:ws.expenses,daily_cash_inflows:ws.inflows,expense_categories:[],daily_revenue:ws.revenue_entries,monthly_branch_service_charge_cost:[]}[table];return Promise.resolve({data,error:null}).then(resolve,reject)}};return chain}};
 ${loadHandler}
 ${monthHandler}
 ${totals}
 const downloadRevenueReportCsv=(filename,rows)=>setExportedCsv({filename,rows});
 const window={open:()=>({document:{write:html=>setPrintedHtml(html),close(){}}})};
 ${csvHandler}
 ${printHandler}
 useEffect(()=>{setExportedCsv(null);setPrintedHtml('');load()},[scenario,internal]);
 const ready=correctionReadyKey===branchId+'|'+date&&!correctionLoadError;
 return <main style={{maxWidth:1100,margin:'auto',padding:24}}><h1>Payroll cash conservation · synthetic verification</h1><p>Actual Revenue read handlers, calculation source, linked rows and export handlers. No credentials or network access.</p><p>Original cash payout100.00 AZN on2026-10-03. Expected cash end505.00 AZN in before,partial and full scenarios. The existing cash-save formula is outside this read-only fixture.</p><div className="form-grid compact"><label>Scenario<select aria-label="Scenario" value={scenario} onChange={event=>setScenario(event.target.value)}><option value="before">Before: advance100</option><option value="partial">Partial: advance40 + correction60</option><option value="full">Full: correction100</option><option value="invalid">Missing correction data</option><option value="denied">Required read denied</option></select></label><label>Workspace route<select aria-label="Workspace route" value={internal?'internal':'authenticated'} onChange={event=>setInternal(event.target.value==='internal')}><option value="authenticated">Authenticated direct</option><option value="internal">Internal workspace</option></select></label></div>
 {!ready?<div className="notice bad" role="alert">{correctionLoadError||'Loading verified cash snapshot...'}</div>:<><div className="mini-grid"><div className="metric"><span>Active advances</span><strong>{fmt(dailyAdvanceExpenseTotal)}</strong></div><div className="metric"><span>Linked corrections</span><strong>{fmt(dailyCorrectionExpenseTotal)}</strong></div><div className="metric"><span>Total payroll cash payout</span><strong>{fmt(dailyAdvanceExpenseTotal+dailyCorrectionExpenseTotal)}</strong></div><div className="metric"><span>Daily expenses</span><strong>{fmt(dailyExpenseTotal)}</strong></div><div className="metric"><span>Monthly expenses</span><strong>{fmt(monthStats?.expenses)}</strong></div><div className="metric"><span>Cash end</span><strong>{fmt(calculatedClosingCash)}</strong></div></div><div className="table-wrap"><table><thead><tr><th>Date</th><th>Expense</th><th>Amount</th><th>Original link</th><th>Status</th><th>Access</th></tr></thead><tbody>${rowMarkup}{!correctionExpenses.length&&<tr><td colSpan="6">No linked correction expense</td></tr>}</tbody></table></div></>}
 <div className="action-row"><button disabled={!ready} onClick={exportRevenueDayCsv}>Check CSV data</button><button disabled={!ready} onClick={printRevenueDayReport}>Check PDF data</button></div>
 {exportedCsv&&<section className="card"><h2>CSV data generated by actual export handler</h2><pre data-testid="csv-data" style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{JSON.stringify(exportedCsv,null,2)}</pre></section>}
 {printedHtml&&<section className="card"><h2>PDF data generated by actual print handler</h2><div data-testid="pdf-data" dangerouslySetInnerHTML={{__html:printedHtml.split('<body>')[1].split('</body>')[0].replace(/<button[^>]*>[^<]*<\\/button>/g,'')}}/></section>}
 </main>}
 createRoot(document.getElementById('root')).render(<CashHarness/>);`
 const built=await build({stdin:{contents:fixture,resolveDir:process.cwd(),loader:'jsx'},bundle:true,write:false,outfile:'app.js',loader:{'.css':'css'},define:{'process.env.NODE_ENV':'"production"'},logLevel:'silent'})
 const js=built.outputFiles.find(file=>file.path.endsWith('.js')).text,css=built.outputFiles.find(file=>file.path.endsWith('.css')).text
 const html='<!doctype html><html lang="ru"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src \'none\'; script-src \'unsafe-inline\'; style-src \'unsafe-inline\'; connect-src \'none\'; img-src data:; font-src \'none\'; frame-src \'none\'"><title>Synthetic payroll cash conservation</title><style>'+css+'</style><div id="root"></div><script>'+js.replaceAll('</script','<\\/script')+'</script></html>'
 await fs.writeFile(fixtureDir+'/revenue-correction-fixture.html',html)
 console.log('Synthetic cash fixture exported: '+fixtureDir+'/revenue-correction-fixture.html')
}
