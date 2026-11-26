import React, {useEffect, useState} from "react";
import {supabase} from "./supabase";
import {tagCodes,tagLabels,isNewProduct} from "./qrMenuTags.mjs";

const text={
 ru:{heading:"Бирки блюд",item:"Позиция меню",choose:"Выберите позицию",automatic:"NEW добавляется автоматически для раздела «Новинки».",save:"Сохранить бирки",saved:"Бирки сохранены.",error:"Не удалось загрузить или сохранить бирки.",saving:"Сохраняю…"},
 az:{heading:"Yemək nişanları",item:"Menyu mövqeyi",choose:"Mövqe seçin",automatic:"NEW nişanı Yeni bölməsində avtomatik göstərilir.",save:"Nişanları saxla",saved:"Nişanlar saxlanıldı.",error:"Nişanları yükləmək və ya saxlamaq mümkün olmadı.",saving:"Saxlanılır…"},
 en:{heading:"Product tags",item:"Menu item",choose:"Choose an item",automatic:"NEW is added automatically for items in New.",save:"Save tags",saved:"Tags saved.",error:"Could not load or save tags.",saving:"Saving…"}
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
      }).catch(()=>{if(active)setStatus(t.error);});
    return ()=>{active=false;};
  },[branch,t]);
  const item=items.find(p=>String(p.id)===id);
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
    <label>{t.item}<select disabled={busy} value={id} onChange={e=>{const next=e.target.value;setId(next);setDraft(saved[next]||[]);setStatus("");}}>
      <option value="">{t.choose}</option>
      {items.map(p=><option key={p.id} value={p.id}>{p.snapshotCopy?.[language]?.name||p.name} · {p.categoryNames?.[language]||p.category}</option>)}
    </select></label>
    {item&&<><div className="qr-tag-admin-options">
      {Object.entries(tagLabels).map(([code,label])=><label key={code}><input type="checkbox" checked={code==="new"&&automatic||draft.includes(code)} disabled={busy||Boolean(code==="new"&&automatic)} onChange={e=>{const checked=e.target.checked;setDraft(current=>checked?tagCodes([...current,code]):current.filter(x=>x!==code));}}/> {label}</label>)}
    </div>
    {automatic&&<p className="hint">{t.automatic}</p>}
    <button type="button" className="small primary" onClick={save} disabled={busy}>{busy?t.saving:t.save}</button></>}
    <p aria-live="polite">{status}</p>
  </section>;
}
