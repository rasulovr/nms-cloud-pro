import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "./supabase";
import { localizeProduct } from "./qrMenuTranslations";
import "./QRMenu.css";
const categoryOrder = {
  breakfast: ["Новинки", "ЗАВТРАК", "КОФЕ", "ЧАЙ", "ХОЛОДНЫЙ КОФЕ", "ДЕСЕРТЫ", "САЛАТЫ", "СУПЫ", "ГОРЯЧИЕ БЛЮДА", "ЗАКУСКИ", "ПИЦЦА", "ЛИМОНАДЫ", "ХОЛОДНЫЕ НАПИТКИ", "EKSTRA KITCHEN", "EKSTRA BAR"],
  lunch: ["Новинки", "СУПЫ", "САЛАТЫ", "ГОРЯЧИЕ БЛЮДА", "ЗАКУСКИ", "ПИЦЦА", "ЗАВТРАК", "ДЕСЕРТЫ", "КОФЕ", "ХОЛОДНЫЙ КОФЕ", "ЛИМОНАДЫ", "ЧАЙ", "ХОЛОДНЫЕ НАПИТКИ", "EKSTRA KITCHEN", "EKSTRA BAR"],
  dinner: ["Новинки", "ГОРЯЧИЕ БЛЮДА", "САЛАТЫ", "ЗАКУСКИ", "ПИЦЦА", "СУПЫ", "ДЕСЕРТЫ", "ЛИМОНАДЫ", "ХОЛОДНЫЕ НАПИТКИ", "КОФЕ", "ЧАЙ", "ХОЛОДНЫЙ КОФЕ", "ЗАВТРАК", "EKSTRA KITCHEN", "EKSTRA BAR"]
};
const productPriority = {
  breakfast: [/капучино.*круассан/i, /сырник/i, /шакшук/i, /омлет/i, /яичниц/i, /нью-йорк.*завтрак/i, /бейгл.*лосос/i, /гранол/i, /овсян.*каш/i],
  lunch: [/суп/i, /салат/i, /хумус/i, /боул/i, /сэндвич/i, /бургер/i, /пицц/i],
  dinner: [/стейк/i, /рибай/i, /копч.*утк/i, /утк/i, /meat lovers/i, /четыре сыра/i, /тоннат/i]
};
const getMealMoment = (hour) => hour >= 5 && hour < 11 ? "breakfast" : hour >= 11 && hour < 17 ? "lunch" : "dinner";
const productMomentRank = (product, moment) => {
  const haystack = `${product.name} ${product.description} ${product.category}`;
  const index = productPriority[moment].findIndex((pattern) => pattern.test(haystack));
  return index < 0 ? 999 : index;
};
const pairingCategories = {
  "\u0417\u0410\u0412\u0422\u0420\u0410\u041A": ["\u041A\u041E\u0424\u0415", "\u0425\u041E\u041B\u041E\u0414\u041D\u042B\u0419 \u041A\u041E\u0424\u0415", "\u041B\u0418\u041C\u041E\u041D\u0410\u0414\u042B"],
  "\u0417\u0410\u041A\u0423\u0421\u041A\u0418": ["\u041B\u0418\u041C\u041E\u041D\u0410\u0414\u042B", "\u0425\u041E\u041B\u041E\u0414\u041D\u042B\u0415 \u041D\u0410\u041F\u0418\u0422\u041A\u0418", "\u0421\u0410\u041B\u0410\u0422\u042B"],
  "\u0421\u0423\u041F\u042B": ["\u0417\u0410\u041A\u0423\u0421\u041A\u0418", "\u0427\u0410\u0419", "\u0421\u0410\u041B\u0410\u0422\u042B"],
  "\u0421\u0410\u041B\u0410\u0422\u042B": ["\u041B\u0418\u041C\u041E\u041D\u0410\u0414\u042B", "\u0425\u041E\u041B\u041E\u0414\u041D\u042B\u0419 \u041A\u041E\u0424\u0415", "\u0413\u041E\u0420\u042F\u0427\u0418\u0415 \u0411\u041B\u042E\u0414\u0410"],
  "\u0413\u041E\u0420\u042F\u0427\u0418\u0415 \u0411\u041B\u042E\u0414\u0410": ["\u041B\u0418\u041C\u041E\u041D\u0410\u0414\u042B", "\u0421\u0410\u041B\u0410\u0422\u042B", "\u0425\u041E\u041B\u041E\u0414\u041D\u042B\u0415 \u041D\u0410\u041F\u0418\u0422\u041A\u0418"],
  "\u041F\u0418\u0426\u0426\u0410": ["\u041B\u0418\u041C\u041E\u041D\u0410\u0414\u042B", "\u0421\u0410\u041B\u0410\u0422\u042B", "\u0425\u041E\u041B\u041E\u0414\u041D\u042B\u0415 \u041D\u0410\u041F\u0418\u0422\u041A\u0418"],
  "\u0414\u0415\u0421\u0415\u0420\u0422\u042B": ["\u041A\u041E\u0424\u0415", "\u0427\u0410\u0419", "\u0425\u041E\u041B\u041E\u0414\u041D\u042B\u0419 \u041A\u041E\u0424\u0415"],
  "\u041A\u041E\u0424\u0415": ["\u0414\u0415\u0421\u0415\u0420\u0422\u042B", "\u0417\u0410\u0412\u0422\u0420\u0410\u041A"],
  "\u0425\u041E\u041B\u041E\u0414\u041D\u042B\u0419 \u041A\u041E\u0424\u0415": ["\u0414\u0415\u0421\u0415\u0420\u0422\u042B", "\u0417\u0410\u0412\u0422\u0420\u0410\u041A"],
  "\u041B\u0418\u041C\u041E\u041D\u0410\u0414\u042B": ["\u0421\u0410\u041B\u0410\u0422\u042B", "\u0413\u041E\u0420\u042F\u0427\u0418\u0415 \u0411\u041B\u042E\u0414\u0410", "\u041F\u0418\u0426\u0426\u0410"],
  "\u0427\u0410\u0419": ["\u0414\u0415\u0421\u0415\u0420\u0422\u042B", "\u0417\u0410\u0412\u0422\u0420\u0410\u041A"],
  "\u0425\u041E\u041B\u041E\u0414\u041D\u042B\u0415 \u041D\u0410\u041F\u0418\u0422\u041A\u0418": ["\u0413\u041E\u0420\u042F\u0427\u0418\u0415 \u0411\u041B\u042E\u0414\u0410", "\u041F\u0418\u0426\u0426\u0410", "\u0421\u0410\u041B\u0410\u0422\u042B"],
  "\u041D\u043E\u0432\u0438\u043D\u043A\u0438": ["\u041A\u041E\u0424\u0415", "\u041B\u0418\u041C\u041E\u041D\u0410\u0414\u042B", "\u0421\u0410\u041B\u0410\u0422\u042B"]
};
const money = (value) => `${Number(value || 0).toFixed(2)} \u20BC`;
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
const categoryLabel = (value) => {
  if (value.toLocaleLowerCase("ru-RU") === "новинки") return "Новинки";
  const normalized = value.toLocaleLowerCase("ru-RU");
  return normalized.charAt(0).toLocaleUpperCase("ru-RU") + normalized.slice(1);
};
const categoryTranslations = {
  az: {
    "Все": "Hamısı", "Новинки": "Yeniliklər", "ЗАВТРАК": "Səhər yeməyi", "КОФЕ": "Qəhvə",
    "ЧАЙ": "Çay", "ХОЛОДНЫЙ КОФЕ": "Soyuq qəhvə", "ДЕСЕРТЫ": "Desertlər", "САЛАТЫ": "Salatlar",
    "СУПЫ": "Şorbalar", "ГОРЯЧИЕ БЛЮДА": "İsti yeməklər", "ЗАКУСКИ": "Qəlyanaltılar", "ПИЦЦА": "Pizza",
    "ЛИМОНАДЫ": "Limonadlar", "ХОЛОДНЫЕ НАПИТКИ": "Soyuq içkilər", "EKSTRA KITCHEN": "Əlavələr · Mətbəx",
    "EKSTRA BAR": "Əlavələr · Bar"
  },
  ru: {
    "Все": "Все", "Новинки": "Новинки", "ЗАВТРАК": "Завтрак", "КОФЕ": "Кофе", "ЧАЙ": "Чай",
    "ХОЛОДНЫЙ КОФЕ": "Холодный кофе", "ДЕСЕРТЫ": "Десерты", "САЛАТЫ": "Салаты", "СУПЫ": "Супы",
    "ГОРЯЧИЕ БЛЮДА": "Горячие блюда", "ЗАКУСКИ": "Закуски", "ПИЦЦА": "Пицца", "ЛИМОНАДЫ": "Лимонады",
    "ХОЛОДНЫЕ НАПИТКИ": "Холодные напитки", "EKSTRA KITCHEN": "Дополнения · Кухня", "EKSTRA BAR": "Дополнения · Бар"
  },
  en: {
    "Все": "All", "Новинки": "New", "ЗАВТРАК": "Breakfast", "КОФЕ": "Coffee", "ЧАЙ": "Tea",
    "ХОЛОДНЫЙ КОФЕ": "Cold coffee", "ДЕСЕРТЫ": "Desserts", "САЛАТЫ": "Salads", "СУПЫ": "Soups",
    "ГОРЯЧИЕ БЛЮДА": "Main dishes", "ЗАКУСКИ": "Starters", "ПИЦЦА": "Pizza", "ЛИМОНАДЫ": "Lemonades",
    "ХОЛОДНЫЕ НАПИТКИ": "Cold drinks", "EKSTRA KITCHEN": "Extras · Kitchen", "EKSTRA BAR": "Extras · Bar"
  }
};
const uiText = {
  az: {
    quote: "Günün sözü", menu: "Menyu", cart: "Səbət", bill: "Hesab", info: "Məlumat", soon: "tezliklə",
    soonMessage: "bölməsi tezliklə istifadəyə veriləcək", search: "Yemək axtar", feels: "Hiss olunur", wind: "Külək",
    table: "Masa", tableAction: "Menyudan birbaşa sifariş edin", yourTable: "SİZİN MASA",
    information: "Məlumat", hours: "İş saatları", schedule: "B.e.–Şənbə · 09:00–22:00", sunday: "Bazar günü · bağlıdır",
    wifi: "Wi‑Fi", password: "şifrə", branch: "Filial", social: "Sosial şəbəkələr", waiter: "Ofisiant çağır",
    tapWifi: "Şifrəni göstərmək üçün toxunun", wifiCopied: "",
    add: "Əlavə et", addToOrder: "Sifarişə əlavə et", added: "Əlavə edildi ✓", addedToOrder: "sifarişə əlavə edildi", unavailable: "MÜVƏQQƏTİ YOXDUR", zoom: "Böyüt",
    openPhoto: "Foto və təsviri aç", close: "Bağla", pairsEyebrow: "Uyğun seçimlər", pairsTitle: "Bununla birlikdə seçirlər",
    beforeSending: "Göndərməzdən əvvəl", yourOrder: "Sifarişiniz", emptyCart: "Səbət hələ boşdur",
    emptyCartText: "Menyudan məhsul əlavə edin — onlar burada görünəcək.", goToMenu: "Menyuya keç",
    total: "Cəmi", sendOrder: "Sifarişi göndər", sending: "Göndərilir…", items: "məhsul",
    scanTable: "Sifariş üçün masanızdakı QR-kodu skan edin", stoppedNotice: "Məhsul stop-listdədir",
    breakfastChoice: "Səhər seçimi", breakfastNote: "Günə yüngül başlanğıc", lunchChoice: "Nahar seçimi",
    lunchNote: "Günün fasiləsi üçün uyğundur", dinnerChoice: "Axşam seçimi", dinnerNote: "Axşam üçün daha dolğun dad",
    quoteLines: ["Günün dadı olmalıdır.", "Yaxşı qəhvə günün ritmini yaradır.", "Sevdiyiniz dadlar günü gözəlləşdirir.", "Dad əhvaldan başlayır."]
  },
  ru: {
    quote: "Цитата дня", menu: "Меню", cart: "Корзина", bill: "Счёт", info: "Инфо", soon: "скоро",
    soonMessage: "будет доступен в скором времени", search: "Поиск блюд", feels: "Ощущается", wind: "Ветер",
    table: "Стол", tableAction: "Закажите прямо из меню", yourTable: "ВАШ СТОЛ",
    information: "Информация", hours: "Время работы", schedule: "Пн–Сб · 09:00–22:00", sunday: "Воскресенье · закрыто",
    wifi: "Wi‑Fi", password: "пароль", branch: "Филиал", social: "Социальные сети", waiter: "Вызвать официанта",
    tapWifi: "Нажмите, чтобы показать пароль", wifiCopied: "",
    add: "Добавить", addToOrder: "Добавить в заказ", added: "Добавлено ✓", addedToOrder: "добавлено в заказ", unavailable: "ВРЕМЕННО НЕТ", zoom: "Увеличить",
    openPhoto: "Открыть фото и описание", close: "Закрыть", pairsEyebrow: "Хорошо сочетается", pairsTitle: "С этим блюдом берут",
    beforeSending: "Перед отправкой", yourOrder: "Ваш заказ", emptyCart: "Корзина пока пуста",
    emptyCartText: "Добавьте блюда из меню — они появятся здесь.", goToMenu: "Перейти в меню",
    total: "Итого", sendOrder: "Отправить заказ", sending: "Отправляем…", items: "позиции",
    scanTable: "Для заказа отсканируйте QR-код на вашем столе", stoppedNotice: "Позиция находится в stop-list",
    breakfastChoice: "Утренний выбор", breakfastNote: "Лёгкое начало дня", lunchChoice: "Выбор к обеду",
    lunchNote: "Подходит для дневной паузы", dinnerChoice: "Вечерний выбор", dinnerNote: "Более насыщенный вкус к вечеру",
    quoteLines: ["У дня должен быть вкус.", "Хороший кофе задаёт ритм дня.", "Любимые вкусы делают день лучше.", "Вкус начинается с настроения."]
  },
  en: {
    quote: "Quote of the day", menu: "Menu", cart: "Cart", bill: "Bill", info: "Info", soon: "soon",
    soonMessage: "will be available soon", search: "Search dishes", feels: "Feels like", wind: "Wind",
    table: "Table", tableAction: "Order directly from the menu", yourTable: "YOUR TABLE",
    information: "Information", hours: "Opening hours", schedule: "Mon–Sat · 09:00–22:00", sunday: "Sunday · closed",
    wifi: "Wi‑Fi", password: "password", branch: "Branch", social: "Social media", waiter: "Call a waiter",
    tapWifi: "Tap to reveal password", wifiCopied: "",
    add: "Add", addToOrder: "Add to Order", added: "Added ✓", addedToOrder: "added to your order", unavailable: "TEMPORARILY UNAVAILABLE", zoom: "Enlarge",
    openPhoto: "Open photo and description", close: "Close", pairsEyebrow: "Pairs well with", pairsTitle: "Recommended with this item",
    beforeSending: "Before sending", yourOrder: "Your order", emptyCart: "Your cart is empty",
    emptyCartText: "Add items from the menu and they will appear here.", goToMenu: "Go to menu",
    total: "Total", sendOrder: "Send order", sending: "Sending…", items: "items",
    scanTable: "To order, scan the QR code on your table", stoppedNotice: "This item is on the stop list",
    breakfastChoice: "Morning choice", breakfastNote: "A light start to the day", lunchChoice: "Lunch choice",
    lunchNote: "Perfect for a midday break", dinnerChoice: "Evening choice", dinnerNote: "A richer flavour for the evening",
    quoteLines: ["Every day should have flavour.", "Good coffee sets the rhythm of the day.", "Favourite flavours make the day better.", "Flavour starts with a mood."]
  }
};
const weatherTitles = {
  az: { rainy: "Bakıda bu gün yağışlıdır", windy: "Bakıda bu gün küləklidir", sunny: "Bakıda bu gün günəşlidir", cool: "Bakıda bu gün sərindir", cloudy: "Bakıda bu gün buludludur", clear: "Bakıda hava rahatdır" },
  ru: { rainy: "Сегодня в Баку дождь", windy: "Сегодня в Баку ветрено", sunny: "Сегодня в Баку солнечно", cool: "Сегодня в Баку прохладно", cloudy: "Сегодня в Баку облачно", clear: "Сегодня в Баку приятная погода" },
  en: { rainy: "Rainy in Baku today", windy: "Windy in Baku today", sunny: "Sunny in Baku today", cool: "Cool in Baku today", cloudy: "Cloudy in Baku today", clear: "Pleasant weather in Baku" }
};
const displayBranchName = (branch) => branch === "BC1" ? "Barista&Chef R.Behbudov" : `Barista&Chef · ${branch}`;
const photoClass = (product) => {
  if (product.category === "\u041B\u0418\u041C\u041E\u041D\u0410\u0414\u042B") return "lemonade-photo";
  if (product.category === "\u0425\u041E\u041B\u041E\u0414\u041D\u042B\u0415 \u041D\u0410\u041F\u0418\u0422\u041A\u0418") return "cold-drink-photo";
  return undefined;
};
const photoStyle = (product) => product.image
  ? { "--photo": `url(${JSON.stringify(product.image)})` }
  : undefined;
