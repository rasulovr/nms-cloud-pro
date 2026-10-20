import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
const read = part => fs.readFileSync(new URL(`../src/main.parts/part-${part}.jsxpart`, import.meta.url), 'utf8')
const between = (s, a, b) => {
  const i = s.indexOf(a), j = s.indexOf(b, i)
  assert.ok(i >= 0 && j > i, `Missing source markers: ${a}`)
  return s.slice(i, j)
}
const source = read('04')
const body = between(source, '      const profitSupplierPurchases = rmsProfitPurchaseRows(supplierPurchases, dailyExpenseRows)', '      const visibleRows = branchFilter')
const bankHelpers = between(read('00'), 'const RMS_DEFAULT_BANK_COMMISSION_RATE =', 'const RMS_SOURCE_VERSION')
assert.match(source, /const bankCommissionRate = rmsBankCommissionRate\(await readRmsAppSetting\(RMS_BANK_COMMISSION_RATE_SETTING, RMS_DEFAULT_BANK_COMMISSION_RATE\)\)/)
const parseNum = v => Number(String(v ?? '0').replace(',', '.').replace(/\s/g, '')) || 0
const near = (a,b) => assert.ok(Math.abs(a-b) < 1e-8, `${a} != ${b}`)
function run(rate, revenueRows, dailyExpenseRows = []) {
  const ctx = {
    parseNum, bankCommissionRate: rate, revenueRows,
    rmsProfitPurchaseRows: purchases => purchases,
    branches: [{id:'cash',name:'Cash'}, {id:'card',name:'Card'}],
    employeeRows: [{id:'manager',position:'manager'}],
    salaryPeriods: [{employee_id:'manager', salary_gross:100}],
    supplierPurchases: [{id:'p1',total_amount:200}],
    dailyExpenseRows, isTaxPaymentExpenseRow: r => r.kind === 'tax-payment', serviceRows: [], taxSettings: {},
    period: {from:'2026-05-01',label:'2026-05'},
    rmsSalaryPeriodTotal:r=>r.salary_gross, positionGroup:()=> 'Менеджеры',
    financeExpenseNameFromRow:()=>'', normalizeExpenseText:s=>String(s).toLowerCase(),
    fmt:String, pct:String,
  }
  vm.createContext(ctx)
  vm.runInContext(bankHelpers + '\n' + body + '\nglobalThis.result={rows,networkRevenue,networkNetRevenue}', ctx)
  return ctx.result
}
const input = [
  {branch_id:'cash',cash_amount:1000,bank_amount:0,wolt_amount:0,revenue_date:'2026-05-01'},
  {branch_id:'card',cash_amount:0,bank_amount:1000,wolt_amount:100,revenue_date:'2026-05-01'}
]
const result=run(2,input)
near(result.networkRevenue,2100); near(result.networkNetRevenue,2080)
const cash=result.rows.find(r=>r.id==='cash'), card=result.rows.find(r=>r.id==='card')
near(cash.revenueShare,1000/2080*100); near(card.revenueShare,1080/2080*100)
near(card.revenue,1100); near(card.tax,88); near(card.bankCommission,20)
near(card.supplierFoodCost,200*1080/2080); near(card.managerSalary,100*1080/2080)
near(result.rows.reduce((s,r)=>s+r.net,0),2100-20-300-168)
for(const r of result.rows){
  near(r.expenseCategories.reduce((s,c)=>s+c.amount,0),r.totalExpenses)
  for(const c of r.expenseCategories) near(c.details.reduce((s,d)=>s+d.amount,0),c.amount)
  near(r.revenue-r.totalExpenses,r.net)
}
const zeroRate=run(0,input)
near(zeroRate.rows.find(r=>r.id==='card').bankCommission,0)
near(zeroRate.rows.find(r=>r.id==='card').revenueShare,1100/2100*100)
const customRate=run(3,input)
near(customRate.rows.find(r=>r.id==='card').bankCommission,30)
near(customRate.rows.find(r=>r.id==='card').tax,88)
const zero=run(2,[])
for(const r of zero.rows) assert.ok(Number.isFinite(r.net))
const taxPayment=run(2,input,[{id:'paid',branch_id:'card',kind:'tax-payment',amount:20,expense_date:'2026-05-01'}])
const paidCard=taxPayment.rows.find(r=>r.id==='card')
near(paidCard.net,card.net); near(paidCard.taxPaid,20)
near(paidCard.expenseCategories.filter(c=>c.key!=='tax-paid').reduce((s,c)=>s+c.amount,0),paidCard.totalExpenses)
console.log('Reports bank commission, gross tax base, net allocation and detail reconciliation: PASS')
