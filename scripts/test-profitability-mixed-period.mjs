import assert from 'node:assert/strict'
import {buildProfitabilitySummary} from '../src/profitability-summary.mjs'
const sample=()=>({rows:[{id:'a',name:'A',revenue:300,totalExpenses:90,net:210,taxRate:0,expenseCategories:[{key:'other',name:'Other',amount:90,details:[{id:'1',date:'2026-09-01',amount:30},{id:'2',date:'2026-10-01',amount:60}]}]}],summaryInputs:{period:{from:'2026-09-01',toExclusive:'2026-11-01'},mixedBasis:true,monthlyAllocationIsolated:true,revenueRows:[{id:'r1',branch_id:'a',revenue_date:'2026-09-01',cash_amount:100},{id:'r2',branch_id:'a',revenue_date:'2026-10-01',cash_amount:200}],coverageIssues:[]}})
let r=sample(),m=buildProfitabilitySummary(r);assert.equal(m.total.net,210);assert.equal(m.mixedBasisBlocksTotals,false);assert.equal(m.total.net,m.monthly.reduce((s,x)=>s+x.net,0));assert.equal(m.mixedBasis,true)
for(const value of [undefined,false,'true']){r=sample();r.summaryInputs.monthlyAllocationIsolated=value;assert.equal(buildProfitabilitySummary(r).total.net,null)}
for(const value of ['2025-12-01',null,'invalid']){r=sample();r.summaryInputs.period.from=value;assert.equal(buildProfitabilitySummary(r).total.net,null)}
for(const reason of ['missing-bank-basis','stale-or-invalid-bank-evidence','missing-network-basis']){r=sample();r.summaryInputs.coverageIssues=[{month:'2026-10',severity:'blocking_runtime_basis',reason}];assert.equal(buildProfitabilitySummary(r).total.net,null)}
r=sample();r.summaryInputs.revenueRows.pop();assert.equal(buildProfitabilitySummary(r).total.net,null)
r=sample();r.rows[0].expenseCategories[0].amount++;assert.equal(buildProfitabilitySummary(r).total.net,null)
r=sample();r.summaryInputs.monthlyAllocationIsolated=false;r.summaryInputs.mixedBasis=false;assert.equal(buildProfitabilitySummary(r).total.net,210)
console.log('PASS mixed-month aggregate: explicit isolation, reconciliation, missing/stale coverage and pre-2026 guards')
