import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "./supabase";

const money = (n) => `${Number(n || 0).toFixed(2)} ₼`;
const safeText = (v) => String(v ?? "");

const PAIRINGS = {
  "ЗАВТРАК": ["КОФЕ", "ХОЛОДНЫЙ КОФЕ", "ЛИМОНАДЫ"],
  "ЗАКУСКИ": ["ЛИМОНАДЫ", "САЛАТЫ", "ХОЛОДНЫЕ НАПИТКИ"],
  "СУПЫ": ["ЗАКУСКИ", "ЧАЙ", "САЛАТЫ"],
  "САЛАТЫ": ["ЛИМОНАДЫ", "ГОРЯЧИЕ БЛЮДА", "ХОЛОДНЫЙ КОФЕ"],
  "ГОРЯЧИЕ БЛЮДА": ["ЛИМОНАДЫ", "САЛАТЫ", "ХОЛОДНЫЕ НАПИТКИ"],
  "ПИЦЦА": ["ЛИМОНАДЫ", "САЛАТЫ", "ХОЛОДНЫЕ НАПИТКИ"],
  "ДЕСЕРТЫ": ["КОФЕ", "ЧАЙ", "ХОЛОДНЫЙ КОФЕ"],
  "КОФЕ": ["ДЕСЕРТЫ", "ЗАВТРАК"],
  "ХОЛОДНЫЙ КОФЕ": ["ДЕСЕРТЫ", "ЗАВТРАК"],
  "ЛИМОНАДЫ": ["САЛАТЫ", "ГОРЯЧИЕ БЛЮДА", "ПИЦЦА"],
  "ЧАЙ": ["ДЕСЕРТЫ", "ЗАВТРАК"],
  "ХОЛОДНЫЕ НАПИТКИ": ["ГОРЯЧИЕ БЛЮДА", "ПИЦЦА", "САЛАТЫ"],
};

function getBakuHour() {
  return Number(new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Baku",
    hour: "2-digit",
    hourCycle: "h23",
  }).format(new Date()));
}

function WeatherIcon({ kind, isNight }) {
  return <div className={`wx-icon wx-${kind}`} aria-hidden="true">
    <span className="sun"/><span className="moon"/><span className="cloud c1"/><span className="cloud c2"/>
    <span className="rain r1"/><span className="rain r2"/><span className="rain r3"/>
    <span className="wind w1"/><span className="wind w2"/>
  </div>;
}

function getWeatherOffer(w) {
  if (!w) return null;
  const rainy = Number(w.precipitation) >= 1 || [51,53,55,61,63,65,80,81,82,95].includes(Number(w.weatherCode));
  const hot = Number(w.maxTemperature) >= 30 || Number(w.apparentTemperature) >= 31;
  const windy = Number(w.windSpeed) >= 9 || Number(w.windGust) >= 14;
  const cool = Number(w.maxTemperature) <= 17;
  const cloudy = [2,3,45,48].includes(Number(w.weatherCode));
  if (rainy) return { kind:"rainy", title:"Сегодня в Баку дождь", text:"Самое время согреться кофе или чаем.", categories:["КОФЕ","ЧАЙ","ДЕСЕРТЫ"] };
  if (windy) return { kind:"windy", title:"Сегодня в Баку ветрено", text:"Зайдите на чашку капучино в уютный зал.", categories:["КОФЕ","ЧАЙ","ДЕСЕРТЫ"] };
  if (hot) return { kind:"sunny", title:"В Баку сегодня жарко", text:"Самое время попробовать фирменный лимонад.", categories:["ЛИМОНАДЫ","ХОЛОДНЫЙ КОФЕ","САЛАТЫ"] };
  if (cool) return { kind:"cool", title:"Сегодня в Баку прохладно", text:"Выберите горячий напиток и свежий десерт.", categories:["КОФЕ","ЧАЙ","ДЕСЕРТЫ"] };
  if (cloudy) return { kind:"cloudy", title:"Сегодня в Баку пасмурно", text:"Добавьте к заказу любимый кофе или чай.", categories:["КОФЕ","ЧАЙ","ДЕСЕРТЫ"] };
  return { kind:"sunny", title:"Комфортная погода в Баку", text:"Подходящий день попробовать что-то новое.", categories:["Новинки","ЛИМОНАДЫ","САЛАТЫ"] };
}

