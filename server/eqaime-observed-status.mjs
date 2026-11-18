// Read-only historical evidence, deliberately distinct from current-debt accounting.
const decimal=v=>typeof v==='string'&&/^\d+(\.\d{1,8})?$/.test(v);
const validDate=d=>{if(typeof d!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(d))return false;const t=new Date(d+'T00:00:00Z');return !Number.isNaN(t.valueOf())&&t.toISOString().slice(0,10)===d};
function formatUnits(n){const fraction=(n%100000000n).toString().padStart(8,'0').replace(/0+$/,'').padEnd(2,'0');return (n/100000000n).toString()+'.'+fraction}
const units=v=>{const [a,b='']=v.split('.');return BigInt(a)*100000000n+BigInt(b.padEnd(8,'0'))};
export function observedStatus(invoice,evidence,coverage){
 const yellow=(label,amount=null)=>({state:'partial_or_unknown',label,confirmedPaidAmount:amount,coverageNotice:'Только имеющиеся банковские документы. Возвраты и актуальное полное покрытие не подтверждены.'});
 if(invoice.sourceReviewRequired)return yellow('Статус документа требует проверки');
 if(!coverage||coverage.referencesChecked!==true)return yellow('Сверка банковских документов не выполнена');
 if(!evidence)return {state:'payment_not_found',label:'Оплата не найдена в доступных выписках',confirmedPaidAmount:null,coverageNotice:'Это не подтверждение долга: покрытие выписок неполное.'};
 if(evidence.reason==='payment_outside_selected_rms_supplier_scope')return yellow('Сведения об оплате вне выбранного списка поставщиков: требуется проверка');
 if(evidence.invoiceNumber!==invoice.invoiceNumber||evidence.kind!=='single'||evidence.identityVerified!==true||evidence.referencesVerified!==true)return yellow('Найден платёж: распределение / получатель требуют проверки');
 if(!decimal(evidence.amount)||!decimal(invoice.primaryAmount)||!Array.isArray(evidence.paymentDates)||!evidence.paymentDates.length||evidence.paymentDates.some(d=>!validDate(d)))return yellow('Доказательство оплаты требует проверки');
 const paid=units(evidence.amount),due=units(invoice.primaryAmount);
 const result=yellow(paid===due?'Оплата подтверждена по имеющимся банковским документам':paid<due?'Частичная оплата по имеющимся банковским документам':'Сумма найденных оплат требует проверки',evidence.amount);
 return {...result,...(paid===due&&due>0n?{state:'paid_observed',label:'Оплачено по совпадению номера и суммы в имеющихся банковских документах'}:{}),observedRemainder:paid<=due?{amount:formatUnits(due-paid),provisional:true,basis:'verified_observed_payments_only'}:null,paymentDates:[...new Set(evidence.paymentDates)].sort()};
}
export function checkedHistoricalEvidence(snapshot){
 const h=snapshot.historicalPaymentEvidence;
 if(!h)return null;
 if(h.version!==1||h.referencesChecked!==true||!h.bankSourceSha256||!/^[a-f0-9]{64}$/.test(h.bankSourceSha256)||!h.byInvoice||typeof h.byInvoice!=='object'||Array.isArray(h.byInvoice))throw Error('Historical evidence invalid');
 const used=new Set();
 for(const [number,e] of Object.entries(h.byInvoice)){
  if(e.invoiceNumber!==number)throw Error('Historical evidence invalid');
  if(e.kind==='single'){
   if(!Array.isArray(e.payments)||!e.payments.length||!decimal(e.amount))throw Error('Historical payments invalid');
   let total=0n;
   for(const p of e.payments){if(typeof p.id!=='string'||!p.id||used.has(p.id)||!decimal(p.amount)||!validDate(p.date))throw Error('Historical duplicate or invalid payment');used.add(p.id);total+=units(p.amount)}
   if(JSON.stringify([...new Set(e.payments.map(p=>p.date))].sort())!==JSON.stringify(e.paymentDates))throw Error('Historical payment dates invalid');
   if(total!==units(e.amount))throw Error('Historical payment sum invalid');
  }
 }
 return h;
}
