export function readCanaryBuildGate({command,mode,env}){
 const preview=env.VERCEL_ENV==='preview';
 const dev=command==='serve'&&mode==='development'&&!env.VERCEL_ENV;
 const enabled=(preview||dev)&&env.RMS_READ_CANARY_ENABLED==='1'&&/^[a-f0-9]{64}$/.test(env.RMS_CANARY_OWNER_SHA256||'');
 return {enabled,ownerDigest:enabled?env.RMS_CANARY_OWNER_SHA256:''};
}
