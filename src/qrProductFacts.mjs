const languages=['ru','az','en'];
const truffle=new Set(['new:4:truffle-burger','27:24:truffle-burger']);
const defaults={calories:740,approximate:true,preparationMinutes:[10,15],allergens:{
 az:'Qlüten, süd, yumurta, xardal, küncüt',ru:'Глютен, молоко, яйца, горчица, кунжут',en:'Gluten, milk, eggs, mustard, sesame'}};
const lemonButterChickenIds={
 BC4:new Set(['clopos-bc4-new-lemon-butter-chicken','clopos-bc4-29-lemon-butter-chicken']),
 BC5:new Set(['new:2:lemon-butter-chicken','27:25:lemon-butter-chicken'])
};
const lemonButterChickenDefaults={calories:970,approximate:true,preparationMinutes:[10,15],allergens:{
 az:'Süd və süd məhsulları, xardal, qlüten',
 ru:'Молоко и молочные продукты, горчица, глютен',
 en:'Milk and milk products, mustard, gluten'
}};
export const isLemonButterChicken=(branch,id)=>Object.hasOwn(lemonButterChickenIds,branch)&&lemonButterChickenIds[branch].has(String(id));
export const isBC5Truffle=(branch,id)=>branch==='BC5'&&truffle.has(String(id));
export const productFactsKey=(branch,id)=>isBC5Truffle(branch,id)?'new:4:truffle-burger':String(id||'');
export function qrProductFacts(doc,branch,id){
 const map=doc?.product_facts, key=productFactsKey(branch,id);
 if(map&&Object.hasOwn(map,key)){
  const f=map[key];if(f&&typeof f==='object')return f;
 }
 if(isBC5Truffle(branch,id))return defaults;
 return isLemonButterChicken(branch,id)?lemonButterChickenDefaults:{};
}
export function productFactsForm(facts={}){
 return {calories:Number.isInteger(facts.calories)?String(facts.calories):'',approximate:facts.approximate===true,
   preparationMinutes:Array.isArray(facts.preparationMinutes)?facts.preparationMinutes.join('–'):'',
   allergens:Object.fromEntries(languages.map(l=>[l,typeof facts.allergens?.[l]==='string'?facts.allergens[l]:'']))};
}
export function parseProductFacts(form={}){
 const c=String(form.calories??'').trim(), t=String(form.preparationMinutes??'').trim();
 const validNum=/^(0|[1-9][0-9]{0,3})$/;
 const m=t.match(/^([1-9][0-9]{0,2})(?:\s*[-–—]\s*([1-9][0-9]{0,2}))?$/u);
 if(c&&!validNum.test(c))return {error:'Калорийность: введите целое число ккал от 0 до 9999.'};
 if(t&&(!m||Number(m[1])>180||(m[2]&&(Number(m[2])>180||Number(m[2])<Number(m[1])))))return {error:'Время приготовления: укажите от 1 до 180 минут или диапазон, например 10–15.'};
 const allergens=Object.fromEntries(languages.map(l=>[l,String(form.allergens?.[l]??'').trim()]));
 if(Object.values(allergens).some(s=>s.length>240))return {error:'Аллергены: не больше 240 символов на язык.'};
 return {value:{calories:c?Number(c):null,approximate:Boolean(c)&&form.approximate===true,preparationMinutes:m?[Number(m[1]),...(m[2]&&m[2]!==m[1]?[Number(m[2])]:[])]:null,allergens}};
}
export function productFactsForLocale(facts,lang){
 const c=facts?.calories,p=facts?.preparationMinutes,a=facts?.allergens?.[lang];
 const validMinutes=Array.isArray(p)&&[1,2].includes(p.length)&&p.every(n=>Number.isInteger(n)&&n>=1&&n<=180)&&(p.length===1||p[0]<=p[1]);
 return {calories:Number.isInteger(c)&&c>=0&&c<=9999?c:null,approximate:facts?.approximate===true,preparationMinutes:validMinutes?p:null,
  allergens:typeof a==='string'&&a.trim()&&a.length<=240?[a]:undefined};
}
