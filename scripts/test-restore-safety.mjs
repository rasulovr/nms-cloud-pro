import assert from 'node:assert/strict'
import {readFile, writeFile, mkdir} from 'node:fs/promises'
import {execFileSync} from 'node:child_process'
import vm from 'node:vm'
const source=await readFile('src/main.parts/part-05.jsxpart','utf8')
const baseline = '0d9b182c5e3f8109822b2913b1276296af90aea7'
const original=execFileSync('git',['show',`${baseline}:src/main.parts/part-05.jsxpart`],{encoding:'utf8'})
const part0=await readFile('src/main.parts/part-00.jsxpart','utf8')
const slice=(s,a,b)=>{const x=s.indexOf(a),y=s.indexOf(b,x);assert.ok(x>=0&&y>x,a);return s.slice(x,y)}
const constants=slice(part0,'const RMS_FULL_BACKUP_TABLES =','const RMS_FULL_BACKUP_TABLE_KEY')
const handlers=slice(source,'  // Inspection only:','  function downloadRmsJsonFile')+slice(source,'  async function importFullRmsBackup','  async function clearOperationalData')
const tables=vm.runInNewContext(constants+';RMS_FULL_BACKUP_TABLES')
const full={backup_type:'rms_full_restore_backup',version:2,tables:Object.fromEntries(tables.map(t=>[t,[{id:'synthetic'}]])),table_errors:{},local_storage:{session:'replacement',sentinel:null}}
const cases=[['full',JSON.stringify(full),'Структура JSON проверена'],['partial',JSON.stringify({...full,tables:{branches:[]}}),'Архив неполный'],['export-errors',JSON.stringify({...full,table_errors:{branches:'synthetic failure'}}),'Архив неполный'],['bad-json','{','Некорректный JSON'],['null','null','Корень JSON'],['array','[]','Корень JSON'],['wrong-tables',JSON.stringify({...full,tables:[]}),'объектом tables'],['bad-row',JSON.stringify({...full,tables:{branches:[null]}}),'массив объектов'],['bad-storage',JSON.stringify({...full,local_storage:[]}),'local_storage'],['operational',JSON.stringify({created_at:'synthetic',daily_revenue:[{id:'synthetic'}]}),'Структура JSON проверена']]
const results=[]
let writes=0,message=''
const forbidden=()=>{writes++;throw Error('Mutation attempted')}
const context=vm.createContext({setMsg:v=>message=v,supabase:new Proxy({},{get:()=>forbidden}),localStorage:new Proxy({},{get:()=>forbidden})})
vm.runInContext(constants+handlers+';globalThis.run=(event,full)=>full?importFullRmsBackup(event):importBackup(event)',context)
for(const mode of [true,false])for(const [name,text]of cases){const event={target:{value:'chosen',files:[{text:async()=>text}]}};await context.run(event,mode);assert.equal(event.target.value,'');assert.match(message,/Восстановление JSON из браузера отключено/);results.push({mode:mode?'full':'operational',case:name,passed:true})}
await context.run({target:{files:[{text:async()=>{throw Error('synthetic read failure')}}]}},true)
assert.match(message,/synthetic read failure/);assert.equal(writes,0)
for (const mode of [true, false]) {
  let reads = 0
  const event = {target: {value: 'chosen', files: [{size: 50 * 1024 * 1024 + 1, text: async () => {reads++; throw Error('Oversized file must not be read')}}]}}
  await context.run(event, mode)
  assert.equal(reads, 0)
  assert.equal(event.target.value, '')
  assert.match(message, /превышает лимит 50 MiB и не был прочитан/)
  assert.match(message, /Восстановление JSON из браузера отключено/)
  results.push({mode: mode ? 'full' : 'operational', case: 'oversized', fileTextCalls: reads, passed: true})
  await context.run({target: {files: [{size: 50 * 1024 * 1024, text: async () => {reads++; return JSON.stringify(mode ? full : {daily_revenue: []})}}]}}, mode)
  assert.equal(reads, 1)
  assert.match(message, /Структура JSON проверена/)
  results.push({mode: mode ? 'full' : 'operational', case: 'exact-size-limit', passed: true})
}
assert.equal(writes, 0)
// Export implementations and unrelated import/clear regions must stay unchanged.
assert.equal(slice(original,'  async function exportBackup()','  async function importBackup('),slice(source,'  async function exportBackup()','  // Inspection only:'))
assert.equal(slice(original,'  function downloadRmsJsonFile','  function restoreLocalBackupState'),slice(source,'  function downloadRmsJsonFile','  async function exportFullRmsBackup()'))
const clearFunction = s => s.slice(s.indexOf('  async function clearOperationalData()'),s.indexOf('\n  }',s.indexOf('  async function clearOperationalData()'))+4)
assert.equal(clearFunction(original),clearFunction(source))
assert.equal(slice(original,'  function normalizeImportValue','  return (\n    <section'),slice(source,'  function normalizeImportValue','  return (\n    <section'))
assert.equal(slice(original,'  async function exportFullRmsBackup()','  async function clearTableForRestore').replace('Полный бэкап RMS скачан. Его можно использовать для восстановления данных RMS.','Полный бэкап RMS скачан. Пригодность к восстановлению требует отдельной проверки.'),slice(source,'  async function exportFullRmsBackup()','  async function importFullRmsBackup'))
assert.equal(source.slice(0,source.indexOf('  async function exportBackup()')),original.slice(0,original.indexOf('  async function exportBackup()')))
assert.ok(!/nms_restore_operational_data|restoreLocalBackupState|clearTableForRestore|insertRowsForRestore/.test(source))
await mkdir('.test-results/restore-safety',{recursive:true})
await writeFile('.test-results/restore-safety/unit.json',JSON.stringify({results,mutationAttempts:writes},null,2))
console.log(`PASS: ${results.length} source-handler cases, read failure, zero mutations, unchanged exports and clear handler`)
if(process.env.HANDLERS_ONLY==='1')process.exit(0)
const {build}=await import('esbuild');const {chromium}=await import('playwright');const {createServer}=await import('node:http')
const labels=source.split('\n').filter(l=>l.includes('onChange={importBackup}')||l.includes('onChange={importFullRmsBackup}')).join('\n')
const exports=slice(source,'  async function exportBackup()','  // Inspection only:')+slice(source,'  function downloadRmsJsonFile','  async function importFullRmsBackup')
const fixture=`import React,{useState} from 'react';import{createRoot}from'react-dom/client';${constants}
const RMS_SOURCE_VERSION='synthetic',RMS_FULL_BACKUP_LOCAL_KEYS=['sentinel'];window.attempts=[];
const supabase={rpc:async(name)=>{window.attempts.push(name);if(name!=='nms_backup_operational_data')throw Error('Forbidden RPC');return{data:{daily_revenue:[]}}},from:table=>({select:()=>({range:async()=>({data:[],error:null})}),insert:()=>window.attempts.push('INSERT'),update:()=>window.attempts.push('UPDATE'),delete:()=>window.attempts.push('DELETE')})};
function Harness(){const[msg,setMsg]=useState('');const[backupBusy,setBackupBusy]=useState(false);const beginBackupProgress=()=>{},updateBackupProgress=()=>{},completeBackupProgress=()=>{},failBackupProgress=()=>{};${handlers}${exports}return <><div>${labels}</div><p role="status">{msg}</p><button onClick={exportBackup}>Export operational</button><button onClick={exportFullRmsBackup}>Export full</button></>};createRoot(document.getElementById('root')).render(<Harness/>);`
const bundle=await build({stdin:{contents:fixture,resolveDir:process.cwd(),loader:'jsx'},bundle:true,write:false,format:'iife'})
const server=createServer((req,res)=>{res.setHeader('content-type','text/html');res.end('<div id="root"></div><script>'+bundle.outputFiles[0].text+'</script>')});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve))
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']})
const browserResults=[],network=[];let storageWrites=[]
try{const page=await browser.newPage();await page.route('**/*',async route=>{const req=route.request();if(req.url()===url&&req.isNavigationRequest())return route.continue();network.push({method:req.method(),url:req.url()});return route.abort()});const url=`http://127.0.0.1:${server.address().port}/`;
await page.addInitScript(()=>{localStorage.setItem('sentinel','original');window.storageWrites=[];for(const method of ['setItem','removeItem','clear']){const original=Storage.prototype[method];Storage.prototype[method]=function(...args){window.storageWrites.push({method,args});return original.apply(this,args)}}});await page.goto(url)
for(const mode of [true,false])for(const [name,text,expected]of cases){const input=page.getByLabel(mode?'Проверить полный RMS-бэкап':'Проверить операционный бэкап',{exact:true});for(let i=0;i<2;i++){await input.setInputFiles({name:'synthetic.json',mimeType:'application/json',buffer:Buffer.from(text)});await page.waitForFunction(()=>document.querySelector('[role=status]').textContent.includes('Восстановление JSON из браузера отключено'));assert.equal(await input.inputValue(),'')}
const message=await page.getByRole('status').innerText();if(mode&&name!=='operational')assert.ok(message.includes(expected),name+': '+message);if(!mode&&name==='operational')assert.ok(message.includes(expected));assert.deepEqual(await page.evaluate(()=>window.attempts),[]);assert.deepEqual(await page.evaluate(()=>window.storageWrites),[]);assert.deepEqual(await page.evaluate(()=>({...localStorage})),{sentinel:'original'});browserResults.push({mode:mode?'full':'operational',case:name,repeats:2,message})}
// Rapid concurrent selections must also remain inspection-only.
await page.evaluate(()=>{for(const input of document.querySelectorAll('input[type=file]'))for(let i=0;i<5;i++){const dt=new DataTransfer();dt.items.add(new File(['{"daily_revenue":[]}'],'repeat.json',{type:'application/json'}));input.files=dt.files;input.dispatchEvent(new Event('change',{bubbles:true}))}});await page.waitForTimeout(100);assert.deepEqual(await page.evaluate(()=>window.attempts),[]);assert.deepEqual(await page.evaluate(()=>window.storageWrites),[]);assert.equal(network.length,0)
for(const label of ['Export operational','Export full']){const downloadPromise=page.waitForEvent('download');await page.getByRole('button',{name:label,exact:true}).click();const download=await downloadPromise;const content=JSON.parse(await readFile(await download.path(),'utf8'));assert.ok(label==='Export full'?content.backup_type==='rms_full_restore_backup':Array.isArray(content.daily_revenue));browserResults.push({export:label,passed:true})}
assert.deepEqual(await page.evaluate(()=>window.attempts),['nms_backup_operational_data']);storageWrites=await page.evaluate(()=>window.storageWrites);assert.deepEqual(storageWrites,[])
await writeFile('.test-results/restore-safety/browser.json',JSON.stringify({browser:await browser.version(),results:browserResults,network,storageWrites,restoreMutationAttempts:0,fixture:'real source handlers and JSX file controls; synthetic dependencies; not full authenticated application'},null,2));console.log('PASS: Chromium real file inputs, 40 repeated selections + 10 rapid selections, zero restore RPC/DB/storage writes; two JSON exports')
}finally{await browser.close();await new Promise(resolve=>server.close(resolve))}
