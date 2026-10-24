// Bounded reviewed-goods exception. This validates evidence; it never changes
// financial rows, classifications, totals, or the historical v2 contract.
const canon=v=>Array.isArray(v)?v.map(canon).sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b))):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canon(v[k])])):v
const same=(a,b)=>JSON.stringify(canon(a))===JSON.stringify(canon(b))
const headerKeys=['id','supplier_id','branch_id','purchase_date','invoice_number','comment','deleted_at','suppliers']
const required=(o,keys)=>keys.every(k=>Object.hasOwn(o,k))
const number=v=>{if(!['number','string'].includes(typeof v)||String(v).trim()===''||!Number.isFinite(Number(v)))throw Error('Missing goods numeric field');return Number(v)}
const product=r=>({id:r.product_id,name:r.supplier_products?.name,category:r.supplier_products?.category,base_unit:r.supplier_products?.base_unit,unit:r.unit})
const semantic=r=>({purchase_id:r.purchase_id,product:product(r),quantity:number(r.quantity),unit_price:number(r.unit_price),total_amount:number(r.total_amount)})
const unique=rows=>rows.every(r=>r.id)&&new Set(rows.map(r=>String(r.id))).size===rows.length
export function normalizeReviewedGoodsPurchases(input,month,proof){
 if(proof?.version!==1||!proof.approvalRef||!proof.sourceCheckedAt||!Array.isArray(proof.headers)||!proof.headers.length||proof.headers.length>7||!unique(proof.headers)||!Array.isArray(proof.products)||proof.products.length>256||!Array.isArray(proof.fixedItems))throw Error('Invalid goods proof')
 if(!Array.isArray(input.supplierPurchases)||!Array.isArray(input.supplierPurchaseItems)||!unique(input.supplierPurchaseItems))throw Error('Incomplete goods item coverage')
 const headers=new Map(proof.headers.map(h=>[String(h.id),h])),current=new Map(input.supplierPurchases.map(p=>[String(p.id),p]))
 if(!unique(input.supplierPurchases)||[...headers].some(([id,h])=>!required(h,headerKeys)||String(h.purchase_date).slice(0,7)!==month||!current.has(id)))throw Error('Missing goods purchase identity')
 if(proof.products.some(p=>!required(p,['id','name','category','base_unit','unit'])||!p.id||!p.name||!p.category||!p.unit||!p.base_unit)||new Set(proof.products.map(p=>JSON.stringify(canon(p)))).size!==proof.products.length)throw Error('Invalid reviewed product identity')
 const products=new Set(proof.products.map(p=>JSON.stringify(canon(p)))),fixed=[]
 const selected=input.supplierPurchaseItems.filter(r=>headers.has(String(r.purchase_id)))
 if(selected.length>5000)throw Error('Goods item limit exceeded')
 for(const [id,expected]of headers){
  const row=current.get(id)
  if(!required(row,[...headerKeys,'total_amount'])||!same(Object.fromEntries(headerKeys.map(k=>[k,row[k]])),expected))throw Error('Changed goods purchase purpose')
  const items=selected.filter(r=>String(r.purchase_id)===id)
  if(!items.length)throw Error('Missing purchase item detail')
  let cents=0
  for(const item of items){
   if(!required(item,['id','purchase_id','product_id','quantity','unit','unit_price','total_amount','supplier_products'])||!item.product_id||item.supplier_products?.id!==item.product_id)throw Error('Unmapped purchase item')
   const value=semantic(item),q=value.quantity,price=value.unit_price,total=value.total_amount
   const lineCents=Math.round(total*100),calculatedCents=Math.round(q*price*100+1e-8)
   if(!(q>0)||!(price>0)||!(total>0)||!Number.isSafeInteger(lineCents)||!Number.isSafeInteger(calculatedCents)||Math.abs(total*100-lineCents)>1e-6||calculatedCents!==lineCents)throw Error('Unreconciled purchase item')
   cents+=lineCents
   if(!Number.isSafeInteger(cents))throw Error('Purchase total exceeds safe range')
   if(!products.has(JSON.stringify(canon(value.product))))fixed.push(value)
  }
  const headerCents=number(row.total_amount)*100
  if(!Number.isSafeInteger(Math.round(headerCents))||Math.abs(headerCents-cents)>1e-6)throw Error('Unreconciled purchase total')
 }
 if(!same(fixed,proof.fixedItems))throw Error('Unknown or changed non-goods item')
 return input.supplierPurchases.map(row=>headers.has(String(row.id))?{...row,total_amount:0}:row)
}
