// An opt-in, independently reviewed exclusion list; never a category heuristic.
// Unknown/new expenses remain candidates. Only amount changes/removal of an
// explicitly exclusive non-bank row may be irrelevant to bank-fee evidence.
export function bankExpenseCandidates(input, month, scope) {
  if (!Array.isArray(input.dailyExpenseRows)) throw Error('Incomplete bank expense inputs')
  const rows=input.dailyExpenseRows.filter(row=>String(row.expense_date).slice(0,7)===month)
  if(rows.some(row=>!row.id)||new Set(rows.map(row=>row.id)).size!==rows.length)throw Error('Missing or duplicate bank expense identity')
  const text=value=>typeof value==='string'&&value.trim().length>0
  if(month<'2026-10'||scope?.version!==1||scope.month!==month||scope.status!=='verified'||!text(scope.approvalRef)||!text(scope.source?.fileId)||!text(scope.source?.readAt)||!Array.isArray(scope.source?.cells)||!scope.source.cells.length||!scope.source.cells.every(text)||!Array.isArray(scope.nonBankRows))throw Error('Invalid bank expense scope')
  const fields=['id','branch_id','expense_date','category_id','custom_category','comment','expense_categories']
  const canonical=value=>value&&typeof value==='object'&&!Array.isArray(value)?Object.fromEntries(Object.keys(value).sort().map(key=>[key,canonical(value[key])])):value
  const normalized=(key,row)=>key==='expense_categories'&&row[key]===null&&row.category_id===null?{name:null}:row[key]
  const same=(key,a,b)=>JSON.stringify(canonical(normalized(key,a)))===JSON.stringify(canonical(normalized(key,b)))
  const excluded=new Set(),sourceKeys=new Set()
  for(const proof of scope.nonBankRows){
    const expected=proof?.expectedRow
    if(proof?.nature!=='exclusive_non_bank'||proof.amountPolicy!=='variable_nonnegative'||!text(proof.sourceKey)||sourceKeys.has(proof.sourceKey)||!expected||!fields.every(key=>Object.hasOwn(expected,key))||!text(expected.id)||!text(expected.branch_id)||String(expected.expense_date).slice(0,7)!==month||excluded.has(expected.id))throw Error('Invalid non-bank expense identity')
    // Do not allow even an exclusion attestation to waive an explicit fee or
    // mixed bank-purpose signal. Ambiguous rows must stay in the candidate set.
    const purpose=[expected.custom_category,expected.comment,expected.expense_categories?.name].filter(Boolean).join(' ')
    if(!text(purpose)||/bank|банк|комисс|commission|komisi|acquir|эквай|ekvay|terminal|терминал|\bpos\b|\bfee\b|rüsum|rusum/i.test(purpose))throw Error('Bank-purpose expense cannot be excluded')
    const actual=rows.find(row=>row.id===expected.id)
    if(actual&&(!fields.every(key=>same(key,actual,expected))||actual.amount==null||!['number','string'].includes(typeof actual.amount)||String(actual.amount).trim()===''||!Number.isFinite(Number(actual.amount))||Number(actual.amount)<0))throw Error('Changed non-bank expense purpose')
    excluded.add(expected.id);sourceKeys.add(proof.sourceKey)
  }
  return rows.filter(row=>!excluded.has(row.id))
}
