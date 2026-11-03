import React from "react";

const openLabel = { ru: "Открыть блюдо", az: "Yeməyə bax", en: "View dish" };

// Reuse the menu's localized copy and price; never supply promotional claims.
export default function BC1SpecialOffer({ language, product, price, onOpen }) {
  if (!product) return null;
  const displayPrice = typeof product.price === "number" && Number.isFinite(product.price) && product.price >= 0 && typeof price === "string" && price.trim() ? price : "—";
  return <section className="bc1-special-offer" aria-label={product.name} style={{ backgroundImage: `url(${JSON.stringify(product.image)})` }}>
    <img src={product.image} alt="" />
    <div className="bc1-special-labels"><h3>{product.name}</h3>
      <strong className="bc1-special-price">{displayPrice}</strong>
    </div>
    <button className="bc1-special-offer-action" type="button" onClick={() => onOpen(product)} aria-label={`${openLabel[language] || openLabel.en}: ${product.name}`} />
  </section>;
}
