// Local-only read projection. No I/O, writes, payment allocation or inferred delivery events.
const exactNumber=s=>typeof s==='string'&&/^(MT\d{12}|EB[A-Z]{2}\d{6})$/.test(s);
export const isTechnicalPurchaseComment=s=>/hiss[əe]vi|частич|synthetic|placeholder/i.test(String(s||''));
const synthetic=isTechnicalPurchaseComment;
const amount=s=>{if(!/^\d+(?:\.\d{1,8})?$/.test(String(s)))return null;const[a,b='']=String(s).split('.');return BigInt(a)*100000000n+BigInt(b.padEnd(8,'0'))};
function unique(rows){const m=new Map();for(const r of rows){if(!r.id||m.has(r.id))throw Error('Duplicate or absent source id');m.set(r.id,r)}return m}
export function projectThreeWay({entityId,purchases,storedInvoices,links,portalInvoices,bankEdges,supplierBindings}){
 if(typeof entityId!=='string'||!entityId.trim())throw Error('Owner scope required');
 const paymentScopes=new Map();for(const e of bankEdges){if(!e.paymentId)throw Error('Missing payment id');const scope=e.entityId+'|'+e.supplierKey;if(paymentScopes.has(e.paymentId)&&paymentScopes.get(e.paymentId)!==scope)throw Error('Cross-scope payment');paymentScopes.set(e.paymentId,scope)}
 const pmap=unique(purchases),emap=unique(storedInvoices),qmap=unique(portalInvoices);unique(links);
 const bindings=new Map();for(const b of supplierBindings){if(typeof b.rmsSupplierId!=='string'||!b.rmsSupplierId||typeof b.supplierKey!=='string'||!b.supplierKey)throw Error('Missing supplier binding identity');if(b.entityId!==entityId||b.verified!==true)continue;if(bindings.has(b.rmsSupplierId)&&bindings.get(b.rmsSupplierId)!==b.supplierKey)throw Error('Ambiguous supplier binding');bindings.set(b.rmsSupplierId,b.supplierKey)}
 const byNumber=new Map();for(const q of qmap.values()){if(q.deleted_at||typeof q.supplierKey!=='string'||!q.supplierKey||q.entityId!==entityId||!exactNumber(q.invoiceNumber))continue;const key=q.supplierKey+'|'+q.invoiceNumber;if(byNumber.has(key))throw Error('Ambiguous portal identity');byNumber.set(key,q)}
 const inherited=[],review=[],seen=new Set(),purchaseUses=new Map();
 for(const l of links){const p=pmap.get(l.purchase_id),e=emap.get(l.e_invoice_id);let reason;
 if(l.deleted_at||!p||!e||p.deleted_at||e.deleted_at)reason='missing_or_deleted_source';
 else if(!p.supplier_id||!e.supplier_id||p.legal_entity_id!==entityId||e.legal_entity_id!==entityId||p.supplier_id!==e.supplier_id)reason='owner_or_supplier_mismatch';
 else if(!exactNumber(e.invoice_number)||synthetic(e.invoice_number)||synthetic(p.invoice_number)||p.syntheticPurchase===true||synthetic(p.comment))reason='synthetic_or_noncanonical_card';
 const supplierKey=e&&bindings.get(e.supplier_id),q=e&&byNumber.get(supplierKey+'|'+e.invoice_number);
 if(!reason&&!q){const candidates=[...qmap.values()].filter(v=>!v.deleted_at&&v.supplierKey&&v.entityId===entityId&&v.invoiceNumber===e.invoice_number);if(!supplierKey&&candidates.length===1)review.push({linkId:l.id,purchaseId:p.id,portalId:candidates[0].id,basis:'existing_rms_link_unverified_supplier',physicalDocumentVerified:false,reason:'supplier_identity_unverified',label:'Связь записана в RMS; VÖEN поставщика не подтверждён',paymentAllocation:null});else review.push({linkId:l.id,reason:'unverified_supplier_or_missing_portal'});continue}
 if(!reason&&amount(q.amount)===null)reason='invalid_portal_amount';
 if(!reason&&(q.reviewRequired||q.status!=='accepted'))reason='portal_status_review';
 const key=p&&q?p.id+'|'+q.id:null;if(!reason&&seen.has(key))reason='duplicate_stored_link';
 if(!reason&&(amount(l.linked_amount)===null||amount(p.total_amount)===null||amount(l.linked_amount)>amount(p.total_amount)))reason='invalid_stored_link_amount';
 if(reason){review.push({linkId:l.id,reason});continue}seen.add(key);
 const item={linkId:l.id,purchaseId:p.id,portalId:q.id,invoiceNumber:q.invoiceNumber,purchaseDate:p.purchase_date,portalDate:q.date,storedLinkedAmount:String(l.linked_amount),purchaseAmount:String(p.total_amount),portalAmount:String(q.amount),basis:'existing_rms_link',physicalDocumentVerified:false,paymentAllocation:null};
 inherited.push(item);purchaseUses.set(p.id,(purchaseUses.get(p.id)||0n)+amount(l.linked_amount));
 }
 const held=new Set(inherited.filter(r=>purchaseUses.get(r.purchaseId)>amount(r.purchaseAmount)).map(r=>r.purchaseId));
 const safe=inherited.filter(r=>!held.has(r.purchaseId));for(const r of inherited.filter(r=>held.has(r.purchaseId)))review.push({linkId:r.linkId,reason:'stored_links_exceed_purchase'});
 const portalIds=new Set(safe.map(r=>r.portalId));const edges=bankEdges.filter(e=>portalIds.has(e.portalId)&&e.verified===true&&e.entityId===entityId&&qmap.get(e.portalId)?.supplierKey===e.supplierKey).map(e=>({paymentId:e.paymentId,portalId:e.portalId,basis:'existing_reviewed_bank_reference',amount:null}));
 const edgeSet=new Set();for(const e of edges){const k=e.paymentId+'|'+e.portalId;if(edgeSet.has(k))throw Error('Duplicate bank edge');edgeSet.add(k)}
 return {storedLinks:safe,bankEdges:edges,review,totalsChanged:false,finalDebt:null,paymentAllocation:null};
}
