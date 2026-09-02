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
  /* Chaque entree vaut [muscle, trace, centre].
     Une piece « centre » est dessinee une fois ; les autres sont
     dessinees a gauche puis reflechies a droite, ce qui garantit
     une silhouette parfaitement symetrique sans tracer deux fois.
     Les traces sont volontairement doux : on veut un pictogramme
     lisible, pas une planche d'anatomie. */
  const CORPS = {
    avant: [
      ['neutre', 'M55 3c7.2 0 13 6 13 13.5S62.2 31 55 31s-13-6.4-13-14.5S47.8 3 55 3Z', 1],
      ['neutre', 'M49 30h12v8.5H49Z', 1],
      ['trap',   'M55 34c7 0 13 2 16 5l-3.5 7C63 44 59 43 55 43Z'],
      ['delt-a', 'M40 42c-8 1.5-13.5 7-15.5 16-.8 3.6-.8 6.6-.4 8.8l12.4-2.2C36 56 37.4 47.6 40 42Z'],
      ['pect',   'M41.5 44.5c4.6-1.4 9.6-1.8 12.5-1.2v25.4c-6 2.4-12.2 1.4-15.4-2.6-2.2-6.6-1-15.6 2.9-21.6Z'],
      ['abdo',   'M55 71c3.4 0 6.6.4 9 1.2v42.6c-2.4 1-5.6 1.4-9 1.4Z'],
      ['obl',    'M38.6 68.6c2 12.4 3.4 27 4.6 41.6l-4.4-3.6c-2.6-11.6-2.6-25.6-1.6-36.6Z'],
      ['bi',     'M25 68.4c-2.6 8-3.6 15.6-3 22.6l10.4 1.6c1-9.2 2.4-17.6 4-24.8Z'],
      ['avb',    'M22.2 93.6c-2.6 10.4-3.6 20.6-3.4 29.4l9.2 1.2c.8-10 2.2-19.8 4-28.8Z'],
      ['neutre', 'M18 124.5c-1 5.6-.6 9.6 1.4 11.4 2.4 2 5.6 1 7-1.6 1-1.8 1.4-5 1.4-8.6Z', 1],
      ['flechh', 'M46 117c3 .8 6 1.2 9 1.2v9.8h-9Z'],
      ['quad',   'M43.4 128h11.6v45.4H41.8c-1.4-15.6-1-31 1.6-45.4Z'],
      ['add',    'M52 130h3v33h-4.4Z'],
      ['mol',    'M42.4 176.4h12.6v38.6h-9.8c-2.4-12.8-3.2-25.8-2.8-38.6Z'],
      ['neutre', 'M44 216.5h11v7.5H41.5c-.4-4 .4-6.6 2.5-7.5Z', 1]
    ],
    arriere: [
      ['neutre', 'M55 3c7.2 0 13 6 13 13.5S62.2 31 55 31s-13-6.4-13-14.5S47.8 3 55 3Z', 1],
      ['trap',   'M55 33c7.4 0 13.6 2 17 5.4 1.4 11.6-.6 21.4-5 29L55 71Z'],
      ['delt-p', 'M40 41c-8 1.5-13.5 7-15.5 16-.8 3.6-.8 6.6-.4 8.8l12.4-2.2C36 55 37.4 46.6 40 41Z'],
      ['rond',   'M40.6 51.4c-2.4 6-3 10.4-2 14.6l7.4 1.6 2.4-14.6Z'],
      ['dors',   'M38.6 60c-1.4 13.6 1 24.4 6.6 32.4l9.8 1.8V64.4Z'],
      ['rhom',   'M46.5 48h8.5v18h-8.5Z'],
      ['lomb',   'M46.6 93.6c2.8.6 5.6 1 8.4 1v22.4h-8.4Z'],
      ['tri',    'M25 66.4c-2.6 8-3.6 15.6-3 22.6l10.4 1.6c1-9.2 2.4-17.6 4-24.8Z'],
      ['avb',    'M22.2 91.6c-2.6 10.4-3.6 20.6-3.4 29.4l9.2 1.2c.8-10 2.2-19.8 4-28.8Z'],
      ['neutre', 'M18 122.5c-1 5.6-.6 9.6 1.4 11.4 2.4 2 5.6 1 7-1.6 1-1.8 1.4-5 1.4-8.6Z', 1],
      ['fess',   'M55 116v22.4H43c-2.6-7.6-2-15.6 1.6-22.4Z'],
      ['fess-m', 'M39 115.6c-2.2 7.4-2.4 14-.6 20l4.2 1v-21Z'],
      ['isch',   'M43.4 140h11.6v36.4H42.4c-1.4-12.4-1-24.6 1-36.4Z'],
      ['mol',    'M42.6 178.4h12.4v24.6h-9.6c-2-8-2.8-16.4-2.8-24.6Z'],
      ['sol',    'M44 204h11v12h-8.6c-1.4-4-2.2-8-2.4-12Z'],
      ['neutre', 'M44 218.5h11v7.5H41.5c-.4-4 .4-6.6 2.5-7.5Z', 1]
    ]
  };

  /* Un score de 0 (jamais) à 1 (beaucoup) donne une teinte. */
  function teinte(v) {
    if (!v) return 'var(--silhouette)';
    const t = Math.min(1, v);
    return 'color-mix(in srgb, var(--accent) ' + Math.round(18 + t * 82) + '%, var(--silhouette))';
  }

  function silhouette(face, scores, max) {
    const piece = (m, d, neutre) => {
      const v = neutre ? 0 : (scores[m] || 0) / (max || 1);
      return '<path d="' + d + '" fill="' + (neutre ? 'var(--silhouette)' : teinte(v)) + '"/>';
    };
    /* La moitie gauche est tracee, la droite en est le reflet. */
    const gauche = CORPS[face].map(([m, d, n]) => piece(m, d, n)).join('');
    return '<svg viewBox="0 0 110 230" class="corps" aria-hidden="true">' +
      '<g>' + gauche + '</g>' +
      '<g transform="translate(110,0) scale(-1,1)">' + gauche + '</g>' +
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

  /* Une série se saisit avec deux molettes : la charge et les
     répétitions. Reprend la dernière série du même exercice,
     parce qu'on refait presque toujours la même. */
  async function ajouterSerie(exoId, premiere) {
    const exo = SPORT.trouver(exoId);
    if (!exo) return;
    const memes = brouillon.series.filter((s) => s.exoId === exoId);
    const derniere = memes[memes.length - 1] || dernierePartout(exoId);
    const iso = exo.mode === 'iso';
    const sansCharge = exo.mode === 'corps';

    const champs = [];
    if (!sansCharge) champs.push({
      name: 'charge', label: exo.mode === 'corpsplus' ? 'Lest ajouté (kg)' : 'Charge (kg)',
      type: 'number', inputmode: 'decimal', value: derniere ? derniere.charge : (exo.mode === 'corpsplus' ? 0 : 20)
    });
    champs.push({
      name: 'reps', label: iso ? 'Durée (secondes)' : 'Répétitions',
      type: 'number', inputmode: 'numeric', value: derniere ? derniere.reps : (iso ? 45 : 10)
    });
    champs.push({ name: 'nb', label: 'Combien de séries', type: 'number', inputmode: 'numeric', value: premiere ? 3 : 1 });

    const r = await UI.promptSheet(exo.nom, champs, 'Ajouter');
    if (!r) { ecranSeance(); return; }
    const nb = Math.max(1, Math.min(20, Number(r.nb) || 1));
    for (let i = 0; i < nb; i++) {
      brouillon.series.push({
        exoId: exoId,
        charge: sansCharge ? 0 : (Number(r.charge) || 0),
        reps: Math.max(1, Number(r.reps) || 1)
      });
    }
    UI.haptic('success');
    ecranSeance();
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
