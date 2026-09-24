/* ============================================================
   EVER : fonction edge « ever-sante », Apple Santé en automatique

   iOS ne laisse aucune page web lire Santé. Mais l'iPhone, lui,
   peut ENVOYER ses données : un Raccourci programmé chaque soir,
   ou l'app Health Auto Export, poste les chiffres du jour ici.
   L'application vient ensuite les chercher à chaque ouverture.

   Pas de compte nécessaire : chaque appareil a un jeton secret
   (32 caractères aléatoires) qui sert d'adresse privée. Qui n'a
   pas le jeton ne lit rien et n'écrit rien.

   POST ?t=JETON  corps accepté, au choix :
     1. le format simple d'EVER, pensé pour un Raccourci :
        { "day": "2026-09-24", "steps": 8412, "active": 520,
          "sleepH": 7.3, "hrRest": 58, "weight": 74.2, ... }
        ou { "days": [ {...}, {...} ] }
        Les nombres peuvent arriver en texte avec une virgule
        (« 7,3 ») : c'est ce que produit un iPhone réglé en français.
     2. l'export JSON de Health Auto Export :
        { "data": { "metrics": [ { "name": "step_count", ... } ] } }
   GET ?t=JETON&since=AAAA-MM-JJ   renvoie { days: [...] }

   Table : ever.health_inbox, fermée à tout le monde sauf cette
   fonction (service role).
   ============================================================ */

const URL_ = Deno.env.get('SUPABASE_URL')!;
const SRV = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const TABLE = URL_ + '/rest/v1/health_inbox';

const h = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
};
const json = (o: unknown, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { ...h, 'Content-Type': 'application/json' } });
const db = (extra: Record<string, string> = {}) => ({
  apikey: SRV, Authorization: 'Bearer ' + SRV, 'Accept-Profile': 'ever', 'Content-Profile': 'ever',
  'Content-Type': 'application/json', ...extra
});

/* Mesures connues : les mêmes clés que l'import d'export Apple Santé
   dans l'app, pour que tout se mélange sans conversion. */
const KEYS = new Set(['steps', 'distance', 'active', 'basal', 'floors', 'exercise', 'stand', 'hr', 'hrRest', 'hrWalk',
  'hrv', 'vo2', 'resp', 'spo2', 'weight', 'fat', 'lean', 'hkWater', 'bpSys', 'bpDia', 'sleep', 'mindful']);

function num(v: unknown): number | null {
  if (typeof v === 'number') return isFinite(v) ? v : null;
  if (typeof v !== 'string') return null;
  const s = v.replace(/\s/g, '').replace(',', '.').replace(/[^0-9.\-]/g, '');
  const n = parseFloat(s);
  return isFinite(n) ? n : null;
}
const r2 = (n: number) => Math.round(n * 100) / 100;

function today() { return new Date().toISOString().slice(0, 10); }
function dayOf(v: unknown) {
  const s = String(v || '');
  const m = /(\d{4}-\d{2}-\d{2})/.exec(s);
  if (m) return m[1];
  const f = /(\d{2})\/(\d{2})\/(\d{4})/.exec(s);   // 24/09/2026, format d'un iPhone français
  return f ? f[3] + '-' + f[2] + '-' + f[1] : null;
}

/* ---------- Format simple (Raccourci) ---------- */
function simple(o: Record<string, unknown>) {
  const day = dayOf(o.day || o.date) || today();
  const d: Record<string, number> = {};
  for (const k of Object.keys(o)) {
    if (KEYS.has(k)) { const n = num(o[k]); if (n != null) d[k] = r2(n); }
  }
  const sh = num(o.sleepH);                         // heures, plus naturel dans un Raccourci
  if (sh != null) d.sleep = Math.round(sh * 60);
  if (d.fat != null && d.fat <= 1) d.fat = r2(d.fat * 100);
  if (d.spo2 != null && d.spo2 <= 1) d.spo2 = r2(d.spo2 * 100);
  return { day, d };
}

/* ---------- Health Auto Export ---------- */
const HAE: Record<string, [string, 'sum' | 'avg' | 'last']> = {
  step_count: ['steps', 'sum'], walking_running_distance: ['distance', 'sum'], active_energy: ['active', 'sum'],
  basal_energy_burned: ['basal', 'sum'], flights_climbed: ['floors', 'sum'], apple_exercise_time: ['exercise', 'sum'],
  apple_stand_time: ['stand', 'sum'], heart_rate: ['hr', 'avg'], resting_heart_rate: ['hrRest', 'avg'],
  walking_heart_rate_average: ['hrWalk', 'avg'], heart_rate_variability: ['hrv', 'avg'], vo2_max: ['vo2', 'last'],
  respiratory_rate: ['resp', 'avg'], blood_oxygen_saturation: ['spo2', 'avg'], weight_body_mass: ['weight', 'last'],
  body_fat_percentage: ['fat', 'last'], lean_body_mass: ['lean', 'last'], dietary_water: ['hkWater', 'sum'],
  mindful_minutes: ['mindful', 'sum']
};

