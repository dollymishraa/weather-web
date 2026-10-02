(function () {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const stateSel = $("state"), citySel = $("city"), out = $("output");
  const searchIn = $("search"), results = $("search-results");

  const CODES = {
    0: "Clear sky", 1: "Mainly clear", 2: "Partly cloudy", 3: "Overcast", 45: "Fog", 48: "Rime fog",
    51: "Light drizzle", 53: "Drizzle", 55: "Heavy drizzle", 56: "Freezing drizzle", 57: "Freezing drizzle",
    61: "Light rain", 63: "Rain", 65: "Heavy rain", 66: "Freezing rain", 67: "Freezing rain",
    71: "Light snow", 73: "Snow", 75: "Heavy snow", 77: "Snow grains",
    80: "Rain showers", 81: "Rain showers", 82: "Violent showers", 85: "Snow showers", 86: "Snow showers",
    95: "Thunderstorm", 96: "Thunderstorm with hail", 99: "Thunderstorm with hail"
  };
  const COMPASS = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  const AQI = [[50, "Good air"], [100, "Moderate"], [150, "Unhealthy (sensitive)"], [200, "Unhealthy"], [300, "Very unhealthy"], [Infinity, "Hazardous"]];
  const UV = [[2, "Low"], [5, "Moderate"], [7, "High"], [10, "Very high"], [Infinity, "Extreme"]];
  const HUMIDITY = [[30, "Dry"], [60, "Comfortable"], [80, "Humid"], [Infinity, "Very humid"]];

  let requestId = 0;

  function getWeatherBackground(code) {
  // Thunderstorm
  if (code >= 95) {
    return "images/storm.jpg";
  }

  // Snow
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) {
    return "images/snow.jpg";
  }

  // Rain / drizzle / freezing rain / showers
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) {
    return "images/rain.jpg";
  }

  // Sunny / clear
  if (code === 0 || code === 1) {
    return "images/clear.jpg";
  }

  // Cloudy + partly cloudy + fog
  return "images/cloudy.jpg";
}

  // ---------- Small line icons (no emoji) ----------
  const ICONS = {
    sun: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="4.2"/><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/></svg>',
    cloud: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M7 18h10a4 4 0 0 0 .4-8 5.5 5.5 0 0 0-10.6 1.8A3.5 3.5 0 0 0 7 18Z"/></svg>',
    partly: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="8" r="3"/><path d="M8 2.5v1.5M8 12v1.5M2.5 8H4M12 8h1.5M4.2 4.2l1 1M10.8 4.2l-1 1"/><path d="M10 19h7.5a3.5 3.5 0 0 0 .3-7 4.8 4.8 0 0 0-9.2 1.5A3 3 0 0 0 10 19Z"/></svg>',
    rain: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M7 15h9a4 4 0 0 0 .4-8 5.5 5.5 0 0 0-10.6 1.8A3.5 3.5 0 0 0 7 15Z"/><path d="M8 18l-1 3M12 18l-1 3M16 18l-1 3"/></svg>',
    storm: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M7 13h9a4 4 0 0 0 .4-8 5.5 5.5 0 0 0-10.6 1.8A3.5 3.5 0 0 0 7 13Z"/><path d="M13 14l-3 5h3l-2 4"/></svg>',
    snow: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M7 13h9a4 4 0 0 0 .4-8 5.5 5.5 0 0 0-10.6 1.8A3.5 3.5 0 0 0 7 13Z"/><path d="M9 18v4M9 18l-1.6 1M9 18l1.6 1M15 18v4M15 18l-1.6 1M15 18l1.6 1"/></svg>',
    fog: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M4 9h13M3 13h16M6 17h12"/></svg>'
  };

  function iconFor(code) {
    if (code >= 95) return ICONS.storm;
    if ((code >= 71 && code <= 77) || code === 85 || code === 86) return ICONS.snow;
    if (code === 45 || code === 48) return ICONS.fog;
    if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return ICONS.rain;
    if (code <= 1) return ICONS.sun;
    if (code === 2) return ICONS.partly;
    return ICONS.cloud;
  }

  // ---------- Helpers ----------
  const desc = (code) => CODES[code] || "Unknown";
  const dirName = (deg) => COMPASS[Math.round(deg / 45) % 8];
  const level = (value, steps) => steps.find((s) => value <= s[0])[1];
  const percent = (value, max) => Math.max(0, Math.min(100, (value / max) * 100));
  const time12 = (iso) => new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
  const hour12 = (iso) => new Date(iso).toLocaleTimeString("en-IN", { hour: "numeric", hour12: true });
  const shortHour = (iso) => { const h = new Date(iso).getHours(); return (h % 12 || 12) + (h < 12 ? "a" : "p"); };
  const dayName = (iso, i) => i === 0 ? "Today" :
    new Date(iso + "T00:00:00").toLocaleDateString("en-IN", { weekday: "short" });

  function hourIndex(w) {
    const i = w.hourly.time.findIndex((t) => t.startsWith(w.current.time.slice(0, 13)));
    return i < 0 ? 0 : i;
  }

  // ---------- API ----------
  const query = (obj) => new URLSearchParams(obj).toString();

  const weatherUrl = (lat, lon) => "https://api.open-meteo.com/v1/forecast?" + query({
    latitude: lat, longitude: lon, timezone: "Asia/Kolkata", forecast_days: 7,
    current: "temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m,wind_direction_10m,wind_gusts_10m,surface_pressure,dew_point_2m,is_day",
    hourly: "temperature_2m,precipitation_probability,weather_code,uv_index",
    daily: "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum,sunrise,sunset,uv_index_max"
  });

  const airUrl = (lat, lon) => "https://air-quality-api.open-meteo.com/v1/air-quality?" + query({
    latitude: lat, longitude: lon, timezone: "Asia/Kolkata", current: "us_aqi,pm2_5,pm10"
  });

  async function getJson(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error("API returned status " + res.status);
    return res.json();
  }

  // ---------- Card builders ----------
  const card = (title, body, cls, badge) =>
    `<section class="card ${cls}">${badge ? `<span class="badge">${badge}</span>` : ""}${title ? `<h2>${title}</h2>` : ""}${body}</section>`;
  const tile = (label, value) => `<div class="tile"><span>${label}</span><strong>${value}</strong></div>`;
  const meter = (p) => `<div class="meter"><i style="left:${p}%"></i></div>`;

  function currentCard(city, state, w) {
    const c = w.current, d = w.daily;
    return card("Current weather", `
      <div class="place">${city}, ${state}</div>
      <div class="now">${iconFor(c.weather_code)}<div class="temp">${Math.round(c.temperature_2m)}&deg;C</div></div>
      <div class="condition">${desc(c.weather_code)}</div>
      <div class="sub">Feels like ${Math.round(c.apparent_temperature)}&deg;C</div>
      <div class="tiles">
        ${tile("High", Math.round(d.temperature_2m_max[0]) + "&deg;C")}
        ${tile("Low", Math.round(d.temperature_2m_min[0]) + "&deg;C")}
        ${tile("Pressure", Math.round(c.surface_pressure) + " hPa")}
      </div>`, "current", "LIVE");
  }

  function sunCard(w) {
    const rise = new Date(w.daily.sunrise[0]), set = new Date(w.daily.sunset[0]), now = new Date(w.current.time);
    const p = Math.max(0, Math.min(1, (now - rise) / (set - rise)));
    const x = 110 - 90 * Math.cos(Math.PI * p), y = 92 - 90 * Math.sin(Math.PI * p);
    const mins = Math.round((set - rise) / 60000);
    return card("Sunrise / sunset", `
      <div class="sun-row">
        <svg class="arc" viewBox="0 0 220 100">
          <path d="M20 92A90 90 0 0 1 200 92" fill="none" stroke="currentColor" stroke-opacity=".25" stroke-width="3" stroke-dasharray="4 5"/>
          <line x1="10" y1="92" x2="210" y2="92" stroke="currentColor" stroke-opacity=".25"/>
          <circle cx="${x}" cy="${y}" r="8" fill="currentColor"/>
        </svg>
        <div class="tiles">
          ${tile("Sunrise", time12(w.daily.sunrise[0]))}
          ${tile("Sunset", time12(w.daily.sunset[0]))}
          ${tile("Daylight", Math.floor(mins / 60) + "h " + (mins % 60) + "m")}
        </div>
      </div>`, "sun");
  }

  function hourlyCard(w) {
    const i = hourIndex(w), h = w.hourly;
    const items = h.time.slice(i, i + 24).map((t, k) => `
      <div class="hour"><span>${k ? hour12(t) : "Now"}</span>${iconFor(h.weather_code[i + k])}
      <strong>${Math.round(h.temperature_2m[i + k])}&deg;</strong></div>`).join("");
    return card("Hourly forecast", `<div class="hours">${items}</div>`, "hourly");
  }

  function dailyCard(w) {
    const d = w.daily;
    const items = d.time.map((t, i) => `
      <div class="day ${i === 0 ? "today" : ""}"><b>${dayName(t, i)}</b>${iconFor(d.weather_code[i])}
      <div>${Math.round(d.temperature_2m_max[i])}&deg;<span class="lo"> / ${Math.round(d.temperature_2m_min[i])}&deg;</span></div>
      <span class="rain">${d.precipitation_probability_max[i] ?? 0}%</span></div>`).join("");
    return card("7-day forecast", `<div class="days">${items}</div>`, "daily");
  }

  function precipCard(w) {
    const i = hourIndex(w), h = w.hourly, d = w.daily;
    const bars = h.time.slice(i, i + 12).map((t, k) => {
      const p = h.precipitation_probability[i + k] ?? 0;
      return `<div class="bar" title="${p}%"><i style="height:${Math.max(p, 3)}%"></i><span>${shortHour(t)}</span></div>`;
    }).join("");
    return card("Precipitation", `
      <div class="big">${d.precipitation_probability_max[0] ?? 0}%</div><div class="sub">chance of rain today</div>
      <div class="tiles two">${tile("Right now", w.current.precipitation + " mm")}${tile("Today total", d.precipitation_sum[0] + " mm")}</div>
      <div class="bars">${bars}</div>`, "precip");
  }

  function windCard(w) {
    const c = w.current;
    const labels = [["N", 48, 12], ["E", 84, 50], ["S", 48, 88], ["W", 12, 50]]
      .map((l) => `<text x="${l[1]}" y="${l[2]}" text-anchor="middle" font-size="9" fill="currentColor" opacity=".5">${l[0]}</text>`).join("");
    return card("Wind speed", `
      <div class="row">
        <svg class="compass" viewBox="0 0 96 96">
          <circle cx="48" cy="48" r="40" fill="none" stroke="currentColor" stroke-opacity=".15" stroke-width="3"/>${labels}
          <g transform="rotate(${c.wind_direction_10m + 180} 48 48)"><polygon points="48,20 55,52 48,45 41,52" fill="currentColor"/></g>
        </svg>
        <div><div class="big">${Math.round(c.wind_speed_10m)}<span class="sub"> km/h</span></div>
        <div class="sub">From ${dirName(c.wind_direction_10m)} &middot; gusts ${Math.round(c.wind_gusts_10m)} km/h</div></div>
      </div>`, "wind");
  }

  function humidityCard(w) {
    const c = w.current, rh = c.relative_humidity_2m, len = 2 * Math.PI * 36;
    return card("Humidity", `
      <div class="row">
        <svg class="ring" viewBox="0 0 88 88">
          <circle cx="44" cy="44" r="36" fill="none" stroke="currentColor" stroke-opacity=".15" stroke-width="8"/>
          <circle cx="44" cy="44" r="36" fill="none" stroke="currentColor" stroke-width="8" stroke-linecap="round"
            stroke-dasharray="${len}" stroke-dashoffset="${len * (1 - rh / 100)}" transform="rotate(-90 44 44)"/>
          <text x="44" y="50" text-anchor="middle" font-size="18" font-weight="700" fill="currentColor">${rh}%</text>
        </svg>
        <div><div class="big">${level(rh, HUMIDITY)}</div><div class="sub">Dew point ${Math.round(c.dew_point_2m)}&deg;C</div></div>
      </div>`, "humidity");
  }

  function airCard(a) {
    if (!a || !a.current || a.current.us_aqi == null) {
      return card("Air quality", `<div class="sub">Data unavailable for this location.</div>`, "air");
    }
    const c = a.current, v = Math.round(c.us_aqi);
    return card("Air quality", `
      <div class="big">${v} &middot; ${level(v, AQI)}</div>${meter(percent(v, 300))}
      <div class="tiles two">${tile("PM2.5", Math.round(c.pm2_5) + " &micro;g/m&sup3;")}${tile("PM10", Math.round(c.pm10) + " &micro;g/m&sup3;")}</div>`, "air");
  }

  function uvCard(w) {
    const v = w.hourly.uv_index[hourIndex(w)] ?? 0, max = w.daily.uv_index_max[0] ?? 0;
    return card("UV index", `
      <div class="big">${v.toFixed(1)} &middot; ${level(v, UV)}</div>${meter(percent(v, 11))}
      <div class="tiles two">${tile("Peak today", max.toFixed(1))}${tile("Peak level", level(max, UV))}</div>`, "uv");
  }

  const WARN_ICON = '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3.5 21.5 20h-19L12 3.5Z"/><path d="M12 10v4.2M12 17.2v.1"/></svg>';
  const CHECK_ICON = '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="m8 12.5 2.7 2.7L16.5 9"/></svg>';

  function notifCard(a) {
    const aqi = a && a.current && a.current.us_aqi != null ? Math.round(a.current.us_aqi) : null;
    const bad = aqi !== null && aqi > 100;
    const icon = bad ? WARN_ICON : CHECK_ICON;
    const title = bad ? "Air quality alert" : "All clear";
    const sub = aqi === null ? "Air quality data unavailable" : bad ? level(aqi, AQI) + " air today" : "Air quality is " + level(aqi, AQI).toLowerCase();
    return card("", `<div class="notif-row">${icon}<div><strong>${title}</strong><span>${sub}</span></div></div>`, "notif" + (bad ? "" : " ok"));
  }

  // ---------- Rendering ----------
  function showMessage(text, isError) {
    out.className = "card message" + (isError ? " error" : "");
    out.textContent = text;
  }

  function render(city, state, w, a) {
  const background = getWeatherBackground(w.current.weather_code);

  document.body.style.backgroundImage = `url("${background}")`;

  out.className = "";
  out.innerHTML = `<div class="dashboard">` +
    currentCard(city, state, w) +
    sunCard(w) +
    hourlyCard(w) +
    dailyCard(w) +
    precipCard(w) +
    windCard(w) +
    humidityCard(w) +
    airCard(a) +
    uvCard(w) +
    notifCard(a) +
    `</div>`;
}

  async function loadWeather() {
    const state = stateSel.value, city = citySel.value;
    const [lat, lon] = INDIA_LOCATIONS[state][city];
    const id = ++requestId;
    showMessage("Loading weather for " + city + "...");
    try {
      const [w, a] = await Promise.all([getJson(weatherUrl(lat, lon)), getJson(airUrl(lat, lon)).catch(() => null)]);
      if (id === requestId) render(city, state, w, a);
    } catch (e) {
      if (id === requestId) showMessage("Could not load weather: " + e.message + ". Check your internet connection and try again.", true);
    }
  }

  // ---------- Dropdowns ----------
  function populateCities() {
    citySel.innerHTML = "";
    Object.keys(INDIA_LOCATIONS[stateSel.value]).forEach((c) => citySel.add(new Option(c, c)));
  }

  // ---------- Search ----------
  const PLACES = [];
  Object.keys(INDIA_LOCATIONS).forEach((state) =>
    Object.keys(INDIA_LOCATIONS[state]).forEach((city) => PLACES.push({ city, state })));

  function selectPlace(state, city) {
    stateSel.value = state;
    populateCities();
    citySel.value = city;
    searchIn.value = "";
    results.hidden = true;
    loadWeather();
  }

  function runSearch() {
    const q = searchIn.value.trim().toLowerCase();
    const matches = PLACES.filter((p) => p.city.toLowerCase().includes(q) || p.state.toLowerCase().includes(q));
    results.innerHTML = "";
    if (!matches.length) {
      results.innerHTML = '<li class="no-match">No match found</li>';
    } else {
      matches.forEach((p) => {
        const li = document.createElement("li");
        li.textContent = p.city + ", " + p.state;
        li.addEventListener("click", () => selectPlace(p.state, p.city));
        results.appendChild(li);
      });
    }
    results.hidden = false;
  }

  // ---------- Init ----------
  Object.keys(INDIA_LOCATIONS).sort().forEach((s) => stateSel.add(new Option(s, s)));
  stateSel.value = "Delhi";
  populateCities();

  stateSel.addEventListener("change", () => { populateCities(); loadWeather(); });
  citySel.addEventListener("change", loadWeather);
  $("refresh").addEventListener("click", loadWeather);

  searchIn.addEventListener("input", runSearch);
  searchIn.addEventListener("focus", runSearch);
  searchIn.addEventListener("keydown", (e) => {
    if (e.key === "Enter") { const first = results.querySelector("li:not(.no-match)"); if (first) first.click(); }
  });
  document.addEventListener("click", (e) => { if (!e.target.closest(".search-box")) results.hidden = true; });

  loadWeather();
})();