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
// Legacy validation retained for synthetic fixtures; live2025 source uses the protected RMS snapshot reader.
export function validateBankSourceDataset(dataset) {
  if (!dataset || dataset.currency !== 'AZN' || !Number.isInteger(dataset.year) || dataset.year < 2000 || dataset.year > 2100 || !Array.isArray(dataset.rows) || dataset.rows.length !== 24) throw new Error('Нужны 24 строки: 12 месяцев по BC4 и Crescent, валюта AZN.')
  const seen = new Set()
  const rows = dataset.rows.map(row => {
    const branchId = row.branch === 'BC4' ? BANK_BRANCH_IDS[0] : row.branch === 'Crescent/BC5' ? BANK_BRANCH_IDS[1] : null
    if (!branchId || !new RegExp(`^${dataset.year}-(0[1-9]|1[0-2])$`).test(row.month)) throw new Error('Неверный филиал или месяц источника.')
    const key = `${branchId}:${row.month}`
    if (seen.has(key)) throw new Error('Повтор филиала и месяца в источнике.')
    seen.add(key)
    for (const field of ['salary', 'household', 'salaryBase', 'managerIncluded']) if (typeof row[field] !== 'number' || !Number.isFinite(row[field]) || row[field] < 0) throw new Error(`Некорректная сумма ${field}.`)
    if (Math.abs(row.salary - row.salaryBase - row.managerIncluded) > 0.01) throw new Error('Зарплата не сходится с базой и включённым менеджментом.')
    if (!/^https:\/\/docs\.google\.com\/spreadsheets\/d\/[a-zA-Z0-9_-]+\/edit#gid=\d+(?:&range=[A-Z0-9:]+)?$/.test(row.sourceUrl || '')) throw new Error('Нужна ссылка на конкретный лист Google Sheets.')
    for (const field of ['salaryCell', 'householdCell']) if (!/^[A-Z]{1,3}[1-9][0-9]*$/.test(row[field] || '')) throw new Error('Не указана ячейка источника.')
    const formula = value => typeof value === 'string' ? value : value?.formulaValue
    if (![row.salaryFormula, row.householdFormula].every(value => typeof formula(value) === 'string' && formula(value).startsWith('='))) throw new Error('Не указана формула источника.')
    return { ...row, branchId, salaryFormula: formula(row.salaryFormula), householdFormula: formula(row.householdFormula) }
  })
  return { year: dataset.year, currency: 'AZN', rows, warnings: Array.isArray(dataset.warnings) ? dataset.warnings.map(String) : [] }
}
export function buildBankReport(report, selectedIds, sourceDataset = null) {
  const months = reportMonths(report.period?.from, report.period?.toExclusive)
  const ids = [...new Set(selectedIds.map(String))]
  if (!months.length || !ids.length) return null
  const input = report.bankInputs || {}
  sourceDataset ||= input.sourceDataset || null
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
  const sourceAdjustments = []
  if (sourceDataset) {
    for (const branch of branchReports) {
      for (const row of branch.monthly) {
        const source = row.month.startsWith('2025-') ? sourceDataset.rows.find(item => item.branchId === branch.id && item.month === row.month) : null
        if (!source) continue
        const existingHousehold = branch.categories.filter(category => bankExpenseGroup(category) === 'household').reduce((sum, category) => sum + num(row.categories[category.key]), 0)
        const food = num(row.categories['supplier-food-cost'])
        const moved = source.household - existingHousehold
        if ((moved < -0.005 && sourceDataset.version !== 2) || food < moved - 0.005) {
          branch.reconciled = false
          branch.warnings.push(`${row.month}: ХозТовары Sheets нельзя безопасно выделить из имеющегося FoodCost; требуется сверка состава закупок.`)
          continue
        }
        const previousSalary = num(row.categories.salary)
        const salaryDelta = source.salary - previousSalary
        row.categories.salary = source.salary
        const previousFoodCost = food - moved
        const foodCostDelta = Object.hasOwn(source,'foodCost') ? source.foodCost - previousFoodCost : 0
        row.categories['supplier-food-cost'] = previousFoodCost + foodCostDelta
        row.categories['sheets-household'] = moved
        row.sheetSource = source
        row.expenses += salaryDelta + foodCostDelta
        row.net -= salaryDelta + foodCostDelta
        row.margin = row.revenue ? row.net / row.revenue * 100 : null
        sourceAdjustments.push({ branchId: branch.id, branchName: branch.name, month: row.month, previousSalary, salary: source.salary, salaryDelta, previousFoodCost, foodCost: row.categories['supplier-food-cost'], foodCostDelta, expenseDelta: salaryDelta + foodCostDelta, household: source.household, movedFromFood: moved, source })
      }
      const names = new Map(branch.categories.map(category => [category.key, category]))
      names.set('salary', { key: 'salary', name: 'Зарплаты' })
      if (!names.has('supplier-food-cost')) names.set('supplier-food-cost', { key: 'supplier-food-cost', name: 'FoodCost · закупки' })
      names.set('sheets-household', { key: 'sheets-household', name: 'ХозТовары · Google Sheets' })
      branch.categories = [...names.values()].filter(category => category.informational || branch.monthly.some(row => Object.hasOwn(row.categories, category.key))).map(category => category.informational ? category : { ...category, amount: branch.monthly.reduce((sum, row) => sum + num(row.categories[category.key]), 0) })
      branch.totals = branch.monthly.reduce((sum, row) => ({ revenue: sum.revenue + row.revenue, expenses: sum.expenses + row.expenses, net: sum.net + row.net }), { revenue: 0, expenses: 0, net: 0 })
      branch.totals.margin = branch.totals.revenue ? branch.totals.net / branch.totals.revenue * 100 : null
      branch.warnings = branch.warnings.filter(warning => !branch.monthly.some(row => row.sheetSource && warning.startsWith(`${row.month}: нет начислений salary_periods`)))
    }
  }
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
  const reconciled = branchReports.every(row => row.reconciled && groupBankExpenses(row).reconciled)
    && groupBankExpenses({ monthly: combinedMonths, categories: [...categoryMap.values()], totals }).reconciled
  const coverageBlockers = branchReports.flatMap(branch => {
    const missingPayroll = branch.monthly.filter(row => !row.salaryRows && !row.sheetSource).map(row => row.month)
    const missingHousehold = groupBankExpenses(branch).monthly.filter(row => !row.hasData.household).map(row => row.month)
    const missingSource = sourceDataset ? branch.monthly.filter(row => row.month.startsWith('2025-') && !row.sheetSource).map(row => row.month) : []
    return [
      ...(missingSource.length ? [`${branch.name}: в загруженном источнике Sheets нет применимых данных за ${missingSource.join(', ')}. Экспорт заблокирован; подстановка из другого года не допускается.`] : []),
      ...(missingPayroll.length ? [`${branch.name}: нет начислений зарплаты с привязкой к филиалу за ${missingPayroll.join(', ')}. Распределённые суммы менеджмента или оценка не заменяют отсутствующие начисления.`] : []),
      ...(missingHousehold.length ? [`${branch.name}: не выделены данные ХозТоваров за ${missingHousehold.join(', ')}. Они могут находиться внутри общей суммы закупок ФудКост; нулевой расход не подтверждён.`] : [])
    ]
  })
  if (input.sourceRequired2025 && !sourceDataset) coverageBlockers.push('Проверенный постоянный источник начислений2025 ещё не сохранён; банковский экспорт заблокирован.')
  const partialMonths = (input.partialPayrollMonths || []).filter(month => months.includes(month) && !(sourceDataset?.version === 2 && sourceDataset.complete && branchReports.every(branch => branch.monthly.find(row => row.month === month)?.sheetSource)))
  if (partialMonths.length) coverageBlockers.push(`Начисления за ${partialMonths.join(', ')} перенесены частично. Наличие отдельных строк не подтверждает полноту зарплатного листа; банковский экспорт заблокирован до сверки остальных строк.`)
  return { sourceDataset, sourceAdjustments, months, branches: branchReports, combined: { id: 'combined', name: 'Совокупно: ' + branchReports.map(row => row.name).join(' + '), monthly: combinedMonths, categories: [...categoryMap.values()], totals }, period: report.period, source: report.source, generatedAt: report.loadedAt, reconciled, coverageBlockers, exportable: reconciled && !coverageBlockers.length, payrollEstimated: input.payrollEstimated, selectedIds: ids }
}

// Presentation-only grouping. Original monthly categories and totals stay intact.
export const BANK_EXPENSE_GROUPS = [
  ['salary', 'Зарплаты'], ['rent', 'Аренда'], ['food', 'ФудКост'],
  ['household', 'ХозТовары'], ['dsmf-tax', 'DSMF+Налог'], ['taxi', 'Такси'], ['service', 'Сервис чардж'], ['utilities', 'Коммунальные'], ['other', 'Прочие']
]
export function bankExpenseGroup(category) {
  if (category.informational || category.key === 'tax-paid') return null
  if (category.key === 'salary') return 'salary'
  if (category.key === 'tax') return 'dsmf-tax'
  if (category.key === 'supplier-food-cost') return 'food'
  if (category.key === 'supplier-household') return 'household'
  const name = String(category.name || '').toLowerCase().replace(/ё/g, 'е')
  if (category.key === 'service-charge' || /service\s*charge|сервис.*чардж/.test(name)) return 'service'
  if (/коммун|элект|^свет$|^газ$|^вода$|utilities|electric|water|kommunal/.test(name)) return 'utilities'
  // Fees/partner costs never masquerade as payroll, food or taxes.
  if (/комисс|commission|service|сервис|wolt|partner|партнер/.test(name)) return 'other'
  if (/\bd[sm]{2}f\b|дсмф|дмсф|социальн.*взнос|social.*contribution|sosial.*sığorta/.test(name)) return 'dsmf-tax'
  if (/аренд|\brent\b|icar[əe]|arenda/.test(name)) return 'rent'
  if (/такси|\btaxi\b|\bbolt\b|болт/.test(name)) return 'taxi'
  if (/хоз|хим|перчат|тряп|губк|моющ|уборк|cleaning|household/.test(name)) return 'household'
  if (/фудкост|food\s*cost|продукт|закуп|кухня|кофе|напит|списан|^бар$/.test(name)) return 'food'
  return 'other'
}
export function groupBankExpenses(section) {
  const groups = BANK_EXPENSE_GROUPS.map(([key, name]) => ({ key, name, amount: 0, sources: [] }))
  const byKey = new Map(groups.map(group => [group.key, group]))
  const monthly = section.monthly.map(row => ({ month: row.month, categories: Object.fromEntries(groups.map(group => [group.key, 0])), hasData: Object.fromEntries(groups.map(group => [group.key, false])) }))
  for (const category of section.categories) {
    const key = bankExpenseGroup(category)
    if (!key) continue
    const group = byKey.get(key)
    group.amount += num(category.amount)
    group.sources.push({ name: category.name, amount: num(category.amount) })
    section.monthly.forEach((row, index) => {
      monthly[index].categories[key] += num(row.categories[category.key])
      if (Object.prototype.hasOwnProperty.call(row.categories, category.key)) monthly[index].hasData[key] = true
    })
  }
  const reconciled = Math.abs(groups.reduce((sum, group) => sum + group.amount, 0) - section.totals.expenses) < 0.01
    && monthly.every((row, index) => Math.abs(Object.values(row.categories).reduce((sum, value) => sum + value, 0) - section.monthly[index].expenses) < 0.01)
  return { groups, monthly, reconciled }
}
