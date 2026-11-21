import {createHash} from 'node:crypto';
import {sourceUnits as u,formatUnits as f} from './eqaime-money.mjs';
import {reallocationScope,originalInvoicesKey} from './eqaime-confirmed-reallocation.mjs';
const payKey='73699eebc6be6488ca03de96aaab647db5b25f2efff6b13f24f36090451d8116';
const docSet='d3740221f0af1779b6112f44766288508f2b1687d380cf42789748ed41018a03';
const heldKey='2ee35bb0da1b22c18ea432c255b0b6066a3ea7411a9aaf79ca0e30bb44190de8';
const clean=v=>typeof v==='string'?v.normalize('NFKC').trim().replace(/\s+/g,' ').toUpperCase():'';
const hash=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');

export function applyOneApprovedStatus(groups,bank,primaryRows,env,scope){
 const prefix=reallocationScope(env,scope);if(!prefix)return groups;
 const bm=new Map(bank.rows.map(r=>[r.id,r])),pm=new Map(primaryRows.map(r=>[r.invoiceNumber,r]));
 const all=groups.flatMap(g=>g.payments),allI=groups.flatMap(g=>g.invoices);
 if(bm.size!==bank.rows.length||pm.size!==primaryRows.length||new Set(all.map(p=>p.id)).size!==all.length||new Set(allI.map(i=>i.invoiceNumber)).size!==allI.length)return groups;
 let picked=null;
 for(const g of groups){
  if(!g.bankScopeAvailable)continue;
  const im=new Map(g.invoices.map(i=>[i.invoiceNumber,i]));
  for(const p of g.payments){
   const r=bm.get(p.id),ns=p.electronicInvoiceNumbers;
   if(!r||r.visibilityClass!=='supplier_company'||r.recipientNameStatus!=='verified_statement_field'||!clean(r.recipientName)||p.supplementary||p.referenceEvidenceIncomplete!==false||p.referenceBasis!=='source_exact_or_whitespace'||r.date!==p.date||u(r.amount)!==u(p.amount)||ns?.length!==6||new Set(ns).size!==6)continue;
   if(hash([...prefix,p.id,p.date,f(u(p.amount)),clean(r.purpose),clean(r.recipientName),[...ns].sort()])!==payKey)continue;
   const entries=ns.map(n=>[im.get(n),pm.get(n)]);
   if(entries.some(([i,q])=>!i||!q||i.date!==q.documentDate||u(i.sourceAmount)!==u(q.primaryAmount)||!clean(q.supplierName)||i.reviewRequired!==q.sourceReviewRequired||q.reviewReasons?.length!==(i.reviewRequired?1:0)||i.reviewRequired&&q.reviewReasons[0]!=='source_status_requires_review'))continue;
   if(new Set(entries.map(([,q])=>clean(q.supplierName))).size!==1)continue;
   const keys=entries.map(([i,q])=>hash([...prefix,'owner-application-status-v1',i.invoiceNumber,i.date,f(u(i.sourceAmount)),f(u(i.comparisonAmount)),clean(q.supplierName),q.sourceStatus,i.reviewRequired,q.reviewReasons]));
   const held=entries.filter(([i],index)=>i.reviewRequired&&keys[index]===heldKey);
   if(held.length!==1||entries.filter(([i])=>i.reviewRequired).length!==1||originalInvoicesKey(keys)!==docSet||entries.reduce((s,[i])=>s+u(i.comparisonAmount),0n)!==u(p.amount))continue;
   if(all.some(other=>other!==p&&[...other.electronicInvoiceNumbers,other.verifiedInvoiceNumber].some(n=>ns.includes(n))))continue;
   if(picked)return groups;
   picked={g,p,i:held[0][0]};
  }
 }
 if(!picked)return groups;
 return groups.map(g=>g!==picked.g?g:{...g,eligibleInvoiceAmount:f(u(g.eligibleInvoiceAmount)+u(picked.i.comparisonAmount)),sourceInvoiceAmount:f(u(g.sourceInvoiceAmount)+u(picked.i.sourceAmount)),invoices:g.invoices.map(i=>i!==picked.i?i:{...i,ownerApprovedSettlementPaymentId:picked.p.id})});
}
