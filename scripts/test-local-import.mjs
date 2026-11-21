import fixtures from './local-import-fixtures.mjs';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {reconcileImport} from '../src/local-import/reconcile.mjs';
import {appendBatch,emptyWorkspace,activeFiles,setSourceExcluded} from '../src/local-import/adapter.mjs';
import {persistenceProjection} from '../src/local-import/storage.mjs';
import {importView} from '../src/local-import/view.mjs';

let response;
globalThis.self={postMessage(data){response=data;}};
await import('../src/local-import/import.worker.mjs');
const processFile=async (name,kind)=>{
  const raw=Buffer.from(fixtures[name],'base64');
  response=undefined;
  await self.onmessage({data:{buffer:raw.buffer.slice(raw.byteOffset,raw.byteOffset+raw.byteLength),name,kind}});
  assert.ok(response);
  return response;
};
const pr=await processFile('portal-synthetic.xlsx','portal'), bk=await processFile('bank-synthetic.xlsx','bank');
assert.ok(pr.ok,pr.error); assert.ok(bk.ok,bk.error);
assert.equal(pr.batch.invoices.length,7); assert.equal(bk.batch.payments.length,6);
assert.equal(bk.batch.excluded.length,3);
assert(!JSON.stringify(bk).includes('AZ00TEST00000AZNSC0000000000'));
assert(!JSON.stringify(bk).includes('TEST-0001'));
assert(!JSON.stringify(bk).includes('E-QAIME MT2611'));
const w=appendBatch(appendBatch(emptyWorkspace(),pr.batch).workspace,bk.batch).workspace;
assert.equal(appendBatch(w,bk.batch).duplicateFile,true);
const use=(invoices,payments)=>reconcileImport({invoices,payments,selectedOwnerVoen:pr.batch.ownerVoens[0]});
const result=use(pr.batch.invoices,bk.batch.payments);
assert.equal(result.edges.length,5);
assert.equal(result.totals.creditedAmount,'430.00');
assert.equal(result.totals.finalDebt,null);
assert.equal(result.components[0].shortfall,'10.00');
assert.equal(result.components[0].individualAllocation,null);
assert.equal(result.components.filter(r=>r.state==='paid')[0].paymentIds.length,2);
const repeat=use([...pr.batch.invoices,...pr.batch.invoices],[...bk.batch.payments,...bk.batch.payments]);
assert.deepEqual(repeat.totals,result.totals);
assert.deepEqual(repeat.duplicates,{invoices:7,payments:6});
assert.equal(importView(result).totals.invoiceTotal,'492.00');
assert.equal(importView(result).totals.remaining,null); // blocked component: known totals are not a complete remainder
const safe=persistenceProjection(w), serialized=JSON.stringify(safe);
assert(!serialized.includes('9999000000')&&!serialized.includes('9999000011')&&!serialized.includes('TEST-0001'));
assert(!serialized.includes('Test description')&&!serialized.includes('bank-synthetic.xlsx'));
assert.deepEqual(safe,persistenceProjection(JSON.parse(serialized)));
assert.deepEqual(use(safe.files[0].invoices,safe.files[1].payments).totals,result.totals);
assert.deepEqual(use(safe.files[0].invoices,[...safe.files[1].payments,...bk.batch.payments]).totals,result.totals);
const wrong=await processFile('wrong-file-synthetic.xlsx','portal');assert.equal(wrong.ok,false);
const pc=await processFile('portal-conflict-synthetic.xlsx','portal');
assert.ok(pc.ok);
assert.equal(use([...pr.batch.invoices,...pc.batch.invoices],bk.batch.payments).components[1].state,'review');
console.log('Actual worker entry: compressed XLSX, local-only sanitized records, group lines, cent differences, conflict and duplicate detection PASS');

const i=pr.batch.invoices[0], equal={...i,amount:i.amount+'00'};
// Use explicit synthetically equivalent originals, never rounded equivalence.
const base={...i,amount:'110.00',comparisonAmount:'110.00'}, equivalent={...base,amount:'110.0000'};
const paid={...bk.batch.payments[0],invoiceNumbers:[base.invoiceNumber],amount:'110.00',recipientVoen:base.sellerVoen};
for(const rows of [[base,equivalent],[equivalent,base]]){const r=use(rows,[paid]);assert.equal(r.components[0].state,'paid');assert.equal(importView(r).totals.remaining,'0.00');assert.equal(r.invoiceRows[0].sourceRecords.length,2);assert.deepEqual(r.invoiceRows[0].sourceRecords.map(x=>x.amount),rows.map(x=>x.amount))}
for(const rows of [[{...base,amount:'110.0001'},{...base,amount:'110.0002'}],[base,{...base,status:'review',reviewRequired:true}],[{...base,status:'review',reviewRequired:true},base]]){const r=use(rows,[paid]);assert.equal(r.components[0].state,'review');assert.equal(importView(r).totals.remaining,null);assert.equal(importView(r).totals.heldInvoices,1)}
const old={...pr.batch,hash:'1'.repeat(64),invoices:[{...base,status:'review',reviewRequired:true}]},fresh={...pr.batch,hash:'2'.repeat(64),invoices:[equivalent]},bank={...bk.batch,payments:[paid]};
let incremental=appendBatch(appendBatch(appendBatch(emptyWorkspace(),old).workspace,fresh).workspace,bank).workspace;
const calculate=w=>use(activeFiles(w).flatMap(f=>f.invoices),activeFiles(w).flatMap(f=>f.payments));
assert.equal(calculate(incremental).components[0].state,'review');
incremental=setSourceExcluded(incremental,old.hash,true);assert.equal(calculate(incremental).components[0].state,'paid');assert.equal(incremental.files.length,3);assert.equal(incremental.files[0].invoices[0].status,'review');
const reloaded=persistenceProjection(JSON.parse(JSON.stringify(persistenceProjection(incremental))));assert.equal(calculate(reloaded).components[0].state,'paid');assert.equal(reloaded.files[0].excludedFromReconciliation,true);
const later=appendBatch(reloaded,{...fresh,hash:'3'.repeat(64),invoices:[base]}).workspace;assert.equal(calculate(later).paymentRows.length,1);assert.equal(calculate(later).components[0].state,'paid');
assert.equal(calculate(setSourceExcluded(later,old.hash,false)).components[0].state,'review');
console.log('Exact-decimal overlap, pending/accepted both orders, explicit source exclude/restore, persisted reload and incremental dedupe PASS');
