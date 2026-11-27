import {tagCodes} from './qrMenuTags.mjs';
import {resolveQrArchiveImage} from './qrArchivedImages.mjs';
export const qrBuilderBranches=['BC1','BC2','BC4','BC5'];
export const qrBuilderLanguages=['ru','az','en'];
export const emptyQrBuilder=()=>({categories:{},items:{},order:{},product_facts:{},winter_featured:null,offer:null});
const object=x=>x!==null&&typeof x==='object'&&!Array.isArray(x)?x:{};
export const cleanQrBuilder=d=>({categories:object(d?.categories),items:object(d?.items),order:object(d?.order),product_facts:object(d?.product_facts),winter_featured:cleanWinterFeatured(d?.winter_featured),offer:d?.offer&&typeof d.offer==='object'?d.offer:null});
export const qrBuilderText=(o,lang)=>String(o?.[lang]||o?.ru||o?.az||o?.en||'');
export const qrBuilderImage=url=>typeof url==='string'&&(/^(https:\/\/[^\s]+|\/menu\/[\w.-]+)$/i.test(url))?resolveQrArchiveImage(url):'';
// Apply explicit ordering only within its category, preserving positions of other categories.
export function qrBuilderApplyOrder(products,doc){
  const order=object(doc?.order);
  const groups=new Map();
  products.forEach((p,i)=>{
    if(!Array.isArray(order[p.category])||!order[p.category].length)return;
    if(!groups.has(p.category))groups.set(p.category,[]);
    groups.get(p.category).push(i);
  });
  if(!groups.size)return products;
  const out=products.slice();
  for(const [category,indices] of groups){
    const sequence=order[category], unranked=sequence.indexOf(null);
    const ranked=new Map();
    sequence.forEach((id,index)=>{if(typeof id==='string'&&!ranked.has(id))ranked.set(id,index);});
    // A null marker leaves the ordinary menu order in place before an appended
    // block. In native menus that default can change with the time of day.
    const defaultRank=unranked===-1?Infinity:unranked;
    const sorted=indices.map(i=>products[i]).sort((a,b)=>(ranked.get(String(a.id))??defaultRank)-(ranked.get(String(b.id))??defaultRank));
    indices.forEach((index,i)=>{out[index]=sorted[i];});
  }
  return out;
}
export function qrBuilderMoveRow(ids,from,to){
  if(from===to||!ids.includes(from)||!ids.includes(to))return ids;
  const next=ids.filter(id=>id!==from);
  next.splice(ids.indexOf(to),0,from);
  return next;
}
export function qrBuilderTransferOrder(order,id,from,to){
  if(from===to)return order;
  const next={...object(order)};
  if(Array.isArray(next[from]))next[from]=next[from].filter(x=>x!==id);
  if(Array.isArray(next[to]))next[to]=[...next[to].filter(x=>x!==id),id];
  return next;
}
export function qrBuilderOverlay(base,doc,branch){
  const {items,categories}=cleanQrBuilder(doc);
  const out=[];
  const baseNames=new Map(base.filter(p=>p.categoryNames).map(p=>[p.category,p.categoryNames]));
  for(const original of base){
    const entry=items[original.id];
    if(!entry){out.push(original);continue}
    if(entry.hidden===true)continue;
    const category=entry.category||original.category;
    const categoryNames=categories[category]?.names||baseNames.get(category);
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
      out.push({id,translationKey:id,sourceName:name,sourceDescription:'',name,description:'',category:p.category,categoryNames:categories[p.category]?.names||baseNames.get(p.category),
        options:[],variants:[],price:p.price_cents/100,baseCents:p.price_cents,image:qrBuilderImage(p.image),branches:[branch],bc4Projected:true,menuBuilderCopy:p.copy,menuBuilderNew:true,
        ...(Array.isArray(p.tags)?{menuBuilderTags:tagCodes(p.tags)}:{})});
    }
  }
  return out.map(withArchivedImage);
}
function withArchivedImage(product){
  const image=resolveQrArchiveImage(product.image);
  return image===product.image?product:{...product,image};
}
export function qrBuilderLocalize(item,localized,lang){
  localized=withArchivedImage(localized);
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
  const image=qrBuilderImage(o.image)||resolveQrArchiveImage(p.image);
  if(!image)return null;
  return {product:{...p,image,name:qrBuilderText(o.titles,lang)||p.name},
    eyebrow:{ru:"Спецпредложение",az:"Xüsusi təklif",en:"Special offer"}[lang],
    description:qrBuilderText(o.descriptions,lang)||p.description,
    duration:Math.min(12,Math.max(3,Number(o.seconds)||5))*1000};
}

