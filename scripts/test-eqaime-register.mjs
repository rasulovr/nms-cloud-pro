import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import {analyzeRegister as analyze,readPaged} from '../server/eqaime-data.mjs'
import {loadEqaimeRegister} from '../src/eqaime-register.mjs'
const entity='11111111-1111-4111-8111-111111111111'
const analyzeRegister=input=>analyze(input,entity)
const invoice=(id='i1',number='MT990100000001')=>({id,invoice_number:number,legal_entity_id:entity,supplier_id:'s',amount:100,status:'matched',invoice_date:'2030-05-05'})
const fixture=()=>({invoices:[invoice()],payments:[{id:'pay',legal_entity_id:entity,supplier_id:'s',amount:100,payment_date:'2030-05-15'}],purchases:[{id:'p1',legal_entity_id:entity,supplier_id:'s',total_amount:100}],links:[{id:'l1',e_invoice_id:'i1',purchase_id:'p1',linked_amount:100}],suppliers:[{id:'s',name:'Test supplier'}]})
test('matched and paid-looking rows never imply approved or debt',()=>{let r=analyzeRegister(fixture());assert.equal(r.status,'blocked');assert.equal(r.confirmedDebt,null);assert.equal(r.rows[0].delta,0);assert.match(r.rows[0].approval,/Не проверено/);assert.equal(r.primaryCoverage,null)})
test('suffix cards block arithmetic and flag related original',()=>{let f=fixture();f.invoices.push(invoice('i2','MT990100000001-hissəvi'));let r=analyzeRegister(f);assert.equal(r.rows[0].delta,null);assert.equal(r.rows[1].delta,null);assert.ok(r.rows.every(x=>x.reasons.length))})
test('composite invoice not split or summed',()=>{let f=fixture();f.invoices[0].invoice_number+=' MT990100000002';assert.equal(analyzeRegister(f).rows[0].delta,null)})
test('deleted/missing purchase blocks link comparison',()=>{let f=fixture();f.purchases[0].deleted_at='2030-01-01';assert.equal(analyzeRegister(f).rows[0].linkedAmount,null)})
test('another payer excluded',()=>{let f=fixture();f.invoices.push({...invoice('foreign'),legal_entity_id:'other'});assert.equal(analyzeRegister(f).rows.length,1)})
test('another supplier purchase blocked',()=>{let f=fixture();f.purchases[0].supplier_id='other';assert.equal(analyzeRegister(f).rows[0].delta,null)})
test('difference compared only between card and links',()=>{let f=fixture();f.links[0].linked_amount=99.5;let r=analyzeRegister(f);assert.equal(r.rows[0].delta,.5);assert.match(r.rows[0].reasons.join(),/отличается/)})
test('no links unknown, not unpaid',()=>{let f=fixture();f.links=[];assert.equal(analyzeRegister(f).rows[0].delta,null)})
test('invalid numeric data not zero',()=>{let f=fixture();f.invoices[0].amount=null;assert.equal(analyzeRegister(f).rows[0].delta,null)})
test('duplicate links block',()=>{let f=fixture();f.links.push({...f.links[0],id:'l2'});assert.equal(analyzeRegister(f).rows[0].delta,null)})
test('paging reads second page and zero end',async()=>{let offsets=[];const r=await readPaged(()=>({range:async(from,to)=>{offsets.push(from);return{data:from===0?Array(500).fill({}):[],error:null}}}));assert.equal(r.length,500);assert.deepEqual(offsets,[0,500])})
test('paging failure never returns partial',async()=>{await assert.rejects(()=>readPaged(()=>({range:async from=>from===0?{data:Array(500).fill({})}:{error:{message:'fail'}}})),/Не удалось/)})
test('row cap fails closed',async()=>{await assert.rejects(()=>readPaged(()=>({range:async()=>({data:Array(500).fill({})})}),{maxRows:500}),/предел/)})
test('unauthenticated does not query tables',async()=>{await assert.rejects(()=>loadEqaimeRegister({auth:{getSession:async()=>({data:{session:null}})},from:()=>{throw Error('Should not query')}}),/подтверждённая сервером сессия/)})
test('read module has no mutating operations',()=>{const source=fs.readFileSync(new URL('../src/eqaime-register.mjs',import.meta.url),'utf8');assert.doesNotMatch(source,/\.(insert|update|delete|upsert|rpc)\s*\(/)})
test('component no initial debt or serialized private data',()=>{const s=fs.readFileSync(new URL('../src/EqaimeReconciliation.jsx',import.meta.url),'utf8');assert.match(s,/Подтверждённый долг: не рассчитан/);assert.doesNotMatch(s,/service_role|SUPABASE_SERVICE/)})

test('allocation larger than actual purchase blocks',()=>{let f=fixture();f.purchases[0].total_amount=80;assert.equal(analyzeRegister(f).rows[0].delta,null)})

test('cross-invoice over-allocation flags all affected cards',()=>{let f=fixture();f.invoices.push(invoice('i2','MT990100000002'));f.links.push({id:'l2',e_invoice_id:'i2',purchase_id:'p1',linked_amount:100});let r=analyzeRegister(f);assert.ok(r.rows.every(x=>x.delta===null && x.reasons.includes('Общая сумма распределений превышает накладную')))})
