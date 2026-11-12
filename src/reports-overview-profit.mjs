import {fullMonthRange} from './profitability-range.mjs'
import {profitabilitySurface} from './profitability-surface.mjs'
// Same monthly accounting engine as Finance; no independent profit arithmetic.
export async function readOverviewProfit(client, readSnapshot, branches, filter, branch) {
  let range
  if (/^\d{4}-\d{2}$/.test(filter)) range=fullMonthRange(filter,filter)
  else if (/^year:\d{4}$/.test(filter)) range=fullMonthRange(filter.slice(5)+'-01',filter.slice(5)+'-12')
  else {
    const sources=[['daily_revenue_entries','revenue_date',true],['daily_revenue','revenue_date',true],['daily_expenses','expense_date',true],['supplier_purchases','purchase_date',true],['salary_periods','salary_month',false]]
    const dates=(await Promise.all(sources.flatMap(([table,field,softDelete])=>[true,false].map(async ascending=>{
      let query=client.from(table).select(field); if(softDelete)query=query.is('deleted_at',null)
      const {data,error}=await query.order(field,{ascending}).limit(1);if(error)throw error
      return data?.[0]?.[field]?.slice(0,7)
    })))).filter(Boolean).sort()
    if(!dates.length) return {error:'Нет записей за выбранный период.'}
    range=fullMonthRange(dates[0],dates.at(-1))
  }
  return readSnapshot(branches,{from:range.from,to:range.to,branchIds:branch==='all'?undefined:[branch]})
}
export function overviewProfitView(report) {
 const profit=profitabilitySurface(report)
 const rows=profit.available?(profit.expenseRows||[]):[]
 const branches=profit.available?(profit.branches||[]).filter(b=>b.available).map(b=>({...b,result:b.net,wolt:b.wolt||0})).sort((a,b)=>b.revenue-a.revenue):[]
 const ids=new Set(branches.map(b=>String(b.id)))
 const revenueRows=profit.available?(report?.summaryInputs?.revenueRows||[]).filter(r=>ids.has(String(r.branch_id))):[]
 return {profit,branches,expenseRows:rows,revenueRows}
}
