import assert from 'node:assert/strict';
import {archiveStorageKey,readArchive,writeArchive,changeArchive,isArchiveSwipe} from '../src/eqaime-archive.mjs';
const a='00000000-0000-4000-8000-000000000001',b='00000000-0000-4000-8000-000000000002';const m=new Map(),storage={getItem:k=>m.get(k)||null,setItem:(k,v)=>m.set(k,v)};
assert.notEqual(archiveStorageKey(a),archiveStorageKey(b));assert.equal(archiveStorageKey(''),null);
const s='supplier-'+a;let ids=changeArchive([],s,true);assert.deepEqual(changeArchive(ids,s,true),[s]);assert.deepEqual(changeArchive(ids,s,false),[]);assert.deepEqual(changeArchive(ids,'bad',true),[s]);
assert(writeArchive(storage,archiveStorageKey(a),ids));assert.deepEqual(readArchive(storage,archiveStorageKey(a)).ids,[s]);assert.deepEqual(readArchive(storage,archiveStorageKey(b)).ids,[]);assert(writeArchive(storage,archiveStorageKey(a),[]));assert.deepEqual(readArchive(storage,archiveStorageKey(a)).ids,[]);
const fail={getItem(){throw Error()},setItem(){throw Error()}};assert.equal(readArchive(fail,'k').persistent,false);assert.equal(writeArchive(fail,'k',ids),false);
for(const v of ['null','{','{"version":2,"ids":[]}','{"version":1,"ids":["name"]}']){m.set('k',v);assert.equal(readArchive(storage,'k').persistent,false)}
assert(isArchiveSwipe({x:150,y:50},{x:50,y:55}));assert(!isArchiveSwipe({x:50,y:50},{x:150,y:55}));assert(!isArchiveSwipe({x:150,y:50},{x:50,y:100}));assert(!isArchiveSwipe({x:150,y:50},{x:100,y:50}));assert(!isArchiveSwipe(null,{x:0,y:0}));
console.log('Archive persistence, account isolation, restore, invalid storage and swipe tests PASS');
// Realistic multi-counterparty opaque key shape; no production IDs or data embedded.
const supplierIds=Array.from({length:56},(_,i)=>'supplier-10000000-0000-4000-8000-'+String(i+1).padStart(12,'0'));
let all=[];for(const id of supplierIds)all=changeArchive(all,id,true);
assert.equal(all.length,56);assert(writeArchive(storage,archiveStorageKey(a),all));
assert.deepEqual(readArchive(storage,archiveStorageKey(a)).ids,supplierIds);
const restored=changeArchive(all,supplierIds[10],false);assert.equal(restored.length,55);assert(!restored.includes(supplierIds[10]));assert(restored.includes(supplierIds[11]));
assert.deepEqual(readArchive(storage,archiveStorageKey(b)).ids,[]);
assert(!writeArchive(storage,archiveStorageKey(a),['supplier-'+a,'Private supplier name']));
console.log('Independent realistic 56-key persistence and exact-identity restore PASS');
