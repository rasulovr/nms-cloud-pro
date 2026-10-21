import assert from 'node:assert/strict'
import path from 'node:path'
import Module from 'node:module'
import fs from 'node:fs'
import { build } from 'esbuild'
import { monthlyViewRows, MONTHLY_COLUMNS } from '../src/report-monthly-view.mjs'
import { reportMonths, BANK_BRANCH_IDS } from '../src/profitability-bank.mjs'

// Synthetic fixtures only. No external reads, financial recalculation or persisted model edits.
const sum = values => values.reduce((a,b)=>a+b,0)
const definitions = [
  ['supplier-food-cost','FoodCost · закупки',101], ['tax','Налог с оборота',17],
  ['social','Social contributions',13], ['dsmf','DSMF',7], ['salary','Зарплаты',83],
  ['rent','Аренда',31], ['utilities','Коммунальные',0], ['supplier-household','ХозТовары',19],
  ['service-charge','Service charge персоналу',23], ['taxi','Такси',11], ['misc','Прочие',-3],
  ['tax-paid','Оплаченный налог',999], ['memo','Справочно',888]
]
function fixture(count) {
  const months = reportMonths('2025-01-01', count===12?'2026-01-01':'2026-02-01')
  const categories = definitions.map(([key,name,amount])=>({key,name,amount:amount*count,informational:key==='memo'||key==='tax-paid'}))
  const monthly = months.map((month,index)=>{
    const cats = Object.fromEntries(definitions.map(([key,,amount])=>[key,amount]))
    if(index===1) delete cats.utilities
    const expenses = sum(definitions.filter(([key])=>!['memo','tax-paid'].includes(key)).map(([,,amount])=>amount))
    return {month,categories:cats,revenue:1000,expenses,net:1000-expenses,margin:(1000-expenses)/10,cash:700,bank:200,wolt:100,revenueDays:31,salaryRows:1}
  })
  const section={id:BANK_BRANCH_IDS[0],name:'BC4',monthly,categories,totals:{revenue:1000*count,expenses:monthly[0].expenses*count,net:monthly[0].net*count,margin:monthly[0].margin},share:100,taxRate:1.7,warnings:[]}
  return {months,period:{from:'2025-01-01',toExclusive:count===12?'2026-01-01':'2026-02-01'},branches:[section],combined:{...structuredClone(section),id:'combined',name:'Combined'},reconciled:true,exportable:true}
}
function freeze(value) { if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value)};return value }
for(const count of [12,13]) {
  const model=freeze(fixture(count)),before=JSON.stringify(model)
  const section=model.branches[0], rows=monthlyViewRows(section,true), total=monthlyViewRows(section,false)
  assert.equal(rows.length,count); assert.equal(total.length,1)
  assert.deepEqual(rows.map(row=>row.month),model.months)
  for(const row of rows) {
    assert.equal(sum(Object.values(row.displayCategories)),row.expenses,'compact categories conserve counted expenses and exclude informational amounts')
    assert.equal(row.displayCategories.tax,17,'turnover tax remains separate')
    assert.equal(row.displayCategories.dsmf,20,'all social contributions belong to DSMF')
    assert.equal(row.displayCategories.purchases,101)
    assert.equal(row.displayCategories.other,50,'household, service, taxi and miscellaneous stay in Other')
  }
  assert.equal(rows[0].displayCategories.utilities,0)
  assert.equal(rows[0].displayPresent.utilities,true,'explicit zero must display zero')
  assert.equal(Boolean(rows[1].displayPresent.utilities),false,'absent value must display dash')
  assert.equal(total[0].displayPresent.utilities,true)
  for(const [key] of MONTHLY_COLUMNS)assert.equal(total[0].displayCategories[key],sum(rows.map(row=>row.displayCategories[key])))
  for(const key of ['revenue','expenses','net','margin'])assert.equal(total[0][key],section.totals[key],'aggregate uses existing financial totals')
  assert.equal(JSON.stringify(model),before,'display must not mutate frozen financial data')
}
console.log('Monthly helper PASS: 12/13 months, conservation, separate tax/DSMF, explicit zero versus missing, immutable model.')

