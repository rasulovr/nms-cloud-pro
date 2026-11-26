import React, { useLayoutEffect, useRef, useState } from "react";

export function ApprovedPhotoViewer({photo,language,onDismiss}){
 const ref=useRef(null);
 const closing=useRef(false);
 const closeTimer=useRef(null);
 const dismiss=()=>{
   const view=ref.current;
   if(!view?.open||closing.current)return;
   closing.current=true;
   const finish=()=>{if(view.open)view.close();onDismiss();};
   if(window.matchMedia("(prefers-reduced-motion: reduce)").matches){finish();return;}
   view.style.setProperty("--review-photo-fade-from",getComputedStyle(view).opacity);
   view.style.setProperty("--review-photo-backdrop-from",getComputedStyle(view,"::backdrop").opacity);
   view.dataset.photoClosing="true";
   closeTimer.current=window.setTimeout(finish,720);
 };
 useLayoutEffect(()=>{
   const view=ref.current;
   if(!view)return;
   view.showModal();
   view.querySelector("button")?.focus({preventScroll:true});
   return ()=>{
     window.clearTimeout(closeTimer.current);
     if(view.open)view.close();
     if(photo.trigger?.isConnected)photo.trigger.focus({preventScroll:true});
   };
 },[photo]);
 const image=useRef(null);
 const pan=useRef({x:0,y:0,pointer:null,lastX:0,lastY:0});
 const [canMove,setCanMove]=useState(0);
 const clamp=(n,max)=>Math.max(-max,Math.min(max,n));
 const applyPan=()=>{
   const node=image.current;
   if(!node?.naturalWidth || !node.naturalHeight)return;
   const width=node.clientWidth,height=node.clientHeight;
   if(!width||!height)return;
   const scale=Math.max(width/node.naturalWidth,height/node.naturalHeight);
   const maxX=Math.max(0,(node.naturalWidth*scale-width)/2);
   const maxY=Math.max(0,(node.naturalHeight*scale-height)/2);
   const pos=pan.current;
   pos.x=clamp(pos.x,maxX);pos.y=clamp(pos.y,maxY);
   node.style.objectPosition="calc(50% + "+pos.x+"px) calc(50% + "+pos.y+"px)";
   setCanMove((pos.x> -maxX+.5?1:0)|(pos.x<maxX-.5?2:0)|(pos.y> -maxY+.5?4:0)|(pos.y<maxY-.5?8:0));
 };
 useLayoutEffect(()=>{
   if(typeof ResizeObserver==="undefined"||!image.current)return;
   const observer=new ResizeObserver(applyPan);observer.observe(image.current);
   return ()=>observer.disconnect();
 },[]);
 const beginPan=event=>{
   const pos=pan.current;
   if(closing.current||!event.isPrimary||event.button!==0||pos.pointer!==null)return;
   pos.pointer=event.pointerId;pos.lastX=event.clientX;pos.lastY=event.clientY;
   event.currentTarget.setPointerCapture(event.pointerId);
 };
 const movePan=event=>{
   const pos=pan.current;
   if(closing.current||event.pointerId!==pos.pointer)return;
   pos.x+=event.clientX-pos.lastX;pos.y+=event.clientY-pos.lastY;
   pos.lastX=event.clientX;pos.lastY=event.clientY;applyPan();
 };
 const stopPan=event=>{if(event.pointerId===pan.current.pointer)pan.current.pointer=null;};
 const stepPan=(x,y)=>{
   if(closing.current)return;
   const length=Math.max(32,Math.round(Math.min(image.current?.clientWidth||320,image.current?.clientHeight||320)*.19));
   pan.current.x+=x*length;pan.current.y+=y*length;applyPan();
 };
 const dirs=[
   [1,-1,0,"left","‹",["Влево","Sola","Left"]],
   [2,1,0,"right","›",["Вправо","Sağa","Right"]],
   [4,0,-1,"up","⌃",["Вверх","Yuxarı","Up"]],
   [8,0,1,"down","⌄",["Вниз","Aşağı","Down"]]
 ];
 const locale=language==="ru"?0:language==="az"?1:2;
 const closeLabel=language==="ru"?"Закрыть фото":language==="az"?"Şəkli bağla":"Close photo";
 return <dialog ref={ref} className="review-full-photo" aria-label={photo.label}
   onCancel={event=>{event.preventDefault();dismiss();}}
   onKeyDown={event=>{
     if(event.key==="Escape"){event.preventDefault();event.stopPropagation();dismiss();}
     if(event.key.startsWith("Arrow")){
       const dir=dirs.find(x=>x[3]===event.key.slice(5).toLowerCase());
       if(dir){event.preventDefault();event.stopPropagation();if(canMove&dir[0])stepPan(dir[1],dir[2]);}
     }
   }}>
  <img ref={image} src={photo.url} alt={photo.label} draggable={false} onLoad={applyPan}
    onPointerDown={beginPan} onPointerMove={movePan} onPointerUp={stopPan}
    onPointerCancel={stopPan} onLostPointerCapture={stopPan} />
  <button type="button" onClick={dismiss} aria-label={closeLabel}>×</button>
  <div className="review-photo-directions" role="group" aria-label={["Перемещение фото","Şəkli hərəkət etdir","Move photo"][locale]}>
    {dirs.map(([bit,x,y,key,icon,labels])=><button key={key} type="button" data-move={key} aria-disabled={!(canMove&bit)} aria-label={labels[locale]} onClick={()=>{if(canMove&bit)stepPan(x,y);}}>
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m9 5 7 7-7 7" /></svg>
    </button>)}
  </div>
 </dialog>;
}

