// Guest-facing catalogue copy. Russian is the source language used by the
// current public-menu RPC; AZ/EN values keep the QR menu fully localized
// without changing the production database schema.
const copy = (azName, enName, azDescription = "", enDescription = "") => ({
  az: { name: azName, description: azDescription },
  en: { name: enName, description: enDescription }
});

export const PRODUCT_TRANSLATIONS = {
  "Капучино и Круассан — Комбо": copy("Kapuçino və kruassan — kombo", "Cappuccino & Croissant Combo"),
  "Рокфеллер Бургер": copy("Rockefeller Burger", "Rockefeller Burger", "İki mal əti kotleti, ikiqat çeddar pendiri, Rockefeller sousu, aysberq kahısı, qırmızı soğan, pomidor, turşu xiyar, oreqanolu kartof fri, ketçup və ballı-xardal sousu.", "Double beef patty, double cheddar, Rockefeller sauce, iceberg lettuce, red onion, tomato, pickles, oregano fries, ketchup and honey mustard sauce."),
  "Сырники": copy("Sırniklər", "Syrniki", "Krem pendir, giləmeyvə sousu, mövsümi giləmeyvələr, püstə və şəkər kirşanı.", "Cream cheese, berry sauce, seasonal berries, pistachios and icing sugar."),
  "Копчёная Утка и Крем-Чиз": copy("Hisə verilmiş ördək və krem pendir", "Smoked Duck & Cream Cheese", "Pəhriz tostu, hisə verilmiş ördək, krem pendir, salat qarışığı, albalı sousu, pomidor konfi, gavalı çatnisi, sumaq və yaşıl yağ.", "Dietary toast, smoked duck, cream cheese, mixed leaves, cherry sauce, tomato confit, plum chutney, sumac and herb oil."),
  "Шакшука": copy("Şakşuka", "Shakshuka", "Bolqar bibəri, pomidor, soğan, yumurta, göyərti qarışığı, keşniş, pita və sumaq.", "Bell pepper, tomato, onion, eggs, mixed herbs, coriander, pita and sumac."),
  "Классический Омлет": copy("Klassik omlet", "Classic Omelette", "Yumurta, süd, duz, göyərti qarışığı, sumaq və yaşıl yağ.", "Eggs, milk, salt, mixed herbs, sumac and herb oil."),
  "Яичница-Глазунья": copy("Göz yumurta", "Fried Eggs", "Yumurta, sumaq, yaşıl yağ və göyərti qarışığı.", "Eggs, sumac, herb oil and mixed herbs."),
  "Нью-Йоркский Завтрак": copy("Nyu-York səhər yeməyi", "New York Breakfast", "Krem pendirli beygel, sumaq, hisə verilmiş qızılbalıq, xiyar, çerri pomidoru, avokado, poşe yumurta, salat qarışığı, limon, tumlar, mikroyaşıllıq, küncüt və alma sousu.", "Bagel with cream cheese, sumac, smoked salmon, cucumber, cherry tomatoes, avocado, poached egg, mixed leaves, lemon, seeds, microgreens, sesame and apple dressing."),
  "Бейгл с Лососем": copy("Qızılbalıqlı beygel", "Salmon Bagel", "Beygel, krem pendir, qızılbalıq, parmezan, sumaq və küncüt.", "Bagel, cream cheese, salmon, Parmesan, sumac and sesame."),
  "Гранола": copy("Qranola", "Granola", "Yulaf, banan və alma, çia toxumu və badam ləçəkləri ilə. Adi və ya bitki mənşəli süd, yaxud su ilə təqdim olunur.", "Oats with banana and apple, chia seeds and almond flakes. Served with regular or plant-based milk, or water."),
  "Овсяная Каша": copy("Yulaf sıyığı", "Oatmeal", "Yulaf lopası, süd, kərə yağı, şəkər və vanil.", "Oats, milk, butter, sugar and vanilla."),
  "Хумус Янкиз": copy("Yankees humusu", "Yankees Hummus", "Noxud mussu, püstə, hisə verilmiş paprika, limon qabığı, zeytun yağı, pita və sumaq.", "Chickpea mousse, pistachios, smoked paprika, lemon zest, olive oil, pita and sumac."),
  "Верхний Манхеттен": copy("Upper Manhattan", "Upper Manhattan", "Qurudulmuş pomidorlu pendir mussu, zeytun tozu, paprika, pomidor konfi və qızardılmış pita.", "Sun-dried tomato cheese mousse, olive powder, paprika, tomato confit and toasted pita."),
  "Рокфеллер Фри": copy("Rockefeller fri", "Rockefeller Fries", "Kartof fri, sumaq, trüfel yağı, parmezan, ballı-xardal sousu və ketçup.", "French fries, sumac, truffle oil, Parmesan, honey mustard sauce and ketchup."),
  "Чипсы Гарлем": copy("Harlem kartofu", "Harlem Chips", "Kənd üsulu kartof, hisə verilmiş paprika, rozmarin və şirin çili sousu.", "Country-style potatoes, smoked paprika, rosemary and sweet chilli sauce."),
  "Тост Бликер-Стрит": copy("Bleecker Street tostu", "Bleecker Street Toast", "Pəhriz tostu, hisə verilmiş muss, rukola, ribay əti, küncüt sousu, pomidor konfi, küncüt və sumaq.", "Dietary toast, smoked mousse, rocket, ribeye, sesame dressing, tomato confit, sesame and sumac."),
  "Куриные Наггетсы": copy("Toyuq naggetsləri", "Chicken Nuggets", "Panelənmiş toyuq filesi, ballı-xardal sousu və şef sousu.", "Breaded chicken fillet, honey mustard sauce and chef's sauce."),
  "Грибной Суп «Энди Уорхол»": copy("“Andy Warhol” göbələk şorbası", "Andy Warhol Mushroom Soup", "Şampinyon, porey soğanı, trüfel yağı, qaymaq və göyərti qarışığı.", "Mushrooms, leek, truffle oil, cream and mixed herbs."),
  "Томатный Суп «Гамбино»": copy("“Gambino” pomidor şorbası", "Gambino Tomato Soup", "Pomidor, porey soğanı, yaşıl yağ, zeytun tozu və pomidor konfi.", "Tomatoes, leek, herb oil, olive powder and tomato confit."),
  "Салат Джерси-Сити": copy("Jersey City salatı", "Jersey City Salad", "Salat qarışığı, toyuq filesi, çiyələk cemi və albalı sousu, narşərab, qızardılmış ananas, qoz, giləmeyvə və qırmızı soğan.", "Mixed leaves, chicken fillet, strawberry jam and cherry dressings, pomegranate sauce, grilled pineapple, walnuts, berries and red onion."),
  "Салат Органик Сохо": copy("Organic Soho salatı", "Organic Soho Salad", "Salat qarışığı, paprikalı toyuq filesi, kinoa, gül kələmi, qızardılmış avokado, portağal sousu və portağal qabığı.", "Mixed leaves, paprika chicken, quinoa, cauliflower, grilled avocado, orange dressing and orange zest."),
  "Салат Челси Маркет": copy("Chelsea Market salatı", "Chelsea Market Salad", "Salat qarışığı, ribay filesi, sumaq, qırmızı soğan, xren mussu, tünd pivə sousu, tost çipsləri və pomidor konfi.", "Mixed leaves, ribeye fillet, sumac, red onion, horseradish mousse, dark beer dressing, toast crisps and tomato confit."),
  "Салат Уолл Стрит": copy("Wall Street salatı", "Wall Street Salad", "Rukola, ribay filesi, qırmızı soğan, bolqar bibəri, çerri pomidoru, hisə verilmiş muss, zeytun tozu, küncüt sousu və tost çipsləri.", "Rocket, ribeye fillet, red onion, bell pepper, cherry tomatoes, smoked mousse, olive powder, sesame dressing and toast crisps."),
  "Салат Центральный Парк": copy("Central Park salatı", "Central Park Salad", "Salat qarışığı, hisə verilmiş ördək filesi, qırmızı soğan, albalı sousu, feta mussu, giləmeyvə, narşərab və portağal qabığı.", "Mixed leaves, smoked duck fillet, red onion, cherry dressing, feta mousse, berries, pomegranate sauce and orange zest."),
  "Боул": copy("Boul", "Bowl", "Salat qarışığı, xiyar, zeytun, bolqar bibəri, kinoa, çerri pomidoru, qarğıdalı, humus, paprika, küncüt sousu, kartof, tumlar və mikroyaşıllıq.", "Mixed leaves, cucumber, olives, bell pepper, quinoa, cherry tomatoes, corn, hummus, paprika, sesame dressing, potato, seeds and microgreens."),
  "Сэндвич Ист-Сайд": copy("East Side sendviçi", "East Side Sandwich", "Çiabatta, rukola, hisə verilmiş muss, pomidor, salami, mozzarella, sumaq və küncüt.", "Ciabatta, rocket, smoked mousse, tomato, salami, mozzarella, sumac and sesame."),
  "Сэндвич Западный Бронкс": copy("West Bronx sendviçi", "West Bronx Sandwich", "Toyuq filesi, ayoli, aysberq kahısı, qırmızı soğan, pomidor, turşu xiyar, qarğıdalı və küncüt.", "Chicken fillet, aioli, iceberg lettuce, red onion, tomato, pickles, corn and sesame."),
  "Сэндвич Северный Нью-Йорк": copy("North New York sendviçi", "North New York Sandwich", "Ribay filesi, xren mussu, aysberq kahısı, qırmızı soğan, pomidor, turşu xiyar, çeddar və küncüt.", "Ribeye fillet, horseradish mousse, iceberg lettuce, red onion, tomato, pickles, cheddar and sesame."),
  "Сэндвич Брайтон": copy("Brighton sendviçi", "Brighton Sandwich", "Pita, falafel, xardal, sumaq, humus, aysberq kahısı, qırmızı soğan, pomidor və turşu xiyar.", "Pita, falafel, mustard, sumac, hummus, iceberg lettuce, red onion, tomato and pickles."),
  "Сэндвич Третья Авеню": copy("Third Avenue sendviçi", "Third Avenue Sandwich", "Pita, ribay əti, krem pendir, çeddar, sumaq və mikroyaşıllıq.", "Pita, ribeye, cream cheese, cheddar, sumac and microgreens."),
  "Вильямс Бургер Бекон Вишня": copy("Williams Burger — bekon və albalı", "Williams Burger — Bacon & Cherry", "Mərmər mal əti kotleti, sumaq, çeddar, bekon, albalı ilə karamelizə edilmiş soğan, şef sousu, aysberq kahısı, qırmızı soğan, pomidor, turşu xiyar, paprikalı fri, ballı-xardal sousu və ketçup.", "Marbled beef patty, sumac, cheddar, bacon, cherry-caramelised onion, chef's sauce, iceberg lettuce, red onion, tomato, pickles, paprika fries, honey mustard and ketchup."),
  "Вильямс Бургер со сливочными грибами": copy("Williams Burger — qaymaqlı göbələk", "Williams Burger — Creamy Mushrooms", "Mərmər mal əti kotleti, çeddar, göbələk sousu, şef sousu, aysberq kahısı, qırmızı soğan, pomidor, turşu xiyar, kartof fri, ballı-xardal sousu, ketçup və sumaq.", "Marbled beef patty, cheddar, mushroom sauce, chef's sauce, iceberg lettuce, red onion, tomato, pickles, fries, honey mustard, ketchup and sumac."),
  "Вильямс Бургер": copy("Williams Burger", "Williams Burger", "Mərmər mal əti kotleti, çeddar, şef sousu, aysberq kahısı, qırmızı soğan, pomidor, turşu xiyar, kartof fri, sumaq, ballı-xardal sousu və ketçup.", "Marbled beef patty, cheddar, chef's sauce, iceberg lettuce, red onion, tomato, pickles, fries, sumac, honey mustard and ketchup."),
  "Рузвельт Бургер": copy("Roosevelt Burger", "Roosevelt Burger", "Toyuq filesi, ananas, şef sousu, aysberq kahısı, qırmızı soğan, pomidor, turşu xiyar, kartof fri, ballı-xardal sousu, ketçup və sumaq.", "Chicken fillet, pineapple, chef's sauce, iceberg lettuce, red onion, tomato, pickles, fries, honey mustard, ketchup and sumac."),
  "Чарлзстон Бургер": copy("Charleston Burger", "Charleston Burger", "Panelənmiş toyuq, şef sousu, aysberq kahısı, qırmızı soğan, pomidor, turşu xiyar, kartof fri, ballı-xardal sousu, ketçup və sumaq.", "Breaded chicken, chef's sauce, iceberg lettuce, red onion, tomato, pickles, fries, honey mustard, ketchup and sumac."),
  "Курица Чайна-Таун": copy("Chinatown toyuğu", "Chinatown Chicken", "Toyuq filesi, kinoa, sumaq, brokkoli, şirin çili, soya sousu, göyərti qarışığı və barbekü sousu.", "Chicken fillet, quinoa, sumac, broccoli, sweet chilli, soy sauce, mixed herbs and barbecue sauce."),
  "Пицца Маргарита": copy("Marqarita pizzası", "Margherita Pizza", "Pizza sousu və mozzarella.", "Pizza sauce and mozzarella."),
  "Пицца Фунги": copy("Funghi pizzası", "Funghi Pizza", "Pizza sousu, mozzarella və şampinyon.", "Pizza sauce, mozzarella and mushrooms."),
  "Пицца «Чикен Фунги»": copy("Chicken Funghi pizzası", "Chicken Funghi Pizza", "Pizza sousu, mozzarella, göbələk, zeytun, bolqar bibəri və toyuq filesi.", "Pizza sauce, mozzarella, mushrooms, olives, bell pepper and chicken fillet."),
  "Пицца «Чикен Барбекю»": copy("Chicken BBQ pizzası", "Chicken BBQ Pizza", "Pizza sousu, mozzarella, toyuq filesi, qarğıdalı, barbekü sousu və küncüt.", "Pizza sauce, mozzarella, chicken fillet, corn, barbecue sauce and sesame."),
  "Пицца «Салями Фунги»": copy("Salami Funghi pizzası", "Salami Funghi Pizza", "Pizza sousu, mozzarella, göbələk və salami.", "Pizza sauce, mozzarella, mushrooms and salami."),
  "Пицца «Пепперони»": copy("Pepperoni pizzası", "Pepperoni Pizza", "Pizza sousu, mozzarella, salami və pepperoni sousu.", "Pizza sauce, mozzarella, salami and pepperoni sauce."),
  "Пицца «Дьявола»": copy("Diavola pizzası", "Diavola Pizza", "Pizza sousu, mozzarella, salami və çili bibəri.", "Pizza sauce, mozzarella, salami and chilli pepper."),
  "Пицца «Четыре Сыра»": copy("Dörd pendir pizzası", "Four Cheese Pizza", "Pizza sousu, mozzarella, çeddar, parmezan və göy pendir.", "Pizza sauce, mozzarella, cheddar, Parmesan and blue cheese."),
  "Пицца Meat Lovers": copy("Meat Lovers pizzası", "Meat Lovers Pizza", "Pizza sousu, mozzarella, göbələk, zeytun, soğan və ribay əti.", "Pizza sauce, mozzarella, mushrooms, olives, onion and ribeye."),
  "Пицца с Копчёной Уткой": copy("Hisə verilmiş ördəkli pizza", "Smoked Duck Pizza", "Pizza sousu, mozzarella, hisə verilmiş ördək filesi və mikroyaşıllıq.", "Pizza sauce, mozzarella, smoked duck fillet and microgreens."),
  "Тоффи-Чизкейк": copy("Toffi çizkeyk", "Toffee Cheesecake", "Toffi, dondurma, krambl, şəkər kirşanı və karamel sousu.", "Toffee, ice cream, crumble, icing sugar and caramel sauce."),
  "Эклер Бруклин": copy("Brooklyn ekleri", "Brooklyn Éclair", "Dəmlənmiş krem, mövsümi giləmeyvələr, şəkər kirşanı, badam ləçəkləri və giləmeyvə toppinqi.", "Custard, seasonal berries, icing sugar, almond flakes and berry topping."),
  "Мороженое Бушвик": copy("Bushwick dondurması", "Bushwick Ice Cream", "Əlavələr: banan və ya giləmeyvə; karamel, giləmeyvə və ya şokolad sousu.", "Extras: banana or berries; caramel, berry or chocolate sauce."),
  "Мусс-Чизкейк «Нью-Йорк»": copy("New York muss-çizkeyki", "New York Mousse Cheesecake", "Şirin krem pendir mussu, krambl, mövsümi giləmeyvələr, giləmeyvə sousu və şəkər kirşanı.", "Sweet cream-cheese mousse, crumble, seasonal berries, berry sauce and icing sugar."),
  "Грибы": copy("Göbələk", "Mushrooms"),
  "Сыр": copy("Pendir", "Cheese"),
  "Бекон": copy("Bekon", "Bacon"),
  "Соусы": copy("Souslar", "Sauces", "Karamel, şokolad və giləmeyvə.", "Caramel, chocolate and berry."),
  "Фрукты": copy("Meyvələr", "Fruit", "Alma, banan, portağal və giləmeyvə.", "Apple, banana, orange and berries."),
  "Экстра Соус": copy("Əlavə sous", "Extra Sauce"),
  "Тост Диетический": copy("Pəhriz tostu", "Dietary Toast"),
  "Экстра Бриошь": copy("Əlavə brioş", "Extra Brioche"),
  "Экстра Пита": copy("Əlavə pita", "Extra Pita"),
  "Эспрессо": copy("Espresso", "Espresso"),
  "Двойной Эспрессо": copy("İkiqat espresso", "Double Espresso"),
  "Американо": copy("Amerikano", "Americano"),
  "Капучино": copy("Kapuçino", "Cappuccino"),
  "Флэт Уайт": copy("Flat White", "Flat White"),
  "Латте": copy("Latte", "Latte"),
  "Раф": copy("Raf", "Raf Coffee", "Vanilli, ballı, şokoladlı, ədviyyatlı, şaftalı-bənövşə, pivəli, qozlu, sarıkök-zəncəfil, ədviyyatlı nar, şokolad-kokos, zəncəfilli peçenye, badam, Irish, karamel, duzlu karamel, lavanda və makadamiya.", "Vanilla, honey, chocolate, spiced, peach-violet, beer, nut, turmeric-ginger, spiced pomegranate, chocolate-coconut, gingerbread, almond, Irish, caramel, salted caramel, lavender and macadamia."),
  "Эспрессо-Тоник": copy("Espresso-tonik", "Espresso Tonic", "Qəhvə və tonikdən hazırlanan təravətləndirici içki.", "A refreshing drink made with coffee and tonic."),
  "Bumble Bee": copy("Bumble Bee", "Bumble Bee", "Espresso şotu ilə karamel-portağal şirəsi.", "Caramel-orange juice with a shot of espresso."),
  "Аффогато": copy("Affoqato", "Affogato"),
  "Caramelita": copy("Caramelita", "Caramelita"),
  "Холодный Раф": copy("Soyuq raf", "Iced Raf"),
  "Холодный Американо": copy("Soyuq amerikano", "Iced Americano"),
  "Холодный Латте": copy("Soyuq latte", "Iced Latte"),
  "Персик Фиалка": copy("Şaftalı və bənövşə", "Peach & Violet", "Şaftalı, bənövşə, limon və qazlı su.", "Peach, violet, lemon and sparkling water."),
  "Ананас Розмарин": copy("Ananas və rozmarin", "Pineapple & Rosemary", "Ananas, rozmarin, limon və qazlı su.", "Pineapple, rosemary, lemon and sparkling water."),
  "Маракуйя Сумах": copy("Marakuya və sumaq", "Passion Fruit & Sumac", "Marakuya, sumaq, limon və qazlı su.", "Passion fruit, sumac, lemon and sparkling water."),
  "Алоэ Пряный Гранат": copy("Aloe və ədviyyatlı nar", "Aloe & Spiced Pomegranate", "Aloe, ədviyyat qarışığı, nar, limon və qazlı su.", "Aloe, spice mix, pomegranate, lemon and sparkling water."),
  "Киви Бум": copy("Kiwi Boom", "Kiwi Boom", "Təzə kivi, marakuya, limon və ananas şirəsi.", "Fresh kiwi, passion fruit, lemon and pineapple juice."),
  "Куркума Имбирь": copy("Sarıkök və zəncəfil", "Turmeric & Ginger", "Sarıkök, zəncəfil, limon və qazlı su.", "Turmeric, ginger, lemon and sparkling water."),
  "Клубничный Рай": copy("Çiyələk cənnəti", "Strawberry Paradise", "Təzə çiyələk, limon, şəkər siropu və Sprite.", "Fresh strawberries, lemon, sugar syrup and Sprite."),
  "Юдзу-Лимонад": copy("Yuzu limonadı", "Yuzu Lemonade", "Yuzu, xiyar və qazlı su.", "Yuzu, cucumber and sparkling water."),
  "Summer Vibes": copy("Summer Vibes", "Summer Vibes", "Şaftalı, marakuya, albalı və limon şirəsi.", "Peach, passion fruit, cherry and lemon juice."),
  "Tropical Vibes": copy("Tropical Vibes", "Tropical Vibes", "Ananas, marakuya, liçi və limon şirəsi.", "Pineapple, passion fruit, lychee and lemon juice."),
  "Yoda's Love": copy("Yoda's Love", "Yoda's Love", "Xiyar, limon və yuzu.", "Cucumber, lemon and yuzu."),
  "Special Tea": copy("Xüsusi çay", "Special Tea"),
  "Вода": copy("Sirab suyu", "Sirab Water"),
  "Вода Sirab": copy("Sirab suyu", "Sirab Water"),
  "Газированная Вода": copy("Qazlı su", "Sparkling Water"),
  "Соки": copy("Şirələr", "Juices"),
  "Кола": copy("Coca-Cola", "Coca-Cola"),
  "Кола Зеро": copy("Coca-Cola Zero", "Coca-Cola Zero"),
  "Фанта": copy("Fanta", "Fanta"),
  "Спрайт": copy("Sprite", "Sprite"),
  "Тоник": copy("Tonik", "Tonic"),
  "Энергетические Напитки": copy("Enerji içkiləri", "Energy Drinks"),
  "Red Bull": copy("Red Bull", "Red Bull"),
  "X Shot": copy("Əlavə espresso şotu", "Extra Espresso Shot"),
  "Сироп": copy("Sirop", "Syrup"),
  "Молоко": copy("Süd", "Milk"),
  "Взбитые Сливки": copy("Çalınmış qaymaq", "Whipped Cream"),
  "Альтернативное Молоко": copy("Bitki mənşəli süd", "Plant-Based Milk", "Kokos, banan, soya, badam, fındıq və yulaf.", "Coconut, banana, soy, almond, hazelnut and oat.")
};

