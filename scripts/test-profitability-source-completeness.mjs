import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import {reportMonths, profitabilityAccrualIssues, accrualInputsFingerprint} from '../src/profitability-source-completeness.mjs'
import {COMPONENT_SNAPSHOT_TYPE, componentInputsFingerprint, resolveCoverageManifests, resolveComponentRecords, resolveBankEvidence, bankInputsFingerprintV4} from '../src/profitability-reviewed-components.mjs'
import {buildReviewedAdjustments} from '../src/profitability-adjustments.mjs'

assert.deepEqual(reportMonths('2026-12-01','2027-03-01'),['2026-12','2027-01','2027-02'])
const inputFor = month => ({revenueRows:['a','b'].map((branch_id,i)=>({id:`r${i}`,branch_id,revenue_date:month+'-01',cash_amount:100,bank_amount:100,wolt_amount:0})),dailyExpenseRows:[],supplierPurchases:[],employeeRows:[{id:'e',is_active:false}],salaryPeriods:[{id:'s',employee_id:'e',branch_id:'a',salary_month:month+'-01',salary_gross:0,salary_net:500}],serviceRows:[{branch_id:'b',month:month+'-01',staff_cost_amount:0}]})
for (const month of ['2026-10','2026-12','2027-01','2028-02']) {
 const input=inputFor(month), end=reportMonths(month+'-01',month==='2028-02'?'2028-03-01':month==='2027-01'?'2027-02-01':month==='2026-12'?'2027-01-01':'2026-11-01')
 const to=month==='2028-02'?'2028-03-01':month==='2027-01'?'2027-02-01':month==='2026-12'?'2027-01-01':'2026-11-01'
 assert.equal(end.length,1)
 assert.equal(profitabilityAccrualIssues(input,month+'-01',to,new Set(['b'])).length,0,'zero is observed, inactive employee resolved by ID')
 const missing=await resolveCoverageManifests([],input,month+'-01',to)
 assert.equal(missing[0].reason,'missing-coverage-manifest')
 const manifest={snapshot_type:COMPONENT_SNAPSHOT_TYPE,snapshot_scope:`profitability-components:${month}:coverage`,snapshot_data:{kind:'coverage_manifest',version:2,month,status:'verified',approvalRef:'test',inputsFingerprint:await componentInputsFingerprint(input,month),accrualInputsFingerprint:await accrualInputsFingerprint(input,month),expectedScopes:[],holds:[],reviewChecks:['a','b'].flatMap(branchId=>['payroll','dsmf','partner_fee','other'].map(category=>({branchId,category,status:'verified',approvalRef:'review',sourceRef:'source'})))}}
 assert.deepEqual(await resolveCoverageManifests([manifest],input,month+'-01',to),[])
 const changed={...input,salaryPeriods:[{...input.salaryPeriods[0],salary_gross:20}]}
 assert.ok((await resolveCoverageManifests([manifest],changed,month+'-01',to)).some(i=>i.reason==='stale-or-missing-accrual-coverage'))
 const noCheck=structuredClone(manifest);noCheck.snapshot_data.reviewChecks.pop()
 assert.ok((await resolveCoverageManifests([noCheck],input,month+'-01',to)).some(i=>i.reason==='unreviewed-other-coverage'))
 const record=category=>({id:category,snapshot_type:COMPONENT_SNAPSHOT_TYPE,snapshot_scope:`profitability-components:${month}:${category}`,snapshot_data:{kind:'component_adjustment',version:2,month,componentKey:category,status:'verified',approvalRef:'review',source:{fileId:'sheet',gid:1,cells:[category],readAt:'now',recomputedAmount:25},target:{inputsFingerprint:manifest.snapshot_data.inputsFingerprint,representationIds:[],excludedIds:[],expectedRows:[]},action:'add_missing_branch',category,scope:'branch',branchId:'a',amount:25}})
 const records=['dsmf','partner_fee'].map(record), reviewed=await resolveComponentRecords(records,input)
 assert.equal(reviewed.validated.length,2)
 const applied=buildReviewedAdjustments(reviewed.validated,input)
 assert.equal(applied.dailyExpenseRows.reduce((sum,r)=>sum+r.amount,0),50)
 assert.equal(input.dailyExpenseRows.length,0,'no operational writes')
 const duplicate=await resolveComponentRecords([...records,records[0]],input)
 assert.equal(duplicate.validated.length,1,'repeated import is held, not double counted')
 const stale=await resolveComponentRecords(records,{...input,dailyExpenseRows:[{id:'manual',expense_date:month+'-02',amount:25}]})
 assert.equal(stale.validated.length,0,'manual additions invalidate missing-component proof')
}
const input=inputFor('2026-10')
const reasons=data=>profitabilityAccrualIssues(data,'2026-10-01','2026-12-01',new Set(['b'])).map(i=>i.reason)
assert.ok(reasons(input).includes('missing-payroll-accruals'),'missing second month cannot inherit first month payroll')
assert.ok(reasons({...input,salaryPeriods:[...input.salaryPeriods,...input.salaryPeriods]}).includes('duplicate-payroll-accrual'))
assert.ok(reasons({...input,employeeRows:[]}).includes('unresolved-payroll-identity'))
for (const salary_gross of [null,undefined,'',NaN,-1]) assert.ok(reasons({...input,salaryPeriods:[{...input.salaryPeriods[0],salary_gross}]}).includes('invalid-payroll-accrual'))
assert.ok(reasons({...input,serviceRows:[]}).includes('missing-service-accrual'))
const fingerprint=await bankInputsFingerprintV4(input,'2026-10')
assert.equal(await bankInputsFingerprintV4({...input,supplierPurchases:[{id:'new',purchase_date:'2026-10-01',total_amount:300}]},'2026-10'),fingerprint,'unrelated goods do not invalidate bank evidence v4')
assert.notEqual(await bankInputsFingerprintV4({...input,dailyExpenseRows:[{id:'fee',expense_date:'2026-10-01',amount:2}]},'2026-10'),fingerprint,'possible fee overlap still invalidates evidence')
const bank={snapshot_type:COMPONENT_SNAPSHOT_TYPE,snapshot_scope:'profitability-components:2026-10:bank-basis',snapshot_data:{kind:'bank_basis_evidence',version:4,month:'2026-10',status:'verified',approvalRef:'review',expectedBankCommissionRate:2,inputsFingerprint:fingerprint,entries:input.revenueRows.map(row=>({id:row.id,expectedRow:row,basis:'gross',commissionPolicy:'apply_configured_rate',collisionIds:[],sourceUrl:'source'}))}}
assert.equal((await resolveBankEvidence([bank],input,2)).byId.size,2)
assert.equal((await resolveBankEvidence([bank],{...input,revenueRows:[{...input.revenueRows[0],bank_amount:101},input.revenueRows[1]]},2)).byId.size,0)

