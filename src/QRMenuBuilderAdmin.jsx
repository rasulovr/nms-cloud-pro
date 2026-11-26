import React,{useEffect,useMemo,useState} from 'react';
import {supabase} from './supabase';
import {ArrowDown,ArrowUp,GripVertical} from 'lucide-react';
import {localizeCategory,localizeProduct} from './qrMenuTranslations';
import {branchMenuConfigTable,normalizeProduct,prepareNativeQrRows} from './qrMenuNative';
import QRPaperTag from './QRPaperTag';
import {tagLabels,tagCodes,tagsForProduct} from './qrMenuTags.mjs';
import {emptyQrBuilder,cleanQrBuilder,qrBuilderBranches,qrBuilderLanguages,qrBuilderText,qrBuilderImage,qrBuilderApplyOrder,qrBuilderMoveRow,qrBuilderTransferOrder} from './qrMenuBuilder.mjs';
import './QRMenuBuilderAdmin.css';
import {productFactsKey,productFactsForm,parseProductFacts,qrProductFacts} from './qrProductFacts.mjs';

const locales=qrBuilderLanguages;
const blank=()=>({kind:'new',category:'',image:'',price:'',tags:[],names:{},descriptions:{},facts:productFactsForm()});
const emptyOffer=()=>({enabled:false,product_id:'',image:'',seconds:5,titles:{},descriptions:{}});
const texts=o=>Object.fromEntries(locales.filter(l=>String(o?.[l]||'').trim()).map(l=>[l,o[l].trim()]));
const cents=x=>/^\d{1,5}(?:[.,]\d{1,2})?$/.test(String(x).trim())?Math.round(Number(String(x).replace(',','.'))*100):null;
const errText=e=>String(e?.message||e).includes('QR_BUILDER_STALE')?'Черновик изменился в другом окне. Обновите страницу перед сохранением.':e?.message||'Не удалось сохранить';
function originalCopy(p){
  if(p.snapshotCopy){const from=(field)=>Object.fromEntries(locales.filter(l=>p.snapshotCopy[l]?.[field]).map(l=>[l,p.snapshotCopy[l][field]]));return {names:from('name'),descriptions:from('description')};}
  return {names:{ru:p.name||''},descriptions:{ru:p.description||''}};
}
async function listQrChoices(branch){
  if(branch==='BC4')return Promise.all([import('./bc4MenuProjection.mjs'),import('./bc4InPlaceCatalogue.json')]).then(([p,j])=>p.projectBC4(j.default));
  if(branch==='BC5')return Promise.all([import('./bc5MenuProjection.mjs'),import('./bc5InPlaceCatalogue.json')]).then(([p,j])=>p.projectBC5(j.default));
  const [menu,config]=await Promise.all([
    supabase.rpc('qr_get_public_menu',{p_branch_code:branch}),
    supabase.from('rms_qr_tables').select('qr_code_url').eq('branch_id',branch).eq('table_number',branchMenuConfigTable).maybeSingle()
  ]);
  if(menu.error||config.error)throw menu.error||config.error;
  let cfg={};
  try{cfg=JSON.parse(config.data?.qr_code_url||'{}')||{};}catch{/* Older rows may have a QR URL instead of JSON. */}
  return doc=>prepareNativeQrRows(menu.data||[],cfg,doc).map(raw=>{
    const item=normalizeProduct(raw,branch);
    const snapshotCopy=Object.fromEntries(locales.map(l=>[l,localizeProduct(item,l)]));
    return {...item,name:snapshotCopy.ru.name,description:snapshotCopy.ru.description,snapshotCopy};
  });
}
function Localized({label,value,onChange,large=false,limit=160}){
  const Tag=large?'textarea':'input';
  return <div className="qb-languages"><b>{label}</b>{locales.map(lang=><label key={lang}>{lang.toUpperCase()}<Tag aria-label={label+' '+lang.toUpperCase()} maxLength={limit} value={value?.[lang]||''} onChange={e=>onChange({...value,[lang]:e.target.value})}/></label>)}</div>;
}
export default function QRMenuBuilderAdmin({initialBranch='BC5'}){
  const [branch,setBranch]=useState(qrBuilderBranches.includes(initialBranch)?initialBranch:'BC5');
  return <section className="card span-2 qr-builder"><div className="qb-toolbar"><div><h3>Конструктор QR-меню</h3><p>Правки сначала сохраняются в черновик. Гости увидят их только после публикации филиала.</p></div><label>Филиал<select value={branch} onChange={e=>setBranch(e.target.value)}>{qrBuilderBranches.map(x=><option key={x}>{x}</option>)}</select></label></div><BranchBuilder key={branch} branch={branch}/></section>;
}
function BranchBuilder({branch}){
  const [doc,setDoc]=useState(emptyQrBuilder),[rev,setRev]=useState(0),[liveRev,setLiveRev]=useState(0);
  const [base,setBase]=useState([]),[oldTags,setOldTags]=useState({});
  const [status,setStatus]=useState('Загрузка…'),[loaded,setLoaded]=useState(false),[busy,setBusy]=useState(false);
  const [tab,setTab]=useState('items'),[search,setSearch]=useState(''),[limit,setLimit]=useState(35);
  const [categoryId,setCategoryId]=useState(''),[catNames,setCatNames]=useState({});
  const [editId,setEditId]=useState(''),[edit,setEdit]=useState(blank);
  const [categoryView,setCategoryView]=useState(''),[reorder,setReorder]=useState(null);
  const [dragging,setDragging]=useState(''),[over,setOver]=useState('');
  useEffect(()=>{
    let active=true;
    Promise.all([listQrChoices(branch),
      supabase.from('rms_qr_builder_draft').select('revision,document').eq('branch_code',branch).maybeSingle(),
      supabase.from('rms_qr_builder_live').select('revision').eq('branch_code',branch).maybeSingle(),
      supabase.from('rms_qr_product_tags').select('product_key,tag_codes').eq('branch_code',branch)]).then(([rows,d,l,t])=>{
      if(!active)return;
      if(d.error||l.error||t.error)throw d.error||l.error||t.error;
      const draft=cleanQrBuilder(d.data?.document);
      setBase(typeof rows==='function'?rows(draft):rows);setDoc(draft);setRev(d.data?.revision||0);setLiveRev(l.data?.revision||0);
      setOldTags(Object.fromEntries((t.data||[]).map(r=>[r.product_key,r.tag_codes])));
      setLoaded(true);setStatus('');
    }).catch(e=>{if(active)setStatus(errText(e));});
    return()=>{active=false;};
  },[branch]);
  const cats=useMemo(()=>new Map([...base.map(p=>[p.category,qrBuilderText(p.categoryNames,'ru')||localizeCategory(p.category,'ru')||p.category]),...Object.entries(doc.categories).map(([k,x])=>[k,qrBuilderText(x.names,'ru')])]),[base,doc.categories]);
  const byId=useMemo(()=>new Map(base.map(p=>[String(p.id),p])),[base]);
  const products=useMemo(()=>{
    const ids=[...new Set([...byId.keys(),...Object.keys(doc.items)])];
    return ids.map(id=>{const actual=byId.get(id), draft=doc.items[id];return {id,actual,draft,
      name:qrBuilderText(draft?.copy?.names,'ru')||actual?.name||id,
      category:draft?.category||actual?.category||'',image:draft?.image||actual?.image||'',hidden:draft?.hidden===true};});
  },[byId,doc.items]);
  const [filter,setFilter]=useState('');
  const matching=qrBuilderApplyOrder(products,doc).filter(p=>(!filter||p.category===filter)&&(!search||[p.name,cats.get(p.category)].some(x=>String(x||'').toLocaleLowerCase('ru').includes(search.trim().toLocaleLowerCase('ru')))));
  const activeCategory=cats.has(categoryView)?categoryView:(cats.keys().next().value||'');
  const visibleCategoryProducts=qrBuilderApplyOrder(products.filter(p=>p.category===activeCategory),reorder?{order:{[activeCategory]:reorder}}:doc);
  function chooseCategory(id){setCategoryView(id);setReorder(null);setDragging('');setOver('');}
  function showCategoryItem(p){openItem(p);setFilter(activeCategory);setSearch('');setTab('items');}
  function moveRow(from,to){
    const ids=visibleCategoryProducts.map(p=>p.id);
    const next=qrBuilderMoveRow(ids,from,to);
    if(next!==ids)setReorder(next);
    setDragging('');setOver('');
  }
  async function saveOrder(){
    if(reorder&&await write({...doc,order:{...doc.order,[activeCategory]:reorder}}))setReorder(null);
  }
  function openItem(p){
    const x=p?.draft, a=p?.actual, original=a?originalCopy(a):{};
    const copy={names:{...original.names,...x?.copy?.names},descriptions:{...original.descriptions,...x?.copy?.descriptions}};
    setEditId(p?.id||'new');setEdit({...blank(),kind:x?.kind||(a?'existing':'new'),category:p?.category||filter||'',image:p?.image||'',
      price:x?.price_cents==null?(a?.price??''):String(x.price_cents/100),names:copy.names||{},descriptions:copy.descriptions||{},tags:x?.tags??oldTags[p?.id]??[],
      hidden:p?.hidden===true,facts:productFactsForm(qrProductFacts(doc,branch,p?.id))});
  }
  async function write(next,publish=false){
    if(busy||!loaded)return false;
    setBusy(true);setStatus('');
    try{
      const {data,error}=await supabase.rpc('rms_qr_builder_save',{p_branch:branch,p_revision:rev,p_document:next,p_publish:publish});
      if(error||!Number.isInteger(data))throw error||Error('Сохранение не подтверждено');
      setDoc(next);setRev(data);if(publish)setLiveRev(data);
      setStatus(publish?'Меню '+branch+' опубликовано.':'Черновик сохранён.');return true;
    }catch(e){setStatus(errText(e));return false;}finally{setBusy(false);}
  }
  async function saveCategory(e){
    e.preventDefault();const names=texts(catNames);if(!Object.keys(names).length){setStatus('Укажи название категории.');return;}
    const id=categoryId||'cat:'+crypto.randomUUID();
    if(await write({...doc,categories:{...doc.categories,[id]:{names}}})){chooseCategory(id);setCategoryId('');setCatNames({});}
  }
  async function saveItem(e){
    e.preventDefault();const names=texts(edit.names),price=cents(edit.price);
    if(!Object.keys(names).length||!cats.has(edit.category)){setStatus('Нужны название и категория.');return;}
    if(edit.kind==='new'&&price===null){setStatus('Укажи корректную цену в AZN.');return;}
    if(edit.image&&!qrBuilderImage(edit.image)){setStatus('Фото: укажи адрес HTTPS.');return;}
    const id=editId==='new'?crypto.randomUUID():editId;
    const first=byId.get(id), original=first?originalCopy(first):{};
    const tried=parseProductFacts(edit.facts);
    if(tried.error){setStatus(tried.error);return;}
    const before=parseProductFacts(productFactsForm(qrProductFacts(doc,branch,id))).value;
    const nextFacts=JSON.stringify(before)===JSON.stringify(tried.value)?doc.product_facts:
      {...doc.product_facts,[productFactsKey(branch,id)]:tried.value};
    const changed=(values,base={})=>Object.fromEntries(Object.entries(values).filter(([l,value])=>edit.kind==='new'||value!==String(base[l]||'').trim()));
    const descriptions=Object.fromEntries(locales.filter(l=>Object.hasOwn(edit.descriptions,l)).map(l=>[l,String(edit.descriptions[l]).trim()]));
    const entry={kind:edit.kind,
      ...(edit.kind==='new'||edit.category!==first?.category?{category:edit.category}:{}),
      ...(edit.kind==='new'||edit.image!==String(first?.image||'')?{image:edit.image.trim()}:{}),
      copy:{names:changed(names,original.names),descriptions:changed(descriptions,original.descriptions)},tags:tagCodes(edit.tags),
      ...(edit.kind==='new'?{price_cents:price,hidden:edit.hidden===true}:{})};
    const oldCategory=doc.items[id]?.category||first?.category||'';
    if(await write({...doc,items:{...doc.items,[id]:entry},product_facts:nextFacts,order:qrBuilderTransferOrder(doc.order,id,oldCategory,edit.category)})){setEditId('');if(filter)setFilter(edit.category);}
  }
  const [offerEdit,setOfferEdit]=useState(null);
  const o=offerEdit||doc.offer||emptyOffer();
  function updateOffer(patch){setOfferEdit({...o,...patch});}
  async function saveOffer(e){
    e.preventDefault();
    const item=products.find(p=>p.id===o.product_id&&!p.hidden);
    if(o.enabled&&(!item||!(qrBuilderImage(o.image)||item.image))){setStatus('Выбери видимое блюдо с фото или добавь фото для показа.');return;}
    if(o.image&&!qrBuilderImage(o.image)){setStatus('Фото: укажи адрес HTTPS.');return;}
    const next={...o,seconds:Number(o.seconds),image:o.image.trim(),titles:texts(o.titles),descriptions:texts(o.descriptions)};
    if(await write({...doc,offer:next}))setOfferEdit(null);
  }
  return <>
    <div className="qb-toolbar qb-tabs"><nav aria-label="Конструктор">{[['items','Позиции'],['categories','Категории'],['offer','Спецпредложение']].map(([k,v])=><button key={k} type="button" className={tab===k?'small primary':'small'} disabled={busy||Boolean(reorder)&&k!=='categories'} onClick={()=>setTab(k)}>{v}</button>)}</nav>
      <button type="button" className="small primary" disabled={!loaded||busy||Boolean(reorder)||rev===liveRev} onClick={()=>write(doc,true)}>Опубликовать {branch}</button></div>
    <div role="status" className="qb-status">{status||(!rev?'Действующее меню без изменений':rev===liveRev?'Опубликовано':'Есть неопубликованный черновик')}</div>
    {loaded&&tab==='categories'&&<><form className="qb-form" onSubmit={saveCategory}><h4>{categoryId?'Редактировать свою категорию':'Новая категория'}</h4>
      <Localized label="Название" value={catNames} onChange={setCatNames} limit={100}/>
      <div><button type="submit" className="small primary" disabled={busy||Boolean(reorder)}>Сохранить в черновик</button>{categoryId&&<button type="button" className="small" onClick={()=>{setCategoryId('');setCatNames({});}}>Отмена</button>}</div></form>
      <section className="qb-form qb-category-items" aria-label="Позиции в категории">
        <div className="qb-toolbar"><label>Категория<select value={activeCategory} disabled={busy||Boolean(reorder)} onChange={e=>chooseCategory(e.target.value)}>{[...cats].map(([id,n])=><option key={id} value={id}>{n}</option>)}</select></label>
          {doc.categories[activeCategory]&&<button type="button" className="small" disabled={busy||Boolean(reorder)} onClick={()=>{setCategoryId(activeCategory);setCatNames(doc.categories[activeCategory].names);}}>Редактировать название</button>}
          <button type="button" className="small" disabled={busy||Boolean(reorder)||!activeCategory} onClick={()=>{setFilter(activeCategory);setSearch('');openItem({id:'new',category:activeCategory});setTab('items');}}>+ Позиция в категории</button></div>
        <h4>{cats.get(activeCategory)} · {visibleCategoryProducts.length}</h4>
        {visibleCategoryProducts.length>1&&<p className="qb-order-help">Потяни за ручку слева или воспользуйся стрелками. Сохрани порядок в черновик, затем опубликуй меню.</p>}
        {!visibleCategoryProducts.length&&<p>В этой категории пока нет блюд. Добавь позицию или перенеси сюда существующую через поле «Категория».</p>}
        <ol className="qb-list qb-order-list">{visibleCategoryProducts.map((p,index)=><li key={p.id} data-dragging={dragging===p.id} data-over={over===p.id&&dragging!==p.id}
          onDragOver={e=>{if(dragging){e.preventDefault();e.dataTransfer.dropEffect='move';setOver(p.id);}}}
          onDrop={e=>{if(dragging){e.preventDefault();moveRow(dragging,p.id);}}}>
          <span className="qb-order-grip" draggable={!busy&&visibleCategoryProducts.length>1} title="Тяни вверх или вниз"
            onDragStart={e=>{e.dataTransfer.setData('text/plain',p.id);e.dataTransfer.effectAllowed='move';setDragging(p.id);}}
            onDragEnd={()=>{setDragging('');setOver('');}}><GripVertical size={18} aria-hidden="true"/></span>
          <span className="qb-order-index">{index+1}</span><span className="qb-order-name"><b>{p.name}</b>{p.hidden&&<small>Скрыто</small>}</span>
          <div className="qb-order-buttons"><button type="button" className="small" aria-label={p.name+': выше'} disabled={busy||index===0} onClick={()=>moveRow(p.id,visibleCategoryProducts[index-1].id)}><ArrowUp size={15}/></button>
          <button type="button" className="small" aria-label={p.name+': ниже'} disabled={busy||index===visibleCategoryProducts.length-1} onClick={()=>moveRow(p.id,visibleCategoryProducts[index+1].id)}><ArrowDown size={15}/></button></div>
          <button type="button" className="small" disabled={busy||Boolean(reorder)} onClick={()=>showCategoryItem(p)}>Редактировать</button></li>)}</ol>
        {reorder&&<div className="qb-toolbar"><button type="button" className="small primary" disabled={busy} onClick={saveOrder}>Сохранить порядок в черновик</button><button type="button" className="small" disabled={busy} onClick={()=>setReorder(null)}>Отменить перестановку</button></div>}
      </section></>}
    {loaded&&tab==='items'&&<><div className="qb-toolbar"><label>Поиск позиции<input type="search" value={search} onChange={e=>{setSearch(e.target.value);setLimit(35);}}/></label><label>Категория<select value={filter} onChange={e=>{setFilter(e.target.value);setLimit(35);}}><option value="">Все категории</option>{[...cats].map(([id,n])=><option key={id} value={id}>{n}</option>)}</select></label><button className="small primary" type="button" onClick={()=>openItem()}>+ Новая позиция</button></div>
      {editId&&<form className="qb-form" onSubmit={saveItem}><h4>{editId==='new'?'Новая позиция':qrBuilderText(edit.names,'ru')}</h4>
        <Localized label="Название" value={edit.names} onChange={names=>setEdit({...edit,names})}/>
        <Localized label="Описание" value={edit.descriptions} onChange={descriptions=>setEdit({...edit,descriptions})} large limit={2000}/>
        <fieldset><legend>Параметры блюда</legend>
          <div className="qb-row">
            <label>Калорийность, ккал<input type="number" min="0" max="9999" step="1" value={edit.facts.calories} onChange={e=>setEdit(s=>({...s,facts:{...s.facts,calories:e.target.value}}))}/></label>
            <label>Время приготовления, мин<input placeholder="10 или 10–15" maxLength="12" value={edit.facts.preparationMinutes} onChange={e=>setEdit(s=>({...s,facts:{...s.facts,preparationMinutes:e.target.value}}))}/></label>
          </div>
          <label><input type="checkbox" checked={edit.facts.approximate} onChange={e=>setEdit(s=>({...s,facts:{...s.facts,approximate:e.target.checked}}))}/> Приблизительная калорийность</label>
          <Localized label="Аллергены" value={edit.facts.allergens} onChange={allergens=>setEdit(s=>({...s,facts:{...s.facts,allergens}}))} large limit={240}/>
        </fieldset>
        <div className="qb-row"><label>Категория<select value={edit.category} onChange={e=>setEdit({...edit,category:e.target.value})}><option value="">Выбрать</option>{[...cats].map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></label>
          <label>Цена, AZN<input value={edit.price} inputMode="decimal" disabled={edit.kind!=='new'} onChange={e=>setEdit({...edit,price:e.target.value})}/></label>
          <label>Адрес фото<input value={edit.image} placeholder="https://…" onChange={e=>setEdit({...edit,image:e.target.value})}/></label></div>
        <fieldset className="qb-tags"><legend>Бирки</legend>{Object.entries(tagLabels).map(([k,v])=><label className="qb-tag-option" key={k}><QRPaperTag code={k}/><input aria-label={v} type="checkbox" checked={edit.tags.includes(k)} onChange={e=>setEdit({...edit,tags:e.target.checked?[...edit.tags,k]:edit.tags.filter(x=>x!==k)})}/></label>)}</fieldset>
        {edit.kind==='new'&&<label><input type="checkbox" checked={edit.hidden} onChange={e=>setEdit({...edit,hidden:e.target.checked})}/> Скрыть позицию</label>}
        <div><button type="submit" className="small primary" disabled={busy}>Сохранить в черновик</button> <button type="button" className="small" onClick={()=>setEditId('')}>Закрыть</button></div></form>}
      <ul className="qb-list">{matching.slice(0,limit).map(p=><li key={p.id}><span><b>{p.name}</b><small>{cats.get(p.category)}{p.hidden?' · Скрыто':''}{tagsForProduct({categoryNames:{ru:cats.get(p.category)}},p.draft?.tags??oldTags[p.id]).map(k=>' · '+tagLabels[k])}</small></span><button type="button" className="small" onClick={()=>openItem(p)}>Редактировать</button></li>)}</ul>
      {!matching.length&&<p>Позиций не найдено</p>}{matching.length>limit&&<button type="button" className="small" onClick={()=>setLimit(n=>n+35)}>Показать ещё</button>}</>}
    {loaded&&tab==='offer'&&<form className="qb-form" onSubmit={saveOffer}><h4>Заставка при открытии QR</h4><p>Фотография заполняет экран. Заставка исчезает сама либо по нажатию.</p>
      <label><input type="checkbox" checked={o.enabled} onChange={e=>updateOffer({enabled:e.target.checked})}/> Показывать гостям</label>
      <div className="qb-row"><label>Блюдо<select value={o.product_id} onChange={e=>updateOffer({product_id:e.target.value})}><option value="">Выбрать</option>{products.filter(p=>!p.hidden).map(p=><option key={p.id} value={p.id}>{p.name} · {cats.get(p.category)}</option>)}</select></label><label>Секунд<input type="number" min="3" max="12" required value={o.seconds} onChange={e=>updateOffer({seconds:e.target.value})}/></label>
      <label>Отдельное фото, необязательно<input value={o.image} placeholder="По умолчанию фото блюда" onChange={e=>updateOffer({image:e.target.value})}/></label></div>
      <Localized label="Заголовок, необязательно" value={o.titles} onChange={titles=>updateOffer({titles})}/>
      <Localized label="Текст, необязательно" value={o.descriptions} onChange={descriptions=>updateOffer({descriptions})} large limit={400}/>
      <div><button type="submit" className="small primary" disabled={busy}>Сохранить в черновик</button></div>
    </form>}
  </>;
}
