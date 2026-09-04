/* ============================================================
   EVER — Couche intelligence (Gemini)

   Trois entrées seulement :
     AI.ask(prompt, opts)            texte libre
     AI.json(prompt, schema, opts)   réponse structurée garantie
     AI.vision(images, prompt, ...)  analyse d'images

   Règles :
   - la clé vit dans les réglages, sur l'appareil, jamais dans le
     dépôt ; un proxy peut la remplacer (EVER_CONFIG.geminiProxyUrl) ;
   - le modèle n'est JAMAIS écrit en dur. L'app demande à Google la
     liste de ce qui existe, choisit le meilleur, et la garde en
     cache une semaine. Google retire des modèles régulièrement
     (gemini-2.0-flash a disparu du jour au lendemain) : avec un nom
     figé dans le code, l'application casse silencieusement ;
   - toute réponse est mise en cache par empreinte du prompt ;
   - aucune erreur technique n'atteint l'écran : on renvoie des
     messages humains.
   ============================================================ */
(function (global) {
  'use strict';

  const BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
  const CACHE_KEY = 'aiCache';
  const MODELS_KEY = 'aiModels';
  const MAX_CACHE = 120;
  const MODELS_TTL = 7 * 86400e3;

  function conf() { return global.EVER_CONFIG || {}; }
  function key() { return Store.get('geminiKey', '') || ''; }
  function proxy() { return Store.get('geminiProxyUrl', '') || conf().geminiProxyUrl || ''; }
  function available() { return !!(key() || proxy()); }

  /* ============================================================
     Choix du modèle

     On classe ce que Google expose vraiment. Les préférences sont
     exprimées en intentions, pas en numéros de version : « le plus
     récent », « rapide plutôt que lourd », « pas une variante
     expérimentale ». Un nouveau Gemini sort, il est pris tout seul.
     ============================================================ */

  /* Écarte tout ce qui n'a rien à faire ici. */
  const EXCLUDE = /embedding|embed|aqa|imagen|veo|tts|audio|native-audio|live|learnlm|thinking-exp|gemma|transcribe|guard|safety/i;

  function score(m, kind) {
    const n = m.name.replace('models/', '');
    if (EXCLUDE.test(n)) return -1;
    const methods = m.supportedGenerationMethods || [];
    if (methods.length && methods.indexOf('generateContent') < 0) return -1;

    if (kind === 'image') {
      /* Génération d'images : le nom doit le dire. */
      if (!/image/i.test(n)) return -1;
    } else if (/image/i.test(n)) {
      /* Un modèle d'image ne sert pas de modèle de texte. */
      return -1;
    }

    let s = 100;

    /* Version : on lit le premier nombre du nom. 3.6 bat 2.5. */
    const v = /gemini-(\d+(?:\.\d+)?)/i.exec(n);
    s += v ? parseFloat(v[1]) * 60 : 0;

    /* Rapide et bon marché plutôt que lourd : c'est une app mobile
       qui fait beaucoup de petits appels. */
    if (/flash/i.test(n)) s += 40;
    if (/pro/i.test(n)) s += 12;
    /* « lite » est un bon compromis pour du texte court, mais donne
       des images visiblement moins bonnes : on inverse le bonus. */
    s += /lite/i.test(n) ? (kind === 'image' ? -20 : 8) : 0;

    /* Les alias mouvants sont plus stables dans le temps qu'un
       numéro figé, mais moins prévisibles : léger bonus seulement. */
    if (/-latest$/i.test(n)) s += 6;

    /* Tout ce qui est daté, expérimental ou en aperçu passe après. */
    if (/preview|exp|-\d{3,}$/i.test(n)) s -= 45;

    /* Contexte utile pour l'analyse de photos et les longs guides. */
    if ((m.inputTokenLimit || 0) >= 500000) s += 6;

    return s;
  }

  let discovering = null;

  async function discover() {
    if (discovering) return discovering;
    discovering = (async () => {
      const k = key();
      /* Derrière un proxy, on ne connaît pas la clé : on s'en remet
         aux valeurs de configuration, que le proxy sait honorer. */
      if (!k) return null;

      const r = await fetch(BASE + '?key=' + encodeURIComponent(k) + '&pageSize=200');
      if (!r.ok) {
        if (r.status === 400 || r.status === 403) throw new Error('BAD_KEY');
        throw new Error('UPSTREAM');
      }
      const j = await r.json();
      const models = j.models || [];

      /* On garde une liste ordonnée, pas un gagnant unique. Le
         modèle le plus récent est aussi le plus souvent saturé
         (503) : sans repli, l'app tombe en panne aux heures de
         pointe alors que trois autres modèles répondent. */
      const rank = (kind) => models
        .map((m) => ({ n: m.name.replace('models/', ''), s: score(m, kind) }))
        .filter((x) => x.s > 0)
        .sort((a, b) => b.s - a.s)
        .slice(0, 5)
        .map((x) => x.n);

      const textList = rank('text'), imageList = rank('image');
      const picked = {
        at: Date.now(),
        text: textList[0] || null, image: imageList[0] || null,
        textList: textList, imageList: imageList,
        all: models.map((m) => m.name.replace('models/', ''))
      };
      Store.set(MODELS_KEY, picked);
      return picked;
    })().finally(() => { discovering = null; });
    return discovering;
  }

  /* Renvoie la liste ordonnée des modèles à essayer. */
  async function candidates(kind, override) {
    if (override) return [override];
    const listKey = kind + 'List';
    let cached = Store.get(MODELS_KEY, null);

    if (!cached || Date.now() - cached.at >= MODELS_TTL || !cached[listKey]) {
      try {
        const fresh = await discover();
        if (fresh) cached = fresh;
      } catch (e) {
        if (String(e.message) === 'BAD_KEY') throw e;
      }
    }
    const list = (cached && cached[listKey]) || (cached && cached[kind] ? [cached[kind]] : []);
    const fallback = kind === 'image'
      ? (conf().geminiImageModel || 'gemini-2.5-flash-image')
      : (conf().geminiTextModel || 'gemini-2.5-flash');
    return list.length ? list : [fallback];
  }

  /* Compatibilité : le premier candidat. */
  async function modelFor(kind, override) {
    return (await candidates(kind, override))[0];
  }

  /* Un modèle qui vient de répondre passe en tête pour la suite :
     inutile de retomber sur celui qui est saturé à chaque appel. */
  function promote(kind, model) {
    const c = Store.get(MODELS_KEY, null);
    if (!c) return;
    const listKey = kind + 'List';
    const list = c[listKey] || [];
    const i = list.indexOf(model);
    if (i > 0) { list.splice(i, 1); list.unshift(model); c[listKey] = list; c[kind] = model; Store.set(MODELS_KEY, c); }
  }

  /* Le modèle a disparu côté Google : on oublie le cache et on
     redécouvre une fois, sans que l'utilisateur voie quoi que ce soit. */
  function forget() { Store.set(MODELS_KEY, null); }

  /* ---------- Cache des réponses ---------- */
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
  async function raw(model, body, signal) {
    const px = proxy();
    let url, init;
    if (px) {
      url = px;
      init = {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: model, payload: body }), signal: signal
      };
    } else {
      const k = key();
      if (!k) throw new Error('NO_KEY');
      url = BASE + '/' + encodeURIComponent(model) + ':generateContent';
      init = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': k },
        body: JSON.stringify(body), signal: signal
      };
    }

    let res;
    try { res = await fetch(url, init); }
    catch (e) { throw new Error(e && e.name === 'AbortError' ? 'ABORT' : 'NETWORK'); }

    if (!res.ok) {
      let detail = '';
      try { const j = await res.json(); detail = (j.error && j.error.message) || ''; } catch (e) {}
      if (res.status === 404 && /no longer available|not found|is not supported/i.test(detail)) {
        const err = new Error('MODEL_GONE'); err.detail = detail; throw err;
      }
      if (res.status === 400 && /API key|API_KEY/i.test(detail)) throw new Error('BAD_KEY');
      if (res.status === 401 || res.status === 403) throw new Error('BAD_KEY');
      if (res.status === 429) throw new Error('QUOTA');
      if (res.status >= 500) throw new Error('UPSTREAM');
      const err = new Error('HTTP_' + res.status); err.detail = detail; throw err;
    }

    const j = await res.json();
    const cand = j.candidates && j.candidates[0];
    if (!cand) {
      if (j.promptFeedback && j.promptFeedback.blockReason) throw new Error('SAFETY');
      throw new Error('EMPTY');
    }
    if (cand.finishReason === 'SAFETY' || cand.finishReason === 'PROHIBITED_CONTENT') throw new Error('SAFETY');
    const parts = (cand.content && cand.content.parts) || [];
    const text = parts.map((p) => p.text || '').join('').trim();
    const inline = parts.filter((p) => p.inlineData).map((p) => 'data:' + p.inlineData.mimeType + ';base64,' + p.inlineData.data);
    return { text: text, images: inline, truncated: cand.finishReason === 'MAX_TOKENS', model: model };
  }

  /* Ce qui justifie d'essayer le modèle suivant plutôt que d'échouer.
     QUOTA en fait partie, contrairement a ce qu'on croyait : chez
     Google le quota est compte PAR MODELE. Un 429 sur
     gemini-2.5-flash-image ne dit rien du modele suivant de la
     liste. On s'arretait au premier refus, et la generation
     d'images echouait alors qu'un autre modele aurait repondu. */
  const RETRYABLE = { MODEL_GONE: 1, UPSTREAM: 1, QUOTA: 1 };

  async function call(kind, body, opts) {
    opts = opts || {};
    const list = await candidates(kind, opts.model);
    let last = null;

    for (let i = 0; i < list.length; i++) {
      const model = list[i];
      try {
        const out = await attempt(model, body, opts);
        if (i > 0) promote(kind, model);
        return out;
      } catch (e) {
        last = e;
        const code = String(e.message);
        if (code === 'MODEL_GONE') forget();
        if (!RETRYABLE[code] || opts.model) throw e;
        /* on continue vers le candidat suivant */
      }
    }
    throw last || new Error('UPSTREAM');
  }

  /* Un appel, avec une seconde tentative si le modèle a brûlé tout
     son budget en réflexion sans rien écrire. Les Gemini 3 pensent
     avant de répondre : un budget trop court renvoie une réponse
     vide, ce qui n'est pas une panne mais un mauvais réglage. */
  async function attempt(model, body, opts) {
    let out = await raw(model, body, opts.signal);
    if (out.truncated && !out.text && !out.images.length) {
      const grown = JSON.parse(JSON.stringify(body));
      grown.generationConfig = grown.generationConfig || {};
      grown.generationConfig.maxOutputTokens = Math.min(32768, (grown.generationConfig.maxOutputTokens || 2048) * 3);
      out = await raw(model, grown, opts.signal);
    }
    if (!out.text && !out.images.length) throw new Error(out.truncated ? 'TRUNCATED' : 'EMPTY');
    return out;
  }

  /* ---------- Messages humains ---------- */
  function humanError(code) {
    const c = String(code && code.message || code || '');
    if (c === 'NO_KEY')     return "Ajoute ta clé Gemini dans Réglages pour activer l'IA.";
    if (c === 'BAD_KEY')    return 'Clé Gemini refusée. Vérifie-la dans Réglages.';
    if (c === 'QUOTA')      return 'Google a refusé la demande : quota atteint sur ce modèle. ' +
      "La génération d'images en a un très petit sur les clés gratuites, bien plus petit que le texte.";
    if (c === 'NETWORK')    return 'Pas de connexion : les suggestions arrivent quand le réseau revient.';
    if (c === 'SAFETY')     return 'La demande a été bloquée par le filtre de sécurité.';
    if (c === 'MODEL_GONE') return "Le modèle a changé côté Google. Réessaie, l'app se remet à jour toute seule.";
    if (c === 'UPSTREAM')   return 'Google ne répond pas en ce moment. Réessaie dans un instant.';
    if (c === 'BAD_JSON')   return "La réponse n'était pas exploitable. Réessaie.";
    if (c === 'TRUNCATED')  return 'La réponse a été coupée. Réessaie, ou demande quelque chose de plus court.';
    if (c === 'ABORT')      return '';
    return 'Impossible de récupérer les suggestions pour le moment.';
  }

  /* ---------- Texte ---------- */
  async function ask(prompt, opts) {
    opts = opts || {};
    const ck = hash('T|' + prompt + '|' + (opts.system || ''));
    if (opts.cache !== false) {
      const hit = cacheGet(ck, opts.ttl || 6 * 3600e3);
      if (hit != null) return hit;
    }
    const body = {
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: opts.temperature == null ? 0.85 : opts.temperature,
        maxOutputTokens: opts.maxTokens || 4096,
        topP: 0.95
      }
    };
    if (opts.system) body.systemInstruction = { parts: [{ text: opts.system }] };
    const out = (await call('text', body, opts)).text;
    if (opts.cache !== false) cacheSet(ck, out);
    return out;
  }

  /* ---------- Génération d'images ----------
     `ask` parle toujours au modele de texte et ne renvoie que du
     texte : c'est voulu. La fabrication d'images a donc son propre
     chemin, avec son modele, sa modalite de sortie explicite et
     ses images en retour. */
  async function image(prompt, opts) {
    opts = opts || {};
    const body = {
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: opts.temperature == null ? 1 : opts.temperature,
        responseModalities: ['TEXT', 'IMAGE']
      }
    };
    if (opts.system) body.systemInstruction = { parts: [{ text: opts.system }] };
    return call('image', body, Object.assign({ cache: false }, opts));
  }

  /* ---------- JSON structuré ---------- */
  async function json(prompt, schema, opts) {
    opts = opts || {};
    const ck = hash('J|' + prompt + '|' + JSON.stringify(schema || {}));
    if (opts.cache !== false) {
      const hit = cacheGet(ck, opts.ttl || 6 * 3600e3);
      if (hit != null) return hit;
    }
    const body = {
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: opts.temperature == null ? 0.7 : opts.temperature,
        maxOutputTokens: opts.maxTokens || 8192,
        responseMimeType: 'application/json'
      }
    };
    if (schema) body.generationConfig.responseSchema = schema;
    if (opts.system) body.systemInstruction = { parts: [{ text: opts.system }] };
    const out = await call('text', body, opts);
    const parsed = parseJson(out.text);
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
  async function vision(images, prompt, schema, opts) {
    opts = opts || {};
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
        maxOutputTokens: opts.maxTokens || 8192
      }
    };
    if (schema) { body.generationConfig.responseMimeType = 'application/json'; body.generationConfig.responseSchema = schema; }
    /* Les modeles d'image veulent qu'on demande explicitement une
       sortie image ; certains ne renvoient que du texte sinon. */
    if (opts.kind === 'image') {
      body.generationConfig.responseModalities = ['TEXT', 'IMAGE'];
      delete body.generationConfig.topP;
    }
    if (opts.system) body.systemInstruction = { parts: [{ text: opts.system }] };
    const out = await call(opts.kind || 'text', body, opts);
    if (schema) return parseJson(out.text);
    return opts.wantImages ? out : out.text;
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
     1280 px de côté suffisent largement et divisent le temps de
     réponse par cinq. */
  async function shrink(file, maxSide, quality) {
    maxSide = maxSide || 1280; quality = quality || 0.82;
    const url = typeof file === 'string' ? file : await fileToDataUrl(file);
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        let w = img.width, h = img.height;
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

  /* ---------- Diagnostic, affiché dans Réglages ---------- */
  async function selfTest() {
    if (!available()) return { ok: false, message: humanError('NO_KEY') };
    try {
      const models = await discover();
      const out = await ask('Réponds uniquement par : ok', { cache: false, maxTokens: 1024, temperature: 0 });
      return {
        ok: true,
        model: (models && models.text) || Store.get(MODELS_KEY, {}).text || '?',
        imageModel: (models && models.image) || null,
        count: models && models.all ? models.all.length : null,
        echo: out
      };
    } catch (e) {
      return { ok: false, message: humanError(e), code: String(e.message), detail: e.detail || '' };
    }
  }

  global.AI = {
    ask, json, vision, image, shrink, fileToDataUrl,
    available, humanError, clearCache, parseJson,
    discover, modelFor, candidates, forget, selfTest,
    currentModel: () => (Store.get(MODELS_KEY, {}) || {}).text || null,
    /* Types courts pour composer les schémas de réponse */
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