const OPTION_TRANSLATIONS = {
  az: { Pineapple: "Ananas", Orange: "Portağal" },
  ru: { Pineapple: "Ананас", Orange: "Апельсин" },
  en: {}
};

// Clopos imports store Azerbaijani text as their source. Match every known
// spelling so switching a public menu language is independent of source data.
const normalizedMenuText = (value) => String(value || "")
  .toLocaleLowerCase("ru-RU").replace(/[«»“”'’`]/g, "")
  .replace(/[—–-]/g, " ").replace(/\s+/g, " ").trim();
const TRANSLATION_BY_ANY_NAME = Object.entries(PRODUCT_TRANSLATIONS).reduce((index, [ruName, translations]) => {
  index.set(normalizedMenuText(ruName), { ruName, translations });
  Object.values(translations).forEach((entry) => entry?.name && index.set(normalizedMenuText(entry.name), { ruName, translations }));
  return index;
}, new Map());
const resolveTranslation = (product) => {
  for (const value of [product.translationKey, product.sourceName, product.name, product.ru_name, product.az_name, product.en_name]) {
    const match = TRANSLATION_BY_ANY_NAME.get(normalizedMenuText(value));
    if (match) return match;
  }
  return null;
};

export function localizeOption(option, language) {
  if (language === "en") return option;
  return Object.entries(OPTION_TRANSLATIONS[language] || {}).reduce(
    (value, [source, translated]) => value.replace(source, translated),
    option
  );
}

export function localizeProduct(product, language) {
  const sourceName = product.sourceName || product.name || "";
  const resolvedTranslation = resolveTranslation({ ...product, sourceName });
  const translationKey = resolvedTranslation?.ruName || product.translationKey || sourceName;
  if (language === "ru") {
    const name = product.ru_name || translationKey;
    const description = product.ru_description ?? product.description_ru ?? product.sourceDescription ?? product.description ?? "";
    const options = (product.sourceOptions || product.options || []).map((option) => localizeOption(option, language));
    return {
      ...product,
      sourceName,
      name,
      description,
      options,
      displayName: name,
      displayDescription: description,
      displayOptions: options
    };
  }

  const languageCopy = resolvedTranslation?.translations?.[language] || PRODUCT_TRANSLATIONS[translationKey]?.[language];
  const fieldName = product[`${language}_name`] || product[`name_${language}`];
  const fieldDescription = product[`${language}_description`] ?? product[`description_${language}`];
  const name = fieldName || languageCopy?.name || sourceName;
  const description = fieldDescription ?? languageCopy?.description ?? product.sourceDescription ?? product.description ?? "";
  const options = (product.sourceOptions || product.options || []).map((option) => localizeOption(option, language));
  return {
    ...product,
    sourceName,
    name,
    description,
    options,
    displayName: name,
    displayDescription: description,
    displayOptions: options
  };
}
