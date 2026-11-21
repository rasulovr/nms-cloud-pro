import {createHash} from 'node:crypto';
import {sourceUnits as u,formatUnits as f} from './eqaime-money.mjs';
import {reallocationScope,invoiceApprovalKey,originalInvoicesKey} from './eqaime-confirmed-reallocation.mjs';

const keepKey='c540766f2a01bea537cdc4e73ef8cbc7cc26a152abc5ee3c4619ec377d6c7687';
const moveKey='31c022b5af2cd8a7b95d286133bacee09ff4139b11cf3cd27d422efccc92f796';
const oldKey='1dc314af35ad4fc0d0bc281920f9bec59088cd518f05125e862ce5c922f97b41';
const targets=new Set(["6b59928b396692343ad7f2c0a93a604c5b09a99fcd5d52afc911a4cd119ed866","6607bcc9d51a71e76cf816acd0d46989534a7b1c157612b77bbe86cb84942be5","acfd61a6686bbaf924a6a68b9a891b72e83d6dd3cb7e4b7d921f8225fd98934f"]);
const clean=v=>typeof v==='string'?v.normalize('NFKC').trim().replace(/\s+/g,' ').toUpperCase():'';
const hash=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');

function paymentKey(scope,p,r){
 if(!r||r.visibilityClass!=='supplier_company'||r.recipientNameStatus!=='verified_statement_field'||!clean(r.recipientName)||p.supplementary||p.referenceEvidenceIncomplete!==false||p.referenceBasis!=='source_exact_or_whitespace'||r.date!==p.date||u(r.amount)!==u(p.amount)||p.electronicInvoiceNumbers?.length!==6||new Set(p.electronicInvoiceNumbers).size!==6)return null;
 return hash([...scope,p.id,p.date,f(u(p.amount)),clean(r.purpose),clean(r.recipientName),[...p.electronicInvoiceNumbers].sort()]);
}

// Keep both original bank rows and the unedited repeated memo. Only the
// one verified and owner-directed relationship changes; exact cents still apply.
export function applyApprovedHistoricalReallocation(groups,bank,primaryRows,env,scope){
 const prefix=reallocationScope(env,scope);if(!prefix)return groups;
 const bm=new Map(bank.rows.map(r=>[r.id,r])),pm=new Map(primaryRows.map(r=>[r.invoiceNumber,r]));
 const all=groups.flatMap(g=>g.payments),allI=groups.flatMap(g=>g.invoices);
 if(bm.size!==bank.rows.length||pm.size!==primaryRows.length||new Set(all.map(p=>p.id)).size!==all.length||new Set(allI.map(i=>i.invoiceNumber)).size!==allI.length)return groups;
 let selected=null;
 for(const g of groups){
  if(!g.bankScopeAvailable)continue;
  const keep=g.payments.filter(p=>paymentKey(prefix,p,bm.get(p.id))===keepKey),move=g.payments.filter(p=>paymentKey(prefix,p,bm.get(p.id))===moveKey);
  if(keep.length!==1||move.length!==1)continue;
  const [first]=keep,[second]=move,old=[...first.electronicInvoiceNumbers].sort();
  if(old.join('|')!==[...second.electronicInvoiceNumbers].sort().join('|'))continue;
  const im=new Map(g.invoices.map(i=>[i.invoiceNumber,i]));
  const keys=old.map(n=>invoiceApprovalKey(prefix,im.get(n),pm.get(n)));
  if(keys.some(k=>!k)||originalInvoicesKey(keys)!==oldKey)continue;
  const fresh=g.invoices.filter(i=>targets.has(invoiceApprovalKey(prefix,i,pm.get(i.invoiceNumber))));
  if(fresh.length!==3)continue;
  const numbers=fresh.map(i=>i.invoiceNumber).sort(),involved=new Set([...old,...numbers]);
  if(involved.size!==9||all.some(p=>p!==first&&p!==second&&[...p.electronicInvoiceNumbers,p.verifiedInvoiceNumber].some(n=>involved.has(n))))continue;
  if(old.reduce((s,n)=>s+u(im.get(n).comparisonAmount),0n)+3000000n!==u(first.amount)||fresh.reduce((s,i)=>s+u(i.comparisonAmount),0n)-1000000n!==u(second.amount))continue;
  if(selected)return groups;
  selected={g,second,old,numbers};
 }
 if(!selected)return groups;
 return groups.map(g=>g!==selected.g?g:{...g,payments:g.payments.map(p=>p!==selected.second?p:{...p,electronicInvoiceNumbers:selected.numbers,referenceBasis:'owner_approved_reallocation',ownerConfirmedReallocation:{originalInvoiceNumbers:selected.old}})});
}
