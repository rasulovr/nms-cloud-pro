import fs from 'node:fs/promises'
import assert from 'node:assert/strict'
import {build} from 'esbuild'
import {chromium} from 'playwright'
const p4=await fs.readFile('src/main.parts/part-04.jsxpart','utf8'),p5=await fs.readFile('src/main.parts/part-05.jsxpart','utf8')
const initial=p4.match(/const \[monthFilter, setMonthFilter\] = useState\(([^\n]+)\)/)[1]
const hook=p4.slice(p4.indexOf('  const [overviewSnapshot'),p4.indexOf('  const [profitabilitySelection'))
const start=p5.indexOf('<section className={`reports-v43-filterbar')
const filter=p5.slice(start,p5.indexOf('</section>}',start)+10)
const styleStart=p5.indexOf('function ReportsV43Styles()')
const styles=p5.slice(styleStart,p5.indexOf('\nfunction ',styleStart+10))
const result=await build({stdin:{contents:`
import React,{useState,useEffect} from 'react';import {createRoot} from 'react-dom/client';import {ReportMonthPeriod} from './src/MonthYearPicker.jsx';import {currentBakuMonth} from './src/profitability-range.mjs';
const branches=[{id:'a',name:'Филиал A'},{id:'b',name:'Филиал B'}],reportBranchesLoaded=true,reportTabs=[{id:'overview',label:'Обзор'}],yearOptions=[2026],t=x=>x;
const supabase={},readRmsProfitabilitySnapshot=()=>{};window.reads=[];window.fail=false;
async function readOverviewProfit(c,r,b,month,branch){window.reads.push({month,branch});await new Promise(resolve=>setTimeout(resolve,month==='2026-01'?180:40));if(window.fail)throw Error('Test source error');return {month,branch}}
${styles}
function App(){const [effectiveReportsTab,setReportsTab]=useState('overview');const [branchFilter,setBranchFilter]=useState('all');const [monthFilter,setMonthFilter]=useState(${initial});const [departmentFilter,setDepartmentFilter]=useState('all');const setRevenueDateFrom=()=>{},setRevenueDateTo=()=>{},setRevenuePage=()=>{},isProductsReportTab=false;
${hook}
const refreshCurrentReport=()=>setOverviewRevision(v=>v+1);
return <main className="reports-v43-page" style={{padding:20}}><ReportsV43Styles/><h1>Обзор · локальные тестовые данные</h1><button id="leave" onClick={()=>setReportsTab(v=>v==='overview'?'sales':'overview')}>Открыть / закрыть</button>${filter}<output>{currentOverviewSnapshot?JSON.stringify(currentOverviewSnapshot):'loading'}</output></main>}
createRoot(document.getElementById('root')).render(<App/>);
`,resolveDir:process.cwd(),loader:'jsx'},bundle:true,write:false,loader:{'.css':'empty'},format:'iife'})
const css=(await fs.readFile('src/styles.css','utf8'))+(await fs.readFile('src/month-year-picker.css','utf8'))
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']})
try {
 const page=await browser.newPage({viewport:{width:1440,height:900}})
 await page.route('**/*',route=>route.abort())
 await page.clock.install({time:new Date('2026-10-31T20:00:00Z')})
 await page.setContent('<style>'+css+'</style><div id="root"></div>')
 await page.addScriptTag({content:result.outputFiles[0].text})
 await page.waitForFunction(()=>document.querySelector('output')?.textContent.includes('2026-11'))
 assert.deepEqual(await page.evaluate(()=>window.reads),[{month:'2026-11',branch:'all'}])
 const labels=page.locator('.reports-overview-filters > label')
 const period=await labels.nth(1).boundingBox(),branch=await labels.nth(2).boundingBox()
 assert.ok(Math.abs(branch.y+branch.height-period.y-period.height)<1);assert.ok(branch.x-period.x-period.width<=13,'branch immediately follows period')
 await fs.mkdir('.test-results/reports-opening',{recursive:true})
 await page.screenshot({path:'.test-results/reports-opening/desktop.png',fullPage:true})
 await labels.nth(2).locator('select').selectOption('b')
 await page.waitForFunction(()=>document.querySelector('output').textContent.includes('"branch":"b"'))
 await page.locator('#leave').click();await page.locator('#leave').click()
 await page.waitForFunction(()=>window.reads.length===3&&document.querySelector('output').textContent.includes('"branch":"b"'))
 await page.evaluate(()=>window.fail=true);await page.getByRole('button',{name:'Обновить',exact:true}).click()
 await page.waitForFunction(()=>document.querySelector('output').textContent.includes('Test source error'))
 await page.evaluate(()=>window.fail=false);await page.getByRole('button',{name:'Обновить',exact:true}).click()
 await page.waitForFunction(()=>document.querySelector('output').textContent.includes('"branch":"b"'))
 await page.setViewportSize({width:390,height:844})
 await page.screenshot({path:'.test-results/reports-opening/mobile.png',fullPage:true})
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'no mobile overflow')
 const mobilePeriod=await labels.nth(1).boundingBox(),mobileBranch=await labels.nth(2).boundingBox()
 assert.ok(mobileBranch.y>mobilePeriod.y)
 console.log('PASS browser: production current-month initializer/effect/filter markup; compact 12px gap; 1440/390px; branch switch, reopen fresh read, error/retry; screenshots saved. Synthetic read service, not live login.')
}finally{await browser.close()}
