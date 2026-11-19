import {sourceUnits,formatUnits} from './eqaime-money.mjs';
const hash=/^[a-f0-9]{64}$/;
const exactKeys=(obj,keys)=>obj&&typeof obj==='object'&&!Array.isArray(obj)&&Object.keys(obj).every(k=>keys.includes(k))&&keys.every(k=>Object.hasOwn(obj,k));
// Only an immutable, owner-authenticated, hash-verified private source reaches this projection.
export function appendIncremental(groups,snapshot,{entityId,sourceHashes}){
 if(!exactKeys(snapshot,['version','kind','legalEntityId','sourceHashes','coverage','rows'])||snapshot.version!==1||snapshot.kind!=='verified_bank_incremental_17'||snapshot.legalEntityId!==entityId||!exactKeys(snapshot.sourceHashes,['primary','bank','balance','card'])||Object.entries(snapshot.sourceHashes).some(([k,v])=>!hash.test(v)||sourceHashes[k]!==v)||!exactKeys(snapshot.coverage,['complete','refundCoverageKnown','openingBalanceKnown'])||Object.values(snapshot.coverage).some(v=>v!==false)||!Array.isArray(snapshot.rows)||snapshot.rows.length!==17)throw Error('Incremental source unavailable');
 const map=new Map(groups.map(g=>[g.supplierKey,g])),ids=new Set(groups.flatMap(g=>g.payments.map(p=>p.id))),add=new Map();
 if(map.size!==groups.length||ids.size!==505||groups.reduce((n,g)=>n+g.payments.length,0)!==505||formatUnits(groups.flatMap(g=>g.payments).reduce((n,p)=>n+sourceUnits(p.amount),0n))!=='681621.87')throw Error('Incremental baseline changed');
 let sum=0n;
 for(const p of snapshot.rows){
  if(!exactKeys(p,['id','supplierKey','date','amount','currency','recipientName','invoiceNumbers','evidence'])||typeof p.id!=='string'||!/^SC-[a-f0-9]{64}$/.test(p.id)||ids.has(p.id)||typeof p.date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(p.date)||new Date(p.date+'T00:00:00Z').toISOString().slice(0,10)!==p.date||typeof p.amount!=='string'||!/^\d+\.\d{2}$/.test(p.amount)||sourceUnits(p.amount)<=0n||p.currency!=='AZN'||(p.recipientName!==null&&(typeof p.recipientName!=='string'||!p.recipientName.trim()||p.recipientName.length>300))||!Array.isArray(p.invoiceNumbers)||!p.invoiceNumbers.length||p.invoiceNumbers.length>100||new Set(p.invoiceNumbers).size!==p.invoiceNumbers.length||p.invoiceNumbers.some(n=>typeof n!=='string'||!/^(MT\d{12}|EB[A-Z]{2}\d{6})$/.test(n))||!exactKeys(p.evidence,['sourceSha256','page','row'])||!hash.test(p.evidence.sourceSha256)||!Number.isInteger(p.evidence.page)||p.evidence.page<1||!Number.isInteger(p.evidence.row)||p.evidence.row<1)throw Error('Incremental row invalid');
  const g=map.get(p.supplierKey);if(!g||!g.bankScopeAvailable||p.invoiceNumbers.some(n=>!g.invoices.some(i=>i.invoiceNumber===n)))throw Error('Incremental supplier scope changed');
  ids.add(p.id);sum+=sourceUnits(p.amount);if(!add.has(p.supplierKey))add.set(p.supplierKey,[]);
  add.get(p.supplierKey).push({id:p.id,date:p.date,amount:p.amount,recipientName:p.recipientName,bankRecipientName:p.recipientName,electronicInvoiceNumbers:[...p.invoiceNumbers],verifiedInvoiceNumber:null,supplementary:true,incremental:true,sourceLabel:'Проверенная банковская выписка · дополнительная выборка',referenceEvidenceIncomplete:false,referenceBasis:'verified_statement_exact_references'});
 }
 if(formatUnits(sum)!=='13791.32'||ids.size!==522)throw Error('Incremental total changed');
 return groups.map(g=>add.has(g.supplierKey)?{...g,payments:[...g.payments,...add.get(g.supplierKey)]}:g);
}
