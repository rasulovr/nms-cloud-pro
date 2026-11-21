import {exactDecimal} from './decimal.mjs';
import {cents,money} from './reconcile.mjs';
export function importView(result,seller=''){
 const invoices=result.invoiceRows.filter(r=>!seller||r.original.sellerVoen===seller),payments=result.paymentRows.filter(r=>!seller||r.original.recipientVoen===seller),ids=new Set(payments.map(p=>p.id));
 const components=result.components.filter(c=>c.paymentIds.every(id=>ids.has(id))),valid=components.filter(c=>c.state!=='review');
 const eligible=invoices.filter(i=>i.original.status==='accepted'&&!i.original.reviewRequired&&new Set(i.sourceRecords.map(r=>JSON.stringify([r.buyerVoen,r.sellerVoen,r.invoiceNumber,exactDecimal(r.amount),exactDecimal(r.comparisonAmount),r.currency,r.date,r.status,r.identityVerified,r.reviewRequired]))).size===1);
 const heldInvoices=invoices.length-eligible.length,blockedComponents=components.filter(c=>c.state==='review').length;
 const invoiceTotal=eligible.reduce((n,i)=>n+cents(i.original.comparisonAmount),0n);
 let actual=0n,uncertain=0;for(const p of payments){const versions=new Set(p.sourceRecords.map(s=>JSON.stringify([s.ownerVoen,s.recipientVoen,exactDecimal(s.amount),s.date,s.currency,s.direction,s.identityVerified,s.reviewRequired,s.referenceEvidenceComplete,[...(s.invoiceNumbers||[])].sort()])));if(versions.size!==1){uncertain++;continue}try{actual+=cents(p.original.amount)}catch{uncertain++}}
 const credit=valid.reduce((n,c)=>n+(cents(c.actualPaymentAmount)<cents(c.invoiceAmount)?cents(c.actualPaymentAmount):cents(c.invoiceAmount)),0n);
 const matched=new Map(result.components.map(c=>[c.id,{...c,state:c.state==='paid'?'equal':c.state==='review'?'review':'difference',amount:c.actualPaymentAmount}]));
 return {invoices,payments,totals:{invoiceTotal:money(invoiceTotal),actual:money(actual),credit:money(credit),heldInvoices,blockedComponents,remaining:payments.length&&invoices.length&&!heldInvoices&&!blockedComponents&&!uncertain?money(invoiceTotal-credit):null,uncertain},graph:{supplierKey:'local-'+seller,referenceRule:result.rule,bankScopeAvailable:true,invoices:invoices.map(i=>({invoiceNumber:i.original.invoiceNumber,date:i.original.date,amount:i.original.amount,reviewRequired:i.original.reviewRequired||i.reasons.length>0,referenceMatch:matched.get(i.componentId)||{state:'review',reason:'Нет подтверждённой оплаты в загруженных файлах'}})),payments:payments.map(p=>({id:p.id,date:p.original.date,amount:p.original.amount,electronicInvoiceNumbers:p.original.invoiceNumbers,referenceMatch:matched.get(p.componentId)}))}};
}
export function ownerOptions(workspace){return [...new Set(workspace.files.filter(f=>!f.excludedFromReconciliation).flatMap(f=>f.ownerVoens||[]))].filter(v=>/^voen:[a-f0-9]{64}$/.test(v)).sort()}
export function supplierOptions(result){const m=new Map();for(const i of result.invoiceRows)m.set(i.original.sellerVoen,i.original.supplierName||i.original.sellerVoen);for(const p of result.paymentRows)if(!m.has(p.original.recipientVoen))m.set(p.original.recipientVoen,p.original.recipientName||p.original.recipientVoen);return [...m].map(([id,name])=>({id,name})).sort((a,b)=>a.name.localeCompare(b.name))}

export function identityLabel(workspace,key){const labels=workspace.files.map(f=>f.identityLabels?.[key]).filter(Boolean);return labels.find(l=>l.display)?.display||labels[0]?.masked||'VÖEN •'+key.slice(-8)}
