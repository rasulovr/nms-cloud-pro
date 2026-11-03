// Open-Meteo current model conditions for Baku, not a fixed placeholder or daily high.
export const BAKU_WEATHER_URL = "https://api.open-meteo.com/v1/forecast?latitude=40.4093&longitude=49.8671&timezone=Asia%2FBaku&timeformat=unixtime&forecast_days=1&current=temperature_2m%2Capparent_temperature%2Cweather_code%2Cwind_speed_10m%2Cwind_gusts_10m&daily=temperature_2m_max%2Cprecipitation_sum&wind_speed_unit=ms";
export const WEATHER_MAX_AGE = 60 * 60 * 1000;
export const WEATHER_REFRESH = 15 * 60 * 1000;
const codes = new Set([0, 1, 2, 3, 45, 48, 51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 71, 73, 75, 77, 80, 81, 82, 85, 86, 95, 96, 99]);
const numberIn = (value, min, max) => typeof value === "number" && Number.isFinite(value) && value >= min && value <= max;
export const isFreshWeather = (weather, now = Date.now()) => Boolean(weather && numberIn(weather.observedAt, now - WEATHER_MAX_AGE, now + 5 * 60 * 1000));

export function normalizeBakuWeather(data, now = Date.now()) {
  const c = data?.current, u = data?.current_units, d = data?.daily;
  if (!c || data.timezone !== "Asia/Baku" || !numberIn(data.latitude, 40.2, 40.6) || !numberIn(data.longitude, 49.6, 50.1)
    || u?.temperature_2m !== "°C" || u?.apparent_temperature !== "°C" || u?.wind_speed_10m !== "m/s" || u?.wind_gusts_10m !== "m/s"
    || !numberIn(c.temperature_2m, -80, 65) || !numberIn(c.apparent_temperature, -100, 80)
    || !numberIn(c.wind_speed_10m, 0, 150) || !numberIn(c.wind_gusts_10m, 0, 150) || !codes.has(c.weather_code)
    || !numberIn(c.time, 1, Number.MAX_SAFE_INTEGER) || !isFreshWeather({ observedAt: c.time * 1000 }, now)
    || data.daily_units?.temperature_2m_max !== "°C" || data.daily_units?.precipitation_sum !== "mm"
    || !numberIn(d?.temperature_2m_max?.[0], -80, 65) || !numberIn(d?.precipitation_sum?.[0], 0, 2000)) return null;
  const bakuDay = (timestamp) => new Date(timestamp + 4 * 60 * 60 * 1000).toISOString().slice(0, 10);
  if (!numberIn(d.time?.[0], (now - 36 * 60 * 60 * 1000) / 1000, (now + 24 * 60 * 60 * 1000) / 1000) || bakuDay(d.time[0] * 1000) !== bakuDay(now)) return null;
  return { temperature: c.temperature_2m, apparentTemperature: c.apparent_temperature,
    maxTemperature: d.temperature_2m_max[0], precipitation: d.precipitation_sum[0],
    windSpeed: c.wind_speed_10m, windGust: c.wind_gusts_10m, weatherCode: c.weather_code,
    observedAt: c.time * 1000 };
}

// No persistent/browser response cache. Timestamp validation also rejects old provider responses.
export function startBakuWeather(onChange, { fetchImpl = fetch, now = Date.now, timers = globalThis } = {}) {
  let active = true, generation = 0, controller, timeout, current = null;
  const unavailable = () => { current = null; onChange(null, "unavailable"); };
  const load = async () => {
    const request = ++generation;
    controller?.abort();
    timers.clearTimeout(timeout);
    const pending = new AbortController();
    controller = pending;
    timeout = timers.setTimeout(() => {
      if (active && request === generation) { pending.abort(); unavailable(); }
    }, 10000);
    try {
      const response = await fetchImpl(BAKU_WEATHER_URL, { cache: "no-store", signal: pending.signal });
      if (!response.ok) throw new Error("Weather unavailable");
      const next = normalizeBakuWeather(await response.json(), now());
      if (!next) throw new Error("Weather invalid or stale");
      if (active && request === generation && !pending.signal.aborted) {
        current = next; onChange(next, "ready");
      }
    } catch {
      if (active && request === generation && !pending.signal.aborted) unavailable();
    } finally {
      if (request === generation) timers.clearTimeout(timeout);
    }
  };
  onChange(null, "loading");
  load();
  const refresh = timers.setInterval(load, WEATHER_REFRESH);
  const expiry = timers.setInterval(() => {
    if (current && !isFreshWeather(current, now())) unavailable();
  }, 60000);
  return () => {
    active = false; ++generation; controller?.abort();
    timers.clearTimeout(timeout); timers.clearInterval(refresh); timers.clearInterval(expiry);
  };
}

const labels = {
  ru: { loading: "Загрузка погоды…", unavailable: "Погода недоступна", clear: "Ясно", partly: "Переменная облачность", cloudy: "Пасмурно", fog: "Туман", rain: "Дождь", snow: "Снег", storm: "Гроза" },
  az: { loading: "Hava yüklənir…", unavailable: "Hava məlumatı yoxdur", clear: "Açıq", partly: "Qismən buludlu", cloudy: "Buludlu", fog: "Dumanlı", rain: "Yağışlı", snow: "Qarlı", storm: "Tufanlı" },
  en: { loading: "Loading weather…", unavailable: "Weather unavailable", clear: "Clear", partly: "Partly cloudy", cloudy: "Cloudy", fog: "Fog", rain: "Rain", snow: "Snow", storm: "Thunderstorm" }
};
export function currentWeatherPresentation(weather, status, language, isNight = false) {
  const t = labels[language] || labels.en;
  if (!weather) return { label: t[status === "loading" ? "loading" : "unavailable"], icon: "—" };
  const code = weather.weatherCode;
  const kind = code <= 1 ? "clear" : code === 2 ? "partly" : code === 3 ? "cloudy" : code <= 48 ? "fog" : code >= 95 ? "storm" : [71, 73, 75, 77, 85, 86].includes(code) ? "snow" : "rain";
  return { label: t[kind], icon: { clear: isNight ? "☾" : "☀", partly: isNight ? "☁" : "⛅", cloudy: "☁", fog: "🌫", rain: "🌧", snow: "❄", storm: "⛈" }[kind] };
}
