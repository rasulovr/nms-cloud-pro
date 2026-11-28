const month='2026-11'
const uuid=/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/
const allowedRole=new Set(['admin','super_admin'])
const stableAsOf=value=>typeof value==='string'&&/^2026-11-(?:0[1-9]|[12]\d|30)$/.test(value)
export function parseNovemberPayrollConfig(raw) {
  if(typeof raw!=='string'||raw.length>8192)return null
  try {
    const d=JSON.parse(raw), cents=d?.branchCents
    if(d?.version!==1||d.month!==month||!stableAsOf(d.asOf)||!uuid.test(d.allowedAuthUserId||'')||!cents||Array.isArray(cents)||typeof cents!=='object')return null
    const rows=Object.entries(cents)
    if(rows.length!==6||rows.some(([id,n])=>!uuid.test(id)||!Number.isSafeInteger(n)||n<0)||!Number.isSafeInteger(d.networkCents)||rows.reduce((s,[,n])=>s+n,0)!==d.networkCents)return null
    return {version:1,month,asOf:d.asOf,allowedAuthUserId:d.allowedAuthUserId,branchCents:Object.fromEntries(rows)}
  } catch {return null}
}
export function makeNovemberPayrollReport({env=process.env, fetchImpl=globalThis.fetch}={}) {
  return async (request,response)=>{
    response.setHeader('Cache-Control','private, no-store, max-age=0')
    response.setHeader('Content-Type','application/json; charset=utf-8')
    response.setHeader('X-Content-Type-Options','nosniff')
    response.setHeader('Vary','Authorization')
    const finish=(code,body)=>response.status(code).end(JSON.stringify(body))
    if(request.method!=='GET'){response.setHeader('Allow','GET');return finish(405,{error:'unavailable'})}
    const authorization=request.headers?.authorization
    if(typeof authorization!=='string'||authorization.length>8192||!/^Bearer [A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(authorization))return finish(401,{error:'unavailable'})
    const config=parseNovemberPayrollConfig(env.RMS_NOVEMBER_PAYROLL_REPORT)
    const origin=String(env.VITE_SUPABASE_URL||'').replace(/\/$/,'')
    const apikey=env.VITE_SUPABASE_ANON_KEY
    if(env.VERCEL_ENV!=='production'||!config||origin!=='https://meqttgiksyuyffuoghwx.supabase.co'||typeof apikey!=='string'||!apikey)return finish(503,{error:'unavailable'})
    const headers={Authorization:authorization,apikey}
    const json=async(path,options={})=>{
      const r=await fetchImpl(origin+path,{...options,headers:{...headers,...options.headers},redirect:'error',cache:'no-store',signal:AbortSignal.timeout(4000)})
      if(!r.ok){const reason=new Error('authorization unavailable');reason.status=r.status;throw reason}
      return r.json()
    }
    try{
      const u=await json('/auth/v1/user')
      if(u?.id!==config.allowedAuthUserId||u?.is_anonymous!==false)return finish(403,{error:'unavailable'})
      const profile=await json('/rest/v1/user_profiles?select=role,is_active,hide_manager_salary,hide_manager_salaries&id=eq.'+encodeURIComponent(u.id))
      if(!Array.isArray(profile)||profile.length!==1||profile[0].is_active!==true||!allowedRole.has(profile[0].role)||profile[0].hide_manager_salary===true||profile[0].hide_manager_salaries===true)return finish(403,{error:'unavailable'})
      const hasPermission=key=>json('/rest/v1/rpc/rms_has_permission',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({p_user_id:u.id,p_permission_key:key})})
      const flags=await Promise.all(['salary.read','system.full_access'].map(hasPermission))
      if(!flags.every(allowed=>allowed===true))return finish(403,{error:'unavailable'})
      return finish(200,{version:1,month,asOf:config.asOf,branchCents:config.branchCents})
    }catch(error){return finish([401,403].includes(error?.status)?403:503,{error:'unavailable'})}
  }
}
