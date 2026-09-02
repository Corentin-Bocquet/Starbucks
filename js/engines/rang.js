/* ============================================================
   EVER — Rangs

   Six matières, trois divisions chacune, cent points par
   division. Bois III est le départ, Diamant I le sommet.

   Pourquoi ce système plutôt qu'un simple compteur : un nombre
   qui monte tout seul ne veut rien dire au bout d'un moment. Une
   division, si. On sait toujours où on en est, ce qui reste à
   faire avant la suivante, et ce qu'on risque de perdre.

   Les seuils montent plus vite que linéairement : passer de Bois
   à Bronze prend quelques jours, atteindre Diamant prend des
   mois. Sans ça, le sommet arrive en deux semaines et le système
   ne sert plus à rien.
   ============================================================ */
(function (global) {
  'use strict';

  const MATIERES = ['bois', 'bronze', 'argent', 'or', 'platine', 'diamant'];
  const NOMS = {
    bois: 'Bois', bronze: 'Bronze', argent: 'Argent',
    or: 'Or', platine: 'Platine', diamant: 'Diamant'
  };
  const DIVISIONS = ['III', 'II', 'I'];

  /* Seuils cumulés, une entrée par division. */
  const SEUILS = [
    0, 150, 350,            /* Bois    III II I */
    600, 900, 1250,         /* Bronze  */
    1650, 2100, 2600,       /* Argent  */
    3200, 3900, 4700,       /* Or      */
    5600, 6600, 7700,       /* Platine */
    9000, 10500, 12200,     /* Diamant */
    14000                   /* plafond */
  ];

  function rang(xp) {
    xp = Math.max(0, Number(xp) || 0);
    let i = 0;
    for (let k = 0; k < SEUILS.length - 1; k++) if (xp >= SEUILS[k]) i = k;
    const bas = SEUILS[i], haut = SEUILS[i + 1] || (bas + 1800);
    const lp = Math.max(0, Math.min(100, Math.round((xp - bas) / (haut - bas) * 100)));
    const matiere = MATIERES[Math.floor(i / 3)] || 'diamant';
    const division = DIVISIONS[i % 3];
    return {
      index: i,
      matiere: matiere,
      nom: NOMS[matiere],
      division: division,
      complet: NOMS[matiere] + ' ' + division,
      lp: lp,
      xp: xp,
      restant: Math.max(0, haut - xp),
      suivant: i + 1 < SEUILS.length - 1
        ? NOMS[MATIERES[Math.floor((i + 1) / 3)]] + ' ' + DIVISIONS[(i + 1) % 3]
        : null,
      max: i >= SEUILS.length - 2
    };
  }

  /* Les couleurs d'une carte de rang, reprises des médailles. */
  function couleurs(matiere) {
    const m = (global.Art && Art.matieres && Art.matieres[matiere]) || ['#C9955C', '#8B5E2B', '#5E3C15'];
    return { clair: m[0], moyen: m[1], sombre: m[2] };
  }

  global.Rang = { rang, couleurs, MATIERES, NOMS, DIVISIONS, SEUILS };
})(window);