// Execute the actual report's complete source-loading path with a paginated API.
const source=fs.readFileSync('src/main.parts/part-04.jsxpart','utf8')
const start=source.indexOf('      const fetchPaged = async',source.indexOf('  async function loadRmsProfitabilityReport()'))
const end=source.indexOf('      const [taxSettings',start), code=source.slice(start,end)
const tables=['daily_revenue_entries','daily_expenses','supplier_purchases','employees','salary_periods','monthly_branch_service_charge_cost']
async function load(fault) {
 class Query {
  constructor(table){this.table=table;this.lo=0;this.hi=0;this.orders=[]}
  select(){return this} is(){return this} order(key){this.orders.push(key);return this} range(lo,hi){this.lo=lo;this.hi=hi;return this}
  then(resolve,reject){
   if(fault?.table===this.table && this.lo===1000) return Promise.resolve(fault.response).then(resolve,reject)
   const data=Array.from({length:Math.max(0,Math.min(2107,this.hi+1)-this.lo)},(_,i)=>({id:this.lo+i,branch_id:'b'}))
   assert.ok(this.orders.length)
   return Promise.resolve({data,error:null}).then(resolve,reject)
  }
 }
 const context={supabase:{from:table=>new Query(table)},pageSize:1000,applyDateRange:q=>q,branches:[{id:'b',service_charge_enabled:true}]}
 return vm.runInNewContext(`(async()=>{${code};return [revenueRows,rawDailyExpenseRows,rawSupplierPurchases,employeeRows,salaryPeriods,serviceRows].map(rows=>rows.length)})()`,context)
}
assert.deepEqual(Array.from(await load()),tables.map(()=>2107))
for(const table of tables) {
 await assert.rejects(load({table,response:{data:null,error:new Error('read failed')}}),/read failed/)
 await assert.rejects(load({table,response:{data:null,error:null}}),/Неполный ответ/)
}
assert.ok(!source.slice(start,source.indexOf('      const serviceByBranch',start)).includes('salary-estimate-'))
console.log('PASS profitability completeness: future years, DSMF/Partner Fee, repeated/manual evidence, payroll identity/zero/missing/stale, bank v4 dependencies, six paginated reads and read failures')
