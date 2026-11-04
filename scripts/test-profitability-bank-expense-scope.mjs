import assert from 'node:assert/strict'
import {bankInputsFingerprintV4,componentInputsFingerprint,resolveBankEvidence,resolveCoverageManifests,COMPONENT_SNAPSHOT_TYPE} from '../src/profitability-reviewed-components.mjs'
import {buildMonthlyAllocationBasis} from '../src/profitability-allocation.mjs'
const month='2026-10'
const rent={id:'synthetic-rent',branch_id:'a',expense_date:month+'-02',amount:50,category_id:'synthetic-rent-category',custom_category:null,comment:'Monthly premises rent',expense_categories:{name:'Rent'}}
const fee={...rent,id:'synthetic-fee',amount:2,category_id:'synthetic-bank-category',comment:'Bank commission',expense_categories:{name:'Bank fee'}}
const input={revenueRows:[{id:'synthetic-revenue',branch_id:'a',revenue_date:month+'-01',cash_amount:100,bank_amount:100,wolt_amount:0,source:null,external_id:null,comment:''}],dailyExpenseRows:[rent,fee],supplierPurchases:[]}
const scope={version:1,month,status:'verified',approvalRef:'synthetic-review',source:{fileId:'synthetic-primary',readAt:'2026-11-01',cells:['rent-purpose']},nonBankRows:[{sourceKey:'synthetic-rent-source',nature:'exclusive_non_bank',amountPolicy:'variable_nonnegative',expectedRow:{...rent}}]}
const hash=await bankInputsFingerprintV4(input,month,scope)
const record={id:'synthetic-bank',snapshot_type:COMPONENT_SNAPSHOT_TYPE,snapshot_scope:`profitability-components:${month}:bank-basis`,snapshot_data:{version:4,kind:'bank_basis_evidence',month,status:'verified',approvalRef:'synthetic-review',expectedBankCommissionRate:2,expenseScope:scope,inputsFingerprint:hash,entries:[{id:input.revenueRows[0].id,expectedRow:{...input.revenueRows[0]},basis:'gross',commissionPolicy:'held_existing_fee_overlap',collisionIds:[],sourceUrl:'https://example.com/synthetic-bank'}]}}
// This fixture explicitly retains a known fee overlap hold. Hash validity must
// never silently resolve it, even when unrelated expense amounts change.
for(const rows of [[{...rent,amount:99},fee],[fee],[{...rent,amount:0},fee]]) {
 const changed={...input,dailyExpenseRows:rows}
 assert.equal(await bankInputsFingerprintV4(changed,month,scope),hash)
 const result=await resolveBankEvidence([record],changed,2)
 assert.equal(result.byId.size,1)
 assert.equal(result.byId.get('synthetic-revenue').feeExpenseAllowed,false)
 assert.ok(result.issues.some(issue=>issue.reason==='bank_fee_overlap_unresolved'))
}
for(const [name,changed] of [
 ['new-unknown-expense',{...input,dailyExpenseRows:[rent,fee,{...rent,id:'new-unreviewed'}]}],
 ['new-fee',{...input,dailyExpenseRows:[rent,fee,{...fee,id:'new-fee'}]}],
 ['fee-amount',{...input,dailyExpenseRows:[rent,{...fee,amount:3}]}],
 ['fee-removed',{...input,dailyExpenseRows:[rent]}],
 ['revenue',{...input,revenueRows:[{...input.revenueRows[0],bank_amount:101}]}]
]){assert.notEqual(await bankInputsFingerprintV4(changed,month,scope),hash,name);assert.equal((await resolveBankEvidence([record],changed,2)).byId.size,0,name)}
for(const patch of [{comment:'Rent + BankKomisiya'},{category_id:'changed'},{expense_categories:{name:'Commission'}},{branch_id:'b'},{expense_date:month+'-03'},{id:'new-identity'}]) {
 const changed={...input,dailyExpenseRows:[{...rent,...patch},fee]}
 const result=await resolveBankEvidence([record],changed,2)
 assert.equal(result.byId.size,0,JSON.stringify(patch))
 assert.ok(result.issues.some(issue=>issue.reason==='stale-or-invalid-bank-evidence'))
}
for(const mutate of [s=>s.nonBankRows.push(structuredClone(s.nonBankRows[0])),s=>s.nonBankRows[0].expectedRow=fee,s=>delete s.approvalRef,s=>s.version=99,s=>s.month='2026-11',s=>s.nonBankRows[0].nature='mixed',s=>delete s.nonBankRows[0].expectedRow.category_id]){
 const bad=structuredClone(scope);mutate(bad);await assert.rejects(bankInputsFingerprintV4(input,month,bad))
}
await assert.rejects(bankInputsFingerprintV4({...input,dailyExpenseRows:[rent,rent,fee]},month,scope))
assert.notEqual(await bankInputsFingerprintV4(input,month,{...scope,approvalRef:'different-review'}),hash,'proof content is fingerprinted')
assert.equal((await resolveBankEvidence([record],input,3)).byId.size,0,'rate remains bound')
const collision=structuredClone(record);collision.snapshot_data.entries[0].collisionIds=[rent.id]
assert.equal((await resolveBankEvidence([collision],input,2)).byId.size,0,'expense exclusions cannot waive an explicit collision')
// Legacy v4 without an opt-in scope retains its exact old fingerprint behavior.
const legacyHash=await bankInputsFingerprintV4(input,month)
assert.equal(legacyHash,await componentInputsFingerprint(input,month))
assert.notEqual(await bankInputsFingerprintV4({...input,dailyExpenseRows:[{...rent,amount:99},fee]},month),legacyHash)
// Jan-Sep coverage needs no future registry. v2 bank evidence and the approved
// monthly net-bank allocation basis remain usable in every historical month.
for(let m=1;m<=9;m++){
 const historicalMonth=`2026-${String(m).padStart(2,'0')}`,date=historicalMonth+'-01',next=`2026-${String(m+1).padStart(2,'0')}-01`
 const historical={revenueRows:[{...input.revenueRows[0],revenue_date:date},{...input.revenueRows[0],id:'second',branch_id:'b',revenue_date:date,cash_amount:50,bank_amount:0}],dailyExpenseRows:[],supplierPurchases:[]}
 const fingerprint=await componentInputsFingerprint(historical,historicalMonth)
 const bank={id:'historical-bank',snapshot_type:COMPONENT_SNAPSHOT_TYPE,snapshot_scope:`profitability-components:${historicalMonth}:bank-basis`,snapshot_data:{version:2,kind:'bank_basis_evidence',month:historicalMonth,status:'verified',approvalRef:'historical-review',expectedBankCommissionRate:2,inputsFingerprint:fingerprint,entries:historical.revenueRows.map(row=>({id:row.id,expectedRow:row,basis:'gross',commissionPolicy:'apply_configured_rate',collisionIds:[],sourceUrl:'https://example.com/historical'}))}}
 const manifest={snapshot_type:COMPONENT_SNAPSHOT_TYPE,snapshot_scope:`profitability-components:${historicalMonth}:coverage`,snapshot_data:{version:2,kind:'coverage_manifest',month:historicalMonth,status:'verified',approvalRef:'historical-review',inputsFingerprint:fingerprint,expectedScopes:[bank.snapshot_scope],holds:[]}}
 assert.deepEqual(await resolveCoverageManifests([manifest,bank],historical,date,next,2),[])
 const resolved=await resolveBankEvidence([bank],historical,2)
 assert.equal(resolved.issues.length,0)
 const basis=buildMonthlyAllocationBasis(historical.revenueRows,row=>resolved.byId.get(row.id))
 assert.equal(basis.months.get(historicalMonth).shares.get('a'),198/248)
 assert.equal(basis.months.get(historicalMonth).shares.get('b'),50/248)
 const stale={...historical,revenueRows:[{...historical.revenueRows[0],bank_amount:101},historical.revenueRows[1]]}
 assert.ok((await resolveCoverageManifests([manifest,bank],stale,date,next,2)).length)
}
console.log('PASS scoped bank v4: reviewed non-bank edits/removal do not invalidate bank; unknown/new/changed bank expenses, purpose, identities, proof, rate and overlaps remain guarded; Jan-Sep v2 manifests/net allocation unchanged')
const cleanInput={...input,dailyExpenseRows:[rent]}
const cleanRecord=structuredClone(record)
cleanRecord.snapshot_data.inputsFingerprint=await bankInputsFingerprintV4(cleanInput,month,scope)
cleanRecord.snapshot_data.entries[0].commissionPolicy='apply_configured_rate'
const cleanChanged={...cleanInput,dailyExpenseRows:[{...rent,amount:80}]}
const cleanResult=await resolveBankEvidence([cleanRecord],cleanChanged,2)
assert.deepEqual(cleanResult.issues,[])
assert.equal(cleanResult.byId.get('synthetic-revenue').netBank,98)
assert.equal(cleanResult.byId.get('synthetic-revenue').feeExpenseAllowed,true)
for(const amount of [null,'',true,NaN,Infinity,-1])await assert.rejects(bankInputsFingerprintV4({...input,dailyExpenseRows:[{...rent,amount},fee]},month,scope))
console.log('PASS clean scoped-bank case: unrelated approved rent amount changes preserve validated commission; invalid excluded amounts reject')
