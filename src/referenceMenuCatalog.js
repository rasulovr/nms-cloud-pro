import cloposLocales from "../data/clopos-locales.json";

export const normalizeReferenceText = (value) => String(value || "")
  .toLocaleLowerCase("ru-RU")
  .replace(/[«»“”'’`]/g, "")
  .replace(/[—–-]/g, " ")
  .replace(/\s+/g, " ")
  .trim();

export const formatMenuDescription = (value) => {
  const description = String(value || "").trim();
  if (!description) return "";
  const firstLetter = description.search(/\p{L}/u);
  if (firstLetter < 0) return description;
  return `${description.slice(0, firstLetter)}${description[firstLetter].toLocaleUpperCase("ru-RU")}${description.slice(firstLetter + 1)}`;
};

// POS categories frequently arrive in upper case or with arbitrary casing.
// Keep product copy intact, but present category labels as one readable sentence.
export const formatMenuCategory = (value, locale = "ru-RU") => {
  const category = String(value || "").trim();
  if (!category) return "";
  const firstLetter = category.search(/\p{L}/u);
  if (firstLetter < 0) return category;
  const normalized = category.toLocaleLowerCase(locale);
  return `${normalized.slice(0, firstLetter)}${normalized[firstLetter].toLocaleUpperCase(locale)}${normalized.slice(firstLetter + 1)}`;
};

const generatedImages = {
  "Экстра Соус": "/menu/generated/extra-sauce.webp",
  "Сироп": "/menu/generated/syrup.webp",
  "Молоко": "/menu/generated/milk.webp",
  "Взбитые Сливки": "/menu/generated/whipped-cream.webp",
  "Special Coffee": "/menu/generated/special-coffee.webp"
};

const languages = ["ru", "az", "en"];
const rowCount = Math.max(...languages.map((language) => cloposLocales[language]?.length || 0));

export const referenceMenuProducts = Array.from({ length: rowCount }, (_, index) => {
  const rows = Object.fromEntries(languages.map((language) => [language, cloposLocales[language]?.[index] || {}]));
  const ruName = rows.ru.name || rows.az.name || rows.en.name || "";
  const translations = Object.fromEntries(languages.map((language) => [language, {
    name: rows[language].name || ruName,
    description: formatMenuDescription(rows[language].description),
    category: rows[language].category || rows.ru.category || ""
  }]));
  return {
    index,
    ruName,
    translations,
    price: rows.ru.price || rows.az.price || rows.en.price || "",
    image: rows.ru.image || rows.az.image || rows.en.image || generatedImages[ruName] || null
  };
}).filter((entry) => entry.ruName);

const referenceProductByAnyName = referenceMenuProducts.reduce((index, product) => {
  [product.ruName, ...languages.map((language) => product.translations[language]?.name)]
    .filter(Boolean)
    .forEach((name) => index.set(normalizeReferenceText(name), product));
  return index;
}, new Map());

const referenceCategoryByAnyName = referenceMenuProducts.reduce((index, product) => {
  const categories = Object.fromEntries(languages.map((language) => [language, product.translations[language]?.category || ""]));
  languages.map((language) => categories[language]).filter(Boolean).forEach((name) => {
    if (!index.has(normalizeReferenceText(name))) index.set(normalizeReferenceText(name), categories);
  });
  return index;
}, new Map());

export function resolveReferenceMenuProduct(productOrName) {
  const product = typeof productOrName === "string" ? { name: productOrName } : (productOrName || {});
  const candidates = [product.translationKey, product.sourceName, product.name, product.ru_name, product.name_ru, product.az_name, product.name_az, product.en_name, product.name_en];
  for (const candidate of candidates) {
    const match = referenceProductByAnyName.get(normalizeReferenceText(candidate));
    if (match) return match;
  }
  return null;
}

export function resolveReferenceCategory(category, language) {
  return referenceCategoryByAnyName.get(normalizeReferenceText(category))?.[language] || "";
}
