/* ============================================================
   EVER — Moteur des humeurs

   Traduit « je me sens comme ça » en « voilà quoi faire », en
   appliquant une règle non négociable : trois des six tasses ne se
   remplissent pas seul. Pour celles-là, le moteur ne renvoie que
   des propositions qui impliquent quelqu'un d'autre.

   C'est le seul endroit de l'application où un filtre n'est pas un
   confort mais une contrainte. Proposer une activité solo à
   quelqu'un qui se sent seul, c'est produire l'effet exact des
   réseaux sociaux : de la dopamine à la place du lien.
   ============================================================ */
(function (global) {
  'use strict';

  const etat = (id) => MOODS.ETATS.find((e) => e.id === id) || null;
  const molecule = (id) => MOODS.MOLECULES[id] || null;
  const estSociale = (mol) => MOODS.SOCIALES.indexOf(mol) >= 0;

  /* Types d'activités de la ville qui se font naturellement à
     plusieurs : ce sont les seuls admis quand la tasse est sociale. */
  const KINDS_SOCIAUX = new Set([
    'restaurant', 'bar', 'cafe', 'brunch', 'apero', 'glacier',
    'escape', 'bowling', 'karting', 'petanque', 'randonnee', 'marche',
    'cinema', 'spa', 'tennis', 'golf', 'beach-volley'
  ]);

  const id = (s) => 'mood-' + String(s.nom).toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);

  /* ---------- Le vivier pour un état ---------- */
  function sourcesFor(etatId, opts) {
    opts = opts || {};
    const e = etat(etatId);
    if (!e) return [];
    const mol = e.molecule;
    const social = estSociale(mol);

    /* 1. Les sources dédiées, celles qui remplissent la bonne tasse. */
    let list = MOODS.SOURCES
      .filter((s) => s.m.indexOf(mol) >= 0)
      .filter((s) => !social || s.social !== 'solo')
      .map((s) => Object.assign({}, s, {
        id: id(s),
        nom: s.nom,
        kind: s.kind,
        /* Ce qu'on affiche n'est pas la molécule visée mais toutes
           celles que la source remplit : c'est l'information utile,
           et ça fait apparaître les propositions qui en cochent
           trois d'un coup. */
        category: s.m.slice(0, 3).map((x) => molecule(x).nom).join(' + '),
        price: s.cost,
        minutes: s.min,
        seasons: s.seasons || null,
        outdoor: s.outdoor,
        isMood: true,
        molecule: mol,
        principale: s.m[0] === mol,
        avecQuelquun: s.social !== 'solo'
      }));

    /* 2. Les activités de la ville qui vont dans le même sens.
       Elles gardent leur ancrage local — bar du Touquet, spa de
       Méribel — mais restent soumises à la même règle sociale. */
    if (opts.city !== false) {
      const kindsUtiles = new Set(list.map((s) => s.kind));
      const locales = Store.all('activities')
        .filter((a) => !opts.city || !a.city || a.city === opts.city)
        .filter((a) => kindsUtiles.has(a.kind))
        .filter((a) => !social || KINDS_SOCIAUX.has(a.kind))
        .map((a) => Object.assign({}, a, {
          isMood: true, molecule: mol, principale: false,
          avecQuelquun: social || KINDS_SOCIAUX.has(a.kind),
          minutes: null
        }));
      list = list.concat(locales);
    }

    /* 3. Saison, et rien qui ne rentre pas dans la journée. */
    const saison = (opts.ctx && opts.ctx.season) || UI.day.season();
    list = list.filter((s) => !s.seasons || !s.seasons.length || s.seasons.indexOf(saison) >= 0);

    if (opts.temps) {
      const tient = list.filter((s) => !s.minutes || s.minutes <= opts.temps);
      if (tient.length >= 4) list = tient;
    }
    return list;
  }

  /* ---------- Pondération ----------
     Une source qui remplit la tasse visée en premier passe devant
     une source qui la remplit accessoirement. Le contexte fait le
     reste : météo, budget, heure, et ce qui a déjà servi récemment. */
  function weight(s, ctx) {
    const copy = Object.assign({}, s);
    Reco.scorePlace(copy, ctx, { recent: Reco.recentMap('humeur', 21) });
    let w = copy._score;
    if (s.principale) w *= 1.6;
    if (s.m && s.m.length > 2) w *= 1.2;      /* remplit trois tasses d'un coup */
    if (s.social === 'groupe') w *= 1.1;
    s._why = copy._why;
    return Math.max(1, w);
  }

  /* ---------- Historique et équilibre ----------
     On ne compte pas des points, on compte des tasses. Sept jours
     glissants, ce qui est la bonne échelle : une semaine sans voir
     personne se voit, une journée non. */
  function log(etatId, source) {
    const e = etat(etatId);
    Store.log('humeur', {
      id: source.id, label: source.nom,
      etat: etatId, molecule: e ? e.molecule : null,
      avecQuelquun: !!source.avecQuelquun
    });
  }

  function balance(days) {
    days = days || 7;
    const cut = Date.now() - days * 86400e3;
    const out = {};
    Object.keys(MOODS.MOLECULES).forEach((m) => { out[m] = 0; });

    Store.history('humeur', 300).forEach((h) => {
      if (h.at < cut) return;
      const m = h.payload && h.payload.molecule;
      if (m && out[m] != null) out[m]++;
    });

    /* Ce qui se passe ailleurs dans l'app compte aussi : un repas
       consigné à plusieurs, une tenue, une séance. On reste prudent
       et on ne crédite que ce qui est explicite. */
    Store.history('activite', 200).forEach((h) => {
      if (h.at < cut) return;
      const k = h.payload && h.payload.kind;
      if (!k) return;
      if (KINDS_SOCIAUX.has(k)) out.cannabinoides += 0.5;
      if (k === 'sport' || k === 'trail' || k === 'velo' || k === 'randonnee') out.dopamine += 0.5;
      if (k === 'spa') out.opioides += 0.5;
    });
    return out;
  }

  /* La tasse la plus vide, hors celles qu'on vient de remplir. */
  function pluVide(days) {
    const b = balance(days);
    let pire = null, min = Infinity;
    Object.keys(b).forEach((m) => { if (b[m] < min) { min = b[m]; pire = m; } });
    return { molecule: pire, compte: min };
  }

  /* ---------- L'alerte qui compte ----------
     Combien de jours depuis la dernière fois qu'une tasse sociale a
     été remplie. C'est la seule mesure de cette application qui
     mérite une alerte : le reste peut attendre. */
  function joursSansLien() {
    let dernier = 0;
    Store.history('humeur', 300).forEach((h) => {
      const p = h.payload || {};
      if (p.avecQuelquun && h.at > dernier) dernier = h.at;
    });
    Store.history('activite', 200).forEach((h) => {
      const k = h.payload && h.payload.kind;
      if (k && KINDS_SOCIAUX.has(k) && h.at > dernier) dernier = h.at;
    });
    if (!dernier) return null;
    return Math.floor((Date.now() - dernier) / 86400e3);
  }

  /* Avec qui : les personnes déjà connues de l'app. */
  function gens() {
    return Store.all('people').map((p) => ({ id: p.id, nom: p.nom, relation: p.relation || '' }));
  }

  /* Résumé injecté dans les invites Gemini (santé, guide). */
  function describe() {
    const b = balance(7);
    const vide = pluVide(7);
    const jours = joursSansLien();
    const bits = ['Équilibre des sept derniers jours : ' +
      Object.keys(b).map((m) => MOODS.MOLECULES[m].nom + ' ' + Math.round(b[m])).join(', ')];
    if (vide && vide.compte === 0) bits.push('Tasse jamais remplie cette semaine : ' + MOODS.MOLECULES[vide.molecule].nom + '.');
    if (jours != null && jours >= 3) bits.push('Dernière activité impliquant quelqu\'un d\'autre : il y a ' + jours + ' jours.');
    return bits.join(' ');
  }

  global.Mood = {
    etat, molecule, estSociale, sourcesFor, weight, log,
    balance, pluVide, joursSansLien, gens, describe,
    KINDS_SOCIAUX
  };
})(window);
