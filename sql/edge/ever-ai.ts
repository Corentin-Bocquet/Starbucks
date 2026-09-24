/* ============================================================
   EVER : fonction edge « ever-ai » : l'IA sans clé à coller

   Pourquoi elle existe : l'IA d'EVER ne marchait que si chaque
   appareil avait collé sa propre clé Gemini dans Réglages. Sans
   clé, tous les boutons IA échouaient. Ici la clé reste côté
   serveur (secret GEMINI_API_KEY du projet Supabase) et l'app
   n'a plus rien à configurer.

   Elle fait aussi le travail le plus fragile à la place de
   l'appareil : choisir le modèle. Google retire des modèles sans
   prévenir ; la fonction demande la liste réelle, classe ce qui
   existe, et passe au suivant sur un 404, un 429 ou un 5xx.

   Requête : POST { kind: 'text' | 'image', model?: string, payload }
     model absent ou « auto » : la fonction choisit.
   Réponse : la réponse brute de Gemini, plus l'en-tête
     x-ever-model qui dit quel modèle a répondu.
   GET ?diag=1 : la liste classée, pour Réglages > Diagnostic.

   Garde-fous : origine autorisée, taille de requête bornée,
   débit par adresse IP. Suffisant pour un usage personnel ; si
   l'app s'ouvre au public, exiger un compte connecté.

   Déploiement :
     supabase functions deploy ever-ai --no-verify-jwt
     (GEMINI_API_KEY est déjà un secret du projet)
   ============================================================ */

const GEMINI = 'https://generativelanguage.googleapis.com/v1beta/models';

const ORIGINS = [
  'https://corentin-bocquet.github.io',
  'http://localhost', 'http://127.0.0.1', 'capacitor://localhost'
];

const cors = (origin: string) => ({
  'Access-Control-Allow-Origin': origin || '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Expose-Headers': 'x-ever-model',
  'Vary': 'Origin'
});

/* ---------- Débit ---------- */
const hits = new Map<string, number[]>();
function limited(id: string, max: number, windowMs: number) {
  const now = Date.now();
  const list = (hits.get(id) || []).filter((t) => now - t < windowMs);
  list.push(now);
  hits.set(id, list);
  return list.length > max;
}

/* ---------- Choix du modèle ---------- */
const EXCLUDE = /embedding|embed|aqa|imagen|veo|tts|audio|native-audio|live|learnlm|thinking-exp|gemma|transcribe|guard|safety|robotics|computer-use/i;
const REPLI = {
  text: ['gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-2.5-pro'],
  image: ['gemini-2.5-flash-image']
};

type Model = { name: string; supportedGenerationMethods?: string[]; inputTokenLimit?: number };
let ranked: { at: number; text: string[]; image: string[] } | null = null;

function score(m: Model, kind: 'text' | 'image') {
  const n = m.name.replace('models/', '');
  if (EXCLUDE.test(n)) return -1;
  const methods = m.supportedGenerationMethods || [];
  if (methods.length && !methods.includes('generateContent')) return -1;
  if (kind === 'image' ? !/image/i.test(n) : /image/i.test(n)) return -1;
  let s = 100;
  const v = /gemini-(\d+(?:\.\d+)?)/i.exec(n);
  s += v ? parseFloat(v[1]) * 60 : 0;
  if (/flash/i.test(n)) s += 40;
  if (/pro/i.test(n)) s += 12;
  s += /lite/i.test(n) ? (kind === 'image' ? -20 : 8) : 0;
  if (/preview|exp|-\d{3,}$/i.test(n)) s -= 45;
  return s;
}

