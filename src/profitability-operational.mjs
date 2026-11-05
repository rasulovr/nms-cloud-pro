// October Dashboard accounting contract, evaluated separately for each month.
// Attestations describe verification; they do not change this calculation.
import {profitabilityManagerPosition} from './profitability-payroll-allocation.mjs'
import {reportMonths} from './profitability-source-completeness.mjs'
const amount=(value,label)=>{
  if(!['number','string'].includes(typeof value)||String(value).trim()===''||!Number.isFinite(Number(value)))throw Error(`Некорректная сумма: ${label}`)
  return Number(value)
}
export function buildOperationalProfitability(input,{period,branchIds=null,bankRate,taxSettings={},expenseName,excludeExpense,serviceCost}) {
  const rate=amount(bankRate,'ставка банковской комиссии')
  if(rate<0||rate>100)throw Error('Некорректная ставка банковской комиссии')
  for(const b of input.branchRows||[])for(const key of ['service_charge_percent','service_staff_cost_percent'])if(b[key]!=null)amount(b[key],key)
  const months=reportMonths(period.from,period.toExclusive),branches=input.branchRows||[]
  const employeeMap=new Map((input.employeeRows||[]).filter(e=>e.is_active===true).map(e=>[String(e.id),e]))
  const byId=new Map(branches.map(b=>[String(b.id),b])),monthly=[],warnings=[],disclosures=[]
  const select=(rows,key,month)=>(rows||[]).filter(r=>String(r[key]).slice(0,7)===month)
  for(const month of months){
    const revenue=select(input.revenueRows,'revenue_date',month),expenses=select(input.dailyExpenseRows,'expense_date',month),purchases=select(input.supplierPurchases,'purchase_date',month).filter(p=>p.deleted_at==null),payroll=select(input.salaryPeriods,'salary_month',month)
    const ids=new Set([...revenue,...expenses,...payroll].map(r=>String(r.branch_id||'')).filter(Boolean))
    for(const id of ids)if(!byId.has(id))throw Error(`Неизвестный филиал в расчёте ${month}`)
    const buckets=new Map([...byId].map(([id,b])=>[id,{id,name:b.name,month,revenue:0,grossRevenue:0,bankCommission:0,revenueRecords:0,categories:{},details:[],salary:0,serviceCost:0,tax:0,supplierFoodCost:0}]))
    const add=(b,key,name,value,date,id)=>{b.categories[key]=(b.categories[key]||0)+value;b.details.push({key,name,amount:value,date,id})}
    for(const r of revenue){
      const b=buckets.get(String(r.branch_id));if(!b)throw Error(`Неизвестный филиал выручки ${month}`)
      const cash=amount(r.cash_amount,'наличные'),bank=amount(r.bank_amount,'банк'),wolt=amount(r.wolt_amount,'Wolt')
      const fee=bank*rate/100;b.grossRevenue+=cash+bank+wolt;b.bankCommission+=fee;b.revenue+=cash+bank+wolt-fee;b.revenueRecords++
    }
    const network=[...buckets.values()].reduce((s,b)=>s+b.revenue,0)
    for(const r of expenses){const value=amount(r.amount,'расход');if(excludeExpense(r))continue;const b=buckets.get(String(r.branch_id));if(!b)throw Error(`Расход без базы филиала ${month}`);const name=expenseName(r)||'Прочее';add(b,'daily-'+name,name,value,r.expense_date,r.id)}
    const pool=purchases.reduce((s,p)=>s+amount(p.total_amount,'закупка'),0)
    let managerPool=0;const seen=new Set()
    for(const r of payroll){
      const value=amount(r.salary_gross,'начисленная зарплата');if(value<0)throw Error('Отрицательное начисление зарплаты')
      const key=String(r.employee_id);if(!key||key==='undefined'||seen.has(key))throw Error(`Неоднозначное начисление сотрудника ${month}`);seen.add(key)
      const employee=employeeMap.get(key)||{},id=String(r.branch_id||employee.branch_id||'')
      if(!id||profitabilityManagerPosition(employee.position))managerPool+=value
      else {const b=buckets.get(id);if(!b)throw Error(`Неизвестный филиал зарплаты ${month}`);b.salary+=value;add(b,'salary','Зарплаты',value,r.salary_month,r.id)}
    }
    if(!payroll.length&&revenue.length)warnings.push({month,reason:'missing-recorded-payroll',severity:'preliminary'})
    if(!(network>0)&&(pool!==0||managerPool!==0))throw Error(`Нет выручки для распределения закупок или зарплаты менеджмента за ${month}`)
    for(const b of buckets.values()){
      const share=network>0?b.revenue/network:0
      b.supplierFoodCost=pool*share;add(b,'supplier-food-cost','Поставщики / Food Cost',b.supplierFoodCost,month+'-01','purchases-'+month+'-'+b.id)
      b.salary+=managerPool*share;add(b,'salary','Зарплаты',managerPool*share,month+'-01','managers-'+month+'-'+b.id)
      const rows=revenue.filter(r=>String(r.branch_id)===b.id)
      b.serviceCost=amount(serviceCost(rows,branches),'service charge');add(b,'service-charge','Service charge персоналу',b.serviceCost,month+'-01','service-'+month+'-'+b.id)
      const configured=taxSettings[b.id]==null?0:amount(taxSettings[b.id],'ставка налога')
      if(configured<0||configured>100)throw Error('Некорректная ставка налога')
      b.tax=b.grossRevenue*(configured>0?configured:8)/100;add(b,'tax','Налог с оборота',b.tax,month+'-01','tax-'+month+'-'+b.id)
      b.expenses=Object.values(b.categories).reduce((s,v)=>s+v,0);b.net=b.revenue-b.expenses
      // The old Dashboard excluded non-operating (no positive revenue) branches.
      // Keep their actual costs visible separately; do not silently reallocate them.
      b.operatingExcluded=b.revenue<=0 && (b.expenses!==0||b.revenueRecords===0)
      if(b.operatingExcluded&&b.expenses!==0)disclosures.push({month,branchId:b.id,name:b.name,expenses:b.expenses})
      Object.assign(b,{calculationReady:true,profitAvailable:!b.operatingExcluded,expensesAvailable:!b.operatingExcluded,hasExpenseDetails:true,revenueComplete:true,coverageIssues:[],disclosedExpenses:b.operatingExcluded?b.expenses:0})
      monthly.push(b)
    }
  }
  const selected=branchIds==null?null:new Set(branchIds.map(String))
  const selectedIds=[...byId.keys()].filter(id=>(!selected||selected.has(id))&&monthly.some(r=>r.id===id&&(r.revenueRecords||r.expenses)))
  const sum=(rows)=>{const operating=rows.filter(r=>!r.operatingExcluded),revenue=operating.reduce((s,r)=>s+r.revenue,0),expenses=operating.reduce((s,r)=>s+r.expenses,0);return {revenue,expenses,net:revenue-expenses,profitAvailable:operating.length>0,expensesAvailable:operating.length>0,calculationReady:true,disclosedExpenses:rows.filter(r=>r.operatingExcluded).reduce((s,r)=>s+r.expenses,0),hasClosedPeriods:rows.some(r=>r.operatingExcluded&&r.expenses!==0)}}
  const resultBranches=selectedIds.map(id=>{const rows=monthly.filter(r=>r.id===id),categories=new Map();for(const r of rows)for(const d of r.details){const c=categories.get(d.key)||{key:d.key,name:d.name,amount:0,details:[]};c.amount+=d.amount;c.details.push(d);categories.set(d.key,c)}return {id,name:byId.get(id).name,period:sum(rows),monthly:rows,categories:[...categories.values()],reconciled:true,issues:[]}})
  const resultMonths=months.map(month=>{const rows=monthly.filter(r=>r.month===month&&selectedIds.includes(r.id));return {...sum(rows),month,revenueRecords:rows.reduce((s,r)=>s+r.revenueRecords,0),hasExpenseDetails:true,revenueComplete:true,coverageIssues:[],closedPeriods:disclosures.filter(d=>d.month===month&&selectedIds.includes(d.branchId))}})
  const model={branches:resultBranches,total:sum(monthly.filter(r=>selectedIds.includes(r.id))),monthly:resultMonths,months,reconciled:true,mixedBasis:false,mixedBasisBlocksTotals:false,sourceChecks:[],calculationMode:'october-dashboard',disclosures:disclosures.filter(d=>selectedIds.includes(d.branchId))}
  return {model,warnings,bankRate:rate,period}
}
export function operationalSummary(report){
  const model=report.operational.model
  const issues=[...(report.summaryInputs?.coverageIssues||[]),...(report.operational.warnings||[])]
  const attach=(r,branchId)=>({...r,coverageIssues:issues.filter(i=>(!r.month||!i.month||i.month===r.month)&&(!branchId||!i.branchId||String(i.branchId)===String(branchId))).map(i=>({...i,severity:'preliminary'}))})
  return {...model,total:attach(model.total),monthly:model.monthly.map(r=>attach(r)),branches:model.branches.map(b=>({...b,period:attach(b.period,b.id),monthly:b.monthly.map(r=>attach(r,b.id))}))}
}
