import {sourceUnits} from './eqaime-money.mjs';
const token=/MT\s*\d{4}\s*\d{8}|EB[A-Z]{2}\s*\d{6}/g;
export function sourceReferences(p,legacy,allInvoices){
 // Known textual separators verified in source statements; never arbitrary ID suffixes.
 const purpose=p.purpose.toUpperCase().replace(/(?<![A-Z0-9])(E-QAIME)(?=MT\s*\d{4}\s*\d{8}(?![A-Z0-9]))/g,'$1 ').replace(/(?<![A-Z0-9])(MT\s*\d{4}\s*\d{8})(?=QALIQ BORC(?:UN ODENILMESI)?(?![A-Z0-9])|L F4-(?:62|91)(?![A-Z0-9]))/g,'$1 '),matches=[...purpose.matchAll(token)],accepted=[];
 for(let i=0;i<matches.length;){let j=i;while(j+1<matches.length&&matches[j].index+matches[j][0].length===matches[j+1].index)j++;const start=matches[i].index,end=matches[j].index+matches[j][0].length;if(!/[A-Z0-9]/.test(purpose[start-1]||' ')&&!/[A-Z0-9]/.test(purpose[end]||' '))accepted.push(...matches.slice(i,j+1));i=j+1}
 const refs=[...new Set(accepted.map(m=>m[0].replace(/\s/g,'')))];let remainder=purpose;for(const m of [...accepted].reverse())remainder=remainder.slice(0,m.index)+' '+remainder.slice(m.index+m[0].length);if(p.bankReference)remainder=remainder.split(p.bankReference.toUpperCase()).join(' ');
 remainder=remainder.replace(/L\s*F4\s*-\s*91961/g,' ');
 const residual=[...new Set(remainder.match(/\d{5,}/g)||[])],crosswalk=[];
 for(const suffix of residual){if(!/^\d{12}$/.test(suffix)||![...remainder.matchAll(/(?<![A-Z0-9])\d{12}(?![A-Z0-9])/g)].some(m=>m[0]===suffix))continue;const matches=allInvoices.filter(i=>i.invoiceNumber.endsWith(suffix));if(matches.length===1&&legacy.electronicInvoiceNumbers.includes(matches[0].invoiceNumber)&&legacy.verifiedInvoiceNumber===matches[0].invoiceNumber){refs.push(matches[0].invoiceNumber);crosswalk.push(suffix)}}
 const unresolved=residual.filter(n=>!crosswalk.includes(n));
 return {electronicInvoiceNumbers:[...new Set(refs)],referenceEvidenceIncomplete:!refs.length||unresolved.length>0,referenceBasis:crosswalk.length?'source_and_previously_verified_unique_suffix':'source_exact_or_whitespace'};
}
export function applyReferenceEvidence(groups,bank){
 const byId=new Map(bank.rows.map(p=>[p.id,p]));if(byId.size!==bank.rows.length)throw Error('Duplicate bank rows');const allInvoices=groups.flatMap(g=>g.invoices);const claimed=new Set();
 const result=groups.map(g=>({...g,payments:g.payments.map(p=>{if(p.supplementary)return p;const raw=byId.get(p.id);if(!raw||claimed.has(p.id)||sourceUnits(raw.amount)!==sourceUnits(p.amount)||raw.date!==p.date||raw.visibilityClass!=='supplier_company'||typeof raw.purpose!=='string')throw Error('Bank reference binding');claimed.add(p.id);return {...p,...sourceReferences(raw,p,allInvoices)}})}));if(claimed.size!==byId.size)throw Error('Bank supplier coverage');return result;
}
