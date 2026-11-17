import {emitDiagnostic} from './eqaime-diagnostics.mjs'
import {loadScopedRegister,analyzeRegister} from './eqaime-data.mjs'
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
export function parseScope(raw){
  const v=JSON.parse(raw||'null')
  if(!v || v.version!==1 || v.enabled!==true || !uuid.test(v.allowedAuthUserId||'') || !uuid.test(v.legalEntityId||'') || Object.keys(v).some(k=>!['version','enabled','allowedAuthUserId','legalEntityId'].includes(k))) throw Error('Configuration unavailable')
  return v
}
export function makeHandler({createClient,env,timeoutMs=15000,maxBytes=2000000,diagnosticSink}){
  return async(req,res)=>{
    res.setHeader('Cache-Control','private, no-store, max-age=0')
    res.setHeader('Vercel-CDN-Cache-Control','no-store')
    res.setHeader('CDN-Cache-Control','no-store')
    res.setHeader('Content-Type','application/json; charset=utf-8')
    res.setHeader('X-Content-Type-Options','nosniff')
    const send=(status,payload)=>res.status(status).end(JSON.stringify(payload))
    let stage='request',failureCode='EQ_READ'
    const fail=(status,code,at=stage)=>send(status,{error:status===401?'Authentication required':status===403?'Access denied':'Review unavailable',...emitDiagnostic(code,at,diagnosticSink)})
    if(req.method!=='GET')return fail(405,'EQ_REQUEST')
    if(req.headers?.['sec-fetch-site']==='cross-site')return fail(403,'EQ_ACCESS')
    if(req.query && Object.keys(req.query).length)return fail(400,'EQ_REQUEST')
    const authorization=req.headers?.authorization
    if(typeof authorization!=='string' || !/^Bearer [A-Za-z0-9_.-]{20,8192}$/.test(authorization))return fail(401,'EQ_AUTH')
    let scope
    stage='config'
    try{scope=parseScope(env.RMS_EQAIME_REVIEW_SCOPE);if(!env.VITE_SUPABASE_URL||!env.VITE_SUPABASE_ANON_KEY)throw Error()}catch{return fail(503,'EQ_CONFIG')}
    const token=authorization.slice(7),controller=new AbortController()
    let timer
    try{
      const work=async()=>{
        // No privileged credentials: caller JWT preserves all existing RLS restrictions.
        const client=createClient(env.VITE_SUPABASE_URL,env.VITE_SUPABASE_ANON_KEY,{global:{headers:{Authorization:authorization}},auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}})
        stage='auth'
        const {data,error}=await client.auth.getUser(token)
        if(error || !data?.user || data.user.is_anonymous){return {status:401,body:{error:'Authentication required',...emitDiagnostic('EQ_AUTH',stage,diagnosticSink)}}}
        if(data.user.id!==scope.allowedAuthUserId)return {status:403,body:{error:'Access denied',...emitDiagnostic('EQ_ACCESS',stage,diagnosticSink)}}
        if(controller.signal.aborted)throw Error('Aborted')
        const input=await loadScopedRegister(client,scope.legalEntityId,{signal:controller.signal,maxRows:10000,onStage:value=>{stage=value}})
        stage='analysis'
        const report=analyzeRegister(input,scope.legalEntityId)
        // Private scope configuration is never returned to the browser.
        for(const row of [...report.rows,...report.payments])delete row.legal_entity_id
        stage='response'
        if(Buffer.byteLength(JSON.stringify(report),'utf8')>maxBytes){failureCode='EQ_PAYLOAD';throw Error('Payload limit')}
        return {status:200,body:report}
      }
      const result=await Promise.race([work(),new Promise((_,reject)=>{timer=setTimeout(()=>{controller.abort();reject(Error('Timeout'))},timeoutMs)})])
      return send(result.status,result.body)
    }catch{return fail(503,controller.signal.aborted?'EQ_TIMEOUT':failureCode==='EQ_PAYLOAD'?'EQ_PAYLOAD':stage==='auth'?'EQ_AUTH':stage==='analysis'?'EQ_PROCESS':'EQ_READ')}
    finally{clearTimeout(timer);controller.abort()}
  }
}
