import assert from 'node:assert/strict'
import { classifyPurchaseItems, loadCompletePurchaseItems } from '../src/purchase-items-classification.mjs'
import { loadPurchaseReportClassifications, PURCHASE_CLASSIFICATION_PREFIX } from '../src/profitability-persistent-sources.mjs'
import { buildBankReport, BANK_BRANCH_IDS } from '../src/profitability-bank.mjs'
const p={id:'synthetic',total_amount:30},items=[1,2].map(n=>({id:'i'+n,purchase_id:p.id,product_id:'p'+n,total_amount:n*10,supplier_products:{id:'p'+n,category:'Хоз.Товар'}}))
assert.equal(classifyPurchaseItems(p,items,true).amount,30);assert.equal(classifyPurchaseItems(p,items,false),null)
for(const change of [a=>a.pop(),a=>a.push(a[0]),a=>a[0].supplier_products.category='Food',a=>a[0].supplier_products=null,a=>a[0].purchase_id='other',a=>a[0].total_amount=null,a=>a[0].total_amount=11]){const c=structuredClone(items);change(c);assert.equal(classifyPurchaseItems(p,c,true),null)}
let requests=[]
function clientFor(rows,cap=1000){return {from:table=>{assert.equal(table,'supplier_purchase_items');let ids;const q={select:(_s,o)=>{assert.equal(o.count,'exact');return q},in:(_s,v)=>{ids=v;return q},order:()=>q,range:async(a,b)=>{requests.push({ids,a,b});const matching=rows.filter(r=>ids.includes(r.purchase_id));return {data:matching.slice(a,Math.min(b+1,a+cap)),count:matching.length}}};return q}}}
assert.equal((await loadCompletePurchaseItems(clientFor(items,1),[p])).get(p.id).length,2);assert.deepEqual(requests.map(r=>r.a),[0,1])
const url='https://docs.google.com/spreadsheets/d/synthetic/edit#gid=1&range=A1'
const purchases=Array.from({length:40},(_,i)=>({id:'purchase-'+i,purchase_date:`2026-${i<23?'03':'08'}-01`,total_amount:10,comment:i<23?PURCHASE_CLASSIFICATION_PREFIX+JSON.stringify({version:1,category:'household',purchaseId:'purchase-'+i,date:'2026-03-01',amount:10,classificationSource:url,receiptSource:url,verifiedAt:'2026-10-19T00:00:00Z'}):''}))
const liveItems=purchases.map(p=>({id:'item-'+p.id,purchase_id:p.id,product_id:'product',total_amount:10,supplier_products:{id:'product',category:'Хоз.Товар'}}))
requests=[];const classifications=await loadPurchaseReportClassifications(clientFor(liveItems,3),purchases)
assert.equal([...classifications.values()].filter(Boolean).length,40);assert.equal([...classifications.values()].reduce((s,v)=>s+v.amount,0),400)
assert(requests.every(r=>r.ids.length===17 && r.ids.every(id=>Number(id.split('-')[1])>=23)),'only17 unmarked purchases queried; marked23 never double counted')
const selected=[...purchases,{id:'old',purchase_date:'2025-12-01',total_amount:12},{id:'missing',purchase_date:'2026-09-01',total_amount:12}];const result=await loadPurchaseReportClassifications(clientFor(liveItems),selected);assert.equal(result.get('old'),null);assert.equal(result.get('missing'),null,'missing items leave amount unclassified, never imply zero household')
const id=BANK_BRANCH_IDS[0],months=['2025-12','2026-03','2026-08','2026-09'];
function report(map){const food=[],household=[];for(const p of selected){(map?.get(p.id)?household:food).push({date:p.purchase_date,amount:p.total_amount})}const salary=months.map(m=>({date:m+'-01',amount:100}));return {period:{from:'2025-10-01',toExclusive:'2026-10-01'},bankInputs:{revenueRows:months.map(m=>({branch_id:id,revenue_date:m+'-01',cash_amount:1000})),salaryPeriods:months.map(m=>({branch_id:id,salary_month:m+'-01'}))},allRows:[{id,name:'Synthetic',revenue:4000,totalExpenses:824,net:3176,expenseCategories:[{key:'salary',name:'Salary',amount:400,details:salary},{key:'supplier-food-cost',name:'FoodCost',amount:food.reduce((s,r)=>s+r.amount,0),details:food},...(household.length?[{key:'supplier-household',name:'ХозТовары',amount:household.reduce((s,r)=>s+r.amount,0),details:household}]:[])]}]}}
const before=buildBankReport(report(null),[id]),after=buildBankReport(report(result),[id]);assert.deepEqual(after.combined.totals,before.combined.totals);assert.equal(after.reconciled,true)
assert.equal(JSON.stringify(after.branches[0].monthly.map(r=>r.categories.salary)),JSON.stringify(before.branches[0].monthly.map(r=>r.categories.salary)))
assert.deepEqual(after.branches[0].monthly.map(r=>[r.month,r.expenses,r.net]),before.branches[0].monthly.map(r=>[r.month,r.expenses,r.net]))
assert.equal(after.branches[0].monthly.find(r=>r.month==='2026-09').categories['supplier-food-cost'],12,'missing-item purchase retained at full cost')
assert.deepEqual(buildBankReport(report(result),[id]),after)
console.log('Items classifier: complete pagination, mixed/missing rejects,23 marked+17 item-only exclusive, mixed-period expense/net conservation,2026 salary exact PASS')

for(const response of [{data:[],count:2},{data:[],count:null},{data:[],count:50001},{data:[],count:0,error:{message:'denied'}}]) {
 const bad={from:()=>{const q={select:()=>q,in:()=>q,order:()=>q,range:async()=>response};return q}}
 await assert.rejects(()=>loadCompletePurchaseItems(bad,[p]))
}
requests=[];await loadPurchaseReportClassifications(clientFor([]),purchases.slice(0,23));assert.equal(requests.length,0,'marked-only report requires no item reads')
