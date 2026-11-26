import React,{useEffect,useMemo,useState} from 'react';
import {supabase} from './supabase';
import {tagLabels,tagCodes,tagsForProduct} from './qrMenuTags.mjs';
import {emptyQrBuilder,cleanQrBuilder,qrBuilderBranches,qrBuilderLanguages,qrBuilderText,qrBuilderImage} from './qrMenuBuilder.mjs';
import './QRMenuBuilderAdmin.css';

const locales=qrBuilderLanguages;
const blank=()=>({kind:'new',category:'',image:'',price:'',tags:[],names:{},descriptions:{}});
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
  const {data,error}=await supabase.rpc('qr_get_public_menu',{p_branch_code:branch});
  if(error)throw error;
  return (data||[]).map(x=>({...x,category:x.category_name,image:x.image_url}));
}
function Localized({label,value,onChange,large=false,limit=160}){
  const Tag=large?'textarea':'input';
  return <div className="qb-languages"><b>{label}</b>{locales.map(lang=><label key={lang}>{lang.toUpperCase()}<Tag maxLength={limit} value={value?.[lang]||''} onChange={e=>onChange({...value,[lang]:e.target.value})}/></label>)}</div>;
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
  useEffect(()=>{
    let active=true;
    Promise.all([listQrChoices(branch),
      supabase.from('rms_qr_builder_draft').select('revision,document').eq('branch_code',branch).maybeSingle(),
      supabase.from('rms_qr_builder_live').select('revision').eq('branch_code',branch).maybeSingle(),
      supabase.from('rms_qr_product_tags').select('product_key,tag_codes').eq('branch_code',branch)]).then(([rows,d,l,t])=>{
      if(!active)return;
      if(d.error||l.error||t.error)throw d.error||l.error||t.error;
      setBase(rows);setDoc(cleanQrBuilder(d.data?.document));setRev(d.data?.revision||0);setLiveRev(l.data?.revision||0);
      setOldTags(Object.fromEntries((t.data||[]).map(r=>[r.product_key,r.tag_codes])));
      setLoaded(true);setStatus('');
    }).catch(e=>{if(active)setStatus(errText(e));});
    return()=>{active=false;};
  },[branch]);
  const cats=useMemo(()=>new Map([...base.map(p=>[p.category,qrBuilderText(p.categoryNames,'ru')||p.category]),...Object.entries(doc.categories).map(([k,x])=>[k,qrBuilderText(x.names,'ru')])]),[base,doc.categories]);
  const byId=useMemo(()=>new Map(base.map(p=>[String(p.id),p])),[base]);
  const products=useMemo(()=>{
    const ids=[...new Set([...byId.keys(),...Object.keys(doc.items)])];
    return ids.map(id=>{const actual=byId.get(id), draft=doc.items[id];return {id,actual,draft,
      name:qrBuilderText(draft?.copy?.names,'ru')||actual?.name||id,
      category:draft?.category||actual?.category||'',image:draft?.image||actual?.image||'',hidden:draft?.hidden===true};});
  },[byId,doc.items]);
  const matching=products.filter(p=>!search||[p.name,cats.get(p.category)].some(x=>String(x||'').toLocaleLowerCase('ru').includes(search.trim().toLocaleLowerCase('ru'))));
  function openItem(p){
    const x=p?.draft, a=p?.actual, original=a?originalCopy(a):{};
    const copy={names:{...original.names,...x?.copy?.names},descriptions:{...original.descriptions,...x?.copy?.descriptions}};
    setEditId(p?.id||'new');setEdit({...blank(),kind:x?.kind||(a?'existing':'new'),category:p?.category||'',image:p?.image||'',
      price:x?.price_cents==null?(a?.price??''):String(x.price_cents/100),names:copy.names||{},descriptions:copy.descriptions||{},tags:x?.tags??oldTags[p?.id]??[],
      hidden:p?.hidden===true});
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
    if(await write({...doc,categories:{...doc.categories,[id]:{names}}})){setCategoryId('');setCatNames({});}
  }
  async function saveItem(e){
    e.preventDefault();const names=texts(edit.names),price=cents(edit.price);
    if(!Object.keys(names).length||!cats.has(edit.category)){setStatus('Нужны название и категория.');return;}
    if(edit.kind==='new'&&price===null){setStatus('Укажи корректную цену в AZN.');return;}
    if(edit.image&&!qrBuilderImage(edit.image)){setStatus('Фото: укажи адрес HTTPS.');return;}
    const id=editId==='new'?crypto.randomUUID():editId;
    const first=byId.get(id), original=first?originalCopy(first):{};
    const changed=(values,base={})=>Object.fromEntries(Object.entries(values).filter(([l,value])=>edit.kind==='new'||value!==String(base[l]||'').trim()));
    const descriptions=Object.fromEntries(locales.filter(l=>Object.hasOwn(edit.descriptions,l)).map(l=>[l,String(edit.descriptions[l]).trim()]));
    const entry={kind:edit.kind,
      ...(edit.kind==='new'||edit.category!==first?.category?{category:edit.category}:{}),
      ...(edit.kind==='new'||edit.image!==String(first?.image||'')?{image:edit.image.trim()}:{}),
      copy:{names:changed(names,original.names),descriptions:changed(descriptions,original.descriptions)},tags:tagCodes(edit.tags),
      ...(edit.kind==='new'?{price_cents:price,hidden:edit.hidden===true}:{})};
    if(await write({...doc,items:{...doc.items,[id]:entry}}))setEditId('');
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
    <div className="qb-toolbar qb-tabs"><nav aria-label="Конструктор">{[['items','Позиции'],['categories','Категории'],['offer','Спецпредложение']].map(([k,v])=><button key={k} type="button" className={tab===k?'small primary':'small'} onClick={()=>setTab(k)}>{v}</button>)}</nav>
      <button type="button" className="small primary" disabled={!loaded||busy||rev===liveRev} onClick={()=>write(doc,true)}>Опубликовать {branch}</button></div>
    <div role="status" className="qb-status">{status||(!rev?'Действующее меню без изменений':rev===liveRev?'Опубликовано':'Есть неопубликованный черновик')}</div>
    {loaded&&tab==='categories'&&<><form className="qb-form" onSubmit={saveCategory}><h4>{categoryId?'Редактировать свою категорию':'Новая категория'}</h4>
      <Localized label="Название" value={catNames} onChange={setCatNames} limit={100}/>
      <div><button type="submit" className="small primary" disabled={busy}>Сохранить в черновик</button>{categoryId&&<button type="button" className="small" onClick={()=>{setCategoryId('');setCatNames({});}}>Отмена</button>}</div></form>
      <ul className="qb-list">{[...cats].map(([id,n])=><li key={id}><span>{n}</span>{doc.categories[id]&&<button type="button" className="small" onClick={()=>{setCategoryId(id);setCatNames(doc.categories[id].names);}}>Редактировать</button>}</li>)}</ul></>}
    {loaded&&tab==='items'&&<><div className="qb-toolbar"><label>Поиск позиции<input type="search" value={search} onChange={e=>{setSearch(e.target.value);setLimit(35);}}/></label><button className="small primary" type="button" onClick={()=>openItem()}>+ Новая позиция</button></div>
      {editId&&<form className="qb-form" onSubmit={saveItem}><h4>{editId==='new'?'Новая позиция':qrBuilderText(edit.names,'ru')}</h4>
        <Localized label="Название" value={edit.names} onChange={names=>setEdit({...edit,names})}/>
        <Localized label="Описание" value={edit.descriptions} onChange={descriptions=>setEdit({...edit,descriptions})} large limit={2000}/>
        <div className="qb-row"><label>Категория<select value={edit.category} onChange={e=>setEdit({...edit,category:e.target.value})}><option value="">Выбрать</option>{[...cats].map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></label>
          <label>Цена, AZN<input value={edit.price} inputMode="decimal" disabled={edit.kind!=='new'} onChange={e=>setEdit({...edit,price:e.target.value})}/></label>
          <label>Адрес фото<input value={edit.image} placeholder="https://…" onChange={e=>setEdit({...edit,image:e.target.value})}/></label></div>
        <fieldset className="qb-tags"><legend>Бирки</legend>{Object.entries(tagLabels).map(([k,v])=><label key={k}><input type="checkbox" checked={edit.tags.includes(k)} onChange={e=>setEdit({...edit,tags:e.target.checked?[...edit.tags,k]:edit.tags.filter(x=>x!==k)})}/>{v}</label>)}</fieldset>
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
