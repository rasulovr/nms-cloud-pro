import assert from 'node:assert/strict';
import archive from '../src/qrArchivedImageIndex.mjs';
import {resolveQrArchiveImage} from '../src/qrArchivedImages.mjs';
import {qrBuilderOverlay,qrBuilderLocalize,qrBuilderOffer,qrWinterFeatured} from '../src/qrMenuBuilder.mjs';

assert(Object.keys(archive).length>=400);
for(const [key,object] of Object.entries(archive)){
  assert.match(key,/^baristachef[12]?\/[a-f0-9-]{36}$/);
  assert.match(object,/^[a-f0-9]{64}\.(jpg|webp|png|gif|avif)$/);
  for(const variant of ['card32.webp','card32@2x.jpg','card32@3x.jpg?cache=1'])
    assert.equal(resolveQrArchiveImage('https://cdn-2.clopos.com/'+key+'/'+variant),
      'https://meqttgiksyuyffuoghwx.supabase.co/storage/v1/object/public/menu-images/qr-archive/v1/'+object);
}

const url='https://cdn-2.clopos.com/'+Object.keys(archive)[0]+'/card32@2x.jpg';
const expected=resolveQrArchiveImage(url);
const product={id:'dish',price:9,category:'main',image:url,branches:['BC5'],snapshotCopy:{ru:{name:'Блюдо'},az:{name:'Yemək'},en:{name:'Dish'}}};
assert.deepEqual(qrBuilderOverlay([product],{},'BC4'),[{...product,image:expected}]);
assert.equal(qrBuilderOverlay([{...product,image:null}],{items:{dish:{image:url}}},'BC5')[0].image,expected);
assert.equal(qrBuilderLocalize(product,{...product,image:url},'en').image,expected);
assert.equal(qrBuilderOffer([product],{offer:{enabled:true,product_id:'dish',image:url}},[],'en').product.image,expected);
assert.equal(qrWinterFeatured([product],{enabled:true,product_id:'dish',slogan_mode:'full',slogans:{ru:'Блюдо',en:'Dish',az:'Yemək'}},'en').image,expected);
for(const unchanged of [null,'','/menu/tea.png','https://example.com/example.jpg',url.replace('cdn-2.clopos.com','cdn-2.clopos.com.example.org'),url.replace(/[a-f0-9-]{36}(?=\/card)/,'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa')])
  assert.equal(resolveQrArchiveImage(unchanged),unchanged);
console.log('PASS verified photo aliases, product overlay, fallback, offers, seasonal header, no unknown URL rewrite');
