import React from "react";

const copy = {
  ru: { calories: "Калорийность", time: "Время приготовления", allergens: "Аллергены", spicy: "Острое", vegan: "Веганское", unknown: "Не указано", yes: "Да", no: "Нет", kcal: "ккал", minutes: "мин" },
  az: { calories: "Kalori", time: "Hazırlanma vaxtı", allergens: "Allergenlər", spicy: "Acılı", vegan: "Veqan", unknown: "Məlumat yoxdur", yes: "Bəli", no: "Xeyr", kcal: "kkal", minutes: "dəq" },
  en: { calories: "Calories", time: "Preparation time", allergens: "Allergens", spicy: "Spicy", vegan: "Vegan", unknown: "Not specified", yes: "Yes", no: "No", kcal: "kcal", minutes: "min" }
};

// Presentation-only inputs. The current public-menu RPC supplies none of these
// facts, so QRMenu intentionally passes no values. Do not derive them from copy.
export default function BC1ProductFacts({ language, facts = {} }) {
  const t = copy[language] || copy.en;
  const quantity = (value, unit) => typeof value === "number" && Number.isFinite(value) && value >= 0 ? `${value} ${unit}` : t.unknown;
  const flag = (value) => typeof value === "boolean" ? (value ? t.yes : t.no) : t.unknown;
  const allergens = Array.isArray(facts.allergens) && facts.allergens.length > 0 && facts.allergens.every((item) => typeof item === "string" && item.trim()) ? facts.allergens.join(", ") : t.unknown;
  return <dl className="bc1-detail-facts">
    <div><dt>{t.calories}</dt><dd>{quantity(facts.calories, t.kcal)}</dd></div>
    <div><dt>{t.time}</dt><dd>{quantity(facts.preparationMinutes, t.minutes)}</dd></div>
    <div className="bc1-detail-allergens"><dt>{t.allergens}</dt><dd>{allergens}</dd></div>
    <div><dt>{t.spicy}</dt><dd>{flag(facts.spicy)}</dd></div>
    <div><dt>{t.vegan}</dt><dd>{flag(facts.vegan)}</dd></div>
  </dl>;
}
