// Presentation only. Never replaces period totals or recalculates allocation shares.
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
    })
    period.profitAvailable = !report.summaryInputs?.mixedBasis && !issues.length && monthly.every(row => row.profitAvailable && row.revenueRecords > 0)
    period.expensesAvailable = !report.summaryInputs?.mixedBasis && !issues.length && monthly.every(row => row.expensesAvailable)
    if (!period.profitAvailable) period.net = null
    return {id:source.id,name:source.name,period,monthly,categories,issues,coverageIssues,reconciled:!issues.length}
  })
  const total = branches.reduce((sum,row)=>({revenue:sum.revenue+row.period.revenue,expenses:sum.expenses+row.period.expenses,net:sum.net+(row.period.net || 0)}),{revenue:0,expenses:0,net:0})
  const monthly = keys.map(month => branches.reduce((sum,branch)=>{const row=branch.monthly.find(row=>row.month===month);return {...sum,revenue:sum.revenue+row.revenue,expenses:sum.expenses+row.expenses,net:sum.net+(row.net || 0),profitAvailable:sum.profitAvailable && row.profitAvailable,expensesAvailable:sum.expensesAvailable && row.expensesAvailable,coverageIssues:[...sum.coverageIssues,...(row.coverageIssues||[])],revenueRecords:sum.revenueRecords+row.revenueRecords,hasExpenseDetails:sum.hasExpenseDetails||Object.keys(row.categories).some(key=>key!=='tax'),revenueComplete:sum.revenueComplete && row.revenueRecords > 0}}, {month,revenue:0,expenses:0,net:0,profitAvailable:true,expensesAvailable:true,coverageIssues:[],revenueRecords:0,hasExpenseDetails:false,revenueComplete:true}))
  total.profitAvailable = branches.length > 0 && branches.every(row => row.period.profitAvailable)
  total.expensesAvailable = branches.length > 0 && branches.every(row => row.period.expensesAvailable)
  if (!total.profitAvailable) total.net = null
  monthly.forEach(row => { if (!row.profitAvailable) row.net = null })
  return {branches,total,monthly,mixedBasis:!!report.summaryInputs?.mixedBasis,sourceChecks:report.summaryInputs?.sourceChecks||[],months:keys,reconciled:branches.length>0 && branches.every(row=>row.reconciled)}
}
