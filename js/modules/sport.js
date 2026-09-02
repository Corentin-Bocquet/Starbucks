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

  /* Le corps, en neutre : c'est le support, il ne se colore jamais.
     Les bras sont ranges a part parce qu'ils sont pivotes de seize
     degres vers l'exterieur : bras colles au corps, on ne distingue
     plus le triceps de l'oblique. */
  const TRONC = [
    /* Tete, oreille, cou */
    'M60 4c-8.6 0-15.4 7.2-15.4 17S51.4 39 60 39V4Z',
    'M45.2 19.4c-2.8 0-4.8 2.2-4.8 5s2 5 4.8 5Z',
    'M53 34h7v14.5h-7Z',
    /* Buste : epaules larges, taille marquee, hanches */
    'M60 42c-9.6.8-17.6 5-22.6 12.2-4.8 7-5.8 15.8-4.8 25.2.8 7.8 2.2 15.4 3.4 22.6 1.4 7.6 2.4 15 2.6 22H60Z',
    /* Cuisse, genou, mollet, cheville, pied */
    'M38.4 122c-1.8 9-2.2 19-1.6 29 .6 9.8 2 19.2 3.8 27.4H60V122Z',
    'M41.6 178.4c-.8 4.8-.8 9 0 12.6H60v-12.6Z',
    'M42 190.6c-.6 8.8 0 18.2 1.2 26.8 1 7 2.2 13.2 3.6 18H60v-44.8Z',
    'M47.4 235.4c-1.6 4.8-4.8 8.6-9 11-3.4 2-4.8 4.6-4.2 7 .6 2.2 3 3.6 6.4 3.6H60v-21.6Z'
  ];
  const BRAS = [
    /* Deltoide, bras, avant-bras */
    'M36.6 51.4c-6.6 3.8-10.8 10-12.2 18.8-.6 4-.8 7.8-.6 11.2l12 1.2c.2-8.4 1.6-16 4.4-22.6Z',
    'M23.6 81.2c-1 9.6-2.4 19-4.2 28.2-.8 4-1.6 7.6-2.4 11l11.2 2.6c1-4 2-8.2 2.8-12.8 1.6-9.2 2.6-18.6 3-27.8Z',
    'M17 120.2c-1.6 6.8-3.2 12.8-4.6 17.6-1.2 4-2.2 7.2-2.8 9l10.4 3.2c.8-2.4 1.8-5.6 3-9.8 1.4-4.8 2.8-10.6 4.2-17.2Z',
    /* Main et doigts */
    'M9.6 145.4c-2.6 1.2-4.6 3.6-4.8 6.2 0 1.8.4 3.2 1.2 4.4l2.6-6.6Zm.6 3.6c-1.8 3-3 6.2-3.4 9-.4 2.8.4 5.2 2.2 6.4 2.6 1.6 6.2.6 8.2-2.2 1.6-2.4 3.2-5.6 4.4-9.4Z',
    'M4.8 154.4c-1.4 2.6-2 5.2-1.6 7.2.4 1.8 1.6 3 3.2 2.8l1-8.6Z'
  ];

  /* Les muscles, poses par-dessus. [identifiant, trace]. */
  const MUSCLES_TRONC = {
    avant: [
      ['trap',   'M60 42.6c-7 .6-13.2 3-18 7l4.2 9c4-3 8.6-4.6 13.8-5Z'],
      ['pect',   'M60 56.4l-15.4 3.4c-4.2 4.2-6.2 10.8-5.6 17.8.4 4.8 1.8 8.8 4.2 11.6L60 92Z'],
      ['abdo',   'M60 93.4l-13 1.8c-1.4 9-1.6 19.4-.6 29.8L60 126.4Z'],
      ['obl',    'M45 95.6c-3.6 3-5.6 9-5.8 16.6-.2 5.2.4 10 1.6 13.6l5.2.6c-1-10-1-20.6.4-30.4Z'],
      ['flechh', 'M58.4 124.4l-12.2-1c.4 3.6 1 6.8 1.8 9.4l10.4.6Z'],
      ['quad',   'M58.4 131.6l-17.6 1.2c-1.4 9-1.6 18.8-1 28.6.4 5.8 1 11.4 1.8 16.2l16.8-.4Z'],
      ['add',    'M58.4 132.4l-7.8.6c-.8 9-1 18.2-.4 26.8l8.2.4Z'],
      ['mol',    'M43.6 192.6c-1 8-.8 16.8.6 25.4.6 4.2 1.4 8 2.2 11.2l12-.4v-36.8Z']
    ],
    arriere: [
      ['trap',   'M60 42.6c-8.4.8-15.6 3.8-20.6 8.8-1 8.8.6 16.6 4.8 23.2L60 77.8Z'],
      ['rhom',   'M60 58l-12.2 2c-.6 4.6-.4 8.8.6 12.6L60 74.4Z'],
      ['dors',   'M60 76.6l-16.8-3c-4.2 6.8-5.6 15.2-4.2 24.6.6 4.2 1.8 7.8 3.6 10.8L60 111.6Z'],
      ['lomb',   'M60 113.6l-14-1.8c-.6 7-.4 13.8.6 20.2l13.4.6Z'],
      ['fess',   'M60 132.6l-18.2.6c-2.2 7-2.2 14.8 0 21.4 1 3.4 2.4 6.2 4.4 8l13.8.8Z'],
      ['fess-m', 'M39.6 133.4c-2.4 5.2-3.2 11.6-1.8 17.4.4 2.2 1 4 1.8 5.4l2.6.2c-1.4-7.6-1.6-15.6-.4-23Z'],
      ['isch',   'M58.4 162.6l-16.8.8c-1.4 7-1.8 15.2-1 23.2.4 4.2 1.2 8.2 2 11.6l15.8-.4Z'],
      ['mol',    'M43.6 199.6c-1 7.4-.8 15.6.6 23.4.6 3.8 1.4 7.2 2.2 10.2l12-.4v-34.2Z'],
      ['sol',    'M45.8 227.6c.6 3.8 1.4 7 2.2 9.4l10-.4v-9.6Z']
    ]
  };
  const MUSCLES_BRAS = {
    avant: [
      ['delt-a', 'M37.4 50.6c-7 3.8-11.4 10.2-12.8 19.2-.6 4-.8 7.8-.6 11.4l12 1.2c.2-8.4 1.4-16 4.2-22.4Z'],
      ['bi',     'M25.2 81.4c-.8 8.4-1.8 16.2-3.2 23.4l11.2 2.4c1.2-7.4 2-15.6 2.4-24.4Z'],
      ['avb',    'M21.2 108.2c-1.4 6.8-3 13.2-4.6 19l10.4 3.2c1.6-6.2 3-12.8 4.2-19.8Z']
    ],
    arriere: [
      ['delt-p', 'M37.4 50.6c-7 3.8-11.4 10.2-12.8 19.2-.6 4-.8 7.8-.6 11.4l12 1.2c.2-8.4 1.4-16 4.2-22.4Z'],
      ['rond',   'M40 62.4c-2.4 3.4-3.8 7.6-4.2 12.4l6 1.4 2.2-11Z'],
      ['tri',    'M25.2 81.4c-.8 8.4-1.8 16.2-3.2 23.4l11.2 2.4c1.2-7.4 2-15.6 2.4-24.4Z'],
      ['avb',    'M21.2 108.2c-1.4 6.8-3 13.2-4.6 19l10.4 3.2c1.6-6.2 3-12.8 4.2-19.8Z']
    ]
  };

  /* Le bras pivote autour de l'epaule, vers l'exterieur. En SVG un
     angle positif tourne dans le sens des aiguilles, et comme le
     bras gauche pend sous le pivot, c'est bien un angle positif qui
     l'ecarte du corps. La zone de dessin est elargie de seize
     unites de chaque cote pour lui laisser la place. */
  const PIVOT = 'rotate(12 37 55)';

  /* Un score de 0 (jamais) à 1 (beaucoup) donne une teinte. */
  function teinte(v) {
    if (!v) return 'var(--silhouette)';
    const t = Math.min(1, v);
    return 'color-mix(in srgb, var(--accent) ' + Math.round(18 + t * 82) + '%, var(--silhouette))';
  }

  function silhouette(face, scores, max) {
    const peindre = (paires) => paires.map(([m, d]) => {
      const v = (scores[m] || 0) / (max || 1);
      return '<path d="' + d + '" fill="' + teinte(v) + '"/>';
    }).join('');
    const neutre = (traces) => traces.map((d) => '<path d="' + d + '" fill="var(--silhouette)"/>').join('');

    const moitie =
      neutre(TRONC) +
      '<g transform="' + PIVOT + '">' + neutre(BRAS) + '</g>' +
      peindre(MUSCLES_TRONC[face]) +
      '<g transform="' + PIVOT + '">' + peindre(MUSCLES_BRAS[face]) + '</g>';

    /* La moitie droite est le reflet exact de la gauche. L'axe est
       ramene a 59,7 pour que les deux moities se chevauchent d'un
       demi-point : posees bord a bord, elles laissaient un liseré
       de fond visible au milieu du corps. */
    return '<svg viewBox="-16 0 152 266" class="corps" aria-hidden="true">' +
      '<g>' + moitie + '</g>' +
      '<g transform="translate(119.4,0) scale(-1,1)">' + moitie + '</g>' +
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

  function historiqueBlock() {
    const l = seances().slice().sort((a, b) => (b.day < a.day ? -1 : 1)).slice(0, 12);
    const passees = l.filter((s) => s.day !== UI.day.today());
    if (!passees.length) return '';
    return '<div class="section"><div class="sechead"><h2 style="font-size:16px">Avant</h2></div>' +
      '<div class="list">' + passees.map((s) =>
        '<div class="rowitem" data-seance="' + UI.attr(s.id) + '">' +
          '<span class="ic">' + Icon(s.type === 'muscu' ? 'dumbbell' : 'activity', 17) + '</span>' +
          '<span class="tx"><b>' + UI.esc(s.nom) + '</b><small>' + UI.esc(UI.day.label(s.day)) + '</small></span>' +
          '<span class="rt tabnum">' + UI.fmt.n(s.kcal) + ' kcal</span></div>').join('') + '</div></div>';
  }

  function bind() {
    root.querySelectorAll('[data-act]').forEach((b) => b.onclick = () => {
      if (b.dataset.act === 'muscu') nouvelleSeance();
      if (b.dataset.act === 'sport') choisirSport();
    });
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
  function choisirSport() {
    const fams = SPORT.familles();
    UI.openSheet(
      '<div class="mbody" style="padding-top:6px">' +
        '<h2 style="font-size:22px;margin-bottom:12px">Quel sport ?</h2>' +
        '<label class="search" style="box-shadow:var(--sh-inset)">' + Icon('search', 17) +
          '<input type="search" data-q placeholder="Volley, natation, boxe…" autocomplete="off"></label>' +
        '<div data-res style="margin-top:12px"></div>' +
      '</div>',
      { onMount: (sh) => {
          const q = sh.querySelector('[data-q]'), out = sh.querySelector('[data-res]');
          const carte = (s) => '<button class="rowitem" data-sport="' + s.id + '">' +
            '<span class="ic">' + Icon('activity', 17) + '</span>' +
            '<span class="tx"><b>' + UI.esc(s.nom) + '</b><small>' + UI.esc(s.fam) + '</small></span>' +
            '<span class="rt">' + Icon('next', 15) + '</span></button>';
          const brancher = () => out.querySelectorAll('[data-sport]').forEach((b) => b.onclick = () => {
            UI.closeSheet(); saisirSport(b.dataset.sport);
          });
          const tout = () => {
            out.innerHTML = fams.map((f) =>
              '<h4 style="font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:var(--muted);margin:16px 0 8px">' + UI.esc(f) + '</h4>' +
              '<div class="list">' + SPORT.SPORTS.filter((s) => s.fam === f).map(carte).join('') + '</div>').join('');
            brancher();
          };
          q.oninput = UI.debounce(() => {
            const v = q.value.trim();
            if (!v) return tout();
            const l = SPORT.chercherSport(v, 30);
            out.innerHTML = l.length ? '<div class="list">' + l.map(carte).join('') + '</div>'
              : UI.empty('search', 'Pas dans la liste', 'Choisis « Autre activité » en bas.');
            brancher();
          }, 160);
          tout();
        } }
    );
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

  global.Sport = { mount, duJour, semaine, carteDuCorps, seances, nouvelleSeance, choisirSport };
  App.register('sport', { mount: mount });
})(window);
