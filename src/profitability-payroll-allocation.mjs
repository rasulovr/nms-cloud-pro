// Same classification and fallback as the deployed profitability allocator.
export function profitabilityManagerPosition(position) {
  const p = String(position || '').trim().toLowerCase()
  return ['менедж','управ','директор','админ','закуп','smm','шеф-бар','шеф бар','brand','manager','director','admin'].some(token=>p.includes(token))
}
export function resolveProfitabilityPayrollAllocation(period, employee = {}) {
  const month=String(period.salary_month || '').slice(0,7)
  const metadata=month>='2026-01' && month<='2026-09' && employee.is_active!==true ? {} : employee
  const branchId=String(period.branch_id || metadata.branch_id || '')
  return {branchId,manager:!branchId || profitabilityManagerPosition(metadata.position)}
}
