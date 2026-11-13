import assert from 'node:assert/strict'
import { readFile, mkdir } from 'node:fs/promises'
import { build } from 'esbuild'
import { chromium } from 'playwright'
const report = await readFile('src/main.parts/part-05.jsxpart', 'utf8')
const sales = await readFile('src/main.parts/part-04.jsxpart', 'utf8')
assert.match(report, /<ReportMonthPeriod showModeSelect=\{false\}/)
assert.doesNotMatch(sales, /showModeSelect=\{false\}/)
const initial = sales.match(/const \[monthFilter, setMonthFilter\] = useState\(([^\n]+)\)/)[1]
const result = await build({stdin:{contents:`import React,{useState} from 'react';import {createRoot} from 'react-dom/client';import {ReportMonthPeriod} from './src/MonthYearPicker.jsx';import {currentBakuMonth} from './src/profitability-range.mjs';function App(){const [value,setValue]=useState(${initial});return <><div id="report"><ReportMonthPeriod value={value} showModeSelect={false} onChange={setValue}/></div><output>{value}</output><div id="sales"><ReportMonthPeriod value="all" onChange={()=>{}}/></div></>}createRoot(document.getElementById('root')).render(<App/>);`,resolveDir:process.cwd(),loader:'jsx'},bundle:true,write:false,loader:{'.css':'empty'},format:'iife'})
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']})
try {
 const page=await browser.newPage()
 await page.clock.install({time:new Date('2026-10-31T20:00:00Z')})
 await page.setContent('<div id="root"></div>')
 await page.addScriptTag({content:result.outputFiles[0].text})
 await page.locator('#report button').waitFor()
 await mkdir('.test-results/reports-opening',{recursive:true})
 await page.screenshot({path:'.test-results/reports-opening/current-baku-month.png'})
 assert.equal(await page.locator('#report select').count(),0)
 assert.equal(await page.locator('#sales select').count(),1)
 assert.equal(await page.locator('output').textContent(),'2026-11')
 for(let i=0;i<2;i++){
  await page.locator('#report button').click()
  await page.getByRole('dialog').waitFor()
  await page.keyboard.press('Escape')
  assert.equal(await page.getByRole('dialog').count(),0)
  assert.equal(await page.locator('output').textContent(),'2026-11')
 }
 await page.locator('#report button').click()
 await page.getByRole('listbox',{name:'Месяц',exact:true}).getByRole('option').nth(0).click()
 await page.getByRole('button',{name:'Готово',exact:true}).click()
 assert.match(await page.locator('output').textContent(),/^\d{4}-01$/)
 assert.equal(await page.locator('#report select').count(),0)
 await page.locator('#report button').click()
 await page.getByRole('button',{name:'Отмена',exact:true}).click()
 assert.equal(await page.getByRole('dialog').count(),0)
 console.log('PASS report-only dropdown removal; production default current Baku month at UTC boundary; month selection; repeated open/Escape/cancel; sales dropdown preserved')
} finally {await browser.close()}
