import test from 'node:test';import assert from 'node:assert/strict';import {makeHandler} from '../server/eqaime-api.mjs';
const owner='22222222-2222-4222-8222-222222222222',entity='11111111-1111-4111-8111-111111111111';
async function run({other=false,missing=false,wrongSource=false}={}){
let primaryCalls=0;
const client={auth:{getUser:async()=>({data:{user:{id:other?'other':owner}}})},from:()=>{const q={select:()=>q,eq:()=>q,is:()=>q,order:()=>q,range:async()=>({data:[]})};return q}};
const res={setHeader(){},status(code){this.code=code;return this},end(s){this.body=JSON.parse(s)}};
await makeHandler({createClient:()=>client,env:{VITE_SUPABASE_URL:'synthetic',VITE_SUPABASE_ANON_KEY:'synthetic',RMS_EQAIME_REVIEW_SCOPE:JSON.stringify({version:1,enabled:true,allowedAuthUserId:owner,legalEntityId:entity})},loadPrivateSnapshot:async()=>{primaryCalls++;return {version:1,legalEntityId:wrongSource?'other':entity,rows:[]}}})({method:'GET',query:{},headers:missing?{}:{authorization:'Bearer synthetic.token.for.unit.tests'}},res);
return {res,primaryCalls};}
test('no bearer never reads private source',async()=>{const x=await run({missing:true});assert.equal(x.res.code,401);assert.equal(x.primaryCalls,0)});
test('wrong owner never reads private source',async()=>{const x=await run({other:true});assert.equal(x.res.code,403);assert.equal(x.primaryCalls,0)});
test('authorized owner sees only same entity source',async()=>{const x=await run();assert.equal(x.res.code,200);assert.equal(x.primaryCalls,1);assert.equal(x.res.body.primarySourceStatus,'connected');assert(!JSON.stringify(x.res.body).includes(entity))});
test('foreign primary snapshot fails whole response closed',async()=>{const x=await run({wrongSource:true});assert.equal(x.res.code,503);assert(!('rows'in x.res.body));assert(!JSON.stringify(x.res.body).includes('other'))});
