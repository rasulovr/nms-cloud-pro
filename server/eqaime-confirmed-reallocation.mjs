import {createHash} from 'node:crypto';
import {sourceUnits as u,formatUnits as f} from './eqaime-money.mjs';

const sourceNames=['PRIMARY','BANK','BALANCE','CARD','INCREMENTAL'];
const hash=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
const clean=v=>typeof v==='string'?v.normalize('NFKC').trim().replace(/\s+/g,' ').toUpperCase():'';
const approvedTransfer='6f8a3d1504dab8b5bc249431919cd8edc31dcb9a7f6d740cc5e50558785af3e2';
const originalCoverTransfer='9cf235a0258363064aabf5f6b637fe124ce0d47677e73ac7637bc216aac96070';
const approvedOriginalInvoices='44ead7875c3e5a82184910de6f765a00dd9c666f2bd16e2066786761e10f1813';
const approvedNewInvoices=new Set(['d038075625cd444ce11432c990453c0309f0fc0a4b6681490a08bdb69369d197','b53dc49d532b22079a1de9997a7e8a9c87bfcf97d4231431c6650255ef145caa','75ac308b88a4fae0613a3405a4accd38c028df7c61864c1a402f8c1408d1a408','38695704653309cc6a61fa65cd486121ba7bf7fb465f79d2101dbb485c3b79d2','95d33f1a1dd0872a950891a1fe30e379186f40d4f8ca17a6b89d7591ace17984']);

export function reallocationScope(env,scope){
 if(env?.VERCEL_ENV!=='preview'||!scope?.allowedAuthUserId||!scope.legalEntityId)return null;
 const hashes=sourceNames.map(k=>{try{return JSON.parse(env['RMS_EQAIME_'+k+'_SOURCE']).sha256}catch{return null}});
 if(hashes.some(h=>typeof h!=='string'||!/^[a-f0-9]{64}$/.test(h)))return null;
 return ['rms-eqaime-owner-approved-reallocation-v1',scope.allowedAuthUserId,scope.legalEntityId,...hashes];
}

export function transferApprovalKey(prefix,p,raw){
 if(!prefix||!raw||raw.visibilityClass!=='supplier_company'||raw.recipientNameStatus!=='verified_statement_field'||!clean(raw.recipientName)||p.supplementary||p.referenceEvidenceIncomplete!==false||p.referenceBasis!=='source_exact_or_whitespace'||raw.date!==p.date||u(raw.amount)!==u(p.amount)||p.electronicInvoiceNumbers?.length!==9||new Set(p.electronicInvoiceNumbers).size!==9)return null;
 return hash([...prefix,p.id,p.date,f(u(p.amount)),clean(raw.purpose),clean(raw.recipientName),[...p.electronicInvoiceNumbers].sort()]);
}

export function invoiceApprovalKey(prefix,i,r){
 if(!prefix||!i||!r||i.reviewRequired!==false||r.sourceReviewRequired!==false||r.reviewReasons?.length!==0||!clean(r.supplierName)||i.date!==r.documentDate||u(i.sourceAmount)!==u(r.primaryAmount))return null;
 return hash([...prefix,i.invoiceNumber,i.date,f(u(i.sourceAmount)),f(u(i.comparisonAmount)),clean(r.supplierName),r.sourceStatus]);
}
export function originalInvoicesKey(keys){return hash([...keys].sort())}

// Approval applies to this one true transfer only. Both original bank rows and
// the repeated memo are immutable; no synthetic payment or settlement is inserted.
export function applyApprovedReallocation(groups,bank,primaryRows,env,scope){
 const prefix=reallocationScope(env,scope);if(!prefix)return groups;
 const bmap=new Map(bank.rows.map(r=>[r.id,r])),pr=new Map(primaryRows.map(r=>[r.invoiceNumber,r]));
 if(bmap.size!==bank.rows.length||pr.size!==primaryRows.length)return groups;
 const allPayments=groups.flatMap(g=>g.payments);
 if(new Set(allPayments.map(p=>p.id)).size!==allPayments.length)return groups;
 let found=null;
 for(const g of groups){
  if(!g.bankScopeAvailable)continue;
  const find=k=>g.payments.filter(p=>transferApprovalKey(prefix,p,bmap.get(p.id))===k);
  const reassign=find(approvedTransfer),keep=find(originalCoverTransfer);if(reassign.length!==1||keep.length!==1)continue;
  const [incoming]=reassign,[covered]=keep;
  const oldRefs=[...covered.electronicInvoiceNumbers].sort(),incomingRefs=[...incoming.electronicInvoiceNumbers].sort();
  if(oldRefs.some((n,i)=>n!==incomingRefs[i]))continue;
  const invoices=new Map(g.invoices.map(i=>[i.invoiceNumber,i]));if(invoices.size!==g.invoices.length)continue;
  const oldRows=oldRefs.map(n=>invoices.get(n));
  const oldKeys=oldRows.map((i,j)=>invoiceApprovalKey(prefix,i,pr.get(oldRefs[j])));
  if(oldKeys.some(k=>!k)||originalInvoicesKey(oldKeys)!==approvedOriginalInvoices||oldRows.reduce((s,i)=>s+u(i.comparisonAmount),0n)!==u(covered.amount))continue;
  const approved=g.invoices.filter(i=>approvedNewInvoices.has(invoiceApprovalKey(prefix,i,pr.get(i.invoiceNumber))));
  if(approved.length!==approvedNewInvoices.size||approved.reduce((s,i)=>s+u(i.comparisonAmount),0n)!==u(incoming.amount))continue;
  const targets=approved.map(i=>i.invoiceNumber).sort();
  const involved=[...oldRefs,...targets];
  if(new Set(involved).size!==14||allPayments.some(p=>p!==covered&&p!==incoming&&p.electronicInvoiceNumbers.some(n=>involved.includes(n))))continue;
  if(found)return groups;
  found={group:g,incoming,targets,oldRefs};
 }
 if(!found)return groups;
 return groups.map(g=>g!==found.group?g:{...g,payments:g.payments.map(p=>p!==found.incoming?p:{...p,electronicInvoiceNumbers:found.targets,referenceBasis:'owner_approved_reallocation',ownerConfirmedReallocation:{originalInvoiceNumbers:found.oldRefs}})});
}
