// Read-only component evidence adapter. No financial amounts or source IDs are
// embedded in this module; evidence is read through authenticated storage.
export const COMPONENT_SNAPSHOT_TYPE='reviewed_month_components_v1'
export const COMPONENT_KIND='component_adjustment'
export const ALLOCATION_BASIS='monthly_cash_plus_verified_net_bank_plus_gross_wolt'
const dates={revenueRows:'revenue_date',dailyExpenseRows:'expense_date',supplierPurchases:'purchase_date'}
const fields={
 revenueRows:['id','branch_id','revenue_date','cash_amount','bank_amount','wolt_amount','source','external_id','comment'],
 dailyExpenseRows:['id','branch_id','expense_date','amount','category_id','custom_category','comment','expense_categories'],
 supplierPurchases:['id','supplier_id','branch_id','purchase_date','invoice_number','total_amount','comment','deleted_at','suppliers']
}
const numericFields=new Set(['cash_amount','bank_amount','wolt_amount','amount','total_amount'])
const normalizeField=(key,value)=>{if(value==null)return null;if(numericFields.has(key)){const n=Number(value);if(value===''||!Number.isFinite(n))throw Error('Invalid numeric fingerprint field: '+key);return n}return value}
const canonical=value=>Array.isArray(value)?value.map(canonical).sort((a,b)=>JSON.stringify(a)<JSON.stringify(b)?-1:JSON.stringify(a)>JSON.stringify(b)?1:0):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(k=>[k,canonical(value[k])])):value
export async function componentInputsFingerprint(input,month){
 const selected={}
 for(const [key,date] of Object.entries(dates)){
  if(!Array.isArray(input[key]))throw Error('Incomplete component inputs: '+key)
  const rows=input[key].filter(r=>String(r[date]||'').slice(0,7)===month)
  if(rows.some(r=>!r.id)||new Set(rows.map(r=>r.id)).size!==rows.length)throw Error('Missing or duplicate input identity: '+key)
  selected[key]=rows.map(row=>Object.fromEntries(fields[key].map(k=>[k,normalizeField(k,row[k])])))
 }
 const bytes=new TextEncoder().encode(JSON.stringify(canonical(selected)))
 return [...new Uint8Array(await globalThis.crypto.subtle.digest('SHA-256',bytes))].map(b=>b.toString(16).padStart(2,'0')).join('')
}
export function validateComponentRecord(record,fingerprint){
 const s=record?.snapshot_data,fail=reason=>({valid:false,reason,month:s?.month,componentKey:s?.componentKey})
 if(record?.snapshot_type!==COMPONENT_SNAPSHOT_TYPE||s?.kind!==COMPONENT_KIND||s?.version!==2)return fail('unsupported-contract')
 if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(s.month)||!s.componentKey||record.snapshot_scope!==`profitability-components:${s.month}:${s.componentKey}`)return fail('invalid-scope')
 if(s.status!=='verified')return fail('source-held')
 if(!s.approvalRef||!s.source?.fileId||s.source.gid==null||!Array.isArray(s.source.cells)||!s.source.cells.length||!s.source.readAt)return fail('missing-source-provenance')
 if(!s.target||s.target.inputsFingerprint!==fingerprint)return fail('changed-target-inputs')
 if(!Array.isArray(s.target.representationIds)||!Array.isArray(s.target.excludedIds)||!Array.isArray(s.target.expectedRows))return fail('missing-target-provenance')
 if(['add_missing_pool','reallocate_existing_pool'].includes(s.action)&&!['food_market','household'].includes(s.category))return fail('unsupported-pool-category')
 if(!['food_market','household','partner_fee','utilities','other','rent','packaging','marketing','maintenance'].includes(s.category))return fail('unsupported-component-category')
 if(s.action==='exclude_duplicate'){
  if(s.scope!=='branch'||!s.branchId||s.target.excludedIds.length!==1||s.target.representationIds.length!==1||s.target.excludedIds[0]===s.target.representationIds[0]||s.target.expectedRows.length<2)return fail('invalid-duplicate-evidence')
 } else if(['reallocate_existing_pool','classify_existing'].includes(s.action)){
  if(!s.category||!s.target.representationIds.length||!s.target.expectedRows.length)return fail('missing-representation-evidence')
  if(s.action==='reallocate_existing_pool'&&(s.scope!=='network'||s.allocationBasis!==ALLOCATION_BASIS||typeof s.amount!=='number'||!Number.isFinite(s.amount)||s.amount<0))return fail('invalid-existing-pool')
 } else {
  if(!['add_missing_pool','add_missing_branch'].includes(s.action)||typeof s.amount!=='number'||!Number.isFinite(s.amount)||s.amount<0||!s.category)return fail('invalid-component')
  if(s.action==='add_missing_pool'){
   const rows=s.source.datedRows
   if(!Array.isArray(rows)||!rows.length||rows.some(r=>typeof r.amount!=='number'||!Number.isFinite(r.amount)||!r.source_cell||String(r.date).slice(0,7)!==s.month||new Date(r.date+'T00:00:00Z').toISOString().slice(0,10)!==r.date)||new Set(rows.map(r=>r.date+':'+r.source_cell)).size!==rows.length||Math.abs(rows.reduce((sum,r)=>sum+r.amount,0)-s.amount)>1e-8)return fail('invalid-dated-source-pool')
  }
  if(s.action==='add_missing_pool'&&(s.scope!=='network'||s.branchId!==null||s.allocationBasis!==ALLOCATION_BASIS))return fail('invalid-pool-basis')
  if(s.action==='add_missing_branch'&&(s.scope!=='branch'||!s.branchId))return fail('invalid-branch-scope')
  if(s.target.representationIds.length||s.target.excludedIds.length)return fail('addition-has-existing-representation')
  if(typeof s.source.recomputedAmount!=='number'||Math.abs(s.source.recomputedAmount-s.amount)>1e-8)return fail('source-amount-mismatch')
 }
 return {valid:true,source:s,snapshotId:record.id}
}
export async function resolveComponentRecords(records,input){
 const validated=[],held=[],seen=new Set(),fingerprints=new Map()
 for(const record of records){
  const s=record.snapshot_data
  // Legacy full-month snapshots are intentionally not consumed by this adapter.
  if(s?.kind!==COMPONENT_KIND||s.version!==2)continue
  const scope=record.snapshot_scope
  if(seen.has(scope)){held.push({month:s.month,componentKey:s.componentKey,reason:'duplicate-snapshot-scope'});continue}seen.add(scope)
  if(!fingerprints.has(s.month))fingerprints.set(s.month,await componentInputsFingerprint(input,s.month))
  const result=validateComponentRecord(record,fingerprints.get(s.month))
  if(result.valid)validated.push(result);else held.push(result)
 }
 const ambiguous=new Set(held.filter(h=>h.reason==='duplicate-snapshot-scope').map(h=>h.month+':'+h.componentKey))
 return {validated:validated.filter(r=>!ambiguous.has(r.source.month+':'+r.source.componentKey)),held}
}
export async function readComponentRecords(client,from,toExclusive){
 let rows=[]
 for(let offset=0;offset<=50000;offset+=1000){
  const {data,error}=await client.from('rms_data_snapshots').select('id,snapshot_type,snapshot_scope,snapshot_data,created_at').eq('snapshot_type',COMPONENT_SNAPSHOT_TYPE).like('snapshot_scope','profitability-components:%').order('id',{ascending:true}).range(offset,offset+999)
  if(error)throw Error('Не удалось прочитать проверенные компоненты: '+error.message)
  if(!Array.isArray(data))throw Error('Incomplete reviewed component response')
  rows.push(...data)
  if(data.length<1000)return rows.filter(r=>{const day=String(r.snapshot_data?.month||'')+'-01';return day>=from&&day<toExclusive})
 }
 throw Error('Reviewed component read limit exceeded')
}

