// Independent source registry values, not a refreshable hash of target rows.
// These fields are the raw identities/values/classifications read by the report.
export const ordinaryCoverageFields = {
  revenue:['id','branch_id','revenue_date','cash_amount','bank_amount','wolt_amount','source','external_id','comment'],
  expenses:['id','branch_id','expense_date','amount','category_id','custom_category','comment','expense_categories'],
  purchases:['id','supplier_id','branch_id','purchase_date','invoice_number','total_amount','comment','deleted_at','suppliers']
}
const numeric={revenue:['cash_amount','bank_amount','wolt_amount'],expenses:['amount'],purchases:['total_amount']}
const dateField={revenue:'revenue_date',expenses:'expense_date',purchases:'purchase_date'}
const text=v=>typeof v==='string' && v.trim().length>0
const amount=v=>(typeof v==='number' || typeof v==='string') && String(v).trim()!=='' && Number.isFinite(Number(v))
const canonical=v=>Array.isArray(v)?v.map(canonical):v && typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])])):v
const equal=(a,b)=>JSON.stringify(canonical(a))===JSON.stringify(canonical(b))
export function ordinaryCoverageIssues(proof,input,month) {
  const issues=[]
  const fail=kind=>issues.push({month,reason:`expected-${kind}-source-coverage-mismatch`,severity:'blocking_runtime_basis'})
  const actualSets={revenue:input.revenueRows,expenses:input.dailyExpenseRows,purchases:input.supplierPurchaseRows}
  for (const kind of Object.keys(ordinaryCoverageFields)) {
    const expected=proof[kind],rows=actualSets[kind],fields=ordinaryCoverageFields[kind]
    if (!Array.isArray(expected) || !Array.isArray(rows)) {fail(kind);continue}
    const actual=rows.filter(row=>String(row[dateField[kind]]).slice(0,7)===month)
    const ids=expected.map(row=>row?.expectedRow?.id),keys=expected.map(row=>row?.sourceKey)
    if (expected.length!==actual.length || !ids.every(text) || new Set(ids).size!==ids.length || !keys.every(text) || new Set(keys).size!==keys.length || new Set(actual.map(row=>row.id)).size!==actual.length) {fail(kind);continue}
    const byId=new Map(actual.map(row=>[row.id,row]))
    const valid=expected.every(entry=>{
      const e=entry.expectedRow,a=byId.get(e.id)
      if (!a || !Array.isArray(entry.sourceCells) || !entry.sourceCells.length || !entry.sourceCells.every(text) || !fields.every(key=>Object.hasOwn(e,key))) return false
      if (!fields.every(key=>numeric[kind].includes(key)
        ? typeof e[key]==='number' && amount(e[key]) && amount(a[key]) && e[key]===Number(a[key])
        : equal(e[key],a[key]??null))) return false
      if (kind==='purchases') {
        if (e.deleted_at===null) return entry.disposition==='active'
        return text(e.deleted_at) && entry.disposition==='deleted' && text(entry.reason)
      }
      return true
    })
    if (!valid) fail(kind)
  }
  return issues
}
