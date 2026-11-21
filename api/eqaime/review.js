// Explicit CommonJS adapter: this repository has no root ESM package type.
// Vercel's Node loader must dynamically import the isolated ESM implementation.
module.exports = async function review(req, res) {
  try {
    const [{createClient}, {makeHandler}] = await Promise.all([
      import('@supabase/supabase-js'),
      import('../../server/eqaime-api.mjs'),
    ])
    return await makeHandler({createClient,env:process.env})(req,res)
  } catch {
    res.setHeader('Cache-Control','private, no-store, max-age=0')
    res.setHeader('Vercel-CDN-Cache-Control','no-store')
    res.setHeader('CDN-Cache-Control','no-store')
    res.setHeader('X-Content-Type-Options','nosniff')
    res.setHeader('Content-Type','application/json; charset=utf-8')
    console.warn(JSON.stringify({code:'EQ_STARTUP',stage:'startup'}))
    return res.status(503).end(JSON.stringify({error:'Review unavailable',code:'EQ_STARTUP',stage:'startup'}))
  }
}
