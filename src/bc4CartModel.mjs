export const VERSION = 'bc4-cart-v1';
export const useBC4Cart = (search, setting) =>
  setting === VERSION && new URLSearchParams(search).getAll('branch').length === 1 &&
  new URLSearchParams(search).get('branch') === 'BC4';

export const optionLabel = option => option.label;
const cents = v => typeof v === 'number' && Number.isFinite(v) && v >= 0 && Math.abs(v*100-Math.round(v*100))<1e-8 && v<=10000 ? Math.round(v*100) : null;
export function menuModel(rows) {
 if(new Set(rows.map(r=>r.key)).size!==rows.length) throw Error("Duplicate catalogue placement");
 return rows.slice().sort((a,b)=>a.categoryOrder-b.categoryOrder || a.order-b.order).map(r=>({
  ...r,
  options:(r.sourceOptionPrices||[]).map(([label,p],i)=>({id:VERSION+'|'+r.key+'|'+i,label,cents:cents(p)})),
  base: r.slug==='sygar-syrop' ? 0 : r.billableWithoutChoice ? cents(r.price) : null,
  addon:r.slug==='sygar-syrop',
 }));
}
export function editCart(cart, byKey, key, picked, delta) {
 const item=byKey.get(key);
 const price=item?.options.length ? item.options.find(o=>o.id===picked)?.cents : picked==='' ? item?.base : null;
 if(price==null || ![-1,1].includes(delta)) return cart;
 const same=x=>x.key===key && x.picked===picked;
 const found=cart.find(same);
 // The syrup is a zero-cost add-on; never allow it as a cart by itself.
 if(item.addon && delta>0 && !cart.some(x=>!byKey.get(x.key)?.addon)) return cart;
 if(!found && delta<0) return cart;
 let next=found?cart.map(x=>same(x)?{...x,qty:Math.min(x.qty+delta,50)}:x).filter(x=>x.qty>0):[...cart,{key,picked,qty:1}];
 if(!next.some(x=>!byKey.get(x.key)?.addon)) next=next.filter(x=>!byKey.get(x.key)?.addon);
 return next;
}
export function cartLines(cart, byKey) {
 return cart.flatMap(x=>{
  const item=byKey.get(x.key), option=item?.options.find(o=>o.id===x.picked);
  const price=item?.options.length ? option?.cents : item?.base;
  return price == null ? [] : [{...x,item,option,price,subtotal:price*x.qty}];
 });
}
