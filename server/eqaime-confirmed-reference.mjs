import {createHash} from 'node:crypto';
import {sourceUnits as u,formatUnits as f} from './eqaime-money.mjs';

const sources=['PRIMARY','BANK','BALANCE','CARD','INCREMENTAL'];
const digest=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
const approved='449c18776e7dc934ec9cfd6f74e691c3eda4f336ce5cd2046eecce256780cb99';
const full=/^MT\d{12}$/;
const short=/(?<![A-Z0-9])MT\d{11}(?![A-Z0-9])/g;
const normalizedPurpose=v=>typeof v==='string'?v.trim().replace(/\s+/g,' ').toUpperCase():'';
const cash=v=>f(u(v));
const identity=v=>typeof v==='string'?v.normalize('NFKC').trim().replace(/\s+/g,' ').toUpperCase():'';

function bindingScope(env,scope){
 if(env?.VERCEL_ENV!=='preview'||!scope?.allowedAuthUserId||!scope.legalEntityId)return null;
 const hashes=sources.map(k=>{try{return JSON.parse(env['RMS_EQAIME_'+k+'_SOURCE']).sha256}catch{return null}});
 if(hashes.some(h=>typeof h!=='string'||!/^[a-f0-9]{64}$/.test(h)))return null;
 return ['rms-eqaime-approved-group-completion-v2',scope.allowedAuthUserId,scope.legalEntityId,...hashes];
}

export function approvalFingerprint(env,scope,raw,payment,correction,invoices,primaryByNumber){
 const prefix=bindingScope(env,scope);
 if(!prefix)return null;
 return digest([...prefix,payment.id,payment.date,cash(payment.amount),normalizedPurpose(raw.purpose),identity(raw.recipientName),correction,[...invoices].sort((a,b)=>a.invoiceNumber.localeCompare(b.invoiceNumber)).map(i=>[i.invoiceNumber,i.date,cash(i.sourceAmount),cash(i.comparisonAmount),identity(primaryByNumber.get(i.invoiceNumber)?.supplierName),primaryByNumber.get(i.invoiceNumber)?.sourceStatus])]);
}

// Owner-approved completion for exactly one existing bank record and group.
// It does not add a general truncated-reference rule or replace the bank text.
export function applyApprovedReferenceCompletion(groups,bank,primaryRows,env,scope){
 if(!bindingScope(env,scope))return groups;
 const allInvoices=groups.flatMap(g=>g.invoices);
 const allPayments=groups.flatMap(g=>g.payments);
 const pByNumber=new Map(primaryRows.map(r=>[r.invoiceNumber,r]));
 const bankById=new Map(bank.rows.map(row=>[row.id,row]));
 if(pByNumber.size!==primaryRows.length||bankById.size!==bank.rows.length)return groups;
 let result=null;
 for(const g of groups){
  if(!g.bankScopeAvailable)continue;
  for(const p of g.payments){
   const raw=bankById.get(p.id);
   const refs=p.electronicInvoiceNumbers;
   if(!raw||raw.visibilityClass!=='supplier_company'||raw.recipientNameStatus!=='verified_statement_field'||!identity(raw.recipientName)||p.supplementary||p.referenceEvidenceIncomplete!==true||p.referenceBasis!=='source_exact_or_whitespace'||refs?.length!==3||new Set(refs).size!==3||refs.some(n=>!full.test(n)))continue;
   const purpose=normalizedPurpose(raw.purpose);
   const abbreviated=[...purpose.matchAll(short)];
   if(abbreviated.length!==1)continue;
   const from=abbreviated[0][0];
   const candidates=allInvoices.filter(i=>full.test(i.invoiceNumber)&&i.invoiceNumber.startsWith(from));
   if(candidates.length!==1||!g.invoices.includes(candidates[0])||refs.includes(candidates[0].invoiceNumber))continue;
   const to=candidates[0].invoiceNumber, numbers=[...refs,to];
   if(allPayments.some(pay=>pay!==p&&(pay.id===p.id||pay.electronicInvoiceNumbers.some(n=>numbers.includes(n)))))continue;
   if(raw.date!==p.date||u(raw.amount)!==u(p.amount))continue;
   const invoices=numbers.map(n=>g.invoices.find(i=>i.invoiceNumber===n));
   if(invoices.some(i=>!i||i.reviewRequired!==false))continue;
   if(invoices.some(i=>{const q=pByNumber.get(i.invoiceNumber);return !q||!identity(q.supplierName)||q.documentDate!==i.date||q.sourceReviewRequired!==false||q.reviewReasons?.length!==0||u(q.primaryAmount)!==u(i.sourceAmount)}))continue;
   if(invoices.reduce((n,i)=>n+u(i.comparisonAmount),0n)!==u(p.amount))continue;
   const correction={from,to};
   if(approvalFingerprint(env,scope,raw,p,correction,invoices,pByNumber)!==approved)continue;
   if(result)return groups;
   result={group:g,payment:p,numbers,correction};
  }
 }
 if(!result)return groups;
 return groups.map(g=>g!==result.group?g:{...g,payments:g.payments.map(p=>p!==result.payment?p:{...p,electronicInvoiceNumbers:result.numbers,referenceEvidenceIncomplete:false,referenceBasis:'owner_confirmed_group_completion',referenceCorrection:result.correction})});
}
