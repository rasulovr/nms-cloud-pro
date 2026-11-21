// Presentation only. Never infer an official amount/date from RMS card fragments.
export function groupRegister(rows){
  const groups=new Map(),tokenOwners=new Map()
  for(const row of rows){
    const label=String(row.invoice_number||'').trim()
    const match=/^(MT\d{12})(?:[ \t]+[Hh]issəvi(?:[ \t]+([1-9]\d*))?)?$/.exec(label)
    const recognized=Boolean(match&&row.supplier_id),base=recognized?match[1]:null
    const key=recognized?`${row.supplier_id}:${base}`:`review:${row.id}`
    if(!groups.has(key))groups.set(key,{id:key,invoice_number:base||label||'Без номера',supplier_id:row.supplier_id,supplierName:row.supplierName,kind:recognized?'number_group':'review_card',childIds:[],rmsDateFrom:null,rmsDateTo:null,primaryAmount:null,confirmedDebt:null,delta:null,reasons:[]})
    const g=groups.get(key);if(!g.childIds.includes(row.id))g.childIds.push(row.id)
    if(/^\d{4}-\d{2}-\d{2}$/.test(row.invoice_date||'')){g.rmsDateFrom=!g.rmsDateFrom||row.invoice_date<g.rmsDateFrom?row.invoice_date:g.rmsDateFrom;g.rmsDateTo=!g.rmsDateTo||row.invoice_date>g.rmsDateTo?row.invoice_date:g.rmsDateTo}
    if(!recognized)g.reasons.push('Составной номер или нераспознанное обозначение: отдельная проверка')
    for(const reason of row.reasons||[])g.reasons.push(reason)
    for(const token of new Set(label.match(/MT\d{12}/g)||[])){const t=`${row.supplier_id}:${token}`;if(!tokenOwners.has(t))tokenOwners.set(t,new Set());tokenOwners.get(t).add(key)}
  }
  for(const g of groups.values()){
    g.reasons.push('Первичная сумма и дата документа не подтверждены; суммы внутренних карточек не складываются')
    const tokens=new Set(g.invoice_number.match(/MT\d{12}/g)||[])
    if([...tokens].some(t=>(tokenOwners.get(`${g.supplier_id}:${t}`)?.size||0)>1))g.reasons.push('Номер встречается в других, в том числе составных, карточках: возможно пересечение')
    g.reasons=[...new Set(g.reasons)]
  }
  return [...groups.values()]
}
export function uniquePayments(payments){
  const seen=new Map()
  for(const p of payments){if(!p.id)throw Error('Payment identity unavailable');const old=seen.get(p.id);if(old&&JSON.stringify(old)!==JSON.stringify(p))throw Error('Conflicting duplicate payment');if(!old)seen.set(p.id,p)}
  return [...seen.values()]
}
