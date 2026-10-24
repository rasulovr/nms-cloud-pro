// Pure allocation primitives. Caller supplies independently verified bank basis and
// source component identity; no supplier/category guesses and no database writes.
const monthOf=value=>/^\d{4}-(0[1-9]|1[0-2])(?:-|$)/.test(String(value||''))?String(value).slice(0,7):null
const numeric=value=>typeof value==='number'&&Number.isFinite(value)
export function buildMonthlyAllocationBasis(revenueRows,resolveBankBasis){
 const months=new Map(),issues=[]
 for(const row of revenueRows){
  const month=monthOf(row.revenue_date),id=String(row.branch_id||'')
  if(!month||!id){issues.push({type:'invalid-revenue-identity',id:row.id});continue}
  let bucket=months.get(month);if(!bucket){bucket={month,branches:new Map(),complete:true};months.set(month,bucket)}
  let branch=bucket.branches.get(id);if(!branch){branch={branchId:id,records:0,grossRevenue:0,allocationRevenue:0,bankCommission:0,sourceIds:[]};bucket.branches.set(id,branch)}
  const readNumber=value=>value==null||String(value).trim()===''?NaN:Number(value)
  const cash=readNumber(row.cash_amount),wolt=readNumber(row.wolt_amount),bank=resolveBankBasis(row)
  branch.records++;branch.sourceIds.push(row.id)
  if(!numeric(cash)||!numeric(wolt)||!bank||!numeric(bank.grossBank)||!numeric(bank.netBank)||bank.verified!==true){bucket.complete=false;issues.push({type:'unverified-bank-basis',month,branchId:id,id:row.id});continue}
  branch.grossRevenue+=cash+bank.grossBank+wolt
  branch.allocationRevenue+=cash+bank.netBank+wolt
  branch.bankCommission+=bank.grossBank-bank.netBank
 }
 for(const bucket of months.values()){
  bucket.networkAllocationRevenue=[...bucket.branches.values()].reduce((s,r)=>s+r.allocationRevenue,0)
  bucket.shares=new Map([...bucket.branches].map(([id,r])=>[id,bucket.complete&&bucket.networkAllocationRevenue>0?r.allocationRevenue/bucket.networkAllocationRevenue:null]))
 }
 return {months,issues}
}
export function allocateMonthlyComponents(components,basis){
 const allocations=[],held=[],seen=new Set()
 for(const component of components){
  const month=monthOf(component.date),identity=component.sourceKey||component.id
  if(!identity||seen.has(identity)){held.push({...component,reason:!identity?'missing-source-identity':'duplicate-source-identity'});continue}seen.add(identity)
  if(!month||!numeric(component.amount)||!component.category){held.push({...component,reason:'invalid-component'});continue}
  if(component.scope==='branch'&&component.branchId){allocations.push({...component,month,amount:component.amount});continue}
  const bucket=basis.months.get(month)
  if(component.scope!=='network'||!bucket?.complete||!(bucket.networkAllocationRevenue>0)){held.push({...component,month,reason:'incomplete-monthly-allocation-basis'});continue}
  for(const [branchId,share]of bucket.shares){allocations.push({...component,month,branchId,amount:component.amount*share,allocationShare:share,allocationBasis:'monthly-cash-plus-net-bank-plus-gross-wolt',networkBasis:bucket.networkAllocationRevenue})}
 }
 return {allocations,held}
}
