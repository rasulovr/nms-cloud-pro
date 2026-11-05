// Every actual metric is projected from the same monthly operating rows.
// Closed-period costs are disclosed separately and never silently reallocated.
export function operationalMetrics(model, branchId=null) {
  const branches=model.branches.filter(b=>branchId==null||String(b.id)===String(branchId))
  const months=branches.flatMap(b=>b.monthly),active=months.filter(r=>!r.operatingExcluded)
  const aggregate=rows=>{
    const groups=new Map()
    for(const row of rows)for(const detail of row.details||[]){const key=detail.key,prior=groups.get(key)||{key,name:detail.name,amount:0,details:[]};prior.amount+=detail.amount;prior.details.push({...detail,branch_id:row.id,branchName:row.name});groups.set(key,prior)}
    return [...groups.values()].filter(r=>r.amount!==0).sort((a,b)=>b.amount-a.amount)
  }
  const expenseRows=aggregate(active),sum=key=>active.reduce((s,r)=>s+(r[key]||0),0)
  return {cash:sum('cash'),bank:sum('bank'),wolt:sum('wolt'),woltRevenue:sum('wolt'),baseRevenue:sum('cash')+sum('bank')-sum('bankCommission'),expenseRows,disclosedExpenseRows:aggregate(months.filter(r=>r.operatingExcluded)),salary:sum('salary'),serviceCost:sum('serviceCost'),tax:sum('tax'),taxPaid:sum('taxPaid'),taxCalculated:sum('tax'),grossTurnover:sum('grossRevenue'),bankCommission:sum('bankCommission'),foodCostAmount:sum('supplierFoodCost'),preliminarySupplierExpense:sum('supplierFoodCost'),totalExpenses:sum('expenses'),expenseRatio:sum('revenue')!==0?sum('expenses')/sum('revenue')*100:null}
}
export function actualProfitabilityView(legacy,profit,previous) {
  return {...legacy,...profit,expenses:profit.expenses,totalExpenses:profit.expenses,
    branchRows:profit.branches||[],expenseRows:profit.expenseRows||[],
    previous:previous?.available?{...previous,expenses:previous.expenses,expenseRows:previous.expenseRows||[]}:null,
    comparison:null}
}
export function isClosedProfitabilityMonth(year,month,now=new Date()) {
  return Number(year)*12+Number(month)<now.getFullYear()*12+now.getMonth()+1
}
export function formatProfitabilityComparison(value,formatter) {
  return typeof value==='number'&&Number.isFinite(value)?formatter(value):'—'
}