async function models(key: string, force = false) {
  if (ranked && !force && Date.now() - ranked.at < 6 * 3600e3) return ranked;
  try {
    const r = await fetch(GEMINI + '?pageSize=200', { headers: { 'x-goog-api-key': key } });
    if (r.ok) {
      const list: Model[] = (await r.json()).models || [];
      const rank = (kind: 'text' | 'image') => list
        .map((m) => ({ n: m.name.replace('models/', ''), s: score(m, kind) }))
        .filter((x) => x.s > 0).sort((a, b) => b.s - a.s).slice(0, 5).map((x) => x.n);
      ranked = { at: Date.now(), text: rank('text'), image: rank('image') };
    }
  } catch (_) { /* on garde l'ancien classement, ou les replis */ }
  return ranked || { at: 0, text: [], image: [] };
}

function uniq(a: string[]) { return a.filter((x, i) => x && a.indexOf(x) === i); }

async function generate(key: string, model: string, payload: unknown) {
  return fetch(GEMINI + '/' + encodeURIComponent(model) + ':generateContent', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
    body: JSON.stringify(payload)
  });
}

Deno.serve(async (req) => {
  const origin = req.headers.get('Origin') || '';
  const okOrigin = !origin || ORIGINS.some((o) => origin === o || origin.startsWith(o + ':'));
  const h = cors(okOrigin ? origin : ORIGINS[0]);
  const json = (obj: unknown, status = 200) =>
    new Response(JSON.stringify(obj), { status, headers: { ...h, 'Content-Type': 'application/json' } });

  if (req.method === 'OPTIONS') return new Response('ok', { headers: h });
  if (!okOrigin) return json({ error: { message: 'Origine non autorisée' } }, 403);

  const key = Deno.env.get('GEMINI_API_KEY');
  if (!key) return json({ error: { message: 'Clé absente côté serveur' } }, 500);

  if (req.method === 'GET') {
    const m = await models(key, new URL(req.url).searchParams.has('refresh'));
    return json({ ok: true, text: m.text, image: m.image, at: m.at });
  }
  if (req.method !== 'POST') return json({ error: { message: 'Méthode non autorisée' } }, 405);

  const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'anon';
  if (limited('m:' + ip, 40, 60e3) || limited('d:' + ip, 1500, 86400e3)) {
    return json({ error: { message: 'Trop de requêtes, patiente une minute' } }, 429);
  }

  const raw = await req.text();
  if (raw.length > 12 * 1024 * 1024) return json({ error: { message: 'Requête trop lourde' } }, 413);

  let body: { kind?: string; model?: string; payload?: unknown };
  try { body = JSON.parse(raw); } catch { return json({ error: { message: 'Requête illisible' } }, 400); }
  if (!body.payload) return json({ error: { message: 'payload manquant' } }, 400);

  const kind: 'text' | 'image' = body.kind === 'image' || /image/i.test(body.model || '') ? 'image' : 'text';
  const asked = body.model && !/^auto/.test(body.model) ? [body.model] : [];

  /* Deux passes : la seconde après avoir redemandé la liste à Google. */
  let last: Response | null = null;
  for (let passe = 0; passe < 2; passe++) {
    const m = await models(key, passe === 1);
    const list = uniq(asked.concat(m[kind], REPLI[kind])).slice(0, 7);
    let gone = false;
    for (const model of list) {
      const res = await generate(key, model, body.payload);
      if (res.ok) {
        return new Response(await res.text(), { status: 200, headers: { ...h, 'Content-Type': 'application/json', 'x-ever-model': model } });
      }
      last = res;
      if (res.status === 404) { gone = true; continue; }
      if (res.status === 429 || res.status >= 500) continue;
      /* 400 : la requête elle-même est en cause, inutile d'insister. */
      return new Response(await res.text(), { status: res.status, headers: { ...h, 'Content-Type': 'application/json', 'x-ever-model': model } });
    }
    if (!gone) break;
  }
  const txt = last ? await last.text() : JSON.stringify({ error: { message: 'Aucun modèle disponible' } });
  return new Response(txt, { status: last ? last.status : 503, headers: { ...h, 'Content-Type': 'application/json' } });
});
