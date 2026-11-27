import assert from 'node:assert/strict';
import fs from 'node:fs';
import shared from '../src/qrSharedPhotoIndex.mjs';
import {resolveQrArchiveImage} from '../src/qrArchivedImages.mjs';
import {shareQrDishPhoto} from '../src/qrSharedPhotos.mjs';
import {qrBuilderOverlay,qrBuilderLocalize,qrBuilderOffer,qrWinterFeatured} from '../src/qrMenuBuilder.mjs';
const audit=JSON.parse(fs.readFileSync(new URL('../docs/qr-shared-photo-audit.json',import.meta.url),'utf8'));
const own=/^https:\/\/meqttgiksyuyffuoghwx\.supabase\.co\/storage\/v1\/object\/public\/menu-images\/qr-archive\/v1\/[a-f0-9]{64}\.(?:jpg|webp|png|avif|gif)$/;
const counts={};
for(const [branch,items] of Object.entries(shared)){
 for(const [id,[expected,image]] of Object.entries(items)){
  assert(own.test(image));
  assert.notEqual(image,expected);
  const original={id,name:'Do not change',image:expected,category:'variant',options:[],price:12.09,baseCents:1209,branches:[branch]};
  const protectedUrl='/menu/intentional-custom.webp';
  assert.deepEqual(qrBuilderOverlay([original],{},branch),[{...original,image}]);
  assert.equal(qrBuilderOverlay([original],{items:{[id]:{image:expected}}},branch)[0].image,expected);
  assert.deepEqual(qrBuilderOverlay([original],{items:{[id]:{image:protectedUrl}}},branch),[{...original,image:protectedUrl,categoryNames:undefined,menuBuilderCopy:undefined,menuBuilderNew:false}]);
  assert.equal(shareQrDishPhoto({...original,image:protectedUrl},branch).image,protectedUrl);
  assert.equal(shareQrDishPhoto(original,'OTHER'),original);
  assert.equal(qrBuilderOffer([{...original,image}],{offer:{enabled:true,product_id:id}},[],'en').product.image,image);
  assert.equal(qrBuilderLocalize(original,{...original,image},'en').image,image);
  assert.equal(qrWinterFeatured([{...original,image,branches:['BC5'],snapshotCopy:{ru:{name:'Блюдо'},az:{name:'Yemək'},en:{name:'Dish'}}}],{enabled:true,product_id:id,slogan_mode:'full',slogans:{ru:'Блюдо',az:'Yemək',en:'Dish'}},'en').image,image);
 }
 counts[branch]=Object.keys(items).length;
}
assert.equal(audit.flatMap(g=>g.changed).length,Object.values(counts).reduce((a,b)=>a+b,0));
assert.equal(new Set(audit.flatMap(g=>g.changed).map(([branch,id])=>branch+':'+id)).size,audit.flatMap(g=>g.changed).length);
for(const r of audit)for(const [b,id] of r.changed)assert.equal(shared[b][id][1],r.canonical);
const exact=[
 ['1c7c9b4b-bf4d-4760-9889-b54de849ebfc','51beeb9c-6f8f-4ad5-9fb0-bc2ecb6edbb6','9e2b0bb6-29d1-4c78-8eba-31f6aa87dba1'],
 ['a7f29d70-c09b-44ae-bf90-be708726751b','41b7561a-16a5-4dca-a82a-d1c6a6fe9a80','a9420432-5bdf-4b13-a49f-1d191900c5ee']
];
for(const [id,bc4,bc5] of exact) {
 const image=resolveQrArchiveImage('https://cdn-2.clopos.com/baristachef2/'+bc5+'/card32@2x.jpg');
 assert.equal(image,resolveQrArchiveImage('https://cdn-2.clopos.com/baristachef/'+bc4+'/card32@2x.jpg'));
 for(const branch of ['BC1','BC2','BC3','Bistro']) assert.equal(shared[branch][id][1],image);
}
for(const key of ['8:95:pizza-chicken-fungi','14:142:yodas-love','16:149:special-tea'])assert(!shared.BC5[key]);
console.log('PASS exact guarded cross-branch media only, offer/header reuse, owned URLs, and preserved overrides:',counts);
