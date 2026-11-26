import React, {useEffect, useMemo, useState} from "react";
import {supabase} from "./supabase";
import {tagCodes,tagLabels,isNewProduct,tagsForProduct} from "./qrMenuTags.mjs";

const text={
 ru:{heading:"Бирки блюд",item:"Позиция меню",choose:"Выберите позицию",automatic:"NEW добавляется автоматически для раздела «Новинки».",save:"Сохранить бирки",saved:"Бирки сохранены.",error:"Не удалось загрузить или сохранить бирки.",saving:"Сохраняю…"},
 az:{heading:"Yemək nişanları",item:"Menyu mövqeyi",choose:"Mövqe seçin",automatic:"NEW nişanı Yeni bölməsində avtomatik göstərilir.",save:"Nişanları saxla",saved:"Nişanlar saxlanıldı.",error:"Nişanları yükləmək və ya saxlamaq mümkün olmadı.",saving:"Saxlanılır…"},
 en:{heading:"Product tags",item:"Menu item",choose:"Choose an item",automatic:"NEW is added automatically for items in New.",save:"Save tags",saved:"Tags saved.",error:"Could not load or save tags.",saving:"Saving…"}
};
const controls = {
  ru: {search:"Найти блюдо", edit:"Бирки", cancel:"Закрыть", more:"Показать ещё", noItems:"Ничего не найдено", loading:"Загружаю позиции…"},
  az: {search:"Yemək axtar", edit:"Nişanlar", cancel:"Bağla", more:"Daha çox göstər", noItems:"Heç nə tapılmadı", loading:"Mövqelər yüklənir…"},
  en: {search:"Find a dish", edit:"Tags", cancel:"Close", more:"Show more", noItems:"No items found", loading:"Loading items…"}
};
const table="rms_qr_product_tags";
function projectedMenu(branch) {
  if (branch==="BC4") return Promise.all([import("./bc4MenuProjection.mjs"),import("./bc4InPlaceCatalogue.json")]).then(([m,c])=>m.projectBC4(c.default));
  if (branch==="BC5") return Promise.all([import("./bc5MenuProjection.mjs"),import("./bc5InPlaceCatalogue.json")]).then(([m,c])=>m.projectBC5(c.default));
  return supabase.rpc("qr_get_public_menu",{p_branch_code:branch}).then(({data,error})=>{
    if(error)throw error;
    return (data||[]).map(p=>({id:p.id||p.menu_item_id,name:p.name||p.product_name||p.title,category:p.category_name||p.category})).filter(p=>p.id&&p.name);
  });
}
export default function QRProductTagAdmin({branch, language}) {
  const t=text[language]||text.ru;
  const ui=controls[language]||controls.ru;
  const [query,setQuery]=useState(""),[limit,setLimit]=useState(24),[loadState,setLoadState]=useState("loading");
  const [items,setItems]=useState([]),[saved,setSaved]=useState({}),[id,setId]=useState("");
  const [draft,setDraft]=useState([]),[status,setStatus]=useState(""),[busy,setBusy]=useState(false);
  useEffect(()=>{
    let active=true;
    Promise.all([projectedMenu(branch),supabase.from(table).select("product_key,tag_codes").eq("branch_code",branch)])
      .then(([rows,result])=>{
        if(!active)return;
        if(result.error)throw result.error;
        setItems(rows);
        setSaved(Object.fromEntries((result.data||[]).map(r=>[r.product_key, tagCodes(r.tag_codes)])));
        setLoadState("ready");
      }).catch(()=>{if(active)setLoadState("error");});
    return ()=>{active=false;};
  },[branch,t]);
  const nameOf=p=>p.snapshotCopy?.[language]?.name||p.name;
  const categoryOf=p=>p.categoryNames?.[language]||p.category;
  const matching=useMemo(()=>{
    const needle=query.trim().toLocaleLowerCase(language);
    return needle ? items.filter(p=>[p.name,p.category,p.snapshotCopy?.[language]?.name,p.categoryNames?.[language]].some(value=>String(value||"").toLocaleLowerCase(language).includes(needle))) : items;
  },[items,query,language]);
  const item=items.find(p=>String(p.id)===id);
  function pick(p) {
    const next=String(p.id);
    setId(next);setDraft(saved[next]||[]);setStatus("");
  }
  const automatic=item&&isNewProduct(item);
  async function save(){
    if(!item||busy)return;
    setBusy(true);setStatus("");
    try{
      const row={branch_code:branch,product_key:id,tag_codes:tagCodes(draft)};
      const {data,error}=await supabase.from(table).upsert(row,{onConflict:"branch_code,product_key"}).select("tag_codes").single();
      if(error||!data)throw error||Error("Unconfirmed write");
      setSaved(current=>({...current,[id]:tagCodes(data.tag_codes)}));setStatus(t.saved);
    }catch{setStatus(t.error);}finally{setBusy(false);}
  }
  return <section className="card span-2 qr-tag-admin">
    <h3>{t.heading}</h3>
    {loadState==="loading" && <p role="status">{ui.loading}</p>}
    {loadState==="error" && <p role="alert">{t.error}</p>}
    {loadState==="ready" && <>
      <label>{ui.search}<input type="search" value={query} disabled={busy} onChange={e=>{setQuery(e.target.value);setLimit(24);}}/></label>
      <div role="list" aria-label={t.item} style={{marginTop:12,display:"grid",gap:8}}>
        {matching.slice(0,limit).map(p=>{
          const key=String(p.id), tags=tagsForProduct(p,saved[key]), selected=id===key;
          return <div role="listitem" key={key} style={{border:"1px solid var(--border,#e2ddd7)",borderRadius:10,padding:10}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:10}}>
              <div><strong>{nameOf(p)}</strong><br/><small>{categoryOf(p)}{tags.length ? " · "+tags.map(code=>tagLabels[code]).join(" · ") : ""}</small></div>
              <button type="button" className="small" disabled={busy} aria-expanded={selected} aria-label={ui.edit+": "+nameOf(p)} onClick={()=>selected?(setId(""),setStatus("")):pick(p)}>{ui.edit}</button>
            </div>
            {selected&&<div>
              <div className="qr-tag-admin-options">
                {Object.entries(tagLabels).map(([code,label])=><label key={code}><input type="checkbox" checked={Boolean(code==="new"&&automatic)||draft.includes(code)} disabled={busy||Boolean(code==="new"&&automatic)} onChange={e=>{const checked=e.target.checked;setDraft(current=>checked?tagCodes([...current,code]):current.filter(x=>x!==code));}}/> {label}</label>)}
              </div>
              {automatic&&<p className="hint">{t.automatic}</p>}
              <button type="button" className="small primary" onClick={save} disabled={busy}>{busy?t.saving:t.save}</button>{" "}
              <button type="button" className="small" disabled={busy} onClick={()=>{setId("");setStatus("");}}>{ui.cancel}</button>
              <p aria-live="polite">{status}</p>
            </div>}
          </div>;
        })}
        {!matching.length && <p>{ui.noItems}</p>}
      </div>
      {matching.length>limit&&<button type="button" className="small" style={{marginTop:10}} onClick={()=>setLimit(n=>n+24)}>{ui.more}</button>}
    </>}
  </section>;
}
