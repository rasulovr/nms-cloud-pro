import assert from 'node:assert/strict';
import {sumAmounts,debtDifference,differenceLabel} from '../src/eqaime-totals.mjs';
import {documentRows} from '../src/eqaime-display.mjs';
import {bankPage} from '../server/eqaime-bank.mjs';
const a='supplier-00000000-0000-4000-8000-000000000001',b='supplier-00000000-0000-4000-8000-000000000002';
assert.equal(sumAmounts(['1010.9997','473.9305']),'1484.9302');assert.equal(sumAmounts(['0.1','0.2']),'0.30');assert.equal(debtDifference('12.34'),'-12.34');assert.equal(debtDifference('-12.34'),'12.34');assert.equal(debtDifference('0.00'),'0.00');assert.equal(debtDifference(null),null);assert.equal(differenceLabel(null),'Не рассчитано');assert.match(differenceLabel('-1'),/Долг/);assert.match(differenceLabel('0.00'),/Сходится/);assert.match(differenceLabel('1'),/Переплата/);
const docs=Array.from({length:30},(_,i)=>({invoiceNumber:'A'+i,supplierKey:i===29?b:a,supplierName:'Same name',description:'coffee',primaryAmount:'1.0001',documentDate:'2026-01-01'}));
const filtered=documentRows(docs,{supplier:a,search:'coffee',from:'2026-01-01',to:'2026-01-01'});assert.equal(filtered.length,29);assert.equal(sumAmounts(filtered.map(x=>x.primaryAmount)),'29.0029');assert.equal(documentRows(docs,{supplier:b}).length,1);assert.equal(documentRows(docs,{supplier:a,search:'missing'}).length,0);
const source={rows:Array.from({length:205},(_,i)=>({id:String(i),supplierKey:i===204?b:a,recipientName:'Same name',date:i<150?'2026-02-01':'2026-01-01',amount:'1.23',visibilityClass:'supplier_company',purpose:'coffee',electronicInvoiceNumbers:['A']})),coverage:{complete:false}};
for(const page of [1,2,3]){const r=bankPage(source,{supplier:a,page,search:'coffee'});assert.equal(r.total,204);assert.equal(r.filteredAmount,'250.92');assert(r.rows.every(x=>x.supplierKey===a));assert(r.rows.length<=100)}
assert.equal(bankPage(source,{supplier:a,from:'2026-02-01'}).filteredAmount,'184.50');assert.equal(bankPage(source,{supplier:b}).filteredAmount,'1.23');assert.equal(bankPage(source,{supplier:b,search:'missing'}).filteredAmount,'0.00');assert.throws(()=>bankPage(source,{supplier:'Same name'}));
console.log('Supplier identity/filter/full-result totals/exact-decimal/debt sign/null tests PASS');
