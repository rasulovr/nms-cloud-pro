import React from "react";

const copy = {
  ru: { title: "Спецпредложение", note: "Макет блока. Действующее предложение не подтверждено." },
  az: { title: "Xüsusi təklif", note: "Blokun maketi. Aktiv təklif təsdiqlənməyib." },
  en: { title: "Special offer", note: "Preview block. No active offer has been confirmed." }
};

// A clearly labeled layout preview, not a claim that a promotion is available.
export default function BC1SpecialOffer({ language }) {
  const t = copy[language] || copy.en;
  return <section className="bc1-special-offer" aria-label={t.title}>
    <img src="/menu/generated/special-coffee.webp" alt="" />
    <div><h2>{t.title}</h2><p>{t.note}</p></div>
  </section>;
}
