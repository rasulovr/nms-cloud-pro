import {sourceUnits as units} from './eqaime-money.mjs';

const hex=/^[0-9a-f]{64}$/;
const keys=(o,list)=>o&&Object.getPrototypeOf(o)===Object.prototype&&Object.keys(o).length===list.length&&list.every(k=>Object.hasOwn(o,k));
const canonical=n=>typeof n==='string'&&/^(?:MT\d{12}|EB[A-Z]{2}\d{6})$/.test(n);
const iso=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&new Date(s+'T00:00:00Z').toISOString().slice(0,10)===s;
// All input groups are for the same validated legal payer. Same date and rounded cents
// is an ambiguity, not a proof; fail closed even when an existing transfer has no reference.
const dateCents=(entityId,date,amount)=>entityId+':'+date+':'+((units(amount)+500000n)/1000000n);
const cents=s=>typeof s==='string'&&/^\d{1,9}\.\d{2}$/.test(s)&&units(s)>0n;
const name=s=>typeof s==='string'&&s.trim()===s&&s.length>0&&s.length<=160&&!/\d{5}|[\r\n@]/.test(s);
function fail(){throw Error('Historic supplement source mismatch')}

// Only called with the existing owner-authenticated immutable storage loader.
// A missing, changed or already reconciled invoice cannot be created or overridden.
export function appendVerifiedArchive(groups,rows,snapshot,{entityId,sourceHashes}){
 const bindings=['primary','bank','balance','card','incremental'];
 if(!keys(snapshot,['version','kind','legalEntityId','sourceHashes','components'])||snapshot.version!==1||snapshot.kind!=='verified_historic_supplier_subset'||!entityId||snapshot.legalEntityId!==entityId||!keys(snapshot.sourceHashes,bindings)||bindings.some(k=>!hex.test(snapshot.sourceHashes[k])||sourceHashes[k]!==snapshot.sourceHashes[k])||!Array.isArray(snapshot.components)||snapshot.components.length!==11)fail();
 const primary=new Map(rows.map(r=>[r.invoiceNumber,r])), owners=new Map(), occupied=new Set(), ids=new Set(), pay=new Map(), addedNumbers=new Set(), groupNames=new Set(), observedDateCents=new Set();
 let original=0n;
 if(primary.size!==rows.length||rows.length!==2306||groups.length!==56)fail();
 for(const g of groups){
   for(const i of g.invoices){if(owners.has(i.invoiceNumber))fail();owners.set(i.invoiceNumber,{g,i})}
   for(const p of g.payments){
     if(ids.has(p.id))fail();ids.add(p.id);original+=units(p.amount);observedDateCents.add(dateCents(entityId,p.date,p.amount));
     for(const n of [...p.electronicInvoiceNumbers,p.verifiedInvoiceNumber].filter(Boolean))occupied.add(n);
   }
   for(const c of g.settlementGroups||[])for(const n of c.invoiceNumbers||[])occupied.add(n);
 }
 if(ids.size!==522||original!==units('695413.19')||owners.size!==rows.length)fail();
 let total=0n,crosswalks=0;
 const groupDocs=new Map(), addedDateCents=new Set();
 for(const c of snapshot.components){
   if(!keys(c,['issuer','invoices','payments'])||!name(c.issuer)||!Array.isArray(c.invoices)||c.invoices.length<1||c.invoices.length>2||!Array.isArray(c.payments)||c.payments.length<1||c.payments.length>2)fail();
   let group=null,due=0n,paid=0n,covered=new Set();
   const numbers=new Set(c.invoices.map(i=>i.invoiceNumber));
   const dates=new Map();
   for(const e of c.invoices){
     if(!keys(e,['invoiceNumber','documentDate','amount','evidence'])||!canonical(e.invoiceNumber)||!iso(e.documentDate)||!cents(e.amount)||addedNumbers.has(e.invoiceNumber)||occupied.has(e.invoiceNumber)||!keys(e.evidence,['sourceSha256','row'])||!hex.test(e.evidence.sourceSha256)||!Number.isSafeInteger(e.evidence.row)||e.evidence.row<1)fail();
     const hit=owners.get(e.invoiceNumber),p=primary.get(e.invoiceNumber);
     if(!hit||!p||hit.i.reviewRequired||p.sourceReviewRequired||hit.i.date!==e.documentDate||p.documentDate!==e.documentDate||p.supplierName!==c.issuer||units(hit.i.amount)!==units(e.amount)||units(hit.i.comparisonAmount)!==units(e.amount)||units(p.primaryAmount)!==units(e.amount))fail();
     if(group&&group!==hit.g)fail();group=hit.g;
     addedNumbers.add(e.invoiceNumber);due+=units(e.amount);dates.set(e.invoiceNumber,e.documentDate);
   }
   groupNames.add(group.supplierKey);
   for(const p of c.payments){
     if(!keys(p,['id','date','amount','recipientName','literalRefs','contractRef','evidence'])||typeof p.id!=='string'||!/^SC-[a-f0-9]{64}$/.test(p.id)||ids.has(p.id)||!iso(p.date)||!cents(p.amount)||!name(p.recipientName)||!Array.isArray(p.literalRefs)||p.literalRefs.length>2||new Set(p.literalRefs).size!==p.literalRefs.length||p.literalRefs.some(n=>!numbers.has(n))||!keys(p.evidence,['sourceSha256','memoSha256','page','row'])||!hex.test(p.evidence.sourceSha256)||!hex.test(p.evidence.memoSha256)||!(p.evidence.page===null||Number.isSafeInteger(p.evidence.page)&&p.evidence.page>0)||!Number.isSafeInteger(p.evidence.row)||p.evidence.row<1)fail();
     const dateAmountKey=dateCents(entityId,p.date,p.amount);
     if(observedDateCents.has(dateAmountKey)||addedDateCents.has(dateAmountKey))fail();
     addedDateCents.add(dateAmountKey);
     const crosswalk=p.contractRef!==null;
     if(crosswalk){if(typeof p.contractRef!=='string'||!/^HF \d{1,4}\/20\d{2}$/.test(p.contractRef)||p.literalRefs.length||numbers.size!==1||c.payments.length!==2||p.date>c.invoices[0].documentDate)fail();crosswalks++;}
     else if(!p.literalRefs.length||p.literalRefs.some(n=>p.date<dates.get(n)))fail();
     const refs=crosswalk?[...numbers]:p.literalRefs;
     for(const n of p.literalRefs)covered.add(n);
     const sourceLabel=crosswalk?'Архивная банковская выписка · аванс по '+p.contractRef+'; номер e-qaimə указан в доплате': 'Архивная банковская выписка · номер e-qaimə указан в назначении';
     ids.add(p.id);paid+=units(p.amount);if(!pay.has(group.supplierKey))pay.set(group.supplierKey,[]);
     pay.get(group.supplierKey).push({id:p.id,date:p.date,amount:p.amount,recipientName:p.recipientName,bankRecipientName:p.recipientName,electronicInvoiceNumbers:[...refs],verifiedInvoiceNumber:null,supplementary:true,incremental:true,sourceLabel,referenceEvidenceIncomplete:false,referenceBasis:crosswalk?'verified_archive_contract_advance':'verified_archive_statement_exact_references'});
   }
   if(covered.size!==numbers.size||paid!==due||c.payments.length===2&&(c.payments.filter(p=>p.contractRef!==null).length!==1||c.payments[0].amount!==c.payments[1].amount||new Set(c.payments.map(p=>p.recipientName)).size!==1))fail();
   if(!groupDocs.has(group.supplierKey))groupDocs.set(group.supplierKey,0);groupDocs.set(group.supplierKey,groupDocs.get(group.supplierKey)+numbers.size);
   total+=paid;
 }
 if(ids.size!==534||addedNumbers.size!==12||groupNames.size!==2||crosswalks!==1||total!==units('10746.03')||[...groupDocs.values()].sort((a,b)=>a-b).join(',')!=='2,10')fail();
 for(const g of groups)if(pay.has(g.supplierKey)&&!g.bankScopeAvailable&&g.invoices.length!==groupDocs.get(g.supplierKey))fail();
 return groups.map(g=>pay.has(g.supplierKey)?{...g,bankScopeAvailable:true,payments:[...g.payments,...pay.get(g.supplierKey)]}:g);
}
