import {ordinaryCoverageFields} from '../src/profitability-ordinary-coverage.mjs'
// Synthetic test evidence only. Production must obtain this from independently
// reviewed source identities, never derive its expected roster from live data.
export function registryFixture(input,month) {
 const at=(rows,date)=>rows.filter(row=>String(row[date]).slice(0,7)===month)
 const ordinary={}
 for (const [kind,rows,date] of [['revenue',input.revenueRows,'revenue_date'],['expenses',input.dailyExpenseRows,'expense_date'],['purchases',input.supplierPurchaseRows || input.supplierPurchases,'purchase_date']]) ordinary[kind]=at(rows,date).map(row=>({sourceKey:'synthetic-'+kind+'-'+row.id,sourceCells:['synthetic-'+row.id],expectedRow:Object.fromEntries(ordinaryCoverageFields[kind].map(key=>[key,row[key]??null])),...(kind==='purchases'?{disposition:row.deleted_at==null?'active':'deleted',reason:'Synthetic independently approved deletion'}:{})}))
 return {...ordinary,version:2,month,status:'verified',approvalRef:'synthetic-review',source:{fileId:'synthetic-source',readAt:'2040-04-01',cells:['roster','branches','service']},
  components:[],
  centralPayroll:{sourceKey:'source-central-payroll',reason:'Synthetic approved central payroll',periodIds:at(input.salaryPeriods,'salary_month').filter(row=>row.branch_id==null).map(row=>row.id)},
  branches:input.branchRows.map((branch,i)=>({id:String(branch.id),status:at(input.revenueRows,'revenue_date').some(row=>String(row.branch_id)===String(branch.id))?'operating':at(input.dailyExpenseRows,'expense_date').some(row=>String(row.branch_id)===String(branch.id))?'expense_only':'excluded',reason:'Synthetic source disposition',sourceKey:`source-branch-${i}`,revenueIds:at(input.revenueRows,'revenue_date').filter(row=>String(row.branch_id)===String(branch.id)).map(row=>String(row.id)),expenseIds:at(input.dailyExpenseRows,'expense_date').filter(row=>String(row.branch_id)===String(branch.id)).map(row=>String(row.id))})),
  payroll:at(input.salaryPeriods,'salary_month').map((row,i)=>{const employee=input.employeeRows.find(e=>e.id===row.employee_id);return {sourceKey:`source-person-${i}`,id:row.id,employee_id:row.employee_id,branch_id:row.branch_id??null,salary_month:row.salary_month,salary_gross:Number(row.salary_gross),employeeBranchId:employee?.branch_id??null,employeePosition:employee?.position??null}}),
  service:at(input.serviceRows,'month').map((row,i)=>({...row,sourceKey:`source-service-${i}`,staff_cost_amount:Number(row.staff_cost_amount)}))}
}
