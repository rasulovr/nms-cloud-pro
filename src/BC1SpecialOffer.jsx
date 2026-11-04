import React, { useId, useState, useRef } from "react";
import {useOfferPaging} from "./bc1OfferPaging";
const labels = {
  ru: { open: "Посмотреть блюда", separate: "По одной каждой позиции", add: "Добавить сет", close: "Свернуть" },
  az: { open: "Yeməklərə bax", separate: "Hər məhsuldan bir ədəd", add: "Seti əlavə et", close: "Bağla" },
  en: { open: "View items", separate: "One of each item", add: "Add set", close: "Collapse" },
};
const defaultImage = "/menu/bc1-williams-cinematic.svg";
function OfferCard({ image = defaultImage, language, products = [], formatPrice, onOpen, onAdd, addDisabled = false }) {
  const [expanded, setExpanded] = useState(false);
  const detailsId = useId();
  if (![1,2].includes(products.length)) return null;
  const single = products.length === 1;
  const t = labels[language] || labels.en;
  const total = products.reduce((sum, product) => sum + product.price, 0);
  const title = products.map(product => product.name).join(" + ");
  return <>
    <section className={`bc1-special-offer${single ? " bc1-single-offer" : ""}`} aria-label={title} style={{ backgroundImage: `url(${JSON.stringify(image)})` }}>
      <img src={image} alt="" />
      <div className="bc1-special-labels">
        <h3>{products[0].name}</h3>
        {!single && <p className="bc1-special-subtitle">{products[1].name}</p>}
        <strong className="bc1-special-price">{formatPrice(total)}</strong>
      </div>
      <button className="bc1-special-offer-action" type="button" onClick={() => single ? onOpen(products[0]) : setExpanded(value => !value)} aria-expanded={single ? undefined : expanded} aria-controls={single ? undefined : detailsId} aria-label={`${t.open}: ${title}`} />
    </section>
    {!single && <section className="bc1-offer-components" id={detailsId} hidden={!expanded} aria-label={t.open}>
      <p>{t.separate}</p>
      {products.map(product => <button key={product.id} type="button" onClick={() => onOpen(product)}>
        <span>{product.name}</span>
        <strong>{typeof product.price === "number" && Number.isFinite(product.price) && product.price >= 0 ? formatPrice(product.price) : "—"}</strong>
      </button>)}
      <button className="bc1-add-set" type="button" disabled={addDisabled} onClick={onAdd}>{t.add} · {formatPrice(total)}</button>
      <button type="button" onClick={() => setExpanded(false)}>{t.close}</button>
    </section>}
  </>;
}

// Every offer carries its actual products and actions; no synthetic fallback.
export default function BC1SpecialOffer({ offers, ...props }) {
  const host=useRef(null);
  useOfferPaging(host, offers?.length ?? 1);
  const entries = offers || [{ id: "williams-pineapple", ...props }];
  const visible = entries.filter(offer => [1,2].includes(offer.products?.length));
  if (!visible.length) return null;
  const name = { ru: "Специальные предложения", az: "Xüsusi təkliflər", en: "Special offers" };
  return <div ref={host} className="bc1-paged-offers"><div className="bc1-offer-strip" role="region" aria-label={name[props.language] || name.en} tabIndex={0}
    onKeyDown={event => {
      if (event.target !== event.currentTarget || !["ArrowLeft", "ArrowRight"].includes(event.key)) return;
      event.preventDefault();
      event.currentTarget.scrollBy({ left: (event.key === "ArrowRight" ? 1 : -1) * event.currentTarget.clientWidth, behavior: "smooth" });
    }}>
    {visible.map(offer => <div className="bc1-offer-slide" key={offer.id}>
      <div className="bc1-page-inner"><OfferCard {...props} {...offer} /></div>
    </div>)}
  </div></div>;
}
