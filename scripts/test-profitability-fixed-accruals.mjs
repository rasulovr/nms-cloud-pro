import assert from 'node:assert/strict'
import {componentInputsFingerprint,fixedBranchInputsFingerprint,resolveComponentRecords,resolveCoverageManifests,COMPONENT_SNAPSHOT_TYPE} from '../src/profitability-reviewed-components.mjs'
import {buildReviewedAdjustments} from '../src/profitability-adjustments.mjs'
const month='2026-10'
const input={revenueRows:[],dailyExpenseRows:[{id:'expense',branch_id:'branch',expense_date:month+'-03',amount:12,category_id:null,custom_category:'Taxi',expense_categories:null}],supplierPurchases:[]}
for(const category of ['dsmf','partner_fee']){
const source={version:3,kind:'component_adjustment',month,componentKey:'fixed-accrual',scope:'branch',branchId:'branch',action:'add_missing_branch',category,amount:100,status:'verified',approvalRef:'original-approval',revalidation:{approvalRef:'repair-approval',verifiedAt:'2026-11-07'},source:{fileId:'source',gid:1,cells:['A1'],readAt:'2026-11-07',recomputedAmount:100},target:{fingerprintContract:'fixed-branch-expenses-v1',representationIds:[],excludedIds:[],expectedRows:[]}}
source.target.inputsFingerprint=await fixedBranchInputsFingerprint(input,source)
const record={id:'evidence',snapshot_type:COMPONENT_SNAPSHOT_TYPE,snapshot_scope:`profitability-components:${month}:fixed-accrual`,snapshot_data:source}
const resolves=async (r=record,i=input)=>(await resolveComponentRecords([r],i)).validated.length
assert.equal(await resolves(),1)
for(const change of [i=>i.supplierPurchases.push({id:'new',purchase_date:month+'-26',total_amount:360}),i=>i.revenueRows.push({id:'sale',revenue_date:month+'-25',cash_amount:250}),i=>i.dailyExpenseRows.push({id:'future',expense_date:'2026-11-01',amount:20})]){
 const next=structuredClone(input);change(next);assert.equal(await resolves(record,next),1)
 const result=await resolveComponentRecords([record],next);assert.equal(buildReviewedAdjustments(result.validated,next).dailyExpenseRows.filter(r=>r.reviewedCategory===category).reduce((s,r)=>s+r.amount,0),100)
}
for(const change of [i=>i.dailyExpenseRows[0].amount++,i=>i.dailyExpenseRows[0].custom_category=category,i=>i.dailyExpenseRows.push({id:'duplicate-expense',expense_date:month+'-01',amount:100,custom_category:category}),i=>i.dailyExpenseRows=[]]){const next=structuredClone(input);change(next);assert.equal(await resolves(record,next),0)}
for(const change of [s=>s.amount++,s=>s.source.cells=['B2'],s=>s.source.recomputedAmount++,s=>s.source.formulas=['=changed'],s=>s.branchId='other',s=>s.category='rent',s=>delete s.revalidation,s=>delete s.target.fingerprintContract,s=>s.status='held']){const next=structuredClone(record);change(next.snapshot_data);assert.equal(await resolves(next),0)}
assert.equal((await resolveComponentRecords([record,structuredClone(record)],input)).validated.length,0)
const incomplete=structuredClone(input);delete incomplete.dailyExpenseRows;assert.equal(await resolves(record,incomplete),0)
const legacy=structuredClone(record);legacy.snapshot_data.version=2;legacy.snapshot_data.target.inputsFingerprint=await componentInputsFingerprint(input,month);assert.equal(await resolves(legacy),1)
const changed=structuredClone(input);changed.supplierPurchases.push({id:'new',purchase_date:month+'-01',total_amount:1});assert.equal(await resolves(legacy,changed),0)

// A migration must update the existing record, not count both contracts.
legacy.id='legacy-evidence'
for(const records of [[record,legacy],[legacy,record]]){
 const result=await resolveComponentRecords(records,input)
 assert.equal(result.validated.length,0)
 assert.ok(result.held.some(row=>row.reason==='duplicate-snapshot-scope'))
}
// Renaming the scope must not bypass the existing source-cell collision guard.
for(const version of [2,3]){
 const duplicate=structuredClone(version===2?legacy:record)
 duplicate.id='renamed-evidence';duplicate.snapshot_data.componentKey='renamed-accrual'
 duplicate.snapshot_scope=`profitability-components:${month}:renamed-accrual`
 const result=await resolveComponentRecords([record,duplicate],input)
 assert.equal(result.validated.length,2)
 const adjusted=buildReviewedAdjustments(result.validated,input)
 assert.equal(adjusted.held.length,2)
 assert.ok(adjusted.held.every(row=>row.reason==='conflicting-component-claims'))
 assert.deepEqual(adjusted.dailyExpenseRows,input.dailyExpenseRows)
}

// Isolate kind/version dispatch from the post-September coverage registry.
// All data here is synthetic; the full loader tests cover the larger registry.
const coverageMonth='2026-09'
const coverageInput={revenueRows:[],dailyExpenseRows:[],supplierPurchases:[]}
const coverageRecord=structuredClone(record)
coverageRecord.snapshot_data.month=coverageMonth
coverageRecord.snapshot_scope=`profitability-components:${coverageMonth}:fixed-accrual`
coverageRecord.snapshot_data.target.inputsFingerprint=await fixedBranchInputsFingerprint(coverageInput,coverageRecord.snapshot_data)
const manifest={id:'coverage-evidence',snapshot_type:COMPONENT_SNAPSHOT_TYPE,snapshot_scope:`profitability-components:${coverageMonth}:coverage`,snapshot_data:{kind:'coverage_manifest',version:2,month:coverageMonth,status:'verified',approvalRef:'coverage-approval',inputsFingerprint:await componentInputsFingerprint(coverageInput,coverageMonth),expectedScopes:[coverageRecord.snapshot_scope],holds:[]}}
const coverage=async(records=[coverageRecord,manifest],inputs=coverageInput)=>resolveCoverageManifests(records,inputs,'2026-09-01','2026-10-01',2)
assert.deepEqual(await coverage(),[])
const coverageLegacy=structuredClone(coverageRecord)
coverageLegacy.snapshot_data.version=2
coverageLegacy.snapshot_data.target.inputsFingerprint=await componentInputsFingerprint(coverageInput,coverageMonth)
assert.deepEqual(await coverage([coverageLegacy,manifest]),[])
const altered=structuredClone(coverageRecord);altered.snapshot_data.amount++
assert.ok((await coverage([altered,manifest])).some(row=>row.reason==='invalid-required-component'))
assert.ok((await coverage([coverageRecord,coverageLegacy,manifest])).some(row=>row.reason==='missing-or-ambiguous-required-component'))
for(const change of [s=>s.version=4,s=>s.kind='branch_period_status']){
 const unsupported=structuredClone(coverageRecord);change(unsupported.snapshot_data)
 assert.ok((await coverage([unsupported,manifest])).some(row=>row.reason==='unsupported-required-component-contract'))
}
const changedCoverageInput=structuredClone(coverageInput)
changedCoverageInput.supplierPurchases.push({id:'coverage-new-purchase',purchase_date:coverageMonth+'-01',total_amount:1})
assert.equal((await resolveComponentRecords([coverageRecord],changedCoverageInput)).validated.length,1)
assert.ok((await coverage([coverageRecord,manifest],changedCoverageInput)).some(row=>row.reason==='stale-or-invalid-coverage-manifest'))
}
console.log('PASS fixed DSMF and Partner Fee accruals: unrelated purchases/revenue remain stable; expense/source/amount/branch changes, duplicate scopes/source claims and mixed v2/v3 fail closed; v2 semantics and kind-specific coverage guards unchanged')
