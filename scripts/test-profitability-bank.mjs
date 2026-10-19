import assert from 'node:assert/strict'
import fs from 'node:fs'
import { buildBankReport, reportMonths } from '../src/profitability-bank.mjs'
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
assert.equal(report.exportable,true)
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
const duplicateCategories=structuredClone(input); duplicateCategories.allRows[0].expenseCategories[2].amount=10; duplicateCategories.allRows[0].expenseCategories[2].details[0].amount=10; duplicateCategories.allRows[0].expenseCategories.push({key:'daily-wolt',name:'WOLT',amount:10,details:[{date:'2025-01-01',amount:10}]}); const dedup=buildBankReport(duplicateCategories,['a']); assert.equal(dedup.branches[0].categories.filter(c=>c.key==='daily-wolt').length,1); assert.equal(dedup.branches[0].categories.find(c=>c.key==='daily-wolt').amount,20); assert.equal(dedup.exportable,true)
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
console.log('Bank profitability: period, deduplication, allocations, tax, salary estimate, reconciliation, negative results, coverage and fail-closed checks passed')
const printCss=fs.readFileSync(new URL('../src/profitability-bank.css',import.meta.url),'utf8')
assert.match(printCss,/@page rms-bank-report\{size:A4 landscape;margin:12mm\}/)
assert.doesNotMatch(printCss,/@page\s*\{/,'bank paper size must not change other reports')
