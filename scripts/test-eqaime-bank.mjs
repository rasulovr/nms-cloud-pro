import test from 'node:test';import assert from 'node:assert/strict';import {projectBank,bankPage} from '../server/eqaime-bank.mjs';import {makeBankHandler} from '../server/eqaime-bank-api.mjs';import {paymentStatus,safePaymentEvidence} from '../server/eqaime-payment-status.mjs';
const owner='22222222-2222-4222-8222-222222222222',entity='11111111-1111-4111-8111-111111111111';
const row=i=>({id:'b'+i,currency:'AZN',sourceType:'bank_statement',provenance:[{source:'synthetic'}],date:'2030-01-02',amount:'10.00',purpose:'Payment MT990100000001',electronicInvoiceNumbers:['MT990100000001'],allocationStatus:'unallocated',identityVerified:false});
const snapshot={version:1,legalEntityId:entity,rows:Array.from({length:203},(_,i)=>row(i)),coverage:{complete:false}};
test('pagination covers every ID once, no hidden truncation',()=>{const s=projectBank(snapshot,entity),ids=[];for(let page=1;page<=3;page++){const p=bankPage(s,{page});assert.equal(p.total,203);assert.equal(p.coverage.complete,false);ids.push(...p.rows.map(x=>x.id))}assert.equal(new Set(ids).size,203);assert.equal(ids.length,203)});
test('filter covers date and electronic number but never creates allocation',()=>{const s=projectBank(snapshot,entity);assert.equal(bankPage(s,{search:'MT990100000001'}).total,203);assert.equal(bankPage(s,{from:'2031-01-01'}).total,0);assert(s.rows.every(x=>x.reviewRequired));});
test('scope and duplicates fail closed',()=>{assert.throws(()=>projectBank(snapshot,'other'));assert.throws(()=>projectBank({...snapshot,rows:[row(1),row(1)]},entity))});
async function api({other=false,noAuth=false,query={},wrongSnapshot=false}={}){let loads=0;const res={setHeader(){},status(s){this.code=s;return this},end(s){this.body=JSON.parse(s)}};await makeBankHandler({env:{RMS_EQAIME_REVIEW_SCOPE:JSON.stringify({version:1,enabled:true,legalEntityId:entity,allowedAuthUserId:owner}),VITE_SUPABASE_URL:'test',VITE_SUPABASE_ANON_KEY:'anon'},createClient:()=>({auth:{getUser:async()=>({data:{user:{id:other?'other':owner}}})}}),loadSnapshot:async()=>{loads++;return {...snapshot,legalEntityId:wrongSnapshot?'other':entity}}})({method:'GET',query,headers:noAuth?{}:{authorization:'Bearer synthetic.token.for.unit.tests'}},res);return {res,loads}}
test('bank owner authorization before private source',async()=>{for(const opts of [{noAuth:true},{other:true}]){const x=await api(opts);assert.equal(x.loads,0);assert([401,403].includes(x.res.code))}});
test('unauthorized filters and foreign snapshot rejected',async()=>{const x=await api({query:{entity:'other'}});assert.equal(x.res.code,400);assert.equal(x.loads,0);const y=await api({wrongSnapshot:true});assert.equal(y.res.code,503)});
test('page 3 returns last 3 only with truthful total',async()=>{const {res}=await api({query:{page:'3'}});assert.equal(res.code,200);assert.equal(res.body.rows.length,3);assert.equal(res.body.total,203)});
test('no bank records alone never red or green',()=>{assert.equal(paymentStatus({invoiceNumber:'MT990100000001',primaryAmount:'100.00'}).state,'partial_or_unknown')});
test('exact trailing-zero amount is not rounding',()=>{const invoice={invoiceNumber:'N',primaryAmount:'100.0000'};const e={invoiceNumber:'N',payableAmount:'100.00',payableAmountVerified:true,allocations:[],coverageComplete:true,openingAndOtherSettlementChecked:true,asOfVerified:true};assert.equal(paymentStatus(invoice,e).state,'unpaid_confirmed');assert.equal(paymentStatus({...invoice,primaryAmount:'100.0001'},e).state,'partial_or_unknown')});

test('invalid calendar dates and currency fail closed',()=>{assert.throws(()=>bankPage(projectBank(snapshot,entity),{from:'2030-02-30'}));assert.throws(()=>projectBank({...snapshot,rows:[{...row(0),currency:'USD'}]},entity))});

test('string false cannot authorize green or red',()=>{
 const invoice={invoiceNumber:'N',primaryAmount:'100.00',sourceReviewRequired:false};
 const a={id:'a',amount:'100.00',invoiceNumber:'N',bankExecutionVerified:'false',counterpartyVerified:'false',ownerVerified:'false',invoiceAllocationVerified:'false',duplicateAndReversalCheckComplete:'false'};
 const e={invoiceNumber:'N',payableAmount:'100.00',payableAmountVerified:'false',allocations:[a]};
 assert.equal(paymentStatus(invoice,e).state,'partial_or_unknown');
 assert.equal(paymentStatus(invoice,{...e,payableAmountVerified:true}).state,'partial_or_unknown');
 assert.equal(paymentStatus(invoice,{...e,payableAmountVerified:true,allocations:[],coverageComplete:'false',openingAndOtherSettlementChecked:'false',asOfVerified:'false'}).state,'partial_or_unknown');
 assert.equal(projectBank({...snapshot,rows:[{...row(0),identityVerified:'false',allocationStatus:'verified'}]},entity).rows[0].reviewRequired,true);
});

test('cross-invoice bank over-allocation blocks green',()=>{
 const allocation=(id,invoiceNumber)=>({id,invoiceNumber,amount:'100.00',bankPaymentId:'bank-1',bankPaymentAmount:'100.00',bankExecutionVerified:true,counterpartyVerified:true,ownerVerified:true,invoiceAllocationVerified:true,duplicateAndReversalCheckComplete:true});
 const evidence={A:{invoiceNumber:'A',payableAmount:'100.00',payableAmountVerified:true,allocations:[allocation('a','A')]},B:{invoiceNumber:'B',payableAmount:'100.00',payableAmountVerified:true,allocations:[allocation('b','B')]}};
 const safe=safePaymentEvidence(evidence);for(const invoiceNumber of ['A','B'])assert.equal(paymentStatus({invoiceNumber,primaryAmount:'100.00'},safe[invoiceNumber]).state,'partial_or_unknown');
 const single=safePaymentEvidence({A:evidence.A});assert.equal(paymentStatus({invoiceNumber:'A',primaryAmount:'100.00'},single.A).state,'fully_confirmed');
});

test('malformed sibling allocation invalidates every shared bank-payment match',()=>{
 const a=(id,invoiceNumber,amount)=>({id,invoiceNumber,amount,bankPaymentId:'p',bankPaymentAmount:'100.00',bankExecutionVerified:true,counterpartyVerified:true,ownerVerified:true,invoiceAllocationVerified:true,duplicateAndReversalCheckComplete:true});
 for(const bad of ['150.00','malformed']){
 const e={A:{invoiceNumber:'A',payableAmount:'100.00',payableAmountVerified:true,allocations:[a('a','A','100.00')]},B:{invoiceNumber:'B',payableAmount:'100.00',payableAmountVerified:true,allocations:[a('b','B',bad)]}};
 for(const input of [e,{B:e.B,A:e.A}]){const safe=safePaymentEvidence(input);for(const invoiceNumber of ['A','B'])assert.equal(paymentStatus({invoiceNumber,primaryAmount:'100.00'},safe[invoiceNumber]).state,'partial_or_unknown')}
 }
});
