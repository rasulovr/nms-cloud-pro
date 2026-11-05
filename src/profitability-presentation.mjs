// Read-only presentation projection. Never promote a coverage check to verified,
// change financial inputs, or substitute zero for missing/non-finite amounts.
const finite = value => typeof value === 'number' && Number.isFinite(value)
export const isPreliminary = row => row.displayPreliminary === true || row.calculationMode === 'legacy-preliminary' || (row.coverageIssues || []).some(issue => issue.reason === 'legacy-period-allocation')
function project(row, {hasRevenue, hasExpenses, reconciled}) {
  const revenueAvailable = !row.operatingExcluded && (hasRevenue||row.calculationReady===true) && finite(row.revenue)
  const expensesAvailable = !row.operatingExcluded && (hasExpenses||row.calculationReady===true) && finite(row.expenses)
  const netAvailable = revenueAvailable && expensesAvailable && row.profitAvailable !== false && reconciled
  // The same arithmetic already used by the report. This is explicitly a result
  // of recorded components. Blocking coverage issues must remain blocked in UI/PDF.
  const calculatedNet = netAvailable ? row.revenue - row.expenses : null
  return {...row, verifiedNet: row.calculationReady ? null : row.net, net: calculatedNet,
    displayRevenueAvailable: revenueAvailable, displayExpensesAvailable: expensesAvailable,
    displayProfitAvailable: netAvailable,
    displayPreliminary: !row.operatingExcluded && (isPreliminary(row) || row.profitAvailable === false || row.expensesAvailable === false || !reconciled || row.revenueComplete === false)}
}
export function presentProfitabilitySection(section) {
  const monthly = section.monthly.map(row => project(row, {
    hasRevenue: row.revenueRecords > 0,
    hasExpenses: row.hasExpenseDetails || Object.keys(row.categories || {}).length > 0,
    reconciled: section.reconciled,
  }))
  const active = monthly.filter(row => !row.operatingExcluded)
  const period = project(section.period, {
    hasRevenue: active.some(row => row.displayRevenueAvailable),
    hasExpenses: active.some(row => row.displayExpensesAvailable),
    reconciled: section.reconciled,
  })
  period.displayPreliminary ||= active.some(isPreliminary) || active.some(row => !row.displayRevenueAvailable || !row.displayExpensesAvailable)
  return {...section, monthly, period}
}
