module.exports=async(req,res)=>{
 try{const [{createClient},{makeBalanceHandler}]=await Promise.all([import('@supabase/supabase-js'),import('../../server/eqaime-balance-api.mjs')]);return await makeBalanceHandler({createClient,env:process.env})(req,res)}catch{res.setHeader('Cache-Control','private,no-store');res.setHeader('Content-Type','application/json');return res.status(503).end(JSON.stringify({error:'Balance source unavailable'}))}
};
