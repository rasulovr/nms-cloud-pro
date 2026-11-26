import React from "react";

const copy = {
  ru: { calories: "Калорийность", time: "Время приготовления", allergens: "Аллергены", spicy: "Острое", vegan: "Веганское", unknown: "Не указано", yes: "Да", no: "Нет", kcal: "ккал", minutes: "мин" },
  az: { calories: "Kalori", time: "Hazırlanma vaxtı", allergens: "Allergenlər", spicy: "Acılı", vegan: "Veqan", unknown: "Məlumat yoxdur", yes: "Bəli", no: "Xeyr", kcal: "kkal", minutes: "dəq" },
  en: { calories: "Calories", time: "Preparation time", allergens: "Allergens", spicy: "Spicy", vegan: "Vegan", unknown: "Not specified", yes: "Yes", no: "No", kcal: "kcal", minutes: "min" }
};

// Values are explicit editorial inputs. Missing local data stays unspecified.
export default function BC1ProductFacts({ language, facts = {}, compact = false }) {
  const t = copy[language] || copy.en;
  const quantity = (value, unit) => typeof value === "number" && Number.isFinite(value) && value >= 0 ? `${value} ${unit}` : t.unknown;
  const energy = facts.approximate && Number.isFinite(facts.calories) ? '≈ '+quantity(facts.calories,t.kcal) : quantity(facts.calories,t.kcal);
  const minutes = Array.isArray(facts.preparationMinutes) ? facts.preparationMinutes.join('–')+' '+t.minutes+(compact&&language==='az'?'.':'') : quantity(facts.preparationMinutes,t.minutes);
  const flag = (value) => typeof value === "boolean" ? (value ? t.yes : t.no) : t.unknown;
  const allergens = Array.isArray(facts.allergens) && facts.allergens.length > 0 && facts.allergens.every((item) => typeof item === "string" && item.trim()) ? facts.allergens.join(", ") : t.unknown;
  return <dl className="bc1-detail-facts">
    <div><dt>{t.calories}</dt><dd>{energy}</dd></div>
    <div><dt>{t.time}</dt><dd>{minutes}</dd></div>
    <div className="bc1-detail-allergens"><dt>{t.allergens}</dt><dd style={compact?{fontWeight:400}:undefined}>{allergens}</dd></div>
    {!compact && <><div><dt>{t.spicy}</dt><dd>{flag(facts.spicy)}</dd></div>
    <div><dt>{t.vegan}</dt><dd>{flag(facts.vegan)}</dd></div></>}
  </dl>;
}
