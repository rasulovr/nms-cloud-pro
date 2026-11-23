import test from 'node:test';
import a from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {VERSION,useBC4Cart,menuModel,editCart,cartLines,optionLabel} from '../src/bc4CartModel.mjs';
const data=JSON.parse(readFileSync(new URL('../src/bc4CartCatalogue.json',import.meta.url)));
const rows=menuModel(data.rows), byKey=new Map(rows.map(r=>[r.key,r]));
const b=rows.find(r=>r.slug==='boul'), s=rows.find(r=>r.slug==='sygar-syrop');
test('exact setting only activates exact branch parameter, not other QR routes',()=>{
 a.equal(useBC4Cart('?branch=BC4&table=1',VERSION),true);
 for(const q of ['?branch=BC1','?branch=BC5','?branch=BC4&branch=BC4','?branch=bc4','']) a.equal(useBC4Cart(q,VERSION),false);
 a.equal(useBC4Cart('?branch=BC4',''),false);
});
test('versioned catalogue shape and branch placement parity',()=>{
 a.equal(rows.length,180);a.equal(new Set(rows.map(r=>r.categorySourceId)).size,26);
 a.equal(byKey.size,180);a.throws(()=>menuModel([b,b]));
 a.equal(new Set(rows.flatMap(x=>x.options.map(y=>y.id))).size,rows.reduce((n,x)=>n+x.options.length,0));
 for(const lang of ['ru','az','en']) a.ok(rows.every(x=>x.translations[lang]?.name || x.translations.ru?.name));
});
test('all five Bowl prices remain authoritative from the snapshot without a default',()=>{
 a.equal(b.base,null);
 a.deepEqual(b.options.map(o=>o.cents).sort((a,b)=>a-b),[1390,1990,2080,2180,2190]);
 a.deepEqual(editCart([],byKey,b.key,'',1),[]);
 for(const o of b.options){
  const l=editCart(editCart([],byKey,b.key,o.id,1),byKey,b.key,o.id,1);
  a.equal(cartLines(l,byKey)[0].subtotal,2*o.cents);
  for(const lang of ['ru','az','en']) a.equal(optionLabel(o,lang),o.label);
 }
});
test('distinct variants never merge; tampered ids and syrup alone cannot add',()=>{
 const [x,y]=b.options;
 let l=editCart([],byKey,b.key,'foreign',1);a.deepEqual(l,[]);
 a.deepEqual(editCart(l,byKey,s.key,'',1),[]);
 l=editCart(l,byKey,b.key,x.id,1);l=editCart(l,byKey,b.key,y.id,1);l=editCart(l,byKey,s.key,'',1);
 a.deepEqual(cartLines(l,byKey).map(x=>x.subtotal),[x.cents,y.cents,0]);
 l=editCart(editCart(l,byKey,b.key,x.id,-1),byKey,b.key,y.id,-1);a.deepEqual(l,[]);
});
test('isolated BC4 component never calls network order/other service writes',()=>{
 const src=readFileSync(new URL('../src/BC4CartOnly.jsx',import.meta.url),'utf8');
 a.doesNotMatch(src,/\b(fetch|supabase|localStorage|sendOrder|qr_create_order)\b/);
});
