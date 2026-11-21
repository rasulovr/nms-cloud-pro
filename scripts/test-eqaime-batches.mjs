import test from 'node:test'
import assert from 'node:assert/strict'
import {readBatches} from '../server/eqaime-batches.mjs'
const tick=()=>new Promise(r=>setImmediate(r))
test('at most three reads; output preserves batch order, not completion order',async()=>{
 const gates=new Map();let active=0,peak=0
 const promise=readBatches([0,1,2,3,4],async n=>{active++;peak=Math.max(peak,active);await new Promise(r=>gates.set(n,r));active--;return[n]})
 await tick();assert.equal(gates.size,3);gates.get(2)();await tick();assert.equal(gates.size,4);gates.get(1)();await tick();assert.equal(gates.size,5);gates.get(4)();gates.get(3)();gates.get(0)();assert.deepEqual(await promise,[0,1,2,3,4]);assert.equal(peak,3)
})
test('failure aborts sibling reads and does not dispatch remaining batches',async()=>{
 const started=[],aborted=[]
 await assert.rejects(()=>readBatches([0,1,2,3,4],(n,signal)=>{started.push(n);if(n===1)return Promise.reject(Error('synthetic failure'));return new Promise((_,reject)=>signal.addEventListener('abort',()=>{aborted.push(n);reject(Error('abort'))},{once:true}))}),/synthetic failure/)
 assert.deepEqual(started,[0,1,2]);assert.deepEqual(aborted,[0,2])
})
test('combined row cap across parallel batches fails closed',async()=>{await assert.rejects(()=>readBatches([0,1,2],async n=>[n,n],{maxRows:5}),/row limit/)})
test('external abort stops all active reads and prevents later dispatch',async()=>{
 const controller=new AbortController();const started=[]
 const p=readBatches([0,1,2,3,4],(n,signal)=>{started.push(n);return new Promise((_,reject)=>signal.addEventListener('abort',()=>reject(Error('abort')),{once:true}))},{signal:controller.signal})
 controller.abort();await assert.rejects(()=>p,/abort/);assert.deepEqual(started,[0,1,2])
})
test('already aborted causes no queries',async()=>{const c=new AbortController();c.abort();let calls=0;await assert.rejects(()=>readBatches([0],async()=>{calls++;return[]},{signal:c.signal}));assert.equal(calls,0)})
test('empty batches return empty; invalid results and unsafe concurrency fail closed',async()=>{assert.deepEqual(await readBatches([],async()=>[]),[]);await assert.rejects(()=>readBatches([0],async()=>null),/Incomplete/);await assert.rejects(()=>readBatches([0],async()=>[],{concurrency:4}),/concurrency/)})
