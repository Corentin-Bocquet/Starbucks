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

  /* Le support neutre : peau et volumes, jamais colore. */
  const CORPS = [
    /* Tete, oreille, cou */
    'M100 8c-10.4 0-18.6 11.2-18.6 25s8.2 25 18.6 25Z',
    'M81.8 30c-3 0-5.2 2.6-5.2 5.8s2.2 5.8 5.2 5.8Z',
    'M100 54c-5.8 0-9 1.6-10 5.2-.9 3.2-1.2 6.8-1.2 10.8H100Z',
    /* Buste : epaules, taille marquee, hanches */
    'M100 66c-17 0-29.6 4.4-38 13-6.4 6.6-9.4 15-8.8 25.4.5 9.6 2.1 19 3.7 28.4 1.7 10 2.7 19.6 2.7 29 0 9.4-.6 18.4-1.7 27.2-.9 7.4-.4 13.8 1.5 19 2.5 7 7.4 12 14.9 15.2 6.8 2.9 15.3 4.4 26.7 4.4Z',
    /* Cuisse */
    'M100 218c-13.8 0-24.4 1.1-31.8 3.2-4.9 10.6-7.2 23.4-7.2 38.2 0 14.9 1.7 29.8 3.8 43.6 2.1 13.8 4.2 25.5 6.4 34H100Z',
    /* Genou */
    'M100 317H78.6c.4 6.4 1.3 11.7 2.3 16H100Z',
    /* Mollet */
    'M100 331H80.2c-2.3 9.6-3.2 20.2-2.6 31.9.6 11 2.3 21.3 4.5 30.6H100Z',
    /* Cheville et pied */
    'M100 390H86c.4 4.5 1 8.3 1.7 11.3H100Z',
    'M100 399H87.4c-.5 4.5-2.8 7.9-6.2 10-2.8 1.7-3.9 3.9-3.4 6.2.6 2.1 2.9 3.3 5.6 3.3H100Z'
  ];

  /* Le bras, avec ses deux bords, deja ecarte du buste. */
  const MEMBRE = [
    /* Deltoide */
    'M66 70c-10.6 4-17.4 12-20.4 24-1.6 6.4-2.2 12-1.8 16.8l18.4 1.8c0-9.4 1.1-18 3.4-25.8 1.1-3.8 2.4-7.4 4-10.6Z',
    /* Bras */
    'M43.8 110.8c-.6 12-.6 24.4.2 37 .3 5 .7 9.8 1.2 14.2l17-1.6c-.4-4.6-.7-9.4-.9-14.4-.5-12.4-.4-24.6.3-36Z',
    /* Coude et avant-bras */
    'M45.2 162c1 9.6 2.2 19.4 3.6 29 .8 5.4 1.6 10.4 2.4 15l16-3.2c-.7-4.4-1.4-9.2-2.1-14.2-1.3-9.4-2.4-19-3.1-28.4Z',
    /* Main */
    'M51.4 206c-2.8 2-4.4 5.4-4.4 9.6 0 5.2 1.2 10.8 3.2 15.2 1.8 4 4.2 6.4 6.8 6.2 2.6-.2 4.6-2.8 5.4-6.8.8-4 .8-9.6 0-15.4Z'
  ];

  /* [identifiant, trace]. L'identifiant renvoie a SPORT.MUSCLES. */
  const MUSCLES_TRONC = {
    avant: [
      ['trap',   'M100 66c-13.6.4-24 3-31.4 8.4l5.6 13.4c6.4-3.8 14-6 25.8-7Z'],
      ['pect',   'M100 88l-30 5.2c-3.2 2.2-5.8 5.8-7.4 11L100 110Z'],
      ['pect',   'M100 111L62.6 105c-.5 6.4 1.1 11.7 4.8 16.5L100 130Z'],
      ['serr',   'M66.5 124.5l-2.2 4 8.8 3 1.7-4.2Zm-2.8 9.4l-1.8 4.2 8.8 2.8 1.5-4.2Zm-2.2 9.6l-1.5 4.2 8.8 2.6 1.3-4.2Z'],
      ['abdo',   'M99 132H85.4c-.6 5.4-1 10.8-1.2 16.2H99Z'],
      ['abdo',   'M99 152H83.8c-.4 5.4-.7 10.8-.7 16.2H99Z'],
      ['abdo',   'M99 172H82.9c0 5.4.2 10.8.6 16.2H99Z'],
      ['abdo',   'M99 192H83.8c.4 5.2 1.1 9.9 2 14.2H99Z'],
      ['obl',    'M82.4 130c-6.2 3-9.8 10-10.8 20.6-1 10.6 0 21.2 2.6 29.6l6.2.6c-1.6-16.9-1.6-33.8 2-50.8Z'],
      ['flechh', 'M99 210l-12.4-.6c.7 4.2 1.6 7.8 2.7 10.7l9.7.6Z'],
      ['quad',   'M78 232c-6.4 10.6-9.6 23.4-10.1 38.2-.5 14.8 1.1 29.6 3.2 41.3l8.5 1.1c-2.1-26.6-3.2-54.1-1.6-80.6Z'],
      ['quad',   'M97 230l-16.6 1.6c-2.7 26.6-1.6 54.1.5 80.6l16.1.5Z'],
      ['quad',   'M97 300l-13.9-.5c1.1 10.6 2.7 19.6 4.3 26.5l9.6.5Z'],
      ['add',    'M97 230l-9.6.5c-1.6 20.2-1.6 40.4 0 59.5l9.6.5Z'],
      ['tib',    'M97 348l-11.7.5c-1.6 16-1.6 31.9 0 46.8l11.7.5Z'],
      ['mol',    'M84.6 349c-3.2 8-4.3 18.2-3.7 28.2.3 6.6 1 12.8 2.1 17.6l3.2.5c-1.6-15.4-2.1-30.8-1.6-46.3Z']
    ],
    arriere: [
      ['trap',   'M100 66c-14.4.5-26 3.8-33.5 9.9 0 12.2 2.9 22.4 8.6 30.6L100 112Z'],
      ['rhom',   'M100 88l-19.2 3.2c-.5 6 0 11.5 2.1 16.5L100 111Z'],
      ['dors',   'M100 113l-24.6-4.3c-6.4 8.8-8.5 20.4-6.4 33.2 1.1 6 3.2 11.5 6.4 15.9L100 164Z'],
      ['lomb',   'M100 166l-21.3-2.1c-1.1 9.4-.9 18.6.6 26.9L100 194Z'],
      ['fess',   'M100 196l-26.6.5c-3.7 9.9-3.7 21 0 30.3 1.9 5.2 4.3 9.2 7.4 12.2L100 242Z'],
      ['fess-m', 'M73.4 196c-3.7 7.4-4.8 16.8-3.2 24.8.6 3.5 1.8 6.4 3.2 8.1l3.7.5c-1.8-11-2.4-22.6-1.2-33.4Z'],
      ['isch',   'M97 248l-16 .5c-2.1 10.4-2.7 22.4-1.9 34.1.6 6.9 1.9 13.3 3.2 18.6l14.7.5Z'],
      ['isch',   'M79.4 249l-6.9.5c-2.1 10.4-2.7 22-1.3 32.9.6 5.9 1.9 11 3.2 15l5.3.5c-1.9-16-1.9-32.9 0-48.9Z'],
      ['mol',    'M97 348l-10.1.5c-2.1 9.1-2.7 19.4-1.9 29.1.4 5.9 1.3 11 2.1 15.4l9.9.5Z'],
      ['mol',    'M84.8 349c-3.2 7.4-4.3 17.2-3.7 26.8.4 6.4 1.3 12 2.5 16.5l3.2.5c-1.9-14.9-2.4-29.6-2-43.8Z'],
      ['sol',    'M97 396l-11.7-.5c.6 5.9 1.5 10.4 2.5 13.8l9.2.5Z']
    ]
  };

  const MUSCLES_BRAS = {
    avant: [
      ['delt-a', 'M66 70c-10.6 4-17.4 12-20.4 24-1.6 6.4-2.2 12-1.8 16.8l18.4 1.8c0-9.4 1.1-18 3.4-25.8 1.1-3.8 2.4-7.4 4-10.6Z'],
      ['bi',     'M44 112c-.6 11.4-.5 22.9.2 34.4l17-1.5c-.5-11.4-.5-22.7 0-33.5Z'],
      ['avb',    'M44.6 148c.8 8.2 1.9 16.6 3.2 24.8l16.4-2.4c-1.1-8-2-16.2-2.6-24.2Z'],
      ['avb',    'M48.2 175c1 6.2 2.1 12.2 3.2 17.6l16-3.2c-1-5.2-1.9-11-2.7-17.2Z']
    ],
    arriere: [
      ['delt-p', 'M66 70c-10.6 4-17.4 12-20.4 24-1.6 6.4-2.2 12-1.8 16.8l18.4 1.8c0-9.4 1.1-18 3.4-25.8 1.1-3.8 2.4-7.4 4-10.6Z'],
      ['rond',   'M67 96c-3.2 4.2-5 9.6-5.6 15.9l8.8 1.8 3.2-15.1Z'],
      ['tri',    'M44 112c-.6 11.4-.5 22.9.2 34.4l17-1.5c-.5-11.4-.5-22.7 0-33.5Z'],
      ['avb',    'M44.6 148c.8 8.2 1.9 16.6 3.2 24.8l16.4-2.4c-1.1-8-2-16.2-2.6-24.2Z'],
      ['avb',    'M48.2 175c1 6.2 2.1 12.2 3.2 17.6l16-3.2c-1-5.2-1.9-11-2.7-17.2Z']
    ]
  };

  /* Un score de 0 (jamais) a 1 (beaucoup) donne une teinte. */
  function teinte(v) {
    if (!v) return 'var(--silhouette)';
    const t = Math.min(1, v);
    return 'color-mix(in srgb, var(--accent) ' + Math.round(20 + t * 80) + '%, var(--silhouette))';
  }

  function silhouette(face, scores, max) {
    const trait = ' stroke="var(--trait-corps)" stroke-width=".8" stroke-linejoin="round"';
    const peindre = (paires) => paires.map(([m, d]) => {
      const v = (scores[m] || 0) / (max || 1);
      return '<path d="' + d + '" fill="' + teinte(v) + '"' + trait + '/>';
    }).join('');
    const neutre = (traces) => traces.map((d) =>
      '<path d="' + d + '" fill="var(--silhouette)"' + trait + '/>').join('');

    const moitie =
      neutre(CORPS) +
      '<g transform="translate(5,0)">' + neutre(MEMBRE) + '</g>' +
      peindre(MUSCLES_TRONC[face]) +
      '<g transform="translate(5,0)">' + peindre(MUSCLES_BRAS[face]) + '</g>';

    /* Les deux moities se chevauchent d'un demi-point : posees bord
       a bord, un lisere de fond restait visible au milieu. */
    return '<svg viewBox="30 0 140 424" class="corps" aria-hidden="true">' +
      '<g>' + moitie + '</g>' +
      '<g transform="translate(199.4,0) scale(-1,1)">' + moitie + '</g>' +
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

  function render() {
    const s7 = semaine(7);
    const jour = duJour();

    root.innerHTML = '<div class="wrap">' +
      enteteBlock(s7) +
      '<div class="grid tight two" style="margin-top:14px">' +
        '<button class="btn primary lg" data-act="muscu">' + Icon('dumbbell', 19) + 'Musculation</button>' +
        '<button class="btn lg" data-act="sport">' + Icon('activity', 19) + 'Un sport</button>' +
      '</div>' +
      (jour.seances ? jourBlock(jour) : '') +
      carteDuCorps(7) +
      historiqueBlock() +
      '</div>';
    bind();
  }

  function enteteBlock(s7) {
    return '<div class="section" style="padding-top:14px">' +
      '<div class="panel entete-sport">' +
        '<div class="illu">' + Art('haltere', 74) + '</div>' +
        '<div class="chiffres">' +
          '<div><b>' + s7.seances + '</b><span>séance' + (s7.seances > 1 ? 's' : '') + '</span></div>' +
          '<div><b>' + UI.fmt.n(s7.kcal) + '</b><span>kcal</span></div>' +
          '<div><b>' + (s7.tonnage >= 1000 ? (s7.tonnage / 1000).toFixed(1) + ' t' : UI.fmt.n(s7.tonnage) + ' kg') + '</b><span>soulevé</span></div>' +
        '</div>' +
        '<p class="muted" style="font-size:12.5px;margin-top:12px">Sur les sept derniers jours.</p>' +
      '</div></div>';
  }

  function jourBlock(j) {
    return '<div class="section"><div class="sechead"><h2 style="font-size:16px">Aujourd\'hui</h2>' +
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
      .filter((s2) => s2.day !== UI.day.today())
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
    brouillon = { type: 'muscu', nom: 'Musculation', day: UI.day.today(), minutes: 60, series: [] };
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
      { name: 'jour', label: 'Quand', type: 'select', value: UI.day.today(),
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
