import React, { useId, useState } from "react";
const labels = {
  ru: { open: "Посмотреть блюда", separate: "По одной каждой позиции", add: "Добавить сет", close: "Свернуть" },
  az: { open: "Yeməklərə bax", separate: "Hər məhsuldan bir ədəd", add: "Seti əlavə et", close: "Bağla" },
  en: { open: "View items", separate: "One of each item", add: "Add set", close: "Collapse" },
};
const image = "/menu/bc1-williams-pineapple-offer.webp";
export default function BC1SpecialOffer({ language, products = [], formatPrice, onOpen, onAdd, addDisabled = false }) {
  const [expanded, setExpanded] = useState(false);
  const detailsId = useId();
  if (products.length !== 2) return null;
  const t = labels[language] || labels.en;
  const total = products.reduce((sum, product) => sum + product.price, 0);
  const title = products.map(product => product.name).join(" + ");
  return <>
    <section className="bc1-special-offer" aria-label={title} style={{ backgroundImage: `url(${JSON.stringify(image)})` }}>
      <img src={image} alt="" />
      <div className="bc1-special-labels"><h3>{title}</h3><strong className="bc1-special-price">{formatPrice(total)}</strong></div>
      <button className="bc1-special-offer-action" type="button" onClick={() => setExpanded(value => !value)} aria-expanded={expanded} aria-controls={detailsId} aria-label={`${t.open}: ${title}`} />
    </section>
    <section className="bc1-offer-components" id={detailsId} hidden={!expanded} aria-label={t.open}>
      <p>{t.separate}</p>
      {products.map(product => <button key={product.id} type="button" onClick={() => onOpen(product)}>
        <span>{product.name}</span>
        <strong>{typeof product.price === "number" && Number.isFinite(product.price) && product.price >= 0 ? formatPrice(product.price) : "—"}</strong>
      </button>)}
      <button className="bc1-add-set" type="button" disabled={addDisabled} onClick={onAdd}>{t.add} · {formatPrice(total)}</button>
      <button type="button" onClick={() => setExpanded(false)}>{t.close}</button>
    </section>
  </>;
}
