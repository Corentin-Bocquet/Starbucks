/* ============================================================
   EVER — Activités : « Qu'est-ce qu'on fait ? »

   Deux étages :
     1. la roulette choisit un TYPE d'activité (bar, karting, musée)
     2. le moteur choisit ensuite un ÉTABLISSEMENT réel parmi ceux
        qui correspondent, par tirage pondéré sur le score

   Trois façons de décider, selon l'humeur :
     TOURNER        le hasard pondéré
     SURPRENDS-MOI  l'app règle tout et lance elle-même
     3 IDÉES        trois propositions, et la roue tranche

   Le tout tient compte du lieu, de la météo, de la saison, de
   l'heure, du budget, de l'historique, des goûts appris, des
   événements du moment et du temps réellement libre dans l'agenda.
   ============================================================ */
(function (global) {
  'use strict';

  let root = null, ctx = null, roul = null, events = [], eventsLoading = false;

  const prefs = () => Object.assign({
    city: 'le-touquet', category: 'all', favOnly: false, avoidRecent: true,
    source: 'all', events: false, mood: null
  }, Store.get('actPrefs', {}));
  const setPrefs = (p) => Store.set('actPrefs', Object.assign(prefs(), p));

  const cities = () => {
    const set = new Map();
    Store.all('activities').forEach((a) => { if (a.city) set.set(a.city, cityName(a.city)); });
    return Array.from(set, ([id, nom]) => ({ id, nom }));
  };
  const cityName = (id) => ({ 'le-touquet': 'Le Touquet', 'meribel': 'Méribel' })[id] ||
    id.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  /* Français correct : « au Touquet », pas « à Le Touquet ». */
  function prep(name, kind) {
    const n = String(name || '');
    if (/^Le /i.test(n))  return (kind === 'de' ? 'du ' : 'au ') + n.slice(3);
    if (/^Les /i.test(n)) return (kind === 'de' ? 'des ' : 'aux ') + n.slice(4);
    if (/^La /i.test(n))  return (kind === 'de' ? 'de la ' : 'à la ') + n.slice(3);
    if (/^L'/i.test(n))   return (kind === 'de' ? "de l'" : "à l'") + n.slice(2);
    return (kind === 'de' ? 'de ' : 'à ') + n;
  }

  const slug = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  /* ---------- Le vivier ---------- */
  function pool(opts) {
    opts = opts || {};
    const p = prefs();

    /* Une humeur choisie prend le dessus sur tout le reste : elle ne
       filtre pas la liste habituelle, elle la remplace. C'est ce qui
       permet d'appliquer la règle sociale sans exception — voir
       js/engines/mood.js. */
    if (p.mood && global.Mood && Mood.etat(p.mood)) {
      let list = Mood.sourcesFor(p.mood, {
        city: p.city, ctx: ctx,
        temps: (global.Cal ? Cal.timeAvailable() : 0) || null
      });
      if (!opts.ignoreFav && p.favOnly) list = list.filter((a) => Store.isFav('activity', a.id));
      return list;
    }

    let list = Store.all('activities').filter((a) => !a.city || a.city === p.city);
    if (!opts.ignoreCategory && p.category !== 'all') list = list.filter((a) => a.category === p.category);
    if (!opts.ignoreFav && p.favOnly) list = list.filter((a) => Store.isFav('activity', a.id));
    if (p.source === 'mine') list = list.filter((a) => a.source !== 'seed');

    const season = ctx ? ctx.season : UI.day.season();
    list = list.filter((a) => !a.seasons || !a.seasons.length || a.seasons.indexOf(season) >= 0);

    /* Les événements entrent dans la roue comme des activités. */
    if (p.events && events.length && !opts.noEvents) {
      const upcoming = Events.soon(events, 3);
      const ok = (!opts.ignoreCategory && p.category !== 'all') ? [] : upcoming;
      list = list.concat(ok);
    }

    /* Calendrier intelligent : on écarte ce qui ne rentre pas dans le
       temps libre restant, sauf s'il ne reste rien d'autre. */
    if (!opts.ignoreTime && global.Cal) {
      const fitting = list.filter((a) => Cal.fits(a, UI.day.today()));
      if (fitting.length >= 3) list = fitting;
    }
    return list;
  }

  /* ============================================================
     Rendu
     ============================================================ */
  function mount(el) {
    root = el;
    /* L'humeur ne survit pas a la sortie de l'onglet : on arrive
       toujours sur une page neutre, sans sentiment pre-coche. */
    setPrefs({ mood: null });
    ctx = {
      place: Ctx.place(), weather: null,
      season: UI.day.season(), slot: UI.day.slot(),
      hour: new Date().getHours(), weekend: [0, 6].indexOf(new Date().getDay()) >= 0,
      date: UI.day.today(), budget: Store.get('budget', 2)
    };
    events = [];
    render();
    Ctx.snapshot().then((full) => {
      if (!root.isConnected) return;
      ctx = full;
      render();
      if (prefs().events) loadEvents();
    }).catch(() => {});
    if (global.Cal && Cal.googleReady()) Cal.refreshGoogleDay();
  }

  async function loadEvents() {
    if (eventsLoading || !ctx) return;
    eventsLoading = true;
    render();
    try { events = await Events.fetchFor(ctx, 10); }
    catch (e) { events = []; UI.toast(AI.humanError(e)); }
    eventsLoading = false;
    if (root && root.isConnected) render();
  }

  /* ============================================================
     La page

     Regle unique : rien ne s'empile sur l'accueil. Un bandeau, un
     budget, six boutons. Tout le reste (l'humeur, la roue, les
     idees, l'ajout, l'historique, les reglages) vit dans une
     pop-up qu'on ouvre et qu'on referme.

     Avant, cette page affichait dix blocs a la suite et il fallait
     defiler pour trouver le bouton qu'on cherchait.
     ============================================================ */
  function render() {
    root.innerHTML = '<div class="wrap">' +
      headerBlock(pool().length) +
      barreBudget() +
      grilleActions() +
      agendaBlock() +
      '</div>';
    bind();
    if (global.Stock) Stock.peupler(root);
  }

  /* Le budget, tout en haut : le mot a gauche, les quatre choix a
     droite. C'est le reglage qu'on change le plus souvent. */
  function barreBudget() {
    const b = (ctx && ctx.budget) || 2;
    return '<div class="section" style="padding-top:14px">' +
      '<div class="barreligne">' +
        '<span class="lb">Budget</span>' +
        '<div class="seg compact">' + [1, 2, 3, 4].map((n) =>
          '<button data-budget="' + n + '" class="' + (b === n ? 'on' : '') + '">' + '€'.repeat(n) + '</button>').join('') +
        '</div>' +
      '</div></div>';
  }

  /* Les six portes d'entree. Deux grandes pour ce qu'on fait
     vraiment (tourner, choisir son humeur), quatre petites pour le
     reste. Chacune porte une vraie photo, pas un pictogramme. */
  const PORTES = [
    { act: 'roue',    nom: 'Tourner',     sub: 'Le hasard choisit', ph: 'hasard' },
    { act: 'mood',    nom: 'Ton mood',    sub: 'Selon ton état',    ph: 'humeur' },
    { act: 'three',   nom: 'Trois idées', sub: 'La roue tranche',   ph: 'surprise' },
    { act: 'add',     nom: 'Ajouter',     sub: 'Activité ou lieu',  ph: 'ajouter une activite' },
    { act: 'history', nom: 'Historique',  sub: 'Déjà sorti',        ph: 'historique' },
    { act: 'guide',   nom: 'Le guide',    sub: 'À voir ici',        ph: 'guide' }
  ];

  function grilleActions() {
    return '<div class="section" style="padding-top:14px">' +
      '<div class="secbar">' +
        '<h2>Qu\'est-ce qu\'on fait ?</h2>' +
        '<button class="rondgris" data-act="reglages" aria-label="Réglages">' + Icon('settings', 18) + '</button>' +
      '</div>' +
      '<div class="portes">' + PORTES.map((d) =>
        '<button class="porte" data-act="' + d.act + '">' +
        (global.Stock ? Stock.ic(d.ph, { classe: 'fond' }) : '') +
        '<span class="voile"></span>' +
        '<span class="tx"><b>' + UI.esc(d.nom) + '</b><small>' + UI.esc(d.sub) + '</small></span>' +
        '</button>').join('') + '</div></div>';
  }

  /* ============================================================
     Les pop-up
     ============================================================ */

  /* L'humeur. On choisit dans la pop-up, le resultat s'affiche
     dans la meme pop-up : on ne repart pas chercher ailleurs. */
  function ouvrirMood() {
    const p = prefs();
    const carte = (e) => {
      const mol = MOODS.MOLECULES[e.molecule];
      return '<button class="moodcarte' + (p.mood === e.id ? ' on' : '') + '" data-m="' + e.id + '"' +
        ' style="--mc:' + mol.teinte + '">' +
        '<span class="ic">' + Icon(e.icon, 22) + '</span>' +
        '<b>' + UI.esc(e.nom) + '</b>' +
        '<small>' + UI.esc(e.sub) + '</small></button>';
    };
    UI.openSheet(
      teteSheet('Choisis ton mood', 'On te propose ce qui va vraiment avec.', ['#4B3A8C', '#8A6FD6'], 'coeur') +
      '<div class="mbody">' +
        '<div class="moodgrille">' + MOODS.ETATS.map(carte).join('') + '</div>' +
        (p.mood ? '<button class="btn ghost block" style="margin-top:14px" data-off>Enlever le mood</button>' : '') +
        '<div id="moodOut"></div>' +
      '</div>',
      { onMount: (sh) => {
        const out = sh.querySelector('#moodOut');
        const off = sh.querySelector('[data-off]');
        if (off) off.onclick = () => { setPrefs({ mood: null }); UI.closeSheet(); render(); };
        sh.querySelectorAll('[data-m]').forEach((b) => b.onclick = () => {
          UI.haptic('select');
          setPrefs({ mood: b.dataset.m, category: 'all' });
          sh.querySelectorAll('[data-m]').forEach((x) => x.classList.toggle('on', x === b));
          out.innerHTML = moodBanner(prefs()) +
            '<button class="btn primary block lg" style="margin-top:14px" data-go>' +
            Icon('dice', 18) + 'Tourner avec ce mood</button>';
          out.querySelector('[data-go]').onclick = () => { UI.closeSheet(); ouvrirRoue(); };
          out.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        });
      } });
  }

  /* La roue, dans sa pop-up. Le resultat s'affiche dessous, sans
     jamais revenir polluer l'accueil. */
  function ouvrirRoue() {
    const p = prefs();
    const cats = Array.from(new Set(Store.all('activities').filter((a) => a.city === p.city).map((a) => a.category)));
    UI.openSheet(
      teteSheet('Tourner la roue', p.mood ? 'Filtrée par ton mood du moment.' : 'Tout ce qui est possible ici.',
        ['#B4472C', '#E8804F'], 'cible') +
      '<div class="mbody">' +
        (p.mood ? '' : '<div class="chips" style="margin-bottom:12px">' +
          '<button class="chip ' + (p.category === 'all' ? 'on' : '') + '" data-cat="all">Tout</button>' +
          cats.map((c) => '<button class="chip ' + (p.category === c ? 'on' : '') + '" data-cat="' + UI.attr(c) + '">' + UI.esc(c) + '</button>').join('') +
          '</div>') +
        '<div id="actRoul"></div>' +
      '</div>',
      { onMount: (sh) => {
        const monter = () => {
          roul = Roulette.mount(sh.querySelector('#actRoul'), {
            items: () => pool().map((a) => Object.assign({}, a, { label: a.nom, icon: iconFor(a) })),
            weight: (a) => weightOf(a),
            cta: 'TOURNER',
            emptyText: 'Aucune activité avec ces filtres',
            onResult: (a, box) => onResult(a, box)
          });
        };
        monter();
        sh.querySelectorAll('[data-cat]').forEach((b) => b.onclick = () => {
          UI.haptic('select');
          setPrefs({ category: b.dataset.cat });
          sh.querySelectorAll('[data-cat]').forEach((x) => x.classList.toggle('on', x === b));
          if (roul) roul.refresh();
        });
      } });
  }

  /* Ajouter : une activite ou une adresse. Deux choix, deux
     tuiles, pas un menu deroulant. */
  function ouvrirAjout() {
    const mine = Store.all('activities').filter((a) => a.source !== 'seed').length;
    const places = Store.all('places').length;
    UI.openSheet(
      teteSheet('Ajouter', 'Qu\'est-ce que tu veux enregistrer ?', ['#215D93', '#4E93CE'], 'etoile') +
      '<div class="mbody"><div class="portes deux">' +
        '<button class="porte" data-n="activite">' +
          (global.Stock ? Stock.ic('ajouter une activite', { classe: 'fond' }) : '') +
          '<span class="voile"></span><span class="tx"><b>Une activité</b><small>' +
          mine + ' à toi</small></span></button>' +
        '<button class="porte" data-n="lieu">' +
          (global.Stock ? Stock.ic('mes etablissements', { classe: 'fond' }) : '') +
          '<span class="voile"></span><span class="tx"><b>Une adresse</b><small>' +
          places + ' enregistrée' + (places > 1 ? 's' : '') + '</small></span></button>' +
      '</div></div>',
      { onMount: (sh) => {
        if (global.Stock) Stock.peupler(sh);
        sh.querySelector('[data-n="activite"]').onclick = () => { UI.closeSheet(); addActivity(); };
        sh.querySelector('[data-n="lieu"]').onclick = () => { UI.closeSheet(); managePlaces(); };
      } });
  }

  /* Les reglages de la page : trois interrupteurs, et rien de
     tout ca n'a besoin d'etre visible en permanence. */
  function ouvrirReglages() {
    const p = prefs();
    const ligne = (k, nom, sub, on) =>
      '<button class="rowitem" data-toggle="' + k + '">' +
      '<span class="ic">' + Icon(k === 'favOnly' ? 'star' : (k === 'events' ? 'calendar' : 'clock'), 17) + '</span>' +
      '<span class="tx"><b>' + UI.esc(nom) + '</b><small>' + UI.esc(sub) + '</small></span>' +
      '<span class="switch ' + (on ? 'on' : '') + '"></span></button>';
    UI.openSheet(
      teteSheet('Réglages', 'Ce qui entre dans le tirage.', ['#4A5464', '#8492A6'], 'roue') +
      '<div class="mbody"><div class="list">' +
        ligne('favOnly', 'Mes favoris seulement', 'Ignore tout le reste', p.favOnly) +
        ligne('avoidRecent', 'Éviter ce que je viens de faire', 'Sur les dix derniers jours', p.avoidRecent) +
        ligne('events', 'Événements du moment', 'Concerts, marchés, expositions', p.events) +
      '</div>' +
      '<div id="evOut">' + eventsBlock() + '</div>' +
      '</div>',
      { onMount: (sh) => {
        sh.querySelectorAll('[data-toggle]').forEach((b) => b.onclick = () => {
          const k = b.dataset.toggle, next = !prefs()[k];
          setPrefs({ [k]: next });
          UI.haptic('toggle');
          b.querySelector('.switch').classList.toggle('on', next);
          if (k === 'events') {
            if (next && !events.length) loadEvents();
            sh.querySelector('#evOut').innerHTML = eventsBlock();
          }
        });
      } });
  }

  /* En-tete commune a toutes les pop-up : un aplat colore, une
     illustration, un titre. Le contenu commence juste dessous,
     sans blanc entre les deux. */
  function teteSheet(titre, sous, g, art) {
    return '<div class="mtete" style="--t1:' + g[0] + ';--t2:' + g[1] + '">' +
      (art && global.Art ? '<span class="ill">' + Art(art, 46) + '</span>' : '') +
      '<h2>' + UI.esc(titre) + '</h2>' +
      (sous ? '<p>' + UI.esc(sous) + '</p>' : '') + '</div>';
  }

  /* ============================================================
     Le bandeau d'accueil

     C'est le premier ecran de l'application : il doit se lire
     comme une image, pas comme un formulaire. Ville, meteo du
     moment, moment de la journee, tout d'un coup d'oeil, sur un
     aplat colore par la saison.
     ============================================================ */
  const CIELS = {
    printemps: ['#2F7FA8', '#79C0D8'],
    ete:       ['#1E7FA6', '#57BFD6'],
    automne:   ['#8A5A2B', '#C99050'],
    hiver:     ['#2C4A6B', '#5C82A8']
  };
  const MOMENTS = { matin: 'Ce matin', midi: 'Ce midi', 'après-midi': 'Cet apres-midi', soiree: 'Ce soir', nuit: 'Cette nuit' };

  function headerBlock(n) {
    const wx = ctx && ctx.weather;
    const saison = UI.day.season();
    const g = CIELS[saison] || CIELS.printemps;
    const moment = MOMENTS[UI.day.slot()] || 'Aujourd\'hui';

    return '<div class="section" style="padding:14px 0 0">' +
      '<button class="accueil" data-place style="--g1:' + g[0] + ';--g2:' + g[1] + '">' +
        '<div class="ligne">' +
          '<span class="quand">' + UI.esc(moment) + '</span>' +
          (wx ? '<span class="meteo">' + Icon(wx.icon, 18) + '<b>' + wx.temp + '°</b></span>' : '') +
        '</div>' +
        '<b class="ville">' + UI.esc(cityName(prefs().city)) + '</b>' +
        '<div class="ligne bas">' +
          '<span>' + n + ' idée' + (n > 1 ? 's' : '') + ' pour ici</span>' +
          '<span class="chg">Changer' + Icon('next', 14) + '</span>' +
        '</div>' +
      '</button></div>';
  }


  /* Le bandeau qui explique la règle. C'est lui qui fait la
     différence entre un filtre et un vrai conseil. */
  function moodBanner(p) {
    const e = Mood.etat(p.mood);
    if (!e) return '';
    const mol = Mood.molecule(e.molecule);
    const sociale = Mood.estSociale(e.molecule);
    const jours = Mood.joursSansLien();

    return '<div class="section" style="padding-top:10px">' +
      '<div class="panel" style="border-left:3px solid ' + mol.teinte + '">' +
        '<div class="row" style="gap:9px;align-items:flex-start">' +
          '<span style="color:' + mol.teinte + ';flex:none">' + Icon(mol.icon, 19) + '</span>' +
          '<div><b style="font-size:15px;display:block">' + UI.esc(e.sub) + '</b>' +
          '<small class="muted" style="display:block;margin-top:2px">' + UI.esc(mol.nom) + ' · ' + UI.esc(mol.role) + '</small>' +
          '<p style="font-size:13.5px;line-height:1.5;margin-top:8px">' + UI.esc(e.phrase) + '</p></div>' +
        '</div>' +
      '</div>' +
      (sociale
        ? '<div class="banner warn" style="margin-top:10px">' + Icon('users', 18) +
          '<span><b>Rien de solo ici, et ce n\'est pas un choix de design.</b> ' +
          'Cette molécule ne se sécrète pas seul devant un écran. ' +
          'Tout ce qui suit implique quelqu\'un d\'autre.' +
          (jours != null && jours >= 3 ? ' Ça fait ' + jours + ' jours que tu n\'as rien fait avec quelqu\'un.' : '') +
          '</span></div>'
        : '') +
      '<p class="muted" style="font-size:12px;margin-top:10px;line-height:1.5">' + UI.esc(MOODS.MIROIR[e.molecule]) + '</p>' +
      '</div>';
  }

  function eventsBlock() {
    if (!prefs().events) return '';
    if (eventsLoading) return '<div class="section"><div class="panel">' + UI.thinking('Recherche des événements…') + '</div></div>';
    const up = Events.soon(events, 10);
    if (!up.length) {
      return '<div class="section"><div class="banner">' + Icon('calendar', 18) +
        '<span>Rien d\'annoncé ' + UI.esc(prep(cityName(prefs().city))) + ' ces jours-ci.</span></div></div>';
    }
    return '<div class="section"><div class="sechead"><h2 style="font-size:16px">En ce moment</h2>' +
      '<button data-act="refreshEvents">Actualiser</button></div>' +
      '<div class="list">' + up.slice(0, 6).map((e) =>
        '<button class="rowitem" data-ev="' + UI.attr(e.id) + '">' +
        '<span class="ic">' + Icon(evIcon(e.type), 17) + '</span>' +
        '<span class="tx"><b>' + UI.esc(e.nom) + '</b><small>' + UI.esc(Events.label(e)) +
        (e.lieu ? ' · ' + UI.esc(e.lieu) : '') + (e.fiable ? '' : ' · à vérifier') + '</small></span>' +
        '<span class="rt">' + Icon('next', 15) + '</span></button>').join('') + '</div></div>';
  }
  const evIcon = (t) => ({ concert: 'sparkle', festival: 'sparkle', marche: 'bag', exposition: 'book',
    spectacle: 'film', sport: 'activity', animation: 'users', saisonnier: 'sun' })[t] || 'calendar';


  function agendaBlock() {
    if (!global.Cal) return '';
    const list = Cal.dayEvents();
    const free = Cal.timeAvailable();
    if (!list.length) return '';
    return '<div class="section"><div class="banner">' + Icon('clock', 18) +
      '<span><b>' + list.length + ' chose' + (list.length > 1 ? 's' : '') + ' de prévu aujourd\'hui.</b> ' +
      (free ? 'Il te reste environ ' + UI.fmt.dur(free) + ' de libre, et les propositions en tiennent compte.' :
        'La journée est pleine : les propositions restent courtes.') + '</span></div></div>';
  }



  function iconFor(a) {
    if (a.isEvent) return evIcon(a.type);
    if (a.isMood && a.avecQuelquun) return 'users';
    const m = { bar: 'glass', cafe: 'coffee', restaurant: 'fork', brunch: 'fork', glacier: 'apple',
      musee: 'book', galerie: 'book', exposition: 'book', monument: 'pin', cinema: 'film',
      plage: 'sun', promenade: 'map', randonnee: 'map', velo: 'activity', vtt: 'activity',
      ski: 'activity', spa: 'water', shopping: 'bag', karting: 'dice', bowling: 'dice', escape: 'dice' };
    return m[a.kind] || 'activity';
  }

  function weightOf(a) {
    const p = prefs();
    if (p.mood && a.isMood && global.Mood) return Mood.weight(a, ctx);
    const copy = Object.assign({}, a);
    Reco.scorePlace(copy, ctx, {
      favIds: new Set(Store.all('activities').filter((x) => Store.isFav('activity', x.id)).map((x) => x.id)),
      recent: p.avoidRecent ? Reco.recentMap('activite', 45) : {}
    });
    /* Un événement qui a lieu aujourd'hui mérite d'être poussé. */
    if (a.isEvent) {
      copy._score *= a.debut === UI.day.today() ? 1.7 : 1.25;
      if (!a.fiable) copy._score *= 0.6;
      copy._why = (copy._why || []).concat([Events.label(a).toLowerCase()]);
    }
    a._why = copy._why; a._score = copy._score;
    return copy._score;
  }

  /* ============================================================
     Résultat
     ============================================================ */
  async function onResult(a, box, why) {
    Store.log('activite', { id: a.id, label: a.nom, kind: a.kind });
    if (global.Game) Game.award('roulette', 5);

    if (a.isMood && global.Mood) Mood.log(prefs().mood, a);

    box.innerHTML = resultCard(a, null, true, why);
    bindResult(box, a, null);
    if (a.isEvent) { const s = box.querySelector('[data-venue]'); if (s) s.innerHTML = ''; return; }

    /* Une source d'humeur qui ne se rattache à aucun lieu — un câlin,
       une douche froide, un appel — n'a pas d'établissement à
       chercher. Aller interroger l'IA là-dessus serait absurde. */
    if (a.isMood && !needsVenue(a.kind)) { const s = box.querySelector('[data-venue]'); if (s) s.innerHTML = ''; return; }

    const p = prefs();
    if (p.source === 'mine') return;
    const local = Store.all('places').filter((x) => x.kind === a.kind && (!x.city || x.city === p.city));
    let candidates = local;

    if (AI.available() && needsVenue(a.kind)) {
      const spin = box.querySelector('[data-venue]');
      if (spin) spin.innerHTML = UI.thinking('Recherche des adresses…');
      try { candidates = local.concat(await findVenues(a)); }
      catch (e) {
        const s2 = box.querySelector('[data-venue]');
        if (s2) s2.innerHTML = '<p class="muted" style="font-size:12.5px">' + UI.esc(AI.humanError(e)) + '</p>';
        return;
      }
    }
    if (!candidates.length) { const s = box.querySelector('[data-venue]'); if (s) s.innerHTML = ''; return; }

    const ranked = Reco.rank(candidates, ctx, {
      favIds: new Set(Store.all('places').filter((x) => Store.isFav('place', x.id)).map((x) => x.id)),
      recent: p.avoidRecent ? Reco.recentMap('etablissement', 45) : {}
    });
    const venue = Roulette.pick(ranked, { weight: (x) => x._score, sharpness: 1.9 });
    box.innerHTML = resultCard(a, Object.assign(venue, { _pool: ranked.length }), false, why);
    bindResult(box, a, venue);
    Store.log('etablissement', { id: venue.id, label: venue.nom });
  }

  const VENUE_KINDS = new Set(['bar', 'cafe', 'restaurant', 'brunch', 'glacier', 'musee', 'galerie', 'exposition', 'cinema', 'bowling', 'karting', 'escape', 'spa', 'golf', 'shopping', 'marche', 'equitation', 'tennis']);
  const needsVenue = (k) => VENUE_KINDS.has(k);

  /* Un aplat par famille d'activite : le regard associe une
     couleur a un type avant de lire le titre. */
  const TEINTES = {
    _defaut:    ['#2C5F8A', '#16344B'],
    restaurant: ['#B4622A', '#5C2C13'],
    bar:        ['#7B2D56', '#3B1630'],
    cafe:       ['#00643C', '#0B4A31'],
    brunch:     ['#C07A2A', '#5E3712'],
    glacier:    ['#C9457B', '#5E1839'],
    apero:      ['#8A3E6B', '#3F1730'],
    cinema:     ['#3B3690', '#1A1750'],
    musee:      ['#5B3E96', '#251A45'],
    galerie:    ['#5B3E96', '#251A45'],
    exposition: ['#5B3E96', '#251A45'],
    spa:        ['#2F8B84', '#12403C'],
    randonnee:  ['#3B7A3E', '#173418'],
    marche:     ['#3B7A3E', '#173418'],
    sport:      ['#B4402E', '#511710'],
    tennis:     ['#B4402E', '#511710'],
    golf:       ['#3B7A3E', '#173418'],
    bowling:    ['#1B6C7A', '#0A3038'],
    karting:    ['#1B6C7A', '#0A3038'],
    escape:     ['#1B6C7A', '#0A3038'],
    shopping:   ['#A9713C', '#4B2F14'],
    equitation: ['#8A6A3E', '#3D2D16']
  };

  function resultCard(a, venue, loading, extraWhy) {
    const title = venue ? venue.nom : a.nom;
    const kicker = venue ? a.nom : (a.isEvent ? Events.label(a) : a.category);
    const meta = [];
    if (venue) {
      if (venue.rating) meta.push(venue.rating.toFixed(1).replace('.', ',') + ' ★' + (venue.reviews ? ' · ' + UI.fmt.n(venue.reviews) + ' avis' : ''));
      if (venue._distance != null) meta.push(UI.fmt.km(venue._distance));
      if (venue.price) meta.push('€'.repeat(venue.price));
      if (venue.hours) meta.push(venue.hours);
    } else {
      if (a.price != null) meta.push(a.price === 0 ? 'Gratuit' : '€'.repeat(a.price));
      if (a.lieu) meta.push(a.lieu);
      /* La catégorie est déjà en surtitre : inutile de la répéter. */
      if (!a.isEvent && !a.isMood) meta.push(a.category);
      if (a.isMood && a.avecQuelquun) meta.push(a.social === 'groupe' ? 'à plusieurs' : 'à deux');
      meta.push(UI.fmt.dur(a.minutes || Cal.durationOf(a)));
    }
    const why = Reco.why(venue || a, ctx, extraWhy);
    const isFav = venue ? Store.isFav('place', venue.id) : Store.isFav('activity', a.id);

    /* La tete de carte reprend le modele des maquettes : un aplat
       colore, le surtitre, le nom en grand et la valeur a droite.
       Le detail continue en dessous, sur fond clair. */
    const teinte = TEINTES[a.kind] || TEINTES._defaut;
    const valeur = venue && venue.rating ? String(venue.rating).replace('.', ',') + ' ★'
                 : (a.price != null ? (a.price === 0 ? 'Gratuit' : '€'.repeat(a.price)) : '');

    return '<div class="result">' +
      '<div class="rtete" style="--g1:' + teinte[0] + ';--g2:' + teinte[1] + '">' +
        '<div class="sur">' + UI.esc(kicker) + '</div>' +
        '<div class="titreligne"><h3>' + UI.esc(title) + '</h3>' +
        (valeur ? '<span class="valeur">' + UI.esc(valeur) + '</span>' : '') + '</div>' +
      '</div>' +
      '<div class="rbody">' +
      (venue && venue.pitch ? '<p class="muted" style="font-size:13.5px;margin-top:6px">' + UI.esc(venue.pitch) + '</p>' : '') +
      (a.description ? '<p class="muted" style="font-size:13.5px;margin-top:6px">' + UI.esc(a.description) + '</p>' : '') +
      (meta.length ? '<div class="rmeta">' + meta.map((m) => '<span>' + UI.esc(m) + '</span>').join('') + '</div>' : '') +
      (venue && venue._pool > 1 ? '<p class="muted" style="font-size:11.5px;margin-top:8px">Choisi parmi ' + venue._pool + ' établissements</p>' : '') +
      (a.isEvent && a.source ? '<p class="muted" style="font-size:11.5px;margin-top:8px">Source : ' + UI.esc(a.source) + '</p>' : '') +
      (a.isEvent && !a.fiable ? '<div class="warn" style="margin-top:10px">Date et lieu à vérifier avant de te déplacer.</div>' : '') +
      (a.isMood && a.note ? '<div class="rwhy">' + UI.esc(a.note) + '</div>' : '') +
      (a.isMood && a.avecQuelquun
        ? '<div class="warn" style="margin-top:10px">Celle-là ne compte que si quelqu\'un est là. Seul, la tasse reste vide.</div>'
        : '') +
      (why ? '<div class="rwhy"><b>Pourquoi ? </b>' + UI.esc(why) + '</div>' : '') +
      '<div data-venue>' + (loading && !a.isEvent && needsVenue(a.kind) && AI.available() ? UI.thinking('Recherche des adresses…') : '') + '</div>' +
      '<div class="ract">' +
        (venue || a.lieu
          ? '<button class="btn primary grow lg" data-maps>' + Icon('location', 17) + 'Voir sur la carte</button>'
          : (a.isMood && a.avecQuelquun
              ? '<button class="btn primary grow lg" data-who>' + Icon('users', 17) + 'Avec qui ?</button>'
              : '<button class="btn primary grow lg" data-cal>' + Icon('calendar', 17) + 'Planifier</button>')) +
        '<button class="btn lg" data-fav aria-label="Favori"><span class="etoile' + (isFav ? ' on' : '') + '">' + Icon('star', 17) + '</span></button>' +
        (venue ? '<button class="btn lg" data-save aria-label="Garder">' + Icon('plus', 17) + '</button>' : '') +
      '</div>' +
      ((venue || a.lieu) && a.isMood && a.avecQuelquun
        ? '<button class="btn block" style="margin-top:8px" data-who>' + Icon('users', 16) + 'Avec qui ?</button>' : '') +
      '<div class="row" style="gap:8px;margin-top:10px">' +
        '<button class="btn sm ghost" data-like="1">Bon choix</button>' +
        '<button class="btn sm ghost" data-like="0">Pas envie</button>' +
      '</div>' +
      '</div></div>';
  }

  function bindResult(box, a, venue) {
    const q = (s) => box.querySelector(s);
    const target = venue || a;
    if (q('[data-maps]')) q('[data-maps]').onclick = () => openMaps(venue || { nom: a.nom, adresse: a.lieu });
    if (q('[data-fav]')) q('[data-fav]').onclick = (e) => {
      const on = Store.toggleFav(venue ? 'place' : 'activity', target.id);
      UI.haptic('toggle'); UI.toast(on ? 'Ajouté aux favoris' : 'Retiré');
      e.currentTarget.innerHTML = '<span class="etoile' + (on ? ' on' : '') + '">' + Icon('star', 17) + '</span>';
    };
    if (q('[data-cal]')) q('[data-cal]').onclick = () => {
      const slotFree = Cal.freeSlot(a.isEvent ? a.debut : UI.day.today(), Cal.durationOf(a));
      Cal.add({
        title: (venue ? venue.nom : a.nom),
        location: venue ? (venue.adresse || cityName(prefs().city)) : (a.lieu || cityName(prefs().city)),
        description: a.isEvent ? a.description : a.nom,
        kind: 'activite',
        minutes: Cal.durationOf(a),
        date: a.isEvent ? a.debut : UI.day.today(),
        time: slotFree ? String(slotFree.getHours()).padStart(2, '0') + ':' + String(slotFree.getMinutes()).padStart(2, '0') : null
      });
    };
    if (q('[data-who]')) q('[data-who]').onclick = () => avecQui(a);
    if (q('[data-save]')) q('[data-save]').onclick = () => {
      if (Store.find('places', venue.id)) { UI.toast('Déjà enregistré'); return; }
      Store.add('places', Object.assign({}, venue, { id: venue.id, city: prefs().city, source: 'ai-kept' }));
      UI.toast('Ajouté à mes établissements'); render();
    };
    box.querySelectorAll('[data-like]').forEach((b) => b.onclick = () => {
      Reco.learn(target, b.dataset.like === '1');
      UI.haptic(b.dataset.like === '1' ? 'success' : 'tap');
      UI.toast(b.dataset.like === '1' ? 'Noté' : 'On évitera');
    });
  }

  /* « Avec qui ? » — l'étape qui manque à toutes les applications de
     ce genre. Choisir l'activité ne sert à rien si on ne va pas
     jusqu'à décider avec quelle personne, et quand. */
  function avecQui(a) {
    const gens = global.Mood ? Mood.gens() : [];
    const duree = a.minutes || Cal.durationOf(a);

    const planifier = (nom) => {
      const slot = Cal.freeSlot(UI.day.today(), duree, 11, 22) ||
                   Cal.freeSlot(UI.day.add(UI.day.today(), 1), duree, 11, 22);
      const quand = slot || new Date();
      UI.closeSheet();
      Cal.add({
        title: a.nom + (nom ? ' avec ' + nom : ''),
        description: 'Proposé par EVER pour combler : ' + (Mood.molecule(a.molecule) || {}).nom,
        kind: 'activite', minutes: duree,
        date: UI.day.key(quand),
        time: String(quand.getHours()).padStart(2, '0') + ':' + String(quand.getMinutes()).padStart(2, '0')
      });
    };

    UI.openSheet(
      '<div class="mbody" style="padding-top:6px">' +
        '<h2 style="font-size:22px;margin-bottom:4px">Avec qui ?</h2>' +
        '<p class="secdesc">' + UI.esc(a.nom) + ' — ' + UI.fmt.dur(duree) + '. ' +
        'Poser un nom et une heure, c\'est ce qui fait la différence entre une bonne intention et un moment réel.</p>' +
        (gens.length
          ? '<div class="list">' + gens.map((g) =>
              '<button class="rowitem" data-p="' + UI.attr(g.nom) + '">' +
              '<span class="ic">' + Icon('user', 17) + '</span>' +
              '<span class="tx"><b>' + UI.esc(g.nom) + '</b>' +
              (g.relation ? '<small>' + UI.esc(g.relation) + '</small>' : '') + '</span>' +
              '<span class="rt">' + Icon('calendar', 15) + '</span></button>').join('') + '</div>'
          : '<div class="banner">' + Icon('info', 18) +
            '<span>Aucune personne enregistrée. Ajoute-en une, elle servira aussi aux cadeaux.</span></div>') +
        '<div class="btnrow" style="margin-top:14px">' +
          '<button class="btn primary grow" data-new>' + Icon('plus', 16) + 'Quelqu\'un d\'autre</button>' +
          '<button class="btn" data-skip>' + Icon('calendar', 16) + 'Planifier sans nom</button>' +
        '</div>' +
      '</div>',
      { onMount: (s) => {
        s.querySelectorAll('[data-p]').forEach((b) => b.onclick = () => planifier(b.dataset.p));
        s.querySelector('[data-skip]').onclick = () => planifier(null);
        s.querySelector('[data-new]').onclick = async () => {
          const r = await UI.promptSheet('Avec qui ?', [
            { name: 'nom', label: 'Prénom' },
            { name: 'relation', label: 'Relation', placeholder: 'pote, frère, copine…' }
          ], 'Planifier');
          if (!r || !r.nom) return;
          Store.add('people', { nom: r.nom, relation: r.relation });
          planifier(r.nom);
        };
      } }
    );
  }

  /* On ne quitte plus l'application d'un coup : la fiche du lieu
     s'ouvre en pop-up avec sa carte, et c'est de la qu'on decide
     d'aller dans Plans ou dans Google Maps. */
  function openMaps(v) {
    if (!v) return;
    if (!global.MapPick || !MapPick.fiche) {
      const q = encodeURIComponent((v.nom || '') + ' ' + (v.adresse || cityName(prefs().city)));
      window.open('https://maps.apple.com/?q=' + q, '_blank', 'noopener');
      return;
    }
    MapPick.fiche({
      nom: v.nom, adresse: v.adresse || '', ville: cityName(prefs().city),
      lat: v.lat, lon: v.lon, rating: v.rating, reviews: v.reviews,
      price: v.price, hours: v.hours, pitch: v.pitch,
      distance: v._distance, categorie: v.categorie || v.kind || ''
    });
  }

  /* ============================================================
     Surprends-moi et 3 idées
     ============================================================ */

  /* L'app règle tout : elle ignore les filtres, prend le contexte
     complet, choisit et lance. L'utilisateur ne décide de rien. */
  async function surprise() {
    UI.haptic('launch');
    const all = pool({ ignoreCategory: true, ignoreFav: true });
    if (!all.length) { UI.toast('Rien à proposer ici'); return; }

    const wx = ctx.weather;
    const bits = [];
    if (wx) bits.push(wx.text.toLowerCase() + ', ' + wx.temp + ' degrés');
    bits.push(ctx.slot);
    if (ctx.weekend) bits.push('week-end');
    const free = Cal.timeAvailable();
    if (free && free < 240) bits.push(UI.fmt.dur(free) + ' devant toi');

    const winner = Roulette.pick(all, { weight: weightOf, sharpness: 2.2 });
    if (!winner) return;

    const box = UI.$('#actRoul').querySelector('[data-result]');
    await Roulette.spin(UI.$('#actRoul').querySelector('.roulwin'),
      all.map((a) => Object.assign({}, a, { label: a.nom, icon: iconFor(a) })),
      Object.assign({}, winner, { label: winner.nom, icon: iconFor(winner) }), 2200);
    onResult(winner, box, bits.join(', '));
    box.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  /* Trois propositions distinctes, puis la roue tranche si on hésite. */
  function threeIdeas() {
    const all = pool();
    if (all.length < 3) { UI.toast('Pas assez d\'activités pour trois idées'); return; }
    const picks = Roulette.pickMany(all, 3, { weight: weightOf, sharpness: 2 });

    UI.openSheet(
      '<div class="mbody" style="padding-top:6px">' +
        '<h2 style="font-size:22px;margin-bottom:4px">Trois idées</h2>' +
        '<p class="secdesc">Choisis, ou laisse la roue décider entre les trois.</p>' +
        '<div class="list">' + picks.map((a, i) =>
          '<button class="rowitem" data-i="' + i + '"><span class="ic">' + Icon(iconFor(a), 17) + '</span>' +
          '<span class="tx"><b>' + UI.esc(a.nom) + '</b><small>' +
          UI.esc(a.isEvent ? Events.label(a) : a.category) + ' · ' + UI.fmt.dur(Cal.durationOf(a)) +
          (a.price ? ' · ' + '€'.repeat(a.price) : '') + '</small></span>' +
          '<span class="rt">' + Icon('next', 15) + '</span></button>').join('') + '</div>' +
        '<button class="btn primary block lg" style="margin-top:14px" data-wheel>' + Icon('dice', 17) + 'Laisser la roue décider</button>' +
      '</div>',
      { onMount: (s) => {
        s.querySelectorAll('[data-i]').forEach((b) => b.onclick = () => {
          const a = picks[+b.dataset.i];
          UI.closeSheet();
          const box = UI.$('#actRoul').querySelector('[data-result]');
          onResult(a, box, 'tu l\'as choisie parmi trois');
          box.scrollIntoView({ behavior: 'smooth', block: 'center' });
        });
        s.querySelector('[data-wheel]').onclick = async () => {
          UI.closeSheet();
          const winner = Roulette.pick(picks, { weight: weightOf });
          const box = UI.$('#actRoul').querySelector('[data-result]');
          await Roulette.spin(UI.$('#actRoul').querySelector('.roulwin'),
            picks.map((a) => Object.assign({}, a, { label: a.nom, icon: iconFor(a) })),
            Object.assign({}, winner, { label: winner.nom, icon: iconFor(winner) }), 2000);
          onResult(winner, box, 'la roue a tranché entre trois idées');
          box.scrollIntoView({ behavior: 'smooth', block: 'center' });
        };
      } }
    );
  }

  /* ============================================================
     Recherche d'établissements par IA
     ============================================================ */
  const VENUE_SCHEMA = AI.T.obj({
    etablissements: AI.T.arr(AI.T.obj({
      nom: AI.T.str('Nom exact'),
      adresse: AI.T.str('Adresse ou rue'),
      note: AI.T.num('Note sur 5, 0 si inconnue'),
      avis: AI.T.int('Nombre d avis approximatif, 0 si inconnu'),
      prix: AI.T.int('1 à 4'),
      pitch: AI.T.str('Une phrase, ce qui le distingue'),
      horaires: AI.T.str('Horaires connus, vide sinon')
    }))
  });

  async function findVenues(a) {
    const p = prefs();
    const res = await AI.json(
      "Liste des établissements réels de type « " + a.nom + " » " + prep(cityName(p.city)) + ".\n" +
      Ctx.describe(ctx) + "\n\n" +
      "Règles strictes :\n" +
      "- uniquement des lieux qui existent vraiment et que tu connais ;\n" +
      "- si tu n'es pas sûr d'un établissement, ne l'invente pas, renvoie moins de résultats ;\n" +
      "- mets 0 pour la note et le nombre d'avis quand tu ne les connais pas plutôt que de deviner ;\n" +
      "- huit résultats maximum.",
      VENUE_SCHEMA, { ttl: 3 * 86400e3, temperature: 0.4 });

    return (res.etablissements || []).map((v) => ({
      id: 'ai-' + a.kind + '-' + slug(v.nom),
      nom: v.nom, adresse: v.adresse, kind: a.kind, category: a.category,
      rating: v.note > 0 ? v.note : null, reviews: v.avis > 0 ? v.avis : null,
      price: v.prix || null, pitch: v.pitch, hours: v.horaires || '',
      city: p.city, source: 'ai',
      lat: ctx.place.lat, lon: ctx.place.lon
    }));
  }

  /* ============================================================
     Interactions
     ============================================================ */
  function bind() {
    root.querySelectorAll('[data-budget]').forEach((b) => b.onclick = () => {
      Store.set('budget', +b.dataset.budget);
      ctx.budget = +b.dataset.budget;
      UI.haptic('select');
      root.querySelectorAll('[data-budget]').forEach((x) => x.classList.toggle('on', x === b));
    });
    const pb = root.querySelector('[data-place]');
    if (pb) pb.onclick = placePicker;
    root.querySelectorAll('[data-act]').forEach((b) => b.onclick = () => acts[b.dataset.act] && acts[b.dataset.act]());
  }

  const acts = {
    roue: () => ouvrirRoue(),
    mood: () => ouvrirMood(),
    three: () => threeIdeas(),
    add: () => ouvrirAjout(),
    history: () => showHistory(),
    reglages: () => ouvrirReglages(),
    guide: () => App.go('#/m/city/' + prefs().city),
    surprise: () => surprise(),
    refreshEvents: () => { Events.clearCache(ctx.place.name); events = []; loadEvents(); }
  };

  /* ============================================================
     Choisir sa ville

     Trois listes, dans cet ordre : les favorites, les dernières
     visitées, puis tout le reste. Avant d'avoir tapé la moindre
     lettre, on retrouve déjà ce qu'on cherche neuf fois sur dix.

     L'étoile est la même dans toute l'application : pleine et
     jaune quand c'est en favori, vide sinon.
     ============================================================ */
  const villesFav = () => Store.get('villesFav', []);
  const estFav = (id) => villesFav().indexOf(id) >= 0;
  function basculerFav(id, nom) {
    const l = villesFav();
    const i = l.indexOf(id);
    if (i >= 0) l.splice(i, 1); else l.push(id);
    Store.set('villesFav', l);
    UI.haptic('toggle');
    UI.toast(i >= 0 ? nom + ' retirée des favoris' : nom + ' en favori');
  }

  const villesRecentes = () => Store.get('villesRecentes', []);
  function noterVisite(id, nom, place) {
    const l = villesRecentes().filter((v) => v.id !== id);
    l.unshift({ id: id, nom: nom, place: place || null, at: Date.now() });
    Store.set('villesRecentes', l.slice(0, 8));
  }

  const etoile = (on) => '<span class="etoile' + (on ? ' on' : '') + '">' + Icon('star', 17) + '</span>';

  function placePicker() {
    const toutes = cities();
    const favs = villesFav();
    const recentes = villesRecentes();

    const ligne = (id, nom, sous) =>
      '<div class="rowitem villeligne" data-c="' + UI.attr(id) + '" data-nom="' + UI.attr(nom) + '">' +
        '<span class="ic">' + Icon('location', 17) + '</span>' +
        '<span class="tx"><b>' + UI.esc(nom) + '</b>' + (sous ? '<small>' + UI.esc(sous) + '</small>' : '') + '</span>' +
        '<button class="etoilebtn" data-fav="' + UI.attr(id) + '" data-favnom="' + UI.attr(nom) + '" aria-label="Favori">' +
          etoile(estFav(id)) + '</button>' +
        (prefs().city === id ? '<span class="rt">' + Icon('check', 16) + '</span>' : '') +
      '</div>';

    const bloc = (titre, lignes) => lignes.length
      ? '<h4 class="ftitre">' + titre + '</h4><div class="list">' + lignes.join('') + '</div>' : '';

    const listeFav = toutes.filter((c) => estFav(c.id)).map((c) => ligne(c.id, c.nom));
    const favsHorsListe = favs.filter((id) => !toutes.some((c) => c.id === id))
      .map((id) => ligne(id, nomDepuisId(id)));
    const listeRecentes = recentes
      .filter((v) => !estFav(v.id))
      .map((v) => ligne(v.id, v.nom, 'Vue ' + UI.fmt.dateShort(v.at)));
    const listeAutres = toutes
      .filter((c) => !estFav(c.id) && !recentes.some((v) => v.id === c.id))
      .map((c) => ligne(c.id, c.nom));

    UI.openSheet(
      '<div class="mbody" style="padding-top:6px">' +
        '<h2 style="font-size:22px;margin-bottom:12px">Où es-tu ?</h2>' +
        '<label class="search" style="box-shadow:var(--sh-inset)">' + Icon('search', 17) +
          '<input data-q placeholder="Chercher une ville" autocomplete="off"></label>' +
        '<div data-res>' +
          bloc('Mes favorites', listeFav.concat(favsHorsListe)) +
          bloc('Récemment', listeRecentes) +
          bloc('Toutes', listeAutres) +
        '</div>' +
        '<div class="btnrow" style="margin-top:14px">' +
          '<button class="btn grow" data-map>' + Icon('map', 16) + 'Sur la carte</button>' +
          '<button class="btn grow" data-locate>' + Icon('location', 16) + 'Ma position</button>' +
        '</div>' +
      '</div>',
      { onMount: (sh) => {
          const q = sh.querySelector('[data-q]'), out = sh.querySelector('[data-res]');

          const brancher = (racine) => {
            racine.querySelectorAll('[data-fav]').forEach((b) => b.onclick = (e) => {
              e.stopPropagation();
              basculerFav(b.dataset.fav, b.dataset.favnom);
              b.querySelector('.etoile').classList.toggle('on');
            });
            racine.querySelectorAll('[data-c]').forEach((b) => b.onclick = async (e) => {
              if (e.target.closest('[data-fav]')) return;
              const id = b.dataset.c, nom = b.dataset.nom;
              setPrefs({ city: id, category: 'all' });
              const trouve = await Ctx.searchCity(nom);
              if (trouve[0]) Ctx.setPlace(trouve[0]);
              noterVisite(id, nom, trouve[0] || null);
              UI.closeSheet();
              await refreshCtx();
            });
          };
          brancher(out);

          q.oninput = UI.debounce(async () => {
            const v = q.value.trim();
            if (v.length < 2) {
              out.innerHTML =
                bloc('Mes favorites', listeFav.concat(favsHorsListe)) +
                bloc('Récemment', listeRecentes) +
                bloc('Toutes', listeAutres);
              brancher(out);
              return;
            }
            out.innerHTML = UI.thinking('Recherche…');
            const r = await Ctx.searchCity(v);
            if (!r.length) { out.innerHTML = '<p class="muted" style="font-size:13px">Aucune ville trouvée.</p>'; return; }
            out.innerHTML = '<div class="list">' + r.map((c, i) => {
              const id = slug(c.name);
              return '<div class="rowitem villeligne" data-i="' + i + '">' +
                '<span class="ic">' + Icon('location', 17) + '</span>' +
                '<span class="tx"><b>' + UI.esc(c.name) + '</b><small>' + UI.esc(c.label) + '</small></span>' +
                '<button class="etoilebtn" data-fav="' + UI.attr(id) + '" data-favnom="' + UI.attr(c.name) + '" aria-label="Favori">' +
                  etoile(estFav(id)) + '</button>' +
              '</div>';
            }).join('') + '</div>';

            out.querySelectorAll('[data-fav]').forEach((b) => b.onclick = (e) => {
              e.stopPropagation();
              basculerFav(b.dataset.fav, b.dataset.favnom);
              b.querySelector('.etoile').classList.toggle('on');
            });
            out.querySelectorAll('[data-i]').forEach((b) => b.onclick = async (e) => {
              if (e.target.closest('[data-fav]')) return;
              const c = r[+b.dataset.i];
              Ctx.setPlace(c);
              setPrefs({ city: slug(c.name), category: 'all' });
              noterVisite(slug(c.name), c.name, c);
              UI.closeSheet();
              await refreshCtx();
            });
          }, 400);

          sh.querySelector('[data-map]').onclick = async () => {
            UI.closeSheet();
            const choisi = await MapPick.pick(Ctx.place());
            if (!choisi) return;
            Ctx.setPlace(choisi);
            setPrefs({ city: slug(choisi.name), category: 'all' });
            noterVisite(slug(choisi.name), choisi.name, choisi);
            await refreshCtx();
          };
          sh.querySelector('[data-locate]').onclick = async () => {
            try {
              const p = await Ctx.locate();
              setPrefs({ city: slug(p.name), category: 'all' });
              noterVisite(slug(p.name), p.name, p);
              UI.closeSheet();
              await refreshCtx();
            } catch (e) { UI.toast(e.message); }
          };
        } }
    );
  }

  /* Une ville mise en favori depuis la recherche n'est pas encore
     dans la liste des activités : on retrouve son nom ailleurs. */
  function nomDepuisId(id) {
    const r = villesRecentes().find((v) => v.id === id);
    if (r) return r.nom;
    return id.split('-').map((m) => m.charAt(0).toUpperCase() + m.slice(1)).join(' ');
  }

  async function refreshCtx() {
    events = [];
    ctx = await Ctx.snapshot();
    render();
    if (prefs().events) loadEvents();
  }

  async function addActivity() {
    const res = await UI.promptSheet('Nouvelle activité', [
      { name: 'nom', label: 'Nom', placeholder: 'Karting indoor' },
      { name: 'category', label: 'Catégorie', placeholder: 'Fun' },
      { name: 'kind', label: 'Type', type: 'select', value: 'autre', options: [
        { v: 'bar', n: 'Bar' }, { v: 'cafe', n: 'Café' }, { v: 'restaurant', n: 'Restaurant' },
        { v: 'glacier', n: 'Glacier' }, { v: 'musee', n: 'Musée' }, { v: 'cinema', n: 'Cinéma' },
        { v: 'plage', n: 'Plage' }, { v: 'randonnee', n: 'Randonnée' }, { v: 'shopping', n: 'Shopping' },
        { v: 'spa', n: 'Spa' }, { v: 'karting', n: 'Karting' }, { v: 'autre', n: 'Autre' } ] },
      { name: 'price', label: 'Budget (0 à 4)', type: 'number', inputmode: 'numeric', value: 2 }
    ], 'Ajouter');
    if (!res || !res.nom) return;
    Store.add('activities', {
      nom: res.nom, category: res.category || 'Mes activités', kind: res.kind,
      price: Number(res.price) || 0, city: prefs().city, source: 'user'
    });
    UI.toast('Activité ajoutée'); render();
  }

  /* ============================================================
     Mes etablissements

     Deux manques : on ne pouvait que supprimer ou ajouter, jamais
     corriger une adresse ou une note ; et la liste etait grise.
     Maintenant : des cartes photo, et une fiche modifiable.
     ============================================================ */
  const CHAMPS_LIEU = [
    { name: 'nom',     label: 'Nom' },
    { name: 'kind',    label: 'Type', type: 'tiles', phType: 'lieu', options: [
        { v: 'bar', n: 'Bar' }, { v: 'cafe', n: 'Café' }, { v: 'restaurant', n: 'Restaurant' },
        { v: 'brunch', n: 'Brunch' }, { v: 'glacier', n: 'Glacier' }, { v: 'musee', n: 'Musée' },
        { v: 'cinema', n: 'Cinéma' }, { v: 'shopping', n: 'Boutique' }, { v: 'spa', n: 'Spa' },
        { v: 'autre', n: 'Autre' } ] },
    { name: 'adresse', label: 'Adresse', placeholder: 'Rue, ville' },
    { name: 'rating',  label: 'Ta note sur 5', type: 'stars' },
    { name: 'price',   label: 'Budget', type: 'seg', options: [
        { v: '1', n: '€' }, { v: '2', n: '€€' }, { v: '3', n: '€€€' }, { v: '4', n: '€€€€' } ] }
  ];

  function managePlaces() {
    const liste = Store.all('places');

    const cartes = liste.map((p) => ({
      id: p.id,
      titre: p.nom,
      sous: [p.kind, p.rating ? p.rating + '/5' : ''].filter(Boolean).join(' · ') || 'Enregistré',
      ph: p.nom + ' ' + (p.kind || ''),
      type: 'lieu'
    }));

    Cartes.ouvrir({
      tete: Cartes.tete('Mes établissements',
        liste.length ? liste.length + ' adresses à toi' : 'Aucune adresse pour l\'instant',
        ['#1F6E5A', '#3FAF8A'], 'lieu'),
      corps:
        (cartes.length ? Cartes.grille(cartes) :
          UI.empty('pin', 'Aucun établissement', 'Ajoute tes adresses, ou garde celles que la roue te propose.')) +
        '<button class="btn primary block lg" style="margin-top:16px" data-add>' +
          Icon('plus', 17) + 'Ajouter une adresse</button>' +
        '<p class="aide">Les tiennes passent toujours avant celles trouvées par l\'IA.</p>',
      onMount: (sh) => {
        sh.querySelector('[data-add]').onclick = () => nouveauLieu();
      },
      onCarte: (id) => ficheLieu(id)
    });
  }

  /* La fiche d'un etablissement : la carte en vrai, et tout
     modifiable. */
  function ficheLieu(id) {
    const p = Store.find('places', id);
    if (!p) return;
    const tuiles = [p.adresse ? { l: 'Adresse', v: p.adresse } : null,
      p.rating ? { l: 'Ta note', v: p.rating + ' / 5' } : null,
      p.price ? { l: 'Budget', v: '€'.repeat(Math.min(4, p.price)) } : null].filter(Boolean);

    Cartes.empiler({
      tete: Cartes.tete(p.nom, p.kind || 'Établissement', ['#1F6E5A', '#3FAF8A'], 'lieu'),
      corps:
        '<div class="minicarte" data-mini></div>' +
        (tuiles.length ? '<div class="list" style="margin-top:14px">' + tuiles.map((t) =>
          '<div class="rowitem"><span class="tx"><b>' + UI.esc(t.l) + '</b></span>' +
          '<span class="rt">' + UI.esc(t.v) + '</span></div>').join('') + '</div>' : '') +
        '<div class="btnrow" style="margin-top:16px">' +
          '<button class="btn primary grow lg" data-modif>' + Icon('edit', 17) + 'Modifier</button>' +
          '<button class="btn lg" data-carte aria-label="Voir sur la carte">' + Icon('map', 17) + '</button>' +
          '<button class="btn danger lg" data-sup aria-label="Supprimer">' + Icon('trash', 17) + '</button>' +
        '</div>',
      onMount: (sh) => {
        if (global.MapPick && MapPick.mini) {
          MapPick.mini(sh.querySelector('[data-mini]'), { lat: p.lat, lon: p.lon, nom: p.nom });
        }
        sh.querySelector('[data-modif]').onclick = () => modifierLieu(id);
        sh.querySelector('[data-carte]').onclick = () => {
          UI.closeSheet();
          MapPick.fiche({ nom: p.nom, adresse: p.adresse, lat: p.lat, lon: p.lon });
        };
        sh.querySelector('[data-sup]').onclick = async () => {
          if (!await UI.confirmSheet('Supprimer ?', p.nom + ' disparaît de tes adresses.', true)) { ficheLieu(id); return; }
          Store.del('places', id); UI.closeSheet(); render();
        };
      }
    });
  }

  async function modifierLieu(id) {
    const p = Store.find('places', id);
    if (!p) return;
    const champs = CHAMPS_LIEU.map((c) => Object.assign({}, c, {
      value: c.name === 'price' ? String(p.price || 2) : (p[c.name] == null ? '' : String(p[c.name]))
    }));
    const r = await UI.promptSheet('Modifier', champs,
      { submit: 'Enregistrer', art: 'lieu', teinte: ['#1F6E5A', '#3FAF8A'], sub: p.nom });
    if (!r) { ficheLieu(id); return; }
    Store.put('places', id, {
      nom: r.nom || p.nom, kind: (r.kind || p.kind || 'autre').toLowerCase(),
      adresse: r.adresse, rating: Number(r.rating) || null, price: Number(r.price) || null
    });
    UI.toast('Modifié'); render();
    ficheLieu(id);
  }

  async function nouveauLieu() {
    const r = await UI.promptSheet('Nouvel établissement',
      CHAMPS_LIEU.map((c) => Object.assign({}, c, { value: c.name === 'price' ? '2' : '' })),
      { submit: 'Ajouter', art: 'lieu', teinte: ['#1F6E5A', '#3FAF8A'] });
    if (!r || !r.nom) return;
    Store.add('places', {
      nom: r.nom, kind: (r.kind || 'autre').toLowerCase(), adresse: r.adresse,
      rating: Number(r.rating) || null, reviews: null, price: Number(r.price) || null,
      city: prefs().city, source: 'user', lat: ctx.place.lat, lon: ctx.place.lon
    });
    UI.toast('Ajouté'); render();
    managePlaces();
  }


  /* ============================================================
     L'historique

     Une liste de soixante lignes grises ne se lit pas : on la
     fait defiler jusqu'en bas sans rien y voir.

     Ici, l'historique est range par famille (bars, culture,
     dehors...), chaque famille a son carrousel, et chaque sortie
     est une carte avec la photo de ce que c'etait.
     ============================================================ */
  const FAMILLES = [
    ['Manger et boire', ['bar', 'cafe', 'restaurant', 'brunch', 'glacier'], 'restaurant'],
    ['Culture',         ['musee', 'galerie', 'exposition', 'monument', 'cinema', 'theatre'], 'culture'],
    ['Dehors',          ['plage', 'promenade', 'randonnee', 'velo', 'vtt', 'ski', 'parc'], 'nature'],
    ['Sport et jeux',   ['karting', 'bowling', 'escape', 'golf', 'tennis', 'equitation', 'piscine'], 'sport'],
    ['Autres',          [], 'surprise']
  ];

  function familleDe(kind) {
    const f = FAMILLES.find((x) => x[1].indexOf(kind) >= 0);
    return f ? f[0] : 'Autres';
  }

  function showHistory() {
    const h = Store.history('activite', 120)
      .concat(Store.history('etablissement', 120))
      .sort((a, b) => b.at - a.at);

    if (!h.length) {
      Cartes.ouvrir({
        tete: Cartes.tete('Historique', 'Ce que la roue a déjà donné.', ['#6B5330', '#A98A55'], 'refaire'),
        corps: UI.empty('clock', 'Rien encore', 'Lance la roue une première fois.')
      });
      return;
    }

    /* On range par famille en gardant l'ordre chronologique. */
    const paquets = {};
    h.forEach((x, i) => {
      const nom = x.payload.label || '';
      const kind = x.payload.kind || '';
      const fam = x.kind === 'etablissement' ? 'Manger et boire' : familleDe(kind);
      (paquets[fam] = paquets[fam] || []).push({
        id: 'h' + i,
        titre: nom,
        sous: UI.fmt.date(x.at),
        ph: nom,
        type: 'activite',
        at: x.at
      });
    });

    const corps = FAMILLES.map(([nom]) => {
      const l = paquets[nom];
      if (!l || !l.length) return '';
      return '<h4 class="ftitre">' + UI.esc(nom) + ' · ' + l.length + '</h4>' +
        Cartes.carrousel(l, { classe: 'petit' });
    }).join('');

    Cartes.ouvrir({
      tete: Cartes.tete('Historique', h.length + ' sorties enregistrées', ['#6B5330', '#A98A55'], 'refaire'),
      corps: corps,
      onCarte: (id) => {
        const tous = [].concat.apply([], Object.values(paquets));
        const c = tous.find((x) => x.id === id);
        if (!c) return;
        Cartes.empiler({
          tete: Cartes.tete(c.titre, c.sous, ['#6B5330', '#A98A55'], 'lieu'),
          corps: '<div class="kart grand">' +
              '<span class="vis">' + Stock.ic(c.titre, { classe: 'fond', type: 'activite' }) + '</span>' +
            '</div>' +
            '<p class="mdesc" style="margin-top:14px">Fait le ' + UI.esc(UI.fmt.date(c.at)) + '.</p>' +
            '<button class="btn primary block lg" style="margin-top:14px" data-refaire>' +
              Icon('refresh', 17) + 'Le refaire</button>',
          onMount: (sh) => {
            const b = sh.querySelector('[data-refaire]');
            if (b) b.onclick = () => { UI.closeSheet(); ouvrirRoue(); };
          }
        });
      }
    });
  }


  App.register('activities', { mount: mount });
  global.Activities = { mount, surprise, threeIdeas };
})(window);
