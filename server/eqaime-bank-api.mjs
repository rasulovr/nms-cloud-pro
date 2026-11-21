import {referenceGroups} from './eqaime-reference-source.mjs';
import {referenceBank} from './eqaime-exact-reference.mjs';
import {parseScope} from './eqaime-api.mjs';
import {privateSourceLoader} from './eqaime-primary-source.mjs';
import {enrichBankMatches} from './eqaime-bank-enrichment.mjs';
import {projectBank,bankPage} from './eqaime-bank.mjs';
export function makeBankHandler({createClient,env,timeoutMs=15000,loadSnapshot}){
 return async(req,res)=>{
  for(const k of ['Cache-Control','Vercel-CDN-Cache-Control','CDN-Cache-Control'])res.setHeader(k,'private, no-store, max-age=0');res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('X-Content-Type-Options','nosniff');
  const send=(s,b)=>res.status(s).end(JSON.stringify(b));
  if(req.method!=='GET')return send(405,{error:'Unavailable'});if(req.headers?.['sec-fetch-site']==='cross-site')return send(403,{error:'Access denied'});
  const authorization=req.headers?.authorization;if(typeof authorization!=='string'||!/^Bearer [A-Za-z0-9_.-]{20,8192}$/.test(authorization))return send(401,{error:'Authentication required'});
  const q=req.query||{};if(Object.keys(q).some(k=>!['page','from','to','search','supplier'].includes(k))||Object.values(q).some(v=>typeof v!=='string'))return send(400,{error:'Invalid filters'});
  const filters={page:q.page?Number(q.page):1,pageSize:100,from:q.from||'',to:q.to||'',search:q.search||'',supplier:q.supplier||''};try{bankPage({rows:[],coverage:{}},filters)}catch{return send(400,{error:'Invalid filters'})}
  const controller=new AbortController();let timer;
  try{
   const result=await Promise.race([(async()=>{
    const scope=parseScope(env.RMS_EQAIME_REVIEW_SCOPE);const client=createClient(env.VITE_SUPABASE_URL,env.VITE_SUPABASE_ANON_KEY,{global:{headers:{Authorization:authorization}},auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
    const {data,error}=await client.auth.getUser(authorization.slice(7));if(error||!data?.user||data.user.is_anonymous)return {status:401,body:{error:'Authentication required'}};if(data.user.id!==scope.allowedAuthUserId)return {status:403,body:{error:'Access denied'}};if(controller.signal.aborted)throw Error();
    const loader=loadSnapshot||privateSourceLoader(client,env.RMS_EQAIME_BANK_SOURCE,scope,{maxSourceBytes:20000000});
    if(!loader)return {status:200,body:{rows:[],total:0,page:1,pages:1,pageSize:100,coverage:{complete:false},sourceStatus:'not_connected'}};
    const snapshot=await loader({entityId:scope.legalEntityId,signal:controller.signal});if(controller.signal.aborted)throw Error();let source=projectBank(snapshot,scope.legalEntityId);if(env.RMS_EQAIME_BALANCE_SOURCE){const bl=privateSourceLoader(client,env.RMS_EQAIME_BALANCE_SOURCE,scope);const balances=await bl({entityId:scope.legalEntityId,signal:controller.signal});for(const [name,raw] of [['primary',env.RMS_EQAIME_PRIMARY_SOURCE],['bank',env.RMS_EQAIME_BANK_SOURCE]])if(!raw||!privateSourceLoader(client,raw,scope)||JSON.parse(raw).sha256!==balances.sourceHashes?.[name])throw Error('Source changed');source=env.VERCEL_ENV==='preview'?referenceBank(enrichBankMatches(source,balances,scope.legalEntityId),await referenceGroups(balances,{client,env,scope,signal:controller.signal,bankSnapshot:snapshot})):enrichBankMatches(source,balances,scope.legalEntityId)}const body=bankPage(source,filters);if(Buffer.byteLength(JSON.stringify(body))>2000000)throw Error();return {status:200,body};
   })(),new Promise((_,reject)=>{timer=setTimeout(()=>{controller.abort();reject(Error())},timeoutMs)})]);return send(result.status,result.body);
  }catch{return send(503,{error:'Bank source unavailable'})}finally{clearTimeout(timer);controller.abort()}
 };
}
