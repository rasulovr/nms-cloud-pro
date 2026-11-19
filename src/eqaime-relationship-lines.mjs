// Presentation only: no amount allocation, fuzzy match, or inferred group-union edges.
export function relationshipGraph(group){
 const invoices=group.invoices||[],payments=group.payments||[],byNumber=new Map(invoices.map(i=>[i.invoiceNumber,i])),edges=[];
 for(const p of payments){let allowed=[],tone='neutral';if(group.referenceRule){const c=p.referenceMatch;if(c&&c.state!=='review'&&c.paymentIds?.includes(p.id)){allowed=c.invoiceNumbers||[];tone=c.state==='equal'?'green':'yellow'}}else if(p.verifiedInvoiceNumber)allowed=[p.verifiedInvoiceNumber];else {const c=group.settlementGroups?.find(c=>c.id===p.settlementGroupId&&c.paymentIds?.includes(p.id));if(c)allowed=c.invoiceNumbers||[]}
  for(const n of new Set(p.electronicInvoiceNumbers||[])){const i=byNumber.get(n);if(i&&!i.reviewRequired&&allowed.includes(n))edges.push({invoiceNumber:n,paymentId:p.id,tone})}
 }
 return {invoices,payments,edges};
}
export function relationshipRowState(group,kind,row,edges){
 const visible=edges.some(e=>kind==='i'?e.invoiceNumber===row.invoiceNumber:e.paymentId===row.id),match=row.referenceMatch;
 if(group.referenceRule){
  if(kind==='i'&&(row.reviewRequired||!group.bankScopeAvailable))return {tone:'yellow',label:'Требует проверки'};
  if(match?.state==='equal'||match?.state==='difference')return {tone:match.state==='equal'?'green':'yellow',label:visible?(match.state==='equal'?'Номер и сумма совпали':'Сумма отличается'):'Связь вне текущей страницы'};
  if(match?.state==='review')return {tone:'yellow',label:'Связь требует проверки'};
  const requested=kind==='i'&&group.supplierKey==='supplier-045b11af-874f-47fd-9d61-061cd5104c20'&&row.invoiceNumber==='MT261110839142';
  return {tone:kind==='i'&&!requested?'red':'yellow',label:kind==='i'?'Оплата не найдена':'Связь не подтверждена'};
 }
 if(kind==='i'&&row.reviewRequired)return {tone:'yellow',label:'Требует проверки'};
 const known=kind==='p'?(row.verifiedInvoiceNumber||row.settlementGroupId):(row.verifiedIndividualLink===true||group.settlementGroups?.some(c=>c.invoiceNumbers.includes(row.invoiceNumber)));
 return {tone:visible||known?'neutral':'yellow',label:visible?'Связь найдена':known?'Связь вне текущей страницы':'Нет связи на этой странице'};
}

// Read the complete server-reviewed component, never sum the visible lines.
export function selectedDifference(group,selected){
 if(!group.referenceRule||!selected)return null;
 const row=selected.kind==='i'?group.invoices?.find(i=>i.invoiceNumber===selected.id):selected.kind==='p'?group.payments?.find(p=>p.id===selected.id):null;
 const m=row?.referenceMatch;if(!m||m.state!=='difference'||m.reason||!Array.isArray(m.invoiceNumbers)||!m.invoiceNumbers.length||!Array.isArray(m.paymentIds)||!m.paymentIds.length)return null;
 const d=m.difference;if(typeof d!=='string'||! /^-?\d+\.\d{2}$/.test(d)||Number(d)===0)return null;
 return {difference:d,grouped:m.invoiceNumbers.length>1};
}
