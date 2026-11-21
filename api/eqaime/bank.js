module.exports=async(req,res)=>{
 try{const [{createClient},{makeBankHandler}]=await Promise.all([import('@supabase/supabase-js'),import('../../server/eqaime-bank-api.mjs')]);return await makeBankHandler({createClient,env:process.env})(req,res)}catch{res.setHeader('Cache-Control','private,no-store');res.setHeader('Content-Type','application/json');return res.status(503).end(JSON.stringify({error:'Bank source unavailable'}))}
};
