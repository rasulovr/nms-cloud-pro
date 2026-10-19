// Read-only presentation bridge over the existing profitability engine.
// Period allocation shares and expense inclusion are intentionally not recalculated.
export const BANK_BRANCH_IDS = ['0dad369d-eac6-4cf9-bb06-b9d010714d6e', 'e7e0f06a-610f-499b-9e9a-e1f2e2c23410']
const num = value => Number.isFinite(Number(value)) ? Number(value) : 0
export function reportMonths(from, toExclusive) {
  if (!/^\d{4}-\d{2}-01$/.test(from || '') || !/^\d{4}-\d{2}-01$/.test(toExclusive || '')) return []
  const months = []
  let cursor = from.slice(0, 7)
  while (`${cursor}-01` < toExclusive && months.length < 12) {
    months.push(cursor)
    const [year, month] = cursor.split('-').map(Number)
    cursor = `${month === 12 ? year + 1 : year}-${String(month === 12 ? 1 : month + 1).padStart(2, '0')}`
  }
  return months.length && `${cursor}-01` === toExclusive ? months : []
}
export function buildBankReport(report, selectedIds) {
  const months = reportMonths(report.period?.from, report.period?.toExclusive)
  const ids = [...new Set(selectedIds.map(String))]
  if (!months.length || !ids.length) return null
  const input = report.bankInputs || {}
  const revenue = input.revenueRows || []
  const payroll = input.salaryPeriods || []
  const makeMonth = month => ({ month, cash: 0, bank: 0, wolt: 0, revenue: 0, expenses: 0, net: 0, margin: null, categories: {}, taxPaid: 0, revenueDays: 0, salaryRows: 0 })
  const branchReports = ids.map(id => {
    const original = (report.allRows || report.rows || []).find(row => String(row.id) === id)
    const source = original || { id, name: input.branchNames?.[id] || id, revenue: 0, totalExpenses: 0, net: 0, expenseCategories: [] }
    const monthly = months.map(makeMonth)
    const byMonth = new Map(monthly.map(row => [row.month, row]))
    const daySets = new Map(months.map(month => [month, new Set()]))
    revenue.filter(row => String(row.branch_id) === id).forEach(row => {
      const month = String(row.revenue_date).slice(0, 7), target = byMonth.get(month)
      if (!target) return
      target.cash += num(row.cash_amount); target.bank += num(row.bank_amount); target.wolt += num(row.wolt_amount)
      target.revenue += num(row.cash_amount) + num(row.bank_amount) + num(row.wolt_amount)
      daySets.get(month).add(String(row.revenue_date).slice(0, 10))
    })
    payroll.filter(row => String(row.branch_id) === id).forEach(row => {
      const target = byMonth.get(String(row.salary_month).slice(0, 7))
      if (target) target.salaryRows++
    })
    const warnings = [...(input.warnings || [])]
    if (!original) warnings.push('Нет расчёта для выбранного филиала. Экспорт заблокирован; отсутствие данных не означает нулевой результат.')
    let allocationValid = true
    const categoryMap = new Map()
    for (const category of source.expenseCategories || []) {
      const informational = category.key === 'tax-paid'
      const existingCategory = categoryMap.get(category.key) || { key: category.key, name: category.name, amount: 0, informational }
      existingCategory.amount += num(category.amount)
      categoryMap.set(category.key, existingCategory)
      if (category.key === 'tax') {
        monthly.forEach(row => { row.categories[category.key] = row.revenue * num(source.taxRate) / 100 })
        continue
      }
      let allocated = 0
      for (const detail of category.details || []) {
        const amount = num(detail.amount)
        if (String(detail.id).startsWith('salary-estimate-')) {
          // Existing fallback multiplies current salary by network revenue months.
          const activeMonths = [...new Set(revenue.map(row => String(row.revenue_date).slice(0, 7)))].filter(month => byMonth.has(month))
          const targets = activeMonths.length ? activeMonths : [months[0]]
          targets.forEach(month => { const target = byMonth.get(month); target.categories[category.key] = num(target.categories[category.key]) + amount / targets.length })
          allocated += amount
          continue
        }
        const target = byMonth.get(String(detail.date || '').slice(0, 7))
        if (!target) continue
        if (informational) target.taxPaid += amount
        else target.categories[category.key] = num(target.categories[category.key]) + amount
        allocated += amount
      }
      if (Math.abs(allocated - num(category.amount)) > 0.005) { allocationValid = false; warnings.push(`Не удалось разнести по месяцам статью «${category.name}»: ${(num(category.amount) - allocated).toFixed(2)} AZN. Экспорт заблокирован.`) }
    }
    monthly.forEach(row => {
      row.revenueDays = daySets.get(row.month).size
      row.expenses = Object.values(row.categories).reduce((sum, amount) => sum + num(amount), 0)
      row.net = row.revenue - row.expenses
      row.margin = row.revenue ? row.net / row.revenue * 100 : null
      const [year, month] = row.month.split('-').map(Number)
      const calendarDays = new Date(Date.UTC(year, month, 0)).getUTCDate()
      if (row.revenueDays < calendarDays) warnings.push(`${row.month}: выручка за ${row.revenueDays} из ${calendarDays} календарных дней; отсутствие записи не означает нулевую выручку.`)
      if (!row.salaryRows) warnings.push(`${row.month}: нет начислений salary_periods с привязкой к филиалу. Зарплата может быть расчётной или неполной.`)
    })
    const totals = monthly.reduce((sum, row) => ({ revenue: sum.revenue + row.revenue, expenses: sum.expenses + row.expenses, net: sum.net + row.net }), { revenue: 0, expenses: 0, net: 0 })
    totals.margin = totals.revenue ? totals.net / totals.revenue * 100 : null
    const reconciled = Math.abs(totals.revenue - num(source.revenue)) < 0.01 && Math.abs(totals.expenses - num(source.totalExpenses)) < 0.01 && Math.abs(totals.net - num(source.net)) < 0.01
    if (!reconciled) warnings.push('Помесячный итог не совпадает с действующим расчётом рентабельности. Экспорт заблокирован.')
    return { id, name: source.name, monthly, categories: [...categoryMap.values()], totals, warnings: [...new Set(warnings)], reconciled: reconciled && allocationValid && Boolean(original), share: num(source.revenueShare), taxRate: num(source.taxRate), available: Boolean(original) }
  })
  const combinedMonths = months.map((month, index) => {
    const row = makeMonth(month)
    branchReports.forEach(branch => {
      const part = branch.monthly[index]
      row.cash += part.cash; row.bank += part.bank; row.wolt += part.wolt
      row.revenue += part.revenue; row.expenses += part.expenses; row.taxPaid += part.taxPaid
      Object.entries(part.categories).forEach(([key, value]) => { row.categories[key] = num(row.categories[key]) + value })
    })
    row.net = row.revenue - row.expenses; row.margin = row.revenue ? row.net / row.revenue * 100 : null
    return row
  })
  const categoryMap = new Map()
  branchReports.forEach(branch => branch.categories.forEach(category => {
    const current = categoryMap.get(category.key) || { ...category, amount: 0 }
    current.amount += category.amount; categoryMap.set(category.key, current)
  }))
  const totals = combinedMonths.reduce((sum, row) => ({ revenue: sum.revenue + row.revenue, expenses: sum.expenses + row.expenses, net: sum.net + row.net }), { revenue: 0, expenses: 0, net: 0 })
  totals.margin = totals.revenue ? totals.net / totals.revenue * 100 : null
  return { months, branches: branchReports, combined: { id: 'combined', name: 'Совокупно: ' + branchReports.map(row => row.name).join(' + '), monthly: combinedMonths, categories: [...categoryMap.values()], totals }, period: report.period, source: report.source, generatedAt: report.loadedAt, exportable: branchReports.every(row => row.reconciled), payrollEstimated: input.payrollEstimated, selectedIds: ids }
}
