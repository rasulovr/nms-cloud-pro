import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import {groupRegister,uniquePayments} from '../server/eqaime-grouping.mjs'
const base=n=>'MT990100'+String(n).padStart(6,'0')
const card=(id,number,supplier='synthetic-supplier')=>({id,invoice_number:number,supplier_id:supplier,supplierName:'Synthetic supplier',amount:7.25,invoice_date:'2030-09-09',reasons:[]})
test('39 synthetic fragments produce two groups without inferred totals',()=>{
 const rows=[...Array.from({length:28},(_,i)=>card('a'+i,base(1)+(i?' Hissəvi '+i:''))),...Array.from({length:11},(_,i)=>card('b'+i,base(2)+' Hissəvi'+(i?' '+i:'')))]
 const g=groupRegister(rows);assert.equal(g.length,2);assert.deepEqual(g.map(x=>x.childIds.length),[28,11]);assert.ok(g.every(x=>x.primaryAmount===null&&x.delta===null&&x.confirmedDebt===null));assert.ok(g.every(x=>!Object.hasOwn(x,'amount')));assert.equal(rows[0].amount,7.25)
})
test('same date different document numbers remain separate',()=>{assert.equal(groupRegister([1,2,3,4].map(i=>card('h'+i,base(i)))).length,4)})
test('same number different supplier never combines',()=>{assert.equal(groupRegister([card('a',base(1),'s1'),card('b',base(1),'s2')]).length,2)})
test('recognized numbered partial case/spacing joins including bare Hissəvi joins; unknown/correction suffix stays separate',()=>{
 const rows=[card('a',base(1)),card('b',base(1)+' Hissəvi  2'),card('c',base(1)+' hissəvi 3'),card('d',base(1)+' Hissəvi'),card('e',base(1)+' correction 1'),card('f',base(1)+'-Hissəvi 4')]
 const g=groupRegister(rows);assert.equal(g.length,3);assert.equal(g[0].childIds.length,4);assert.ok(g.slice(1).every(x=>x.kind==='review_card'))
})
test('39 natural-like cards with 41 extracted keys and three composite cards never split/doublecount',()=>{
 const rows=Array.from({length:36},(_,i)=>card('n'+i,base(i+1)))
 rows.push(card('c1',base(1)+', '+base(37)),card('c2',base(2)+', '+base(38)),card('c3',[39,40,41].map(base).join(', ')))
 assert.equal(rows.length,39);assert.equal(new Set(rows.flatMap(x=>x.invoice_number.match(/MT\d{12}/g))).size,41)
 const g=groupRegister(rows);assert.equal(g.length,39);assert.equal(g.filter(x=>x.kind==='review_card').length,3);assert.equal(g.flatMap(x=>x.childIds).length,39);assert.ok(g.find(x=>x.invoice_number===base(1)).reasons.some(x=>x.includes('пересечение')))
})
test('RMS dates retained as range, not document issue date',()=>{const rows=[card('a',base(1)),{...card('b',base(1)+' Hissəvi 1'),invoice_date:'2030-10-10'}];const g=groupRegister(rows)[0];assert.equal(g.rmsDateFrom,'2030-09-09');assert.equal(g.rmsDateTo,'2030-10-10');assert.equal(g.invoice_date,undefined)})
test('repeat exact payment identity represented once, conflicting duplicate blocked',()=>{const p={id:'payment-demo',amount:19};assert.equal(uniquePayments([p,{...p}]).length,1);assert.throws(()=>uniquePayments([p,{...p,amount:20}]),/Conflicting/)})
test('blank supplier and embedded number remain ungrouped for review',()=>{const g=groupRegister([card('a',base(1),''),card('b','reference '+base(1))]);assert.ok(g.every(x=>x.kind==='review_card'))})
test('UI labels amount unknown, nested card amount not primary; no aggregate',()=>{const s=fs.readFileSync(new URL('../src/EqaimeReconciliation.jsx',import.meta.url),'utf8');assert.match(s,/Первичная сумма/);assert.match(s,/Не подтверждена/);assert.match(s,/Не сумма первичной e-qaimə/);assert.match(s,/Внутренние карточки:/);assert.doesNotMatch(s,/money\(x\.primaryAmount\)/);assert.match(s,/report.groups/);assert.match(s,/Не дата первичного документа/)})

test('bare Hissəvi and numbered partial form one group with no primary total',()=>{const g=groupRegister([card('a',base(7)+' Hissəvi'),card('b',base(7)+' Hissəvi 1')]);assert.equal(g.length,1);assert.equal(g[0].childIds.length,2);assert.equal(g[0].primaryAmount,null)})

test('missing internal invoice number is explicit, never invented',()=>{const s=fs.readFileSync(new URL('../src/EqaimeReconciliation.jsx',import.meta.url),'utf8');assert.match(s,/Внутренняя накладная без номера/);assert.doesNotMatch(s,/purchaseNumber\|\|i\+1/)})

test('client rejects missing groups and invalid group/card membership',async()=>{
 const {loadEqaimeRegister}=await import('../src/eqaime-register.mjs')
 const client={auth:{getSession:async()=>({data:{session:{access_token:'synthetic'}}})}}
 const good={status:'blocked',confirmedDebt:null,primaryCoverage:null,rows:[{id:'a'}],payments:[],groups:[{id:'g',childIds:['a'],primaryAmount:null}]}
 for(const changed of [{...good,groups:undefined},{...good,groups:[]},{...good,groups:[{id:'g',childIds:['missing'],primaryAmount:null}]},{...good,groups:[...good.groups,...good.groups]},{...good,groups:[{id:'g',childIds:['a','a'],primaryAmount:null}]}])await assert.rejects(()=>loadEqaimeRegister(client,{request:async()=>({ok:true,json:async()=>changed})}))
 assert.equal((await loadEqaimeRegister(client,{request:async()=>({ok:true,json:async()=>good})})).groups.length,1)
})
