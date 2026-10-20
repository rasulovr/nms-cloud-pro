import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import { build } from 'esbuild'
const out = path.resolve('.test-results/bank-external')
await fs.mkdir(out, {recursive:true})
const entry = `import React from 'react'; import {renderToStaticMarkup} from 'react-dom/server'; import {BankDocument,ExternalBankDocument,printBankDocument} from '../../src/ProfitabilityBankReport.jsx'; export const render=(model,external,expanded=true)=>renderToStaticMarkup(React.createElement(external?ExternalBankDocument:BankDocument,{model,expanded})); export {printBankDocument};`
await fs.writeFile(path.join(out,'entry.jsx'),entry)
await build({entryPoints:[path.join(out,'entry.jsx')],outfile:path.join(out,'render.cjs'),bundle:true,platform:'node',format:'cjs',plugins:[{name:'css',setup(b){b.onLoad({filter:/\.css(?:\?raw)?$/},()=>({contents:'',loader:'text'}))}}]})
const {render,printBankDocument} = await import(path.join(out,'render.cjs'))
const secret='INTERNAL_PRIVATE_SENTINEL'
const row={month:'2025-10',revenue:1000,expenses:400,net:600,margin:60,revenueDays:15,salaryRows:1,cash:600,bank:300,wolt:100,categories:{salary:100,'supplier-household':100,other:200}}
const section={id:'0dad369d-eac6-4cf9-bb06-b9d010714d6e',name:secret+' private@example.test https://internal.example.test',metadata:{email:'private@example.test'},monthly:[row],totals:{revenue:1000,expenses:400,net:600,margin:60},categories:[{key:'salary',name:'salary',amount:100},{key:'supplier-household',name:'Household',amount:100},{key:'other',name:secret+' Supplier',amount:200}],share:40,taxRate:8,warnings:[secret+' employee warning']}
const model={period:{from:'2025-10-01',toExclusive:'2025-11-01'},months:['2025-10'],generatedAt:'2026-10-19T20:00:00Z',source:secret+' table',sourceDataset:{year:2025,snapshotId:secret+' snapshot',managerMethod:secret+' method',warnings:[secret+' warning'],exclusions:[{month:'2025-10',amount:750,description:secret+' employee',sourceUrl:'https://docs.google.com/'+secret,ownerEvidence:secret},{month:'2025-11',amount:750}]},sourceAdjustments:[{branchId:'bc4',branchName:'BC4',month:'2025-10',previousSalary:90,salary:100,salaryDelta:10,previousFoodCost:100,foodCostDelta:0,expenseDelta:10,movedFromFood:0,source:{sourceUrl:'https://docs.google.com/'+secret,salaryCell:secret,salaryFormula:'='+secret,managerIncluded:10}}],branches:[section],combined:{...section,id:'combined',name:'Совокупно: BC4'},coverageBlockers:[],exportable:true,reconciled:true}
const before=structuredClone(model), external=render(model,true), internal=render(model,false)
const compact=render(model,true,false);assert.doesNotMatch(compact,/bank-expense-table|Расходы по статьям/);assert.match(external,/bank-expense-table/);for(const label of ['Помесячные итоги','Расчётный результат','Ограничения данных','полнота выручки не подтверждена'])assert.ok(compact.includes(label),label)
assert.doesNotMatch(external,/INTERNAL_PRIVATE_SENTINEL|private@example.test|internal.example.test|docs.google.com|salary_periods|Sheets|Мостик источников|Строк начислений|Состав выручки|snapshot/)
assert.doesNotMatch(internal,/INTERNAL_PRIVATE_SENTINEL|Источники и методика|Мостик источников|Данные загружены|Предварительно|Для рассмотрения банком|не аудированная/)
assert.doesNotMatch(external,/<a[ >]|mailto:|href=/)
for(const label of ['BC4','AZN','2025-10','Зарплаты','Аренда','ФудКост','ХозТовары','DSMF+Налог','Такси','Сервис чардж','Коммунальные','Прочие','Расчётный результат','полнота выручки не подтверждена']) assert.ok(external.includes(label),label)
assert.ok(!external.includes('1 500,00 AZN'),'exclusions outside selected months must not be included')
assert.equal((external.match(/<svg/g)||[]).length,4)
assert.equal((external.match(/aria-label="Расчётная маржа по месяцам, проценты"/g)||[]).length,2)
assert.match(external,/Сформировано/)
assert.doesNotMatch(external,/Approved|Verified|проверено RMS/i)
for (const margin of [null,0,-25,150]) {
  const edge=structuredClone(model)
  for (const sec of [edge.combined,...edge.branches]) sec.monthly[0].margin=margin
  const markup=render(edge,true,false)
  assert.doesNotMatch(markup,/NaN|Infinity/)
  assert.match(markup,/2025-10/)
  if(margin===-25) assert.match(markup,/#d44459/)
}
assert.equal((external.match(/class="bank-expense-block"/g)||[]).length,2)
assert.ok(external.indexOf('bank-expense-appendix') > external.lastIndexOf('bank-report-section'),'expense appendix follows all summary sections')
assert.deepEqual(model,before,'presentation must not mutate accounting model')
let opens=0,html=''
global.window={open(){opens++;return{document:{open(){},write(value){html=value},close(){}}}}}
assert.equal(printBankDocument(model),'');assert.equal(opens,1)
assert.doesNotMatch(html,/INTERNAL_PRIVATE_SENTINEL|docs.google.com/)
assert.match(html,/bank-external-document/);assert.doesNotMatch(html,/bank-expense-table/);assert.equal(printBankDocument(model,true),'');assert.match(html,/bank-expense-table/);assert.equal(opens,2)
assert.match(printBankDocument({...model,exportable:false,coverageBlockers:[secret]}),/полноту/);assert.equal(opens,2,'blocked export must not open a window')
const missing=structuredClone(model);missing.branches[0].monthly[0].salaryRows=0;missing.payrollEstimated=true
assert.match(render(missing,true),/Полнота начислений зарплаты не подтверждена/)
assert.match(render(missing,true),/Зарплата включает расчётную оценку/)
await fs.writeFile(path.join(out,'external-synthetic.html'),external)
console.log('External report PASS: sensitive-field non-disclosure, clean internal and external presentation, 9 groups, charts, caveats, period-specific exclusions, immutable figures, popup and blocked export.')
