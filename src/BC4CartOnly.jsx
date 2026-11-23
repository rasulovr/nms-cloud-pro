import React,{useEffect,useMemo,useState} from 'react';
import {cartLines,editCart,menuModel,optionLabel} from './bc4CartModel.mjs';
import catalog from './bc4CartCatalogue.json';
import './BC4CartOnly.css';
const words={
 ru:['Меню','Корзина','Добавить','Выберите вариант','Вариант','Сумма позиций','Корзина пуста','Назад в меню','Корзина для расчёта суммы. Заказ не отправляется. Сервисный сбор Clopos (10%) не включён.','Цена не подтверждена','Бесплатная добавка','Добавьте блюдо или напиток сначала','Уменьшить','Увеличить'],
 az:['Menyu','Səbət','Əlavə et','Variant seçin','Variant','Məhsulların cəmi','Səbət boşdur','Menyuya qayıt','Səbət yalnız məbləği hesablamaq üçündür. Sifariş göndərilmir. Clopos xidmət haqqı (10%) daxil deyil.','Qiymət təsdiqlənməyib','Pulsuz əlavə','Əvvəlcə yemək və ya içki əlavə edin','Azalt','Artır'],
 en:['Menu','Cart','Add','Choose an option','Option','Items subtotal','Your cart is empty','Back to menu','Use the cart to calculate your total. Orders are not sent. Clopos service charge (10%) is not included.','Price not confirmed','Free add-on','Add a dish or drink first','Decrease','Increase'],
};
const rows=menuModel(catalog.rows);
const byKey=new Map(rows.map(r=>[r.key,r]));
const fmt=(c,lang)=>new Intl.NumberFormat(lang+'-AZ',{minimumFractionDigits:2,maximumFractionDigits:2}).format(c/100)+' ₼';
const copy=(r,lang)=>({name:r.translations[lang]?.name||r.translations.ru?.name||r.name, description:r.translations[lang]?.description||'',category:r.translations[lang]?.category||r.translations.ru?.category||r.category});
export default function BC4CartOnly(){
 const [lang,setLang]=useState(()=>['az','ru','en'].includes(new URLSearchParams(window.location.search).get('lang'))?new URLSearchParams(window.location.search).get('lang'):'ru');
 const [cart,setCart]=useState([]),[cartOpen,setCartOpen]=useState(false),[options,setOptions]=useState({});
 const [feedback,setFeedback]=useState('');
 const t=words[lang];
 useEffect(()=>{const previous=document.documentElement.lang;document.documentElement.lang=lang;return ()=>{document.documentElement.lang=previous}},[lang]);
 const sections=useMemo(()=>Array.from(rows.reduce((m,r)=>m.set(r.categorySourceId,[...(m.get(r.categorySourceId)||[]),r]),new Map())),[]);
 const lines=cartLines(cart,byKey);const total=lines.reduce((s,x)=>s+x.subtotal,0), count=lines.reduce((s,x)=>s+x.qty,0);
 const change=(key,picked,delta)=>setCart(prev=>editCart(prev,byKey,key,picked,delta));
 const open=flag=>{setCartOpen(flag);window.scrollTo(0,0);};
 return <main className="bc4only">
  <header className="bc4-hero"><div><p>BARISTA &amp; CHEF</p><h1>{t[cartOpen?1:0]}</h1><p>Hacıbəyli</p></div><div aria-label="Language" className="bc4-languages">{['az','ru','en'].map(l=><button key={l} type="button" aria-pressed={lang===l} onClick={()=>{setLang(l);setFeedback('')}}>{l.toUpperCase()}</button>)}</div></header>
  {!cartOpen?<><nav className="bc4-sections" aria-label={t[0]}>{sections.map(([id,items])=><a key={id} href={'#bc4-'+id}>{copy(items[0],lang).category}</a>)}</nav>
  {sections.map(([id,items])=><section key={id} id={'bc4-'+id}><h2>{copy(items[0],lang).category}</h2><div className="bc4-grid">{items.map(r=>{
   const c=copy(r,lang), selection=options[r.key]||'', variant=r.options.find(o=>o.id===selection), price=r.options.length?variant?.cents:r.base;
   const blockedAddon=r.addon&&!lines.some(l=>!l.item.addon);
   return <article key={r.key}>{r.image&&<img loading="lazy" alt="" src={r.image}/>}<div className="bc4-card"><h3>{c.name}</h3>{c.description&&<p>{c.description}</p>}
   {r.options.length>0&&<label>{t[4]}<select aria-label={c.name+' · '+t[4]} value={selection} onChange={e=>setOptions(prev=>({...prev,[r.key]:e.target.value}))}><option value="">{t[3]}</option>{r.options.map(o=><option key={o.id} value={o.id} disabled={o.cents==null}>{optionLabel(o,lang)}{o.cents==null?'':(' · '+fmt(o.cents,lang))}</option>)}</select></label>}
   <strong>{r.addon?t[10]:price!=null?fmt(price,lang):r.options.length?t[3]:t[9]}</strong>
   <button type="button" disabled={price==null||blockedAddon} onClick={()=>{change(r.key,selection,1);setFeedback(c.name)}} aria-label={t[2]+' · '+c.name}>{blockedAddon?t[11]:t[2]}</button></div></article>})}</div></section>)}</>
  : <section><p role="note">{t[8]}</p>{!lines.length&&<p>{t[6]}</p>}
  <ul className="bc4-lines">{lines.map(l=><li key={l.key+'|'+l.picked}><div><strong>{copy(l.item,lang).name}</strong>{l.option&&<span>{optionLabel(l.option,lang)}</span>}<span>{fmt(l.price,lang)} × {l.qty}</span></div><div className="bc4-quantity"><button type="button" aria-label={t[12]} onClick={()=>change(l.key,l.picked,-1)}>−</button><button type="button" aria-label={t[13]} onClick={()=>change(l.key,l.picked,1)}>+</button></div><strong>{fmt(l.subtotal,lang)}</strong></li>)}</ul>
  <p><strong>{t[5]}: {fmt(total,lang)}</strong></p><button type="button" onClick={()=>open(false)}>{t[7]}</button></section>}
  {!cartOpen&&<footer><span role="status" className="bc4-sr">{feedback&&t[1]+': '+count+' · '+feedback}</span><button type="button" onClick={()=>open(true)}>{t[1]} · {count} · {fmt(total,lang)}</button></footer>}
 </main>;
}
