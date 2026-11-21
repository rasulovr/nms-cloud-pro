import {isTechnicalPurchaseComment} from './three-way.mjs';
import {verifiedImportScope,entityScopeHash} from './owner.mjs';
import {identityKey} from './identity.mjs';
export function reducePurchaseComment(row){const {comment,...rest}=row;return {...rest,syntheticPurchase:isTechnicalPurchaseComment(comment)}}
const uuid=/^[a-f0-9]{8}-[a-f0-9-]{27}$/i;
async function pages(make,signal){const all=[];for(let offset=0;offset<=10000;offset+=500){if(signal?.aborted)throw Error('Cancelled');let q=make().order('id').range(offset,offset+499);if(signal)q=q.abortSignal(signal);const{data,error}=await q;if(error||!Array.isArray(data))throw Error('Не удалось проверить связи RMS');all.push(...data);if(all.length>10000)throw Error('Слишком много связей');if(data.length<500)return all}throw Error('Неполная выборка')}
export async function readThreeWaySource(client,knownEntities,selectedOwner,account,{signal,verify=verifiedImportScope}={}){
 const gate=await verify(client,{signal});if(!account||gate.account!==account)throw Error('Аккаунт изменён');
 const candidates=[];for(const e of knownEntities||[])if(uuid.test(e.id||'')&&e.is_active!==false&&/^\d{10}$/.test(e.voen||'')&&await entityScopeHash(e.id)===gate.scopeEntityHash)candidates.push(e);
 if(candidates.length!==1)throw Error('Плательщик не подтверждён в справочнике RMS');const entityId=candidates[0].id;if(await identityKey(candidates[0].voen)!==selectedOwner)throw Error('Файл другого плательщика');
 // No file text, invoice reference, taxpayer number or amount leaves this browser.
 // Filters contain only IDs freshly read from RMS or its already-loaded directory.
 const{data:entity,error}=await client.from('legal_entities').select('id,voen,is_active').eq('id',entityId).single();
 if(error||!entity||entity.is_active!==true||await identityKey(entity.voen)!==selectedOwner)throw Error('Плательщик RMS изменился');
 const invoices=await pages(()=>client.from('supplier_e_invoices').select('id,legal_entity_id,supplier_id,invoice_number,deleted_at').eq('legal_entity_id',entityId).is('deleted_at',null),signal);
 const bounded=(target,rows)=>{if(target.length+rows.length>10000)throw Error('Превышен предел связей');target.push(...rows)};
 const chunks=values=>Array.from({length:Math.ceil(values.length/100)},(_,i)=>values.slice(i*100,i*100+100));
 const links=[];for(const ids of chunks(invoices.map(r=>r.id)))bounded(links,await pages(()=>client.from('supplier_e_invoice_purchase_links').select('id,e_invoice_id,purchase_id,linked_amount').in('e_invoice_id',ids),signal));
 const purchases=[];for(const ids of chunks([...new Set(links.map(r=>r.purchase_id))]))bounded(purchases,await pages(()=>client.from('supplier_purchases').select('id,legal_entity_id,supplier_id,invoice_number,purchase_date,total_amount,deleted_at,comment').eq('legal_entity_id',entityId).is('deleted_at',null).in('id',ids),signal).then(rows=>rows.map(reducePurchaseComment)));
 const suppliers=[];for(const ids of chunks([...new Set(invoices.map(r=>r.supplier_id))]))bounded(suppliers,await pages(()=>client.from('suppliers').select('id,voen,is_active').in('id',ids),signal));
 const finalGate=await verify(client,{signal});if(signal?.aborted||finalGate.account!==account||finalGate.scopeEntityHash!==gate.scopeEntityHash)throw Error('Аккаунт или область изменены');
 if(invoices.some(r=>r.legal_entity_id!==entityId)||purchases.some(r=>r.legal_entity_id!==entityId))throw Error('Неверная область источника');
 return {ready:true,legalEntities:[entity],invoices,links,purchases,suppliers,readAt:new Date().toISOString()};
}
