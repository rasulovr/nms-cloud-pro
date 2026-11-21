// Pure status reducer. Bank references are candidates, never payment allocations.
// Evidence must be produced by a verified allocation workflow, not browser input.
function cents(v) {
 if(typeof v!=='string'||!/^\d+(\.\d{1,8})?$/.test(v)) return null;
 const [a,b='']=v.split('.'); if(/[1-9]/.test(b.slice(2)))return null; return BigInt(a)*100n+BigInt(b.slice(0,2).padEnd(2,'0'));
}
export function paymentStatus(invoice,evidence={}) {
 const unknown=(label='Требует проверки',paid=null)=>({state:'partial_or_unknown',label,confirmedPaidAmount:paid});
 if(invoice.sourceReviewRequired || !invoice.invoiceNumber) return unknown();
 // Exact payable cents must be evidenced. Never silently round a four-decimal source.
 const due=cents(evidence.payableAmount);
 if(due===null || due===0n || evidence.payableAmountVerified!==true || evidence.invoiceNumber!==invoice.invoiceNumber) return unknown();
 const sourceCents=cents(invoice.primaryAmount);
 if(sourceCents===null || sourceCents!==due) return unknown();
 const allocations=evidence.allocations||[];
 if(!Array.isArray(allocations))return unknown();
 const ids=new Set(); let paid=0n;
 for(const a of allocations){
 const amount=cents(a.amount);
 if(!a.id || !a.bankPaymentId || cents(a.bankPaymentAmount)===null || amount>cents(a.bankPaymentAmount) || ids.has(a.id)||amount===null||a.bankExecutionVerified!==true||a.counterpartyVerified!==true||a.ownerVerified!==true||a.invoiceAllocationVerified!==true||a.duplicateAndReversalCheckComplete!==true||a.invoiceNumber!==invoice.invoiceNumber) return unknown();
 ids.add(a.id); paid+=amount;
 }
 const amount=(paid/100n).toString()+'.'+(paid%100n).toString().padStart(2,'0');
 if(evidence.unresolvedCandidatePayments || evidence.unresolvedSourceOrAllocation) return unknown('Требует проверки',amount);
 if(paid===due && paid>0n) return {state:'fully_confirmed',label:'Оплачено',confirmedPaidAmount:amount};
 if(paid>0n) return unknown(paid<due?'Частично оплачено':'Сумма требует проверки',amount);
 if(evidence.coverageComplete===true && evidence.openingAndOtherSettlementChecked===true && evidence.asOfVerified===true) return {state:'unpaid_confirmed',label:'Не оплачено',confirmedPaidAmount:'0.00'};
 return unknown('Оплата не подтверждена');
}
export function bankRowsForUi(rows) {
 return rows.map(r=>({id:r.id,date:r.date,amount:r.amount,purpose:r.purpose,electronicInvoiceNumbers:r.electronicInvoiceNumbers,reviewRequired:true}));
}
// Across-invoice control: a bank operation cannot be allocated twice beyond its amount.
export function safePaymentEvidence(input={}){
 const result={...input},allocIds=new Map(),payments=new Map(),invalid=new Set(),badPayments=new Set(),paymentOwners=new Map();
 for(const [invoiceNumber,e] of Object.entries(result)){
  if(!e||!Array.isArray(e.allocations)){invalid.add(invoiceNumber);continue}
  for(const a of e.allocations){
   if(a.bankPaymentId){const owners=paymentOwners.get(a.bankPaymentId)||new Set();owners.add(invoiceNumber);paymentOwners.set(a.bankPaymentId,owners)}
   const n=cents(a.amount),cap=cents(a.bankPaymentAmount);
   if(!a.id||!a.bankPaymentId||n===null||cap===null||n>cap){invalid.add(invoiceNumber);if(a.bankPaymentId)badPayments.add(a.bankPaymentId);continue}
   if(allocIds.has(a.id)){invalid.add(invoiceNumber);invalid.add(allocIds.get(a.id))}else allocIds.set(a.id,invoiceNumber);
   const p=payments.get(a.bankPaymentId)||{cap,total:0n,invoices:new Set()};p.invoices.add(invoiceNumber);p.total+=n;if(p.cap!==cap)p.bad=true;payments.set(a.bankPaymentId,p);
  }
 }
 for(const p of payments.values())if(p.bad||p.total>p.cap)for(const n of p.invoices)invalid.add(n);
 for(const id of badPayments)for(const n of paymentOwners.get(id)||[])invalid.add(n);
 for(const n of invalid)result[n]={...result[n],unresolvedSourceOrAllocation:true};
 return result;
}