export async function resolveCoverageManifests(records,input,from,toExclusive){
 const issues=[]
 // Only the explicitly reviewed historical window requires the new evidence
 // contract. This boundary contains no financial values or source identities.
 for(let m=1;m<=9;m++){
  const month=`2026-${String(m).padStart(2,'0')}`,day=month+'-01'
  if(day<from||day>=toExclusive)continue
  const manifests=records.filter(r=>r.snapshot_type===COMPONENT_SNAPSHOT_TYPE&&r.snapshot_scope===`profitability-components:${month}:coverage`&&r.snapshot_data?.kind==='coverage_manifest'&&r.snapshot_data?.version===2)
  const issue=reason=>issues.push({month,reason,severity:'blocking_runtime_basis'})
  if(manifests.length!==1){issue(manifests.length?'duplicate-coverage-manifest':'missing-coverage-manifest');continue}
  const s=manifests[0].snapshot_data
  if(s.month!==month||s.status!=='verified'||!s.approvalRef||s.inputsFingerprint!==await componentInputsFingerprint(input,month)||!Array.isArray(s.expectedScopes)||!Array.isArray(s.holds)){issue('stale-or-invalid-coverage-manifest');continue}
  for(const scope of s.expectedScopes){
   const matches=records.filter(r=>r.snapshot_scope===scope)
   if(!String(scope).startsWith(`profitability-components:${month}:`)||matches.length!==1||matches[0].snapshot_type!==COMPONENT_SNAPSHOT_TYPE||matches[0].snapshot_data?.version!==2||!['component_adjustment','bank_basis_evidence'].includes(matches[0].snapshot_data?.kind)||matches[0].snapshot_data?.status!=='verified')issue('missing-or-ambiguous-required-component')
  }
  for(const hold of s.holds){
   if(!['blocking_runtime_basis','blocking_collision','preliminary'].includes(hold.severity)||!hold.reason){issue('invalid-coverage-hold');continue}
   issues.push({...hold,month})
  }
 }
 return issues
}

