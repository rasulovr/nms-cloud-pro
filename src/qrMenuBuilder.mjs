import {tagCodes} from './qrMenuTags.mjs';
export const qrBuilderBranches=['BC1','BC2','BC4','BC5'];
export const qrBuilderLanguages=['ru','az','en'];
export const emptyQrBuilder=()=>({categories:{},items:{},offer:null});
const object=x=>x!==null&&typeof x==='object'&&!Array.isArray(x)?x:{};
export const cleanQrBuilder=d=>({categories:object(d?.categories),items:object(d?.items),offer:d?.offer&&typeof d.offer==='object'?d.offer:null});
export const qrBuilderText=(o,lang)=>String(o?.[lang]||o?.ru||o?.az||o?.en||'');
export const qrBuilderImage=url=>typeof url==='string'&&(/^(https:\/\/[^\s]+|\/menu\/[\w.-]+)$/i.test(url))?url:'';
export function qrBuilderOverlay(base,doc,branch){
  const {items,categories}=cleanQrBuilder(doc);
  const out=[];
  for(const original of base){
    const entry=items[original.id];
    if(!entry){out.push(original);continue}
    if(entry.hidden===true)continue;
    const category=entry.category||original.category;
    const categoryNames=categories[category]?.names||original.categoryNames;
    out.push({...original,category,categoryNames,
      ...(entry.image?{image:qrBuilderImage(entry.image)||original.image}:{}),
      menuBuilderCopy:entry.copy,menuBuilderNew:entry.kind==='new',
      ...(Array.isArray(entry.tags)?{menuBuilderTags:tagCodes(entry.tags)}:{})});
  }
  if(branch==='BC4'||branch==='BC5'){
    const known=new Set(base.map(p=>p.id));
    for(const [id,p] of Object.entries(items)){
      if(known.has(id)||p.kind!=='new'||p.hidden===true||!Number.isSafeInteger(p.price_cents)||p.price_cents<0)continue;
      const name=qrBuilderText(p.copy?.names,'ru');
      if(!name||!p.category)continue;
      out.push({id,translationKey:id,sourceName:name,sourceDescription:'',name,description:'',category:p.category,categoryNames:categories[p.category]?.names,
        options:[],variants:[],price:p.price_cents/100,baseCents:p.price_cents,image:qrBuilderImage(p.image),branches:[branch],bc4Projected:true,menuBuilderCopy:p.copy,menuBuilderNew:true,
        ...(Array.isArray(p.tags)?{menuBuilderTags:tagCodes(p.tags)}:{})});
    }
  }
  return out;
}
export function qrBuilderLocalize(item,localized,lang){
  const copy=item.menuBuilderCopy;
  if(!copy)return localized;
  return {...localized,name:(item.menuBuilderNew?qrBuilderText(copy.names,lang):copy.names?.[lang])||localized.name,
    description:copy.descriptions&&Object.hasOwn(copy.descriptions,lang)?String(copy.descriptions[lang]):localized.description};
}
export function qrBuilderOffer(products, doc, unavailable, lang){
  const o=doc?.offer;
  if(!o?.enabled)return null;
  const p=products.find(x=>x.id===o.product_id&&!unavailable.includes(x.id));
  if(!p)return null;
  const image=qrBuilderImage(o.image)||p.image;
  if(!image)return null;
  return {product:{...p,image,name:qrBuilderText(o.titles,lang)||p.name},
    eyebrow:{ru:"Спецпредложение",az:"Xüsusi təklif",en:"Special offer"}[lang],
    description:qrBuilderText(o.descriptions,lang)||p.description,
    duration:Math.min(12,Math.max(3,Number(o.seconds)||5))*1000};
}
