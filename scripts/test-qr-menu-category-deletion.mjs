import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {emptyQrBuilder,qrBuilderApplyOrder,qrBuilderOverlay} from '../src/qrMenuBuilder.mjs';
import {qrBuilderCanRemoveCategory,qrBuilderCategorySources,qrBuilderDeleteCategory} from '../src/qrMenuCategoryDeletion.mjs';

const src='cat:11111111-1111-4111-8111-111111111111';
const dst='cat:22222222-2222-4222-8222-222222222222';
const empty='cat:33333333-3333-4333-8333-333333333333';
const dish='44444444-4444-4444-8444-444444444444';
const other='55555555-5555-4555-8555-555555555555';
const mock={...emptyQrBuilder(),categories:{[src]:{names:{ru:'Источник'}},[dst]:{names:{ru:'Получатель'}},[empty]:{names:{ru:'Пустая'}}},
  items:{[dish]:{kind:'new',category:src,hidden:true,price_cents:2750,image:'https://example.test/dish.jpg',
    tags:['chef'],copy:{names:{ru:'Новое'},descriptions:{az:'Mətn'}}},[other]:{kind:'existing',category:src,copy:{names:{en:'Old'}}}},
  order:{[src]:[other,dish],[dst]:['first'],OTHER:['untouched'],[empty]:['stale']},product_facts:{stable:{calories:50}},
  offer:{enabled:true,product_id:dish,seconds:5},winter_featured:{enabled:true,product_id:other}};
const base=[{id:'first',category:'SOUP'},{id:'second',category:'SOUP'},{id:dish,category:'ИСТОЧНИК'}];
const snapshot=structuredClone(mock);
assert.equal(qrBuilderCanRemoveCategory(mock,base,src),true);
assert.equal(qrBuilderCanRemoveCategory(mock,[...base,{id:'collision',category:src}],src),false);
assert.equal(qrBuilderCanRemoveCategory(mock,base,'SOUP'),false);
assert.deepEqual(qrBuilderCategorySources(base,mock.items).map(x=>x.category),['SOUP','SOUP']);
assert.ok(qrBuilderDeleteCategory({doc:mock,base,source:'SOUP',destination:dst}).error);
for(const destination of ['',src,'nonexistent'])assert.ok(qrBuilderDeleteCategory({doc:mock,base,source:src,destination}).error);
const erased=qrBuilderDeleteCategory({doc:mock,base,source:empty,destination:''});
assert.deepEqual(erased.moved,[]);assert.equal(erased.document.categories[empty],undefined);
assert.equal(erased.document.order[empty],undefined);assert.deepEqual(erased.document.items,mock.items);
const moved=qrBuilderDeleteCategory({doc:mock,base,source:src,destination:dst});
assert.deepEqual(moved.moved,[other,dish]);
assert.equal(moved.document.categories[src],undefined);assert.equal(moved.document.order[src],undefined);
assert.deepEqual(moved.document.items,{[dish]:{...mock.items[dish],category:dst},[other]:{...mock.items[other],category:dst}});
assert.deepEqual(moved.document.order[dst],['first',null,other,dish]);
assert.deepEqual(moved.document.order.OTHER,['untouched']);
for(const key of ['product_facts','offer','winter_featured'])assert.deepEqual(moved.document[key],mock[key]);
assert.deepEqual(mock,snapshot);
const inDestination=x=>({id:x,category:dst});
assert.deepEqual(qrBuilderApplyOrder([dish,'third',other,'second','first'].map(inDestination),moved.document).map(x=>x.id),['first','third','second',other,dish]);
assert.deepEqual(qrBuilderApplyOrder([dish,'second',other,'third','first'].map(inDestination),moved.document).map(x=>x.id),['first','second','third',other,dish]);
const defaultSource=qrBuilderDeleteCategory({doc:{...mock,order:{}},base:[{id:other,category:'SOUP'},...base],source:src,destination:dst});
assert.deepEqual(defaultSource.moved,[other,dish]); // visible native source order, not insertion into doc.items
const native=qrBuilderDeleteCategory({doc:mock,base,source:src,destination:'SOUP'});
assert.deepEqual(native.document.order.SOUP,[null,other,dish]);
assert.equal(qrBuilderOverlay([{id:other,category:'SOUP',price:13,variants:[{cents:100}]}],native.document,'BC5')[0].variants[0].cents,100);

