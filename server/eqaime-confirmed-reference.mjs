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

const approvedStandalone='4a1e9ca07f122a50aa01f84bfd1375d2bbb56cc7d97af29de67f8ebb721fdd9c';
const withoutSeries=/(?<![A-Z0-9])\d{12}(?![A-Z0-9])/g;
export function approvedStandaloneFingerprint(env,scope,raw,p,i,q,correction){
 const prefix=bindingScope(env,scope);
 return prefix?digest(['approved-standalone-series-v1',...prefix,p.id,p.date,cash(p.amount),normalizedPurpose(raw.purpose),identity(raw.recipientName),correction,i.invoiceNumber,i.date,cash(i.sourceAmount),cash(i.comparisonAmount),identity(q.supplierName),q.sourceStatus]):null;
}

// One explicitly checked and approved case where the memo omitted the series.
// Binding includes exactly one unlinked invoice and one immutable bank row.
export function applyApprovedStandaloneCompletion(groups,bank,primaryRows,env,scope){
 if(!bindingScope(env,scope))return groups;
 const rawById=new Map(bank.rows.map(r=>[r.id,r])), pr=new Map(primaryRows.map(r=>[r.invoiceNumber,r]));
 if(rawById.size!==bank.rows.length||pr.size!==primaryRows.length)return groups;
 const invoices=groups.flatMap(g=>g.invoices), payments=groups.flatMap(g=>g.payments);
 if(new Set(payments.map(p=>p.id)).size!==payments.length)return groups;
 let match=null;
 for(const g of groups){
  if(!g.bankScopeAvailable)continue;
  for(const p of g.payments){
   const raw=rawById.get(p.id);
   if(!raw||raw.visibilityClass!=='supplier_company'||raw.recipientNameStatus!=='verified_statement_field'||!identity(raw.recipientName)||p.supplementary||p.referenceEvidenceIncomplete!==true||p.referenceBasis!=='source_exact_or_whitespace'||p.electronicInvoiceNumbers?.length!==0||raw.date!==p.date||u(raw.amount)!==u(p.amount))continue;
   const tokens=[...normalizedPurpose(raw.purpose).matchAll(withoutSeries)];if(tokens.length!==1)continue;
   const from=tokens[0][0],to='MT'+from;
   const candidates=invoices.filter(i=>i.invoiceNumber.endsWith(from));
   if(candidates.length!==1||candidates[0].invoiceNumber!==to||!g.invoices.includes(candidates[0])||payments.some(x=>x!==p&&x.electronicInvoiceNumbers.includes(to)))continue;
   const i=candidates[0],q=pr.get(to),correction={from,to};
   if(i.reviewRequired!==false||!q||!identity(q.supplierName)||q.sourceReviewRequired!==false||q.reviewReasons?.length!==0||q.documentDate!==i.date||u(q.primaryAmount)!==u(i.sourceAmount)||u(i.comparisonAmount)!==u(p.amount))continue;
   if(approvedStandaloneFingerprint(env,scope,raw,p,i,q,correction)!==approvedStandalone)continue;
   if(match)return groups;
   match={g,p,correction};
  }
 }
 if(!match)return groups;
 return groups.map(g=>g!==match.g?g:{...g,payments:g.payments.map(p=>p!==match.p?p:{...p,electronicInvoiceNumbers:[match.correction.to],referenceEvidenceIncomplete:false,referenceBasis:'owner_confirmed_group_completion',referenceCorrection:match.correction})});
}
