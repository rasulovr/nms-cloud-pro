import {loadScopedRegister,analyzeRegister} from './eqaime-data.mjs'
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
export function parseScope(raw){
  const v=JSON.parse(raw||'null')
  if(!v || v.version!==1 || v.enabled!==true || !uuid.test(v.allowedAuthUserId||'') || !uuid.test(v.legalEntityId||'') || Object.keys(v).some(k=>!['version','enabled','allowedAuthUserId','legalEntityId'].includes(k))) throw Error('Configuration unavailable')
  return v
}
export function makeHandler({createClient,env,timeoutMs=15000,maxBytes=2000000}){
  return async(req,res)=>{
    res.setHeader('Cache-Control','private, no-store, max-age=0')
    res.setHeader('Vercel-CDN-Cache-Control','no-store')
    res.setHeader('CDN-Cache-Control','no-store')
    res.setHeader('Content-Type','application/json; charset=utf-8')
    res.setHeader('X-Content-Type-Options','nosniff')
    const send=(status,payload)=>res.status(status).end(JSON.stringify(payload))
    if(req.method!=='GET')return send(405,{error:'Method not allowed'})
    if(req.headers?.['sec-fetch-site']==='cross-site')return send(403,{error:'Access denied'})
    if(req.query && Object.keys(req.query).length)return send(400,{error:'Parameters are not accepted'})
    const authorization=req.headers?.authorization
    if(typeof authorization!=='string' || !/^Bearer [A-Za-z0-9_.-]{20,8192}$/.test(authorization))return send(401,{error:'Authentication required'})
    let scope
    try{scope=parseScope(env.RMS_EQAIME_REVIEW_SCOPE);if(!env.VITE_SUPABASE_URL||!env.VITE_SUPABASE_ANON_KEY)throw Error()}catch{return send(503,{error:'Review unavailable'})}
    const token=authorization.slice(7),controller=new AbortController()
    let timer
    try{
      const work=async()=>{
        // No privileged credentials: caller JWT preserves all existing RLS restrictions.
        const client=createClient(env.VITE_SUPABASE_URL,env.VITE_SUPABASE_ANON_KEY,{global:{headers:{Authorization:authorization}},auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}})
        const {data,error}=await client.auth.getUser(token)
        if(error || !data?.user || data.user.is_anonymous){return {status:401,body:{error:'Authentication required'}}}
        if(data.user.id!==scope.allowedAuthUserId)return {status:403,body:{error:'Access denied'}}
        if(controller.signal.aborted)throw Error('Aborted')
        const input=await loadScopedRegister(client,scope.legalEntityId,{signal:controller.signal,maxRows:10000})
        const report=analyzeRegister(input,scope.legalEntityId)
        // Private scope configuration is never returned to the browser.
        for(const row of [...report.rows,...report.payments])delete row.legal_entity_id
        if(Buffer.byteLength(JSON.stringify(report),'utf8')>maxBytes)throw Error('Payload limit')
        return {status:200,body:report}
      }
      const result=await Promise.race([work(),new Promise((_,reject)=>{timer=setTimeout(()=>{controller.abort();reject(Error('Timeout'))},timeoutMs)})])
      return send(result.status,result.body)
    }catch{return send(503,{error:'Review unavailable'})}
    finally{clearTimeout(timer);controller.abort()}
  }
}