// Exercise the existing production migration against an isolated local DB.
// Draft saves must not update the native catalog or guest revision; manual
// publish reassigns its category via the same native dish ID.
const pg=new PGlite();
try{
 await pg.exec(`
 create role anon;create role authenticated;
 create function public.rms_security_is_protected_admin() returns boolean language sql stable as $$select coalesce(current_setting('request.test_admin',true)='true',false)$$;
 create table public.qr_branches(id uuid primary key,code text,is_active boolean);
 create table public.qr_menu_catalog(id uuid primary key,menu_item_id uuid,external_key text unique,name text,category_name text,description text,price numeric,image_url text,options jsonb,sort_order integer,is_active boolean,updated_at timestamptz);
 create table public.qr_branch_menu(branch_id uuid,catalog_id uuid,price numeric,is_available boolean,is_stop boolean,updated_at timestamptz,primary key(branch_id,catalog_id));
 insert into public.qr_branches values ('66666666-6666-4666-8666-666666666666','BC1',true), ('77777777-7777-4777-8777-777777777777','BC2',true);
 `);
 await pg.exec(await fs.readFile(new URL('../supabase/migrations/20261126082000_qr_menu_builder.sql',import.meta.url),'utf8'));
 const save=(branch,revision,document,publish)=>pg.query('select public.rms_qr_builder_save($1,$2,$3,$4) v',[branch,revision,JSON.stringify(document),publish]);
 const nativeRows=()=>pg.query('select c.id,c.name,c.category_name,b.is_available from public.qr_menu_catalog c join public.qr_branch_menu b on b.catalog_id=c.id');
 await pg.exec("set request.test_admin='true'");
 for(const branch of ['BC1','BC2','BC4','BC5']){
   assert.equal((await save(branch,0,mock,branch==='BC1')).rows[0].v,1);
   assert.equal((await save(branch,1,moved.document,false)).rows[0].v,2);
 }
 assert.deepEqual((await nativeRows()).rows,[{id:dish,name:'Новое',category_name:'Источник',is_available:false}]);
 assert.equal((await pg.query("select revision from rms_qr_builder_live where branch_code='BC1'")).rows[0].revision,1);
 await assert.rejects(()=>save('BC1',1,moved.document,true),/STALE/);
 assert.equal((await save('BC1',2,moved.document,true)).rows[0].v,3);
 assert.deepEqual((await nativeRows()).rows,[{id:dish,name:'Новое',category_name:'Получатель',is_available:false}]);
 assert.deepEqual((await pg.query("select document->'order'->\$1 as ordering from rms_qr_builder_live where branch_code='BC1'",[dst])).rows[0].ordering,
   ['first',null,other,dish]);
 const bc2Id='88888888-8888-4888-8888-888888888888';
 const bc2={...mock,items:{[bc2Id]:{...mock.items[dish],hidden:false}},order:{[src]:[bc2Id]}};
 assert.equal((await save('BC2',2,bc2,true)).rows[0].v,3);
 const bc2Before=(await nativeRows()).rows.find(r=>r.id===bc2Id);
 assert.deepEqual(bc2Before,{id:bc2Id,name:'Новое',category_name:'Источник',is_available:true});
 const publishedBase=[{id:bc2Id,category:bc2Before.category_name.toLocaleUpperCase('ru')}];
 const bc2Move=qrBuilderDeleteCategory({doc:bc2,base:publishedBase,source:src,destination:dst});
 assert.deepEqual(qrBuilderCategorySources(publishedBase,bc2.items),[]);
 assert.equal((await save('BC2',3,bc2Move.document,false)).rows[0].v,4);
 assert.deepEqual((await nativeRows()).rows.find(r=>r.id===bc2Id),bc2Before);
 await assert.rejects(()=>save('BC2',3,bc2Move.document,true),/STALE/);
 assert.equal((await save('BC2',4,bc2Move.document,true)).rows[0].v,5);
 assert.deepEqual((await nativeRows()).rows.find(r=>r.id===bc2Id),{...bc2Before,category_name:'Получатель'});
 assert.deepEqual((await pg.query("select document->'order'->\$1 as ordering from rms_qr_builder_live where branch_code='BC2'",[dst])).rows[0].ordering,[null,bc2Id]);
 console.log('PASS safe category deletion: all branch draft validation, empty and protected categories, immutable payload, ordered transfer, native ID and hidden status preservation, stale revisions and explicit publish');
}finally{await pg.close();}
