/* ============================================================
   EVER — Statistiques et progression
   Une page de lecture, pas de saisie : ce que l'app sait de toi,
   résumé honnetement.
   ============================================================ */
(function (global) {
  'use strict';

  let root = null;

  function mount(el) {
    root = el;
    render();
    /* Le classement arrive apres coup : la page ne doit jamais
       attendre le reseau pour s'afficher. */
    chargerLigues();
  }

  function render() {
    const g = Game.state();
    const r = Rang.rang(g.xp);
    const food = global.Food ? Food.summary(14) : [];
    const health = global.Health ? Health.lastDays(14) : [];

    root.innerHTML = '<div class="wrap">' +
      carteRang(r, g) +
      medaillier(r) +
      ligueBlock() +

      '<div class="stats" style="margin-top:12px">' +
        tile('Série', (g.streak || 0) + ' j', 'flame') +
        tile('Repas notés', String(Store.all('meals').length), 'fork') +
        tile('Séances', String(Store.all('seances').length), 'dumbbell') +
        tile('Favoris', String(Store.get('favs', []).length + Store.get('codexFav', []).length), 'star') +
      '</div>' +

      cupsBlock() +

      '<div class="section"><div class="sechead"><h2 style="font-size:16px">Cette semaine</h2></div>' +
        '<div class="quests">' + Game.quests().map(quest).join('') + '</div></div>' +

      (food.some((f) => f.kcal) ? '<div class="section"><div class="sechead"><h2 style="font-size:16px">Calories, 14 jours</h2></div>' +
        '<div class="panel">' + UI.sparkline(food.map((f) => f.kcal)) +
        '<div class="row-between" style="margin-top:6px;font-size:12px;color:var(--muted)">' +
        '<span>moyenne ' + UI.fmt.n(avg(food.map((f) => f.kcal))) + ' kcal</span>' +
        '<span>objectif ' + UI.fmt.n(Food.goals().kcal) + '</span></div></div></div>' : '') +

      (health.some((h) => h.steps) ? '<div class="section"><div class="sechead"><h2 style="font-size:16px">Pas, 14 jours</h2></div>' +
        '<div class="panel">' + UI.sparkline(health.map((h) => h.steps || 0)) +
        '<div class="row-between" style="margin-top:6px;font-size:12px;color:var(--muted)">' +
        '<span>moyenne ' + UI.fmt.n(avg(health.map((h) => h.steps || 0))) + ' pas</span>' +
        '<span>objectif ' + UI.fmt.n(Health.goals().steps) + '</span></div></div></div>' : '') +

      '<div class="section"><div class="sechead"><h2 style="font-size:16px">Historique</h2></div>' +
        historyBlock() + '</div>' +

      '<div class="section"><p class="muted" style="font-size:11.5px;line-height:1.55">' +
      'Les points ne servent à rien d\'autre qu\'à se situer. Aucune fonctionnalité n\'est verrouillée derrière un palier, ' +
      'et rien n\'est envoyé à qui que ce soit.</p></div>' +
      '</div>';

    /* Le bouton qui envoie regler le manque au lieu de le
       contempler, et tout ce qui touche a la ligue. */
    root.querySelectorAll('[data-act="seul"]').forEach((b) => b.onclick = () => {
      Store.set('actPrefs', Object.assign(Store.get('actPrefs', {}), { mood: 'seul', category: 'all' }));
      App.go('#/activities');
    });
    root.querySelectorAll('[data-kart]').forEach((b) => b.onclick = () => ouvrirSource(b.dataset.kart));
    if (global.Stock) Stock.peupler(root);
    const q = (sel) => root.querySelector(sel);
    if (q('[data-creer]')) q('[data-creer]').onclick = creerLigue;
    if (q('[data-rejoindre]')) q('[data-rejoindre]').onclick = rejoindreLigue;
    if (q('[data-gerer]')) q('[data-gerer]').onclick = gererLigue;
    if (q('[data-compte]')) q('[data-compte]').onclick = () => App.go('#/m/settings');
    if (q('[data-copier]')) q('[data-copier]').onclick = () => {
      const l = ligueActive || ligues[0];
      if (l) { UI.copy(l.share_code); UI.toast('Code copié'); }
    };
  }

  /* ============================================================
     La carte de rang

     Le medaillon en grand, la matiere en fond, les points de
     division et la barre de progression. C'est la premiere chose
     qu'on voit en ouvrant la page, et la seule qui donne envie
     d'y revenir.
     ============================================================ */
  function carteRang(r, g) {
    const c = Rang.couleurs(r.matiere);
    return '<div class="section" style="padding-top:16px">' +
      '<div class="carte-rang" style="--c1:' + c.clair + ';--c2:' + c.moyen + ';--c3:' + c.sombre + '">' +
        '<div class="haut">' +
          '<span class="titre">' + UI.esc(r.complet.toUpperCase()) + '</span>' +
          '<span class="lp">' + r.lp + ' LP</span>' +
        '</div>' +
        '<div class="med">' + Art.medaille(r.matiere, 124) + '</div>' +
        '<div class="jauge"><div class="rempli" style="width:' + r.lp + '%"></div></div>' +
        '<div class="bas">' +
          '<span>' + UI.fmt.n(g.xp) + ' points</span>' +
          '<span>' + (r.suivant ? UI.fmt.n(r.restant) + ' avant ' + UI.esc(r.suivant) : 'Rang maximal') + '</span>' +
        '</div>' +
      '</div></div>';
  }

  /* Les six matieres alignees : celles atteintes sont en couleur,
     les suivantes restent en creux. On voit d'un coup le chemin
     parcouru et celui qui reste. */
  function medaillier(r) {
    return '<div class="section"><div class="sechead"><h2 style="font-size:16px">Les paliers</h2>' +
      '<span>' + (r.index + 1) + ' sur 18</span></div>' +
      '<div class="medaillier">' + Rang.MATIERES.map((m, i) => {
        const atteint = i <= Math.floor(r.index / 3);
        const courant = i === Math.floor(r.index / 3);
        return '<div class="pal' + (atteint ? '' : ' verrou') + (courant ? ' courant' : '') + '">' +
          Art.medaille(m, 44) +
          '<b>' + UI.esc(Rang.NOMS[m]) + '</b>' +
        '</div>';
      }).join('') + '</div></div>';
  }

  /* ============================================================
     La ligue entre amis

     Un code a six lettres, comme pour les listes partagees. On
     publie son score, on voit celui des autres. Rien d'autre :
     pas de messages, pas de defis, pas de notifications.
     ============================================================ */
  let ligues = [], classementCourant = [], ligueActive = null;

  function ligueBlock() {
    if (!global.Cloud || !Cloud.ready()) {
      return '<div class="section"><div class="panel" style="text-align:center">' +
        '<div style="margin-bottom:8px">' + Art('coupe', 52) + '</div>' +
        '<b style="display:block;margin-bottom:6px">Se comparer entre amis</b>' +
        '<p class="muted" style="font-size:13px;margin-bottom:12px">Connecte-toi pour créer une ligue et suivre la progression de tes proches.</p>' +
        '<button class="btn" data-compte>' + Icon('user', 16) + 'Mon compte</button>' +
        '</div></div>';
    }
    if (!ligues.length) {
      return '<div class="section"><div class="panel" style="text-align:center">' +
        '<div style="margin-bottom:8px">' + Art('coupe', 52) + '</div>' +
        '<b style="display:block;margin-bottom:6px">Ta ligue</b>' +
        '<p class="muted" style="font-size:13px;margin-bottom:12px">Crée-la et partage le code, ou rejoins celle d\'un ami.</p>' +
        '<div class="btnrow" style="justify-content:center">' +
          '<button class="btn primary" data-creer>' + Icon('plus', 16) + 'Créer</button>' +
          '<button class="btn" data-rejoindre>' + Icon('friends', 16) + 'Rejoindre</button>' +
        '</div></div></div>';
    }

    const l = ligueActive || ligues[0];
    const moi = Cloud.user() ? Cloud.user().id : null;
    const lignes = classementCourant.map((x, i) => {
      const rr = Rang.rang(x.xp);
      const c = Rang.couleurs(rr.matiere);
      return '<div class="rang-ligne' + (x.user_id === moi ? ' moi' : '') + '">' +
        '<span class="pos">' + (i + 1) + '</span>' +
        '<span class="med">' + Art.medaille(rr.matiere, 30) + '</span>' +
        '<span class="tx"><b>' + UI.esc(x.pseudo || 'Sans nom') + '</b>' +
          '<small style="color:' + c.moyen + '">' + UI.esc(rr.complet) + ' · ' + rr.lp + ' LP</small></span>' +
        '<span class="pts">' + UI.fmt.n(x.xp) + '</span>' +
      '</div>';
    }).join('');

    return '<div class="section"><div class="sechead"><h2 style="font-size:16px">' + UI.esc(l.name) + '</h2>' +
      '<button data-gerer>Gérer</button></div>' +
      '<div class="panel">' +
        (lignes || '<p class="muted" style="font-size:13px">Personne n\'a encore publié de score. Le tien part tout seul.</p>') +
        '<div class="code-ligue" data-copier>' +
          '<span>Code de la ligue</span><b>' + UI.esc(l.share_code) + '</b>' + Icon('copy', 15) +
        '</div>' +
      '</div></div>';
  }

  /* Le score part a chaque ouverture de la page : c'est le seul
     moment ou l'utilisateur regarde le classement, donc le seul
     ou une mise a jour a une utilite. */
  async function chargerLigues() {
    if (!global.Cloud || !Cloud.ready()) return;
    try {
      ligues = await Cloud.mesLigues();
      if (!ligues.length) { render(); return; }
      ligueActive = ligues[0];
      const g = Game.state(), r = Rang.rang(g.xp);
      const u = Cloud.user();
      const pseudo = (u.user_metadata && u.user_metadata.pseudo) || (u.email || '').split('@')[0];
      await Cloud.publierScore(ligueActive.id, {
        pseudo: pseudo, xp: g.xp, rang: r.complet, matiere: r.matiere, lp: r.lp,
        seances: Store.all('seances').length, serie: g.streak || 0
      });
      classementCourant = await Cloud.classement(ligueActive.id);
      render();
    } catch (e) { console.warn('[EVER] ligue', e); }
  }

  async function creerLigue() {
    const r = await UI.promptSheet('Créer une ligue', [
      { name: 'nom', label: 'Nom de la ligue', value: 'Ma ligue', placeholder: 'Les copains' }
    ], 'Créer');
    if (!r || !r.nom) return;
    try {
      const l = await Cloud.creerLigue(r.nom);
      UI.toast('Ligue créée · code ' + l.share_code);
      await chargerLigues();
    } catch (e) { UI.toast(e.message || 'Création impossible'); }
  }

  async function rejoindreLigue() {
    const r = await UI.promptSheet('Rejoindre une ligue', [
      { name: 'code', label: 'Code à six lettres', placeholder: 'ABC123' }
    ], 'Rejoindre');
    if (!r || !r.code) return;
    try {
      await Cloud.rejoindreLigue(r.code.trim());
      UI.toast('Ligue rejointe');
      await chargerLigues();
    } catch (e) { UI.toast(e.message || 'Code inconnu'); }
  }

  function gererLigue() {
    const l = ligueActive;
    if (!l) return;
    UI.openSheet('<div class="mbody" style="padding-top:6px">' +
      '<h2 style="font-size:22px">' + UI.esc(l.name) + '</h2>' +
      '<p class="muted" style="font-size:13px;margin-top:4px">Partage ce code pour inviter quelqu\'un.</p>' +
      '<div class="code-ligue gros" data-copier2><span>Code</span><b>' + UI.esc(l.share_code) + '</b>' + Icon('copy', 16) + '</div>' +
      '<div class="list" style="margin-top:14px">' +
        '<button class="rowitem" data-autre><span class="ic">' + Icon('plus', 17) + '</span>' +
        '<span class="tx"><b>Créer une autre ligue</b></span></button>' +
        '<button class="rowitem" data-join2><span class="ic">' + Icon('friends', 17) + '</span>' +
        '<span class="tx"><b>Rejoindre une ligue</b></span></button>' +
      '</div>' +
      '<button class="btn danger block" style="margin-top:14px" data-quitter>' + Icon('logout', 16) + 'Quitter cette ligue</button>' +
      '</div>', { onMount: (sh) => {
        sh.querySelector('[data-copier2]').onclick = () => { UI.copy(l.share_code); UI.toast('Code copié'); };
        sh.querySelector('[data-autre]').onclick = () => { UI.closeSheet(); creerLigue(); };
        sh.querySelector('[data-join2]').onclick = () => { UI.closeSheet(); rejoindreLigue(); };
        sh.querySelector('[data-quitter]').onclick = async () => {
          if (!await UI.confirmSheet('Quitter la ligue ?', 'Ton score disparaîtra du classement.', true)) return;
          await Cloud.quitterLigue(l.id);
          ligues = []; classementCourant = []; ligueActive = null;
          UI.closeSheet(); render();
        };
      } });
  }

  const tile = (k, v, ic) => '<div class="stat"><div class="k">' + Icon(ic, 13) + UI.esc(k) + '</div><div class="v">' + UI.esc(v) + '</div></div>';
  const avg = (a) => { const f = a.filter((x) => x); return f.length ? f.reduce((x, y) => x + y, 0) / f.length : 0; };

  /* ============================================================
     Les six tasses, sur sept jours

     C'est la seule mesure de cette application qui vaille vraiment
     un regard. Les points, c'est du décor ; une tasse restée vide
     toute la semaine, ça se corrige le soir même.
     ============================================================ */
  /* ============================================================
     Ce qui remplit une semaine

     On appelait ca « les six tasses ». Personne ne sait ce qu'est
     une tasse : ni image, ni metaphore comprise, juste un mot de
     code interne devenu titre. On dit maintenant ce que c'est.

     Six cartes, une par source de bien-etre, avec sa photo et son
     compte de la semaine. Celles restees vides portent une pastille
     rouge : c'est exactement l'information qu'on vient chercher.
     ============================================================ */
  const PHOTO_MOL = {
    dopamine:      'runner finish line achievement',
    serotonine:    'sunlight calm morning',
    ocytocine:     'two people hugging warmth',
    cannabinoides: 'friends laughing together',
    opioides:      'warm blanket comfort tea',
    testosterone:  'gym weights training'
  };

  function cupsBlock() {
    if (!global.Mood) return '';
    const b = Mood.balance(7);
    const jours = Mood.joursSansLien();
    const vides = Object.keys(b).filter((m) => b[m] === 0);

    const cartes = Object.keys(MOODS.MOLECULES).map((m) => {
      const mol = MOODS.MOLECULES[m], v = Math.round(b[m]);
      return {
        id: m,
        titre: mol.nom,
        sous: v === 0 ? 'Rien cette semaine' : v + (v > 1 ? ' moments' : ' moment'),
        ph: PHOTO_MOL[m] || mol.nom,
        type: 'activite',
        badge: v === 0 ? '0' : String(v)
      };
    });

    /* L'alerte sociale passe avant tout : c'est la seule chose que
       l'application ne peut pas regler a ta place. */
    let alerte = '';
    if (jours != null && jours >= 4) {
      alerte = '<div class="banner danger" style="margin-bottom:12px">' + Icon('users', 18) +
        '<span><b>' + jours + ' jours sans rien faire avec quelqu\'un.</b> ' +
        'Trois de ces six sources ne se remplissent pas autrement.</span>' +
        '<button class="btn sm primary" data-act="seul" style="flex:none">Y remédier</button></div>';
    } else if (vides.length >= 3) {
      alerte = '<div class="banner warn" style="margin-bottom:12px">' + Icon('info', 18) +
        '<span>' + vides.length + ' sources sur six sont restées vides cette semaine.</span></div>';
    }

    return '<div class="section">' +
      '<div class="secbar"><h2>Ce qui a rempli ta semaine</h2><span class="muted" style="font-size:12px">7 jours</span></div>' +
      alerte +
      Cartes.carrousel(cartes, { classe: 'petit' }) +
      '<p class="muted" style="font-size:11.5px;margin-top:4px;line-height:1.5">' +
      'Le bien-être passe par six circuits différents. Trois d\'entre eux ne s\'activent ' +
      'qu\'en présence de quelqu\'un : c\'est biologique, pas moral.</p></div>';
  }

  /* La fiche d'une source : ce qu'elle est, ce qui la remplit. */
  function ouvrirSource(m) {
    const mol = MOODS.MOLECULES[m];
    if (!mol) return;
    const b = Mood.balance(7);
    const v = Math.round(b[m] || 0);
    const sources = (MOODS.SOURCES || []).filter((x) => (x.m || [])[0] === m).slice(0, 12);

    Cartes.ouvrir({
      tete: Cartes.tete(mol.nom, mol.role, [mol.teinte, mol.teinte], null),
      corps:
        '<div class="gduo" style="margin-bottom:16px">' +
          Graph.tuile({ nom: 'Cette semaine', teinte: mol.teinte, valeur: String(v),
            unite: v > 1 ? 'moments' : 'moment',
            graph: Graph.anneau({ valeur: v, objectif: 5, c1: mol.teinte, c2: mol.teinte, centre: String(v) }) }) +
          Graph.tuile({ nom: 'Besoin', teinte: mol.teinte, valeur: Mood.estSociale(m) ? 'À deux' : 'Seul',
            unite: Mood.estSociale(m) ? 'ne marche pas seul' : 'possible seul' }) +
        '</div>' +
        (v === 0 ? '<div class="banner warn" style="margin-bottom:14px">' + Icon('info', 18) +
          '<span>' + UI.esc(mol.manque) + '</span></div>' : '') +
        (sources.length
          ? '<h4 class="ftitre">Ce qui la remplit</h4>' +
            Cartes.carrousel(sources.map((x, i) => ({
              id: 'src' + i, titre: x.nom, sous: (x.min ? x.min + ' min' : '') +
                (x.social && x.social !== 'solo' ? ' · à plusieurs' : ''),
              ph: x.nom, type: 'activite'
            })), { classe: 'petit' })
          : '')
    });
  }


  function quest(q) {
    const done = q.value >= q.target;
    const pct = Math.min(100, (q.value / q.target) * 100);
    return '<div class="quest ' + (done ? 'done' : '') + '">' +
      '<span class="qi">' + Icon(done ? 'check' : q.icon, 17) + '</span>' +
      '<span class="qt"><b>' + UI.esc(q.nom) + '</b>' +
      '<span class="bar-track"><span class="bar-fill" style="width:' + pct.toFixed(0) + '%"></span></span></span>' +
      '<span class="rt tabnum" style="font-size:12.5px;color:var(--muted)">' + q.value + '/' + q.target + '</span></div>';
  }

  function historyBlock() {
    const h = Store.history(null, 40);
    const label = { activite: 'Activité', etablissement: 'Établissement', aliment: 'Aliment', cadeau: 'Cadeau',
      media: 'Film ou série', meal: 'Repas', tenue: 'Tenue', calendrier: 'Calendrier', 'codex-open': 'Recette' };
    if (!h.length) return UI.empty('clock', 'Rien encore', 'Utilisé l\'app un peu, tout se retrouve ici.');
    return '<div class="list">' + h.map((x) =>
      '<div class="rowitem"><span class="ic">' + Icon(iconFor(x.kind), 17) + '</span>' +
      '<span class="tx"><b>' + UI.esc(x.payload.label || x.payload.nom || x.payload.title || label[x.kind] || x.kind) + '</b>' +
      '<small>' + UI.esc(label[x.kind] || x.kind) + ' · ' + UI.esc(UI.fmt.dateShort(x.at)) + '</small></span></div>').join('') + '</div>';
  }
  const iconFor = (k) => ({ activite: 'activity', etablissement: 'pin', aliment: 'fork', cadeau: 'gift',
    media: 'film', meal: 'plate', tenue: 'shirt', calendrier: 'calendar', 'codex-open': 'coffee' })[k] || 'clock';

  App.register('stats', { mount: mount });
  global.Stats = { mount };
})(window);
