// Capture the loader's calculation before verification hides net. Never derive
// a provisional number from a blocked summary or substitute a zero input.
export function captureProvisionalProfit({rows,totals,input,revenueRows,period,coverageIssues,allocationComplete,bankBasisConfirmed}) {
  const numeric=v=>(typeof v==='number'||typeof v==='string') && String(v).trim()!=='' && Number.isFinite(Number(v))
  const invalidSource=[
    ...(input.revenueRows||[]).flatMap(r=>['cash_amount','bank_amount','wolt_amount'].map(k=>r[k])),
    ...(input.dailyExpenseRows||[]).map(r=>r.amount),...(input.supplierPurchases||[]).map(r=>r.total_amount),
    ...(input.salaryPeriods||[]).map(r=>r.salary_gross),...(input.serviceRows||[]).map(r=>r.staff_cost_amount)
  ].some(v=>!numeric(v))
  const unsafeReasons=new Set(['historical-payroll-basis-review-required','invalid-payroll-accrual','duplicate-payroll-accrual','unresolved-payroll-identity','invalid-service-accrual','duplicate-service-accrual','missing-payroll-accruals','missing-service-accrual'])
  const sourceComplete=!invalidSource && !coverageIssues.some(i=>unsafeReasons.has(i.reason))
  const project=(value,hasRevenue)=>{
    const available=sourceComplete && allocationComplete && hasRevenue && [value.net,value.revenue,value.totalExpenses].every(v=>typeof v==='number'&&Number.isFinite(v))
    return {available,net:available?value.net:null,margin:available&&value.revenue>0?value.net/value.revenue*100:null,revenue:value.revenue,expenses:value.totalExpenses,bankCommission:value.bankCommission,bankBasisConfirmed,
      basis:bankBasisConfirmed?'recorded-components':'before-unverified-bank-commission'}
  }
  return {...project(totals,revenueRows.length>0),period,sourceComplete,allocationComplete,
    branches:rows.map(r=>({id:r.id,...project(r,revenueRows.some(x=>String(x.branch_id)===String(r.id)))}))}
}
