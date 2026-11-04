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
export function futureCoverageIssues(manifest, input, month, records = []) {
  const branches = new Set([
    ...input.revenueRows.filter(row=>String(row.revenue_date).slice(0,7)===month).map(row=>String(row.branch_id)),
    ...input.dailyExpenseRows.filter(row=>String(row.expense_date).slice(0,7)===month).map(row=>String(row.branch_id)),
    ...(input.salaryPeriods || []).filter(row=>String(row.salary_month).slice(0,7)===month && row.branch_id).map(row=>String(row.branch_id))
  ])
  const issues = expectedCoverageIssues(manifest,input,month,records)
  for (const branch of Array.isArray(manifest.expectedCoverage?.branches) ? manifest.expectedCoverage.branches : []) if (typeof branch?.id === 'string') branches.add(branch.id)
  for (const branchId of branches) for (const category of ['payroll','dsmf','partner_fee','other']) {
    const checks = (Array.isArray(manifest.reviewChecks) ? manifest.reviewChecks : []).filter(row=>row?.branchId===branchId && row.category===category)
    if (checks.length!==1 || checks[0].status!=='verified' || !checks[0].approvalRef || !checks[0].sourceRef) issues.push({month,branchId,reason:`unreviewed-${category}-coverage`,severity:'blocking_runtime_basis'})
  }
  return issues
}

// This registry is prepared from independent source evidence, never generated
// from the currently loaded rows by runtime code. It pins identity AND amounts.
export function expectedCoverageIssues(manifest, input, month, records = []) {
  const issues = [], proof = manifest.expectedCoverage
  const fail = reason => issues.push({month,reason,severity:'blocking_runtime_basis'})
  const text = value => typeof value === 'string' && value.trim().length > 0
  const unique = values => new Set(values).size === values.length
  const equal = (a,b) => JSON.stringify(a) === JSON.stringify(b)
  const sorted = values => [...values].sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)))
  if (!proof) { fail('missing-expected-source-registry'); return issues }
  if (proof.version!==1 || proof.month!==month || proof.status!=='verified' || !text(proof.approvalRef) || !text(proof.source?.fileId) || !text(proof.source?.readAt) || !Array.isArray(proof.source.cells) || !proof.source.cells.length || !proof.source.cells.every(text) || !['branches','payroll','service','components'].every(key=>Array.isArray(proof[key]))) {
    fail('invalid-expected-source-registry'); return issues
  }
  for (const key of ['branches','payroll','service','components']) {
    if (proof[key].some(row=>!row || !text(row.sourceKey)) || !unique(proof[key].map(row=>row?.sourceKey))) { fail('ambiguous-expected-source-identities'); return issues }
  }
  const branchIds=proof.branches.map(row=>row.id)
  if (!branchIds.every(text) || !unique(branchIds) || !Array.isArray(input.branchRows) || !equal(sorted(branchIds),sorted(input.branchRows.map(row=>String(row.id))))) fail('expected-branch-catalog-mismatch')
  const inMonth=(rows,date)=>rows.filter(row=>String(row[date]).slice(0,7)===month)
  for (const branch of proof.branches) {
    for (const [field,rows,date] of [['revenueIds',input.revenueRows,'revenue_date'],['expenseIds',input.dailyExpenseRows,'expense_date']]) {
      const expected=branch[field],actual=inMonth(rows,date).filter(row=>String(row.branch_id)===branch.id).map(row=>String(row.id))
      if (!Array.isArray(expected) || !expected.every(text) || !unique(expected) || !equal(sorted(expected),sorted(actual))) fail(`expected-branch-${field==='revenueIds'?'revenue':'expense'}-coverage-mismatch`)
    }
  }
  const actualPayroll=inMonth(input.salaryPeriods || [],'salary_month')
  const employees=new Map((input.employeeRows || []).map(row=>[String(row.id),row]))
  const payrollFields=['id','employee_id','branch_id','salary_month','salary_gross','employeeBranchId','employeePosition']
  const validPayroll=row=>payrollFields.every(key=>Object.hasOwn(row,key)) && text(row.id) && text(row.employee_id) && (row.branch_id===null || branchIds.includes(row.branch_id)) && row.salary_month===month+'-01' && typeof row.salary_gross==='number' && knownAmount(row.salary_gross)
  const payrollValues=row=>[row.id,row.employee_id,row.branch_id??null,row.salary_month,Number(row.salary_gross),row.employeeBranchId??null,row.employeePosition??null]
  const actualValues=actualPayroll.map(row=>payrollValues({...row,employeeBranchId:employees.get(String(row.employee_id))?.branch_id,employeePosition:employees.get(String(row.employee_id))?.position}))
  if (!proof.payroll.every(validPayroll) || !unique(proof.payroll.map(row=>row.id)) || !unique(proof.payroll.map(row=>row.employee_id)) || !equal(sorted(proof.payroll.map(payrollValues)),sorted(actualValues))) fail('expected-payroll-coverage-mismatch')
  const serviceValues=row=>[row.branch_id,row.month,Number(row.staff_cost_amount)]
  const validService=row=>branchIds.includes(row.branch_id) && row.month===month+'-01' && typeof row.staff_cost_amount==='number' && knownAmount(row.staff_cost_amount)
  if (!proof.service.every(validService) || !unique(proof.service.map(row=>row.branch_id)) || !equal(sorted(proof.service.map(serviceValues)),sorted(inMonth(input.serviceRows || [],'month').map(serviceValues)))) fail('expected-service-accrual-coverage-mismatch')
  const componentValues=row=>[row.scope,row.componentKey,row.action,row.category,row.branchId??null,row.amount??null]
  const actualComponents=records.filter(record=>record.snapshot_data?.kind==='component_adjustment' && record.snapshot_data.month===month).map(record=>componentValues({...record.snapshot_data,scope:record.snapshot_scope}))
  const componentFields=['scope','componentKey','action','category','branchId','amount']
  if (proof.components.some(row=>!Array.isArray(manifest.expectedScopes) || !manifest.expectedScopes.includes(row.scope))) fail('missing-required-registry-component')
  if (!proof.components.every(row=>componentFields.every(key=>Object.hasOwn(row,key)) && text(row.scope) && text(row.componentKey) && text(row.action) && text(row.category) && (row.amount===null || (typeof row.amount==='number' && knownAmount(row.amount)))) || !unique(proof.components.map(row=>row.scope)) || !equal(sorted(proof.components.map(componentValues)),sorted(actualComponents))) fail('expected-component-accrual-coverage-mismatch')
  return issues
}
