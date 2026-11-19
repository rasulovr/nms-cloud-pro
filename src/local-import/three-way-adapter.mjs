import {identityKey} from './identity.mjs';
import {projectThreeWay} from './three-way.mjs';
export async function localThreeWay(source,result,selectedOwner){
 if(!source||source.ready!==true||!result||!selectedOwner)return null;
 const owners=[];for(const e of source.legalEntities||[])if(e.is_active!==false&&/^\d{10}$/.test(e.voen||'')&&await identityKey(e.voen)===selectedOwner)owners.push(e);
 if(owners.length!==1)return null;const entityId=owners[0].id;
 const supplierBindings=[];for(const s of source.suppliers||[])if(s.is_active!==false&&/^\d{10}$/.test(s.voen||''))supplierBindings.push({rmsSupplierId:s.id,supplierKey:await identityKey(s.voen),entityId,verified:true});
 const purchases=(source.purchases||[]).filter(p=>p.legal_entity_id===entityId&&!p.deleted_at),storedInvoices=(source.invoices||[]).filter(p=>p.legal_entity_id===entityId&&!p.deleted_at),ids=new Set(storedInvoices.map(e=>e.id));
 if(result.invoiceRows.some(i=>i.original.buyerVoen!==selectedOwner)||result.paymentRows.some(p=>p.original.ownerVoen!==selectedOwner))throw Error('Mixed local owner');
 const portalInvoices=result.invoiceRows.map(i=>({id:i.id,entityId,supplierKey:i.original.sellerVoen,invoiceNumber:i.original.invoiceNumber,amount:i.original.amount,date:i.original.date,status:i.original.status,reviewRequired:i.original.reviewRequired||i.reasons.includes('conflicting_duplicate')}));
 const payments=new Map(result.paymentRows.map(p=>[p.id,p]));
 const bankEdges=result.edges.map(e=>({paymentId:e.paymentId,portalId:e.invoiceId,entityId,supplierKey:payments.get(e.paymentId)?.original.recipientVoen,verified:true}));
 return projectThreeWay({entityId,purchases,storedInvoices,links:(source.links||[]).filter(l=>ids.has(l.e_invoice_id)),portalInvoices,bankEdges,supplierBindings});
}
