export const bowlBase = 1390;
export const bowlMax = 4;
export const bowlOptions = [
 {id:'5', cents:690, labels:{ru:'Курица',en:'Chicken'}},
 {id:'6', cents:790, labels:{ru:'Рибай',en:'Ribeye'}},
 {id:'8', cents:600, labels:{ru:'Фалафель',en:'Falafel'}},
 {id:'17', cents:800, labels:{ru:'Салмон',en:'Salmon'}}
];
export const adjustBowl=(counts,id,delta,repeat=false)=>{
 if(!bowlOptions.some(x=>x.id===id)|| ![1,-1].includes(delta))return counts;
 const next=(counts[id]||0)+delta;
 if(next<0||(!repeat&&next>1)||Object.values(counts).reduce((a,b)=>a+b,0)+delta>bowlMax)return counts;
 return {...counts,[id]:next};
};
export function bowlLine(product,counts,language,repeat=false){
 if(!product?.bc5Bowl||product.baseCents!==bowlBase||!counts||typeof counts!=='object')return null;
 if(Object.entries(counts).some(([id,n])=>!bowlOptions.some(x=>x.id===id)||!Number.isInteger(n)||n<0||(!repeat&&n>1)))return null;
 if(Object.values(counts).reduce((a,b)=>a+b,0)>bowlMax)return null;
 const choices=bowlOptions.filter(o=>counts[o.id]>0);
 const unitCents=choices.reduce((total,o)=>total+o.cents*counts[o.id],bowlBase);
 const variantId=choices.map(o=>o.id+"×"+counts[o.id]).join("+");
 const option_name=choices.map(o=>(o.labels[language]||o.labels.ru)+(counts[o.id]>1?" × "+counts[o.id]:"")).join(", ");
 return {...product,bowlCounts:counts,unitCents,price:unitCents/100,variantId,lineKey:JSON.stringify([product.id,variantId]),option_name};
}

export function projectBC5(catalog){
 const cats=new Map(catalog?.cats?.map(c=>[c.id,c.name])||[]);
 const rows=catalog?.rows;
 if(!Array.isArray(rows)||rows.length!==184||cats.size!==23||new Set(rows.map(r=>r.key)).size!==184)throw Error("Invalid BC5 catalogue");
 const lengths=[0,0,0]; let choices=0;
 const result=rows.map(r=>{
  if(!cats.has(r.categoryId)||!r.name||Object.values(r.name).some(x=>typeof x!=="string"||!x.trim()))throw Error("Invalid BC5 placement");
  if(r.priceMinor!==null&&(!Number.isSafeInteger(r.priceMinor)||r.priceMinor<0))throw Error("Invalid BC5 price");
  if(r.image!==null&&!/^https:\/\/cdn-2\.clopos\.com\/baristachef2\/[0-9a-f-]{36}\/card32@2x\.jpg$/.test(r.image))throw Error("Unexpected photo");
  if((r.priceMinor===null)!==Boolean(r.variants?.length))throw Error("Invalid BC5 price choice");
  const variants=r.variants||[]; choices+=variants.length;
  if(variants.some(v=>!v.id||!v.label||!Number.isSafeInteger(v.cents)||v.cents<=0)||new Set(variants.map(v=>v.id)).size!==variants.length)throw Error("Invalid variant");
  return {
    id:r.key,translationKey:r.key,sourceName:r.name.ru,sourceDescription:r.description?.ru||'',name:r.name.ru,description:r.description?.ru||'',
    bc5Bowl:r.categoryId==='6'&&r.slug==='bowl',category:r.categoryId,presetFirst:r.slug==='alternative-milk'||(r.slug==='red-bull'&&variants.length>0),price:r.priceMinor===null?null:r.priceMinor/100,baseCents:r.priceMinor,
    image:r.image,options:[],variants,addon:false,
    snapshotCopy:Object.fromEntries(['ru','az','en'].map(l=>[l,{name:r.name[l],description:r.description?.[l]||''}])),
    categoryNames:cats.get(r.categoryId),branches:['BC5'],bc4Projected:true
  };
 });
 if(choices!==25||result.filter(r=>r.bc5Bowl&&r.baseCents===1390).length!==1)throw Error("Unexpected BC5 choice layout");
 return result;
}
