import assert from 'node:assert/strict'
import {componentInputsFingerprint,resolveComponentRecords,COMPONENT_SNAPSHOT_TYPE} from '../src/profitability-reviewed-components.mjs'
const month='2026-09',row={id:'expense-1',branch_id:'closed-branch',expense_date:'2026-09-20',amount:10,category_id:null,custom_category:'Other',comment:'test',expense_categories:{name:null}}
const input={revenueRows:[],dailyExpenseRows:[row],supplierPurchases:[]},actual=structuredClone(input);actual.dailyExpenseRows[0].expense_categories=null
const hash=await componentInputsFingerprint(input,month)
assert.equal(await componentInputsFingerprint(actual,month),hash)
for(const mutate of [r=>{delete r.expense_categories},r=>{delete r.category_id},r=>{r.category_id='different'},r=>{r.expense_categories={name:'Rent'}},r=>{r.amount=11},r=>{r.expense_categories={}},r=>{r.expense_categories={name:null,extra:true}}]){const changed=structuredClone(actual);mutate(changed.dailyExpenseRows[0]);assert.notEqual(await componentInputsFingerprint(changed,month),hash)}
const nonnull=structuredClone(actual);nonnull.dailyExpenseRows[0].category_id='category-1';const legacyNonNull=structuredClone(nonnull);legacyNonNull.dailyExpenseRows[0].expense_categories={name:null};assert.notEqual(await componentInputsFingerprint(nonnull,month),await componentInputsFingerprint(legacyNonNull,month))
const record={id:'status-1',snapshot_type:COMPONENT_SNAPSHOT_TYPE,snapshot_scope:'profitability-components:2026-09:branch-status:closed-branch',snapshot_data:{kind:'branch_period_status',version:2,month,branchId:'closed-branch',status:'verified',operatingStatus:'closed_nonoperating',revenueObservation:'absent_not_zero',comparisonPolicy:'exclude_operating_disclose_costs',approvalRef:'test',evidence:{messageIds:['test'],confirmedAt:'2026-10-24'},target:{inputsFingerprint:hash,expectedRevenueIds:[],expenseIds:[row.id],expectedExpenseRows:[row],disclosedExpenseTotal:10}}}
assert.equal((await resolveComponentRecords([record],actual)).periodStatuses.length,1)
const changed=structuredClone(actual);changed.dailyExpenseRows[0].amount=11;assert.equal((await resolveComponentRecords([record],changed)).periodStatuses.length,0)
const duplicate=structuredClone(actual);duplicate.dailyExpenseRows.push(structuredClone(duplicate.dailyExpenseRows[0]));await assert.rejects(()=>componentInputsFingerprint(duplicate,month),/duplicate input identity/)
console.log('PASS: null relation equivalence, missing fields, foreign keys, names, amounts, extra fields, closed-period status and duplicate guard')
