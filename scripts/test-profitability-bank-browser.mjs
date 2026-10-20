import fs from 'node:fs/promises'
import path from 'node:path'
import assert from 'node:assert/strict'
import { build } from 'esbuild'
import { chromium } from 'playwright'
const out=path.resolve('.test-results/bank');await fs.mkdir(out,{recursive:true})
const fixture=`import React from 'react'; import {createRoot} from 'react-dom/client'; import ProfitabilityBankReport from '../../src/ProfitabilityBankReport.jsx';
const ids=['0dad369d-eac6-4cf9-bb06-b9d010714d6e','e7e0f06a-610f-499b-9e9a-e1f2e2c23410'];
const months=Array.from({length:12},(_,i)=>'2025-'+String(i+1).padStart(2,'0'));
const names=['BC4 — synthetic test','BC5 / Crescent — synthetic test'];
const revenueRows=ids.flatMap((id,b)=>months.map((m,i)=>({branch_id:id,revenue_date:m+'-01',cash_amount:10000+i*1200+b*3000,bank_amount:9000,wolt_amount:3000})));
const rows=ids.map((id,b)=>{const revenue=revenueRows.filter(r=>r.branch_id===id).reduce((s,r)=>s+r.cash_amount+r.bank_amount+r.wolt_amount,0);const expenseCategories=Array.from({length:18},(_,i)=>({key:'category-'+i,name:['Аренда помещения','DSMF','Wolt комиссия','Банковская комиссия','Упаковка и расходные материалы','Хозтовары'][i%6]+' '+i,amount:12*(400+i*50),details:months.map(m=>({date:m+'-03',amount:400+i*50}))}));expenseCategories.push({key:'tax',name:'Налог с оборота',amount:revenue*.08,details:[]});const totalExpenses=expenseCategories.reduce((s,c)=>s+c.amount,0);return{id,name:names[b],revenue,totalExpenses,net:revenue-totalExpenses,revenueShare:30,taxRate:8,expenseCategories}});
const report={period:{from:'2025-01-01',toExclusive:'2026-01-01'},periodKey:'year:2025',source:'SYNTHETIC TEST DATA — not financial facts',loadedAt:'2026-10-19T11:00:00Z',allRows:rows,bankInputs:{revenueRows,salaryPeriods:revenueRows.map(row=>({branch_id:row.branch_id,salary_month:row.revenue_date})),payrollEstimated:false}};
createRoot(document.getElementById('root')).render(<ProfitabilityBankReport report={report} branches={ids.map((id,i)=>({id,name:names[i]}))} periodKey='year:2025' onPeriodChange={value=>window.lastPeriod=value}/>);`
await fs.writeFile(path.join(out,'entry.jsx'),fixture)
await build({entryPoints:[path.join(out,'entry.jsx')],outfile:path.join(out,'bank.js'),bundle:true,jsx:'automatic',plugins:[{name:'raw-css',setup(builder){builder.onLoad({filter:/\.css\?raw$/},async args=>({contents:await fs.readFile(args.path.replace(/\?raw$/,''),'utf8'),loader:'text'}))}}]})
await fs.writeFile(path.join(out,'index.html'),'<html><meta charset="utf-8"><link rel="stylesheet" href="bank.css"><div id="root"></div><script src="bank.js"></script></html>')
if (process.env.BANK_BUILD_FIXTURE_ONLY === '1') { console.log('Synthetic bank fixture built: '+out); process.exit(0) }
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});const page=await browser.newPage({viewport:{width:1440,height:1100}})
const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('file://'+path.join(out,'index.html'));await page.locator('.bank-document').waitFor()
await page.screenshot({path:path.join(out,'desktop.png'),fullPage:true})
assert.equal(await page.locator('.bank-report-section').count(),3)
assert.equal(await page.locator('#profitability-bank-export').isEnabled(),true)
const popupPromise=page.waitForEvent('popup');await page.locator('#profitability-bank-export').click();const popup=await popupPromise;await popup.waitForLoadState();await popup.locator('.bank-document').waitFor();await popup.emulateMedia({media:'print'});await popup.pdf({path:path.join(out,'report.pdf'),preferCSSPageSize:true,printBackground:true});await popup.screenshot({path:path.join(out,'print.png'),fullPage:true})
assert.doesNotMatch(await popup.locator('body').innerText(),/SYNTHETIC TEST DATA|salary_periods|Sheets|Строк начислений|Состав выручки|Мостик источников/)
assert.match(await popup.locator('body').innerText(),/не аудированная|Ограничения данных/)
assert.equal(await popup.locator('.bank-external-document').count(),1)
assert.equal(await popup.locator('.bank-controls').count(),0)
await page.locator('.bank-controls fieldset input').first().uncheck();assert.equal(await page.locator('.bank-report-section').count(),2)
await page.locator('.bank-controls fieldset input').nth(1).uncheck();assert.equal(await page.locator('#profitability-bank-export').isDisabled(),true)
await page.locator('.bank-controls fieldset input').first().check();assert.equal(await page.locator('#profitability-bank-export').isEnabled(),true)
await page.getByLabel('С месяца',{exact:true}).fill('2025-10');await page.getByLabel('По месяц',{exact:true}).fill('2026-02');
assert.equal(await page.evaluate(()=>window.lastPeriod),undefined,'editing must not apply');
await page.getByRole('button',{name:'Применить период'}).click();assert.equal(await page.evaluate(()=>window.lastPeriod),'range:2025-10:2026-02');
assert.equal(await page.locator('.bank-controls fieldset input').first().isChecked(),true);
assert.equal(await page.locator('.bank-controls fieldset input').nth(1).isChecked(),false);
await page.getByLabel('По месяц',{exact:true}).fill('2025-09');assert.equal(await page.getByRole('button',{name:'Применить период'}).isDisabled(),true);
await page.getByLabel('С месяца',{exact:true}).fill('');assert.equal(await page.getByRole('button',{name:'Применить период'}).isDisabled(),true);
await page.getByLabel('С месяца',{exact:true}).fill('2025-10');await page.getByLabel('По месяц',{exact:true}).fill('2025-10');await page.getByRole('button',{name:'Применить период'}).click();assert.equal(await page.evaluate(()=>window.lastPeriod),'range:2025-10:2025-10');
assert.doesNotMatch(await page.locator('body').innerText(),/Источники и методика|Мостик источников|Данные загружены|Предварительно|Для рассмотрения банком/);
await page.setViewportSize({width:390,height:844});await page.screenshot({path:path.join(out,'mobile.png'),fullPage:true});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),true,'mobile must not overflow viewport')
assert.deepEqual(errors,[])
await browser.close();console.log('Bank synthetic browser checks passed: document, selection/dedup scope, empty selection, print popup/PDF, manual period validation and selection retention, mobile; output '+out)