export default function QRMenu() {
  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const branch = safeText(params.get("branch") || "BC1").toUpperCase();
  const table = safeText(params.get("table") || "1");
  const [screen, setScreen] = useState("menu");
  const [menu, setMenu] = useState([]);
  const [category, setCategory] = useState("Все");
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState([]);
  const [selected, setSelected] = useState(null);
  const [selectedOption, setSelectedOption] = useState("");
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");
  const [order, setOrder] = useState(null);
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [bonusRequest, setBonusRequest] = useState(0);
  const [busy, setBusy] = useState(false);
  const [bakuHour, setBakuHour] = useState(getBakuHour());
  const isNight = bakuHour >= 19 || bakuHour < 5;

  const flash = (text) => { setNotice(text); window.setTimeout(() => setNotice(""), 3500); };

  async function loadMenu() {
    setLoading(true);
    const { data, error } = await supabase.rpc("qr_get_public_menu", { p_branch_code: branch });
    if (error) flash(`Меню временно недоступно: ${error.message}`);
    setMenu(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  async function loadProfile() {
    const { data } = await supabase.rpc("qr_get_my_loyalty");
    setProfile(Array.isArray(data) ? data[0] || null : data || null);
  }

  async function refreshOrder(token = order?.public_token) {
    if (!token) return;
    const { data, error } = await supabase.rpc("qr_get_order", { p_public_token: token });
    if (!error && data) setOrder(Array.isArray(data) ? data[0] : data);
  }

  useEffect(() => {
    const updateBakuHour = () => setBakuHour(getBakuHour());
    const timer = window.setInterval(updateBakuHour, 60_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    loadMenu();
    const stored = sessionStorage.getItem(`rms-order:${branch}:${table}`);
    if (stored) refreshOrder(stored);
    const { data: sub } = supabase.auth.onAuthStateChange((_event, current) => {
      setSession(current);
      if (current) window.setTimeout(loadProfile, 0); else setProfile(null);
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session) loadProfile();
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const endpoint = "https://api.open-meteo.com/v1/forecast?latitude=40.4093&longitude=49.8671&timezone=Asia%2FBaku&forecast_days=1&current=temperature_2m%2Capparent_temperature%2Cweather_code%2Cwind_speed_10m%2Cwind_gusts_10m&daily=temperature_2m_max%2Cprecipitation_sum&wind_speed_unit=ms";
    fetch(endpoint).then(r => r.ok ? r.json() : Promise.reject()).then(d => setWeather({
      temperature:Number(d.current?.temperature_2m || 0), apparentTemperature:Number(d.current?.apparent_temperature || 0),
      maxTemperature:Number(d.daily?.temperature_2m_max?.[0] || 0), precipitation:Number(d.daily?.precipitation_sum?.[0] || 0),
      windSpeed:Number(d.current?.wind_speed_10m || 0), windGust:Number(d.current?.wind_gusts_10m || 0), weatherCode:Number(d.current?.weather_code || 0)
    })).catch(() => setWeather(null));
  }, []);

  useEffect(() => {
    if (!order?.public_token || ["paid","cancelled"].includes(order.status)) return;
    const timer = window.setInterval(() => refreshOrder(order.public_token), 12000);
    return () => window.clearInterval(timer);
  }, [order?.public_token, order?.status]);

  useEffect(() => {
    if (!selected) return;
    const esc = (e) => e.key === "Escape" && setSelected(null);
    window.addEventListener("keydown", esc); document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", esc); document.body.style.overflow = ""; };
  }, [selected]);

  const categories = useMemo(() => ["Все", ...new Set(menu.map(x => x.category_name).filter(Boolean))], [menu]);
  const shown = useMemo(() => menu.filter(x => (category === "Все" || x.category_name === category) && `${x.name} ${x.description}`.toLowerCase().includes(search.toLowerCase())), [menu, category, search]);
  const cartTotal = cart.reduce((s, x) => s + Number(x.price) * x.qty, 0);
  const cartCount = cart.reduce((s, x) => s + x.qty, 0);
  const wx = useMemo(() => getWeatherOffer(weather), [weather]);
  const weatherPicks = useMemo(() => wx ? menu.filter(x => wx.categories.includes(x.category_name)).slice(0,3) : [], [menu, wx]);
  const pairings = useMemo(() => selected ? menu.filter(x => x.id !== selected.id && (PAIRINGS[selected.category_name] || []).includes(x.category_name)).slice(0,3) : [], [menu, selected]);

  const openProduct = (item) => { setSelected(item); setSelectedOption(""); };
  const add = (item, optionName = "") => setCart(prev => {
    const key = `${item.id}:${optionName}`;
    const found = prev.find(x => x.cart_key === key);
    return found ? prev.map(x => x.cart_key === key ? {...x, qty:x.qty+1} : x) : [...prev, {...item, cart_key:key, option_name:optionName || null, qty:1}];
  });
  const qty = (key, delta) => setCart(prev => prev.map(x => x.cart_key === key ? {...x, qty:x.qty+delta} : x).filter(x => x.qty > 0));

  async function sendOtp() {
    const normalized = phone.replace(/\s+/g, "");
    if (!/^\+994\d{9}$/.test(normalized)) return flash("Введите номер в формате +994XXXXXXXXX");
    setBusy(true);
    const { error } = await supabase.auth.signInWithOtp({ phone: normalized });
    setBusy(false);
    if (error) return flash(error.message);
    setOtpSent(true); flash("Код отправлен");
  }

  async function verifyOtp() {
    setBusy(true);
    const { error } = await supabase.auth.verifyOtp({ phone: phone.replace(/\s+/g, ""), token: otp, type:"sms" });
    setBusy(false);
    if (error) return flash("Неверный или просроченный код");
    setOtpSent(false); setOtp(""); await loadProfile(); flash("Вход выполнен");
  }

  async function createOrder() {
    if (!cart.length || busy) return;
    setBusy(true);
    const items = cart.map(x => ({ menu_item_id:x.id, quantity:x.qty, option_name:x.option_name || null, note:x.note || null }));
    const { data, error } = await supabase.rpc("qr_create_order", {
      p_branch_code:branch, p_table_code:table, p_items:items, p_bonus_requested:Number(bonusRequest || 0)
    });
    setBusy(false);
    if (error) return flash(error.message);
    const created = Array.isArray(data) ? data[0] : data;
    setOrder(created); setCart([]); setBonusRequest(0); setScreen("bill");
    sessionStorage.setItem(`rms-order:${branch}:${table}`, created.public_token);
    flash("Заказ отправлен");
  }

  async function callWaiter(kind="waiter") {
    const { error } = await supabase.rpc("qr_create_waiter_call", { p_branch_code:branch, p_table_code:table, p_call_type:kind, p_order_token:order?.public_token || null });
    flash(error ? error.message : kind === "payment" ? "Запрос оплаты отправлен" : "Официант вызван");
  }

  const maxBonus = Math.max(0, Math.min(Number(profile?.available_bonus || 0), cartTotal * .30));

  return <div className="qr-app">
    <style>{CSS}</style>
    <header><div><span className="eyebrow">BARISTA&CHEF</span><h1>QR MENU</h1><small>{branch} · Стол {table}</small></div><button className="round" onClick={() => setScreen("loyalty")}>♙</button></header>
    <nav>
      <button className={screen==="menu"?"active":""} onClick={() => setScreen("menu")}>Меню</button>
      <button className={screen==="cart"?"active":""} onClick={() => setScreen("cart")}>Заказ {cartCount ? `(${cartCount})` : ""}</button>
      <button className={screen==="bill"?"active":""} onClick={() => setScreen("bill")}>Счёт</button>
      <button onClick={() => callWaiter("waiter")}>Вызов</button>
    </nav>
    {notice && <div className="toast">{notice}</div>}

    {screen === "menu" && <main>
      {wx && <section className={`weather ${wx.kind}${isNight ? " night" : ""}`}>
        <WeatherIcon kind={wx.kind} isNight={isNight}/><div className="weather-copy"><b>{wx.title}</b><p>{wx.text}</p>
          <div className="metrics"><span>{Math.round(weather.temperature)}°<small>сейчас</small></span><span>{Math.round(weather.windSpeed)} м/с<small>ветер</small></span><span>{Number(weather.precipitation).toFixed(1)} мм<small>осадки</small></span></div>
        </div>
        <div className="picks">{weatherPicks.map(x => <button key={x.id} onClick={() => openProduct(x)}><img src={x.image_url || FALLBACK} alt=""/><span>{x.name}</span></button>)}</div>
      </section>}
      <div className="search"><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Поиск по меню"/></div>
      <div className="chips">{categories.map(c => <button key={c} className={category===c?"active":""} onClick={() => setCategory(c)}>{c}</button>)}</div>
      {loading ? <div className="state">Загружаем меню…</div> : !shown.length ? <div className="state">В этой категории пока нет доступных позиций.</div> : <div className="grid">{shown.map(item => <article key={item.id} className="card">
        <button className="photo" onClick={() => openProduct(item)}><img src={item.image_url || FALLBACK} alt={item.name}/></button>
        <div className="card-body"><small>{item.category_name}</small><h3>{item.name}</h3>{item.description && <p>{item.description}</p>}<div><b>{money(item.price)}</b><button className="plus" onClick={() => item.options?.length ? openProduct(item) : add(item)}>+</button></div></div>
      </article>)}</div>}
    </main>}

    {screen === "cart" && <main><h2>Ваш заказ</h2>{!cart.length ? <div className="state">Корзина пока пуста.</div> : <>
      <div className="lines">{cart.map(x => <div className="line" key={x.cart_key}><img src={x.image_url || FALLBACK} alt=""/><div><b>{x.name}</b>{x.option_name && <small>{x.option_name}</small>}<small>{money(x.price)}</small></div><div className="counter"><button onClick={() => qty(x.cart_key,-1)}>−</button><span>{x.qty}</span><button onClick={() => qty(x.cart_key,1)}>+</button></div></div>)}</div>
      {session && profile && <section className="bonus"><b>Доступно бонусов: {money(profile.available_bonus)}</b><small>Можно списать до 30% заказа — максимум {money(maxBonus)}</small><input type="number" min="0" max={maxBonus} step="0.1" value={bonusRequest} onChange={e => setBonusRequest(Math.min(maxBonus, Math.max(0, Number(e.target.value))))}/></section>}
      <div className="total"><span>Итого</span><b>{money(cartTotal)}</b></div><button className="primary" disabled={busy} onClick={createOrder}>{busy ? "Отправляем…" : "Отправить заказ"}</button>
    </>}</main>}

    {screen === "bill" && <main><h2>Счёт</h2>{!order ? <div className="state">Активного заказа нет.</div> : <section className="bill">
      <div className={`status ${order.status}`}>{({new:"Принят",confirmed:"Подтверждён",preparing:"Готовится",ready:"Готов",payment_requested:"Запрошена оплата",paid:"Оплачен",cancelled:"Отменён"})[order.status] || order.status}</div>
      <div className="bill-no">Заказ № {order.order_number}</div>
      {(order.items || []).map((x,i) => <div className="bill-line" key={i}><span>{x.name} × {x.quantity}</span><b>{money(x.line_total)}</b></div>)}
      <div className="bill-line"><span>Бонусы</span><b>− {money(order.bonus_reserved)}</b></div><div className="total"><span>К оплате</span><b>{money(order.payable_amount)}</b></div>
      {order.status !== "paid" && order.status !== "cancelled" && <button className="primary" onClick={() => callWaiter("payment")}>Попросить счёт</button>}
      {order.status === "paid" && <p className="success">Оплата подтверждена. Cashback начислен на денежную часть счёта.</p>}
    </section>}</main>}

    {screen === "loyalty" && <main><h2>Loyalty</h2>{!session ? <section className="login"><p>Войдите по номеру телефона, чтобы использовать бонусы и видеть историю.</p><input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+994XXXXXXXXX"/>{otpSent && <input value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g,""))} inputMode="numeric" placeholder="Код из SMS"/>}<button className="primary" disabled={busy} onClick={otpSent ? verifyOtp : sendOtp}>{otpSent ? "Подтвердить код" : "Получить код"}</button></section> : <section className="loyalty-card">
      <small>{profile?.tier_name || "Member"}</small><strong>{money(profile?.available_bonus)} бонусов</strong><span>{profile?.visits || 0} визитов · {money(profile?.lifetime_spend)} покупок</span>
      <div className="history">{(profile?.history || []).map((h,i) => <div key={i}><span>{h.description}<small>{new Date(h.created_at).toLocaleDateString("ru-RU")}</small></span><b className={Number(h.amount)>=0?"earn":"redeem"}>{Number(h.amount)>=0?"+":""}{money(h.amount)}</b></div>)}</div>
      <button className="ghost" onClick={() => supabase.auth.signOut()}>Выйти</button>
    </section>}</main>}

    {selected && <div className="modal" onMouseDown={e => e.target===e.currentTarget && setSelected(null)}><div className="dialog"><button className="close" onClick={() => setSelected(null)}>×</button><img className="hero" src={selected.image_url || FALLBACK} alt={selected.name}/><div className="dialog-copy"><small>{selected.category_name}</small><h2>{selected.name}</h2><p>{selected.description}</p>{selected.options?.length>0 && <div className="options"><b>Выберите вариант</b>{selected.options.map(o => <button className={selectedOption===o?"active":""} key={o} onClick={() => setSelectedOption(o)}>{o}</button>)}</div>}<div className="modal-price"><b>{money(selected.price)}</b><button className="primary" onClick={() => {if(selected.options?.length && !selectedOption)return flash("Выберите вариант");add(selected,selectedOption);flash("Добавлено в заказ");}}>Добавить</button></div>{pairings.length>0 && <><h3>С этим блюдом берут</h3><div className="pairings">{pairings.map(x => <button key={x.id} onClick={() => x.options?.length ? openProduct(x) : add(x)}><img src={x.image_url || FALLBACK} alt=""/><span>{x.name}<b>{money(x.price)}</b></span><i>+</i></button>)}</div></>}</div></div></div>}
  </div>;
}

const FALLBACK = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='900' height='600'%3E%3Crect width='100%25' height='100%25' fill='%23eee8dc'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%23685f52' font-family='Arial' font-size='36'%3EBARISTA%26CHEF%3C/text%3E%3C/svg%3E";

const CSS = `
:root{font-family:Inter,system-ui,-apple-system,sans-serif;color:#17231d;background:#f5f2eb}*{box-sizing:border-box}body{margin:0;background:#f5f2eb}.qr-app{min-height:100vh;padding-bottom:88px}header{display:flex;justify-content:space-between;align-items:center;padding:22px max(20px,calc((100vw - 1180px)/2));background:#183b2c;color:white}h1,h2,h3,p{margin-top:0}header h1{margin:2px 0;font-size:24px;letter-spacing:.12em}.eyebrow{font-size:11px;letter-spacing:.2em;color:#d4b26a}header small{color:#d5ded9}.round{border:1px solid #ffffff55;background:#ffffff10;color:#fff;width:42px;height:42px;border-radius:50%;font-size:22px}nav{position:sticky;top:0;z-index:20;display:flex;justify-content:center;gap:6px;padding:10px;background:#fffffff2;backdrop-filter:blur(12px);box-shadow:0 3px 20px #0000000b}nav button,.chips button{border:0;background:transparent;padding:10px 16px;border-radius:999px;color:#536059;font-weight:700}nav button.active,.chips button.active{background:#183b2c;color:white}main{max-width:1180px;margin:0 auto;padding:24px 20px}.toast{position:fixed;z-index:80;left:50%;bottom:82px;transform:translateX(-50%);background:#17231d;color:#fff;padding:12px 18px;border-radius:12px;box-shadow:0 10px 30px #0004}.weather{position:relative;overflow:hidden;display:grid;grid-template-columns:150px 1fr 340px;gap:18px;align-items:center;padding:22px;border-radius:25px;color:white;margin-bottom:22px;min-height:190px}.weather.sunny{background:linear-gradient(135deg,#df8e31,#f5bd5c)}.weather.windy{background:linear-gradient(135deg,#66889a,#99aeb8)}.weather.rainy{background:linear-gradient(135deg,#3d6177,#7895a7)}.weather.cloudy{background:linear-gradient(135deg,#6e7a82,#a8afb2)}.weather.cool{background:linear-gradient(135deg,#477d8d,#86b4bd)}.weather-copy{z-index:2}.weather-copy b{font-size:24px}.weather-copy p{margin:6px 0 16px}.metrics{display:flex;gap:25px}.metrics span{font-size:17px;font-weight:800}.metrics small{display:block;font-size:10px;text-transform:uppercase;opacity:.72;font-weight:600}.picks{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;z-index:2}.picks button{border:0;background:#ffffff20;padding:7px;border-radius:15px;color:white;text-align:left}.picks img{width:100%;height:66px;object-fit:cover;border-radius:10px}.picks span{display:block;font-size:11px;padding:6px 2px 2px}.wx-icon{position:relative;width:140px;height:130px}.sun{position:absolute;width:70px;height:70px;border-radius:50%;background:#ffd76b;top:10px;left:20px;box-shadow:0 0 0 14px #ffd76b33}.cloud{display:block;position:absolute;width:100px;height:36px;background:#e7eef1;border-radius:30px;left:26px;top:65px;box-shadow:20px -20px 0 -3px #e7eef1,-20px -10px 0 -8px #e7eef1}.c2{left:48px;top:82px;transform:scale(.72);opacity:.75}.wx-windy .sun,.wx-rainy .sun,.wx-cloudy .sun,.wx-cool .sun{display:none}.rain{display:none;position:absolute;width:4px;height:22px;background:#bce8ff;border-radius:4px;top:110px;transform:rotate(16deg)}.wx-rainy .rain{display:block}.r1{left:48px}.r2{left:76px}.r3{left:104px}.wind{display:none;position:absolute;width:95px;height:3px;border-radius:4px;background:#fff;left:10px;top:45px}.wx-windy .cloud{opacity:.85}.wx-windy .wind{display:block;animation:wind 1.6s ease-in-out infinite}.w2{top:105px;left:28px;animation-delay:.5s!important}@keyframes wind{50%{transform:translateX(20px);opacity:.45}}.search input,.login input,.bonus input{width:100%;border:1px solid #d9d6cf;background:white;padding:14px 16px;border-radius:14px;font-size:16px}.chips{display:flex;gap:8px;overflow:auto;padding:14px 0 18px}.chips button{background:#ebe7de;white-space:nowrap}.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:16px}.card{overflow:hidden;background:white;border-radius:18px;box-shadow:0 5px 22px #253a2f0d}.photo{display:block;border:0;padding:0;width:100%;background:#eee}.photo img{display:block;width:100%;aspect-ratio:4/3;object-fit:cover}.card-body{padding:14px}.card-body small,.dialog-copy>small{color:#99825a;text-transform:uppercase;font-size:10px;font-weight:800}.card-body h3{margin:5px 0 8px;font-size:17px}.card-body p{font-size:12px;color:#707872;height:45px;overflow:hidden}.card-body>div{display:flex;justify-content:space-between;align-items:center}.plus{border:0;background:#183b2c;color:white;border-radius:50%;width:35px;height:35px;font-size:22px}.state{padding:50px 20px;text-align:center;color:#7b817d;background:white;border-radius:18px}.lines,.bill,.login,.loyalty-card,.bonus{background:white;border-radius:18px;padding:18px}.line{display:grid;grid-template-columns:62px 1fr auto;gap:12px;align-items:center;padding:10px 0;border-bottom:1px solid #eee}.line img{width:62px;height:52px;object-fit:cover;border-radius:10px}.line small{display:block;color:#7a807d;margin-top:4px}.counter{display:flex;align-items:center;gap:8px}.counter button{width:30px;height:30px;border:0;border-radius:50%;background:#eee9df;font-size:18px}.total{display:flex;justify-content:space-between;align-items:center;font-size:20px;padding:18px 0}.primary{width:100%;border:0;border-radius:14px;padding:15px;background:#183b2c;color:white;font-size:15px;font-weight:800}.primary:disabled{opacity:.55}.bonus{margin-top:14px;background:#eee8d9}.bonus small{display:block;margin:4px 0 10px}.status{display:inline-block;padding:7px 12px;border-radius:999px;background:#efe6c6;color:#715a12;font-weight:800}.status.paid{background:#dbefe0;color:#236237}.status.cancelled{background:#f4dcdc;color:#8c2d2d}.bill-no{margin:15px 0;color:#7b817d}.bill-line{display:flex;justify-content:space-between;padding:9px 0;border-bottom:1px solid #eee}.success{padding:14px;background:#e3f2e7;border-radius:12px;color:#245f37}.login{max-width:480px}.login input{margin:7px 0}.loyalty-card{max-width:620px;background:linear-gradient(135deg,#183b2c,#2d5b46);color:white}.loyalty-card>small,.loyalty-card>span{display:block;opacity:.74}.loyalty-card>strong{display:block;font-size:30px;margin:8px 0}.history{margin:22px 0;background:#ffffff12;border-radius:14px;padding:6px 14px}.history>div{display:flex;justify-content:space-between;padding:12px 0;border-bottom:1px solid #ffffff18}.history small{display:block;opacity:.6;margin-top:3px}.earn{color:#a8e5b8}.redeem{color:#ffd0c5}.ghost{border:1px solid #ffffff55;background:transparent;color:white;padding:10px 16px;border-radius:10px}.modal{position:fixed;inset:0;z-index:60;background:#0b1510cc;display:flex;align-items:center;justify-content:center;padding:20px}.dialog{position:relative;display:grid;grid-template-columns:1.08fr .92fr;background:white;border-radius:24px;overflow:hidden;max-width:980px;width:100%;max-height:92vh}.close{position:absolute;right:14px;top:14px;z-index:2;border:0;border-radius:50%;width:40px;height:40px;background:#fff;font-size:26px;box-shadow:0 3px 15px #0002}.hero{width:100%;height:100%;max-height:92vh;object-fit:cover}.dialog-copy{padding:32px;overflow:auto}.dialog-copy h2{font-size:30px;margin:7px 0}.dialog-copy p{color:#69716c;line-height:1.6}.modal-price{display:flex;align-items:center;gap:25px;margin:22px 0}.modal-price>b{font-size:24px}.modal-price .primary{width:auto;padding:12px 24px}.pairings{display:grid;gap:9px}.pairings button{display:grid;grid-template-columns:52px 1fr 28px;gap:10px;align-items:center;text-align:left;border:0;background:#f4f1ea;padding:7px;border-radius:12px}.pairings img{width:52px;height:46px;object-fit:cover;border-radius:8px}.pairings b{display:block;color:#7c6a47;font-size:12px}.pairings i{font-style:normal;font-size:22px}
.options{display:flex;flex-wrap:wrap;gap:7px;margin:16px 0}.options>b{width:100%;font-size:13px}.options button{border:1px solid #d7d2c8;background:#f4f1ea;padding:9px 11px;border-radius:10px;text-align:left}.options button.active{background:#183b2c;color:#fff;border-color:#183b2c}
@media(max-width:850px){.weather{grid-template-columns:110px 1fr}.picks{grid-column:1/-1}.grid{grid-template-columns:repeat(2,1fr)}.dialog{grid-template-columns:1fr;overflow:auto}.hero{height:42vh}.dialog-copy{overflow:visible}.wx-icon{transform:scale(.8);transform-origin:left center}}
@media(max-width:560px){header{padding:17px 16px}nav{justify-content:flex-start;overflow:auto}nav button{padding:9px 12px;white-space:nowrap}main{padding:16px 12px}.weather{display:block;padding:18px;min-height:0}.wx-icon{position:absolute;right:-18px;top:-10px;left:auto;opacity:.72;transform:scale(.72)}.weather-copy{position:relative}.weather-copy b{display:block;max-width:70%;font-size:20px}.weather-copy p{max-width:72%;min-height:42px}.metrics{position:relative;z-index:3;gap:16px;padding-top:10px;margin-top:8px;border-top:1px solid #ffffff35}.metrics span{font-size:14px}.picks{position:relative;margin-top:16px}.picks img{height:58px}.grid{gap:10px}.card-body{padding:11px}.card-body h3{font-size:14px}.card-body p{display:none}.dialog-copy{padding:22px 18px}.dialog-copy h2{font-size:25px}.modal{padding:8px}.line{grid-template-columns:52px 1fr auto}.line img{width:52px;height:48px}}

/* Production visual sync with the approved QR Menu test build. */
.round{border-color:#ffffff24;background:#ffffff0b}
nav{border-bottom:1px solid #183b2c12}
.weather.night{background:radial-gradient(circle at 15% 15%,#2d4770 0,transparent 24%),linear-gradient(135deg,#071321,#142941 58%,#1d3550);box-shadow:inset 0 1px 0 #ffffff14}
.weather.night .weather-copy p{color:#d6e0ea}
.weather.night .picks button{background:#ffffff12;border:1px solid #ffffff12}
.moon{display:none;position:absolute;width:64px;height:64px;border-radius:50%;background:#f5efcf;top:8px;left:20px;box-shadow:0 0 0 11px #dbe8ff14,0 0 28px #dce8ff55}
.moon:after{content:"";position:absolute;width:57px;height:57px;border-radius:50%;background:#12263e;left:17px;top:-5px}
.weather.night .sun{display:none}
.weather.night .moon{display:block}
.weather.night .cloud{background:#d3dce6;box-shadow:20px -20px 0 -3px #d3dce6,-20px -10px 0 -8px #d3dce6;opacity:.82}
.picks img,.photo img,.line img,.hero,.pairings img{object-fit:contain;background:#ecece5}
@media(max-width:560px){.metrics{padding-top:14px;margin-top:12px;border-top:0}}
`;
