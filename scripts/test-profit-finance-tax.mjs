import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
const read = part => fs.readFileSync(new URL(`../src/main.parts/part-${part}.jsxpart`, import.meta.url), 'utf8')
const between = (s,a,b) => {
  const i=s.indexOf(a),j=s.indexOf(b,i)
  assert.ok(i>=0 && j>i,`Missing production marker: ${a}`)
  return s.slice(i,j)
}
const shared=read('00'), finance=read('03')
const helpers=between(shared,'const fmt =','const RMS_LOGIN_GUARD_KEY')
const expenseSelection=between(finance,'    const rawExpenseRows = (rows || [])','    const directMarketFoodCost =')
const finalCalculation=between(finance,'    const financeActualBreakdownRows = [...expenseRows]','    const financeFormulaAuditRows =')
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-9,`${a} != ${b}`)
const fixtures=[
  {branch_id:'a',amount:20,expense_categories:{name:'Налоги'},comment:'Styuard'},
  {branch_id:'a',amount:40,expense_categories:{name:'DSMF'},comment:'social contribution'},
  {branch_id:'a',amount:100,expense_categories:{name:'Налоги'},comment:'оплата налога'},
  {branch_id:'b',amount:60,expense_categories:{name:'Аренда'},comment:''},
]
function run(rows, activeBranchIds, revenue, taxCalculated, salary=0, serviceCost=0) {
  const context={rows,current:{activeBranchIds},revenue,taxCalculated,salary,serviceCost,
    t:x=>x,rmsBranchInRevenueScope:(r,ids)=>ids.has(String(r.branch_id))}
  vm.createContext(context)
  vm.runInContext(helpers+ '\n' + expenseSelection + `
    const taxPaid = rows.filter(r => current.activeBranchIds.includes(r.branch_id) && isTaxPaymentExpenseRow(r)).reduce((s,r)=>s+parseNum(r.amount),0)
    const expenseRows = rawExpenseRows.map(r=>({name:r.name,amount:r.amount}))
    if (salary) expenseRows.push({name:'Зарплаты',amount:salary})
    if (serviceCost) expenseRows.push({name:'Service charge персоналу',amount:serviceCost})
    const TAX_RATE=8
    let currentForFinance={revenue,taxCalculated,tax:taxCalculated,taxPaid,salary,serviceCost,net:0}
    `+finalCalculation+`
    globalThis.result={currentForFinance,rawExpenseRows,financeActualBreakdownRows,financeActualExpenseTotal,
      styuardIsTax:isTaxPaymentExpenseRow(rows.find(r=>r.comment==='Styuard')),
      dsmfIsTax:isNonOperatingTaxExpenseRow(rows.find(r=>r.expense_categories?.name==='DSMF'))}
  `,context)
  return context.result
}
const a=run(fixtures,['a'],1000,80,100,30)
near(a.currentForFinance.net,730)
near(a.currentForFinance.totalExpenses,270)
near(a.currentForFinance.expenses,90) // Operating 60 plus SC 30, excluding salary and turnover tax.
near(a.currentForFinance.taxPaid,100)
assert.equal(a.styuardIsTax,false); assert.equal(a.dsmfIsTax,false)
assert.equal(a.rawExpenseRows.find(r=>r.amount===20).name,'Прочее')
assert.equal(a.rawExpenseRows.find(r=>r.amount===40).name,'DSMF')
assert.ok(!a.rawExpenseRows.some(r=>r.amount===100))
assert.equal(a.financeActualBreakdownRows.find(r=>r.informational)?.amount,100)
const unpaid=run(fixtures.filter(r=>r.amount!==100),['a'],1000,80,100,30)
near(unpaid.currentForFinance.net,a.currentForFinance.net)
const withoutStyuard=run(fixtures.filter(r=>r.comment!=='Styuard'),['a'],1000,80,100,30)
near(withoutStyuard.currentForFinance.net-a.currentForFinance.net,20)
const b=run(fixtures,['b'],500,40,50,0)
const network=run(fixtures,['a','b'],1500,120,150,30)
for(const field of ['revenue','net','totalExpenses','expenses','salary','serviceCost','tax','taxCalculated','taxPaid']) {
  near(a.currentForFinance[field]+b.currentForFinance[field],network.currentForFinance[field])
}
for(const r of [a,b,network]) {
  near(r.currentForFinance.revenue-r.currentForFinance.totalExpenses,r.currentForFinance.net)
  near(r.financeActualBreakdownRows.filter(x=>!x.informational).reduce((s,x)=>s+x.amount,0),r.currentForFinance.totalExpenses)
}
console.log('Finance actual tax classification, informational payment exclusion, Styuard/DSMF and branch reconciliation: PASS')
