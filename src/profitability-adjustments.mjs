// Report-only views of authenticated reviewed evidence. Never writes operational
// cash, invoices, debt, salary or payment records.
export function buildReviewedAdjustments(validated,input){
 const expenseById=new Map(input.dailyExpenseRows.map(r=>[String(r.id),r]))
 const purchaseById=new Map(input.supplierPurchases.map(r=>[String(r.id),r]))
 const excludedExpenses=new Set(),excludedPurchases=new Set(),expenseGroups=new Map(),purchaseGroups=new Map(),branchAdditions=[],poolAdditions=[],held=[]
 const labels={food_market:'Базар / проверенный компонент',partner_fee:'Partner Fee',household:'Хозяйственные товары'}
 const conflicts=new Set(),claims=new Map()
 for(const entry of validated){
  const s=entry.source
  if(['add_missing_pool','add_missing_branch'].includes(s.action)){const key='source:'+JSON.stringify([s.month,s.source.fileId,s.source.gid,[...s.source.cells].sort()]);if(claims.has(key)){conflicts.add(entry);conflicts.add(claims.get(key))}else claims.set(key,entry)}
  for(const id of s.target.excludedIds||[]){const key='exclude:'+id;if(claims.has(key)){conflicts.add(entry);conflicts.add(claims.get(key))}else claims.set(key,entry)}
  if(s.action==='reallocate_existing_pool')for(const id of s.target.representationIds||[]){const key='pool:'+id;if(claims.has(key)){conflicts.add(entry);conflicts.add(claims.get(key))}else claims.set(key,entry)}
  if(['classify_existing','reallocate_existing_pool'].includes(s.action))for(const id of s.target.representationIds||[]){const key='category:'+id,prior=claims.get(key);if(prior&&prior.source.category!==s.category){conflicts.add(entry);conflicts.add(prior)}else claims.set(key,entry)}
 }
 for(const entry of validated){
  const {source:s,snapshotId}=entry
  if(conflicts.has(entry)){held.push({month:s.month,branchId:s.branchId,componentKey:s.componentKey,reason:'conflicting-component-claims'});continue}
  const hold=reason=>held.push({month:s.month,branchId:s.branchId,componentKey:s.componentKey,reason})
  const targetIds=[...(s.target.representationIds||[]),...(s.target.excludedIds||[])]
  const expectedById=new Map((s.target.expectedRows||[]).map(row=>[String(row.id),row]))
  const targetValid=expectedById.size===(s.target.expectedRows||[]).length && targetIds.every(id=>{
   const actual=expenseById.get(String(id))||purchaseById.get(String(id)),expected=expectedById.get(String(id))
   if(!actual||!expected)return false
   const dateKey=actual.expense_date?'expense_date':'purchase_date',amountKey=dateKey==='expense_date'?'amount':'total_amount'
   if(String(actual[dateKey]).slice(0,7)!==s.month||String(expected[dateKey])!==String(actual[dateKey])||expected[amountKey]==null||Number(expected[amountKey])!==Number(actual[amountKey]))return false
   return ['id','branch_id','category_id','custom_category','supplier_id','invoice_number','comment'].every(key=>!(key in expected)||(expected[key]??null)===(actual[key]??null))
  })
  if(!targetValid){hold('target-row-evidence-mismatch');continue}
  const provenance={snapshotId,sourceKey:s.componentKey,source:s.source,allocationBasis:s.allocationBasis}
  if(s.action==='exclude_duplicate'){
   const duplicate=expenseById.get(String(s.target.excludedIds[0])),kept=expenseById.get(String(s.target.representationIds[0]))
   if(!duplicate||!kept||String(duplicate.branch_id)!==String(s.branchId)||String(kept.branch_id)!==String(s.branchId)||String(duplicate.expense_date).slice(0,7)!==s.month||String(kept.expense_date).slice(0,7)!==s.month){hold('duplicate-target-not-present');continue}
   excludedExpenses.add(String(duplicate.id))
   if(s.category)expenseGroups.set(String(kept.id),s.category)
  }else if(s.action==='add_missing_branch'){
   branchAdditions.push({id:`reviewed-${snapshotId}`,branch_id:s.branchId,expense_date:s.month+'-01',amount:s.amount,custom_category:labels[s.category]||s.category,reviewedCategory:s.category,comment:'Проверенное начисление для отчёта; не выплата и не движение кассы',reviewedProvenance:provenance})
  }else if(s.action==='add_missing_pool'){
   poolAdditions.push({id:`reviewed-${snapshotId}`,purchase_date:s.month+'-01',total_amount:s.amount,reviewedCategory:s.category,suppliers:{name:labels[s.category]||s.category},comment:'Проверенный распределяемый компонент; не новая накладная и не оплата',reviewedProvenance:provenance})
  }else if(s.action==='reallocate_existing_pool'){
   const rows=s.target.representationIds.map(id=>expenseById.get(String(id)))
   if(!rows.length||rows.some(r=>!r||String(r.expense_date).slice(0,7)!==s.month)||Math.abs(rows.reduce((sum,r)=>sum+Number(r.amount),0)-s.amount)>1e-8){hold('existing-pool-mismatch');continue}
   const overlapPurchases=s.target.excludedIds.map(id=>purchaseById.get(String(id)))
   if(overlapPurchases.some(r=>!r||String(r.purchase_date).slice(0,7)!==s.month)){hold('existing-pool-overlap-mismatch');continue}
   overlapPurchases.forEach(r=>excludedPurchases.add(String(r.id)))
   rows.forEach(r=>excludedExpenses.add(String(r.id)))
   poolAdditions.push({id:`reviewed-${snapshotId}`,purchase_date:s.month+'-01',total_amount:s.amount,reviewedCategory:s.category,suppliers:{name:labels[s.category]||s.category},comment:'Существующие распределённые строки сведены в единый месячный пул без повторного учёта',reviewedProvenance:provenance})
  }else if(s.action==='classify_existing'){
   if(s.target.representationIds.some(id=>purchaseById.has(String(id)))&&!['food_market','household'].includes(s.category)){hold('unsupported-purchase-category');continue}
   for(const id of s.target.representationIds){
    if(purchaseById.has(String(id)))purchaseGroups.set(String(id),s.category)
    else if(expenseById.has(String(id)))expenseGroups.set(String(id),s.category)
    else hold('classification-target-missing')
   }
   for(const id of s.target.excludedIds){
    if(expenseById.has(String(id)))excludedExpenses.add(String(id))
    else if(purchaseById.has(String(id)))excludedPurchases.add(String(id))
    else hold('classification-exclusion-missing')
   }
  }
 }
 return {dailyExpenseRows:[...input.dailyExpenseRows.filter(r=>!excludedExpenses.has(String(r.id))).map(r=>expenseGroups.has(String(r.id))?{...r,reviewedCategory:expenseGroups.get(String(r.id))}:r),...branchAdditions],supplierPurchases:[...input.supplierPurchases.filter(r=>!excludedPurchases.has(String(r.id))).map(r=>purchaseGroups.has(String(r.id))?{...r,reviewedCategory:purchaseGroups.get(String(r.id))}:r),...poolAdditions],held}
}
