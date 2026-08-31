/* ============================================================
   EVER — Fonction edge : proxy Gemini

   Pourquoi elle existe : une cle Google posee dans un depot public
   est lisible par tout le monde, et le quota se vide en quelques
   heures. Cette fonction garde la cle cote serveur et n'accepte
   que les utilisateurs connectes au projet.

   Deploiement :
     supabase functions deploy gemini --no-verify-jwt=false
     supabase secrets set GEMINI_API_KEY=...

   Puis, dans EVER : Reglages > Cle Gemini > champ « adresse de
   proxy », colle
     https://<projet>.supabase.co/functions/v1/gemini
   et laisse le champ cle vide.
   ============================================================ */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const GEMINI = 'https://generativelanguage.googleapis.com/v1beta/models/';

/* Modeles autorises : on ne laisse pas appeler n'importe quoi. */
const ALLOWED = new Set([
  'gemini-2.0-flash',
  'gemini-2.0-flash-lite',
  'gemini-2.5-flash',
  'gemini-2.5-pro',
  'gemini-2.5-flash-image'
]);

/* Garde-fou de debit, en memoire : suffisant pour un usage
   personnel, a remplacer par une table si l'app s'ouvre. */
const hits = new Map<string, number[]>();
const LIMIT = 60;          // requetes
const WINDOW = 60 * 1000;  // par minute

function rateLimited(id: string) {
  const now = Date.now();
  const list = (hits.get(id) || []).filter((t) => now - t < WINDOW);
  list.push(now);
  hits.set(id, list);
  return list.length > LIMIT;
}

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'Methode non autorisee' }, 405);

  const key = Deno.env.get('GEMINI_API_KEY');
  if (!key) return json({ error: 'Cle absente cote serveur' }, 500);

  /* Verification de l'utilisateur. */
  const auth = req.headers.get('Authorization') || '';
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: auth } } }
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return json({ error: 'Connexion requise' }, 401);
  if (rateLimited(user.id)) return json({ error: 'Trop de requetes, patiente une minute' }, 429);

  let body: { model?: string; payload?: unknown };
  try { body = await req.json(); }
  catch { return json({ error: 'Requete illisible' }, 400); }

  const model = body.model || 'gemini-2.0-flash';
  if (!ALLOWED.has(model)) return json({ error: 'Modele non autorise' }, 400);

  const res = await fetch(GEMINI + encodeURIComponent(model) + ':generateContent?key=' + key, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body.payload)
  });

  return new Response(await res.text(), {
    status: res.status,
    headers: { ...cors, 'Content-Type': 'application/json' }
  });
});

function json(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' }
  });
}
