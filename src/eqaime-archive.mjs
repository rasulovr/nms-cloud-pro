// Local view preference only: never stores names, amounts, invoice/payment data.
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const supplierKey=/^supplier-[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
export const archiveStorageKey=userId=>uuid.test(userId||'')?'rms:eqaime:supplier-archive:v1:'+userId:null;
export function readArchive(storage,key){
 try{if(!key)return {ids:[],persistent:false};const raw=storage.getItem(key);if(!raw)return {ids:[],persistent:true};if(raw.length>50000)throw Error();const v=JSON.parse(raw);if(v.version!==1||!Array.isArray(v.ids)||v.ids.length>1000||v.ids.some(x=>typeof x!=='string'||!supplierKey.test(x)))throw Error();return {ids:[...new Set(v.ids)],persistent:true}}catch{return {ids:[],persistent:false}}
}
export function writeArchive(storage,key,ids){try{if(!key||ids.length>1000||ids.some(x=>!supplierKey.test(x)))return false;storage.setItem(key,JSON.stringify({version:1,ids:[...new Set(ids)]}));return true}catch{return false}}
export function changeArchive(ids,id,archived){if(!supplierKey.test(id))return ids;return archived?[...new Set([...ids,id])]:ids.filter(x=>x!==id)}
export function isArchiveSwipe(start,end){return !!start&&end.x-start.x<=-80&&Math.abs(end.y-start.y)<35&&Math.abs(end.y-start.y)*2<Math.abs(end.x-start.x)}
