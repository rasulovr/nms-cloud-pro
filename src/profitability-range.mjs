// Calendar-only helpers. No monetary calculations or prorating.
export const isMonth = value => /^\d{4}-(0[1-9]|1[0-2])$/.test(String(value || '')) && Number(value.slice(0, 4)) >= 1 && Number(value.slice(0, 4)) <= 9998
export function currentBakuMonth(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en', {timeZone:'Asia/Baku',year:'numeric',month:'2-digit'}).formatToParts(now)
  return `${parts.find(x=>x.type==='year').value}-${parts.find(x=>x.type==='month').value}`
}
export function nextMonth(month) {
  if (!isMonth(month)) throw new RangeError('Invalid month')
  const [year,m] = month.split('-').map(Number)
  return `${String(m===12?year+1:year).padStart(4,'0')}-${String(m===12?1:m+1).padStart(2,'0')}-01`
}
export function fullMonthRange(fromMonth, toMonth) {
  if (!isMonth(fromMonth) || !isMonth(toMonth)) throw new RangeError('Invalid month')
  if (fromMonth > toMonth) throw new RangeError('Reversed period')
  const toExclusive = nextMonth(toMonth)
  const last = new Date(`${toExclusive}T00:00:00.000Z`)
  last.setUTCDate(last.getUTCDate()-1)
  return {from:`${fromMonth}-01`,to:last.toISOString().slice(0,10),toExclusive}
}
export function defaultProfitabilityRange(now = new Date()) {
  const month=currentBakuMonth(now)
  const {from,to}=fullMonthRange(month,month)
  return {from,to}
}
export function checkedBranchIds(ids, branches) {
  const allowed=new Set(branches.map(branch=>String(branch.id)))
  return [...new Set((ids || []).map(String))].filter(id=>allowed.has(id))
}
export function profitabilityRangePayload(fromMonth,toMonth,ids,branches) {
  const {from,to}=fullMonthRange(fromMonth,toMonth)
  const branchIds=checkedBranchIds(ids,branches)
  if (!branchIds.length) throw new RangeError('Select a branch')
  return {from,to,branchIds}
}
export const defaultMonthRange = defaultProfitabilityRange
export function validateMonthRange(from,to) {
  try {
    const range=fullMonthRange(String(from||'').slice(0,7),String(to||'').slice(0,7))
    if(range.from!==from || range.to!==to) return {valid:false,error:'Select full calendar months'}
    return {valid:true,toExclusive:range.toExclusive}
  } catch(error) { return {valid:false,error:error.message} }
}
