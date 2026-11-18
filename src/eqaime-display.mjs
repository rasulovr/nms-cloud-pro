export function documentRows(rows,{search='',from='',to=''}={}){
 return rows.filter(r=>`${r.invoiceNumber} ${r.supplierName}`.toLocaleLowerCase().includes(search.toLocaleLowerCase())&&(!from||r.documentDate&&r.documentDate>=from)&&(!to||r.documentDate&&r.documentDate<=to)).sort((a,b)=>String(b.documentDate||'').localeCompare(String(a.documentDate||''))||a.invoiceNumber.localeCompare(b.invoiceNumber));
}
export function compactPaymentLabel(r){
 const p=r.paymentStatus||{};
 if(r.sourceReviewRequired)return 'Требует проверки';
 if(p.state==='payment_not_found')return 'Оплата не найдена';
 if(p.label?.startsWith('Частичная оплата'))return 'Частичная оплата';
 if(p.label?.startsWith('Оплата подтверждена по имеющимся'))return 'Оплата найдена';
 return 'Требует проверки';
}
export function descriptionPreview(s){const text=String(s||'').trim();return text?(text.length>80?text.slice(0,80)+'…':text):'Нет описания'}