const normalizeProduct = (item, branch) => {
  const sourceName = item.name || "";
  const override = productionProductOverrides[sourceName] || {};
  const sourceDescription = item.description || "";
  const sourceOptions = override.options || (Array.isArray(item.options) ? item.options : []);
  return {
    ...item,
    id: item.id || item.menu_item_id,
    translationKey: sourceName,
    sourceName: override.name || sourceName,
    sourceDescription,
    sourceOptions,
    name: override.name || sourceName,
    description: sourceDescription,
    category: item.category_name || item.category || "\u0411\u0435\u0437 \u043A\u0430\u0442\u0435\u0433\u043E\u0440\u0438\u0438",
    price: Number(item.price ?? item.unit_price ?? (item.line_total && item.quantity ? Number(item.line_total) / Number(item.quantity) : 0)),
    image: override.image || item.image_url || item.image || null,
    options: sourceOptions,
    rating: Number(item.rating || 0),
    branches: [branch]
  };
};
const dailyQuotes = [
  "\u041B\u044E\u0431\u0438\u043C\u044B\u0435 \u0432\u043A\u0443\u0441\u044B \u0434\u0435\u043B\u0430\u044E\u0442 \u0434\u0435\u043D\u044C \u043B\u0443\u0447\u0448\u0435.",
  "\u0412\u043A\u0443\u0441 \u043D\u0430\u0447\u0438\u043D\u0430\u0435\u0442\u0441\u044F \u0441 \u043D\u0430\u0441\u0442\u0440\u043E\u0435\u043D\u0438\u044F.",
  "\u0425\u043E\u0440\u043E\u0448\u0438\u0439 \u043A\u043E\u0444\u0435 \u0437\u0430\u0434\u0430\u0451\u0442 \u0440\u0438\u0442\u043C.",
  "\u0423 \u0434\u043D\u044F \u0434\u043E\u043B\u0436\u0435\u043D \u0431\u044B\u0442\u044C \u0432\u043A\u0443\u0441.",
  "\u041F\u0430\u0443\u0437\u0430 \u0442\u043E\u0436\u0435 \u043C\u043E\u0436\u0435\u0442 \u0431\u044B\u0442\u044C \u043E\u0441\u043E\u0431\u0435\u043D\u043D\u043E\u0439.",
  "\u041F\u0440\u043E\u0441\u0442\u044B\u0435 \u043C\u043E\u043C\u0435\u043D\u0442\u044B \u0437\u0430\u043F\u043E\u043C\u0438\u043D\u0430\u044E\u0442\u0441\u044F \u0432\u043A\u0443\u0441\u043E\u043C.",
  "\u0421\u0435\u0433\u043E\u0434\u043D\u044F \u0441\u0442\u043E\u0438\u0442 \u043F\u043E\u043F\u0440\u043E\u0431\u043E\u0432\u0430\u0442\u044C \u043D\u043E\u0432\u043E\u0435.",
  "\u041B\u044E\u0431\u0438\u043C\u044B\u0439 \u0441\u0442\u043E\u043B \u0432\u0441\u0435\u0433\u0434\u0430 \u043A\u0441\u0442\u0430\u0442\u0438.",
  "\u0412\u043A\u0443\u0441 \u2014 \u044D\u0442\u043E \u043D\u0430\u0441\u0442\u0440\u043E\u0435\u043D\u0438\u0435 \u043C\u043E\u043C\u0435\u043D\u0442\u0430.",
  "\u041D\u0435\u0441\u043F\u0435\u0448\u043D\u043E. \u0421\u0432\u0435\u0436\u043E. \u0421 \u0443\u0434\u043E\u0432\u043E\u043B\u044C\u0441\u0442\u0432\u0438\u0435\u043C.",
  "\u0425\u043E\u0440\u043E\u0448\u0438\u0439 \u0432\u044B\u0431\u043E\u0440 \u043D\u0430\u0447\u0438\u043D\u0430\u0435\u0442\u0441\u044F \u0437\u0434\u0435\u0441\u044C.",
  "\u0412\u0440\u0435\u043C\u044F \u0434\u043B\u044F \u0442\u043E\u0433\u043E, \u0447\u0442\u043E \u043D\u0440\u0430\u0432\u0438\u0442\u0441\u044F.",
  "\u041D\u0435\u043C\u043D\u043E\u0433\u043E \u0432\u043A\u0443\u0441\u0430 \u2014 \u0438 \u0434\u0435\u043D\u044C \u0434\u0440\u0443\u0433\u043E\u0439.",
  "\u041A\u043E\u0444\u0435. \u041F\u0430\u0443\u0437\u0430. \u041F\u0440\u043E\u0434\u043E\u043B\u0436\u0430\u0435\u043C.",
  "\u0412\u044B\u0431\u0438\u0440\u0430\u0439\u0442\u0435 \u0441\u0435\u0440\u0434\u0446\u0435\u043C. \u041D\u0430\u0441\u043B\u0430\u0436\u0434\u0430\u0439\u0442\u0435\u0441\u044C \u0432\u043A\u0443\u0441\u043E\u043C.",
  "\u041A\u0430\u0436\u0434\u044B\u0439 \u0434\u0435\u043D\u044C \u0437\u0430\u0441\u043B\u0443\u0436\u0438\u0432\u0430\u0435\u0442 \u0445\u043E\u0440\u043E\u0448\u0435\u0433\u043E \u0432\u043A\u0443\u0441\u0430."
];
function getDailyQuote() {
  const bakuDay = Number(new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Baku",
    day: "numeric"
  }).format(/* @__PURE__ */ new Date()));
  return dailyQuotes[(bakuDay - 1) % dailyQuotes.length];
}
function getBakuHour() {
  return Number(new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Baku",
    hour: "2-digit",
    hourCycle: "h23"
  }).format(/* @__PURE__ */ new Date()));
}
function getBakuDayPhase(hour = getBakuHour()) {
  if (hour >= 5 && hour < 10) return "morning";
  if (hour >= 10 && hour < 17) return "day";
  if (hour >= 17 && hour < 19) return "evening";
  return "night";
}
export default function QRMenu() {
  const [branch, setBranch] = useState("BC1");
  const [table, setTable] = useState("");
  const [screen, setScreen] = useState("menu");
  const [category, setCategory] = useState("\u0412\u0441\u0435");
  const [wifiPasswordVisible, setWifiPasswordVisible] = useState(false);
  const [cart, setCart] = useState([]);
  const [notice, setNotice] = useState("");
  const [lastAddedId, setLastAddedId] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [order, setOrder] = useState(null);
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [bonusRequest, setBonusRequest] = useState(0);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [photoFullscreen, setPhotoFullscreen] = useState(false);
  const [weather, setWeather] = useState(null);
  const [branchInfo, setBranchInfo] = useState(null);
  const [dayPhase, setDayPhase] = useState("day");
  const [bakuHour, setBakuHour] = useState(12);
  const [language, setLanguage] = useState(() => {
    const savedLanguage = window.localStorage.getItem("rms-qr-language");
    if (["az", "ru", "en"].includes(savedLanguage)) return savedLanguage;
    const browserLanguage = (window.navigator.language || "az").toLowerCase();
    if (browserLanguage.startsWith("ru")) return "ru";
    if (browserLanguage.startsWith("en")) return "en";
    return "az";
  });
  const t = uiText[language];
  const dailyQuote = t.quoteLines[(new Date().getDate() - 1) % t.quoteLines.length];
  const branchName = displayBranchName(branch);
  const unavailable = useMemo(() => products.filter((item) => item.is_available === false || item.is_stopped).map((item) => item.id), [products]);
  const localizedProducts = useMemo(() => products.map((product) => localizeProduct(product, language)), [products, language]);
  useEffect(() => {
    const updatePhase = () => {
      const hour = getBakuHour();
      setBakuHour(hour);
      setDayPhase(getBakuDayPhase(hour));
    };
    updatePhase();
    const timer = window.setInterval(updatePhase, 6e4);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    window.localStorage.setItem("rms-qr-language", language);
    document.documentElement.lang = language;
    setCart((current) => current.map((product) => localizeProduct(product, language)));
    setSelectedProduct((current) => current ? localizeProduct(current, language) : current);
  }, [language]);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setBranch(params.get("branch") || "BC1");
    setTable(params.get("table") || "");
  }, []);
  useEffect(() => {
    let active = true;
    setLoading(true);
    supabase.rpc("qr_get_public_menu", { p_branch_code: branch }).then(({ data, error }) => {
      if (!active) return;
      if (error) flash(`\u041C\u0435\u043D\u044E \u0432\u0440\u0435\u043C\u0435\u043D\u043D\u043E \u043D\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u043D\u043E: ${error.message}`);
      setProducts(Array.isArray(data) ? data.map((item) => normalizeProduct(item, branch)) : []);
      setLoading(false);
    });
    return () => { active = false; };
  }, [branch]);
  useEffect(() => {
    let active = true;
    setWifiPasswordVisible(false);
    supabase.from("rms_qr_info").select("branch_id,wifi_name,wifi_password,working_hours,instagram").eq("branch_id", branch).maybeSingle().then(({ data }) => {
      if (active) setBranchInfo(data || null);
    });
    return () => { active = false; };
  }, [branch]);
  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, current) => {
      setSession(current);
      if (current) window.setTimeout(loadProfile, 0); else setProfile(null);
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session) loadProfile();
    });
    return () => authListener.subscription.unsubscribe();
  }, []);
  useEffect(() => {
    const token = sessionStorage.getItem(`rms-order:${branch}:${table}`);
    if (token) refreshOrder(token);
  }, [branch, table]);
  useEffect(() => {
    if (!order?.public_token || ["paid", "cancelled"].includes(order.status)) return;
    const timer = window.setInterval(() => refreshOrder(order.public_token), 12e3);
    return () => window.clearInterval(timer);
  }, [order?.public_token, order?.status]);
  useEffect(() => {
    let active = true;
    const directEndpoint = "https://api.open-meteo.com/v1/forecast?latitude=40.4093&longitude=49.8671&timezone=Asia%2FBaku&forecast_days=1&current=temperature_2m%2Capparent_temperature%2Cweather_code%2Cwind_speed_10m%2Cwind_gusts_10m&daily=temperature_2m_max%2Cprecipitation_sum&wind_speed_unit=ms";
    const normalizeDirectWeather = (data) => ({
      temperature: Number(data.current?.temperature_2m ?? 0),
      apparentTemperature: Number(data.current?.apparent_temperature ?? 0),
      maxTemperature: Number(data.daily?.temperature_2m_max?.[0] ?? data.current?.temperature_2m ?? 0),
      precipitation: Number(data.daily?.precipitation_sum?.[0] ?? 0),
      windSpeed: Number(data.current?.wind_speed_10m ?? 0),
      windGust: Number(data.current?.wind_gusts_10m ?? 0),
      weatherCode: Number(data.current?.weather_code ?? 0)
    });
    fetch("/api/weather").then((response) => response.ok ? response.json() : Promise.reject()).catch(() => fetch(directEndpoint).then((response) => response.ok ? response.json() : Promise.reject()).then(normalizeDirectWeather)).then((data) => {
      if (active) setWeather(data);
    }).catch(() => {
      if (active) setWeather(null);
    });
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    if (!selectedProduct) return;
    const closeOnEscape = (event) => {
      if (event.key === "Escape" && photoFullscreen) setPhotoFullscreen(false);
      else if (event.key === "Escape") setSelectedProduct(null);
    };
    document.body.classList.add("modal-open");
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.classList.remove("modal-open");
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [selectedProduct, photoFullscreen]);
  useEffect(() => {
    if (!selectedProduct) setPhotoFullscreen(false);
  }, [selectedProduct]);
  const mealMoment = getMealMoment(bakuHour);
  const availableProducts = useMemo(() => localizedProducts.filter((product) => {
    const branchMatch = product.branches.includes(branch);
    const categoryMatch = category === "\u0412\u0441\u0435" || product.category === category;
    return branchMatch && categoryMatch;
  }).sort((a, b) => {
    const aCategory = categoryOrder[mealMoment].indexOf(a.category);
    const bCategory = categoryOrder[mealMoment].indexOf(b.category);
    const categoryDifference = (aCategory < 0 ? 998 : aCategory) - (bCategory < 0 ? 998 : bCategory);
    if (categoryDifference) return categoryDifference;
    return productMomentRank(a, mealMoment) - productMomentRank(b, mealMoment);
  }), [localizedProducts, branch, category, mealMoment]);
  const categories = useMemo(() => {
    const present = new Set(products.filter((p) => p.branches.includes(branch)).map((p) => p.category));
    const ordered = categoryOrder[mealMoment].filter((name) => present.has(name));
    const unknown = [...present].filter((name) => !ordered.includes(name) && !name.toUpperCase().startsWith("EKSTRA"));
    const extras = [...present].filter((name) => name.toUpperCase().startsWith("EKSTRA"));
    return ["\u0412\u0441\u0435", ...ordered.filter((name) => !name.toUpperCase().startsWith("EKSTRA")), ...unknown, ...extras];
  }, [products, branch, mealMoment]);
  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  const ordered = useMemo(() => (order?.items || []).map((item) => ({ ...normalizeProduct(item, branch), qty: Number(item.quantity || item.qty || 1) })), [order, branch]);
  const billTotal = Number(order?.total_amount ?? ordered.reduce((sum, item) => sum + item.price * item.qty, 0));
  const bonusUsed = Number(order?.bonus_reserved || 0);
  const payable = Number(order?.payable_amount ?? Math.max(0, billTotal - bonusUsed));
  const cartCount = cart.reduce((sum, item) => sum + item.qty, 0);
  const loyalty = Boolean(session && profile);
  const bonus = Number(profile?.available_bonus || 0);
  const lifetimeSpend = Number(profile?.lifetime_spend || 0);
  const visits = Number(profile?.visits || 0);
  const history = Array.isArray(profile?.history) ? profile.history : [];
  const paid = order?.status === "paid";
  const status = order?.status || "empty";
  const maxBonus = Math.max(0, Math.min(bonus, cartTotal * 0.3));
  const tierProgress = Math.min(100, lifetimeSpend / 2e3 * 100);
  const weatherOffer = useMemo(() => {
    if (!weather) return null;
    const rainy = weather.precipitation >= 1 || [51, 53, 55, 61, 63, 65, 80, 81, 82, 95].includes(weather.weatherCode);
    const hot = weather.maxTemperature >= 30 || weather.apparentTemperature >= 31;
    const windy = weather.windSpeed >= 9 || weather.windGust >= 14;
    const cool = weather.maxTemperature <= 17;
    const cloudy = [2, 3, 45, 48].includes(weather.weatherCode);
    if (rainy) return {
      kind: "rainy",
      title: "\u0421\u0435\u0433\u043E\u0434\u043D\u044F \u0432 \u0411\u0430\u043A\u0443 \u0434\u043E\u0436\u0434\u044C",
      text: `\u041E\u0436\u0438\u0434\u0430\u0435\u0442\u0441\u044F \u0434\u043E ${weather.precipitation.toFixed(1)} \u043C\u043C \u043E\u0441\u0430\u0434\u043A\u043E\u0432. \u0422\u0435\u043C\u043F\u0435\u0440\u0430\u0442\u0443\u0440\u0430 \u043E\u043A\u043E\u043B\u043E ${Math.round(weather.temperature)}\xB0.`
    };
    if (windy) return {
      kind: "windy",
      title: "\u0421\u0435\u0433\u043E\u0434\u043D\u044F \u0432 \u0411\u0430\u043A\u0443 \u0432\u0435\u0442\u0440\u0435\u043D\u043E",
      text: `\u041F\u043E\u0440\u044B\u0432\u044B \u0434\u043E ${Math.round(weather.windGust)} \u043C/\u0441. \u041E\u0449\u0443\u0449\u0430\u0435\u0442\u0441\u044F \u043A\u0430\u043A ${Math.round(weather.apparentTemperature)}\xB0.`
    };
    if (hot) return {
      kind: "sunny",
      title: "\u0412 \u0411\u0430\u043A\u0443 \u0441\u0435\u0433\u043E\u0434\u043D\u044F \u0436\u0430\u0440\u043A\u043E",
      text: `\u0422\u0435\u043C\u043F\u0435\u0440\u0430\u0442\u0443\u0440\u0430 \u043F\u043E\u0434\u043D\u0438\u043C\u0435\u0442\u0441\u044F \u0434\u043E ${Math.round(weather.maxTemperature)}\xB0. \u0421\u0435\u0439\u0447\u0430\u0441 \u043E\u043A\u043E\u043B\u043E ${Math.round(weather.temperature)}\xB0.`
    };
    if (cool) return {
      kind: "cool",
      title: "\u0412 \u0411\u0430\u043A\u0443 \u0441\u0435\u0433\u043E\u0434\u043D\u044F \u043F\u0440\u043E\u0445\u043B\u0430\u0434\u043D\u043E",
      text: `\u041E\u043A\u043E\u043B\u043E ${Math.round(weather.temperature)}\xB0, \u043E\u0449\u0443\u0449\u0430\u0435\u0442\u0441\u044F \u043A\u0430\u043A ${Math.round(weather.apparentTemperature)}\xB0.`
    };
    if (cloudy) return {
      kind: "cloudy",
      title: "\u0421\u0435\u0433\u043E\u0434\u043D\u044F \u0432 \u0411\u0430\u043A\u0443 \u043F\u0430\u0441\u043C\u0443\u0440\u043D\u043E",
      text: `\u0421\u0435\u0439\u0447\u0430\u0441 \u043E\u043A\u043E\u043B\u043E ${Math.round(weather.temperature)}\xB0. \u041E\u0441\u0430\u0434\u043A\u0438 \u2014 ${weather.precipitation.toFixed(1)} \u043C\u043C.`
    };
    return {
      kind: "sunny",
      title: "\u041A\u043E\u043C\u0444\u043E\u0440\u0442\u043D\u0430\u044F \u043F\u043E\u0433\u043E\u0434\u0430 \u0432 \u0411\u0430\u043A\u0443",
      text: `\u0421\u0435\u0439\u0447\u0430\u0441 \u043E\u043A\u043E\u043B\u043E ${Math.round(weather.temperature)}\xB0, \u0431\u0435\u0437 \u0437\u0430\u043C\u0435\u0442\u043D\u044B\u0445 \u043E\u0441\u0430\u0434\u043A\u043E\u0432.`
    };
  }, [weather]);
  const mealRecommendation = useMemo(() => {
    const moment = getMealMoment(bakuHour);
    const momentMeta = {
      breakfast: {
        label: t.breakfastChoice,
        note: t.breakfastNote,
        keywords: /круас|завтрак|сырник|омлет|шакшук|капучин/i,
        ids: ["bc-001", "bc-003", "bc-005", "bc-008", "bc-064"]
      },
      lunch: {
        label: t.lunchChoice,
        note: t.lunchNote,
        keywords: /салат|хумус|пицц|бургер|наггет/i,
        ids: ["bc-020", "bc-012", "bc-038", "bc-033", "bc-021", "bc-039", "bc-034"]
      },
      dinner: {
        label: t.dinnerChoice,
        note: t.dinnerNote,
        keywords: /стейк|утк|тоннат|сырн.*тарел|рибай|meat lovers/i,
        ids: ["bc-022", "bc-047", "bc-016", "bc-045", "bc-037", "bc-024", "bc-046"]
      }
    };
    const meta = momentMeta[moment];
    const available = localizedProducts.filter((product2) => product2.branches.includes(branch) && !unavailable.includes(product2.id));
    const availableById = new Map(available.map((product2) => [product2.id, product2]));
    const candidates = [
      ...available.filter((product2) => meta.keywords.test(`${product2.name} ${product2.category}`)),
      ...meta.ids.map((id) => availableById.get(id)).filter((product2) => Boolean(product2))
    ].filter((product2, index, list) => index === list.findIndex((item) => item.id === product2.id));
    if (!candidates.length) return null;
    const bakuDay = Number(new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Baku",
      day: "numeric"
    }).format(/* @__PURE__ */ new Date()));
    const product = candidates[(bakuDay + Math.floor(bakuHour / 2)) % candidates.length];
    return { moment, ...meta, product };
  }, [localizedProducts, bakuHour, branch, unavailable, t]);
  const pairings = useMemo(() => {
    if (!selectedProduct) return [];
    const preferred = pairingCategories[selectedProduct.category] || ["\u041B\u0418\u041C\u041E\u041D\u0410\u0414\u042B", "\u041A\u041E\u0424\u0415", "\u0421\u0410\u041B\u0410\u0422\u042B"];
    return localizedProducts.filter(
      (product) => product.id !== selectedProduct.id && product.branches.includes(branch) && !unavailable.includes(product.id) && preferred.includes(product.category)
    ).sort((a, b) => preferred.indexOf(a.category) - preferred.indexOf(b.category) || b.rating - a.rating).filter((product, index, list) => index === list.findIndex((item) => item.category === product.category)).slice(0, 3);
  }, [localizedProducts, selectedProduct, branch, unavailable]);
  function flash(text) {
    setNotice(text);
    window.setTimeout(() => setNotice(""), 2400);
  }
  function revealWifiPassword() {
    setWifiPasswordVisible((visible) => !visible);
  }
  function changeQty(product, delta) {
    if (unavailable.includes(product.id)) return flash(t.stoppedNotice);
    setCart((current) => {
      const line = current.find((item) => item.id === product.id);
      if (!line && delta > 0) return [...current, { ...product, qty: 1 }];
      return current.map((item) => item.id === product.id ? { ...item, qty: item.qty + delta } : item).filter((item) => item.qty > 0);
    });
    if (delta > 0) {
      setLastAddedId(product.id);
      flash(`${product.name} — ${t.addedToOrder}`);
      window.setTimeout(() => setLastAddedId((current) => current === product.id ? null : current), 1200);
    }
  }
  async function loadProfile() {
    const { data, error } = await supabase.rpc("qr_get_my_loyalty");
    if (!error) setProfile(Array.isArray(data) ? data[0] || null : data || null);
  }
  async function refreshOrder(token = order?.public_token) {
    if (!token) return;
    const { data, error } = await supabase.rpc("qr_get_order", { p_public_token: token });
    if (!error && data) setOrder(Array.isArray(data) ? data[0] || null : data);
  }
  async function sendOrder() {
    if (!cart.length || busy) return;
    if (!table) return flash(t.scanTable);
    setBusy(true);
    const { data, error } = await supabase.rpc("qr_create_order", {
      p_branch_code: branch,
      p_table_code: table,
      p_items: cart.map((line) => ({ menu_item_id: line.id, quantity: line.qty, option_name: line.option_name || null, note: line.note || null })),
      p_bonus_requested: Number(bonusRequest || 0)
    });
    setBusy(false);
    if (error) return flash(error.message);
    const created = Array.isArray(data) ? data[0] : data;
    setOrder(created);
    setCart([]);
    setBonusRequest(0);
    setScreen("bill");
    if (created?.public_token) sessionStorage.setItem(`rms-order:${branch}:${table}`, created.public_token);
    flash("\u0417\u0430\u043A\u0430\u0437 \u043E\u0442\u043F\u0440\u0430\u0432\u043B\u0435\u043D");
  }
  function applyBonus() {
    if (!loyalty || !cartTotal) return;
    setBonusRequest(maxBonus);
    flash(`\u0414\u043B\u044F \u0437\u0430\u043A\u0430\u0437\u0430 \u0431\u0443\u0434\u0435\u0442 \u0437\u0430\u043F\u0440\u043E\u0448\u0435\u043D\u043E ${money(maxBonus)} \u0431\u043E\u043D\u0443\u0441\u043E\u0432`);
  }
  function cancelBonus() {
    setBonusRequest(0);
    flash("\u0421\u043F\u0438\u0441\u0430\u043D\u0438\u0435 \u0431\u043E\u043D\u0443\u0441\u043E\u0432 \u043E\u0442\u043C\u0435\u043D\u0435\u043D\u043E");
  }
  async function sendOtp() {
    const normalized = phone.replace(/\s+/g, "");
    if (!/^\+994\d{9}$/.test(normalized)) return flash("\u0412\u0432\u0435\u0434\u0438\u0442\u0435 \u043D\u043E\u043C\u0435\u0440 \u0432 \u0444\u043E\u0440\u043C\u0430\u0442\u0435 +994XXXXXXXXX");
    setBusy(true);
    const { error } = await supabase.auth.signInWithOtp({ phone: normalized });
    setBusy(false);
    if (error) return flash(error.message);
    setOtpSent(true);
    flash("\u041A\u043E\u0434 \u043E\u0442\u043F\u0440\u0430\u0432\u043B\u0435\u043D");
  }
  async function verifyOtp() {
    setBusy(true);
    const { error } = await supabase.auth.verifyOtp({ phone: phone.replace(/\s+/g, ""), token: otp, type: "sms" });
    setBusy(false);
    if (error) return flash("\u041D\u0435\u0432\u0435\u0440\u043D\u044B\u0439 \u0438\u043B\u0438 \u043F\u0440\u043E\u0441\u0440\u043E\u0447\u0435\u043D\u043D\u044B\u0439 \u043A\u043E\u0434");
    setOtpSent(false);
    setOtp("");
    await loadProfile();
    flash("\u0412\u0445\u043E\u0434 \u0432\u044B\u043F\u043E\u043B\u043D\u0435\u043D");
  }
  async function callWaiter(kind = "waiter") {
    const { error } = await supabase.rpc("qr_create_waiter_call", {
      p_branch_code: branch,
      p_table_code: table,
      p_call_type: kind,
      p_order_token: order?.public_token || null
    });
    flash(error ? error.message : kind === "payment" ? "\u0417\u0430\u043F\u0440\u043E\u0441 \u043E\u043F\u043B\u0430\u0442\u044B \u043E\u0442\u043F\u0440\u0430\u0432\u043B\u0435\u043D" : "\u041E\u0444\u0438\u0446\u0438\u0430\u043D\u0442 \u0432\u044B\u0437\u0432\u0430\u043D");
  }
  function startNewVisit() {
    setCart([]);
    setOrder(null);
    setBonusRequest(0);
    sessionStorage.removeItem(`rms-order:${branch}:${table}`);
    setScreen("menu");
    flash("\u041D\u043E\u0432\u044B\u0439 \u0432\u0438\u0437\u0438\u0442 \u043E\u0442\u043A\u0440\u044B\u0442");
  }
  const atmosphere = weatherOffer?.kind ?? "clear";
  const weatherTitle = weatherTitles[language][atmosphere];
  const hasTableContext = Boolean(table);
  const recommendationQty = mealRecommendation ? cart.find((line) => line.id === mealRecommendation.product.id)?.qty || 0 : 0;
  return <main className={`app-shell theme-${dayPhase} weather-theme-${atmosphere}`}>
      <header className="hero">
        <div className="brand-mark">RMS <i>PRO</i></div>
        <div className="language-switch" role="group" aria-label="Language selection">
          <button className={language === "az" ? "active" : ""} onClick={() => setLanguage("az")}>AZ</button>
          <button className={language === "ru" ? "active" : ""} onClick={() => setLanguage("ru")}>RU</button>
          <button className={language === "en" ? "active" : ""} onClick={() => setLanguage("en")}>EN</button>
        </div>
        <div className="hero-copy">
          <span>{branchName}</span>
          <div className="daily-quote">
            <span className="quote-label">{t.quote}</span>
            <p>{dailyQuote}</p>
          </div>
          {hasTableContext && <p className="hero-context">{t.table} {table} · {t.tableAction}</p>}
        </div>
        <div className="hero-side">
          {weatherOffer && <div className={`hero-weather weather-${weatherOffer.kind}`} aria-label={weatherTitle}>
              <div className="hero-weather-copy">
                {weather && <strong>{Math.round(weather.temperature)}°</strong>}
                <div>
                  <span>{weatherTitle}</span>
                  {weather && <small>{t.feels} {Math.round(weather.apparentTemperature)}° · {t.wind} {Math.round(weather.windSpeed)} m/s</small>}
                </div>
              </div>
              <WeatherVisual kind={weatherOffer.kind} phase={dayPhase} />
            </div>}
          {hasTableContext && <div className="table-chip"><small>{t.yourTable}</small><b>{table}</b></div>}
        </div>
      </header>

      <nav className="main-nav" aria-label="Разделы QR Menu">
        {[
    ["menu", t.menu],
    ["cart", `${t.cart}${cartCount ? ` \xB7 ${cartCount}` : ""}`],
    ["bill", t.bill],
    ["loyalty", "Loyalty"],
    ["info", t.info]
  ].map(([id, label]) => <button
    key={id}
    className={`${screen === id ? "active" : ""} ${id === "bill" || id === "loyalty" ? "coming-soon" : ""}`}
    onClick={() => {
      if (id === "bill" || id === "loyalty") return flash(`«${label}» ${t.soonMessage}`);
      setScreen(id);
    }}
  >{label}{(id === "bill" || id === "loyalty") && <small>{t.soon}</small>}</button>)}
      </nav>

      {notice && <div className="toast">{notice}</div>}

      {screen === "menu" && <section className="content">
          <div className="categories">
            {categories.map((name) => <button className={category === name ? "active" : ""} key={name} onClick={() => setCategory(name)}>{categoryTranslations[language][name] || categoryLabel(name)}</button>)}
          </div>
          {mealRecommendation && <aside className={`meal-recommendation meal-${mealRecommendation.moment}`}>
              <button
    className="meal-photo"
    style={photoStyle(mealRecommendation.product)}
    type="button"
    onClick={() => setSelectedProduct(mealRecommendation.product)}
    aria-label={`${t.openPhoto}: ${mealRecommendation.product.name}`}
  >
                {mealRecommendation.product.image ? <img className={photoClass(mealRecommendation.product)} src={mealRecommendation.product.image} alt={mealRecommendation.product.name} /> : <span>B&amp;C</span>}
              </button>
              <div className="meal-copy">
                <div className="meal-kicker">
                  <span>{mealRecommendation.label}</span><i /><small>{mealRecommendation.note}</small>
                </div>
                <button className="meal-title" type="button" onClick={() => setSelectedProduct(mealRecommendation.product)}>
                  {mealRecommendation.product.name}
                </button>
                {mealRecommendation.product.description && <p>{mealRecommendation.product.description}</p>}
              </div>
              <div className="meal-action">
                <strong>{money(mealRecommendation.product.price)}</strong>
                {recommendationQty ? <div className="stepper">
                    <button className="qty-minus" onClick={() => changeQty(mealRecommendation.product, -1)} aria-label={`− ${mealRecommendation.product.name}`} />
                    <b>{recommendationQty}</b>
                    <button className="qty-plus" onClick={() => changeQty(mealRecommendation.product, 1)} aria-label={`+ ${mealRecommendation.product.name}`} />
                  </div> : <button className="add" onClick={() => changeQty(mealRecommendation.product, 1)} aria-label={`${t.add}: ${mealRecommendation.product.name}`}>
                    <b>{t.add}</b><span aria-hidden="true">+</span>
                  </button>}
              </div>
            </aside>}
          <div className="product-grid">
            {availableProducts.map((product) => {
    const isStopped = unavailable.includes(product.id);
    const qty = cart.find((line) => line.id === product.id)?.qty || 0;
    return <article className={`product-card ${isStopped ? "stopped" : ""}`} key={product.id}>
                  <button className="food-photo" style={photoStyle(product)} type="button" onClick={() => setSelectedProduct(product)} aria-label={`${t.openPhoto}: ${product.name}`}>
                    {product.image ? <img className={photoClass(product)} src={product.image} alt={product.name} loading="lazy" /> : <span className="photo-placeholder">B&C</span>}
                    {product.image && <span className="zoom-hint">{t.zoom}</span>}
                    {isStopped && <b>{t.unavailable}</b>}
                  </button>
                  <div className="product-body">
                    <div className="product-title"><h3>{product.name}</h3></div>
                    {product.description && <p>{product.description}</p>}
                    {product.options.length > 0 && <div className="product-options">{product.options.map((option) => <small key={option}>{option}</small>)}</div>}
                    <div className="product-footer">
                      <strong>{money(product.price)}</strong>
                      {qty ? <div className="stepper"><button className="qty-minus" onClick={() => changeQty(product, -1)} aria-label={`− ${product.name}`} /><b>{qty}</b><button className="qty-plus" onClick={() => changeQty(product, 1)} aria-label={`+ ${product.name}`} /></div> : <button className="add" disabled={isStopped} onClick={() => changeQty(product, 1)} aria-label={`${t.add}: ${product.name}`}>
                          <b>{t.add}</b><span aria-hidden="true">+</span>
                        </button>}
                    </div>
                  </div>
                </article>;
  })}
          </div>
        </section>}

      {screen === "cart" && <section className="narrow content">
          <span className="eyebrow">{t.beforeSending}</span><h2>{t.yourOrder}</h2>
          {!cart.length ? <Empty icon="🛒" title={t.emptyCart} text={t.emptyCartText} actionLabel={t.goToMenu} action={() => setScreen("menu")} /> : <>
              <div className="line-list">{cart.map((line) => <OrderLine key={line.id} line={line} controls onMinus={() => changeQty(line, -1)} onPlus={() => changeQty(line, 1)} />)}</div>
              {loyalty && <div className="bonus-reserved"><span>{bonusRequest > 0 ? "Запрошено бонусов" : `Доступно · до ${money(maxBonus)}`}</span><b>{bonusRequest > 0 ? money(bonusRequest) : money(bonus)}</b></div>}
              {loyalty && <button className="outline-button full" onClick={bonusRequest > 0 ? cancelBonus : applyBonus}>{bonusRequest > 0 ? "Не использовать бонусы" : "Использовать бонусы · до 30%"}</button>}
              <div className="total-card"><span>{t.total}</span><b>{money(cartTotal)}</b></div>
              <button className="primary-button" disabled={busy} onClick={sendOrder}>{busy ? t.sending : t.sendOrder}</button>
            </>}
        </section>}

      {screen === "bill" && <section className="narrow content">
          <div className="section-heading"><div><span className="eyebrow">Стол {table}</span><h2>Ваш счёт</h2></div>{status !== "empty" && <StatusBadge status={status} />}</div>
          {!ordered.length ? <Empty icon="🧾" title="Открытого счёта нет" text="После отправки заказа здесь появятся позиции и статус кухни." action={() => setScreen("menu")} /> : <>
              <div className="line-list">{ordered.map((line) => <OrderLine key={line.id} line={line} />)}</div>
              {bonusUsed > 0 && <div className="discount-row"><span>Оплата бонусами</span><b>− {money(bonusUsed)}</b></div>}
              <div className="total-card"><span>К оплате</span><b>{money(payable)}</b></div>
              {paid ? <div className="payment-success">
                  <span className="success-icon">✓</span>
                  <div>
                    <b>Оплата подтверждена</b>
                    <p>Оплачено {money(payable)}{bonusUsed > 0 ? ` + ${money(bonusUsed)} бонусами` : ""}</p>
                    {loyalty && <small>Cashback начислен только на сумму, оплаченную деньгами.</small>}
                  </div>
                </div> : <>
                  <div className="bill-actions">
                    <button className="primary-button" onClick={() => callWaiter("payment")}>Попросить счёт</button>
                  </div>
                </>}
              {paid && <button className="outline-button full" onClick={startNewVisit}>Начать новый визит</button>}
              {!paid && <p className="safe-note">Статус оплаты появится только после подтверждения сотрудником.</p>}
            </>}
        </section>}

      {screen === "loyalty" && <section className="narrow content">
          <span className="eyebrow">RMS Loyalty</span><h2>Ваша карта</h2>
          {!loyalty ? <div className="loyalty-login">
              <div className="loyalty-symbol">R</div>
              <h3>{otpSent ? "Введите код из SMS" : "Войдите по номеру телефона"}</h3>
              <p>{otpSent ? "Код действует ограниченное время." : "Покажем баланс, историю и персональный QR-код."}</p>
              {!otpSent ? <><input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+994 50 000 00 00" /><button className="primary-button" disabled={busy} onClick={sendOtp}>Получить код</button></> : <><input value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))} placeholder="Код из SMS" inputMode="numeric" /><button className="primary-button" disabled={busy} onClick={verifyOtp}>Войти</button></>}
            </div> : <>
              <div className="loyalty-card">
                <div><span>RMS PRO</span><small>LOYALTY</small></div>
                <div className="bonus"><small>ДОСТУПНО БОНУСОВ</small><b>{money(bonus)}</b></div>
                <div className="card-bottom"><span>{profile?.member_code || "RMS MEMBER"}</span><span>{profile?.tier_name || "GOLD"}</span></div>
              </div>
              <div className="loyalty-stats">
                <article><small>УРОВЕНЬ</small><b>{profile?.tier_name || (lifetimeSpend >= 2e3 ? "Platinum" : "Gold")}</b><span>{lifetimeSpend >= 2e3 ? "максимальный уровень" : `${money(Math.max(0, 2e3 - lifetimeSpend))} до Platinum`}</span></article>
                <article><small>ВИЗИТОВ</small><b>{visits}</b><span>за всё время</span></article>
                <article><small>CASHBACK</small><b>5%</b><span>с оплаченной суммы</span></article>
              </div>
              <div className="tier-progress">
                <div><span>Gold</span><b>Platinum · 2 000 ₼</b></div>
                <i><span style={{ width: `${tierProgress}%` }} /></i>
                <small>Учтено покупок: {money(lifetimeSpend)}</small>
              </div>
              {bonusUsed > 0 && !paid && <div className="bonus-reserved">
                  <span>Зарезервировано для текущего счёта</span>
                  <b>{money(bonusUsed)}</b>
                </div>}
              <div className="qr-token"><div className="qr-fake" aria-label="QR-код участника">{Array.from({ length: 49 }).map((_, i) => <i key={i} className={(i * 7 + i % 3) % 4 ? "on" : ""} />)}</div><div><b>QR для официанта</b><p>{profile?.member_code || "Персональный токен Loyalty"}</p></div></div>
              <div className="loyalty-rules">
                <article><span>01</span><div><b>Начисление</b><p>5% только с суммы, фактически оплаченной деньгами.</p></div></article>
                <article><span>02</span><div><b>Списание</b><p>До 30% счёта, без повторного использования в одном чеке.</p></div></article>
                <article><span>03</span><div><b>Защита</b><p>Начисление происходит один раз после подтверждения оплаты.</p></div></article>
              </div>
              <div className="history-heading"><div><span className="eyebrow">Операции</span><h3>История бонусов</h3></div><small>{history.length} записей</small></div>
              <div className="loyalty-history">
                {history.map((entry) => <article key={entry.id}>
                    <span className={`history-icon ${entry.kind}`}>{entry.kind === "redeem" ? "\u2212" : "+"}</span>
                    <div><b>{entry.title || entry.description}</b><small>{entry.detail || (entry.created_at ? new Date(entry.created_at).toLocaleDateString("ru-RU") : "")}</small></div>
                    <strong className={entry.amount < 0 ? "negative" : ""}>{entry.amount > 0 ? "+" : ""}{money(entry.amount)}</strong>
                  </article>)}
              </div>
              <button className="outline-button full" onClick={() => supabase.auth.signOut()}>Выйти</button>
            </>}
        </section>}

      {screen === "info" && <section className="narrow content">
          <span className="eyebrow">{branchName}</span><h2>{t.information}</h2>
          <div className="info-grid">
            <article><span>◷</span><div><b>{t.hours}</b><p>{t.schedule}<br />{t.sunday}</p></div></article>
            <article className="wifi-info-card"><span>⌁</span><div><b>{t.wifi}</b><p className="wifi-network">{branchInfo?.wifi_name || "BC-Guest"}</p>{branchInfo?.wifi_password && <button type="button" className={`wifi-password-button ${wifiPasswordVisible ? "revealed" : ""}`} onClick={revealWifiPassword} aria-expanded={wifiPasswordVisible} aria-label={t.tapWifi}><span className="wifi-password-value">{wifiPasswordVisible ? branchInfo.wifi_password : "••••••••••••"}</span><small>{t.tapWifi}</small></button>}</div></article>
            <article><span>◎</span><div><b>{t.branch}</b><p>{branchName}</p></div></article>
            <article><span>◌</span><div><b>{t.social}</b><p><a href="https://instagram.com/baristachefaz" target="_blank" rel="noreferrer">@baristachefaz</a></p></div></article>
          </div>
          <button className="primary-button" onClick={() => callWaiter("waiter")}>{t.waiter}</button>
        </section>}

      {selectedProduct && <div className="product-modal" role="dialog" aria-modal="true" aria-label={selectedProduct.name} onMouseDown={(event) => {
    if (event.currentTarget === event.target) setSelectedProduct(null);
  }}>
          <article className="product-modal-card">
            <button className="modal-close" onClick={() => setSelectedProduct(null)} aria-label={t.close} />
            <div className="modal-heading">
              <span className="eyebrow">{categoryTranslations[language][selectedProduct.category] || categoryLabel(selectedProduct.category)}</span>
              <h2>{selectedProduct.name}</h2>
            </div>
            <button className="modal-photo" type="button" style={photoStyle(selectedProduct)} onClick={() => selectedProduct.image && setPhotoFullscreen(true)} aria-label={`${t.zoom}: ${selectedProduct.name}`}>
              {selectedProduct.image ? <img className={photoClass(selectedProduct)} src={selectedProduct.image} alt={selectedProduct.name} /> : <span className="photo-placeholder">B&C</span>}
            </button>
            <div className="modal-content">
              {selectedProduct.description && <p>{selectedProduct.description}</p>}
              {selectedProduct.options.length > 0 && <div className="modal-options">{selectedProduct.options.map((option) => <small key={option}>{option}</small>)}</div>}
              <div className="modal-buy">
                <strong>{money(selectedProduct.price)}</strong>
                <button className={lastAddedId === selectedProduct.id ? "added" : ""} disabled={unavailable.includes(selectedProduct.id)} onClick={() => changeQty(selectedProduct, 1)}>
                  {unavailable.includes(selectedProduct.id) ? t.unavailable : lastAddedId === selectedProduct.id ? t.added : t.addToOrder}
                </button>
              </div>
              {pairings.length > 0 && <div className="pairings">
                  <div><span className="eyebrow">{t.pairsEyebrow}</span><h3>{t.pairsTitle}</h3></div>
                  <div className="pairing-grid">
                    {pairings.map((product) => <article key={product.id}>
                        <button className="pairing-photo" style={photoStyle(product)} onClick={() => setSelectedProduct(product)}>
                          {product.image ? <img className={photoClass(product)} src={product.image} alt={product.name} /> : <span>B&C</span>}
                        </button>
                        <div><b>{product.name}</b><small>{money(product.price)}</small></div>
                        <button className={`pairing-add ${lastAddedId === product.id ? "added" : ""}`} onClick={() => changeQty(product, 1)} aria-label={`${t.add}: ${product.name}`}>+</button>
                      </article>)}
                  </div>
                </div>}
            </div>
          </article>
        </div>}

      {photoFullscreen && selectedProduct?.image && <div className="photo-lightbox" role="dialog" aria-modal="true" aria-label={`${t.zoom}: ${selectedProduct.name}`} onClick={() => setPhotoFullscreen(false)}>
          <div className="photo-popover" onClick={(event) => event.stopPropagation()}>
            <button type="button" className="lightbox-close" onClick={() => setPhotoFullscreen(false)} aria-label={t.close} />
            <img src={selectedProduct.image} alt={selectedProduct.name} onClick={() => setPhotoFullscreen(false)} />
          </div>
        </div>}

      {cartCount > 0 && screen === "menu" && <button className="floating-cart" onClick={() => setScreen("cart")}><span>{cartCount} {t.items}</span><b>{money(cartTotal)} →</b></button>}
      <footer><span>Powered by</span><b>RMS PRO</b><small>QR Menu + Loyalty</small></footer>
    </main>;
}
function WeatherVisual({ kind, phase }) {
  const isNight = phase === "night";
  return <div className={`weather-visual ${kind} ${isNight ? "night-sky" : ""}`} aria-hidden="true">
      <span className="weather-sun" />
      {isNight && <span className="weather-moon" />}
      <span className="weather-cloud cloud-one" />
      <span className="weather-cloud cloud-two" />
      <span className="weather-rain rain-one" />
      <span className="weather-rain rain-two" />
      <span className="weather-rain rain-three" />
      <span className="weather-wind wind-one" />
      <span className="weather-wind wind-two" />
    </div>;
}
function OrderLine({ line, controls, onMinus, onPlus }) {
  return <article className="order-line"><div className="mini-photo" style={photoStyle(line)}>{line.image ? <img className={photoClass(line)} src={line.image} alt="" /> : <span>B&C</span>}</div><div><b>{line.name}</b><span>{money(line.price)} × {line.qty}</span></div>{controls ? <div className="stepper"><button className="qty-minus" onClick={onMinus} aria-label={`Уменьшить количество ${line.name}`} /><b>{line.qty}</b><button className="qty-plus" onClick={onPlus} aria-label={`Увеличить количество ${line.name}`} /></div> : <strong>{money(line.price * line.qty)}</strong>}</article>;
}
function Empty({ icon, title, text, action, actionLabel = "Перейти в меню" }) {
  return <div className="empty-state"><span>{icon}</span><h3>{title}</h3><p>{text}</p><button className="outline-button" onClick={action}>{actionLabel}</button></div>;
}
function StatusBadge({ status }) {
  const labels = { new: "Заказ получен", requested: "Заказ получен", confirmed: "Подтверждён", preparing: "Готовится", ready: "Заказ готов", payment_requested: "Запрошена оплата", paid: "Оплачен", cancelled: "Отменён" };
  return <span className={`status ${status}`}><i />{labels[status] || status}</span>;
}
