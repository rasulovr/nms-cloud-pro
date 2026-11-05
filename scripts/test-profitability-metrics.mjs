import assert from 'node:assert/strict'
import {operationalMetrics,actualProfitabilityView,isClosedProfitabilityMonth} from '../src/profitability-metrics.mjs'
const active={id:'a',name:'A',revenue:100,expenses:40,salary:10,supplierFoodCost:50,serviceCost:0,tax:0,grossRevenue:100,cash:70,bank:30,wolt:0,bankCommission:0,details:[{key:'salary',name:'Зарплаты',amount:10},{key:'supplier-food-cost',name:'Поставщики',amount:50},{key:'correction',name:'Корректировка',amount:-20}]}
const closed={...active,id:'b',name:'B',revenue:0,expenses:7,salary:0,supplierFoodCost:0,operatingExcluded:true,details:[{key:'closed-cost',name:'Закрытый период',amount:7}]}
const model={branches:[{id:'a',monthly:[active]},{id:'b',monthly:[closed]}]}
const p=operationalMetrics(model)
assert.equal(p.expenseRows.reduce((s,r)=>s+r.amount,0),40)
assert.equal(p.disclosedExpenseRows.reduce((s,r)=>s+r.amount,0),7)
assert.equal(p.expenseRows.find(r=>r.amount<0).amount,-20)
assert.equal(p.expenseRatio,40);assert.equal(p.foodCostAmount,50);assert.equal(p.salary,10);assert.equal(p.cash,70);assert.equal(p.bank,30)
for(const row of p.expenseRows)assert.equal(row.details.reduce((s,d)=>s+d.amount,0),row.amount)
assert.equal(operationalMetrics(model,'b').expenseRows.length,0);assert.equal(operationalMetrics(model,'b').disclosedExpenseRows[0].amount,7)
const rendered=actualProfitabilityView({revenue:999,expenses:999,foodCostAmount:999,salary:999,branchRows:[{id:'stale'}]}, {...p,revenue:100,expenses:40,net:60,branches:[]},null)
assert.equal(rendered.expenses,40);assert.equal(rendered.salary,10);assert.equal(rendered.foodCostAmount,50);assert.equal(rendered.previous,null);assert.equal(rendered.branchRows.length,0)
assert.ok(isClosedProfitabilityMonth(2026,10,new Date('2026-11-05T12:00:00Z')))
assert.ok(!isClosedProfitabilityMonth(2026,11,new Date('2026-11-05T12:00:00Z')))
assert.ok(!isClosedProfitabilityMonth(2026,12,new Date('2026-11-05T12:00:00Z')))
assert.ok(isClosedProfitabilityMonth(2026,12,new Date('2027-01-01T12:00:00Z')))
console.log('PASS same-source metrics: signed detail conservation, closed-period disclosure, single/network scope, no stale legacy fields, closed/current/future/year-boundary forecast visibility')
