import assert from 'node:assert/strict';
import {observedStatus,checkedHistoricalEvidence} from '../server/eqaime-observed-status.mjs';
import {bankPage} from '../server/eqaime-bank.mjs';
const inv={invoiceNumber:'AA123',primaryAmount:'100.0000',sourceReviewRequired:false};
const c={referencesChecked:true};
const e={invoiceNumber:'AA123',kind:'single',identityVerified:true,referencesVerified:true,amount:'100.00',paymentDates:['2026-11-01']};
assert.equal(observedStatus(inv,e,c).state,'paid_observed');
assert.match(observedStatus(inv,e,c).label,/совпадению номера и суммы/);
assert.match(observedStatus(inv,{...e,amount:'50'},c).label,/Частичная/);
assert.equal(observedStatus(inv,{...e,kind:'group'},c).confirmedPaidAmount,null);
assert.equal(observedStatus(inv,undefined,c).label,'Оплата не найдена в доступных выписках');
assert.equal(observedStatus(inv,undefined,undefined).state,'partial_or_unknown');
assert.equal(observedStatus({...inv,sourceReviewRequired:true},e,c).confirmedPaidAmount,null);
assert.equal(observedStatus(inv,{...e,identityVerified:false},c).confirmedPaidAmount,null);
assert.throws(()=>checkedHistoricalEvidence({historicalPaymentEvidence:{version:1}}));
const rows=['supplier_company','excluded','review',undefined].map((v,i)=>({id:String(i),date:'2026-01-01',purpose:'',electronicInvoiceNumbers:[],visibilityClass:v}));
assert.equal(bankPage({rows,coverage:{}}).total,1);
assert.equal(bankPage({rows,coverage:{}}).hiddenCount,3);
console.log('11 observed-status/filter assertions PASS');

// Independent reviewer regression cases: no financial confirmation from malformed evidence.
for(const patch of [{kind:'unknown'},{identityVerified:'true'},{referencesVerified:'true'},{paymentDates:['2026-02-30']},{paymentDates:['2026-99-99']},{paymentDates:['not-a-date']},{amount:'-1'},{amount:'1e2'}]){
 assert.equal(observedStatus(inv,{...e,...patch},c).confirmedPaidAmount,null);
}
assert.equal(observedStatus(inv,undefined,{referencesChecked:'true'}).state,'partial_or_unknown');
const payment={id:'synthetic-payment-1',date:'2026-11-01',amount:'100'};
const single={...e,payments:[payment]};
const snapshot=byInvoice=>({historicalPaymentEvidence:{version:1,referencesChecked:true,bankSourceSha256:'a'.repeat(64),byInvoice}});
assert.ok(checkedHistoricalEvidence(snapshot({AA123:single})));
for(const patch of [{payments:[]},{payments:[{...payment,date:'2026-02-30'}]},{payments:[{...payment,amount:'99'}]},{payments:[{...payment,id:''}]},{payments:[payment,payment],amount:'200'},{invoiceNumber:'OTHER'}]){
 assert.throws(()=>checkedHistoricalEvidence(snapshot({AA123:{...single,...patch}})));
}
assert.throws(()=>checkedHistoricalEvidence(snapshot({AA123:single,BB456:{...single,invoiceNumber:'BB456'}})));
assert.throws(()=>checkedHistoricalEvidence(snapshot({AA123:{...single,paymentDates:['2026-10-01']}})),'displayed dates must match evidenced payment dates');
console.log('Independent observed evidence negative regressions PASS');

const {makeHandler}=await import('../server/eqaime-api.mjs');
for(const maxBytes of [0,1,3000001,Infinity,NaN,'3000000'])assert.throws(()=>makeHandler({maxBytes}));
assert.equal(typeof makeHandler({maxBytes:3000000}),'function');
console.log('Bounded API response limit regressions PASS');

assert.deepEqual(observedStatus(inv,e,c).observedRemainder,{amount:'0.00',provisional:true,basis:'verified_observed_payments_only'});
assert.equal(observedStatus(inv,{...e,amount:'50'},c).observedRemainder.amount,'50.00');
assert.equal(observedStatus({...inv,primaryAmount:'100.0001'},{...e,amount:'50'},c).observedRemainder.amount,'50.0001');
for(const ev of [undefined,{...e,kind:'group'},{...e,identityVerified:false}])assert.equal(observedStatus(inv,ev,c).observedRemainder,undefined);
assert.equal(observedStatus(inv,{...e,amount:'101'},c).observedRemainder,null);
assert.equal(observedStatus({...inv,sourceReviewRequired:true},e,c).observedRemainder,undefined);
console.log('Provisional remainder exact-decimal regressions PASS');

// Green is the user's matching rule, not a claim of current settled debt.
assert.match(observedStatus(inv,e,c).coverageNotice,/Возвраты/);
for(const patch of [{amount:'99.99'},{amount:'100.01'},{kind:'group'},{invoiceNumber:'OTHER'},{identityVerified:false},{referencesVerified:false}])assert.notEqual(observedStatus(inv,{...e,...patch},c).state,'paid_observed');
assert.notEqual(observedStatus({...inv,primaryAmount:'100.0001'},e,c).state,'paid_observed');
assert.notEqual(observedStatus({...inv,primaryAmount:'0'},{...e,amount:'0'},c).state,'paid_observed');
console.log('Exact observed payment green / no rounding / no group allocation regressions PASS');
