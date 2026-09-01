/* ============================================================
   EVER — Moteur de recommandation

   Un score unique, lisible, reutilise partout : roulette
   d'activités, choix d'un établissement, guide de ville,
   suggestions de cadeaux et de films.

   Le score n'est jamais montre brut. Il sert à ponderer un
   tirage aleatoire, et a produire une phrase "Pourquoi ?".
   ============================================================ */
(function (global) {
  'use strict';

  /* ---------- Distance ---------- */
  function haversine(a, b) {
    if (!a || !b || a.lat == null || b.lat == null) return null;
    const R = 6371, toRad = (d) => d * Math.PI / 180;
    const dLat = toRad(b.lat - a.lat), dLon = toRad(b.lon - a.lon);
    const x = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(x));
  }

  /* Le poids de la distance depend du type d'activité.
     Un bar doit être a côté. Un karting, on accepte de rouler.
     Un événement exceptionnel justifie le déplacement. */
  const TOLERANCE = {
    bar: 3, cafe: 3, glacier: 2.5, restaurant: 5, brunch: 5, boulangerie: 2,
    plage: 8, promenade: 6, parc: 6,
    musee: 15, galerie: 12, exposition: 15, monument: 20,
    cinema: 15, bowling: 20, karting: 30, escape: 25, accrobranche: 30,
    ski: 40, randonnee: 35, parapente: 45, rafting: 50, canyoning: 50,
    golf: 30, tennis: 12, equitation: 30, kitesurf: 25, charavoile: 20,
    shopping: 12, marche: 12, evenement: 45, spa: 25,
    _default: 12
  };
  function tolerance(kind) { return TOLERANCE[kind] || TOLERANCE._default; }

  /* ---------- Compatibilite météo ---------- */
  const INDOOR = new Set(['musee', 'galerie', 'exposition', 'cinema', 'bowling', 'escape', 'spa', 'restaurant', 'bar', 'cafe', 'brunch', 'shopping', 'patinoire', 'karting']);
  const OUTDOOR = new Set(['plage', 'promenade', 'parc', 'randonnee', 'velo', 'kitesurf', 'charavoile', 'golf', 'tennis', 'petanque', 'equitation', 'pique-nique', 'cerf-volant', 'beach-volley', 'parapente', 'via-ferrata', 'escalade', 'trail', 'vtt', 'rafting', 'canyoning', 'marche']);
  const SNOW = new Set(['ski', 'snowboard', 'ski-fond', 'raquettes', 'luge', 'patinoire']);

  function weatherFit(item, wx, season) {
    if (!wx) return 1;
    const k = item.kind || '';
    const out = OUTDOOR.has(k) || item.outdoor === true;
    const ind = INDOOR.has(k) || item.outdoor === false;
    let f = 1;

    if (SNOW.has(k)) {
      if (season !== 'hiver') return 0.05;
      if (wx.kind === 'neige') f *= 1.35;
      return f;
    }
    if (out) {
      if (wx.kind === 'pluie' || wx.kind === 'orage') f *= 0.22;
      if (wx.kind === 'clair') f *= 1.3;
      if (wx.temp != null && wx.temp < 6) f *= 0.5;
      if (wx.temp != null && wx.temp > 30) f *= 0.7;
      if (wx.wind > 45) f *= 0.45;
      if (k === 'kitesurf' || k === 'charavoile' || k === 'cerf-volant') f *= wx.wind >= 18 ? 1.45 : 0.5;
      if (k === 'parapente' && wx.wind > 30) f *= 0.3;
    }
    if (ind) {
      if (wx.kind === 'pluie' || wx.kind === 'orage') f *= 1.5;
      if (wx.kind === 'clair' && wx.temp > 20) f *= 0.85;
    }
    return f;
  }

  /* ---------- Compatibilite horaire ---------- */
  const SLOT_FIT = {
    bar:         { soiree: 1.5, 'après-midi': .8, midi: .4, matin: .1, nuit: 1.2 },
    cafe:        { matin: 1.5, 'après-midi': 1.2, midi: .9, soiree: .5, nuit: .1 },
    brunch:      { matin: 1.6, midi: 1.2, 'après-midi': .4, soiree: .1, nuit: .05 },
    restaurant:  { midi: 1.5, soiree: 1.6, 'après-midi': .4, matin: .1, nuit: .3 },
    glacier:     { 'après-midi': 1.6, soiree: 1.1, midi: .9, matin: .2, nuit: .1 },
    plage:       { 'après-midi': 1.4, matin: 1.1, midi: 1.2, soiree: .8, nuit: .1 },
    musee:       { matin: 1.2, 'après-midi': 1.4, midi: .8, soiree: .2, nuit: .05 },
    cinema:      { soiree: 1.6, 'après-midi': 1.1, nuit: .8, matin: .2, midi: .5 },
    apero:       { soiree: 1.7, 'après-midi': .9, nuit: 1.1, matin: .05, midi: .3 },
    ski:         { matin: 1.4, 'après-midi': 1.2, midi: 1, soiree: .1, nuit: .02 }
  };
  function slotFit(item, slot) {
    const t = SLOT_FIT[item.kind];
    if (!t) return 1;
    return t[slot] == null ? 1 : t[slot];
  }

  /* ---------- Score d'un établissement ----------
     On veut qu'un 4,9 avec 7 avis a 40 km ne batte jamais
     automatiquement un 4,4 avec 900 avis a 600 m.  */
  function scorePlace(p, ctx, opts) {
    opts = opts || {};
    const origin = ctx && ctx.place;
    let s = 50;
    const why = [];

    /* Note, ponderee par la confiance qu'on peut lui accorder. */
    if (p.rating != null) {
      const n = p.reviews || 0;
      const confidence = Math.min(1, Math.log10(1 + n) / 2.6);   // 400 avis ~ confiance pleine
      const above = (p.rating - 4.0) * 22;                        // 4,5 -> +11
      s += above * (0.35 + 0.65 * confidence);
      if (p.rating >= 4.5 && n >= 100) why.push('très bien note (' + p.rating.toFixed(1).replace('.', ',') + ' sur ' + UI.fmt.n(n) + ' avis)');
    }

    /* Distance, avec tolerance liée au type. */
    const d = p.distance != null ? p.distance : haversine(origin, p);
    if (d != null) {
      const tol = tolerance(p.kind);
      const penalty = Math.min(34, Math.pow(d / tol, 1.35) * 16);
      s -= penalty;
      if (d < tol * 0.25) why.push('a ' + UI.fmt.km(d));
      p._distance = d;
    }

    /* Budget : on penalise l'écart, pas le prix en soi. */
    if (p.price && ctx && ctx.budget) {
      const gap = Math.abs(p.price - ctx.budget);
      s -= gap * 7;
      if (gap === 0) why.push('dans ton budget');
    }

    /* Météo, saison, horaire. */
    const wf = weatherFit(p, ctx && ctx.weather, ctx && ctx.season);
    s *= wf;
    if (wf > 1.2 && ctx && ctx.weather) why.push(ctx.weather.text.toLowerCase());
    if (wf < 0.4) why.push('peu adapté à la météo');

    const sf = slotFit(p, ctx && ctx.slot);
    s *= sf;
    if (sf > 1.3) why.push('le bon moment de la journée');

    /* Saison declaree sur l'élément. */
    if (p.seasons && p.seasons.length && ctx && p.seasons.indexOf(ctx.season) < 0) s *= 0.25;

    /* Ouvert ou ferme, quand l'information existe. */
    if (p.openNow === false) { s *= 0.15; why.push('probablement ferme maintenant'); }

    /* Préférences apprises. */
    const pref = prefOf(p);
    s += pref * 12;
    if (pref > 0.4) why.push('tu aimés ce genre');
    if (pref < -0.4) why.push('tu avais dit non à ce genre');

    /* Favori. */
    if (opts.favIds && opts.favIds.has(p.id)) { s += 14; why.push('dans tes favoris'); }

    /* Déjà fait recemment. */
    if (opts.recent && opts.recent[p.id]) {
      const days = (Date.now() - opts.recent[p.id]) / 86400e3;
      if (days < 30) { s *= 0.25 + 0.75 * (days / 30); why.push('déjà fait il y a ' + Math.round(days) + ' jours'); }
    }

    p._score = Math.max(1, Math.round(s));
    p._why = why;
    return p._score;
  }

  /* ---------- Préférences apprises ----------
     Chaque pouce en haut ou en bas deplace la catégorie de +-0,25,
     borne a +-1. C'est volontairement lent : deux clics ne doivent
     pas eteindre une catégorie entiere. */
  function prefs() { return Store.get('prefWeights', {}); }
  function prefOf(item) {
    const w = prefs();
    const keys = [item.kind, item.category, item.cat, item.genre].filter(Boolean);
    if (!keys.length) return 0;
    let sum = 0, n = 0;
    keys.forEach((k) => { if (w[k] != null) { sum += w[k]; n++; } });
    return n ? sum / n : 0;
  }
  function learn(item, liked) {
    const w = prefs();
    const keys = [item.kind, item.category, item.cat, item.genre].filter(Boolean);
    keys.forEach((k) => {
      w[k] = UI.clamp((w[k] || 0) + (liked ? 0.25 : -0.25), -1, 1);
    });
    Store.set('prefWeights', w);
    Store.log(liked ? 'like' : 'dislike', { id: item.id, label: item.label || item.nom, keys: keys });
  }

  /* Dernière fois qu'un élément a ete tire, par identifiant. */
  function recentMap(kind, days) {
    const out = {};
    const cut = Date.now() - (days || 60) * 86400e3;
    Store.history(kind, 400).forEach((h) => {
      if (h.at < cut) return;
      const id = h.payload && h.payload.id;
      if (id && !out[id]) out[id] = h.at;
    });
    return out;
  }

  /* ---------- Classement complet ---------- */
  function rank(items, ctx, opts) {
    opts = opts || {};
    const favIds = opts.favIds || new Set();
    const recent = opts.recent || {};
    const list = (items || []).slice();
    list.forEach((p) => scorePlace(p, ctx, { favIds: favIds, recent: recent }));
    list.sort((a, b) => b._score - a._score);
    return list;
  }

  /* Phrase "Pourquoi ?" à partir des raisons accumulees. */
  function why(item, ctx, extra) {
    const bits = (item._why || []).slice(0, 3);
    if (extra) bits.push(extra);
    if (!bits.length) return null;
    const s = bits.join(', ');
    return s.charAt(0).toUpperCase() + s.slice(1) + '.';
  }

  global.Reco = { haversine, scorePlace, rank, why, learn, prefOf, prefs, recentMap, tolerance, weatherFit, slotFit };
})(window);
