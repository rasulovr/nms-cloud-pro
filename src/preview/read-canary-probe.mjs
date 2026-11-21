// LOCAL CANDIDATE ONLY. Read-only; mount only in a reviewed preview deployment.
// Uses an existing ordinary RMS Supabase client. Never accesses getSession or tokens.
export const BUCKET = 'rms-eqaime-preview-private';
export const OBJECT = 'snapshots/canary.json';
export const CANARY = '{"kind":"rms-storage-synthetic-canary","version":1,"containsRealData":false}\n';
const blocked = (reason) => ({state:'BLOCKED',reason,checks:[],coverage:'read-only'});
const denied = e => Boolean(e && ([403,404].includes(Number(e.statusCode ?? e.status)) ||
  (Number(e.statusCode ?? e.status) === 400 && /^(Object not found|Bucket not found|new row violates row-level security policy|Unauthorized)$/i.test(e.message ?? ''))));
export async function runReadCanary({ownerClient,anonymousClient,expectedOwnerId,sha256}) {
 const checks=[];
 const record=(name,state)=>checks.push({name,state});
 try {
  if(!/^[0-9a-f-]{36}$/i.test(expectedOwnerId ?? '')) return blocked('Invalid owner configuration');
  const who=await ownerClient.auth.getUser();
  if(who.error || !who.data?.user || who.data.user.is_anonymous || who.data.user.id!==expectedOwnerId) return blocked('Owner sign-in required');
  // Anonymous client must be separately constructed with persistSession=false,
  // autoRefreshToken=false, detectSessionInUrl=false. Do not sign out owner's client.
  const anon=await anonymousClient.auth.getUser();
  if(anon.data?.user) return blocked('Anonymous client is not isolated');
  const b=await ownerClient.storage.getBucket(BUCKET);
  if(b.error || b.data?.id!==BUCKET || b.data.public!==false) return blocked('Private bucket not verified');
  const file=await ownerClient.storage.from(BUCKET).download(OBJECT);
  if(file.error || !file.data || file.data.size>1024) return blocked('Owner canary unavailable');
  const bytes=new Uint8Array(await file.data.arrayBuffer());
  const expected=new TextEncoder().encode(CANARY);
  if(bytes.length!==expected.length || bytes.some((x,i)=>x!==expected[i])) return blocked('Canary content mismatch');
  const digest=await sha256(bytes);
  record('owner-download-integrity','PASS');
  const list=await ownerClient.storage.from(BUCKET).list('snapshots',{limit:2,search:'canary.json'});
  record('owner-list',!list.error && list.data?.some(x=>x.name==='canary.json')?'PASS':'FAIL');
  const ab=await anonymousClient.storage.getBucket(BUCKET);
  record('anonymous-bucket',denied(ab.error)?'PASS':ab.error?'UNKNOWN':'FAIL');
  const af=await anonymousClient.storage.from(BUCKET).download(OBJECT);
  record('anonymous-download',denied(af.error)?'PASS':af.error?'UNKNOWN':'FAIL');
  const al=await anonymousClient.storage.from(BUCKET).list('snapshots',{limit:2,search:'canary.json'});
  record('anonymous-list',denied(al.error)||(!al.error && Array.isArray(al.data)&&al.data.length===0)?'PASS':al.error?'UNKNOWN':'FAIL');
  const end=await ownerClient.auth.getUser();
  if(end.error || end.data?.user?.id!==expectedOwnerId || end.data.user.is_anonymous) return blocked('Session changed; discard result');
  return {state:checks.every(x=>x.state==='PASS')?'READ_CHECKS_PASS':'INCOMPLETE',checks,digest,
   coverage:'Only owner/anonymous read checks. NOT full batch A verification.',
   notTested:['public-route','authenticated-non-owner HTTP','client mutations','signed URLs','existing bucket behavior']};
 } catch {return {state:'INCOMPLETE',checks,reason:'Probe unavailable; no error payload recorded',coverage:'read-only'};}
}
export function mountReadCanary(root,options){
 // No credentials form, token rendering, external telemetry or auto-run.
 const doc=root.ownerDocument,button=doc.createElement('button'),result=doc.createElement('pre');
 button.textContent='Проверить вымышленный файл (только чтение)';
 root.replaceChildren(button,result);let mounted=true;
 button.onclick=async()=>{button.disabled=true;result.textContent='Проверка…';
  const report=await runReadCanary(options);
  if(mounted){result.textContent=JSON.stringify(report,null,2);button.disabled=false;}};
 return ()=>{mounted=false;button.onclick=null;root.replaceChildren();};
}
