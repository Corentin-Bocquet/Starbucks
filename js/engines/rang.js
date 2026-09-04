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

  /* ============================================================
     Les seuils

     Ils montaient trop doucement : de Bois III a Diamant I, il n'y
     avait qu'un facteur 93, et les derniers crans coutaient a peine
     plus que les premiers. Un palier qui se gagne en une semaine
     n'est pas un palier.

     La progression est maintenant quasi geometrique : chaque
     division coute environ 38 % de plus que la precedente. Les
     premieres se prennent en quelques jours, la derniere demande
     des mois. C'est le point : le haut doit se meriter.

       Bois III       0        Or III       6 400
       Bois I         420      Or I        12 200
       Bronze III     820      Platine III 16 700
       Bronze I     1 900      Platine I   30 800
       Argent III   2 800      Diamant III 42 000
       Argent I     5 100      Diamant I   77 000
     ============================================================ */
  const SEUILS = [
    0, 180, 420,                  /* Bois    III II I */
    820, 1300, 1900,              /* Bronze  */
    2800, 3800, 5100,             /* Argent  */
    6400, 8800, 12200,            /* Or      */
    16700, 22600, 30800,          /* Platine */
    42000, 56000, 77000,          /* Diamant */
    104000                        /* plafond */
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
