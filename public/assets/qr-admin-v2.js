(() => {
  const SUPABASE_URL = 'https://zzsdcxowhhaxnuliaryb.supabase.co';
  const PUBLISHABLE_KEY = 'sb_publishable_KadKobelt_Zxq5HF770GFA_zSdTAfec';
  const STORAGE_KEY = 'sb-zzsdcxowhhaxnuliaryb-auth-token';
  const params = new URLSearchParams(location.search);
  const organizationId = params.get('organization');
  const isEmbedded = window.parent !== window || params.get('embedded') === '1';
  document.documentElement.classList.toggle('rms-qr-embedded', isEmbedded);
  const root = document.getElementById('root');
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const money = value => Number(value || 0).toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const state = { access:null, summary:null, section:'overview', branches:[], tables:[], catalog:[], orders:[], notice:'', menuEditor:null };
  let heightFrame = 0;

  function notifyHostHeight() {
    if (!isEmbedded) return;
    cancelAnimationFrame(heightFrame);
    heightFrame = requestAnimationFrame(() => {
      const height = Math.max(root.scrollHeight, root.offsetHeight, document.body.scrollHeight);
      window.parent.postMessage({ type:'rms-qr-admin-height', height }, location.origin);
    });
  }

  if (isEmbedded && window.ResizeObserver) new ResizeObserver(notifyHostHeight).observe(root);
  window.addEventListener('load', notifyHostHeight);

  function session() {
    try {
      const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      return value?.access_token ? value : value?.currentSession || value?.session || null;
    } catch { return null; }
  }

  async function request(path, options = {}) {
    const auth = session();
    if (!auth?.access_token) throw new Error('Войдите в SaaS staging под barista@test.az.');
    const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
      ...options,
      headers: {
        apikey: PUBLISHABLE_KEY,
        Authorization: `Bearer ${auth.access_token}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...(options.headers || {})
      }
    });
    const text = await response.text();
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch { data = text; }
    if (!response.ok) throw new Error(data?.message || data?.hint || `Ошибка ${response.status}`);
    return data;
  }

  const rpc = (name, body = {}) => request(`rpc/${name}`, { method:'POST', body:JSON.stringify(body) });
  const list = (table, query = '') => request(`${table}?organization_id=eq.${encodeURIComponent(organizationId)}${query}`);

  async function loadData() {
    const [summary, branches, tables, catalog, orders] = await Promise.all([
      rpc('organization_qr_admin_state', { p_organization_id:organizationId }),
      list('qr_branches', '&select=id,code,name,is_active&order=name'),
      list('qr_tables', '&select=id,branch_id,code,label,is_active&order=label'),
      list('qr_menu_catalog', '&select=id,external_key,name,category_name,description,price,image_url,sort_order,is_active,special_price,is_special,special_label,is_featured,weight_text&order=sort_order,name'),
      list('qr_orders', '&select=id,order_number,status,subtotal,payable_amount,created_at&order=created_at.desc&limit=50')
    ]);
    state.summary = summary?.[0] || {};
    state.branches = branches || [];
    state.tables = tables || [];
    state.catalog = catalog || [];
    if (!state.catalog.length) {
      const branch = (branches || []).find(row => row.is_active) || (branches || [])[0];
      if (branch?.code) {
        const published = await rpc('qr_get_public_menu_v2', { p_branch_code:branch.code, p_table_code:null });
        const snapshot = Array.isArray(published) ? (published[0]?.qr_get_public_menu_v2 || published[0]) : published;
        state.catalog = (snapshot?.items || []).map(item => ({ ...item, is_active:true, external_key:null }));
      }
    }
    state.orders = orders || [];
  }

  function publicUrl(branch, table) {
    const url = new URL('/', location.origin);
    url.searchParams.set('qr', 'menu');
    url.searchParams.set('branch', branch.code);
    url.searchParams.set('qr_source', 'admin');
    if (organizationId) url.searchParams.set('organization', organizationId);
    const backgroundTheme = state.summary?.module_settings?.background_theme;
    if (['travertine','paper','olive','graphite'].includes(backgroundTheme)) url.searchParams.set('theme', backgroundTheme);
    if (table?.code) url.searchParams.set('table', table.code);
    return url.toString();
  }

  const button = (label, attrs='', kind='secondary') => `<button type="button" class="rms-${kind} small" ${attrs}>${label}</button>`;

  function shell(content) {
    const returnHref = state.access.rms_pro_active
      ? `/rms-pro.html?organization=${encodeURIComponent(organizationId)}`
      : `/?organization=${encodeURIComponent(organizationId)}`;
    const returnLabel = state.access.rms_pro_active ? '← Вернуться в RMS Pro' : '← Кабинет SaaS';
    root.innerHTML = `<div class="rms-qr-admin"><aside class="rms-qr-sidebar"><div class="rms-qr-brand"><span>QR</span><div><strong>RMS Menu</strong><small>${esc(state.access.organization_name)}</small></div></div><nav>${[
      ['overview','Обзор','⌂'],['menu','Меню','▦'],['branches','Филиалы и столы','⌘'],['orders','Заказы','▤'],['settings','Оформление','✦']
    ].map(([id,label,icon])=>`<button class="${state.section===id?'active':''}" data-section="${id}"><i>${icon}</i>${label}</button>`).join('')}</nav><div class="rms-qr-license"><small>Активный продукт</small><strong>QR Menu</strong><span>Серверная лицензия</span></div><a href="${esc(returnHref)}">${returnLabel}</a><button type="button" class="rms-secondary small" data-qr-logout>Выйти</button></aside><main class="rms-qr-main">${state.notice?`<div class="rms-notice success">${esc(state.notice)}</div>`:''}${content}</main></div>`;
    notifyHostHeight();
  }

  function overview() {
    const s = state.summary || {};
    return `<div class="rms-panel-heading"><div><p class="eyebrow">QR MENU · ОТДЕЛЬНЫЙ МОДУЛЬ</p><h2>Обзор QR Menu</h2><p>Управляйте меню, филиалами, столами и гостевыми QR-ссылками.</p></div><span class="rms-ready">Лицензия активна</span></div><div class="rms-kpis"><article><span>Филиалы</span><strong>${state.branches.filter(x=>x.is_active).length}</strong><small>активных</small></article><article><span>Столы</span><strong>${state.tables.filter(x=>x.is_active).length}</strong><small>QR-точек</small></article><article><span>Каталог</span><strong>${state.catalog.filter(x=>x.is_active).length}</strong><small>позиций</small></article><article><span>Открытые заказы</span><strong>${Number(s.open_order_count||0)}</strong><small>в работе</small></article></div><section class="rms-surface rms-qr-welcome"><div><span>QR</span></div><div><h3>${esc(state.access.organization_name)}</h3><p>Общий QR открывает меню филиала. QR конкретного стола передаёт его код и готов для будущего оформления заказа.</p></div></section>`;
  }

  function menuEditor() {
    if (state.menuEditor === null) return '';
    const item = state.menuEditor === 'new' ? {} : state.catalog.find(row=>row.id===state.menuEditor);
    if (!item) return '';
    return `<section class="rms-surface qr-editor"><div class="rms-section-head"><div><h3>${item.id?'Редактирование блюда':'Новое блюдо'}</h3><p>Название, описание, цена и фотография сразу появятся в гостевом меню.</p></div>${button('Закрыть','data-cancel-menu')}</div><form data-menu-form data-id="${esc(item.id||'')}"><div class="qr-image-column"><div class="qr-image-preview">${item.image_url?`<img src="${esc(item.image_url)}" alt="">`:'<span>Фото блюда</span>'}</div><label>Фотография<input name="image_file" type="file" accept="image/jpeg,image/png,image/webp,image/avif"><small>До 5 МБ</small></label><label>Или ссылка<input name="image_url" type="url" value="${esc(item.image_url||'')}" placeholder="https://..."></label></div><div class="qr-editor-fields"><label>Название<input name="name" maxlength="160" value="${esc(item.name||'')}" required></label><label>Категория<input name="category_name" maxlength="100" value="${esc(item.category_name||'')}" required></label><label class="wide">Описание<textarea name="description" maxlength="1000" rows="4">${esc(item.description||'')}</textarea></label><label>Обычная цена, ₼<input name="price" type="number" min="0" step="0.01" value="${item.price==null?'':Number(item.price)}" required></label><label>Акционная цена, ₼<input name="special_price" type="number" min="0" step="0.01" value="${item.special_price==null?'':Number(item.special_price)}"></label><label>Метка предложения<input name="special_label" maxlength="40" value="${esc(item.special_label||'')}" placeholder="−15%, Новинка"></label><label>Вес / объём<input name="weight_text" maxlength="40" value="${esc(item.weight_text||'')}" placeholder="250 г / 330 мл"></label><label>Порядок<input name="sort_order" type="number" step="1" value="${Number(item.sort_order??1000)}"></label><div class="qr-flags"><label><input type="checkbox" name="is_active" ${item.is_active!==false?'checked':''}> Показывать</label><label><input type="checkbox" name="is_special" ${item.is_special?'checked':''}> Спецпредложение</label><label><input type="checkbox" name="is_featured" ${item.is_featured?'checked':''}> Рекомендуем</label></div><div class="qr-form-actions"><button class="rms-primary" type="submit">${item.id?'Сохранить':'Добавить блюдо'}</button>${item.id?button('Удалить','data-delete-menu','danger'):''}</div></div></form></section>`;
  }

  function menu() {
    const categories=[...new Set(state.catalog.map(x=>x.category_name).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'ru'));
    return `<div class="rms-panel-heading"><div><p class="eyebrow">QR MENU · КАТАЛОГ</p><h2>Блюда и предложения</h2><p>Фотографии, описания, цены и спецпредложения.</p></div><div class="qr-heading-actions"><span class="rms-period">${state.catalog.length} позиций</span><button type="button" class="rms-primary" data-new-menu>+ Добавить блюдо</button></div></div>${menuEditor()}<section class="rms-surface"><div class="qr-catalog-tools"><label>Поиск<input type="search" data-menu-search placeholder="Название или описание"></label><label>Категория<select data-menu-category><option value="">Все категории</option>${categories.map(x=>`<option>${esc(x)}</option>`).join('')}</select></label></div><div class="qr-menu-grid">${state.catalog.map(item=>`<article class="qr-menu-card" data-menu-card data-search="${esc(`${item.name} ${item.description||''}`.toLowerCase())}" data-category="${esc(item.category_name||'')}"><div class="qr-menu-photo">${item.image_url?`<img src="${esc(item.image_url)}" alt="${esc(item.name)}">`:'<span>Нет фото</span>'}${item.is_special?`<b>${esc(item.special_label||'Спецпредложение')}</b>`:''}</div><div class="qr-menu-copy"><small>${esc(item.category_name||'Меню')}${item.weight_text?` · ${esc(item.weight_text)}`:''}</small><h3>${esc(item.name)}</h3><p>${esc(item.description||'Описание пока не добавлено.')}</p><div class="qr-menu-price">${item.special_price!=null?`<strong>${money(item.special_price)} ₼</strong><del>${money(item.price)} ₼</del>`:`<strong>${money(item.price)} ₼</strong>`}${item.is_featured?'<span>Рекомендуем</span>':''}</div><div class="qr-card-actions"><span class="rms-status ${item.is_active?'active':'inactive'}">${item.is_active?'В меню':'Скрыто'}</span>${button('Редактировать',`data-edit-menu="${esc(item.id)}"`)}</div></div></article>`).join('')||'<div class="rms-empty">Каталог пока пуст.</div>'}</div></section>`;
  }

  function qrCard(title, subtitle, value, fileName, general=false) {
    return `<article class="qr-code-card ${general?'general':''}"><div class="qr-code" data-qr-code data-value="${esc(value)}"><span>Создание QR…</span></div><div><small>${esc(subtitle)}</small><h3>${esc(title)}</h3><code>${esc(value)}</code><div class="qr-code-actions"><a class="rms-primary small" style="display:inline-flex;align-items:center;text-decoration:none;white-space:nowrap" href="${esc(value)}" target="_blank" rel="noopener">Открыть меню</a>${button('Копировать','data-copy-qr')}${button('Скачать SVG',`data-download-qr="${esc(fileName)}"`)}${button('Печать','data-print-qr','primary')}</div></div></article>`;
  }

  function branches() {
    return `<div class="rms-panel-heading"><div><p class="eyebrow">QR MENU · QR-КОДЫ</p><h2>Филиалы и столы</h2><p>Создавайте точки и готовые QR-коды без обращения к разработчику.</p></div></div><section class="rms-surface qr-create-panel"><form data-branch-create><h3>Новый филиал</h3><label>Название<input name="name" required placeholder="Например: BC5"></label><label>Код<input name="code" required maxlength="32" placeholder="BC5"></label><button class="rms-primary" type="submit">Добавить филиал</button></form><form data-table-create><h3>Новый стол</h3><label>Филиал<select name="branch_id" required><option value="">Выберите</option>${state.branches.map(x=>`<option value="${esc(x.id)}">${esc(x.name)}</option>`).join('')}</select></label><label>Название<input name="label" required placeholder="Стол 1"></label><label>Код<input name="code" required maxlength="32" placeholder="T1"></label><button class="rms-primary" type="submit">Добавить стол</button></form></section>${state.branches.map(branch=>{const tables=state.tables.filter(t=>t.branch_id===branch.id);return `<section class="rms-surface qr-branch-section"><form class="qr-branch-head" data-branch-form data-id="${esc(branch.id)}"><div><span class="rms-status ${branch.is_active?'active':'inactive'}">${branch.is_active?'Активен':'Отключён'}</span><label>Название<input name="name" value="${esc(branch.name)}" required></label><label>Код<input name="code" value="${esc(branch.code)}" required></label></div><div class="qr-inline-actions"><label><input type="checkbox" name="is_active" ${branch.is_active?'checked':''}> Активен</label><button class="rms-secondary small" type="submit">Сохранить</button>${button('Удалить','data-delete-branch','danger')}</div></form><div class="qr-general-grid">${qrCard(`Общий QR · ${branch.name}`,'Без привязки к столу',publicUrl(branch),`${branch.code}-general.svg`,true)}</div><div class="qr-table-list">${tables.map(table=>`<div><form data-table-form data-id="${esc(table.id)}"><input name="label" value="${esc(table.label||table.code)}" required><input name="code" value="${esc(table.code)}" required><label><input type="checkbox" name="is_active" ${table.is_active?'checked':''}> Активен</label><button class="rms-secondary small" type="submit">Сохранить</button>${button('Удалить','data-delete-table','danger')}</form>${qrCard(table.label||table.code,`Стол · ${branch.name}`,publicUrl(branch,table),`${branch.code}-${table.code}.svg`)}</div>`).join('')||'<p class="rms-empty">Столы ещё не добавлены.</p>'}</div></section>`;}).join('')||'<section class="rms-surface"><p>Филиалы ещё не созданы.</p></section>'}`;
  }

  function orders() {
    return `<div class="rms-panel-heading"><div><p class="eyebrow">QR MENU · ЗАКАЗЫ</p><h2>Заказы гостей</h2><p>Последние 50 заказов QR Menu.</p></div></div><section class="rms-surface"><div class="rms-table-wrap"><table class="rms-members-table"><thead><tr><th>Номер</th><th>Статус</th><th>Сумма</th><th>Создан</th></tr></thead><tbody>${state.orders.map(row=>`<tr><td><strong>#${esc(row.order_number||String(row.id).slice(0,8))}</strong></td><td>${esc(row.status)}</td><td>${money(row.payable_amount||row.subtotal)} ₼</td><td>${new Date(row.created_at).toLocaleString('ru-RU')}</td></tr>`).join('')||'<tr><td colspan="4" class="rms-empty">Заказов пока нет.</td></tr>'}</tbody></table></div></section>`;
  }

  function settings() {
    const value=state.summary?.module_settings||{};
    return `<div class="rms-panel-heading"><div><p class="eyebrow">QR MENU · ОФОРМЛЕНИЕ</p><h2>Настройки гостевого меню</h2></div></div><section class="rms-surface"><form class="rms-form qr-settings" data-settings><label>Заголовок<input name="hero_title" value="${esc(value.hero_title||'Добро пожаловать')}"></label><label>Основной цвет<input name="accent_color" type="color" value="${esc(value.accent_color||'#be8a42')}"></label><label>Фон QR Menu<select name="background_theme"><option value="travertine" ${value.background_theme==='travertine'?'selected':''}>Травертин · тёплый камень</option><option value="paper" ${value.background_theme==='paper'?'selected':''}>Меню-бумага · светлый кремовый</option><option value="olive" ${value.background_theme==='olive'?'selected':''}>Оливковый · мягкий средиземноморский</option><option value="graphite" ${value.background_theme==='graphite'?'selected':''}>Графит · вечерний</option></select></label><label>Язык<select name="default_language"><option value="ru">Русский</option><option value="az" ${value.default_language==='az'?'selected':''}>Azərbaycan</option><option value="en" ${value.default_language==='en'?'selected':''}>English</option></select></label><label><input type="checkbox" name="ordering_enabled" ${value.ordering_enabled!==false?'checked':''}> Принимать заказы</label><label><input type="checkbox" name="waiter_call_enabled" ${value.waiter_call_enabled!==false?'checked':''}> Вызов официанта</label><button class="rms-primary" type="submit">Сохранить</button></form></section>`;
  }

  function render() {
    const content = state.section==='menu'?menu():state.section==='branches'?branches():state.section==='orders'?orders():state.section==='settings'?settings():overview();
    shell(content);
    if (state.section==='branches') hydrateQrCodes();
  }

  async function hydrateQrCodes() {
    if (!window.RmsQRCode?.toString) return;
    await Promise.all([...document.querySelectorAll('[data-qr-code]')].map(async node=>{
      try { node.innerHTML=await window.RmsQRCode.toString(node.dataset.value,{type:'svg',width:196,margin:1,errorCorrectionLevel:'M',color:{dark:'#111516',light:'#ffffff'}}); }
      catch(error){ node.innerHTML=`<span>${esc(error.message)}</span>`; }
    }));
  }

  function payload(form, fields) {
    const data=new FormData(form), result={};
    fields.forEach(name=>result[name]=data.get(name));
    return result;
  }

  async function uploadImage(file) {
    if (!file?.size) return null;
    if (file.size>5*1024*1024) throw new Error('Файл превышает 5 МБ.');
    const ext=(file.name.split('.').pop()||'jpg').toLowerCase().replace(/[^a-z0-9]/g,'');
    const objectName=`${organizationId}/${crypto.randomUUID()}.${ext}`;
    const auth=session();
    const response=await fetch(`${SUPABASE_URL}/storage/v1/object/qr-menu-media/${objectName}`,{method:'POST',headers:{apikey:PUBLISHABLE_KEY,Authorization:`Bearer ${auth.access_token}`,'Content-Type':file.type||'application/octet-stream','x-upsert':'false'},body:file});
    if(!response.ok){const error=await response.json().catch(()=>({}));throw new Error(error.message||'Не удалось загрузить фото.');}
    return `${SUPABASE_URL}/storage/v1/object/public/qr-menu-media/${objectName}`;
  }

  document.addEventListener('click', async event=>{
    if(event.target.closest('[data-qr-logout]')){localStorage.removeItem(STORAGE_KEY);location.assign('/');return;}
    const section=event.target.closest('[data-section]');
    if(section){state.section=section.dataset.section;state.notice='';state.menuEditor=null;render();return;}
    if(event.target.closest('[data-new-menu]')){state.menuEditor='new';render();return;}
    if(event.target.closest('[data-cancel-menu]')){state.menuEditor=null;render();return;}
    const edit=event.target.closest('[data-edit-menu]');
    if(edit){state.menuEditor=edit.dataset.editMenu;render();return;}
    const removeMenu=event.target.closest('[data-delete-menu]');
    if(removeMenu){const form=removeMenu.closest('[data-menu-form]');const item=state.catalog.find(x=>x.id===form.dataset.id);if(!item||!confirm(`Удалить «${item.name}»?`))return;await request(`qr_menu_catalog?id=eq.${encodeURIComponent(item.id)}&organization_id=eq.${encodeURIComponent(organizationId)}`,{method:'DELETE',headers:{Prefer:'return=minimal'}});await loadData();state.menuEditor=null;state.notice='Блюдо удалено.';render();return;}
    const removeBranch=event.target.closest('[data-delete-branch]');
    if(removeBranch){const form=removeBranch.closest('[data-branch-form]');const branch=state.branches.find(x=>x.id===form.dataset.id);if(!branch||!confirm(`Удалить филиал «${branch.name}» и его столы?`))return;await request(`qr_tables?branch_id=eq.${encodeURIComponent(branch.id)}&organization_id=eq.${encodeURIComponent(organizationId)}`,{method:'DELETE',headers:{Prefer:'return=minimal'}});await request(`qr_branches?id=eq.${encodeURIComponent(branch.id)}&organization_id=eq.${encodeURIComponent(organizationId)}`,{method:'DELETE',headers:{Prefer:'return=minimal'}});await loadData();state.notice='Филиал удалён.';render();return;}
    const removeTable=event.target.closest('[data-delete-table]');
    if(removeTable){const form=removeTable.closest('[data-table-form]');if(!confirm('Удалить этот стол?'))return;await request(`qr_tables?id=eq.${encodeURIComponent(form.dataset.id)}&organization_id=eq.${encodeURIComponent(organizationId)}`,{method:'DELETE',headers:{Prefer:'return=minimal'}});await loadData();state.notice='Стол удалён.';render();return;}
    const action=event.target.closest('[data-copy-qr],[data-download-qr],[data-print-qr]');
    if(action){const card=action.closest('.qr-code-card'),qr=card?.querySelector('[data-qr-code]'),svg=qr?.querySelector('svg')?.outerHTML,value=qr?.dataset.value;if(!value)return;if(action.matches('[data-copy-qr]')){await navigator.clipboard.writeText(value);action.textContent='Скопировано';setTimeout(()=>action.textContent='Копировать',1200);}else if(action.matches('[data-download-qr]')&&svg){const url=URL.createObjectURL(new Blob([svg],{type:'image/svg+xml'}));const link=document.createElement('a');link.href=url;link.download=action.dataset.downloadQr||'qr.svg';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}else if(action.matches('[data-print-qr]')&&svg){const popup=window.open('','_blank','width=520,height=650');if(popup){popup.document.write(`<title>QR Menu</title><style>body{font-family:Arial;text-align:center;padding:35px}svg{width:320px;height:320px}p{word-break:break-all;color:#555}</style>${svg}<h2>${esc(card.querySelector('h3')?.textContent||'QR Menu')}</h2><p>${esc(value)}</p><script>onload=()=>print()<\/script>`);popup.document.close();}}}
  });

  document.addEventListener('input',event=>{if(event.target.matches('[data-menu-search]'))filterMenu();});
  document.addEventListener('change',event=>{if(event.target.matches('[data-menu-category]'))filterMenu();if(event.target.matches('[name=image_file]')&&event.target.files?.[0]){const preview=event.target.closest('[data-menu-form]')?.querySelector('.qr-image-preview');if(preview)preview.innerHTML=`<img src="${esc(URL.createObjectURL(event.target.files[0]))}" alt="">`;}});
  function filterMenu(){const search=(document.querySelector('[data-menu-search]')?.value||'').toLowerCase(),category=document.querySelector('[data-menu-category]')?.value||'';document.querySelectorAll('[data-menu-card]').forEach(card=>card.hidden=!!((search&&!card.dataset.search.includes(search))||(category&&card.dataset.category!==category)));}

  document.addEventListener('submit',async event=>{
    const form=event.target;event.preventDefault();
    try{
      if(form.matches('[data-menu-form]')){const data=new FormData(form),file=data.get('image_file');let imageUrl=data.get('image_url')||null;const uploaded=await uploadImage(file);if(uploaded)imageUrl=uploaded;const special=data.get('special_price');const body={organization_id:organizationId,name:String(data.get('name')).trim(),category_name:String(data.get('category_name')).trim(),description:String(data.get('description')||'').trim(),price:Number(data.get('price')),special_price:special===''?null:Number(special),is_special:data.get('is_special')==='on',special_label:String(data.get('special_label')||'').trim()||null,is_featured:data.get('is_featured')==='on',weight_text:String(data.get('weight_text')||'').trim()||null,image_url:imageUrl,sort_order:Number(data.get('sort_order')||1000),is_active:data.get('is_active')==='on'};const id=form.dataset.id;if(id)await request(`qr_menu_catalog?id=eq.${encodeURIComponent(id)}&organization_id=eq.${encodeURIComponent(organizationId)}`,{method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify(body)});else{body.external_key=`manual_${crypto.randomUUID()}`;await request('qr_menu_catalog',{method:'POST',headers:{Prefer:'return=minimal'},body:JSON.stringify(body)});}await loadData();state.menuEditor=null;state.notice=id?'Блюдо обновлено.':'Блюдо добавлено.';render();}
      else if(form.matches('[data-branch-create]')){const body=payload(form,['name','code']);body.organization_id=organizationId;body.name=body.name.trim();body.code=body.code.trim().toUpperCase();body.is_active=true;await request('qr_branches',{method:'POST',headers:{Prefer:'return=minimal'},body:JSON.stringify(body)});await loadData();state.notice='Филиал добавлен.';render();}
      else if(form.matches('[data-table-create]')){const body=payload(form,['branch_id','label','code']);body.organization_id=organizationId;body.label=body.label.trim();body.code=body.code.trim().toUpperCase();body.is_active=true;await request('qr_tables',{method:'POST',headers:{Prefer:'return=minimal'},body:JSON.stringify(body)});await loadData();state.notice='Стол добавлен.';render();}
      else if(form.matches('[data-branch-form]')){const data=new FormData(form),body={name:String(data.get('name')).trim(),code:String(data.get('code')).trim().toUpperCase(),is_active:data.get('is_active')==='on'};await request(`qr_branches?id=eq.${encodeURIComponent(form.dataset.id)}&organization_id=eq.${encodeURIComponent(organizationId)}`,{method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify(body)});await loadData();state.notice='Филиал обновлён.';render();}
      else if(form.matches('[data-table-form]')){const data=new FormData(form),body={label:String(data.get('label')).trim(),code:String(data.get('code')).trim().toUpperCase(),is_active:data.get('is_active')==='on'};await request(`qr_tables?id=eq.${encodeURIComponent(form.dataset.id)}&organization_id=eq.${encodeURIComponent(organizationId)}`,{method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify(body)});await loadData();state.notice='Стол обновлён.';render();}
      else if(form.matches('[data-settings]')){const data=new FormData(form),settings={hero_title:data.get('hero_title'),accent_color:data.get('accent_color'),background_theme:data.get('background_theme'),default_language:data.get('default_language'),ordering_enabled:data.get('ordering_enabled')==='on',waiter_call_enabled:data.get('waiter_call_enabled')==='on'};await rpc('organization_qr_settings_update',{p_organization_id:organizationId,p_settings:settings});await loadData();state.notice='Настройки сохранены. QR-коды обновлены выбранным фоном.';render();}
    }catch(error){alert(error.message);}
  });

  async function boot(){try{if(!organizationId)throw new Error('Организация не выбрана.');const access=await rpc('organization_product_access_state',{p_organization_id:organizationId});state.access=access?.[0];if(!state.access?.qr_menu_active)throw new Error('QR Menu license required');await loadData();render();}catch(error){const loginUrl=organizationId?`/?organization=${encodeURIComponent(organizationId)}&qr_return=1`:'/';root.innerHTML=`<main class="rms-product-blocked"><section><span class="rms-product-lock">!</span><h1>QR Menu Admin</h1><p>${esc(error.message)}</p><div><a href="${esc(loginUrl)}">Открыть вход SaaS</a></div></section></main>`;}}
  boot();
})();
