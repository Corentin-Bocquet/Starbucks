/* ============================================================
   EVER — Sport

   Ce que ce module permet :
     - consigner une séance de musculation, exercice par exercice,
       série par série, avec la charge et les répétitions ;
     - consigner un sport, avec sa durée et son intensité ;
     - voir sur une silhouette quels muscles ont travaillé.

   Les calories ne sont pas inventées ici : tout passe par
   js/data/sport.js, qui documente la méthode. Ce fichier ne fait
   que demander, afficher et enregistrer.

   La carte du corps est le point d'orgue : elle transforme une
   liste de séries en une image qu'on lit en une seconde. Un
   muscle beaucoup travaillé sur sept jours est saturé, un muscle
   oublié reste gris. C'est le meilleur rappel possible du jour
   qu'on a sauté.
   ============================================================ */
(function (global) {
  'use strict';

  let root = null;
  let brouillon = null;   /* séance en cours de saisie */

  const seances = () => Store.all('seances');
  const poids = () => {
    const d = (global.Health && Health.lastDays) ? Health.lastDays(60).filter((x) => x.weight) : [];
    return d.length ? d[d.length - 1].weight : Store.get('poidsCorps', 75);
  };

  /* ============================================================
     La carte du corps

     Deux silhouettes, vues de face et de dos, découpées en zones
     musculaires. Chaque zone porte son identifiant, ce qui permet
     de la colorer depuis les séances sans redessiner quoi que ce
     soit. Les proportions sont volontairement simplifiées : on
     cherche la lisibilité d'un pictogramme, pas une planche
     d'anatomie.
     ============================================================ */
  /* ============================================================
     La carte du corps

     Une silhouette dessinee en deux couches. En dessous, le corps
     entier dans une teinte neutre : tete, buste, bras ecartes,
     jambes, mains. Au-dessus, les groupes musculaires, poses comme
     des plaques et colores selon ce qu'ils ont encaisse.

     Tout est trace sur la moitie gauche puis reflechi : la
     symetrie est alors parfaite par construction, et il y a
     moitie moins de courbes a regler.

     Les proportions sont celles d'un pictogramme d'anatomie :
     epaules larges, taille marquee, bras a trente degres. On
     cherche a reconnaitre un pectoral au premier coup d'oeil, pas
     a passer un concours de dessin medical.
     ============================================================ */

  /* ============================================================
     La planche anatomique

     Deux essais avant celui-ci. Le premier alignait des rectangles
     arrondis : on devinait un corps, aucun muscle. Le second avait
     des proportions fausses, un buste trop etroit et des bras
     dessines pour un corps deux fois plus court.

     Celui-ci part d'une grille de proportions reelles, en huit
     tetes, sur une hauteur de 420 :

       tete     8 a 58        epaules  demi-largeur 46 a y = 78
       cou     55 a 72        taille   demi-largeur 30 a y = 170
       buste   68 a 222       hanches  demi-largeur 40 a y = 210
       cuisse 222 a 318       genou    demi-largeur 21
       mollet 332 a 392       cheville demi-largeur 11

     Le bras est trace en place, deja ecarte, avec ses deux bords :
     le faire pivoter apres coup le detachait de l'epaule.

     Chaque muscle porte un trait fin. C'est lui, plus que la forme,
     qui fait qu'on lit une planche et pas une tache de couleur.
     ============================================================ */

  /* ============================================================
     Le contour, calcule et non dessine

     Trois tentatives a la main, trois echecs : ecrire des points
     de controle de Bezier au clavier donne des epaules carrees et
     des jambes qui se decrochent. Le probleme n'etait pas le gout,
     c'etait la methode.

     Ici on ne pose que des reperes anatomiques, en clair : le creux
     de la taille est a telle hauteur et telle largeur, le mollet
     bombe la. Une spline de Catmull-Rom passe exactement par tous
     ces points et fabrique les courbes elle-meme. Deplacer la
     taille de deux pixels devient une seule valeur a changer, et le
     trace reste lisse par construction.

     Grille, en huit tetes sur 440 :
       tete    6 a 66     epaule   demi-largeur 40 a y = 96
       cou    58 a 88     taille   demi-largeur 25 a y = 184
       buste  88 a 230    hanche   demi-largeur 26 a y = 214
       cuisse 230 a 312   genou    demi-largeur 18 a y = 314
       mollet 320 a 400   cheville demi-largeur 14 a y = 402
     ============================================================ */

  /* Catmull-Rom vers Bezier : la courbe passe PAR les points, ce
     qu'une Bezier ordinaire ne fait pas. */
  function lisser(pts) {
    if (pts.length < 2) return '';
    let d = 'M' + pts[0][0] + ' ' + pts[0][1];
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i - 1] || pts[i], p1 = pts[i];
      const p2 = pts[i + 1], p3 = pts[i + 2] || p2;
      const c1x = p1[0] + (p2[0] - p0[0]) / 6, c1y = p1[1] + (p2[1] - p0[1]) / 6;
      const c2x = p2[0] - (p3[0] - p1[0]) / 6, c2y = p2[1] - (p3[1] - p1[1]) / 6;
      d += 'C' + c1x.toFixed(1) + ' ' + c1y.toFixed(1) + ',' +
                 c2x.toFixed(1) + ' ' + c2y.toFixed(1) + ',' +
                 p2[0].toFixed(1) + ' ' + p2[1].toFixed(1);
    }
    return d;
  }

  /* Les reperes, du creux du cou jusqu'a l'entrejambe, en passant
     par le bras. Le retour se fait tout droit sur l'axe. */
  /* Le tronc et les jambes : du cou au pied, referme sur l'axe. */
  /* Le tronc et les jambes. Les bras partent a part, ouverts.

     Debout bras le long du corps, on ne voit ni le grand dorsal, ni
     les obliques, ni le triceps : le bras les recouvre. C'est
     exactement pour ca que toutes les planches d'anatomie du monde
     dessinent le sujet bras ecartes. On fait pareil. */
  const REPERES = [
    [100, 58], [89, 62], [86, 80],             /* cou */
    [78, 84], [66, 88],                        /* trapeze, dessus d'epaule */
    [63, 106],                                 /* aisselle : le bras part d'ici */
    [66, 126], [68, 146],                      /* grand dorsal */
    [71, 170], [72, 188],                      /* taille */
    [69, 202], [68, 216],                      /* hanche */
    [70, 236], [73, 268],                      /* cuisse, dehors */
    [79, 302], [81, 318],                      /* genou */
    [77, 342], [77, 362],                      /* mollet */
    [84, 390], [87, 406],                      /* cheville */
    [86, 418], [76, 429], [80, 435], [96, 435],/* pied */
    [95, 408], [94, 390],                      /* cheville, dedans */
    [93, 362], [92, 336], [92, 318],           /* mollet et genou, dedans */
    [94, 290], [96, 260], [99, 234]            /* cuisse, dedans */
  ];

  /* ============================================================
     Le bras, genere depuis son axe

     Lister les deux bords d'un membre a la main donne une massue :
     un bord s'evase pendant que l'autre se resserre, sans qu'on
     s'en rende compte avant de regarder le dessin.

     On ne decrit donc que l'AXE du bras et son EPAISSEUR a chaque
     articulation. Le contour se calcule : en chaque point on prend
     la perpendiculaire a la direction locale, on s'ecarte de la
     demi-largeur des deux cotes, et on referme. Le bras s'affine
     forcement du deltoide au poignet, et coller un muscle dessus
     revient a decouper une tranche du meme ruban.

     Axe, en [x, y, demi-largeur] : epaule, bras, coude, avant-bras,
     poignet, main, a quarante-cinq degres vers le bas.
     ============================================================ */
  const AXE_BRAS = [
    [68, 96, 17],    /* tete de l'epaule, le deltoide */
    [57, 114, 15],
    [46, 134, 12.5], /* milieu du bras */
    [36, 156, 10.5], /* coude */
    [27, 178, 10],
    [19, 200, 8.5],  /* avant-bras */
    [12, 222, 6.4],  /* poignet */
    [7, 238, 7.4],   /* paume */
    [4, 250, 5]      /* bout des doigts */
  ];

  /* Le contour d'un ruban d'epaisseur variable. */
  function ruban(axe) {
    const g = [], d = [];
    for (let i = 0; i < axe.length; i++) {
      const a = axe[Math.max(0, i - 1)], b = axe[Math.min(axe.length - 1, i + 1)];
      let dx = b[0] - a[0], dy = b[1] - a[1];
      const n = Math.hypot(dx, dy) || 1;
      dx /= n; dy /= n;
      const w = axe[i][2];
      g.push([axe[i][0] - dy * w, axe[i][1] + dx * w]);
      d.push([axe[i][0] + dy * w, axe[i][1] - dx * w]);
    }
    return lisser(g.concat(d.reverse())) + 'Z';
  }

  /* Une tranche du ruban, entre deux fractions de sa longueur, et
     eventuellement amincie : c'est ainsi qu'on pose un biceps sur
     le bras sans jamais qu'il en deborde. */
  function tranche(axe, de, a, facteur) {
    const n = axe.length - 1;
    const pts = [];
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      if (t < de - 1e-6 || t > a + 1e-6) continue;
      /* Un muscle est un fuseau : fin aux deux tendons, epais au
         milieu. Sans ce profil en cloche, la tranche se lit comme
         une manchette posee autour du membre. */
      const u = (t - de) / ((a - de) || 1);
      const cloche = 0.45 + 0.55 * Math.sin(Math.PI * Math.max(0, Math.min(1, u)));
      pts.push([axe[i][0], axe[i][1], axe[i][2] * (facteur || 1) * cloche]);
    }
    if (pts.length < 2) return '';
    return ruban(pts);
  }

  /* ============================================================
     La jambe, sur le meme principe

     Les cuisses etaient des bandes verticales a bords paralleles :
     un quadriceps ne descend pas droit, il se noue au-dessus du
     genou. Meme axe, meme ruban, memes fuseaux que pour le bras.
     ============================================================ */
  const AXE_JAMBE = [
    [82, 236, 15],   /* haut de cuisse */
    [84, 260, 15.5],
    [85, 286, 13],   /* bas de cuisse */
    [86, 306, 10.5],
    [87, 320, 9],    /* genou */
    [85, 342, 11],   /* mollet, son renflement */
    [86, 366, 9],
    [88, 390, 6.6],
    [90, 406, 5.6]   /* cheville */
  ];

  /* Le support neutre : peau et volumes, jamais colore. */
  const CORPS = [
    /* Tete */
    'M100 10c-12.4 0-22.4 12.6-22.4 28.2S87.6 66.4 100 66.4Z',
    /* Oreille */
    'M79.6 34c-3.2 0-5.6 2.8-5.6 6.2s2.4 6.2 5.6 6.2Z',
    /* Tronc et jambes, referme sur l'axe. */
    lisser(REPERES) + 'L100 234L100 58Z',
    /* Le bras ouvert, pose par-dessus le tronc. */
    ruban(AXE_BRAS)
  ];

  /* Le bras est deja dans CORPS : plus rien a recoller. */
  const MEMBRE = [];

  /* [identifiant, trace]. L'identifiant renvoie a SPORT.MUSCLES.
     Les formes suivent les fibres : un pectoral est un eventail,
     un abdominal est un carre bombe, un quadriceps est une larme.
     C'est ce qui distingue une planche d'un damier. */
  const MUSCLES_TRONC = {
    avant: [
      ['trap',   'M100 66c-8.6.4-15.6 2.4-21 6-3.6 2.4-6 5.6-7.2 9.6L100 90Z'],
      ['delt-a', 'M70 82c-8.6 3-15 8-19.2 15-3.4 5.6-5.2 12-5.4 19.2l16.8 1.6c.4-8 2-15 4.8-21 2-4.4 4.4-8 7-10.8Z'],
      ['pect',   'M100 92l-27.4-1.6c-3.4 4-5.6 9-6.6 15L100 114Z'],
      ['pect',   'M100 116l-33.6-7.6c-.4 6.6 1.6 12.2 6 16.8L100 136Z'],
      ['serr',   'M67.6 128.8l-1.8 4.4 9.4 3.2 1.4-4.6Zm-2.4 10.4l-1.4 4.6 9.4 3 1.2-4.6Zm-1.8 10.6l-1.2 4.6 9.4 2.8 1-4.6Z'],
      ['abdo',   'M99 140H86.6c-1 4.6-1.6 9.4-1.8 14.4H99Z'],
      ['abdo',   'M99 158H85c-.6 4.8-1 9.6-1 14.4H99Z'],
      ['abdo',   'M99 176H84c0 4.8.2 9.6.6 14.4H99Z'],
      ['abdo',   'M99 194H84.8c.4 4.6 1 8.8 1.8 12.6H99Z'],
      ['obl',    'M84 138c-6 3.4-9.6 10.4-10.8 21-1.2 10.6-.4 21.2 2 31.6l6.4.8c-1.8-17.8-1.4-35.6 2.4-53.4Z'],
      ['flechh', 'M99 210l-11.8-.6c.8 4 1.8 7.4 3 10.2l8.8.6Z'],
      /* Vaste externe : le renflement du dehors de la cuisse. */
      /* Vaste externe : le renflement du dehors de la cuisse. */
      ['quad',   tranche(AXE_JAMBE, 0, 0.42, 0.52) ],
      /* Droit anterieur : la larme centrale. */
      /* Droit anterieur : le fuseau central. */
      ['quad',   tranche(AXE_JAMBE, 0.02, 0.48, 0.72) ],
      /* Vaste interne : la goutte juste au-dessus du genou. */
      /* Vaste interne : la goutte juste au-dessus du genou. */
      ['quad',   tranche(AXE_JAMBE, 0.30, 0.50, 0.46) ],
      ['add',    tranche(AXE_JAMBE, 0, 0.38, 0.34) ],
      ['tib',    tranche(AXE_JAMBE, 0.58, 0.92, 0.44) ],
      ['mol',    tranche(AXE_JAMBE, 0.56, 0.86, 0.72) ]
    ],
    arriere: [
      ['trap',   'M100 66c-9.4.6-17 3.4-22.8 8.4-4.4 3.8-7.2 8.6-8.4 14.4l-2.4 14.6c8 4.6 19.2 7.6 33.6 8.6Z'],
      ['delt-p', 'M68 84c-8.6 3.4-14.8 8.6-18.8 15.8-3.2 5.8-4.8 12.2-4.8 19.2l16.8 1.4c.2-7.8 1.6-14.6 4.2-20.4 1.8-4 3.6-7.4 5.6-10.2Z'],
      ['rhom',   'M100 92l-18.4 3c-.6 5.8 0 11 2 15.8L100 114Z'],
      ['dors',   'M100 116l-23.6-4.2c-6.6 8.6-9 20-7 32.6 1 5.8 3.2 11.2 6.4 15.6L100 166Z'],
      ['lomb',   'M100 168l-20.4-2c-1.2 9-1 18 .6 26.4L100 196Z'],
      ['fess',   'M100 198l-25.4.6c-4.2 9.4-4.6 20.4-1.2 29.8 1.8 5 4.4 8.8 7.6 11.4L100 244Z'],
      ['fess-m', 'M74.6 198c-3.8 7.2-5 16.4-3.4 24.2.6 3.4 1.8 6.2 3.4 8l3.6.6c-1.8-10.8-2.4-22-1.4-32.8Z'],
      ['isch',   tranche(AXE_JAMBE, 0.04, 0.44, 0.74) ],
      ['isch',   tranche(AXE_JAMBE, 0.02, 0.40, 0.42) ],
      ['mol',    tranche(AXE_JAMBE, 0.54, 0.84, 0.78) ],
      ['mol',    tranche(AXE_JAMBE, 0.58, 0.80, 0.46) ],
      ['sol',    tranche(AXE_JAMBE, 0.82, 0.96, 0.50) ]
    ]
  };

  /* Chaque muscle du bras est une tranche du meme ruban : il suit
     l'axe, il s'affine avec lui, il ne peut pas en sortir.
       0 a 0.22   deltoide, la boule de l'epaule
       0.20 a 0.48  biceps ou triceps, le corps du bras
       0.42 a 0.55  le coude, laisse nu
       0.50 a 0.82  avant-bras
       0.82 a 1     la main, laissee nue */
  const MUSCLES_BRAS = {
    avant: [
      ['delt-a', tranche(AXE_BRAS, 0, 0.22, 0.98)],
      ['bi',     tranche(AXE_BRAS, 0.20, 0.46, 0.80)],
      ['avb',    tranche(AXE_BRAS, 0.52, 0.80, 0.84)]
    ],
    arriere: [
      ['delt-p', tranche(AXE_BRAS, 0, 0.22, 0.98)],
      ['tri',    tranche(AXE_BRAS, 0.20, 0.46, 0.80)],
      ['avb',    tranche(AXE_BRAS, 0.52, 0.80, 0.84)]
    ]
  };

  /* ============================================================
     La couleur d'un muscle

     Un simple mélange vers la couleur d'accent donnait six nuances
     de la même teinte : impossible de distinguer « un peu » de
     « beaucoup » d'un coup d'oeil. Les planches d'anatomie
     utilisent toutes la même échelle depuis un siècle, parce
     qu'elle se lit sans légende :

       rien        gris chair
       un peu      sable
       moyen       ambre
       beaucoup    orange
       à fond      rouge

     On la reprend telle quelle, en interpolant entre les paliers
     pour que la progression reste continue.
     ============================================================ */
  const ECHELLE = [
    [0.00, [214, 202, 190]],
    [0.25, [232, 196, 130]],
    [0.50, [226, 158,  72]],
    [0.75, [211, 106,  48]],
    [1.00, [178,  42,  38]]
  ];

  function teinte(v) {
    if (!v) return 'var(--silhouette)';
    const t = Math.max(0, Math.min(1, v));
    let i = 0;
    while (i < ECHELLE.length - 2 && t > ECHELLE[i + 1][0]) i++;
    const [a0, c0] = ECHELLE[i], [a1, c1] = ECHELLE[i + 1];
    const k = (t - a0) / (a1 - a0 || 1);
    const c = c0.map((x, j) => Math.round(x + (c1[j] - x) * k));
    return 'rgb(' + c[0] + ',' + c[1] + ',' + c[2] + ')';
  }

  /* ============================================================
     Le corps

     Ce qui manquait n'était pas le tracé mais le relief : des
     aplats posés côte à côte se lisent comme un patron de couture,
     pas comme un corps. Trois ajouts, tous en SVG pur :

       un dégradé de chair          la lumière vient d'en haut à gauche
       un halo clair sur chaque muscle actif   le muscle bombe
       une ombre portée sous la figure          elle se décolle du fond

     Et une seule silhouette est dessinée, puis reflétée : le corps
     reste parfaitement symétrique, ce qu'aucun tracé à la main
     n'obtient.
     ============================================================ */
  let nCorps = 0;

  function silhouette(face, scores, max) {
    const u = 'c' + (++nCorps);
    const trait = ' stroke="var(--trait-corps)" stroke-width=".8" stroke-linejoin="round"';

    const peindre = (paires) => paires.map(([m, d]) => {
      const v = (scores[m] || 0) / (max || 1);
      const actif = v > 0.02;
      return '<path d="' + d + '" fill="' + teinte(v) + '"' + trait +
        (actif ? ' filter="url(#' + u + 'r)"' : '') + '/>';
    }).join('');

    const neutre = (traces) => traces.map((d) =>
      '<path d="' + d + '" fill="url(#' + u + 'p)"' + trait + '/>').join('');

    /* Les muscles sont decoupes dans la silhouette : un trace un
       peu large ne peut plus deborder du bras ou de la cuisse,
       ce qui donnait ces plaques flottant a cote du corps. */
    const moitie = (u2) =>
      neutre(CORPS) +
      '<g clip-path="url(#' + u2 + 'd)">' +
        peindre(MUSCLES_TRONC[face]) +
        peindre(MUSCLES_BRAS[face]) +
      '</g>';

    const contour = CORPS.map((d) => '<path d="' + d + '"/>').join('');
    const defs =
      '<defs>' +
        '<clipPath id="' + u + 'd">' + contour + '</clipPath>' +
        '<linearGradient id="' + u + 'p" x1="40" y1="20" x2="150" y2="410" gradientUnits="userSpaceOnUse">' +
          '<stop offset="0" stop-color="var(--silhouette-clair, #E6DED6)"/>' +
          '<stop offset="1" stop-color="var(--silhouette)"/>' +
        '</linearGradient>' +
        /* Le relief : la forme est décalée vers le bas à droite et
           floutée, puis posée en multiplication sous la couleur.
           C'est un bas-relief, pas un contour. */
        '<filter id="' + u + 'r" x="-30%" y="-30%" width="160%" height="160%">' +
          '<feGaussianBlur in="SourceAlpha" stdDeviation="1.6" result="f"/>' +
          '<feOffset in="f" dx="1.1" dy="1.6" result="o"/>' +
          '<feComposite in="o" in2="SourceAlpha" operator="arithmetic" k2="-1" k3="1" result="creux"/>' +
          '<feFlood flood-color="#000" flood-opacity=".34"/>' +
          '<feComposite in2="creux" operator="in" result="ombre"/>' +
          '<feMerge><feMergeNode in="SourceGraphic"/><feMergeNode in="ombre"/></feMerge>' +
        '</filter>' +
        '<filter id="' + u + 'o" x="-20%" y="-10%" width="140%" height="130%">' +
          '<feDropShadow dx="0" dy="6" stdDeviation="7" flood-color="#000" flood-opacity=".16"/>' +
        '</filter>' +
      '</defs>';

    /* Les deux moities se chevauchent d'un demi-point : posees bord
       a bord, un lisere de fond restait visible au milieu. */
    return '<svg viewBox="-6 0 212 446" class="corps" aria-hidden="true">' + defs +
      '<g filter="url(#' + u + 'o)">' +
        '<g>' + moitie(u) + '</g>' +
        '<g transform="translate(199.4,0) scale(-1,1)">' + moitie(u) + '</g>' +
      '</g>' +
    '</svg>';
  }

  function carteDuCorps(jours) {
    const cut = Date.now() - (jours || 7) * 86400e3;
    const toutes = [];
    seances().forEach((s) => {
      if (s.type !== 'muscu') return;
      if (new Date(s.day + 'T12:00:00').getTime() < cut) return;
      (s.series || []).forEach((x) => toutes.push(x));
    });
    const scores = SPORT.musclesTravailles(toutes);
    const max = Math.max(1, ...Object.values(scores));

    const tries = Object.entries(scores).sort((a, b) => b[1] - a[1]);
    const top = tries.slice(0, 3).map(([m]) => SPORT.MUSCLES[m] && SPORT.MUSCLES[m].nom).filter(Boolean);
    /* Les oublis comptent autant que les réussites : c'est eux
       qu'on vient chercher en ouvrant cette page. */
    const oublies = Object.keys(SPORT.MUSCLES)
      .filter((m) => !scores[m] && ['pect', 'dors', 'quad', 'isch', 'fess', 'delt-m', 'abdo', 'bi', 'tri', 'mol'].indexOf(m) >= 0)
      .map((m) => SPORT.MUSCLES[m].nom);

    return '<div class="section"><div class="sechead"><h2 style="font-size:16px">Ce qui a travaillé</h2>' +
        '<span>' + (jours || 7) + ' derniers jours</span></div>' +
      '<div class="panel">' +
        '<div class="corps-duo">' +
          '<div><div class="etiq">De face</div>' + silhouette('avant', scores, max) + '</div>' +
          '<div><div class="etiq">De dos</div>' + silhouette('arriere', scores, max) + '</div>' +
        '</div>' +
        (top.length
          ? '<p style="font-size:13.5px;margin-top:12px"><b>Le plus travaillé : </b>' + UI.esc(top.join(', ')) + '.</p>'
          : '<p class="muted" style="font-size:13.5px;margin-top:12px">Aucune séance de musculation cette semaine.</p>') +
        (oublies.length && top.length
          ? '<p class="muted" style="font-size:13px;margin-top:6px"><b>Jamais touché : </b>' + UI.esc(oublies.slice(0, 5).join(', ')) + '.</p>'
          : '') +
      '</div></div>';
  }

  /* ============================================================
     Le résumé du jour, injecté dans Santé
     ============================================================ */
  function duJour(day) {
    const j = day || UI.day.today();
    const l = seances().filter((s) => s.day === j);
    return {
      seances: l.length,
      minutes: l.reduce((a, s) => a + (Number(s.minutes) || 0), 0),
      kcal: l.reduce((a, s) => a + (Number(s.kcal) || 0), 0),
      liste: l
    };
  }

  function semaine(jours) {
    const n = jours || 7;
    const cut = UI.day.add(UI.day.today(), -(n - 1));
    const l = seances().filter((s) => s.day >= cut);
    return {
      seances: l.length,
      minutes: l.reduce((a, s) => a + (Number(s.minutes) || 0), 0),
      kcal: l.reduce((a, s) => a + (Number(s.kcal) || 0), 0),
      tonnage: l.reduce((a, s) => a + (Number(s.tonnage) || 0), 0)
    };
  }

  /* ============================================================
     Écran principal
     ============================================================ */
  function mount(el) {
    root = el;
    render();
  }

  /* Le jour affiche. Sans lui, une seance oubliee hier soir etait
     definitivement perdue : on ne pouvait saisir qu'aujourd'hui. */
  let leJour = UI.day.today();

  function render() {
    const s7 = semaine(7);
    const j = duJour(leJour);

    root.innerHTML = '<div class="wrap">' +
      barreJour() +
      '<div class="grid tight two" style="margin-top:12px">' +
        '<button class="btn primary lg" data-act="muscu">' + Icon('dumbbell', 19) + 'Musculation</button>' +
        '<button class="btn lg" data-act="sport">' + Icon('activity', 19) + 'Un sport</button>' +
      '</div>' +
      (j.seances ? jourBlock(j) : videDuJour()) +
      enteteBlock(s7) +
      carteDuCorps(7) +
      historiqueBlock() +
      '</div>';
    bind();
  }

  function barreJour() {
    const demain = UI.day.add(leJour, 1);
    const j = duJour(leJour);
    return '<div class="barrejour">' +
      '<button data-jour="-1" aria-label="Jour précédent">' + Icon('back', 17) + '</button>' +
      '<span class="tx"><b>' + UI.esc(UI.day.label(leJour)) + '</b>' +
        '<small>' + (j.seances ? j.seances + (j.seances > 1 ? ' séances · ' : ' séance · ') + UI.fmt.n(j.kcal) + ' kcal'
                              : 'Aucune séance') + '</small></span>' +
      '<button data-jour="1" aria-label="Jour suivant"' +
        (demain > UI.day.today() ? ' disabled' : '') + '>' + Icon('next', 17) + '</button>' +
      '</div>';
  }

  /* Un jour sans rien n'est pas une erreur : c'est un jour de repos
     ou un oubli. On le dit, et on propose de le remplir. */
  function videDuJour() {
    const passe = leJour !== UI.day.today();
    return '<div class="section">' +
      UI.empty('dumbbell', passe ? 'Rien noté ce jour-là' : 'Rien encore aujourd\'hui',
        passe ? 'Tu peux toujours l\'ajouter, les boutons au-dessus enregistrent sur ce jour.'
              : 'Une séance de muscu ou un sport, les deux boutons au-dessus.') + '</div>';
  }

  function enteteBlock(s7) {
    return '<div class="section" style="padding-top:14px">' +
      '<div class="panel entete-sport">' +
        '<div class="illu">' + Anime.art('haltere', 74) + '</div>' +
        '<div class="chiffres">' +
          '<div><b>' + s7.seances + '</b><span>séance' + (s7.seances > 1 ? 's' : '') + '</span></div>' +
          '<div><b>' + UI.fmt.n(s7.kcal) + '</b><span>kcal</span></div>' +
          '<div><b>' + (s7.tonnage >= 1000 ? (s7.tonnage / 1000).toFixed(1) + ' t' : UI.fmt.n(s7.tonnage) + ' kg') + '</b><span>soulevé</span></div>' +
        '</div>' +
        '<p class="muted" style="font-size:12.5px;margin-top:12px">Sur les sept derniers jours.</p>' +
      '</div></div>';
  }

  function jourBlock(j) {
    return '<div class="section"><div class="sechead"><h2 style="font-size:16px">' +
      UI.esc(UI.day.label(leJour)) + '</h2>' +
      '<span>' + UI.fmt.n(j.kcal) + ' kcal</span></div>' +
      '<div class="list">' + j.liste.map(ligneSeance).join('') + '</div></div>';
  }

  function ligneSeance(s) {
    const detail = s.type === 'muscu'
      ? (s.series || []).length + ' séries · ' + (s.tonnage >= 1000 ? (s.tonnage / 1000).toFixed(1) + ' t' : UI.fmt.n(s.tonnage) + ' kg')
      : UI.fmt.dur(s.minutes) + (s.intensiteNom ? ' · ' + s.intensiteNom : '');
    const ligne = '<div class="rowitem" data-seance="' + UI.attr(s.id) + '">' +
      '<span class="ic">' + Icon(s.type === 'muscu' ? 'dumbbell' : 'activity', 17) + '</span>' +
      '<span class="tx"><b>' + UI.esc(s.nom) + '</b><small>' + UI.esc(detail) + '</small></span>' +
      '<span class="rt tabnum">' + UI.fmt.n(s.kcal) + ' kcal</span></div>';
    return global.Gestes ? Gestes.ligne(ligne, [
      { id: 'del:' + s.id, icon: 'trash', label: 'Retirer', classe: 'danger' }
    ]) : ligne;
  }

  /* L'historique des seances, en cartes. Une liste de douze lignes
     ne disait pas ce qu'on avait fait ; une photo, si. */
  function historiqueBlock() {
    const passees = seances().slice()
      .filter((s2) => s2.day !== leJour)
      .sort((a, b) => (b.day < a.day ? -1 : 1))
      .slice(0, 24);
    if (!passees.length) return '';

    return '<div class="section">' +
      '<div class="secbar"><h2>Séances précédentes</h2>' +
        '<button class="lientout" data-act="toutHisto">Tout voir</button></div>' +
      Cartes.carrousel(passees.slice(0, 10).map((s2) => ({
        id: s2.id,
        titre: s2.nom,
        sous: UI.day.label(s2.day) + ' · ' + UI.fmt.n(s2.kcal) + ' kcal',
        ph: s2.type === 'muscu' ? 'gym weights training' : s2.nom,
        type: 'sport'
      })), { classe: 'petit' }) +
      '</div>';
  }

  /* Tout l'historique, range par mois. */
  function toutHistorique() {
    const l = seances().slice().sort((a, b) => (b.day < a.day ? -1 : 1));
    if (!l.length) return;
    const mois = {};
    l.forEach((s2) => {
      const d = new Date(s2.day + 'T12:00:00');
      const cle = d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
      (mois[cle] = mois[cle] || []).push(s2);
    });

    Cartes.ouvrir({
      tete: Cartes.tete('Tout mon sport', l.length + ' séances enregistrées', ['#1F6E5A', '#3FAF8A'], 'haltere'),
      corps: Object.keys(mois).map((m) =>
        '<h4 class="ftitre">' + UI.esc(m) + ' · ' + mois[m].length + '</h4>' +
        Cartes.carrousel(mois[m].map((s2) => ({
          id: s2.id, titre: s2.nom,
          sous: UI.day.label(s2.day) + ' · ' + UI.fmt.n(s2.kcal) + ' kcal',
          ph: s2.type === 'muscu' ? 'gym weights training' : s2.nom, type: 'sport'
        })), { classe: 'petit' })).join(''),
      onCarte: (id) => { UI.closeSheet(); voirSeance(id); }
    });
  }


  function bind() {
    root.querySelectorAll('[data-act]').forEach((b) => b.onclick = () => {
      if (b.dataset.act === 'muscu') nouvelleSeance();
      if (b.dataset.act === 'sport') choisirSport();
      if (b.dataset.act === 'toutHisto') toutHistorique();
    });
    root.querySelectorAll('[data-jour]').forEach((b) => b.onclick = () => {
      const suivant = UI.day.add(leJour, +b.dataset.jour);
      if (suivant > UI.day.today()) return;
      leJour = suivant; UI.haptic('tap'); render();
    });
    root.querySelectorAll('[data-kart]').forEach((b) => b.onclick = () => voirSeance(b.dataset.kart));
    if (global.Stock) Stock.peupler(root);
    root.querySelectorAll('[data-seance]').forEach((b) => b.onclick = (e) => {
      if (e.target.closest('[data-glisse]')) return;
      voirSeance(b.dataset.seance);
    });
    if (global.Gestes) Gestes.activer(root, (action) => {
      const [quoi, id] = action.split(':');
      if (quoi === 'del') { Store.del('seances', id); UI.haptic('warning'); render(); }
    });
  }

  /* ============================================================
     Saisie d'une séance de musculation
     ============================================================ */
  function nouvelleSeance() {
    brouillon = { type: 'muscu', nom: 'Musculation', day: leJour, minutes: 60, series: [] };
    ecranSeance();
  }

  function ecranSeance() {
    const p = poids();
    const calc = SPORT.caloriesSeance(brouillon.series, brouillon.minutes, p);

    const parExo = [];
    brouillon.series.forEach((s, i) => {
      const dernier = parExo[parExo.length - 1];
      if (dernier && dernier.exoId === s.exoId) dernier.series.push(Object.assign({ i: i }, s));
      else parExo.push({ exoId: s.exoId, series: [Object.assign({ i: i }, s)] });
    });

    const blocs = parExo.map((g) => {
      const exo = SPORT.trouver(g.exoId);
      if (!exo) return '';
      return '<div class="panel" style="margin-top:10px">' +
        '<div class="row-between" style="margin-bottom:8px">' +
          '<b style="font-size:15px">' + UI.esc(exo.nom) + '</b>' +
          '<span class="muted" style="font-size:12px">' + UI.esc(SPORT.MATERIEL[exo.materiel]) + '</span>' +
        '</div>' +
        '<div class="series">' + g.series.map((s, n) =>
          '<div class="serie">' +
            '<span class="num">' + (n + 1) + '</span>' +
            '<span class="val">' + (exo.mode === 'iso'
              ? UI.fmt.n(s.reps) + ' s'
              : (s.charge ? UI.fmt.n(s.charge) + ' kg × ' : '') + UI.fmt.n(s.reps)) + '</span>' +
            '<button class="sup" data-supserie="' + s.i + '" aria-label="Retirer">' + Icon('close', 13) + '</button>' +
          '</div>').join('') + '</div>' +
        '<button class="btn sm soft" style="margin-top:10px" data-plusserie="' + UI.attr(g.exoId) + '">' +
          Icon('plus', 15) + 'Une série de plus</button>' +
      '</div>';
    }).join('');

    UI.openSheet(
      '<div class="mbody" style="padding-top:6px">' +
        '<h2 style="font-size:23px;margin-bottom:2px">Séance de musculation</h2>' +
        '<p class="muted" style="font-size:13px">Ajoute tes exercices, puis tes séries.</p>' +

        '<div class="bilan-seance">' +
          '<div><b>' + UI.fmt.n(calc.kcal) + '</b><span>kcal</span></div>' +
          '<div><b>' + (calc.tonnage >= 1000 ? (calc.tonnage / 1000).toFixed(1) + ' t' : UI.fmt.n(calc.tonnage) + ' kg') + '</b><span>soulevé</span></div>' +
          '<div><b>' + calc.series + '</b><span>séries</span></div>' +
        '</div>' +

        '<label class="field" style="margin-top:14px"><span>Durée de la séance</span>' +
          '<input type="number" inputmode="numeric" data-min value="' + brouillon.minutes + '" min="1" max="300"></label>' +

        blocs +

        '<button class="btn block" style="margin-top:12px" data-addexo>' + Icon('plus', 17) + 'Ajouter un exercice</button>' +
        (brouillon.series.length
          ? '<button class="btn primary block lg" style="margin-top:10px" data-save>' + Icon('check', 18) + 'Enregistrer la séance</button>'
          : '') +
        '<p class="muted" style="font-size:11px;margin-top:12px;text-align:center">Calories estimées' +
          UI.hint("Le calcul part du travail mécanique réel : la charge, l'amplitude du mouvement et le nombre de répétitions, corrigés du rendement musculaire. Il est ensuite recoupé avec la table publique des dépenses énergétiques.\n" +
                  "Ton poids est pris à " + Math.round(p) + " kg. Tu peux le corriger dans Santé.", 'D\'où vient ce chiffre') + '</p>' +
      '</div>',
      { onMount: (sh) => {
          sh.querySelector('[data-min]').oninput = (e) => {
            brouillon.minutes = Math.max(1, Number(e.target.value) || 1);
            const c = SPORT.caloriesSeance(brouillon.series, brouillon.minutes, p);
            const b = sh.querySelector('.bilan-seance b');
            if (b) b.textContent = UI.fmt.n(c.kcal);
          };
          sh.querySelector('[data-addexo]').onclick = () => choisirExo();
          sh.querySelectorAll('[data-plusserie]').forEach((b) => b.onclick = () => ajouterSerie(b.dataset.plusserie));
          sh.querySelectorAll('[data-supserie]').forEach((b) => b.onclick = () => {
            brouillon.series.splice(Number(b.dataset.supserie), 1);
            UI.haptic('light'); ecranSeance();
          });
          const save = sh.querySelector('[data-save]');
          if (save) save.onclick = enregistrerSeance;
        } }
    );
  }

  function choisirExo() {
    const listeGroupes = SPORT.GROUPES.map((g) =>
      '<button class="chip" data-groupe="' + g.id + '">' + UI.esc(g.nom) + '</button>').join('');

    UI.openSheet(
      '<div class="mbody" style="padding-top:6px">' +
        '<h2 style="font-size:22px;margin-bottom:12px">Quel exercice ?</h2>' +
        '<label class="search" style="box-shadow:var(--sh-inset)">' + Icon('search', 17) +
          '<input type="search" data-q placeholder="Développé, squat, traction…" autocomplete="off"></label>' +
        '<div class="chips" style="margin-top:12px">' + listeGroupes + '</div>' +
        '<div data-res style="margin-top:6px"></div>' +
      '</div>',
      { onMount: (sh) => {
          const q = sh.querySelector('[data-q]'), out = sh.querySelector('[data-res]');
          const montrer = (liste) => {
            out.innerHTML = liste.length
              ? '<div class="list">' + liste.map((e) =>
                  '<button class="rowitem" data-exo="' + e.id + '">' +
                    '<span class="ic">' + Icon('dumbbell', 17) + '</span>' +
                    '<span class="tx"><b>' + UI.esc(e.nom) + '</b><small>' +
                      UI.esc(SPORT.MATERIEL[e.materiel]) + ' · ' +
                      UI.esc(e.principaux.map((m) => SPORT.MUSCLES[m] ? SPORT.MUSCLES[m].nom : m).join(', ')) +
                    '</small></span>' +
                    '<span class="rt">' + Icon('next', 15) + '</span></button>').join('') + '</div>'
              : UI.empty('search', 'Rien sous ce nom', 'Essaie un autre mot, ou passe par les groupes.');
            out.querySelectorAll('[data-exo]').forEach((b) => b.onclick = () => {
              UI.closeSheet();
              ajouterSerie(b.dataset.exo, true);
            });
          };
          let groupe = null;
          const rafraichir = () => {
            const v = q.value.trim();
            if (v) return montrer(SPORT.chercherExo(v, 30));
            montrer(groupe ? SPORT.parGroupe(groupe) : SPORT.EXOS.slice(0, 14));
          };
          q.oninput = UI.debounce(rafraichir, 160);
          sh.querySelectorAll('[data-groupe]').forEach((b) => b.onclick = () => {
            groupe = groupe === b.dataset.groupe ? null : b.dataset.groupe;
            sh.querySelectorAll('[data-groupe]').forEach((x) => x.classList.toggle('on', x === b && groupe));
            q.value = ''; rafraichir();
          });
          rafraichir();
        } }
    );
  }

  /* ============================================================
     Ajouter des séries

     Deux molettes : la charge et les répétitions. On tire, ça
     claque, on valide. C'est le geste des applications de salle,
     et c'est le bon : on ajuste toujours de deux kilos ou d'une
     répétition, jamais de rien du tout.

     La série précédente sert de point de départ, y compris celle
     d'il y a un mois : on refait presque toujours la même chose.
     ============================================================ */
  function ajouterSerie(exoId, premiere) {
    const exo = SPORT.trouver(exoId);
    if (!exo) return;
    const memes = brouillon.series.filter((s) => s.exoId === exoId);
    const derniere = memes[memes.length - 1] || dernierePartout(exoId);
    const iso = exo.mode === 'iso';
    const sansCharge = exo.mode === 'corps';
    const p = poids();

    const charge0 = derniere ? Number(derniere.charge) || 0 : (exo.mode === 'corpsplus' ? 0 : 20);
    const reps0 = derniere ? Number(derniere.reps) || 1 : (iso ? 45 : 10);

    const molCharge = sansCharge ? '' : Molette.html({
      id: 'charge',
      label: exo.mode === 'corpsplus' ? 'Lest ajouté' : 'Poids',
      unite: 'kg', min: 0, max: 300, pas: 2.5, decimales: 1, valeur: charge0
    });
    const molReps = Molette.html({
      id: 'reps',
      label: iso ? 'Durée' : 'Répétitions',
      unite: iso ? 's' : 'réps',
      min: iso ? 5 : 1, max: iso ? 300 : 50, pas: iso ? 5 : 1, decimales: 0, valeur: reps0
    });
    const molNb = Molette.html({
      id: 'nb', label: 'Nombre de séries', unite: 'séries',
      min: 1, max: 12, pas: 1, decimales: 0, valeur: premiere ? 3 : 1
    });

    const muscles = exo.principaux.map((m) => SPORT.MUSCLES[m] ? SPORT.MUSCLES[m].nom : m);

    UI.openSheet(
      '<div class="mbody" style="padding-top:6px">' +
        '<div class="mcat">' + UI.esc(SPORT.MATERIEL[exo.materiel]) + ' · ' + UI.esc(muscles.join(', ')) + '</div>' +
        '<h2 style="font-size:23px">' + UI.esc(exo.nom) + '</h2>' +
        molCharge + molReps + molNb +
        '<div class="apercu-serie" data-apercu></div>' +
        '<button class="btn primary block lg" style="margin-top:16px" data-ok>' + Icon('plus', 18) + 'Ajouter</button>' +
        '<button class="btn ghost block" style="margin-top:6px" data-annuler>Annuler</button>' +
      '</div>',
      { onMount: (sh) => {
          const apercu = sh.querySelector('[data-apercu]');
          const lire = () => ({
            charge: sansCharge ? 0 : (Molette.valeur(sh, 'charge') || 0),
            reps: Molette.valeur(sh, 'reps') || 1,
            nb: Molette.valeur(sh, 'nb') || 1
          });
          const rafraichir = () => {
            const v = lire();
            const essai = [];
            for (let i = 0; i < v.nb; i++) essai.push({ exoId: exoId, charge: v.charge, reps: v.reps });
            /* On affiche le total de la seance apres ajout, et non
               l'ecart : le premier exercice ferait apparaitre d'un
               coup toute la depense de base, ce qui donnerait
               l'impression fausse qu'une serie vaut trois cents
               calories. */
            const c = SPORT.caloriesSeance(brouillon.series.concat(essai), brouillon.minutes, p);
            apercu.innerHTML =
              '<span>' + v.nb + ' × ' + (sansCharge ? '' : UI.fmt.n(v.charge) + ' kg × ') +
                UI.fmt.n(v.reps) + (iso ? ' s' : ' réps') + '</span>' +
              '<b>' + UI.fmt.n(c.kcal) + ' kcal en tout</b>';
          };
          Molette.activer(sh, rafraichir);
          rafraichir();

          sh.querySelector('[data-annuler]').onclick = () => ecranSeance();
          sh.querySelector('[data-ok]').onclick = () => {
            const v = lire();
            for (let i = 0; i < v.nb; i++) {
              brouillon.series.push({ exoId: exoId, charge: v.charge, reps: v.reps });
            }
            UI.haptic('success');
            ecranSeance();
          };
        } }
    );
  }

  /* La dernière fois qu'on a fait cet exercice, même il y a un
     mois : c'est le meilleur point de départ. */
  function dernierePartout(exoId) {
    const l = seances().filter((s) => s.type === 'muscu').sort((a, b) => (a.day < b.day ? 1 : -1));
    for (const s of l) {
      const m = (s.series || []).filter((x) => x.exoId === exoId);
      if (m.length) return m[m.length - 1];
    }
    return null;
  }

  function enregistrerSeance() {
    const p = poids();
    const calc = SPORT.caloriesSeance(brouillon.series, brouillon.minutes, p);
    const groupes = Array.from(new Set(brouillon.series.map((s) => {
      const e = SPORT.trouver(s.exoId);
      return e ? e.groupe : null;
    }).filter(Boolean)));
    const nomsGroupes = groupes.map((g) => (SPORT.GROUPES.find((x) => x.id === g) || {}).nom).filter(Boolean);

    Store.add('seances', {
      type: 'muscu',
      day: brouillon.day,
      nom: nomsGroupes.length ? nomsGroupes.slice(0, 3).join(', ') : 'Musculation',
      minutes: brouillon.minutes,
      series: brouillon.series,
      kcal: calc.kcal, tonnage: calc.tonnage, met: calc.met,
      poids: p
    });
    Store.log('sport', { type: 'muscu', kcal: calc.kcal, series: calc.series });
    if (global.Game) Game.award('seance', 20);
    brouillon = null;
    UI.closeSheet(); UI.haptic('success');
    UI.toast('Séance enregistrée · ' + calc.kcal + ' kcal');
    render();
  }

  /* ============================================================
     Saisie d'un sport
     ============================================================ */
  /* ============================================================
     Choisir un sport

     Quatre-vingt-huit lignes grises avec la meme petite icone :
     on cherchait « natation » a la lecture. En cartes photo,
     chaque famille tient sur un carrousel et on reconnait le
     sport avant d'avoir lu son nom.
     ============================================================ */
  const carteSport = (sp) => ({
    id: sp.id, titre: sp.nom, sous: sp.fam,
    ph: sp.nom, type: 'sport'
  });

  function choisirSport() {
    const fams = SPORT.familles();

    const parFamille = () => fams.map((f) => {
      const l = SPORT.SPORTS.filter((x) => x.fam === f);
      if (!l.length) return '';
      return '<h4 class="ftitre">' + UI.esc(f) + '</h4>' +
        Cartes.carrousel(l.map(carteSport), { classe: 'petit' });
    }).join('');

    Cartes.ouvrir({
      tete: Cartes.tete('Quel sport ?', SPORT.SPORTS.length + ' possibilités', ['#1F6E5A', '#3FAF8A'], 'ballon'),
      corps:
        '<label class="search" style="box-shadow:var(--sh-inset);margin-bottom:6px">' + Icon('search', 17) +
          '<input type="search" data-q placeholder="Volley, natation, boxe…" autocomplete="off"></label>' +
        '<div data-res>' + parFamille() + '</div>',
      onCarte: (id) => { UI.closeSheet(); saisirSport(id); },
      onMount: (sh) => {
        const q = sh.querySelector('[data-q]'), out = sh.querySelector('[data-res]');
        const rebrancher = () => {
          out.querySelectorAll('[data-kart]').forEach((b) => b.onclick = () => {
            UI.closeSheet(); saisirSport(b.dataset.kart);
          });
          if (global.Stock) Stock.peupler(out);
        };
        q.oninput = UI.debounce(() => {
          const v = q.value.trim();
          if (!v) { out.innerHTML = parFamille(); rebrancher(); return; }
          const l = SPORT.chercherSport(v, 24);
          out.innerHTML = l.length
            ? Cartes.grille(l.map(carteSport))
            : UI.empty('search', 'Pas dans la liste', 'Choisis une activité proche, la dépense sera juste.');
          rebrancher();
        }, 180);
        rebrancher();
      }
    });
  }


  async function saisirSport(id) {
    const s = SPORT.sport(id);
    if (!s) return;
    const p = poids();
    const r = await UI.promptSheet(s.nom, [
      { name: 'minutes', label: 'Durée (minutes)', type: 'number', inputmode: 'numeric', value: 45 },
      { name: 'intensite', label: 'Intensité', type: 'select', value: 'normale',
        options: SPORT.INTENSITES.map((i) => ({ v: i.id, n: i.nom })) },
      { name: 'jour', label: 'Quand', type: 'select', value: leJour,
        options: [0, 1, 2, 3, 4, 5, 6].map((n) => {
          const d = UI.day.add(UI.day.today(), -n);
          return { v: d, n: UI.day.label(d) };
        }) }
    ], 'Enregistrer');
    if (!r) return;

    const minutes = Math.max(1, Number(r.minutes) || 1);
    const kcal = Math.round(SPORT.caloriesSport(s.met, minutes, p, r.intensite));
    const inten = SPORT.INTENSITES.find((i) => i.id === r.intensite);

    Store.add('seances', {
      type: 'sport', day: r.jour, sportId: s.id, nom: s.nom,
      minutes: minutes, intensite: r.intensite, intensiteNom: inten ? inten.nom : '',
      kcal: kcal, met: s.met, poids: p, series: []
    });
    Store.log('sport', { type: 'sport', id: s.id, kcal: kcal });
    if (global.Game) Game.award('seance', 15);
    UI.haptic('success');
    UI.toast(s.nom + ' · ' + kcal + ' kcal');
    render();
  }

  /* ============================================================
     Détail d'une séance
     ============================================================ */
  function voirSeance(id) {
    const s = Store.find('seances', id);
    if (!s) return;
    const detail = s.type === 'muscu' ? detailMuscu(s) : detailSport(s);
    UI.openSheet(
      '<div class="mbody" style="padding-top:6px">' +
        '<div class="mcat">' + UI.esc(UI.day.label(s.day)) + '</div>' +
        '<h2 style="font-size:23px">' + UI.esc(s.nom) + '</h2>' +
        '<div class="nums" style="margin-top:16px">' +
          '<div class="num"><b>' + UI.fmt.n(s.kcal) + '</b><span>kcal</span></div>' +
          '<div class="num"><b>' + UI.fmt.n(s.minutes) + '</b><span>minutes</span></div>' +
          '<div class="num"><b>' + (s.type === 'muscu' ? (s.series || []).length : s.met) + '</b><span>' + (s.type === 'muscu' ? 'séries' : 'MET') + '</span></div>' +
          '<div class="num"><b>' + (s.tonnage ? (s.tonnage >= 1000 ? (s.tonnage / 1000).toFixed(1) + ' t' : UI.fmt.n(s.tonnage) + ' kg') : '—') + '</b><span>soulevé</span></div>' +
        '</div>' +
        detail +
        '<button class="btn danger block" style="margin-top:18px" data-del>' + Icon('trash', 16) + 'Supprimer</button>' +
      '</div>',
      { onMount: (sh) => {
          sh.querySelector('[data-del]').onclick = () => {
            Store.del('seances', id); UI.closeSheet(); UI.haptic('warning'); render();
          };
        } }
    );
  }

  function detailMuscu(s) {
    const parExo = [];
    (s.series || []).forEach((x) => {
      const d = parExo[parExo.length - 1];
      if (d && d.exoId === x.exoId) d.series.push(x); else parExo.push({ exoId: x.exoId, series: [x] });
    });
    return '<div class="blk"><h4>Le détail</h4>' + parExo.map((g) => {
      const e = SPORT.trouver(g.exoId);
      if (!e) return '';
      return '<div class="ing"><div class="l"><div>' + UI.esc(e.nom) +
        '<small>' + UI.esc(e.principaux.map((m) => SPORT.MUSCLES[m] ? SPORT.MUSCLES[m].nom : m).join(', ')) + '</small></div></div>' +
        '<div class="q">' + g.series.map((x) => (x.charge ? UI.fmt.n(x.charge) + '×' : '') + UI.fmt.n(x.reps)).join('  ') + '</div></div>';
    }).join('') + '</div>';
  }

  function detailSport(s) {
    return '<p class="muted" style="font-size:13.5px;margin-top:14px">' +
      'Intensité ' + UI.esc((s.intensiteNom || 'normale').toLowerCase()) + '. ' +
      'Le calcul utilise le coût énergétique de référence de ce sport et ton poids du moment (' + Math.round(s.poids || 75) + ' kg).' +
      '</p>';
  }

  global.Sport = { mount, duJour, semaine, carteDuCorps, seances, nouvelleSeance, choisirSport, _silhouette: silhouette };
  App.register('sport', { mount: mount });
})(window);
