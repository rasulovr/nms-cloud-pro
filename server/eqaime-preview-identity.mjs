import {createHash} from 'node:crypto';
import {parseScope} from './eqaime-api.mjs';
// Reviewed protected rms_internal_auth_accounts mapping, 2026-11-18.
// Not a credential; never return mapping, UUID, email or digest to callers.
const trustedDigest='d37e67f08009a370b00e3ae8b6733a526aae02c1f4f89dfbd509d2314f1f1fbe';
export function makeIdentityHandler({createClient,env,timeoutMs=8000,expectedDigest=trustedDigest}){
 return async(req,res)=>{
  for(const k of ['Cache-Control','CDN-Cache-Control','Vercel-CDN-Cache-Control'])res.setHeader(k,'private, no-store, max-age=0');
  res.setHeader('Content-Type','application/json');res.setHeader('X-Content-Type-Options','nosniff');
  const send=(s,state,scopeEntityHash)=>res.status(s).end(JSON.stringify({state,...(state==='MATCH'&&scopeEntityHash?{scopeEntityHash}:{})}));
  if(env.VERCEL_ENV!=='preview')return send(404,'UNAVAILABLE');
  if(req.method!=='GET')return send(405,'UNAVAILABLE');
  if(req.headers?.['sec-fetch-site']==='cross-site')return send(403,'UNAVAILABLE');
  if(Object.keys(req.query||{}).length)return send(400,'UNAVAILABLE');
  const authorization=req.headers?.authorization;
  if(typeof authorization!=='string'||!/^Bearer [A-Za-z0-9_.-]{20,8192}$/.test(authorization))return send(401,'SIGN_IN_REQUIRED');
  let timer;
  try{
   const scope=parseScope(env.RMS_EQAIME_REVIEW_SCOPE);
   if(!env.VITE_SUPABASE_URL||!env.VITE_SUPABASE_ANON_KEY)throw Error();
   const hash=id=>createHash('sha256').update(id).digest('hex');
   if(hash(scope.allowedAuthUserId)!==expectedDigest)return send(503,'UNAVAILABLE');
   const client=createClient(env.VITE_SUPABASE_URL,env.VITE_SUPABASE_ANON_KEY,{global:{headers:{Authorization:authorization}},auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
   const result=await Promise.race([client.auth.getUser(authorization.slice(7)),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error()),timeoutMs)})]);
   const user=result.data?.user;
   if(result.error||!user||user.is_anonymous||typeof user.id!=='string')return send(401,'SIGN_IN_REQUIRED');
   const matched=user.id===scope.allowedAuthUserId&&hash(user.id)===expectedDigest;
   return send(200,matched?'MATCH':'MISMATCH',matched?'entity-sha256:v1:'+hash('rms-eqaime-legal-entity-v1:'+scope.legalEntityId):undefined);
  }catch{return send(503,'UNAVAILABLE')}finally{clearTimeout(timer)}
 };
}
