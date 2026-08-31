/* ============================================================
   EVER — Couche intelligence (Gemini)

   Trois entrées seulement :
     AI.ask(prompt, opts)          texte libre
     AI.json(prompt, schéma, opts) réponse structuree garantie
     AI.vision(images, prompt, schéma) analyse d'images

   Règles :
   - la clé vit dans les réglages, sur l'appareil, jamais dans le
     dépôt ; un proxy peut la remplacer (EVER_CONFIG.geminiProxyUrl)
   - toute réponse est mise en cache par empreinte du prompt, avec
     une durée de vie choisie par l'appelant
   - aucune erreur technique n'atteint l'ecran : on renvoie des
     messages humains
   ============================================================ */
(function (global) {
  'use strict';

  const BASE = 'https://generativelanguage.googleapis.com/v1beta/models/';
  const CACHE_KEY = 'aiCache';
  const MAX_CACHE = 120;

  function conf() { return global.EVER_CONFIG || {}; }
  function key() { return Store.get('geminiKey', '') || ''; }
  function proxy() { return Store.get('geminiProxyUrl', '') || conf().geminiProxyUrl || ''; }
  function available() { return !!(key() || proxy()); }

  /* ---------- Cache ---------- */
  function hash(s) {
    let h = 5381;
    for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
    return 'h' + (h >>> 0).toString(36);
  }
  function cacheGet(k, ttl) {
    const c = Store.get(CACHE_KEY, {});
    const e = c[k];
    if (!e) return null;
    if (ttl && Date.now() - e.t > ttl) return null;
    return e.v;
  }
  function cacheSet(k, v) {
    const c = Store.get(CACHE_KEY, {});
    c[k] = { t: Date.now(), v: v };
    const keys = Object.keys(c);
    if (keys.length > MAX_CACHE) {
      keys.sort((a, b) => c[a].t - c[b].t).slice(0, keys.length - MAX_CACHE).forEach((x) => delete c[x]);
    }
    Store.set(CACHE_KEY, c);
  }
  function clearCache() { Store.set(CACHE_KEY, {}); }

  /* ---------- Appel bas niveau ---------- */
  async function call(model, body, signal) {
    const px = proxy();
    let url, init;
    if (px) {
      url = px;
      init = { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ model: model, payload: body }), signal: signal };
    } else {
      const k = key();
      if (!k) throw new Error('NO_KEY');
      url = BASE + encodeURIComponent(model) + ':generateContent?key=' + encodeURIComponent(k);
      init = { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: signal };
    }

    let res;
    try { res = await fetch(url, init); }
    catch (e) { throw new Error(e && e.name === 'AbortError' ? 'ABORT' : 'NETWORK'); }

    if (!res.ok) {
      let détail = '';
      try { const j = await res.json(); détail = (j.error && j.error.message) || ''; } catch (e) {}
      if (res.status === 400 && /API key/i.test(détail)) throw new Error('BAD_KEY');
      if (res.status === 403) throw new Error('BAD_KEY');
      if (res.status === 429) throw new Error('QUOTA');
      if (res.status >= 500) throw new Error('UPSTREAM');
      throw new Error('HTTP_' + res.status + (détail ? ' ' + detail : ''));
    }

    const j = await res.json();
    const cand = j.candidates && j.candidates[0];
    if (!cand) throw new Error('EMPTY');
    if (cand.finishReason === 'SAFETY') throw new Error('SAFETY');
    const parts = (cand.content && cand.content.parts) || [];
    return parts.map((p) => p.text || '').join('').trim();
  }

  /* ---------- Messages humains ---------- */
  function humanError(code) {
    const c = String(code && code.message || code || '');
    if (c === 'NO_KEY')  return "Ajoute ta clé Gemini dans Réglages pour activer l'IA.";
    if (c === 'BAD_KEY') return 'Clé Gemini refusée. Vérifie-la dans Réglages.';
    if (c === 'QUOTA')   return 'Quota Gemini atteint. Reessaie un peu plus tard.';
    if (c === 'NETWORK') return 'Pas de connexion : les suggestions arrivent quand le reseau revient.';
    if (c === 'SAFETY')  return "La demande a ete bloquee par le filtre de sécurité.";
    if (c === 'ABORT')   return '';
    return 'Impossible de récupérer les suggestions pour le moment.';
  }

  /* ---------- Texte ---------- */
  async function ask(prompt, opts) {
    opts = opts || {};
    const model = opts.model || conf().geminiTextModel || 'gemini-2.0-flash';
    const ck = hash(model + '|' + prompt + '|' + (opts.system || ''));
    if (opts.cache !== false) {
      const hit = cacheGet(ck, opts.ttl || 6 * 3600e3);
      if (hit != null) return hit;
    }
    const body = {
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: opts.temperature == null ? 0.85 : opts.temperature,
        maxOutputTokens: opts.maxTokens || 2048,
        topP: 0.95
      }
    };
    if (opts.system) body.systemInstruction = { parts: [{ text: opts.system }] };
    const out = await call(model, body, opts.signal);
    if (opts.cache !== false) cacheSet(ck, out);
    return out;
  }

  /* ---------- JSON structure ---------- */
  async function json(prompt, schéma, opts) {
    opts = opts || {};
    const model = opts.model || conf().geminiTextModel || 'gemini-2.0-flash';
    const ck = hash('J|' + model + '|' + prompt + '|' + JSON.stringify(schéma || {}));
    if (opts.cache !== false) {
      const hit = cacheGet(ck, opts.ttl || 6 * 3600e3);
      if (hit != null) return hit;
    }
    const body = {
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: opts.temperature == null ? 0.7 : opts.temperature,
        maxOutputTokens: opts.maxTokens || 4096,
        responseMimeType: 'application/json'
      }
    };
    if (schéma) body.generationConfig.responseSchema = schéma;
    if (opts.system) body.systemInstruction = { parts: [{ text: opts.system }] };
    const raw = await call(model, body, opts.signal);
    const parsed = parseJson(raw);
    if (opts.cache !== false && parsed) cacheSet(ck, parsed);
    return parsed;
  }

  function parseJson(text) {
    if (!text) throw new Error('EMPTY');
    let t = text.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
    try { return JSON.parse(t); } catch (e) {}
    const a = t.indexOf('{'), b = t.lastIndexOf('}');
    const c = t.indexOf('['), d = t.lastIndexOf(']');
    const cands = [];
    if (a >= 0 && b > a) cands.push(t.slice(a, b + 1));
    if (c >= 0 && d > c) cands.push(t.slice(c, d + 1));
    for (const s of cands) { try { return JSON.parse(s); } catch (e) {} }
    throw new Error('BAD_JSON');
  }

  /* ---------- Vision ---------- */
  async function vision(images, prompt, schéma, opts) {
    opts = opts || {};
    const model = opts.model || conf().geminiVisionModel || 'gemini-2.0-flash';
    const parts = [{ text: prompt }];
    for (const im of [].concat(images)) {
      const d = typeof im === 'string' ? im : await fileToDataUrl(im);
      const m = /^data:([^;]+);base64,(.*)$/.exec(d);
      if (!m) continue;
      parts.push({ inlineData: { mimeType: m[1], data: m[2] } });
    }
    const body = {
      contents: [{ role: 'user', parts: parts }],
      generationConfig: {
        temperature: opts.temperature == null ? 0.35 : opts.temperature,
        maxOutputTokens: opts.maxTokens || 3072
      }
    };
    if (schéma) { body.generationConfig.responseMimeType = 'application/json'; body.generationConfig.responseSchema = schéma; }
    if (opts.system) body.systemInstruction = { parts: [{ text: opts.system }] };
    const raw = await call(model, body, opts.signal);
    return schéma ? parseJson(raw) : raw;
  }

  /* ---------- Images : lecture et compression ---------- */
  function fileToDataUrl(file) {
    return new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = () => res(r.result);
      r.onerror = () => rej(new Error('Lecture du fichier impossible'));
      r.readAsDataURL(file);
    });
  }

  /* Redimensionne avant envoi : une photo d'iPhone fait 4 Mo,
     1280 px de côté suffisent largement a Gemini et divisent le
     temps de réponse par cinq. */
  async function shrink(file, maxSide, quality) {
    maxSide = maxSide || 1280; quality = quality || 0.82;
    const url = await fileToDataUrl(file);
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        let { width: w, height: h } = img;
        const scale = Math.min(1, maxSide / Math.max(w, h));
        w = Math.round(w * scale); h = Math.round(h * scale);
        const cv = document.createElement('canvas');
        cv.width = w; cv.height = h;
        cv.getContext('2d').drawImage(img, 0, 0, w, h);
        resolve(cv.toDataURL('image/jpeg', quality));
      };
      img.onerror = () => resolve(url);
      img.src = url;
    });
  }

  global.AI = {
    ask, json, vision, shrink, fileToDataUrl,
    available, humanError, clearCache, parseJson,
    /* Types courts pour composer les schemas de réponse */
    T: {
      str: (desc) => ({ type: 'STRING', description: desc }),
      num: (desc) => ({ type: 'NUMBER', description: desc }),
      int: (desc) => ({ type: 'INTEGER', description: desc }),
      bool: (desc) => ({ type: 'BOOLEAN', description: desc }),
      enu: (values, desc) => ({ type: 'STRING', enum: values, description: desc }),
      arr: (items, desc) => ({ type: 'ARRAY', items: items, description: desc }),
      obj: (props, required) => ({ type: 'OBJECT', properties: props, required: required || Object.keys(props) })
    }
  };
})(window);