export async function resolveBankEvidence(records,input,configuredRate){
 const byId=new Map(),issues=[],seenMonths=new Set(),revenueById=new Map(input.revenueRows.map(r=>[String(r.id),r]))
 for(const record of records){
  const s=record.snapshot_data
  if(s?.kind!=='bank_basis_evidence'||s.version!==2)continue
  const fail=reason=>issues.push({month:s.month,reason,severity:'blocking_runtime_basis'})
  if(seenMonths.has(s.month)){fail('duplicate-bank-evidence');for(const [id,e] of byId)if(e.month===s.month)byId.delete(id);continue}seenMonths.add(s.month)
  if(record.snapshot_type!==COMPONENT_SNAPSHOT_TYPE||record.snapshot_scope!==`profitability-components:${s.month}:bank-basis`||s.status!=='verified'||!s.approvalRef||s.expectedBankCommissionRate!==configuredRate||s.inputsFingerprint!==await componentInputsFingerprint(input,s.month)||!Array.isArray(s.entries)){fail('stale-or-invalid-bank-evidence');continue}
  for(const entry of s.entries){
   const row=revenueById.get(String(entry.id)),expected=entry.expectedRow
   const keys=['branch_id','revenue_date','cash_amount','bank_amount','wolt_amount']
   const matches=row&&expected&&keys.every(k=>numericFields.has(k)?Number(row[k])===Number(expected[k]):String(row[k])===String(expected[k]))
   if(!matches||String(row.revenue_date).slice(0,7)!==s.month||entry.basis!=='gross'||!['apply_configured_rate','held_existing_fee_overlap'].includes(entry.commissionPolicy)||!Array.isArray(entry.collisionIds)||entry.collisionIds.length||!entry.sourceUrl||byId.has(String(entry.id))){fail('unverified-bank-entry');continue}
   byId.set(String(entry.id),{month:s.month,verified:true,grossBank:Number(row.bank_amount),netBank:Number(row.bank_amount)*(1-configuredRate/100),feeExpenseAllowed:entry.commissionPolicy==='apply_configured_rate',sourceUrl:entry.sourceUrl})
   if(entry.commissionPolicy==='held_existing_fee_overlap')issues.push({month:s.month,branchId:String(row.branch_id),reason:'bank_fee_overlap_unresolved',severity:'blocking_runtime_basis'})
  }
 }
 return {byId,issues}
}
