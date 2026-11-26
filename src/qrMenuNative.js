import { formatMenuDescription, resolveReferenceMenuProduct } from "./referenceMenuCatalog";
import { resolveRecoveredMenuImage } from "./recoveredMenuImages";
export const branchMenuConfigTable = "__QR_BRANCH_MENU_V1__";
export const normalizeCategoryKey = (value) => {
  const key = String(value || "").trim().toLocaleUpperCase("ru-RU").replace(/Ё/g, "Е");
  const aliases = {
    "ЗАВТРАК": "ЗАВТРАК", "ЗАВТРАКИ": "ЗАВТРАК", "BREAKFAST": "ЗАВТРАК", "SƏHƏR YEMƏYİ": "ЗАВТРАК", "SƏHƏR YEMƏKLƏRİ": "ЗАВТРАК",
    "КОФЕ": "КОФЕ", "COFFEE": "КОФЕ", "QƏHVƏ": "КОФЕ",
    "САЛАТ": "САЛАТЫ", "САЛАТЫ": "САЛАТЫ", "SALAD": "САЛАТЫ", "SALADS": "САЛАТЫ", "SALATLAR": "САЛАТЫ",
    "ЗАКУСКИ": "ЗАКУСКИ", "ЗАКУСКА": "ЗАКУСКИ", "STARTERS": "ЗАКУСКИ", "STARTER": "ЗАКУСКИ", "QƏLYANALTILAR": "ЗАКУСКИ",
    "ГОРЯЧИЕ БЛЮДА": "ГОРЯЧИЕ БЛЮДА", "ОСНОВНЫЕ БЛЮДА": "ГОРЯЧИЕ БЛЮДА", "MAIN DISHES": "ГОРЯЧИЕ БЛЮДА", "İSTİ YEMƏKLƏR": "ГОРЯЧИЕ БЛЮДА",
    "БУРГЕРЫ": "БУРГЕРЫ", "БУРГЕР": "БУРГЕРЫ", "BURGERS": "БУРГЕРЫ", "BURGER": "БУРГЕРЫ",
    "СЭНДВИЧИ": "СЭНДВИЧИ", "СЕНДВИЧИ": "СЭНДВИЧИ", "SANDWICHES": "СЭНДВИЧИ", "SANDWICH": "СЭНДВИЧИ", "SENDVİÇLƏR": "СЭНДВИЧИ",
    "ПИЦЦА": "ПИЦЦА", "PIZZA": "ПИЦЦА",
    "СУПЫ": "СУПЫ", "SOUPS": "СУПЫ", "ŞORBALAR": "СУПЫ",
    "ЛИМОНАДЫ": "ЛИМОНАДЫ", "LEMONADES": "ЛИМОНАДЫ", "LİMONADLAR": "ЛИМОНАДЫ",
    "ХОЛОДНЫЕ НАПИТКИ": "ХОЛОДНЫЕ НАПИТКИ", "COLD DRINKS": "ХОЛОДНЫЕ НАПИТКИ", "SOYUQ İÇKİLƏR": "ХОЛОДНЫЕ НАПИТКИ",
    "ХОЛОДНЫЙ КОФЕ": "ХОЛОДНЫЙ КОФЕ", "ICED COFFEE": "ХОЛОДНЫЙ КОФЕ", "COLD COFFEE": "ХОЛОДНЫЙ КОФЕ", "SOYUQ QƏHVƏ": "ХОЛОДНЫЙ КОФЕ", "BUZLU QƏHVƏ": "ХОЛОДНЫЙ КОФЕ",
    "ЧАЙ": "ЧАЙ", "TEA": "ЧАЙ", "ÇAY": "ЧАЙ",
    "ДЕСЕРТЫ": "ДЕСЕРТЫ", "DESSERTS": "ДЕСЕРТЫ", "DESERTLƏR": "ДЕСЕРТЫ", "ŞİRNİYYATLAR": "ДЕСЕРТЫ",
    "ВИНО": "ВИНО", "WINES": "ВИНО", "WINE": "ВИНО", "ŞƏRAB": "ВИНО"
  };
  return aliases[key] || key;
};
const productionProductOverrides = {
  "Сырники": { image: "/menu/bc-003-syrniki-full.webp" },
  "Копчёная Утка и Крем-Чиз": { image: "/menu/bc-004-duck-full.webp" },
  "Пицца «Чикен Фунги»": { image: "/menu/chicken-funghi-full.webp" },
  "Грибы": { image: "/menu/extra-mushrooms.webp" },
  "Сыр": { image: "/menu/extra-cheese.webp" },
  "Бекон": { image: "/menu/extra-bacon.webp" },
  "Соусы": { image: "/menu/extra-sauces.webp" },
  "Фрукты": { image: "/menu/extra-fruits.webp" },
  "Эспрессо-Тоник": { image: "/menu/bc-068-espresso-tonic-full.webp" },
  "Bumble Bee": { image: "/menu/bc-069-bumble-bee-full.webp" },
  "Аффогато": { image: "/menu/bc-070-affogato-full.webp" },
  "Caramelita": { image: "/menu/bc-071-caramelita-full.webp" },
  "Холодный Раф": { image: "/menu/bc-072-cold-raf-full.webp" },
  "Холодный Американо": { image: "/menu/bc-073-cold-americano-full.webp" },
  "Холодный Латте": { image: "/menu/bc-074-cold-latte-full.webp" },
  "Персик Фиалка": { image: "/menu/bc-075-peach-violet.webp" },
  "Ананас Розмарин": { image: "/menu/bc-076-pineapple-rosemary.webp" },
  "Маракуйя Сумах": { image: "/menu/bc-077-passionfruit-sumac.webp" },
  "Алоэ Пряный Гранат": { image: "/menu/bc-078-aloe-pomegranate.webp" },
  "Киви Бум": { image: "/menu/bc-079-kiwi-boom.webp" },
  "Куркума Имбирь": { image: "/menu/bc-080-turmeric-ginger.webp" },
  "Клубничный Рай": { image: "/menu/bc-081-strawberry-paradise.webp" },
  "Юдзу-Лимонад": { image: "/menu/bc-082-yuzu.webp" },
  "Summer Vibes": { image: "/menu/bc-083-summer-vibes.webp" },
  "Tropical Vibes": { image: "/menu/bc-084-tropical-vibes.webp" },
  "Yoda's Love": { image: "/menu/bc-085-yodas-love.webp" },
  "Special Tea": { image: "/menu/bc-086-tea-tubes.webp" },
  "Вода": { name: "Вода Sirab", image: "/menu/bc-087-water-full.webp" },
  "Вода Sirab": { image: "/menu/bc-087-water-full.webp" },
  "Газированная Вода": { image: "/menu/cold-sparkling-full.webp" },
  "Соки": { image: "/menu/bc-089-juices-full.webp" },
  "Кола": { image: "/menu/cold-cola-full.webp" },
  "Кола Зеро": { image: "/menu/cold-cola-zero-full.webp" },
  "Фанта": { image: "/menu/cold-fanta-full.webp" },
  "Спрайт": { image: "/menu/cold-sprite-full.webp" },
  "Тоник": { image: "/menu/cold-tonic-full.webp" },
  "Энергетические Напитки": {
    name: "Red Bull",
    image: "/menu/bc-095-redbull-full.webp",
    options: ["Red Bull - 6.00 ₼", "Red Bull Sugar Free - 6.00 ₼", "Red Bull Tropical - 6.00 ₼", "Red Bull Watermelon - 6.00 ₼", "Red Bull Cherry and Forest Fruits - 6.00 ₼"]
  },
  "Red Bull": { image: "/menu/bc-095-redbull-full.webp" }
};
export const normalizeProduct = (item, branch) => {
  const menuOverride = item.__qr_override && typeof item.__qr_override === "object" ? item.__qr_override : null;
  const customTranslations = menuOverride?.translations && typeof menuOverride.translations === "object" ? menuOverride.translations : item.translations;
  const customRu = customTranslations?.ru || {};
  const sourceName = customRu.name || menuOverride?.name || item.name || "";
  // A branch-level QR override is intentional guest-facing copy. In that case
  // do not replace it with the shared migration/reference catalogue.
  const preserveReferenceCopy = branch === "BC1" || Boolean(menuOverride);
  const reference = preserveReferenceCopy ? null : resolveReferenceMenuProduct(item);
  const referenceName = reference?.translations?.ru?.name || sourceName;
  const override = productionProductOverrides[referenceName] || productionProductOverrides[sourceName] || {};
  const sourceDescription = formatMenuDescription(
    customRu.description || menuOverride?.description || reference?.translations?.ru?.description || item.description || ""
  );
  const sourceOptions = menuOverride?.options || override.options || (Array.isArray(item.options) ? item.options : []);
  return {
    ...item,
    ...(menuOverride || {}),
    id: item.id || item.menu_item_id,
    translationKey: referenceName,
    sourceName: customRu.name || override.name || referenceName,
    sourceDescription,
    preserveReferenceCopy,
    sourceOptions,
    translations: customTranslations,
    name: customRu.name || override.name || referenceName,
    description: sourceDescription,
    category: normalizeCategoryKey(menuOverride?.category || reference?.translations?.ru?.category || item.category_name || item.category || "Без категории"),
    price: Number(menuOverride?.price ?? item.price ?? item.unit_price ?? (item.line_total && item.quantity ? Number(item.line_total) / Number(item.quantity) : 0)),
    image: menuOverride?.image_url || menuOverride?.image || override.image || resolveRecoveredMenuImage(reference?.image || item.image_url || item.image),
    options: sourceOptions,
    rating: Number(item.rating || 0),
    branches: [branch]
  };
};
export function prepareNativeQrRows(menuRows, branchMenuConfig, live) {
  const branchMenuIds = Array.isArray(branchMenuConfig?.ids) ? branchMenuConfig.ids.map(String) : null;
  const menuIds = new Set(menuRows.map((item) => String(item.id || item.menu_item_id)));
  const matchingConfiguredIds = branchMenuIds ? branchMenuIds.filter((id) => menuIds.has(id)) : [];
  // Legacy BC5 configuration was saved with BC1 item IDs. Never let an
  // incompatible configuration hide a working branch menu: apply a filter
  // only when it has at least one ID from the actual branch menu.
  if (matchingConfiguredIds.length > 0) {
    const enabledIds = new Set(matchingConfiguredIds);
    menuRows = menuRows.filter((item) => enabledIds.has(String(item.id || item.menu_item_id)) || live?.items?.[item.id || item.menu_item_id]?.kind==="new");
  }
  const menuOverrides = branchMenuConfig?.overrides && typeof branchMenuConfig.overrides === "object" ? branchMenuConfig.overrides : {};
  menuRows = menuRows.map((item) => ({
    ...item,
    __qr_override: menuOverrides[String(item.id || item.menu_item_id)] || null
  }));
  return menuRows;
}
