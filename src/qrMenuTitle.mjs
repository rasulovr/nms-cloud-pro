const brandNames = [
  'Barista&Chef','Bounty','Camembert','Coca-Cola','Fanta','Hennessy','Khirdalan',
  'Krombacher','Martini Fiero','Martini','New York','Nutella','Oreo','Philadelphia',
  'Red Bull','Rockefeller','Schweppes','Snickers','Sprite','Toblerone','Tropical Vibes',
  'Wagyu','Wolt','Yoda','Астория','Бариста','Кока-Кола','Нью-Йорк','Рокфеллер','Фанта','Спрайт'
];
const abbreviations = ['BBQ','BLT','IPA','NY','QR','VIP','XO','ББК'];
export function qrMenuDisplayLocale(value, language) {
  return language === 'az' && /^vitello tonnato\s*&\s*wine pairing$/iu.test(String(value).trim()) ? 'en' : language;
}
export function qrMenuTitle(value, language='en') {
  const input = String(value ?? '').trim();
  if (!input) return '';
  const locale = qrMenuDisplayLocale(input, ['ru','az','en'].includes(language) ? language : 'en');
  const toLower = text => text.toLocaleLowerCase(locale);
  const lower = toLower(input);
  const canonical = new Map([...brandNames,...abbreviations].map(name => [toLower(name),name]));
  const alternatives = [...canonical.keys()].sort((a,b)=>b.length-a.length).map(k=>k.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'));
  const re = new RegExp('(^|[^\\p{L}\\p{N}])('+alternatives.join('|')+')(?=$|[^\\p{L}\\p{N}])','gu');
  return lower.replace(re,(_,prefix,name)=>prefix+canonical.get(name))
    .replace(/^([^\p{L}]*)(\p{L})/u,(_,prefix,letter)=>prefix+letter.toLocaleUpperCase(locale));
}
