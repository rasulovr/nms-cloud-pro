import React from "react";

const copy = {
  ru: { title: "Спецпредложение", note: "Блюдо из меню · обычная цена", open: "Открыть блюдо" },
  az: { title: "Xüsusi təklif", note: "Menyudan seçim · adi qiymət", open: "Yeməyə bax" },
  en: { title: "Special offer", note: "From our menu · regular price", open: "View dish" }
};

// Feature only an available item from the loaded menu, without inventing an offer.
export default function BC1SpecialOffer({ language, product, price, onOpen }) {
  const t = copy[language] || copy.en;
  if (!product) return null;
  return <section className="bc1-special-offer" aria-label={t.title}>
    <img src={product.image} alt="" />
    <div><h2>{t.title}</h2><h3>{product.name}</h3>
      {product.description && <p>{product.description}</p>}
      <strong className="bc1-special-price">{price}</strong><p>{t.note}</p>
    </div>
    <button className="bc1-special-offer-action" type="button" onClick={() => onOpen(product)} aria-label={`${t.open}: ${product.name}`} />
  </section>;
}
