// Revenue trends use equal, fully observed calendar intervals. A recorded zero
// is data; a missing branch/date is not. Today is never a closed trading day.
const key = (y,m) => `${y}-${String(m).padStart(2,'0')}`
const days = (y,m) => new Date(Number(y),Number(m),0).getDate()
export function revenueBusinessDate(now=new Date()) {
  const parts=Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Baku',year:'numeric',month:'numeric',day:'numeric'}).formatToParts(now).map(p=>[p.type,p.value]))
  return {year:Number(parts.year),month:Number(parts.month),day:Number(parts.day)}
}
export function currentRevenueMonth(y,m,now=new Date()) {
  const today=revenueBusinessDate(now)
  return Number(y)===today.year && Number(m)===today.month
}
export function futureRevenueMonth(y,m,now=new Date()) {
  const today=revenueBusinessDate(now)
  return Number(y)*12+Number(m)>today.year*12+today.month
}
export function revenueScopeIds(branches,rows,branchId='__all__') {
  if (!['all','__all__',null,undefined,''].includes(branchId)) return [String(branchId)]
  return [...new Set(rows.map(r=>String(r.branch_id)))]
}
function observations(rows,y,m,ids,rate) {
  const map=new Map(),scope=new Set(ids),prefix=key(y,m)+'-'
  for(const row of rows){
    if(row.deleted_at || !scope.has(String(row.branch_id)) || !String(row.revenue_date).startsWith(prefix))continue
    const date=String(row.revenue_date).slice(0,10),day=Number(date.slice(8,10))
    if(day<1 || day>days(y,m) || date!==prefix+String(day).padStart(2,'0'))continue
    const parts=['cash_amount','bank_amount','wolt_amount'].map(k=>row[k])
    if(parts.some(v=>v==null||v===''||!Number.isFinite(Number(v))))throw Error('Некорректная запись выручки')
    const [cash,bank,wolt]=parts.map(Number),id=day+':'+row.branch_id
    if(map.has(id))throw Error('Несколько записей выручки одного филиала за день: требуется проверка')
    map.set(id,cash+bank*(1-rate/100)+wolt)
  }
  return map
}
export function completedRevenuePeriod({rows,branches,branchId,year,month,rate=2,now=new Date(),maxDay,expectedBranchIds=[]}) {
  if(!Number.isFinite(rate)||rate<0||rate>100)throw Error('Некорректная ставка комиссии')
  const monthRows=rows.filter(r=>!r.deleted_at&&String(r.revenue_date).startsWith(key(year,month)+'-'))
  const ids=revenueScopeIds(branches,[...monthRows,...expectedBranchIds.map(branch_id=>({branch_id}))],branchId)
  const limit=futureRevenueMonth(year,month,now)?0:Math.min(days(year,month),maxDay??(currentRevenueMonth(year,month,now)?revenueBusinessDate(now).day-1:days(year,month)))
  const observed=observations(monthRows,year,month,ids,rate)
  let completedDays=0,revenue=0
  if(ids.length)for(let day=1;day<=limit;day++){
    if(ids.some(id=>!observed.has(day+':'+id)))break
    for(const id of ids)revenue+=observed.get(day+':'+id)
    completedDays=day
  }
  return {available:completedDays>0,completedDays,revenue,ids,monthDays:days(year,month),limited:completedDays<limit}
}
export function unavailableRevenueComparison(reason='Не хватает данных для сравнения одинаковых дат') {
  return {available:false,currentRevenue:null,previousRevenue:null,revenueLabel:'Сравнение недоступно',revenueTooltip:reason}
}
export function currentRevenueComparison(options) {
  const {year,month,previousRows,rate=2}=options
  options={...options,now:options.now||new Date()}
  const prior=new Date(Number(year),Number(month)-2,1),py=prior.getFullYear(),pm=prior.getMonth()+1
  const period=completedRevenuePeriod({...options,expectedBranchIds:previousRows.filter(r=>!r.deleted_at&&String(r.revenue_date).startsWith(key(py,pm)+'-')).map(r=>String(r.branch_id)),maxDay:Math.min(revenueBusinessDate(options.now).day-1,days(py,pm))})
  if(!period.available)return unavailableRevenueComparison()
  const observed=observations(previousRows,py,pm,period.ids,rate)
  let previousRevenue=0
  for(let day=1;day<=period.completedDays;day++)for(const id of period.ids){
    if(!observed.has(day+':'+id))return unavailableRevenueComparison('В предыдущем месяце не хватает записей за сопоставимые даты')
    previousRevenue+=observed.get(day+':'+id)
  }
  const range=`${key(year,month)}-01…${key(year,month)}-${String(period.completedDays).padStart(2,'0')}`
  const previousRange=`${key(py,pm)}-01…${key(py,pm)}-${String(period.completedDays).padStart(2,'0')}`
  return {available:true,currentRevenue:period.revenue,previousRevenue,completedDays:period.completedDays,
    revenueLabel:`1–${period.completedDays} ${['янв','фев','мар','апр','май','июн','июл','авг','сен','окт','ноя','дек'][month-1]} / 1–${period.completedDays} ${['янв','фев','мар','апр','май','июн','июл','авг','сен','окт','ноя','дек'][pm-1]}`,revenueTooltip:`Одинаковые даты, только полностью заполненные прошедшие дни: ${range} против ${previousRange}. Филиалы с записями выручки; после банковской комиссии. Wolt включён по датам записей, полнота его начисления не подтверждается.`}
}
export function revenueComparisonValues(comparison,current,previous) {
  const explicit=comparison!=null
  const a=explicit?comparison.currentRevenue:current,b=explicit?comparison.previousRevenue:previous
  const available=(!explicit||comparison.available!==false)&&typeof a==='number'&&Number.isFinite(a)&&typeof b==='number'&&Number.isFinite(b)
  return {current:a,previous:b,delta:available?a-b:null,percent:available&&b!==0?(a-b)/b*100:null}
}
export function unavailableRevenueForecast(reason='Нет полностью заполненных прошедших дней для прогноза') {
  return {forecastAvailable:false,forecastLabel:reason,forecastRevenue:null,forecastProfit:null,forecastExpenses:null,forecastMargin:null,avg:null,details:[]}
}
