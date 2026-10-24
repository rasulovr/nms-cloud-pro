import assert from 'node:assert/strict'
import {componentInputsFingerprint,bankInputsFingerprintV3,resolveBankEvidence,COMPONENT_SNAPSHOT_TYPE} from '../src/profitability-reviewed-components.mjs'
const month='2026-10',product={id:'tomato',name:'Tomato',category:'Food',base_unit:'kg'},header={id:'purchase',supplier_id:'supplier',branch_id:null,purchase_date:'2026-10-07',invoice_number:null,comment:'Goods',deleted_at:null,suppliers:{name:'Supplier'}}
const item={id:'item',purchase_id:'purchase',product_id:'tomato',quantity:2,unit:'kg',unit_price:3,total_amount:6,supplier_products:product}
const input={revenueRows:[{id:'revenue',branch_id:'branch',revenue_date:'2026-10-01',cash_amount:20,bank_amount:100,wolt_amount:0,source:'import',external_id:'key',comment:'source'}],dailyExpenseRows:[{id:'expense',branch_id:'branch',expense_date:'2026-10-01',amount:2,category_id:'category',custom_category:null,comment:'Taxi',expense_categories:{name:'Taxi'}}],supplierPurchases:[{...header,total_amount:6}],supplierPurchaseItems:[item]}
const proof={version:1,approvalRef:'approval',sourceCheckedAt:'2026-10-24',headers:[header],products:[{...product,unit:'kg'}],fixedItems:[]}
const clone=x=>structuredClone(x),hash=x=>bankInputsFingerprintV3(x,month,proof),base=await hash(input),legacy=await componentInputsFingerprint(input,month)
const record={id:'record',snapshot_type:COMPONENT_SNAPSHOT_TYPE,snapshot_scope:`profitability-components:${month}:bank-basis`,snapshot_data:{version:3,kind:'bank_basis_evidence',month,status:'verified',approvalRef:'approval',expectedBankCommissionRate:2,goodsProof:proof,inputsFingerprint:base,entries:[{id:'revenue',expectedRow:input.revenueRows[0],basis:'gross',commissionPolicy:'apply_configured_rate',collisionIds:[],sourceUrl:'https://example.com/source'}]}}
assert.equal((await resolveBankEvidence([record],input,2)).byId.size,1)
const changed=clone(input);changed.supplierPurchaseItems[0].quantity=3;changed.supplierPurchaseItems[0].total_amount=9;changed.supplierPurchases[0].total_amount=9
assert.equal(await hash(changed),base);assert.notEqual(await componentInputsFingerprint(changed,month),legacy)
const added=clone(input);added.supplierPurchaseItems.push({...item,id:'second'});added.supplierPurchases[0].total_amount=12;assert.equal(await hash(added),base)
const reimport=clone(input);reimport.supplierPurchaseItems[0].id='recreated';assert.equal(await hash(reimport),base)
for(const [label,mutate] of [
 ['header-purpose',x=>x.supplierPurchases[0].comment='Bank commission'],['supplier',x=>x.supplierPurchases[0].supplier_id='bank'],['date',x=>x.supplierPurchases[0].purchase_date='2026-10-08'],['branch',x=>x.supplierPurchases[0].branch_id='other'],['unknown-product',x=>x.supplierPurchaseItems[0].product_id='fee'],['product-name',x=>x.supplierPurchaseItems[0].supplier_products.name='Bank commission'],['category',x=>x.supplierPurchaseItems[0].supplier_products.category='Fee'],['unit',x=>x.supplierPurchaseItems[0].unit='service'],['base-unit',x=>x.supplierPurchaseItems[0].supplier_products.base_unit='service'],['missing-detail',x=>x.supplierPurchaseItems=[]],['mismatch',x=>x.supplierPurchases[0].total_amount=7],['duplicate-item',x=>x.supplierPurchaseItems.push(clone(item))],['missing-id',x=>delete x.supplierPurchaseItems[0].id],['duplicate-header',x=>x.supplierPurchases.push(clone(x.supplierPurchases[0]))]
]){const x=clone(input);mutate(x);await assert.rejects(()=>hash(x),undefined,label)}
for(const invalid of [null,undefined,'',true,[],{},NaN,Infinity,Number.MAX_VALUE,0,-1])for(const field of ['quantity','unit_price','total_amount']){const x=clone(input);x.supplierPurchaseItems[0][field]=invalid;await assert.rejects(()=>hash(x),undefined,field)}
for(const table of ['revenueRows','dailyExpenseRows'])for(const field of Object.keys(input[table][0])){const x=clone(input);const v=x[table][0][field];x[table][0][field]=typeof v==='number'?v+1:field==='expense_categories'?{name:'Changed'}:'Changed';assert.notEqual(await hash(x),base,`${table}.${field}`)}
for(const table of ['revenueRows','dailyExpenseRows']){const x=clone(input);x[table].push({...x[table][0],id:'new'});assert.notEqual(await hash(x),base);const y=clone(input);y[table]=[];assert.notEqual(await hash(y),base)}
for(const rate of [1,3])assert.equal((await resolveBankEvidence([record],input,rate)).byId.size,0)
const v2=clone(record);v2.snapshot_data.version=2;v2.snapshot_data.inputsFingerprint=legacy;delete v2.snapshot_data.goodsProof
assert.equal((await resolveBankEvidence([v2],input,2)).byId.size,1)
for(const records of [[v2,record],[record,v2]])assert.equal((await resolveBankEvidence(records,input,2)).byId.size,0)
const collision=clone(record);collision.snapshot_data.entries[0].collisionIds=['existing'];assert.equal((await resolveBankEvidence([collision],input,2)).byId.size,0)
const held=clone(record);held.snapshot_data.entries[0].commissionPolicy='held_existing_fee_overlap';assert.equal((await resolveBankEvidence([held],input,2)).byId.get('revenue').feeExpenseAllowed,false)
const other=clone(input);other.supplierPurchases.push({...header,id:'bankfee',comment:'Bank commission',total_amount:2});assert.notEqual(await hash(other),base)
assert.equal(await componentInputsFingerprint(input,month),legacy)
const overflow=clone(input);overflow.supplierPurchaseItems[0].quantity=1;overflow.supplierPurchaseItems[0].unit_price=Number.MAX_VALUE;overflow.supplierPurchaseItems[0].total_amount=Number.MAX_VALUE;overflow.supplierPurchases[0].total_amount=Number.MAX_VALUE;await assert.rejects(()=>hash(overflow))
const fixedInput=clone(input),fixedProof=clone(proof)
const parking={...clone(item),id:'parking',product_id:'parking-product',quantity:1,unit:'pcs',unit_price:5,total_amount:5,supplier_products:{id:'parking-product',name:'Parking',category:'Other',base_unit:'pcs'}}
fixedInput.supplierPurchaseItems.push(parking);fixedInput.supplierPurchases[0].total_amount=11
fixedProof.fixedItems=[{purchase_id:'purchase',product:{id:'parking-product',name:'Parking',category:'Other',base_unit:'pcs',unit:'pcs'},quantity:1,unit_price:5,total_amount:5}]
const fixedHash=x=>bankInputsFingerprintV3(x,month,fixedProof),fh=await fixedHash(fixedInput)
const recreated=clone(fixedInput);recreated.supplierPurchaseItems[1].id='new-technical-id';assert.equal(await fixedHash(recreated),fh)
for(const mode of ['remove','add','change']){const x=clone(fixedInput);if(mode==='remove'){x.supplierPurchaseItems.pop();x.supplierPurchases[0].total_amount=6}else if(mode==='add'){x.supplierPurchaseItems.push({...parking,id:'extra'});x.supplierPurchases[0].total_amount=16}else{x.supplierPurchaseItems[1].unit_price=6;x.supplierPurchaseItems[1].total_amount=6;x.supplierPurchases[0].total_amount=12}await assert.rejects(()=>fixedHash(x),undefined,mode)}
console.log('PASS v3 bounded goods: known quantity/price/line changes, strict headers/products/numbers/coverage, revenue/expense/rate/overlap guards, mixed versions and v2 parity')
