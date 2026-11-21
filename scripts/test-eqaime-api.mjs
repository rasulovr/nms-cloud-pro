import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import {makeHandler,parseScope} from '../server/eqaime-api.mjs'
import {loadEqaimeRegister} from '../src/eqaime-register.mjs'
const owner='22222222-2222-4222-8222-222222222222',entity='11111111-1111-4111-8111-111111111111',token='synthetic.token.for.unit.tests'
const config={version:1,enabled:true,allowedAuthUserId:owner,legalEntityId:entity}
function fixture(options={}){
 const queries=[],headers={},calls=[],logs=[]
 const data={supplier_e_invoices:[{id:'i',legal_entity_id:entity,supplier_id:'s',amount:100,invoice_number:'MT990100000001'}],supplier_payments:[],supplier_e_invoice_purchase_links:[],supplier_purchases:[],suppliers:[{id:'s',name:'Synthetic'}]}
 const client={auth:{getUser:async t=>{calls.push(t);if(options.authError)return {error:{message:'secret'}};return {data:{user:{id:options.other?'other':owner,is_anonymous:!!options.anonymous}}}}},from:table=>{const q={table,filters:[]};queries.push(q);const chain={select:columns=>{q.columns=columns;return chain},eq:(k,v)=>{q.filters.push([k,v]);return chain},is:()=>chain,in:(k,v)=>{q.filters.push([k,v]);return chain},order:()=>chain,range:async()=>options.readError?{error:{message:'private details'}}:{data:options.foreign&&table==='supplier_e_invoices'?[{...data[table][0],legal_entity_id:'other'}]:data[table]||[]}};return chain}}
 const createClient=(url,key,opts)=>{calls.push({url,key,opts});return client}
 const env={VITE_SUPABASE_URL:'https://synthetic.invalid',VITE_SUPABASE_ANON_KEY:'synthetic-anon',RMS_EQAIME_REVIEW_SCOPE:JSON.stringify(config),...options.env}
 const req={method:'GET',headers:{authorization:'Bearer '+token},query:{},...options.req}
 const res={setHeader:(k,v)=>headers[k]=v,status:s=>{res.statusCode=s;return res},end:s=>{res.body=JSON.parse(s)}}
 return {run:()=>makeHandler({createClient,env,diagnosticSink:entry=>logs.push(entry),...options.limits})(req,res),res,queries,headers,calls,logs}
}
test('owner JWT, anon key, exact scope, no config response',async()=>{const f=fixture();await f.run();assert.equal(f.res.statusCode,200);assert.equal(f.calls[0].key,'synthetic-anon');assert.equal(f.calls[0].opts.global.headers.Authorization,'Bearer '+token);assert.equal(f.calls[1],token);assert.ok(f.queries.filter(q=>['supplier_e_invoices','supplier_payments'].includes(q.table)).every(q=>q.filters.some(([k,v])=>k==='legal_entity_id'&&v===entity)));assert.ok(f.queries.every(q=>q.columns!=='*'));assert.doesNotMatch(JSON.stringify(f.res.body),new RegExp(entity+'|'+owner));assert.equal(f.headers['Cache-Control'],'private, no-store, max-age=0');assert.equal(f.headers['Access-Control-Allow-Origin'],undefined)})
for(const [name,options,status] of [['no bearer',{req:{method:'GET',headers:{}}},401],['legacy token',{req:{method:'GET',headers:{authorization:'Bearer rms-internal-admin'}}},401],['invalid JWT',{authError:true},401],['anonymous user',{anonymous:true},401],['wrong owner',{other:true},403],['missing config',{env:{RMS_EQAIME_REVIEW_SCOPE:''}},503],['disabled config',{env:{RMS_EQAIME_REVIEW_SCOPE:JSON.stringify({...config,enabled:false})}},503],['client entity rejected',{req:{method:'GET',headers:{authorization:'Bearer '+token},query:{entity:'any'}}},400],['cross origin',{req:{method:'GET',headers:{authorization:'Bearer '+token,'sec-fetch-site':'cross-site'}}},403],['no writes',{req:{method:'POST',headers:{}}},405]])test(name,async()=>{const f=fixture(options);await f.run();assert.equal(f.res.statusCode,status);assert.equal(f.queries.length,0);assert.doesNotMatch(JSON.stringify(f.res.body),/secret|private details/)})
for(const [name,options] of [['read failure',{readError:true}],['out of scope row',{foreign:true}],['payload limit',{limits:{maxBytes:10}}]])test(name+' fails closed',async()=>{const f=fixture(options);await f.run();assert.equal(f.res.statusCode,503);assert.equal(f.res.body.error,'Review unavailable');assert.match(f.res.body.code,/^EQ_(READ|PAYLOAD)$/)})
test('invalid configuration rejected',()=>{for(const cfg of [null,{...config,legalEntityId:'bad'},{...config,extra:true},{...config,allowedAuthUserId:'bad'}])assert.throws(()=>parseScope(JSON.stringify(cfg)))})
test('client denial never produces old report',async()=>{for(const status of [401,403,503])await assert.rejects(()=>loadEqaimeRegister({auth:{getSession:async()=>({data:{session:{access_token:token}}})}},{request:async()=>({ok:false,status})}))})
test('API source no privileged key or mutating calls',()=>{for(const p of ['../server/eqaime-api.mjs','../server/eqaime-data.mjs']){const s=fs.readFileSync(new URL(p,import.meta.url),'utf8');assert.doesNotMatch(s,/service_role|SERVICE_ROLE|\.(insert|update|delete|upsert|rpc)\s*\(/);assert.doesNotMatch(s,/console\.(log|error|warn)/)}})
test('auth verification completes before any financial request',async()=>{const f=fixture();await f.run();assert.equal(f.calls[1],token);assert.ok(f.queries.length>0)})
test('readAt is valid and response contains no private service comments',async()=>{const f=fixture();await f.run();assert.ok(Number.isFinite(Date.parse(f.res.body.readAt)));assert.ok(f.queries.every(q=>!q.columns.includes('created_by')&&!q.columns.split(',').includes('comment')))})
test('server imports never enter browser source',()=>{for(const p of ['../src/eqaime-register.mjs','../src/EqaimeReconciliation.jsx']){const s=fs.readFileSync(new URL(p,import.meta.url),'utf8');assert.doesNotMatch(s,/from ['"].*server\//);assert.doesNotMatch(s,/RMS_EQAIME_REVIEW_SCOPE|allowedAuthUserId|legalEntityId/)}})
test('timeout during getUser redacts and forbids late financial reads',async()=>{
 let resolveUser,reads=0;const client={auth:{getUser:()=>new Promise(r=>{resolveUser=r})},from:()=>{reads++;throw Error('late query')}}
 const res={setHeader(){},status(s){this.code=s;return this},end(s){this.body=JSON.parse(s)}}
 await makeHandler({createClient:()=>client,env:{RMS_EQAIME_REVIEW_SCOPE:JSON.stringify(config),VITE_SUPABASE_URL:'https://synthetic.invalid',VITE_SUPABASE_ANON_KEY:'synthetic'},timeoutMs:2})({method:'GET',headers:{authorization:'Bearer '+token},query:{}},res)
 assert.equal(res.code,503);assert.equal(res.body.error,'Review unavailable');assert.equal(res.body.code,'EQ_TIMEOUT');resolveUser({data:{user:{id:owner}}});await new Promise(r=>setTimeout(r,5));assert.equal(reads,0)
})
test('timeout aborts in-flight financial reads',async()=>{
 let aborted=0;const client={auth:{getUser:async()=>({data:{user:{id:owner}}})},from:()=>{const chain={select:()=>chain,eq:()=>chain,is:()=>chain,order:()=>chain,range:()=>({abortSignal:signal=>new Promise((_,reject)=>signal.addEventListener('abort',()=>{aborted++;reject(Error('private upstream details'))},{once:true}))})};return chain}}
 const res={setHeader(){},status(s){this.code=s;return this},end(s){this.body=JSON.parse(s)}}
 await makeHandler({createClient:()=>client,env:{RMS_EQAIME_REVIEW_SCOPE:JSON.stringify(config),VITE_SUPABASE_URL:'https://synthetic.invalid',VITE_SUPABASE_ANON_KEY:'synthetic'},timeoutMs:2})({method:'GET',headers:{authorization:'Bearer '+token},query:{}},res)
 assert.equal(res.code,503);assert.equal(aborted,2);assert.equal(res.body.error,'Review unavailable');assert.equal(res.body.code,'EQ_TIMEOUT')
})
test('actual CommonJS route entry cold-starts and returns JSON 401',async()=>{
 const {createRequire}=await import('node:module');const handler=createRequire(import.meta.url)('../api/eqaime/review.js')
 const headers={};const res={setHeader(k,v){headers[k]=v},status(s){this.code=s;return this},end(s){this.body=JSON.parse(s)}}
 await handler({method:'GET',headers:{},query:{}},res)
 assert.equal(res.code,401);assert.deepEqual(res.body,{error:'Authentication required',code:'EQ_AUTH',stage:'request'});assert.match(headers['Content-Type'],/application\/json/)
})

test('diagnostic response/logs use only fixed codes and stages',async()=>{
 const codes=new Set(['EQ_CONFIG','EQ_AUTH','EQ_ACCESS','EQ_REQUEST','EQ_READ','EQ_TIMEOUT','EQ_PAYLOAD','EQ_PROCESS','EQ_STARTUP'])
 const stages=new Set(['request','config','auth','invoices_payments','links','purchases','suppliers','analysis','response','startup'])
 for(const options of [{readError:true},{authError:true},{other:true},{env:{RMS_EQAIME_REVIEW_SCOPE:'private configuration content'}},{foreign:true},{limits:{maxBytes:10}}]){
  const f=fixture(options);await f.run();assert.equal(f.logs.length,1)
  for(const entry of f.logs){assert.deepEqual(Object.keys(entry).sort(),['code','stage']);assert.ok(codes.has(entry.code));assert.ok(stages.has(entry.stage))}
  assert.deepEqual(Object.keys(f.res.body).sort(),['code','error','stage']);assert.ok(codes.has(f.res.body.code));assert.ok(stages.has(f.res.body.stage));assert.doesNotMatch(JSON.stringify([f.logs,f.res.body]),/11111111|22222222|private configuration|synthetic.token|private details/)
 }
})
test('untrusted diagnostic input is replaced, never serialized',async()=>{const {emitDiagnostic}=await import('../server/eqaime-diagnostics.mjs');const logs=[];assert.deepEqual(emitDiagnostic('token=secret','id=private',x=>logs.push(x)),{code:'EQ_PROCESS',stage:'response'});assert.deepEqual(logs,[{code:'EQ_PROCESS',stage:'response'}])})
test('client surfaces only whitelisted error code not server payload',async()=>{const client={auth:{getSession:async()=>({data:{session:{access_token:token}}})}};for(const code of ['EQ_TIMEOUT','private-token']){await assert.rejects(()=>loadEqaimeRegister(client,{request:async()=>({ok:false,status:503,json:async()=>({code,error:'private server detail',stage:'secret'})})}),e=>!e.message.includes('private')&&!e.message.includes('secret')&&(code==='EQ_TIMEOUT'?e.message.includes('[EQ_TIMEOUT]'):!e.message.includes('[')))}})
test('UI error path clears stale/partial report',()=>{const s=fs.readFileSync(new URL('../src/EqaimeReconciliation.jsx',import.meta.url),'utf8');assert.match(s,/setState\(\{loading:false,data:null,error:error.message\}\)/);assert.match(s,/!state.loading&&!state.error&&report/);assert.match(s,/setState\(\{loading:true,data:null,error:''\}\)/)})

test('diagnostic sink failure never changes safe error outcome',async()=>{const {emitDiagnostic}=await import('../server/eqaime-diagnostics.mjs');assert.deepEqual(emitDiagnostic('EQ_READ','links',()=>{throw Error('private sink value')}),{code:'EQ_READ',stage:'links'})})