// Separate from the temporary opening offer. Stored in the existing branch draft/live document.
const featuredText=(value,max)=>typeof value==='string'?value.trim().replace(/\s+/g,' ').slice(0,max):'';
export const winterSloganLimit=110;
const fullWinterSlogans=o=>Object.fromEntries(qrBuilderLanguages.map(l=>[l,typeof o?.[l]==='string'?o[l]:'']));
export function cleanWinterFeatured(o){
  if(!o||typeof o!=='object'||Array.isArray(o))return null;
  const base={enabled:o.enabled===true,...(o.restore_classic===true&&o.enabled!==true?{restore_classic:true}:{}),product_id:featuredText(o.product_id,160)};
  if(o.slogan_mode==='full')return {...base,slogan_mode:'full',slogans:fullWinterSlogans(o.slogans)};
  return {...base,ru_instrumental:featuredText(o.ru_instrumental,72),
    slogans:Object.fromEntries(qrBuilderLanguages.map(l=>[l,featuredText(o.slogans?.[l],62)]))};
}
const instrumentalByName=new Map([['трюфельный бургер','трюфельным бургером'],['пицца чикен фунги','пиццей Чикен Фунги']]);
export const suggestedWinterInstrumental=ru=>instrumentalByName.get(String(ru||'').trim().toLocaleLowerCase('ru'))||'';
export function qrWinterFeatured(products,settings,lang,unavailable=[]){
  const o=cleanWinterFeatured(settings);
  if(!o?.enabled||!qrBuilderLanguages.includes(lang))return null;
  const p=products.find(x=>x.id===o.product_id&&x.branches?.includes('BC5')&&!unavailable.includes(x.id)&&x.is_available!==false&&!x.is_stopped);
  const image=qrBuilderImage(p?.image);
  if(!image)return null;
  const names=Object.fromEntries(qrBuilderLanguages.map(l=>[l,featuredText(p.menuBuilderCopy?.names?.[l]||p.snapshotCopy?.[l]?.name,72)]));
  if(!qrBuilderLanguages.every(l=>names[l]))return null;
  if(o.slogan_mode==='full'){
    if(!qrBuilderLanguages.every(l=>o.slogans[l].trim()&&o.slogans[l].length<=winterSloganLimit))return null;
    return {image,full:o.slogans[lang]};
  }
  const ru=o.ru_instrumental||suggestedWinterInstrumental(names.ru);
  if(!ru||/^с\s/i.test(ru))return null;
  const withDish={ru:'с '+ru,az:names.az+' ilə',en:'with '+names.en}[lang];
  return {image,first:o.slogans[lang]||{ru:'Согреваем зиму',az:'Qışı isidək',en:'Warm up this winter'}[lang],second:withDish};
}

export function winterSloganForm(products,settings){
  const o=cleanWinterFeatured(settings);
  if(o?.slogan_mode==='full')return o;
  return {...o,slogan_mode:'full',slogans:Object.fromEntries(qrBuilderLanguages.map(l=>{
    const headline=qrWinterFeatured(products,o?{...o,enabled:true}:null,l);
    return [l,headline?[headline.first,headline.second].join(' '):''];
  }))};
}
