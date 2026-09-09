// A normal authenticated application page; credentials never leave Supabase.
const base = 'https://zzsdcxowhhaxnuliaryb.supabase.co';
const key = 'sb_publishable_KadKobelt_Zxq5HF770GFA_zSdTAfec';
const org = '1f0abf22-40e8-4324-a071-f21fc2f92c7b';
const storageRoot = `${base}/storage/v1/object/public/qr-menu-media/${org}/`;
const expected = {baristachef3:{branches:['BC1','BC2'],count:160},baristachef:{branches:['BC4'],count:176},baristachef2:{branches:['BC5'],count:191}};
const stable = value => JSON.stringify(value, function(_key, v) { return v && typeof v === 'object' && !Array.isArray(v) ? Object.fromEntries(Object.keys(v).sort().map(k => [k,v[k]])) : v; });
const status = document.querySelector('#status');
const apply = document.querySelector('#apply');
let menu;
function headers() {
  const value = JSON.parse(localStorage.getItem('sb-zzsdcxowhhaxnuliaryb-auth-token') || 'null');
  const session = value?.access_token ? value : value?.currentSession || value?.session;
  if (!session?.access_token) throw new Error('Войдите в кабинет на этом адресе и откройте страницу повторно.');
  return {apikey:key,Authorization:`Bearer ${session.access_token}`};
}
async function request(path,body) {
  const response = await fetch(`${base}/rest/v1/${path}`,{
    method:body===undefined?'GET':'POST',headers:{...headers(),'Content-Type':'application/json'},
    ...(body===undefined?{}:{body:JSON.stringify(body)})
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || `Ошибка ${response.status}`);
  return data;
}
function validate(value) {
  if(value.organization_id!==org || value.sources?.length!==3) throw new Error('Неверная организация или список источников.');
  const brands = new Set();
  for(const source of value.sources) {
    const rule = expected[source.brand];
    if(!rule || brands.has(source.brand) || JSON.stringify(rule.branches)!==JSON.stringify(source.branches) || source.items?.length!==rule.count) throw new Error('Не совпали филиалы или количество блюд.');
    brands.add(source.brand);
    const ids = new Set();
    for(const item of source.items) {
      if(!item.external_key?.startsWith(`clopos:${source.brand}:`) || ids.has(item.external_key) || !item.name || !item.category_name || !Number.isFinite(item.price) || item.price<0 || !Array.isArray(item.options)) throw new Error('Некорректная позиция.');
      ids.add(item.external_key);
      for(const option of item.options) if(!option.name || !Number.isFinite(option.price) || option.price<0) throw new Error('Некорректный вариант.');
      if(item.image_url && !item.image_url.startsWith(storageRoot)) throw new Error('Фото должно принадлежать Barista&Chef.');
      if(item.source_image_url) {
        const url = new URL(item.source_image_url);
        if(url.protocol!=='https:' || !['cdn.clopos.com','cdn-2.clopos.com'].includes(url.hostname) || !url.pathname.startsWith(`/${source.brand}/`)) throw new Error('Неизвестный источник фотографии.');
      }
    }
  }
}
function download(name,value) {
  const url=URL.createObjectURL(new Blob([JSON.stringify(value,null,2)],{type:'application/json'}));
  const a=document.createElement('a'); a.href=url; a.download=name; a.click();setTimeout(()=>URL.revokeObjectURL(url),60000);
}
document.querySelector('#file').addEventListener('change',()=>{menu=null;apply.disabled=true;});
document.querySelector('#menu-json').addEventListener('input',()=>{menu=null;apply.disabled=true;});
document.querySelector('#prepared').addEventListener('click',async()=>{
  apply.disabled=true;menu=null;
  try {
    const value=JSON.parse(document.querySelector('#menu-json').value);validate(value);
    await request('rpc/organization_qr_admin_state',{p_organization_id:org});
    await request(`qr_menu_catalog?organization_id=eq.${org}&select=id,source_metadata&limit=1`);
    menu=value;status.textContent='Проверено: BC1 160, BC2 160, BC4 176, BC5 191. Можно применить.';apply.disabled=false;
  }catch(error){status.textContent=error.message;}
});

document.querySelector('#review').addEventListener('click',async()=>{
  apply.disabled=true;menu=null;
  try {
    const file=document.querySelector('#file').files[0];if(!file) throw new Error('Выберите menus.json.');
    const value=JSON.parse(await file.text());validate(value);
    await request('rpc/organization_qr_admin_state',{p_organization_id:org});
    // Fail before uploading anything if the matching schema is absent.
    await request(`qr_menu_catalog?organization_id=eq.${org}&select=id,source_metadata&limit=1`);
    menu=value;
    status.textContent='Проверено: BC1 160, BC2 160, BC4 176, BC5 191. Можно применить.';
    apply.disabled=false;
  } catch(error) {status.textContent=error.message;}
});
apply.addEventListener('click',async()=>{
  apply.disabled=true;document.querySelector('#menu-json').disabled=true;document.querySelector('#prepared').disabled=true;document.querySelector('#file').disabled=true;document.querySelector('#review').disabled=true;
  try {
    validate(menu);
    // Save the pre-import state before any menu mutation. Paginate to avoid REST caps.
    async function all(table) {
      const rows=[];for(let offset=0;;offset+=500){
        const page=await request(`${table}?organization_id=eq.${org}&select=*&limit=500&offset=${offset}&order=${table==='qr_menu_catalog'?'id':'branch_id,catalog_id'}`);
        rows.push(...page);if(page.length<500)return rows;
      }
    }
    download('baristachef-before-import.json',{organization_id:org,catalog:await all('qr_menu_catalog'),branch_menu:await all('qr_branch_menu')});
    const items=menu.sources.flatMap(s=>s.items);
    let cursor=0,done=0;
    async function worker(){
      while(cursor<items.length){
        const item=items[cursor++];
        if(item.source_image_url && !item.image_url){
          // Source image requests are anonymous; never send Supabase credentials to a CDN.
          const response=await fetch(item.source_image_url,{credentials:'omit'});
          if(!response.ok) throw new Error(`Не удалось скачать фото: ${item.name}`);
          const blob=await response.blob();
          const ext={'image/jpeg':'jpg','image/png':'png','image/webp':'webp','image/avif':'avif'}[blob.type];
          if(!ext || !blob.size || blob.size>5*1024*1024) throw new Error(`Некорректный файл фото: ${item.name}`);
          const bitmap=await createImageBitmap(blob);bitmap.close();
          const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',await blob.arrayBuffer())),x=>x.toString(16).padStart(2,'0')).join('');
          const path=`${org}/exact-import-20260909/${digest}.${ext}`;
          const uploaded=await fetch(`${base}/storage/v1/object/qr-menu-media/${path}`,{
            method:'POST',headers:{...headers(),'Content-Type':blob.type,'Cache-Control':'max-age=31536000','x-upsert':'false'},body:blob
          });
          if(!uploaded.ok){const error=await uploaded.json();if(![409,'409','Duplicate'].includes(error.statusCode) && !/already exists/i.test(error.message||'')) throw new Error(error.message||'Ошибка сохранения фото.');}
          item.image_url=`${base}/storage/v1/object/public/qr-menu-media/${path}`;
        }
        if(item.image_url){
          const check=await fetch(item.image_url,{method:'HEAD',credentials:'omit'});
          if(!check.ok || !check.headers.get('content-type')?.startsWith('image/')) throw new Error(`Локальное фото недоступно: ${item.name}`);
        }
        status.textContent=`Проверено фотографий и позиций: ${++done}/${items.length}`;
      }
    }
    const workers=await Promise.allSettled(Array.from({length:4},worker));
    const failed=workers.find(x=>x.status==='rejected');if(failed) throw failed.reason;
    download('baristachef-ready-import.json',menu);
    status.textContent='Применение четырёх меню…';
    const result=await request('rpc/qr_import_baristachef_exact',{p_menu:menu});
    download('baristachef-import-result.json',result);
    for(const source of menu.sources) for(const branch of source.branches){
      const published=await request('rpc/qr_get_public_menu_v2',{p_branch_code:branch,p_table_code:null});
      if(published?.items?.length!==source.items.length) throw new Error(`Импорт выполнен, но проверка ${branch} не прошла.`);
      for(let i=0;i<source.items.length;i++){
        const actual=published.items[i],wanted=source.items[i];
        if(actual.name!==wanted.name || actual.description!==wanted.description || actual.category_name!==wanted.category_name || Number(actual.price)!==wanted.price || actual.image_url!==wanted.image_url || stable(actual.options)!==stable(wanted.options)) throw new Error(`Импорт выполнен, обнаружено расхождение ${branch}: ${wanted.name}`);
      }
    }
    status.textContent='Применено и проверено: BC1 — 160, BC2 — 160, BC4 — 176, BC5 — 191. Состав, описания, цены, варианты и локальные фотографии совпадают.';
  }catch(error){status.textContent=error.message;}
  finally{document.querySelector('#menu-json').disabled=false;document.querySelector('#prepared').disabled=false;document.querySelector('#file').disabled=false;document.querySelector('#review').disabled=false;}
});
