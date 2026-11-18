// A full group settlement never creates per-invoice bank allocations.
const units=s=>{if(typeof s!=='string'||!/^\d+(\.\d{1,8})?$/.test(s))throw Error('Amount');const [a,b='']=s.split('.');return BigInt(a)*100000000n+BigInt(b.padEnd(8,'0'))};
export function verifyGroups(snapshot,evidence){
 if(!Array.isArray(evidence)||evidence.length>10000)throw Error('Groups');
 const invoices=new Map(),payments=new Map(),usedPayments=new Set(),usedInvoices=new Set(),groupIds=new Set();
 for(const g of snapshot.groups){
  for(const i of g.invoices){if(invoices.has(i.invoiceNumber))throw Error('Duplicate invoice');invoices.set(i.invoiceNumber,{...i,supplierKey:g.supplierKey})}
  for(const p of g.payments){if(payments.has(p.id))throw Error('Duplicate payment');payments.set(p.id,{...p,supplierKey:g.supplierKey});if(p.verifiedInvoiceNumber){usedPayments.add(p.id);usedInvoices.add(p.verifiedInvoiceNumber)}}
 }
 const results=[];
 for(const e of evidence){
  if(typeof e.id!=='string'||!e.id||groupIds.has(e.id)||!Array.isArray(e.invoiceNumbers)||e.invoiceNumbers.length<2||!Array.isArray(e.paymentIds)||!e.paymentIds.length||new Set(e.invoiceNumbers).size!==e.invoiceNumbers.length||new Set(e.paymentIds).size!==e.paymentIds.length)throw Error('Invalid group');groupIds.add(e.id);
  const is=e.invoiceNumbers.map(n=>{const i=invoices.get(n);if(!i||i.reviewRequired||usedInvoices.has(n))throw Error('Unknown, disputed or reused invoice');return i});
  const ps=e.paymentIds.map(id=>{const p=payments.get(id);if(!p||usedPayments.has(id))throw Error('Unknown or reused payment');return p});
  const identities=new Set([...is,...ps].map(x=>x.supplierKey));if(identities.size!==1)throw Error('Cross-identity group');
  const references=new Set(ps.flatMap(x=>x.electronicInvoiceNumbers));if(references.size!==e.invoiceNumbers.length||e.invoiceNumbers.some(n=>!references.has(n)))throw Error('References mismatch');
  const due=is.reduce((n,i)=>n+units(i.amount),0n),paid=ps.reduce((n,p)=>n+units(p.amount),0n);if(due<=0n||due!==paid||paid!==units(e.amount))throw Error('Group sum mismatch');
  for(const i of is)usedInvoices.add(i.invoiceNumber);for(const p of ps)usedPayments.add(p.id);
  results.push({id:e.id,supplierKey:is[0].supplierKey,invoiceNumbers:[...e.invoiceNumbers],paymentIds:[...e.paymentIds],amount:e.amount,individualAllocation:null});
 }
 return results;
}
