import assert from 'node:assert/strict'
import {BANK_BRANCH_IDS,buildBankReport} from '../src/profitability-bank.mjs'
import {validateBank2025Snapshot,loadBank2025Snapshot,BANK_2025_SNAPSHOT_TYPE,BANK_2025_SNAPSHOT_SCOPE} from '../src/bank-report-2025-source.mjs'
const url='https://docs.google.com/spreadsheets/d/synthetic/edit#gid=1&range=D1:D20'
const rows=BANK_BRANCH_IDS.flatMap(branchId=>Array.from({length:12},(_,i)=>({branchId,month:`2025-${String(i+1).padStart(2,'0')}`,salaryBase:100,managerIncluded:20,salary:120,household:10,householdSourceUrl:url,householdCell:'AL11',householdFormula:'=SUM(A1:A2)',payrollEvidence:{kind:'named-monthly-gross',column:'D',holdCount:0,expectedRows:2,verifiedRows:2,sourceUrls:[url]}})))
const record={id:'synthetic-snapshot',snapshot_type:BANK_2025_SNAPSHOT_TYPE,snapshot_scope:BANK_2025_SNAPSHOT_SCOPE,snapshot_data:{version:2,year:2025,currency:'AZN',status:'verified',managerMethodApproved:true,managerMethod:'synthetic-approved',verifiedAt:'2026-10-19T00:00:00Z',rows}}
assert.equal(validateBank2025Snapshot(record).rows.length,24)
for(const modify of [d=>d.status='draft',d=>d.managerMethodApproved=false,d=>d.rows.pop(),d=>d.rows[0].payrollEvidence.holdCount=1,d=>d.rows[0].salary=121,d=>d.year=2026]){const copy=structuredClone(record);modify(copy.snapshot_data);assert.throws(()=>validateBank2025Snapshot(copy))}
let reads=0
const client={from:()=>{reads++;const chain={select:()=>chain,eq:()=>chain,order:()=>chain,limit:async()=>({data:[record],error:null})};return chain}}
assert.equal(await loadBank2025Snapshot(client,{from:'2026-01-01',toExclusive:'2027-01-01'}),null);assert.equal(reads,0,'2026 must not read2025 report store')
const source=await loadBank2025Snapshot(client,{from:'2025-01-01',toExclusive:'2026-01-01'});assert.equal(reads,1)
const id=BANK_BRANCH_IDS[0],month='2025-01';const report={period:{from:month+'-01',toExclusive:'2025-02-01'},bankInputs:{sourceDataset:source,sourceRequired2025:true,partialPayrollMonths:[month],revenueRows:[{branch_id:id,revenue_date:month+'-01',cash_amount:1000}],salaryPeriods:[]},allRows:[{id,name:'Synthetic',revenue:1000,totalExpenses:140,net:860,revenueShare:20,taxRate:8,expenseCategories:[{key:'salary',name:'salary',amount:20,details:[{date:month+'-01',amount:20}]},{key:'supplier-food-cost',name:'food',amount:100,details:[{date:month+'-01',amount:100}]},{key:'supplier-household',name:'household',amount:20,details:[{date:month+'-01',amount:20}]}]}]}
const model=buildBankReport(report,[id]);assert.equal(model.reconciled,true);assert.equal(model.branches[0].monthly[0].categories.salary,120);assert.equal(model.combined.totals.expenses,240,'replace salary, do not add entire source a second time');assert.equal(model.branches[0].monthly[0].categories['supplier-food-cost'],110,'household reclassification conserves procurement even when source is smaller');assert.equal(model.coverageBlockers.length,0,'complete source settles partial ledger coverage without changing ledger')
assert.deepEqual(report.bankInputs.salaryPeriods,[])
console.log('Persistent2025 snapshot: strict completeness, approved management, source replacement, no ledger writes and2026 isolation PASS')