export const menuDesignText={
  ru:{minus:"Уменьшить количество",plus:"Увеличить количество",title:"Настройки",view:"Вид меню",views:["Две колонки","Список","Крупные карточки"],color:"Цвет меню",colors:["Исходный","Светлый","Оливковый","Графит"],reset:"Сбросить",back:"Вернуться в меню"},
  az:{minus:"Sayı azalt",plus:"Sayı artır",title:"Ayarlar",view:"Menyunun görünüşü",views:["İki sütun","Siyahı","İri kartlar"],color:"Menyunun rəngi",colors:["İlkin","Açıq","Zeytun","Qrafit"],reset:"Sıfırla",back:"Menyuya qayıt"},
  en:{minus:"Decrease quantity",plus:"Increase quantity",title:"Settings",view:"Menu view",views:["Two columns","List","Large cards"],color:"Menu color",colors:["Original","Light","Olive","Graphite"],reset:"Reset",back:"Back to menu"}
};
const views=["grid","list","showcase"], colors=["original","paper","olive","graphite"];
function preference(key,allowed,fallback) {
  try {const saved=window.localStorage.getItem("rms-qr-guest-design-"+key);return allowed.includes(saved)?saved:fallback;}catch{return fallback;}
}
export function useApprovedMenuPrefs(enabled) {
  const [view,changeView]=useState(()=>enabled?preference("view-v2",views,preference("view",["list","showcase"],"showcase")):"showcase");
  const [color,changeColor]=useState(()=>enabled?preference("color",colors,"original"):"original");
  useLayoutEffect(()=>{
    if(!enabled)return;
    try {
      window.localStorage.setItem("rms-qr-guest-design-view-v2",view);
      window.localStorage.setItem("rms-qr-guest-design-color",color);
    }catch{}
  },[enabled,view,color]);
  return {view,color,setView:changeView,setColor:changeColor};
}
export function ApprovedMenuSettings({prefs,text,onBack}) {
  return <section className="narrow content review-settings" aria-labelledby="review-settings-title">
    <h2 id="review-settings-title">{text.title}</h2>
    <fieldset><legend>{text.view}</legend>{views.map((id,i)=><label key={id}><input type="radio" name="review-view" checked={prefs.view===id} onChange={()=>prefs.setView(id)} />{text.views[i]}</label>)}</fieldset>
    <fieldset><legend>{text.color}</legend>{colors.map((id,i)=><label key={id}><input type="radio" name="review-color" checked={prefs.color===id} onChange={()=>prefs.setColor(id)} /><i data-color={id} aria-hidden="true" />{text.colors[i]}</label>)}</fieldset>
    <button type="button" onClick={()=>{prefs.setView("showcase");prefs.setColor("original");}}>{text.reset}</button>
    <button type="button" onClick={onBack}>{text.back}</button>
  </section>;
}
