import { build } from 'esbuild'
import { chromium } from 'playwright'
import { mkdtemp,writeFile,readFile } from 'node:fs/promises'
import {tmpdir} from 'node:os'
import path from 'node:path'
import assert from 'node:assert/strict'
const root=process.cwd(),out=process.env.EXPORT_FIXTURE_DIR||await mkdtemp(path.join(tmpdir(),'eqaime-ui-'))
const fixture=`
import React,{useState} from 'react';import {createRoot} from 'react-dom/client';import EqaimeReconciliation from './src/EqaimeReconciliation.jsx';
import {loadScopedRegister,analyzeRegister} from './server/eqaime-data.mjs';const entity='11111111-1111-4111-8111-111111111111';
window.__queries=[];window.__writes=[];window.__fail=false;window.__auth=true;
const invoices=Array.from({length:27},(_,i)=>({id:'i'+i,invoice_number:i===1?'MT990100000001-hissəvi':'MT990100'+String(1+i).padStart(6,'0'),legal_entity_id:entity,supplier_id:'s',amount:100,status:'matched',invoice_date:'2030-05-05'}));
const data={supplier_e_invoices:invoices,supplier_payments:[{id:'pay',legal_entity_id:entity,supplier_id:'s',amount:100,payment_date:'2030-05-15',invoice_notes:'SYNTHETIC TEST ONLY'}],supplier_e_invoice_purchase_links:[{id:'l2',e_invoice_id:'i2',purchase_id:'p',linked_amount:90}],supplier_purchases:[{id:'p',legal_entity_id:entity,supplier_id:'s',total_amount:90}],suppliers:[{id:'s',name:'Тестовый поставщик'}]};
const client={auth:{getUser:async()=>({data:{user:window.__auth?{id:'test-user'}:null}})},from:table=>{const q={table,filters:[]};window.__queries.push(q);const chain={select:()=>chain,eq:(k,v)=>{q.filters.push([k,v]);return chain},is:()=>chain,in:(k,v)=>{q.filters.push([k,v]);return chain},order:()=>chain,range:async(a,b)=>{if(window.__fail)return{error:{message:'Тестовый отказ чтения'}};return{data:(data[table]||[]).filter(r=>q.filters.every(([k,v])=>Array.isArray(v)?v.includes(r[k]):r[k]===v)).slice(a,b+1)}}};for(const x of ['insert','update','delete','upsert','rpc'])chain[x]=()=>{window.__writes.push(x);throw Error('FORBIDDEN')};return chain}};
async function loadReport(client){if(!window.__auth)throw Error('Требуется подтверждённая сервером сессия');return analyzeRegister(await loadScopedRegister(client,entity),entity)}
function App(){const [visible,setVisible]=useState(true);return <><aside><p>СИНТЕТИЧЕСКИЙ ДЕМО-РЕЕСТР. Все записи вымышлены. Рабочая база не подключена.</p><button onClick={()=>{window.__fail=true}}>Включить ошибку чтения</button><button onClick={()=>{window.__fail=false;window.__auth=true}}>Восстановить чтение</button><button onClick={()=>{window.__auth=false}}>Отключить демо-сессию</button></aside><button onClick={()=>setVisible(!visible)}>Переключить раздел</button>{visible&&<EqaimeReconciliation client={client} loadReport={loadReport}/>}</>};createRoot(document.getElementById('root')).render(<App/>);
`
const sanitize = source => source.replaceAll('Руслан','Демо-плательщик')
const sanitized=process.env.SANITIZED_PREVIEW==='1'
await build({stdin:{contents:sanitized?sanitize(fixture):fixture,resolveDir:root,loader:'jsx'},plugins:sanitized?[{name:'synthetic-only',setup(builder){builder.onLoad({filter:/[\/]src[\/](EqaimeReconciliation\.jsx|eqaime-register\.mjs)$/},async args=>({contents:sanitize(await readFile(args.path,'utf8')),loader:args.path.endsWith('.jsx')?'jsx':'js'}))}}]:[],bundle:true,outfile:path.join(out,'fixture.js'),format:'iife',platform:'browser',jsx:'automatic'})
await writeFile(path.join(out,'index.html'),'<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" href="fixture.css"><style>body{font-family:Arial;margin:24px;background:#f7faf8}button,input{padding:10px;border:1px solid #bacbc2;border-radius:8px}button{cursor:pointer}</style><div id="root"></div><script src="fixture.js"></script>')
if(process.env.EXPORT_FIXTURE_ONLY==='1'){console.log(out);process.exit(0)}
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});const page=await browser.newPage({viewport:{width:1300,height:1000}})
const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('file://'+path.join(out,'index.html'))
await page.getByText('Найдено записей: 27.',{exact:false}).waitFor()
assert.equal(await page.locator('tbody tr').count(),25)
await page.getByRole('button',{name:'Далее',exact:true}).click();assert.equal(await page.locator('tbody tr').count(),2)
await page.getByRole('button',{name:'Проверка накладных',exact:true}).click();assert.equal(await page.getByRole('button',{name:'Назад',exact:true}).isDisabled(),true)
await page.getByRole('button',{name:'Записанные оплаты',exact:true}).click();await page.getByText('Не сверено с банком / кассой',{exact:true}).waitFor()
await page.getByLabel('Поиск',{exact:true}).fill('nothing-found');await page.getByText('Нет доступных записей по выбранным условиям.',{exact:false}).waitFor()
await page.getByRole('button',{name:'Сбросить',exact:true}).click();assert.equal(await page.locator('tbody tr').count(),1)
await page.getByLabel('С даты',{exact:true}).fill('2030-06-01');await page.getByLabel('По дату',{exact:true}).fill('2030-05-01');await page.getByText('Дата начала должна быть не позже даты окончания.').waitFor()
await page.getByRole('button',{name:'Сбросить',exact:true}).click()
await page.evaluate(()=>window.__fail=true);await page.getByRole('button',{name:'Обновить реестр'}).click();await page.getByRole('alert').filter({hasText:'Тестовый отказ'}).waitFor();assert.equal(await page.locator('tbody tr').count(),0)
await page.evaluate(()=>{window.__fail=false;window.__auth=false});await page.getByRole('button',{name:'Обновить реестр'}).click();await page.getByRole('alert').filter({hasText:'подтверждённая сервером сессия'}).waitFor()
await page.evaluate(()=>window.__auth=true);await page.getByRole('button',{name:'Обновить реестр'}).click();await page.getByText('Найдено записей:',{exact:false}).waitFor()
await page.getByRole('button',{name:'Переключить раздел',exact:true}).click();await page.getByRole('button',{name:'Переключить раздел',exact:true}).click();await page.getByText('Найдено записей: 27.',{exact:false}).waitFor()
await page.screenshot({path:path.join(out,'desktop.png'),fullPage:true})
await page.setViewportSize({width:390,height:844});await page.screenshot({path:path.join(out,'mobile.png'),fullPage:true});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'No outer mobile overflow')
const queries=await page.evaluate(()=>window.__queries),writes=await page.evaluate(()=>window.__writes)
assert.equal(writes.length,0);assert.deepEqual(errors,[])
for(const q of queries.filter(q=>['supplier_e_invoices','supplier_payments','supplier_purchases'].includes(q.table)))assert.ok(q.filters.some(([k,v])=>k==='legal_entity_id'&&v==='11111111-1111-4111-8111-111111111111'))
for(const q of queries.filter(q=>q.table==='supplier_e_invoice_purchase_links'))assert.ok(q.filters.some(([k,v])=>k==='e_invoice_id'&&Array.isArray(v)))
console.log(JSON.stringify({passed:true,scenarios:12,mutationAttempts:writes.length,browserErrors:errors,artifactDirectory:out},null,2));await browser.close()
