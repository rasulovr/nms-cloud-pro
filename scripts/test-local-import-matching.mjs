import assert from 'node:assert/strict';
import {reconcileImport,cents,money} from '../src/local-import/reconcile.mjs';
const owner='1111111111',seller='2222222222';
const invoice=(n='MT260310443825',amount='100.00',extras={})=>({id:n,invoiceNumber:n,buyerVoen:owner,sellerVoen:seller,identityVerified:true,amount,comparisonAmount:amount,currency:'AZN',status:'accepted',date:'2026-03-01',...extras});
const payment=(amount='100.00',ns=['MT260310443825'],extras={})=>({id:'p',ownerVoen:owner,recipientVoen:seller,identityVerified:true,amount,currency:'AZN',date:'2026-03-02',bankAccountKey:'account',bankTransactionId:'tx1',direction:'outgoing',invoiceNumbers:ns,referenceEvidenceComplete:true,...extras});
const run=(invoices=[invoice()],payments=[payment()])=>reconcileImport({invoices,payments,selectedOwnerVoen:owner});
assert.equal(run().components[0].state,'paid');
assert.equal(run(undefined,[payment('99.99')]).components[0].difference,'-0.01');
assert.equal(run(undefined,[payment('100.01')]).components[0].state,'overpayment');
assert.equal(run(undefined,[payment('40'),payment('60',undefined,{bankTransactionId:'tx2'})]).components[0].state,'paid');
assert.equal(run(undefined,[payment('100',undefined,{date:'2026-02-01'})]).components[0].state,'paid');
const refs=['MT260310443825','MT260310453452'];
const grouped=run([invoice(refs[0],'1266.25'),invoice(refs[1],'467.65')],[payment('1697.90',refs)]);
assert.equal(grouped.components[0].shortfall,'36.00');assert.equal(grouped.edges.length,2);assert.equal(grouped.paymentRows.length,1);assert.equal(grouped.invoiceRows[0].observedRemaining,null);assert(grouped.edges.every(e=>e.amount===null));
const dup=run(undefined,[payment(),payment('100.00',undefined,{id:'otherFile',source:{fileName:'new.xlsx'}})]);assert.equal(dup.paymentRows.length,1);assert.equal(dup.duplicates.payments,1);assert.equal(dup.totals.creditedAmount,'100.00');
assert.equal(run([invoice(),invoice()]).invoiceRows.length,1);
for(const rows of [[invoice(),invoice(undefined,'101.00')]]){assert.equal(run(rows).components[0].state,'review');}
assert.equal(run(undefined,[payment(),payment('101')]).components[0].actualPaymentAmount,null);
for(const patch of [{bankTransactionId:null},{identityVerified:false},{recipientVoen:'3333333333'},{referenceEvidenceComplete:false},{direction:'incoming'},{currency:'USD'},{amount:'-1'},{amount:'1.001'},{date:'2026-02-30'},{reviewRequired:true},{invoiceNumbers:['XMT260310443825']},{invoiceNumbers:['MT260310443825','MT260310443825']}]){const r=run(undefined,[payment('100',undefined,patch)]);assert.equal(r.components[0].state,'review',JSON.stringify(patch));assert.equal(r.edges.length,0);assert.equal(r.totals.creditedAmount,'0.00');}
assert.equal(run(undefined,[payment('100',['MT260310443825','MT260310453452'])]).components[0].state,'review');
assert.equal(run([invoice(undefined,'100',{status:'disputed'})]).components[0].state,'review');
assert.equal(run([invoice(undefined,'100',{sellerVoen:'3333333333'})]).components[0].state,'review');
assert.equal(run(undefined,[]).invoiceRows[0].state,'unknown');
const scoped=run([invoice(),invoice('MT260310453452','100',{buyerVoen:'4444444444'})],[payment(),payment('100',undefined,{ownerVoen:'4444444444'})]);assert.equal(scoped.excluded.invoices,1);assert.equal(scoped.excluded.payments,1);
const overlap=run([invoice(refs[0],'100'),invoice(refs[1],'100')],[payment('150',refs),payment('50',[refs[1]],{bankTransactionId:'tx2'})]);assert.equal(overlap.components.length,1);assert.equal(overlap.components[0].state,'paid');assert.equal(overlap.edges.length,3);assert.equal(overlap.components[0].individualAllocation,null);
const before={invoices:[invoice()],payments:[payment()],selectedOwnerVoen:owner};const saved=JSON.stringify(before);reconcileImport(before);assert.equal(JSON.stringify(before),saved);
assert.equal(money(cents('900719925474099.99')),'900719925474099.99');assert.throws(()=>cents(1));assert.throws(()=>reconcileImport({}));
console.log('PASS: exact cents, prepayment, supplement, group no split, dedup/conflicts, scope, identity, refs, status, refunds, unknown, immutability');
// A conflict cannot disappear and allow another transfer to close the invoice.
const conflict=run(undefined,[payment('100'),payment('99'),payment('100',undefined,{bankTransactionId:'tx2'})]);
assert.equal(conflict.components.length,1);assert.equal(conflict.components[0].state,'review');assert.equal(conflict.totals.creditedAmount,'0.00');assert.equal(conflict.paymentRows[0].sourceRecords.length,2);
const mixed=run([invoice(refs[0],'100'),invoice(refs[1],'100',{sellerVoen:'3333333333'})],[payment('200',refs)]);assert.equal(mixed.components[0].state,'review');assert.equal(mixed.edges.length,0);
const malformed=run(undefined,[payment('100',['MT2603104438259'])]);assert.equal(malformed.components[0].state,'review');
console.log('PASS: conflict propagation, original variants retained, mixed suppliers, malformed full tokens');
// Persistence uses complete domain-separated SHA-256 identity, never truncated digits.
const { createHash }=await import('node:crypto');
const hashed=v=>'voen:'+createHash('sha256').update('rms-import-voen-v1:'+v).digest('hex');
const stored=JSON.parse(JSON.stringify({invoices:[invoice(undefined,'100',{buyerVoen:hashed(owner),sellerVoen:hashed(seller)})],payments:[],selectedOwnerVoen:hashed(owner)}));
stored.payments=[payment('100',undefined,{ownerVoen:hashed(owner),recipientVoen:hashed(seller)})];
assert.equal(reconcileImport(stored).components[0].state,'paid');
assert.throws(()=>reconcileImport({...stored,selectedOwnerVoen:'voen:1234567890'}));
assert.equal(reconcileImport({...stored,payments:[payment()]}).excluded.payments,1);
console.log('PASS: typed full identity hashes match fresh imports after JSON reload; malformed hashes rejected');
// Candidate refs may only block a component, never create a positive edge.
const uncertain=payment('1',[],{bankTransactionId:'tx-uncertain',referenceEvidenceComplete:false,unverifiedReferenceCandidates:['MT260310443825']});
const prevented=run(undefined,[payment(),uncertain]);assert.equal(prevented.components.length,1);assert.equal(prevented.components[0].state,'review');assert.equal(prevented.edges.length,0);assert.equal(prevented.totals.creditedAmount,'0.00');
const candidateOnly=run(undefined,[uncertain]);assert.deepEqual(candidateOnly.components[0].invoiceNumbers,[]);assert.deepEqual(candidateOnly.components[0].unverifiedInvoiceNumbers,['MT260310443825']);assert.equal(candidateOnly.invoiceRows[0].state,'review');assert.equal(candidateOnly.edges.length,0);
console.log('PASS: uncertain candidates only block, never confirmed refs/edges/credit');
