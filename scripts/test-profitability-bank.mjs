import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import { buildBankReport, reportMonths, BANK_EXPENSE_GROUPS, bankExpenseGroup, groupBankExpenses } from '../src/profitability-bank.mjs'
assert.equal(reportMonths('2025-10-01','2026-10-01').length,12)
assert.deepEqual(reportMonths('2025-01-01','2027-01-01'),[])
assert.deepEqual(reportMonths('',''),[])
const input = {
  period: {from:'2025-01-01',toExclusive:'2025-03-01'},
  bankInputs: {revenueRows:[{branch_id:'a',revenue_date:'2025-01-01',cash_amount:100,bank_amount:50,wolt_amount:50},{branch_id:'a',revenue_date:'2025-02-01',cash_amount:100},{branch_id:'b',revenue_date:'2025-01-01',cash_amount:100},{branch_id:'other',revenue_date:'2025-01-01',cash_amount:600}],salaryPeriods:[]},
  allRows:[{id:'a',name:'BC4',revenue:300,totalExpenses:164,net:136,revenueShare:30,taxRate:8,expenseCategories:[
    {key:'supplier-food-cost',name:'Food Cost',amount:60,details:[{date:'2025-01-05',amount:30},{date:'2025-02-05',amount:30}]},
    {key:'salary',name:'Salary',amount:40,details:[{id:'salary-estimate-x-a',date:'2025-01-01',amount:40}]},
    {key:'daily-wolt',name:'Wolt',amount:20,details:[{date:'2025-01-01',amount:20}]},
    {key:'service-charge',name:'Service charge',amount:20,details:[{date:'2025-02-01',amount:20}]},
    {key:'tax',name:'Tax',amount:24,details:[{date:'2025-01-01',amount:24}]},
    {key:'tax-paid',name:'Paid tax',amount:24,details:[{date:'2025-02-01',amount:24}]}
  ]},{id:'b',name:'Crescent',revenue:100,totalExpenses:8,net:92,revenueShare:10,taxRate:8,expenseCategories:[{key:'tax',name:'Tax',amount:8,details:[]}]}]
}
const report=buildBankReport(input,['a','b','a'])
assert.equal(report.branches.length,2,'duplicate branch ids must not double-count')
assert.equal(report.reconciled,true)
assert.equal(report.exportable,false,'missing payroll/household coverage must block bank export')
assert.ok(report.coverageBlockers.some(text=>text.includes('ХозТоваров')))
assert.ok(report.coverageBlockers.some(text=>text.includes('начислений зарплаты')))
assert.equal(report.combined.totals.revenue,400)
assert.equal(report.combined.totals.expenses,172)
assert.equal(report.combined.totals.net,228)
assert.ok(Math.abs(report.combined.totals.margin-57)<1e-9)
assert.equal(report.branches[0].monthly[0].categories.tax,16,'tax follows monthly gross turnover')
assert.equal(report.branches[0].monthly[1].categories.tax,8)
assert.equal(report.branches[0].monthly[1].taxPaid,24,'paid tax is informational')
assert.equal(report.branches[0].monthly[0].categories.salary,20,'estimated salary is spread, not all in January')
assert.equal(report.branches[0].monthly[1].categories.salary,20)
assert.equal(report.branches[1].monthly[1].margin,null,'zero revenue does not imply a zero margin')
assert.equal(report.branches[0].share,30,'selected pair must not rebase whole-network allocation')
assert.ok(report.branches[0].warnings.some(text=>text.includes('нет начислений')))
const duplicateCategories=structuredClone(input); duplicateCategories.allRows[0].expenseCategories[2].amount=10; duplicateCategories.allRows[0].expenseCategories[2].details[0].amount=10; duplicateCategories.allRows[0].expenseCategories.push({key:'daily-wolt',name:'WOLT',amount:10,details:[{date:'2025-01-01',amount:10}]}); const dedup=buildBankReport(duplicateCategories,['a']); assert.equal(dedup.branches[0].categories.filter(c=>c.key==='daily-wolt').length,1); assert.equal(dedup.branches[0].categories.find(c=>c.key==='daily-wolt').amount,20); assert.equal(dedup.reconciled,true)
const mismatch=structuredClone(input); mismatch.allRows[0].totalExpenses=200
assert.equal(buildBankReport(mismatch,['a']).exportable,false,'unreconciled export must fail closed')
const undated=structuredClone(input); undated.allRows[0].expenseCategories[0].details[0].date=''
assert.equal(buildBankReport(undated,['a']).exportable,false,'undated expenses must not silently disappear')
assert.equal(buildBankReport(input,[]),null)
assert.equal(buildBankReport(input,['missing']).exportable,false)
const taxMissingDate=structuredClone(input);taxMissingDate.allRows[0].expenseCategories.find(c=>c.key==='tax-paid').details[0].date='';assert.equal(buildBankReport(taxMissingDate,['a']).exportable,false)
const loss=structuredClone(input);loss.allRows[1].expenseCategories.push({key:'rent',name:'Rent',amount:200,details:[{date:'2025-01-01',amount:200}]});loss.allRows[1].totalExpenses=208;loss.allRows[1].net=-108
assert.equal(buildBankReport(loss,['b']).combined.totals.margin,-108)
const source=fs.readFileSync(new URL('../src/main.parts/part-04.jsxpart',import.meta.url),'utf8')
const loader=source.slice(source.indexOf('  async function loadRmsProfitabilityReport()'),source.indexOf('  async function loadRmsSuppliersReport()'))
assert.match(loader,/requestId !== rmsProfitabilityRequestRef.current/)
assert.doesNotMatch(loader,/salaryResult\?\.error \? \[\]/,'failed payroll reads must not become zero')
assert.match(loader,/offset > 50000\) throw/,'truncation must fail closed')
assert.match(loader,/allRows: rows/,'bank multi-branch filter must use unfiltered engine rows')
const printCss=fs.readFileSync(new URL('../src/profitability-bank.css',import.meta.url),'utf8')
assert.match(printCss,/@page rms-bank-report\{size:A4 landscape;margin:12mm\}/)
assert.doesNotMatch(printCss,/@page\s*\{/,'bank paper size must not change other reports')

// document.open() erases Window event handlers. The load handler must be installed
// after open/write and before close, and printing must await font readiness.
const component=fs.readFileSync(new URL('../src/ProfitabilityBankReport.jsx',import.meta.url),'utf8')
const printFunction=component.slice(component.indexOf('export function printBankDocument'),component.indexOf('export default function'))
  .replace('export function','function').replace('renderToStaticMarkup(<BankDocument model={model}/>)',"'test-report'")
const calls=[];let finishFonts, loadPromise
const popup={onload:null,focus(){calls.push('focus')},print(){calls.push('print')}}
popup.document={fonts:{ready:new Promise(resolve=>{finishFonts=resolve})},
  open(){calls.push('open');popup.onload=null},
  write(html){calls.push('write');assert.match(html,/test-report/)},
  close(){calls.push('close');if(popup.onload)loadPromise=popup.onload()}}
const context=vm.createContext({window:{open:()=>popup},bankPrintStyles:'/* test */'})
vm.runInContext(printFunction,context)
assert.equal(context.printBankDocument({exportable:true,period:{from:'2025-01-01'}}),'')
assert.ok(loadPromise,'document.open must not erase the print callback')
assert.deepEqual(calls,['open','write','close'],'print must await fonts')
finishFonts();await loadPromise
assert.deepEqual(calls,['open','write','close','focus','print'])
context.window.open=()=>null
assert.match(context.printBankDocument({exportable:true}),/заблокировал/)
assert.match(context.printBankDocument(null),/загрузите/)
console.log('Bank profitability checks passed: monthly reconciliation, exclusions, coverage, named print page and popup print lifecycle')

assert.deepEqual(BANK_EXPENSE_GROUPS.map(([,name])=>name),['Зарплаты','Аренда','ФудКост','ХозТовары','DSMF+Налог','Такси','Сервис чардж','Коммунальные','Прочие'])
for(const [name,key] of [['DSMF','dsmf-tax'],['DMSF','dsmf-tax'],['Аренда','rent'],['Хозтовары','household'],['Такси','taxi'],['Wolt комиссия','other'],['Банковская комиссия','other'],['Service charge персоналу','service'],['Коммунальные','utilities'],['Вода','utilities'],['Газ','utilities'],['Партнёрские расходы','other'],['Упаковка','other'],['Социальные сети SMM','other']]) assert.equal(bankExpenseGroup({key:'daily-'+name,name}),key,name)
assert.equal(bankExpenseGroup({key:'salary',name:'Зарплаты'}),'salary')
assert.equal(bankExpenseGroup({key:'daily-advance',name:'Аванс'}),'other','advances must not be relabeled as salary')
assert.equal(bankExpenseGroup({key:'tax-paid',name:'Оплаченный налог'}),null)
const beforeGrouping=structuredClone(report)
for(const section of [...report.branches,report.combined]) {
 const grouped=groupBankExpenses(section)
 assert.equal(grouped.groups.length,9)
 assert.equal(grouped.reconciled,true)
 assert.ok(Math.abs(grouped.groups.reduce((sum,g)=>sum+g.amount,0)-section.totals.expenses)<1e-9)
 grouped.monthly.forEach((month,i)=>assert.ok(Math.abs(Object.values(month.categories).reduce((a,b)=>a+b,0)-section.monthly[i].expenses)<1e-9))
}
assert.deepEqual(report,beforeGrouping,'grouping must not change revenue, expense, net, margin or originals')
assert.equal(groupBankExpenses(report.branches[0]).groups.find(g=>g.key==='dsmf-tax').amount,24,'paid tax must not be added')
assert.equal(groupBankExpenses(report.branches[0]).groups.find(g=>g.key==='other').amount,20,'Wolt fee retained without service duplication')
assert.doesNotMatch(component,/<th>Оплаченный налог|money\(row.taxPaid\)/,'paid-tax column must be absent from shared screen/print component')
assert.match(component,/grouped.groups.map/)
assert.equal(groupBankExpenses(report.branches[0]).groups.find(g=>g.key==='service').amount,20,'service charge separated once')
console.log('Nine expense groups: exact names, monthly/branch/network conservation, tax payment exclusion and shared display checks passed')

const coverage=groupBankExpenses(report.branches[0])
assert.equal(coverage.groups.find(group=>group.key==='household').sources.length,0)
assert.equal(coverage.monthly[0].hasData.household,false,'missing separate household data must not masquerade as a recorded zero')
assert.equal(coverage.monthly[1].hasData.other,false,'absence of monthly source entries is not a recorded zero')
const zeroSection={monthly:[{month:'2025-01',categories:{'daily-household':0},expenses:0}],categories:[{key:'daily-household',name:'Хозтовары',amount:0}],totals:{expenses:0}}
assert.equal(groupBankExpenses(zeroSection).monthly[0].hasData.household,true,'an explicitly recorded zero remains distinguishable')
assert.match(component,/row.hasData\[category.key\] \? money/)
console.log('Missing expense coverage versus explicitly recorded zero: passed')

const covered=structuredClone(input)
covered.bankInputs.salaryPeriods=['a','b'].flatMap(branch_id=>['2025-01','2025-02'].map(month=>({branch_id,salary_month:month+'-01'})))
covered.allRows.forEach(branch=>branch.expenseCategories.push({key:'daily-household',name:'Хозтовары',amount:0,details:['2025-01','2025-02'].map(month=>({date:month+'-01',amount:0}))}))
const coveredModel=buildBankReport(covered,['a','b'])
assert.equal(coveredModel.exportable,true,'explicitly present payroll and household records pass coverage guard')
assert.deepEqual(coveredModel.combined.totals,report.combined.totals,'coverage guard must not alter money')
assert.match(component,/Банковский экспорт заблокирован: неполные исходные данные/)
console.log('Incomplete bank coverage fails closed without changing arithmetic: passed')

// Synthetic snapshot only: never include private financial values in source control.
const { validateBankSourceDataset, BANK_BRANCH_IDS } = await import('../src/profitability-bank.mjs')
const snapshot = { year:2025, currency:'AZN', warnings:['Synthetic source caveat'], rows:BANK_BRANCH_IDS.flatMap((id,index)=>Array.from({length:12},(_,m)=>({branch:index?'Crescent/BC5':'BC4',month:`2025-${String(m+1).padStart(2,'0')}`,salary:25, salaryBase:20, managerIncluded:5, household:7,sourceUrl:`https://docs.google.com/spreadsheets/d/synthetic/edit#gid=${index+1}`, salaryCell:'AL12',householdCell:'AL11',salaryFormula:'=SUM(D1:D2)',householdFormula:{formulaValue:'=A1*B1'}}))) }
const validated=validateBankSourceDataset(snapshot)
assert.equal(validated.rows.length,24)
for(const mutate of [s=>s.rows.push(s.rows[0]),s=>s.rows[1]=s.rows[0],s=>s.rows[0].salary=Infinity,s=>s.rows[0].sourceUrl='javascript:alert(1)',s=>s.rows[0].month='2026-01',s=>s.rows[0].branch='Bridge Properties',s=>s.rows[0].managerIncluded=10,s=>s.rows[0].salaryCell='',s=>s.rows[0].salaryFormula='']){
 const invalid=structuredClone(snapshot);mutate(invalid);assert.throws(()=>validateBankSourceDataset(invalid))
}
const mappedInput=structuredClone(input)
mappedInput.allRows[0].id=BANK_BRANCH_IDS[0]; mappedInput.bankInputs.revenueRows.forEach(row=>{if(row.branch_id==='a')row.branch_id=BANK_BRANCH_IDS[0]})
const base=buildBankReport(mappedInput,[BANK_BRANCH_IDS[0]])
const amended=buildBankReport(mappedInput,[BANK_BRANCH_IDS[0]],validated)
assert.equal(amended.sourceAdjustments.length,2)
assert.equal(amended.combined.totals.expenses-base.combined.totals.expenses,10,'replace full salary including old management; do not add source management twice')
assert.equal(amended.combined.totals.net-base.combined.totals.net,-10)
assert.equal(amended.branches[0].monthly[0].categories.salary,25)
assert.equal(amended.branches[0].monthly[0].categories['supplier-food-cost'],23)
assert.equal(amended.branches[0].monthly[0].categories['sheets-household'],7)
assert.equal(amended.combined.totals.revenue,base.combined.totals.revenue)
assert.equal(amended.reconciled,true)
assert.equal(amended.exportable,true)
assert.equal(groupBankExpenses(amended.combined).reconciled,true)
assert.equal(base.branches[0].monthly[0].categories.salary,20,'original input remains unchanged')
const oversized=structuredClone(validated);oversized.rows[0].household=31
const failed=buildBankReport(mappedInput,[BANK_BRANCH_IDS[0]],oversized)
assert.equal(failed.exportable,false,'unsafe household extraction fails closed')
assert.equal(failed.branches[0].monthly[0].categories.salary,20,'invalid month applies neither partial salary nor household')
const later=structuredClone(validated);later.rows.forEach(row=>row.month=row.month.replace('2025','2026'))
assert.deepEqual(buildBankReport(mappedInput,[BANK_BRANCH_IDS[0]],later).combined.totals,base.combined.totals,'no historical extrapolation outside snapshot period')
const existing=structuredClone(mappedInput);existing.allRows[0].expenseCategories.push({key:'daily-household',name:'Хозтовары',amount:4,details:[{date:'2025-01-02',amount:4}]});existing.allRows[0].totalExpenses+=4;existing.allRows[0].net-=4
const existingResult=buildBankReport(existing,[BANK_BRANCH_IDS[0]],validated)
assert.equal(groupBankExpenses(existingResult.branches[0]).monthly[0].categories.household,7,'existing household is not counted twice')
assert.equal(existingResult.branches[0].monthly[0].categories['supplier-food-cost'],27,'only unclassified remainder moves out of food')
console.log('Sheets snapshot validation, salary replacement, monthly provenance, household conservation and duplicate protection: passed')
assert.equal(buildBankReport(mappedInput,[BANK_BRANCH_IDS[0]],later).exportable,false,'attached source with no matching months blocks export even if RMS could otherwise export')
assert.ok(buildBankReport(mappedInput,[BANK_BRANCH_IDS[0]],later).coverageBlockers.some(text=>text.includes('Sheets')))
const uiSource=fs.readFileSync(new URL('../src/ProfitabilityBankReport.jsx',import.meta.url),'utf8')
assert.doesNotMatch(uiSource,/applySource|setSourceDataset|type="file"/,'ordinary interface reads persistent RMS data without transient JSON overrides')
assert.match(uiSource,/Постоянные данные RMS/)
console.log('Persistent RMS source controls replace transient upload override: passed')
