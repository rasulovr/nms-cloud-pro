import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { createServer } from 'node:http'
import { createRequire } from 'node:module'
import { build } from 'esbuild'
const require = createRequire(import.meta.url)
const { chromium } = require('playwright')
const root = process.cwd()
const output = await mkdtemp(path.join(tmpdir(), 'rms-expense-browser-'))
const part2 = await readFile('src/main.parts/part-02.jsxpart', 'utf8')
const part3 = await readFile('src/main.parts/part-03.jsxpart', 'utf8')
const component = part3.slice(part3.indexOf('function ExpenseRow('), part3.indexOf('\nfunction ExpenseNameInput'))
const handlers = part2.slice(part2.indexOf('  async function updateExpense('), part2.indexOf('  async function addInflow('))
const fixture = `
import React, { useState, useRef } from 'react'
import { createRoot } from 'react-dom/client'
import { createPortal } from 'react-dom'
import { expenseEditAccess, expenseEditPatch } from './src/expenseEditPolicy.mjs'
import './src/styles.css'
const todayISO=()=>'2026-10-02'
const fmt=v=>Number(v).toFixed(2)
const formatDT=v=>v
const parseNum=v=>Number(String(v ?? '').replace(',','.')) || 0
const isBazarExpenseName=v=>String(v).toLowerCase()==='базар'
const canEditWithinWeek=row=>row?.created_at ? Date.now()-new Date(row.created_at).getTime() <= 604800000 : true
const DateInput=props=><input type="date" {...props}/>
${component}
function Harness(){
 const q=new URLSearchParams(location.search)
 window.__fail=q.get('fail')==='1'
 const isAdmin=q.get('role')!=='staff'
 const kind=q.get('kind')||'old'
 const [expenses,setExpenses]=useState([{id:'synthetic-expense',expense_date:'2026-09-01',created_at:kind==='recent'?new Date().toISOString():'2020-01-01T00:00:00Z',amount:12,comment:'Synthetic fixture',category_id:null,custom_category:kind==='bazar'?'Базар':'Test expense',deleted_at:kind==='cancelled'?'2026-10-01T00:00:00Z':null}])
 const [message,setMessage]=useState('')
 const branchId='synthetic-branch',date='2026-09-01'
 const currentUserMeta=async()=>({user_id:'synthetic-actor'})
 const hydrateExpenseForLocalState=(row,patch)=>({...row,...patch})
 const expenseNameFromPatch=(row,patch)=>({...row,...patch}).custom_category
 const loadMonthStats=async()=>{},loadLogs=async()=>{},load=async()=>{}
 const distributeBazarExpense=async()=>{throw Error('Unexpected allocation')}
 window.__calls=window.__calls||[]
 const supabase={rpc:async(name,args)=>{window.__calls.push({name,args});await new Promise(r=>setTimeout(r,150));return window.__fail?{error:{message:'Synthetic RPC failure'}}:{data:{},error:null}}}
 ${handlers}
 return <main className="rms-pro-shell rms-pro-content" style={{padding:24}}><h1>Expense editor test fixture</h1><p>Isolated synthetic data. No database connection.</p><p role="status">{message}</p><table><tbody>{expenses.map(e=><ExpenseRow key={e.id} expense={e} isAdmin={isAdmin} categories={[]} onSave={patch=>updateExpense(e.id,patch)} onCancel={()=>cancelExpense(e.id)}/>)}</tbody></table></main>
}
createRoot(document.getElementById('root')).render(<Harness/>);
`
await build({stdin:{contents:fixture,resolveDir:root,loader:'jsx'},bundle:true,outfile:path.join(output,'app.js'),loader:{'.css':'css'},define:{'process.env.NODE_ENV':'"production"'},logLevel:'silent'})
await writeFile(path.join(output,'index.html'), '<!doctype html><meta charset="utf-8"><link rel="stylesheet" href="/app.css"><div id="root"></div><script src="/app.js"></script>')
const server = createServer(async(req,res)=>{try{const ext=path.extname(new URL(req.url,'http://localhost').pathname);const f=ext==='.js'?'app.js':ext==='.css'?'app.css':'index.html';res.setHeader('Content-Type',ext==='.js'?'text/javascript':ext==='.css'?'text/css':'text/html');res.end(await readFile(path.join(output,f)))}catch{res.statusCode=500;res.end('Fixture unavailable')}})
await new Promise(r=>server.listen(0,'127.0.0.1',r))
const url=`http://127.0.0.1:${server.address().port}`
if(process.env.SERVE_FIXTURE_ONLY==='1'){console.log('FIXTURE_URL='+url);await new Promise(()=>{})}
const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{})})
const page=await browser.newPage({viewport:{width:1440,height:1000}})
const errors=[]
page.on('pageerror',e=>errors.push(e.message))
await page.route('**/*',route=>route.request().url().startsWith(url)?route.continue():route.abort())
const calls=()=>page.evaluate(()=>window.__calls)
const open=async(query='')=>{await page.goto(url+query);await page.getByRole('heading',{name:'Expense editor test fixture'}).waitFor();await page.getByRole('button',{name:'Изменить',exact:true}).click()}
const save=()=>page.getByRole('button',{name:'Сохранить',exact:true}).click()
try{
 await open('?role=admin&kind=old')
 assert.equal(await page.getByLabel('Сумма',{exact:true}).isEnabled(),true)
 assert.equal(await page.getByLabel('Дата операции').isDisabled(),true)
 assert.equal(await page.getByLabel('Статья',{exact:true}).isDisabled(),true)
 assert.equal(await page.getByRole('button',{name:'Удалить',exact:true}).count(),0)
 await page.getByLabel('Сумма',{exact:true}).fill('18')
 await page.getByRole('button',{name:'Закрыть',exact:true}).first().click()
 assert.equal((await calls()).length,0)
 await page.getByRole('button',{name:'Изменить',exact:true}).click()
 assert.equal(await page.getByLabel('Сумма',{exact:true}).inputValue(),'12')
 await save()
 assert.equal((await calls()).length,0,'Unchanged save has no RPC/audit')
 await page.getByRole('button',{name:'Изменить',exact:true}).click()
 await page.getByLabel('Сумма',{exact:true}).fill('18')
 await page.getByLabel('Комментарий',{exact:true}).fill('Synthetic correction')
 await page.getByRole('button',{name:'Сохранить',exact:true}).evaluate(el=>{el.click();el.click()})
 await page.getByRole('dialog').waitFor({state:'hidden'})
 assert.equal((await calls()).length,1,'Duplicate click must submit only once')
 assert.deepEqual((await calls())[0],{name:'rms_expense_update_secure',args:{p_id:'synthetic-expense',p_patch:{amount:18,comment:'Synthetic correction'}}})
 assert.match(await page.locator('tbody').innerText(),/18\.00/)
 await page.getByRole('button',{name:'Изменить',exact:true}).click();await save();assert.equal((await calls()).length,1)
 await open('?role=staff&kind=old')
 assert.equal(await page.getByLabel('Сумма',{exact:true}).isDisabled(),true)
 assert.equal(await page.getByRole('button',{name:'Сохранить',exact:true}).count(),0)
 assert.equal((await calls()).length,0)
 await open('?role=admin&kind=bazar');assert.equal(await page.getByLabel('Сумма',{exact:true}).isDisabled(),true)
 await page.goto(url+'?kind=cancelled');assert.equal(await page.getByRole('button',{name:'Изменить',exact:true}).count(),0)
 await open('?role=admin&kind=old');await page.evaluate(()=>window.__fail=true)
 await page.getByLabel('Сумма',{exact:true}).fill('18');await save()
 await page.getByRole('alert').waitFor();assert.equal(await page.getByRole('dialog').count(),1)
 assert.match(await page.locator('tbody').innerText(),/12\.00/)
 await page.evaluate(()=>window.__fail=false);await save();await page.getByRole('dialog').waitFor({state:'hidden'});assert.match(await page.locator('tbody').innerText(),/18\.00/)
 await open('?role=staff&kind=recent');assert.equal(await page.getByLabel('Дата операции').isEnabled(),true)
 page.once('dialog',dialog=>dialog.dismiss());await page.getByRole('dialog').getByRole('button',{name:'Удалить',exact:true}).click();assert.equal((await calls()).length,0,'Dismissed cancellation must not call RPC')
 page.once('dialog',dialog=>dialog.accept());await page.getByRole('dialog').getByRole('button',{name:'Удалить',exact:true}).click();await page.getByRole('dialog').waitFor({state:'hidden'});assert.equal((await calls()).length,1);assert.equal((await calls())[0].name,'rms_expense_cancel_secure')
 assert.equal(await page.getByRole('button',{name:'Изменить',exact:true}).count(),0)
 await open('?role=admin&kind=old')
 if(process.env.SCREENSHOT_PATH) await page.screenshot({path:process.env.SCREENSHOT_PATH,fullPage:true})
 assert.deepEqual(errors,[])
 console.log('Expense browser checks passed: admin/staff, expired/deleted/allocation rows, close/reset, no-op, repeated submit, failed RPC/retry, cancellation confirmation. Mocked RPC only; no database writes.')
 if(process.env.KEEP_FIXTURE_SERVER==='1'){console.log('FIXTURE_URL='+url);await new Promise(()=>{})}
}finally{await browser.close();await new Promise(r=>server.close(r));await rm(output,{recursive:true,force:true})}