const bundle=await build({stdin:{contents:`import React from 'react'; import {renderToStaticMarkup} from 'react-dom/server'; import {ExternalBankDocument,printBankDocument} from './src/ProfitabilityBankReport.jsx'; export {printBankDocument}; export const render=(model,monthly,expanded,lang)=>renderToStaticMarkup(React.createElement(ExternalBankDocument,{model,monthly,expanded,lang}));`,resolveDir:process.cwd(),loader:'jsx'},bundle:true,platform:'node',format:'cjs',write:false,plugins:[{name:'ignore-css',setup(b){b.onLoad({filter:/\.css(?:\?raw)?$/},()=>({contents:'',loader:'text'}))}}]})
const mod=new Module(path.resolve('scripts/__monthly_render__.cjs'))
mod.filename=path.resolve('scripts/__monthly_render__.cjs')
mod.paths=Module._nodeModulePaths(process.cwd())
mod._compile(bundle.outputFiles[0].text,mod.filename)
const {render}=mod.exports
const tableNumbers=html=>Array.from(html.matchAll(/<(?:td|strong)[^>]*>([^<]*[0-9][^<]*)<\//g),m=>m[1].replace(/[.\s\u00a0\u202f]/g,''))
for(const count of [12,13])for(const monthly of [false,true])for(const expanded of [false,true]) {
  const model=freeze(fixture(count)),before=JSON.stringify(model)
  const ru=render(model,monthly,expanded,'ru'),az=render(model,monthly,expanded,'az')
  assert.equal((ru.match(/class="bank-monthly-overview"/g)||[]).length,2)
  assert.equal((ru.match(/data-month=/g)||[]).length,monthly?count*2:0,'monthly flag controls rows independently of expanded flag')
  assert.equal((ru.match(/<svg/g)||[]).length,monthly?4:0)
  assert.equal((ru.match(/class="bank-expense-table"/g)||[]).length,expanded?2:0,'expanded flag independently controls appendix')
  if(!monthly&&expanded)assert.doesNotMatch(ru,/<th>01\.25<\/th>/,'aggregate appendix must not leak month columns')
  assert.doesNotMatch(ru,/NaN|Infinity|undefined/)
  const azTable=az.match(/<table class="bank-monthly-overview">[\s\S]*?<\/table>/)[0]
  assert.doesNotMatch(azTable,/[А-Яа-яЁё]/,'only new monthly view must be AZ localized')
  for(const label of ['Bazar / alışlar','Vergi','DSMF','Əməkhaqqı','İcarə','Kommunal xərclər','Digər'])assert.ok(azTable.includes(label),label)
  assert.match(az,/Рентабельность филиалов/,'legacy report remains unchanged RU')
  assert.deepEqual(tableNumbers(ru),tableNumbers(az),'RU/AZ have numerically identical tables/KPIs')
  assert.equal(render(model,monthly,expanded,'ru'),ru,'switching back to RU restores output exactly')
  assert.equal(JSON.stringify(model),before)
  const firstTable=ru.match(/<table class="bank-monthly-overview">[\s\S]*?<\/table>/)[0]
  if(monthly){assert.match(firstTable,/<td>0,00<\/td>/);assert.match(firstTable,/<td>—<\/td>/)}
}
console.log('Monthly render PASS: all four monthly/expanded modes, 12/13 months, RU/AZ invariance, zero/missing display, immutable model.')

const printModel=freeze(fixture(13)), printBefore=JSON.stringify(printModel)
let printedHtml='',opens=0
// Mock local print window: never opens a real window or communicates externally.
global.window={open(){opens++;return {document:{open(){},write(html){printedHtml=html},close(){}}}}}
for(const monthly of [false,true])for(const expanded of [false,true])for(const lang of ['ru','az']) {
  assert.equal(mod.exports.printBankDocument(printModel,expanded,monthly,lang),'')
  assert.equal((printedHtml.match(/data-month=/g)||[]).length,monthly?26:0)
  assert.equal((printedHtml.match(/class="bank-expense-table"/g)||[]).length,expanded?2:0)
  assert.match(printedHtml,/<html lang="ru">/,'legacy print document language remains RU')
  assert.ok(printedHtml.includes(lang==='az'?'Bazar / alışlar':'Базар / закупки'),'new printed labels use selected language')
  assert.equal(JSON.stringify(printModel),printBefore)
}
const priorOpens=opens
assert.ok(mod.exports.printBankDocument({...printModel,exportable:false},true,false,'ru'))
assert.equal(opens,priorOpens,'blocked print does not open a window')
console.log('Monthly print PASS: all selected mode/language combinations, unchanged figures, export guard, mocked print only.')

const source=fs.readFileSync('src/ProfitabilityBankReport.jsx','utf8')
assert.doesNotMatch(source,/import[^\n]*report-locale/,'standalone UI must not import denied full locale payload')
for(const storageKey of ['rms_lang','nms_lang']) {
  global.localStorage={getItem:key=>key===storageKey?'az':null}
  assert.equal(mod.exports.printBankDocument(printModel,false,true),'')
  assert.match(printedHtml,/Bazar \/ alışlar/,'default new view language uses existing '+storageKey)
}
delete global.localStorage
assert.equal(mod.exports.printBankDocument(printModel,false,false),'')
assert.match(printedHtml,/Базар \/ закупки/,'missing storage safely defaults RU')
console.log('Standalone scope PASS: new labels only, legacy report retained, no full-locale import, existing language storage fallback.')
