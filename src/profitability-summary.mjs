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
    return {id:source.id,name:source.name,period,monthly,categories,issues,reconciled:!issues.length}
  })
  const total = branches.reduce((sum,row)=>({revenue:sum.revenue+row.period.revenue,expenses:sum.expenses+row.period.expenses,net:sum.net+row.period.net}),{revenue:0,expenses:0,net:0})
  const monthly = keys.map(month => branches.reduce((sum,branch)=>{const row=branch.monthly.find(row=>row.month===month);return {...sum,revenue:sum.revenue+row.revenue,expenses:sum.expenses+row.expenses,net:sum.net+row.net,revenueRecords:sum.revenueRecords+row.revenueRecords,hasExpenseDetails:sum.hasExpenseDetails||Object.keys(row.categories).some(key=>key!=='tax'),revenueComplete:sum.revenueComplete && row.revenueRecords > 0}}, {month,revenue:0,expenses:0,net:0,revenueRecords:0,hasExpenseDetails:false,revenueComplete:true}))
  return {branches,total,monthly,months:keys,reconciled:branches.length>0 && branches.every(row=>row.reconciled)}
}
