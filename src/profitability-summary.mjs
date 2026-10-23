// Presentation only. Explicit reviewed closed periods split operating comparison
// from disclosed costs; underlying totals and allocation shares stay unchanged.
const amount = value => Number.isFinite(Number(value)) ? Number(value) : 0
const monthOf = value => /^\d{4}-(0[1-9]|1[0-2])(?:-|$)/.test(String(value || '')) ? String(value).slice(0, 7) : null
const close = (a, b) => Math.abs(a - b) < 0.005
export function buildProfitabilitySummary(report = {}) {
  const rows = report.rows || []
  const revenue = report.summaryInputs?.revenueRows || []
  const months = new Set(revenue.map(row => monthOf(row.revenue_date)).filter(Boolean))
  rows.forEach(row => (row.expenseCategories || []).forEach(category => (category.details || []).forEach(detail => { const month = monthOf(detail.date); if (month) months.add(month) })))
  const from = monthOf(report.summaryInputs?.period?.from)
  const to = monthOf(report.summaryInputs?.period?.toExclusive)
  if (from && to) {
    let cursor = from
    while (cursor < to && months.size < 1212) {
      months.add(cursor)
      const [year, month] = cursor.split('-').map(Number)
      cursor = `${month === 12 ? year + 1 : year}-${String(month === 12 ? 1 : month + 1).padStart(2, '0')}`
    }
  }
  const keys = [...months].filter(key => (!from || key >= from) && (!to || key < to)).sort()
  const branches = rows.map(source => {
    const monthly = keys.map(month => ({month, revenue:0, expenses:0, net:0, revenueRecords:0, categories:{}}))
    const byMonth = new Map(monthly.map(row => [row.month,row]))
    const issues = []
    revenue.filter(row => String(row.branch_id) === String(source.id)).forEach(row => {
      const target = byMonth.get(monthOf(row.revenue_date))
      if (!target) return
      target.revenue += amount(row.cash_amount) + amount(row.bank_amount) + amount(row.wolt_amount)
      target.revenueRecords++
    })
    const categories = (source.expenseCategories || []).filter(category => category.key !== 'tax-paid')
    categories.forEach(category => {
      if (category.key === 'tax') {
        monthly.forEach(row => { row.categories[category.key] = row.revenue * amount(source.taxRate) / 100 })
      } else {
        for (const detail of category.details || []) {
          const target = byMonth.get(monthOf(detail.date))
          if (!target || String(detail.id).startsWith('salary-estimate-')) {
            if (amount(detail.amount)) issues.push({category:category.name, reason:'undated-or-estimated'})
            continue
          }
          target.categories[category.key] = amount(target.categories[category.key]) + amount(detail.amount)
        }
      }
      const allocated = monthly.reduce((sum,row) => sum + amount(row.categories[category.key]),0)
      if (!close(allocated,amount(category.amount))) issues.push({category:category.name, reason:'category-mismatch', difference:amount(category.amount)-allocated})
    })
    monthly.forEach(row => { row.expenses = Object.values(row.categories).reduce((sum,value)=>sum+value,0); row.net = row.revenue-row.expenses })
    const sums = monthly.reduce((sum,row)=>({revenue:sum.revenue+row.revenue,expenses:sum.expenses+row.expenses,net:sum.net+row.net}),{revenue:0,expenses:0,net:0})
    const period = {revenue:amount(source.revenue),expenses:amount(source.totalExpenses),net:amount(source.net)}
    if (!close(sums.revenue,period.revenue) || !close(sums.expenses,period.expenses) || !close(sums.net,period.net)) issues.push({reason:'period-mismatch'})
    const coverageIssues = (report.summaryInputs?.coverageIssues || []).filter(issue => !issue.branchId || String(issue.branchId) === String(source.id))
    monthly.forEach(row => {
      row.calculationMode = row.month >= '2026-01' && row.month <= '2026-09' ? 'reviewed-components' : 'legacy-preliminary'
      row.coverageIssues = coverageIssues.filter(issue => !issue.month || issue.month === row.month)
      if (row.calculationMode === 'legacy-preliminary') row.coverageIssues.push({month:row.month,severity:'preliminary',reason:'legacy-period-allocation',detail:'Предварительный расчёт по прежней методике периода; источник не входит в сверку января–сентября 2026.'})
      row.profitAvailable = row.coverageIssues.every(issue => issue.severity === 'preliminary')
      row.expensesAvailable = row.profitAvailable
      if (!row.profitAvailable) row.net = null
      const status=(report.summaryInputs?.periodStatuses||[]).find(s=>String(s.branchId)===String(source.id)&&s.month===row.month)
      if(status){
        const details=categories.flatMap(c=>c.key==='tax'?[]:(c.details||[])).filter(d=>monthOf(d.date)===row.month&&amount(d.amount)!==0)
        const expected=status.target.expectedExpenseRows.filter(d=>amount(d.amount)!==0),expectedById=new Map(expected.map(d=>[String(d.id),d]))
        const exact=!issues.length&&row.revenueRecords===0&&close(row.expenses,status.target.disclosedExpenseTotal)&&details.length===expected.length&&new Set(details.map(d=>String(d.id))).size===details.length&&details.every(d=>expectedById.has(String(d.id))&&close(amount(d.amount),amount(expectedById.get(String(d.id)).amount)))
        if(!exact){issues.push({reason:'closed-period-computed-costs-mismatch',month:row.month});row.profitAvailable=false;row.expensesAvailable=false;row.net=null}
        else if(row.profitAvailable){row.operatingExcluded=true;row.disclosedExpenses=row.expenses;row.disclosedDetails=expected;row.revenueObservation='absent_not_zero';row.net=null;row.profitAvailable=false}
      }
    })
    monthly.forEach(row=>{row.includingDisclosedExpenses=row.profitAvailable&&row.revenueRecords>0?row.net:null})
    const operatingMonths=monthly.filter(row=>!row.operatingExcluded)
    period.disclosedExpenses=monthly.reduce((sum,row)=>sum+amount(row.disclosedExpenses),0)
    period.operatingExcluded=operatingMonths.length===0&&monthly.some(row=>row.operatingExcluded)
    period.hasClosedPeriods=monthly.some(row=>row.operatingExcluded)
    if(period.hasClosedPeriods){period.expenses-=period.disclosedExpenses;period.net=period.revenue-period.expenses}
    period.profitAvailable = !report.summaryInputs?.mixedBasis && !issues.length && operatingMonths.length>0 && operatingMonths.every(row => row.profitAvailable && row.revenueRecords > 0)
    period.expensesAvailable = !report.summaryInputs?.mixedBasis && !issues.length && operatingMonths.every(row => row.expensesAvailable)
    if (!period.profitAvailable) period.net = null
    period.includingDisclosedExpenses=period.profitAvailable?period.net-period.disclosedExpenses:null
    return {id:source.id,name:source.name,period,monthly,categories,issues,coverageIssues,reconciled:!issues.length}
  })
  const activeBranches=branches.filter(row=>!row.period.operatingExcluded)
  const total = branches.reduce((sum,row)=>({revenue:sum.revenue+row.period.revenue,expenses:sum.expenses+row.period.expenses,net:sum.net+(row.period.net || 0),disclosedExpenses:sum.disclosedExpenses+row.period.disclosedExpenses,hasClosedPeriods:sum.hasClosedPeriods||row.period.hasClosedPeriods}),{revenue:0,expenses:0,net:0,disclosedExpenses:0,hasClosedPeriods:false})
  const monthly=keys.map(month=>{
    const sum={month,revenue:0,expenses:0,net:0,profitAvailable:true,expensesAvailable:true,coverageIssues:[],revenueRecords:0,hasExpenseDetails:false,revenueComplete:true,disclosedExpenses:0,closedPeriods:[],operatingCount:0}
    for(const branch of branches){const row=branch.monthly.find(r=>r.month===month);sum.coverageIssues.push(...(row.coverageIssues||[]))
      if(row.operatingExcluded){sum.disclosedExpenses+=row.disclosedExpenses;sum.closedPeriods.push({branchId:branch.id,name:branch.name,month,expenses:row.disclosedExpenses});continue}
      sum.operatingCount++;sum.revenue+=row.revenue;sum.expenses+=row.expenses;sum.net+=row.net||0;sum.profitAvailable&&=row.profitAvailable;sum.expensesAvailable&&=row.expensesAvailable;sum.revenueRecords+=row.revenueRecords;sum.hasExpenseDetails||=Object.keys(row.categories).some(key=>key!=='tax');sum.revenueComplete&&=row.revenueRecords>0
    }
    sum.hasClosedPeriods=sum.closedPeriods.length>0;sum.operatingExcluded=sum.operatingCount===0&&sum.hasClosedPeriods
    sum.profitAvailable&&=sum.operatingCount>0&&sum.revenueComplete
    if(!sum.profitAvailable)sum.net=null
    sum.includingDisclosedExpenses=sum.profitAvailable?sum.net-sum.disclosedExpenses:null
    return sum
  })
  total.operatingExcluded=activeBranches.length===0&&total.hasClosedPeriods
  total.profitAvailable = activeBranches.length > 0 && branches.every(row=>row.reconciled&&row.period.expensesAvailable) && activeBranches.every(row => row.period.profitAvailable)
  total.expensesAvailable = branches.length > 0 && branches.every(row => row.period.expensesAvailable)
  if (!total.profitAvailable) total.net = null
  total.includingDisclosedExpenses=total.profitAvailable?total.net-total.disclosedExpenses:null
  return {branches,total,monthly,mixedBasis:!!report.summaryInputs?.mixedBasis,sourceChecks:report.summaryInputs?.sourceChecks||[],months:keys,reconciled:branches.length>0 && branches.every(row=>row.reconciled)}
}
