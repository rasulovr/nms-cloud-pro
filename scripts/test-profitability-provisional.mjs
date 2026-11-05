import assert from 'node:assert/strict'
import {captureProvisionalProfit} from '../src/profitability-provisional.mjs'
import {profitabilitySurface,profitabilityTrend,profitDisclosureText} from '../src/profitability-surface.mjs'
const period={from:'2026-10-01',toExclusive:'2026-11-01'}
const revenueRows=[{id:'r',branch_id:'a',revenue_date:'2026-10-01',cash_amount:100,bank_amount:0,wolt_amount:0}]
const row={id:'a',name:'Synthetic',revenue:100,totalExpenses:40,net:60,taxRate:0,expenseCategories:[{key:'other',amount:40,details:[{date:'2026-10-01',amount:40}]}]}
const input={revenueRows,dailyExpenseRows:[{amount:40}],supplierPurchases:[],salaryPeriods:[],serviceRows:[]}
const capture=(changes={})=>captureProvisionalProfit({rows:[row],totals:row,input,revenueRows,period,coverageIssues:[],allocationComplete:true,bankBasisConfirmed:false,...changes})
const report=(changes={})=>({rows:[row],provisional:capture(),summaryInputs:{period,monthlyAllocationIsolated:true,revenueRows,coverageIssues:[{reason:'missing-coverage-manifest',severity:'blocking_runtime_basis',month:'2026-10'}]},...changes})
let surface=profitabilitySurface(report());assert.equal(surface.net,60);assert.equal(surface.verified,false);assert.match(profitDisclosureText(surface),/до комиссии/)
assert.doesNotMatch(profitDisclosureText(surface),/missing-coverage-manifest/)
for(const reason of ['missing-coverage-manifest','stale-or-invalid-bank-evidence','stale-or-invalid-coverage-manifest']) {
 const r=report();r.summaryInputs.coverageIssues[0].reason=reason;assert.equal(profitabilitySurface(r).net,60)
}
for(const value of [null,undefined,'',NaN,Infinity,'garbage']) {
 const provisional=capture({input:{...input,dailyExpenseRows:[{amount:value}]}})
 assert.equal(provisional.available,false)
 assert.equal(profitabilitySurface(report({provisional})).net,null)
 const r=report({provisional});r.summaryInputs.coverageIssues=[];assert.equal(profitabilitySurface(r).net,null,'invalid source also blocks otherwise canonical total')
}
for(const reason of ['invalid-payroll-accrual','historical-payroll-basis-review-required','missing-payroll-accruals','unresolved-payroll-identity'])assert.equal(capture({coverageIssues:[{reason}]}).available,false)
assert.equal(profitabilitySurface(report({provisional:capture({allocationComplete:false})})).net,null)
for(const change of [{error:'read failure'},{loading:true}])assert.equal(profitabilitySurface(report(change)).net,null)
assert.equal(capture({rows:[],revenueRows:[],totals:{net:0,revenue:0,totalExpenses:0}}).net,null)
assert.equal(capture({totals:{net:0,revenue:0,totalExpenses:0},revenueRows:[{...revenueRows[0],cash_amount:0}]}).net,0,'observed zero remains zero')
const zeroCost={...row,id:'b',revenue:0,totalExpenses:20,net:-20,expenseCategories:[{key:'other',amount:20,details:[{date:'2026-10-01',amount:20}]}]}
const costs=capture({rows:[row,zeroCost],totals:{net:40,revenue:100,totalExpenses:60}})
assert.equal(profitabilitySurface(report({rows:[row,zeroCost],provisional:costs})).net,40,'expense-only branch costs remain in network total')
assert.equal(costs.branches[1].net,null,'absent observations are not an observed zero for branch')
const confirmed=report();confirmed.summaryInputs.coverageIssues=[];assert.equal(profitabilitySurface(confirmed).verified,true)
const partial=report();partial.summaryInputs.period={from:'2026-11-01',toExclusive:'2026-12-01'};assert.ok(profitabilitySurface(partial,new Date('2026-11-05')).reasons.includes('partial-reporting-month'))
assert.equal(profitabilityTrend(profitabilitySurface(confirmed),surface).delta,null)
const mixed=report();mixed.summaryInputs.period={from:'2026-09-01',toExclusive:'2026-11-01'};mixed.summaryInputs.mixedBasis=true;mixed.summaryInputs.monthlyAllocationIsolated=false
assert.equal(profitabilitySurface(mixed).net,null,'incomparable mixed range cannot be resurrected')
assert.equal(profitabilitySurface(confirmed).net,60,'another month failure cannot poison confirmed result')
console.log('PASS provisional capture: missing/stale attestation, independent verified status, explicit bank basis; invalid amounts/read/allocation fail closed, true zero/empty/expense-only branch/partial/mixed/month isolation; no mixed-status trend')
