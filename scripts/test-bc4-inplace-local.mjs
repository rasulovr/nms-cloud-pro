import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {BC4_CATALOG_VERSION,useBC4Projection,projectBC4,safeCopy,localizeBC4,selectedBC4,changeBC4Cart} from '../src/bc4MenuProjection.mjs';
const fetchFile=p=>readFileSync(new URL(p,import.meta.url),'utf8');
const snapshot=JSON.parse(fetchFile('../src/bc4InPlaceCatalogue.json')),items=projectBC4(snapshot),bowl=items.find(x=>x.id.endsWith('-boul')),syrup=items.find(x=>x.addon);
test('original BC4 table URL is preserved; version gate is disabled for other branches',()=>{
 assert.ok(useBC4Projection('?branch=BC4&table=50',BC4_CATALOG_VERSION));
 for(const params of ['?branch=BC1','?branch=BC2','?branch=BC5','?branch=bc4','?branch=BC4&branch=BC4',''])assert.equal(useBC4Projection(params,BC4_CATALOG_VERSION),false);
 assert.equal(useBC4Projection('?branch=BC4','false'),false);
});
test('180 distinct placements and 26 section IDs in authoritative source order',()=>{
 assert.equal(items.length,180);assert.equal(new Set(items.map(x=>x.category)).size,26);
 assert.equal(new Set(items.map(x=>x.id)).size,180);assert.deepEqual(items.map(x=>x.id),snapshot.rows.map(x=>x.key));
 for(const lang of ['ru','az','en']) assert.ok(items.every(x=>localizeBC4(x,lang).name));
});
test('unverified ingredient copy never leaks; full/short copied and verified prefix bounded',()=>{
 const content='A'.repeat(90)+' ARCHIVE ONLY';
 assert.equal(safeCopy({copyStatus:'live_prefix_only',description:content}).description,'A'.repeat(90)+'…');
 assert.equal(safeCopy({copyStatus:'mismatch_unverified',description:content}),null);
 assert.equal(safeCopy({copyStatus:'matches_visible_card',description:'Short'}).description,'Short');
 assert.equal(safeCopy({copyStatus:'live_full',description:content}).description,content);
 for(const [i, item] of items.entries()) for(const l of ['ru','az','en']){
  const s=snapshot.rows[i].translations[l];
  assert.equal(localizeBC4(item,l).description,safeCopy(s)?.description||'');
 }
});
test('all five exact Bowl choices, per-choice lines, cents and language switch preserve prices',()=>{
 assert.equal(selectedBC4(bowl),null);assert.equal(selectedBC4(bowl,'foreign'),null);
 assert.deepEqual(bowl.variants.map(x=>x.cents).sort((a,b)=>a-b),[1390,1990,2080,2180,2190]);
 const lines=bowl.variants.map(x=>selectedBC4(bowl,x.id));
 let cart=lines.reduce((list,x)=>changeBC4Cart(list,x,1),[]);
 assert.equal(cart.length,5);
 for(const loc of ['az','en','ru'])cart=cart.map(x=>localizeBC4(x,loc));
 assert.equal(cart.reduce((n,x)=>n+x.unitCents*x.qty,0),9830);
 cart=changeBC4Cart(cart,cart[0],1);
 assert.equal(cart.reduce((n,x)=>n+x.unitCents*x.qty,0),9830+bowl.variants[0].cents);
});
test('verified syrup is optional zero only; no standalone or unsupported zero',()=>{
 const line=selectedBC4(syrup);
 assert.equal(line.unitCents,0);assert.deepEqual(changeBC4Cart([],line,1),[]);
 const b=selectedBC4(bowl,bowl.variants[0].id);
 const both=changeBC4Cart(changeBC4Cart([],b,1),line,1);
 assert.equal(both.reduce((n,x)=>n+x.unitCents*x.qty,0),b.unitCents);
 assert.deepEqual(changeBC4Cart(both,b,-1),[]);
 assert.equal(selectedBC4({bc4Projected:true,variants:[],baseCents:null}),null);
});
test('existing QR layout retained, BC4 menu version cart cannot send order',()=>{
 const src=fetchFile('../src/QRMenu.jsx');
 assert.match(src,/async function sendOrder\(\) \{\s+if \(bc4Only \|\| !cart.length \|\| busy\) return;/u);
 assert.match(src,/\{!bc4Only && <button className="primary-button" disabled=\{busy\} onClick=\{sendOrder\}/u);
 assert.match(src,/product-grid/);assert.match(src,/modal-add-button/);assert.match(src,/cart.map\(\(line\) => <OrderLine/);
 assert.doesNotMatch(src,/BC4CartOnly/);
});
test('bundled snapshot only contains vetted copy, including the exact EN modal details',()=>{
 for(const r of snapshot.rows){
  assert.ok(!Object.hasOwn(r,'description'));
  for(const c of Object.values(r.translations)){
   if(c.copyStatus==='live_prefix_only') assert.ok([...c.description].length<=90);
   else if(!['matches_visible_card','live_full'].includes(c.copyStatus)) assert.equal(c.description,'');
  }
 }
 const beef=snapshot.rows.find(r=>r.slug==='new-york-roast-beef-demi-glace-golden-potatoes');
 assert.equal(beef.translations.en.description,'Roast beef with orange demi-glace, golden potatoes, cherry tomatoes, microgreens, and creamy tuna sauce');
 assert.equal(bowl.snapshotCopy.en.description,'Salad mix, cucumbers, olives, bell peppers, quinoa, cherry tomatoes, corn, hummus, paprika, sesame dressing, potatoes, seeds, microgreens.');
});
test('admin uses the same snapshot only for selected BC4 and guards product writes',()=>{
 const admin=fetchFile('../src/RMSQRMenuAdmin.jsx');
 assert.match(admin,/selectedMenuBranch === 'BC4' && import.meta.env.VITE_BC4_CART_CATALOG === BC4_CATALOG_VERSION/);
 for(const f of ['openProductEditor','addProductToBranch','removeProductFromBranch','saveProductOverride']) assert.match(admin,new RegExp(f+'\\([^)]*\\) \\{\\s+if \\(showingBC4Snapshot'));
});
