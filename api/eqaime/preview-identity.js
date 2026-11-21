module.exports=async(req,res)=>{
 if(process.env.VERCEL_ENV!=='preview'){res.setHeader('Cache-Control','private,no-store');return res.status(404).end();}
 try{const [{createClient},{makeIdentityHandler}]=await Promise.all([import('@supabase/supabase-js'),import('../../server/eqaime-preview-identity.mjs')]);return await makeIdentityHandler({createClient,env:process.env})(req,res)}catch{res.setHeader('Cache-Control','private,no-store');return res.status(503).end('{"state":"UNAVAILABLE"}')}
};