function hae(metrics: any[]) {
  const acc: Record<string, Record<string, { s: number; n: number; last: number }>> = {};
  const put = (day: string, k: string, v: number) => {
    const a = (acc[day] = acc[day] || {});
    const c = (a[k] = a[k] || { s: 0, n: 0, last: 0 });
    c.s += v; c.n += 1; c.last = v;
  };
  const out: Record<string, Record<string, number>> = {};
  for (const m of metrics || []) {
    const name = String(m.name || '');
    for (const p of m.data || []) {
      const day = dayOf(p.date);
      if (!day) continue;
      if (name === 'sleep_analysis') {
        const hrs = num(p.totalSleep) ?? num(p.asleep) ?? num(p.qty);
        if (hrs != null) { out[day] = out[day] || {}; out[day].sleep = Math.round(hrs * 60); }
        continue;
      }
      const map = HAE[name];
      if (!map) continue;
      let v = num(p.qty) ?? num(p.Avg) ?? num(p.avg);
      if (v == null) continue;
      if (name === 'active_energy' || name === 'basal_energy_burned') { if (/kj/i.test(m.units || '')) v = v / 4.184; }
      if (name === 'walking_running_distance' && /^m$/i.test(m.units || '')) v = v / 1000;
      put(day, map[0], v);
    }
    const map = HAE[name];
    if (!map) continue;
    for (const day of Object.keys(acc)) {
      const c = acc[day][map[0]];
      if (!c) continue;
      out[day] = out[day] || {};
      const v = map[1] === 'sum' ? c.s : map[1] === 'avg' ? c.s / c.n : c.last;
      out[day][map[0]] = r2(v);
      if (map[0] === 'fat' && out[day].fat <= 1) out[day].fat = r2(out[day].fat * 100);
      if (map[0] === 'spo2' && out[day].spo2 <= 1) out[day].spo2 = r2(out[day].spo2 * 100);
    }
  }
  return Object.keys(out).map((day) => ({ day, d: out[day] }));
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: h });
  const u = new URL(req.url);
  const t = u.searchParams.get('t') || '';
  if (!/^[A-Za-z0-9_-]{24,64}$/.test(t)) return json({ ok: false, error: 'Jeton manquant ou invalide' }, 400);

  if (req.method === 'GET') {
    const since = dayOf(u.searchParams.get('since')) || '2000-01-01';
    const r = await fetch(TABLE + '?select=day,data,src,updated_at&token=eq.' + t + '&day=gte.' + since + '&order=day.asc&limit=1000', { headers: db() });
    if (!r.ok) return json({ ok: false, error: 'Lecture impossible' }, 502);
    const rows = await r.json();
    return json({ ok: true, days: rows.map((x: any) => ({ day: x.day, ...x.data, _src: x.src, _at: x.updated_at })) });
  }
  if (req.method !== 'POST') return json({ ok: false, error: 'Méthode non autorisée' }, 405);

  const raw = await req.text();
  if (raw.length > 8 * 1024 * 1024) return json({ ok: false, error: 'Trop lourd' }, 413);
  let body: any;
  try { body = JSON.parse(raw); } catch { return json({ ok: false, error: 'JSON illisible' }, 400); }

  let rows: { day: string; d: Record<string, number> }[] = [];
  let src = 'raccourci';
  if (body && body.data && Array.isArray(body.data.metrics)) { rows = hae(body.data.metrics); src = 'health-auto-export'; }
  else if (Array.isArray(body)) rows = body.map(simple);
  else if (body && Array.isArray(body.days)) rows = body.days.map(simple);
  else if (body && typeof body === 'object') rows = [simple(body)];
  rows = rows.filter((x) => x.day && Object.keys(x.d).length);
  if (!rows.length) return json({ ok: false, error: 'Aucune mesure reconnue', recu: Object.keys(body || {}) }, 422);

  /* On fusionne avec ce qui existe déjà pour ces journées : un envoi
     partiel (juste le poids, par exemple) n'efface pas le reste. */
  const days = rows.map((x) => x.day);
  const prev = await fetch(TABLE + '?select=day,data&token=eq.' + t + '&day=in.(' + days.join(',') + ')', { headers: db() });
  const old: Record<string, Record<string, number>> = {};
  if (prev.ok) for (const x of await prev.json()) old[x.day] = x.data || {};

  const now = new Date().toISOString();
  const payload = rows.map((x) => ({ token: t, day: x.day, data: { ...(old[x.day] || {}), ...x.d }, src, updated_at: now }));
  const w = await fetch(TABLE + '?on_conflict=token,day', {
    method: 'POST', headers: db({ Prefer: 'resolution=merge-duplicates,return=minimal' }), body: JSON.stringify(payload)
  });
  if (!w.ok) return json({ ok: false, error: 'Écriture impossible', detail: (await w.text()).slice(0, 200) }, 502);
  return json({ ok: true, jours: payload.length, mesures: payload.reduce((n, p) => n + Object.keys(p.data).length, 0) });
});
