export function documentRows(rows,{search='',from='',to='',supplier=''}={}){
 return rows.filter(r=>(!supplier||r.supplierKey===supplier)&&`${r.invoiceNumber} ${r.supplierName} ${r.description||''}`.toLocaleLowerCase().includes(search.toLocaleLowerCase())&&(!from||r.documentDate&&r.documentDate>=from)&&(!to||r.documentDate&&r.documentDate<=to)).sort((a,b)=>String(b.documentDate||'').localeCompare(String(a.documentDate||''))||a.invoiceNumber.localeCompare(b.invoiceNumber));
}
export function compactPaymentLabel(r){
 const p=r.paymentStatus||{};
 if(r.sourceReviewRequired)return 'Требует проверки';
 if(p.state==='paid_observed'&&p.groupSettlement?.comparisonRule==='WHOLE_AZN_GROUP_TRUNCATE')return '✓ Оплачено по целым AZN';
 if(p.state==='paid_observed'&&p.groupSettlement)return '✓ Оплачено в группе';
 if(p.state==='paid_observed')return '✓ Оплачено';
 if(p.state==='payment_not_found')return 'Оплата не найдена';
 if(p.label?.startsWith('Частичная оплата'))return 'Частичная оплата';
 if(p.label?.startsWith('Оплата подтверждена по имеющимся'))return 'Оплата найдена';
 return 'Требует проверки';
}
export function descriptionPreview(s){const text=String(s||'').trim();return text?(text.length>80?text.slice(0,80)+'…':text):'Нет описания'}
