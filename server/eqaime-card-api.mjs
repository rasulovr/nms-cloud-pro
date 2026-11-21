import {parseScope} from './eqaime-api.mjs';
import {privateSourceLoader} from './eqaime-primary-source.mjs';
import {projectBalances} from './eqaime-balances.mjs';
import {projectCard} from './eqaime-card.mjs';
export function makeCardHandler({createClient,env,timeoutMs=15000}){return async(req,res)=>{
 for(const k of ['Cache-Control','Vercel-CDN-Cache-Control','CDN-Cache-Control'])res.setHeader(k,'private, no-store, max-age=0');res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('X-Content-Type-Options','nosniff');
 const send=(s,b)=>res.status(s).end(JSON.stringify(b));
 if(env.VERCEL_ENV!=='preview')return send(404,{error:'Unavailable'});
 if(req.method!=='GET')return send(405,{error:'Unavailable'});if(req.headers?.['sec-fetch-site']==='cross-site')return send(403,{error:'Access denied'});
 const a=req.headers?.authorization;if(typeof a!=='string'||!/^Bearer [A-Za-z0-9_.-]{20,8192}$/.test(a))return send(401,{error:'Authentication required'});
 const q=req.query||{};if(Object.keys(q).some(k=>k!=='supplier')||typeof q.supplier!=='string'||!/^supplier-[a-f0-9-]{36}$/.test(q.supplier))return send(400,{error:'Invalid filters'});
 const c=new AbortController();let timer;try{const r=await Promise.race([(async()=>{
 const scope=parseScope(env.RMS_EQAIME_REVIEW_SCOPE);const client=createClient(env.VITE_SUPABASE_URL,env.VITE_SUPABASE_ANON_KEY,{global:{headers:{Authorization:a}},auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});const {data,error}=await client.auth.getUser(a.slice(7));if(error||!data?.user||data.user.is_anonymous)return [401,{error:'Authentication required'}];if(data.user.id!==scope.allowedAuthUserId)return [403,{error:'Access denied'}];
 const load=privateSourceLoader(client,env.RMS_EQAIME_CARD_SOURCE,scope,{maxSourceBytes:100000});if(!load)return [200,{sourceStatus:'not_connected'}];
 const loadBalance=privateSourceLoader(client,env.RMS_EQAIME_BALANCE_SOURCE,scope,{maxSourceBytes:2500000});if(!loadBalance)throw Error();
 const snapshot=await load({entityId:scope.legalEntityId,signal:c.signal});if(snapshot.supplierKey!==q.supplier)return [200,{sourceStatus:'not_connected'}];
 const balance=await loadBalance({entityId:scope.legalEntityId,signal:c.signal});for(const k of ['primary','bank']){const raw=env['RMS_EQAIME_'+k.toUpperCase()+'_SOURCE'];if(!privateSourceLoader(client,raw,scope)||JSON.parse(raw).sha256!==balance.sourceHashes?.[k])throw Error()}
 const groups=projectBalances(balance,scope.legalEntityId),group=groups.find(g=>g.supplierKey===q.supplier);if(!group)throw Error();const body=projectCard(snapshot,{entityId:scope.legalEntityId,balanceSha256:JSON.parse(env.RMS_EQAIME_BALANCE_SOURCE).sha256,group,allPaymentIds:groups.flatMap(g=>g.payments.map(p=>p.id))});if(c.signal.aborted||Buffer.byteLength(JSON.stringify(body))>50000)throw Error();return [200,body];
 })(),new Promise((_,reject)=>{timer=setTimeout(()=>{c.abort();reject(Error())},timeoutMs)})]);return send(...r)}catch{return send(503,{error:'Supplier evidence unavailable'})}finally{clearTimeout(timer);c.abort()}
 }};
