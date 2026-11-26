export const BC4_CATALOG_VERSION='bc4-cart-v1';
export function useBC4Projection(search, setting) {
 const branches=new URLSearchParams(search).getAll('branch');
 return setting===BC4_CATALOG_VERSION && branches.length===1 && branches[0]==='BC4';
}
export const toCents=value=>typeof value==='number' && Number.isFinite(value) && value>=0 &&
 Math.abs(value*100-Math.round(value*100))<1e-8 && value<=10000 ? Math.round(value*100) : null;

const completeCopy=new Set(['live_full','matches_visible_card']);
const eligibleCopy=new Set([...completeCopy,'live_prefix_only']);
export function safeCopy(copy){
 if(!eligibleCopy.has(copy?.copyStatus))return null;
 const text=(copy.description||'').trim();
 return {name:copy.name,category:copy.category,description:copy.copyStatus==='live_prefix_only'?text.slice(0,90).trimEnd().replace(/(?:\.{3}|…)+$/u,'')+'…':text};
}
export function projectBC4(catalog) {
 if(!Array.isArray(catalog?.rows)||catalog.rows.length!==180||new Set(catalog.rows.map(r=>r.categorySourceId)).size!==26||new Set(catalog.rows.map(r=>r.key)).size!==180) throw Error('Invalid BC4 catalogue snapshot');
 return catalog.rows.slice().sort((a,b)=>a.categoryOrder-b.categoryOrder||a.order-b.order).map(r=>{
  const src=r.translations||{};
  // Delegate unknown/fallback language only for titles. No alternate-language ingredient claims.
  const ru=safeCopy(src.ru),az=safeCopy(src.az),en=safeCopy(src.en);
  const variants=(r.sourceOptionPrices||[]).map(([label,value],i)=>({id:BC4_CATALOG_VERSION+':'+r.key+':'+i,label,cents:toCents(value)}));
  const addon=r.slug==='sygar-syrop';
  const baseCents=addon?0:r.billableWithoutChoice&&!variants.length?toCents(r.price):null;
  return {id:r.key,translationKey:r.key,sourceName:ru?.name||az?.name||en?.name||r.name,sourceDescription:ru?.description||'',name:ru?.name||az?.name||en?.name||r.name,
   description:ru?.description||'',category:r.categorySourceId, price:baseCents===null?null:baseCents/100,baseCents,image:r.image,options:[],variants,addon,
   snapshotCopy:{ru,az,en},categoryNames:Object.fromEntries(['ru','az','en'].map(l=>[l,src[l]?.category||r.category])),
   branches:['BC4'],bc4Projected:true};
 });
}
export function localizeBC4(item,lang){
 const text=item.snapshotCopy?.[lang];
 return {...item,name:text?.name||item.sourceName,description:text?.description||''};
}
export function selectedBC4(item,variantId=''){
 if(!item?.bc4Projected)return null;
 const option=item.variants.find(x=>x.id===variantId);
 const unitCents=item.variants.length ? option?.cents : variantId==='' ? item.baseCents : null;
 if(unitCents==null)return null;
 return {...item,option_name:option?.label||null,variantId,lineKey:JSON.stringify([item.id,variantId]),unitCents,price:unitCents/100};
}
export function changeBC4Cart(cart, line, delta) {
 if(!Number.isInteger(delta)||!delta||!line?.lineKey)return cart;
 if(line.addon && delta>0 && !cart.some(x=>!x.addon))return cart;
 const found=cart.some(x=>x.lineKey===line.lineKey);
 const next=found?cart.map(x=>x.lineKey===line.lineKey?{...x,qty:Math.min(99,x.qty+delta)}:x).filter(x=>x.qty>0):delta>0?[...cart,{...line,qty:Math.min(99,delta)}]:cart;
 return next.some(x=>!x.addon)?next:next.filter(x=>!x.addon);
}
