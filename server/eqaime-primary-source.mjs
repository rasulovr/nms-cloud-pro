import {createHash} from 'node:crypto';
// Disabled unless explicitly configured after storage policy isolation is verified.
// Private bucket status alone is NOT proof of correct RLS policies.
export function privateSourceLoader(client,raw,scope,{maxSourceBytes=2500000}={}){
 if(!raw)return undefined;
 if(!Number.isSafeInteger(maxSourceBytes)||maxSourceBytes<2||maxSourceBytes>20000000)throw Error('Source limit unavailable');
 const c=JSON.parse(raw);
 const keys=['version','enabled','legalEntityId','allowedAuthUserId','bucket','object','sha256'];
 if(!c||c.version!==1||c.enabled!==true||c.legalEntityId!==scope.legalEntityId||c.allowedAuthUserId!==scope.allowedAuthUserId||Object.keys(c).some(k=>!keys.includes(k))||!/^[a-z0-9-]{3,63}$/.test(c.bucket||'')||typeof c.object!=='string'||!/^snapshots\/[a-zA-Z0-9_-]+\.json$/.test(c.object)||!/^[a-f0-9]{64}$/.test(c.sha256||''))throw Error('Primary configuration unavailable');
 return async({entityId,signal})=>{
  if(signal?.aborted||entityId!==c.legalEntityId)throw Error('Primary unavailable');
  const {data:bucket,error:be}=await client.storage.getBucket(c.bucket);
  if(signal?.aborted||be||bucket?.id!==c.bucket||bucket.public!==false)throw Error('Primary unavailable');
  const {data,error}=await client.storage.from(c.bucket).download(c.object,{}, {signal,cache:'no-store'});
  if(signal?.aborted||error||!data||data.size>maxSourceBytes||data.size<2)throw Error('Primary unavailable');
  const bytes=Buffer.from(await data.arrayBuffer());
  if(signal?.aborted||bytes.length<2||bytes.length>maxSourceBytes||bytes.length!==data.size||createHash('sha256').update(bytes).digest('hex')!==c.sha256)throw Error('Primary unavailable');
  const snapshot=JSON.parse(bytes.toString('utf8'));
  if(snapshot.legalEntityId!==entityId)throw Error('Primary unavailable');
  return snapshot;
 };
}
