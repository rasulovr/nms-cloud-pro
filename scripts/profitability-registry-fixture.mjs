// Synthetic test evidence only. Production must obtain this from independently
// reviewed source identities, never derive its expected roster from live data.
export function registryFixture(input,month) {
 const at=(rows,date)=>rows.filter(row=>String(row[date]).slice(0,7)===month)
 return {version:1,month,status:'verified',approvalRef:'synthetic-review',source:{fileId:'synthetic-source',readAt:'2040-04-01',cells:['roster','branches','service']},
  components:[],
  branches:input.branchRows.map((branch,i)=>({id:String(branch.id),sourceKey:`source-branch-${i}`,revenueIds:at(input.revenueRows,'revenue_date').filter(row=>String(row.branch_id)===String(branch.id)).map(row=>String(row.id)),expenseIds:at(input.dailyExpenseRows,'expense_date').filter(row=>String(row.branch_id)===String(branch.id)).map(row=>String(row.id))})),
  payroll:at(input.salaryPeriods,'salary_month').map((row,i)=>{const employee=input.employeeRows.find(e=>e.id===row.employee_id);return {sourceKey:`source-person-${i}`,id:row.id,employee_id:row.employee_id,branch_id:row.branch_id??null,salary_month:row.salary_month,salary_gross:Number(row.salary_gross),employeeBranchId:employee?.branch_id??null,employeePosition:employee?.position??null}}),
  service:at(input.serviceRows,'month').map((row,i)=>({...row,sourceKey:`source-service-${i}`,staff_cost_amount:Number(row.staff_cost_amount)}))}
}
