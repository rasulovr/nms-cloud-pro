import {isMonth, nextMonth} from './profitability-range.mjs'

export function reportMonths(from, toExclusive) {
  let month = String(from).slice(0, 7)
  const end = String(toExclusive).slice(0, 7), months = []
  if (!isMonth(month) || !isMonth(end) || month >= end) throw Error('Invalid reporting period')
  while (month < end) {
    if (months.length >= 1200) throw Error('Reporting period too large')
    months.push(month)
    month = nextMonth(month).slice(0, 7)
  }
  return months
}
const knownAmount = value => value != null && String(value).trim() !== '' && Number.isFinite(Number(value)) && Number(value) >= 0

// Presence is not completeness. A period-level review must additionally attest
// the roster and components; never infer identities from names or sheet rows.
export function profitabilityAccrualIssues(input, from, toExclusive, serviceBranches = new Set()) {
  const issues = [], employees = new Set(input.employeeRows.map(row => String(row.id)))
  const fail = (month, reason, branchId) => issues.push({month, reason, ...(branchId ? {branchId} : {}), severity:'blocking_runtime_basis'})
  const seen = new Set()
  for (const row of input.salaryPeriods) {
    const month = String(row.salary_month || '').slice(0, 7), key = `${month}:${row.employee_id}`
    if (!row.employee_id || !employees.has(String(row.employee_id))) fail(month, 'unresolved-payroll-identity')
    if (seen.has(key)) fail(month, 'duplicate-payroll-accrual')
    seen.add(key)
    if (!knownAmount(row.salary_gross)) fail(month, 'invalid-payroll-accrual')
  }
  const serviceSeen = new Set()
  for (const row of input.serviceRows) {
    const month = String(row.month || '').slice(0, 7), key = `${month}:${row.branch_id}`
    if (serviceSeen.has(key)) fail(month, 'duplicate-service-accrual', String(row.branch_id))
    serviceSeen.add(key)
    if (!knownAmount(row.staff_cost_amount)) fail(month, 'invalid-service-accrual', String(row.branch_id))
  }
  for (const month of reportMonths(from, toExclusive)) {
    if (!input.salaryPeriods.some(row => String(row.salary_month).slice(0, 7) === month)) fail(month, 'missing-payroll-accruals')
    const active = new Set(input.revenueRows.filter(row => String(row.revenue_date).slice(0, 7) === month).map(row => String(row.branch_id)))
    for (const branch of serviceBranches) if (active.has(branch) && !serviceSeen.has(`${month}:${branch}`)) fail(month, 'missing-service-accrual', branch)
  }
  return issues
}
export async function accrualInputsFingerprint(input, month) {
  if (!Array.isArray(input.salaryPeriods) || !Array.isArray(input.serviceRows)) return null
  const select = (rows, date, fields) => rows.filter(row => String(row[date]).slice(0, 7) === month)
    .map(row => fields.map(key => row[key] ?? null)).sort((a,b) => JSON.stringify(a).localeCompare(JSON.stringify(b)))
  const value = {
    payroll:select(input.salaryPeriods,'salary_month',['id','employee_id','branch_id','salary_month','salary_gross']),
    service:select(input.serviceRows,'month',['branch_id','month','staff_cost_amount']),
    // Current classification still follows the established allocation policy;
    // changes must invalidate review rather than silently restate a closed month.
    employees:(input.employeeRows || []).filter(employee=>input.salaryPeriods.some(row=>String(row.salary_month).slice(0,7)===month && String(row.employee_id)===String(employee.id)))
      .map(row=>[row.id,row.branch_id ?? null,row.position ?? null]).sort((a,b)=>String(a[0]).localeCompare(String(b[0])))
  }
  const digest = await globalThis.crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(value)))
  return [...new Uint8Array(digest)].map(byte=>byte.toString(16).padStart(2,'0')).join('')
}
export function futureCoverageIssues(manifest, input, month) {
  const branches = new Set([
    ...input.revenueRows.filter(row=>String(row.revenue_date).slice(0,7)===month).map(row=>String(row.branch_id)),
    ...input.dailyExpenseRows.filter(row=>String(row.expense_date).slice(0,7)===month).map(row=>String(row.branch_id)),
    ...(input.salaryPeriods || []).filter(row=>String(row.salary_month).slice(0,7)===month && row.branch_id).map(row=>String(row.branch_id))
  ])
  const issues = []
  for (const branchId of branches) for (const category of ['payroll','dsmf','partner_fee','other']) {
    const checks = (Array.isArray(manifest.reviewChecks) ? manifest.reviewChecks : []).filter(row=>row.branchId===branchId && row.category===category)
    if (checks.length!==1 || checks[0].status!=='verified' || !checks[0].approvalRef || !checks[0].sourceRef) issues.push({month,branchId,reason:`unreviewed-${category}-coverage`,severity:'blocking_runtime_basis'})
  }
  return issues
}
