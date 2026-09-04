/* ============================================================
   EVER — Contexte : lieu, météo, saison, moment

   Sources ouvertes, sans clé et sans compte :
     - Open-Météo pour la météo
     - Open-Météo Geocoding pour la recherche de villes
   La position précise n'est demandee que si l'utilisateur clique
   sur "Ma position". Le dernier lieu choisi est conserve.
   ============================================================ */
(function (global) {
  'use strict';

  const C = () => global.EVER_CONFIG || {};

  /* ---------- Lieu ---------- */
  function place() {
    return Store.get('place', { name: 'Le Touquet', lat: 50.5236, lon: 1.5866, country: 'France', admin: 'Hauts-de-France' });
  }
  function setPlace(p) { Store.set('place', p); Store.emit('place', p); return p; }

  async function searchCity(q) {
    if (!q || q.length < 2) return [];
    const url = (C().geocodeApi || 'https://geocoding-api.open-meteo.com/v1/search') +
      '?name=' + encodeURIComponent(q) + '&count=8&language=fr&format=json';
    try {
      const r = await fetch(url);
      if (!r.ok) return [];
      const j = await r.json();
      return (j.results || []).map((x) => ({
        name: x.name, lat: x.latitude, lon: x.longitude,
        country: x.country, admin: x.admin1 || '',
        label: x.name + (x.admin1 ? ', ' + x.admin1 : '') + (x.country ? ' · ' + x.country : '')
      }));
    } catch (e) { return []; }
  }

  /* ============================================================
     Ou suis-je ?

     Trois choses clochaient et donnaient toujours le meme
     « Position introuvable » :

       1. neuf secondes ne suffisent pas. Sur ordinateur la position
          vient du Wi-Fi, ce qui prend souvent quinze a vingt
          secondes la premiere fois.
       2. en cas d'echec, on abandonnait. On retente maintenant en
          haute precision, qui interroge une autre source.
       3. le nom du lieu etait demande a un service de RECHERCHE par
          nom, a qui on envoyait des coordonnees : il ne repondait
          jamais rien. C'est Nominatim qui sait faire l'inverse.

     Et surtout : un echec de nom n'est plus un echec de position.
     Les coordonnees suffisent a centrer la carte.
     ============================================================ */
  function position(precise, delai) {
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: !!precise,
        timeout: delai,
        maximumAge: precise ? 0 : 300000
      });
    });
  }

  async function nomDuLieu(lat, lon) {
    try {
      const r = await fetch('https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=12' +
        '&accept-language=fr&lat=' + lat + '&lon=' + lon, { headers: { Accept: 'application/json' } });
      if (!r.ok) return null;
      const j = await r.json();
      const a = j.address || {};
      return {
        name: a.city || a.town || a.village || a.municipality || a.county || 'Ma position',
        admin: a.state || a.county || '',
        country: a.country || ''
      };
    } catch (e) { return null; }
  }

  async function locate() {
    if (!navigator.geolocation) throw new Error('Cet appareil ne sait pas donner sa position');
    if (!isSecureContext && location.hostname !== 'localhost') {
      throw new Error('La position demande une connexion sécurisée (https)');
    }

    let pos = null, refus = false;
    try {
      pos = await position(false, 20000);
    } catch (e1) {
      if (e1 && e1.code === 1) refus = true;
      if (!refus) {
        /* Deuxieme essai, haute precision : sur beaucoup
           d'ordinateurs c'est le seul qui aboutit. */
        try { pos = await position(true, 25000); }
        catch (e2) { if (e2 && e2.code === 1) refus = true; }
      }
    }

    if (!pos) {
      throw new Error(refus
        ? 'Position refusée. Autorise la localisation pour ce site dans ton navigateur.'
        : 'Position introuvable. Vérifie que la localisation est activée, puis réessaie.');
    }

    const lat = pos.coords.latitude, lon = pos.coords.longitude;
    const info = await nomDuLieu(lat, lon);
    return setPlace({
      name: (info && info.name) || 'Ma position',
      lat: lat, lon: lon,
      country: (info && info.country) || '',
      admin: (info && info.admin) || ''
    });
  }

  /* ---------- Météo ---------- */
  const WMO = {
    0: ['Ciel degage', 'sun', 'clair'], 1: ['Plutôt degage', 'sun', 'clair'],
    2: ['Partiellement nuageux', 'cloud', 'nuageux'], 3: ['Couvert', 'cloud', 'nuageux'],
    45: ['Brouillard', 'cloud', 'nuageux'], 48: ['Brouillard givrant', 'cloud', 'nuageux'],
    51: ['Bruine légère', 'rain', 'pluie'], 53: ['Bruine', 'rain', 'pluie'], 55: ['Bruine forte', 'rain', 'pluie'],
    61: ['Pluie faible', 'rain', 'pluie'], 63: ['Pluie', 'rain', 'pluie'], 65: ['Forte pluie', 'rain', 'pluie'],
    66: ['Pluie verglacante', 'rain', 'pluie'], 67: ['Pluie verglacante', 'rain', 'pluie'],
    71: ['Neige faible', 'cloud', 'neige'], 73: ['Neige', 'cloud', 'neige'], 75: ['Forte neige', 'cloud', 'neige'],
    77: ['Grains de neige', 'cloud', 'neige'],
    80: ['Averses', 'rain', 'pluie'], 81: ['Averses', 'rain', 'pluie'], 82: ['Fortes averses', 'rain', 'pluie'],
    85: ['Averses de neige', 'cloud', 'neige'], 86: ['Averses de neige', 'cloud', 'neige'],
    95: ['Orage', 'rain', 'orage'], 96: ['Orage et grele', 'rain', 'orage'], 99: ['Orage et grele', 'rain', 'orage']
  };

  async function weather(p) {
    p = p || place();
    const ck = 'wx:' + p.lat.toFixed(2) + ',' + p.lon.toFixed(2);
    const cached = Store.get(ck, null);
    if (cached && Date.now() - cached.at < 45 * 60e3) return cached.data;

    const url = (C().weatherApi || 'https://api.open-meteo.com/v1/forecast') +
      '?latitude=' + p.lat + '&longitude=' + p.lon +
      '&current=temperature_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m,is_day' +
      '&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset' +
      '&timezone=auto&forecast_days=3';
    try {
      const r = await fetch(url);
      if (!r.ok) throw new Error('météo');
      const j = await r.json();
      const cur = j.current || {};
      const code = cur.weather_code;
      const meta = WMO[code] || ['Temps variable', 'cloud', 'nuageux'];
      const data = {
        temp: Math.round(cur.temperature_2m),
        feels: Math.round(cur.apparent_temperature),
        wind: Math.round(cur.wind_speed_10m),
        rain: cur.precipitation > 0.1,
        isDay: cur.is_day === 1,
        code: code, text: meta[0], icon: meta[1], kind: meta[2],
        tmax: j.daily ? Math.round(j.daily.temperature_2m_max[0]) : null,
        tmin: j.daily ? Math.round(j.daily.temperature_2m_min[0]) : null,
        rainProb: j.daily ? j.daily.precipitation_probability_max[0] : null,
        sunset: j.daily ? j.daily.sunset[0] : null
      };
      Store.set(ck, { at: Date.now(), data: data });
      return data;
    } catch (e) {
      return cached ? cached.data : null;
    }
  }

  /* ---------- Contexte complet, tel qu'utilisé par les moteurs ---------- */
  async function snapshot() {
    const p = place();
    const wx = Store.get('useWeather', true) ? await weather(p) : null;
    const now = new Date();
    return {
      place: p,
      weather: wx,
      season: UI.day.season(now),
      slot: UI.day.slot(now),
      hour: now.getHours(),
      weekend: [0, 6].indexOf(now.getDay()) >= 0,
      date: UI.day.key(now),
      budget: Store.get('budget', 2)
    };
  }

  /* Résumé court, injecte dans les invites Gemini. */
  function describe(ctx) {
    const bits = [];
    bits.push('Lieu : ' + ctx.place.name + (ctx.place.admin ? ' (' + ctx.place.admin + ')' : ''));
    bits.push('Date : ' + new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }));
    bits.push('Moment : ' + ctx.slot + (ctx.weekend ? ', week-end' : ', semaine'));
    bits.push('Saison : ' + ctx.season);
    if (ctx.weather) bits.push('Météo : ' + ctx.weather.text + ', ' + ctx.weather.temp + ' degres, vent ' + ctx.weather.wind + ' km/h');
    bits.push('Budget : ' + '€'.repeat(Math.max(1, ctx.budget)));
    return bits.join('\n');
  }

  global.Ctx = { place, setPlace, searchCity, locate, weather, snapshot, describe, WMO };
})(window);
