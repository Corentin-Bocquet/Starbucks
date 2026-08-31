/* ============================================================
   EVER — Événements du moment

   Quand le réglage « événements » est actif, le moteur va chercher
   ce qui se passe réellement dans la ville sur les jours qui
   viennent, et les mélange aux activités de la roue.

   Deux garde-fous, parce qu'un événement inventé ou périmé est pire
   que pas d'événement du tout :
     - on demande explicitement des dates, et tout ce qui est passé
       est jeté à la lecture ;
     - on demande une source, et une entrée sans source plausible
       est marquée comme « à vérifier ».
   ============================================================ */
(function (global) {
  'use strict';

  const TTL = 10 * 3600e3;   /* dix heures : un événement ne bouge pas si vite */

  const SCHEMA = AI.T.obj({
    evenements: AI.T.arr(AI.T.obj({
      nom: AI.T.str('Nom exact de l événement'),
      type: AI.T.enu(['concert', 'festival', 'marche', 'exposition', 'spectacle', 'sport', 'animation', 'saisonnier', 'autre'], ''),
      debut: AI.T.str('Date de début au format AAAA-MM-JJ'),
      fin: AI.T.str('Date de fin au format AAAA-MM-JJ, identique au début si un seul jour'),
      lieu: AI.T.str('Lieu précis'),
      description: AI.T.str('Une phrase, ce que c est concrètement'),
      prix: AI.T.int('0 si gratuit, sinon 1 à 4'),
      recurrent: AI.T.bool('Vrai si c est un rendez-vous régulier, par exemple un marché hebdomadaire'),
      source: AI.T.str('Nom de la source ou du site officiel, vide si inconnue')
    }))
  }, ['evenements']);

  function cacheKey(city, from) { return 'events:' + city.toLowerCase() + ':' + from; }

  /* Récupère les événements d'une ville sur `days` jours. */
  async function fetchFor(ctx, days) {
    days = days || 10;
    const city = ctx.place.name;
    const from = UI.day.today();
    const to = UI.day.add(from, days);
    const key = cacheKey(city, from);

    const cached = Store.get(key, null);
    if (cached && Date.now() - cached.at < TTL) return prune(cached.rows);

    if (!AI.available()) return [];

    const res = await AI.json(
      "Quels événements se passent à " + city + (ctx.place.admin ? ' (' + ctx.place.admin + ')' : '') + ", " +
      "entre le " + from + " et le " + to + " ?\n\n" +
      "Contexte : " + Ctx.describe(ctx) + "\n\n" +
      "Règles strictes :\n" +
      "- uniquement des événements que tu connais réellement, ou des rendez-vous récurrents établis (marché hebdomadaire, brocante mensuelle, saison culturelle) ;\n" +
      "- n'invente jamais un nom, une date ou un lieu : mieux vaut renvoyer une liste courte ou vide ;\n" +
      "- marque recurrent à vrai pour tout ce qui revient périodiquement, ces entrées sont les plus fiables ;\n" +
      "- dates au format AAAA-MM-JJ, dans la fenêtre demandée ;\n" +
      "- douze entrées maximum ;\n" +
      "- réponds en français.",
      SCHEMA, { ttl: TTL, temperature: 0.3 });

    const rows = (res.evenements || []).map(normalize).filter(Boolean);
    Store.set(key, { at: Date.now(), rows: rows });
    return prune(rows);
  }

  function normalize(e) {
    if (!e || !e.nom) return null;
    const debut = clean(e.debut), fin = clean(e.fin) || clean(e.debut);
    if (!debut) return null;
    return {
      id: 'ev-' + slug(e.nom) + '-' + debut,
      nom: e.nom,
      kind: 'evenement',
      category: 'Événements',
      debut: debut, fin: fin,
      lieu: e.lieu || '',
      description: e.description || '',
      price: e.prix == null ? 2 : e.prix,
      recurrent: !!e.recurrent,
      source: e.source || '',
      fiable: !!(e.recurrent || e.source),
      isEvent: true
    };
  }
  function clean(d) {
    const m = /(\d{4})-(\d{2})-(\d{2})/.exec(String(d || ''));
    return m ? m[0] : null;
  }
  const slug = (s) => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').slice(0, 32);

  /* Jamais d'événement expiré à l'écran. */
  function prune(rows) {
    const today = UI.day.today();
    return (rows || []).filter((e) => (e.fin || e.debut) >= today);
  }

  /* Ceux qui tombent aujourd'hui, ou dans les trois jours. */
  function soon(rows, days) {
    const from = UI.day.today(), to = UI.day.add(from, days == null ? 3 : days);
    return prune(rows).filter((e) => e.debut <= to);
  }

  function label(e) {
    const today = UI.day.today();
    if (e.debut <= today && (e.fin || e.debut) >= today) return e.recurrent ? 'En cours' : "Aujourd'hui";
    if (e.debut === UI.day.add(today, 1)) return 'Demain';
    const [y, m, d] = e.debut.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  }

  function clearCache(city) {
    if (!city) return;
    Store.set(cacheKey(city, UI.day.today()), null);
  }

  global.Events = { fetchFor, prune, soon, label, clearCache };
})(window);
