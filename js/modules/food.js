/* ============================================================
   EVER — Alimentation

   Ce que fait ce module :
     - un journal par jour, quatre moments, ajout en trois secondes
     - trois facons d'ajouter : photo analysee par Gemini, recherche
       dans Open Food Facts (900 000 produits, code-barres compris),
       saisie manuelle
     - macros complètes avec objectifs et anneaux
     - une analyse quotidienne qui dit ce qui va, ce qui ne va pas,
       et surtout qui reecrit le repas en changeant deux ou trois
       aliments plutôt que de tout jeter
     - passerelle MyFitnessPal par import et export de fichiers

   Sur MyFitnessPal, une précision honnete : l'API publique est
   fermee depuis 2020, l'acces est réservé aux partenaires sous
   contrat. Aucune bibliotheque ne contourne cela sans stocker le
   mot de passe de l'utilisateur, ce qu'on ne fera pas. Le pont
   passe donc par des fichiers, dans les deux sens, et l'interface
   NutritionBridge ci-dessous est prête a recevoir une vraie API
   le jour ou l'acces existe.
   ============================================================ */
(function (global) {
  'use strict';

  const SLOTS = [
    { id: 'matin',     nom: 'Petit-déjeuner', icon: 'coffee' },
    { id: 'midi',      nom: 'Déjeuner',       icon: 'fork' },
    { id: 'soir',      nom: 'Dîner',          icon: 'plate' },
    { id: 'collation', nom: 'Collations',     icon: 'apple' }
  ];

  const MACROS = [
    { k: 'prot',  nom: 'Protéines', unit: 'g', kcal: 4 },
    { k: 'carb',  nom: 'Glucides',  unit: 'g', kcal: 4 },
    { k: 'fat',   nom: 'Lipides',   unit: 'g', kcal: 9 },
    { k: 'fiber', nom: 'Fibres',    unit: 'g', kcal: 0 }
  ];

  let viewDay = UI.day.today();
  let root = null;
  let detacheGeste = null;

  function retirerRepas(id) {
    const m = Store.find('meals', id);
    if (!m) return;
    Store.del('meals', id);
    UI.haptic('warning');
    render();
    UI.toast(m.nom + ' retiré');
  }

  function dupliquerRepas(id) {
    const m = Store.find('meals', id);
    if (!m) return;
    const copie = Object.assign({}, m);
    delete copie.id; delete copie._up;
    copie.day = viewDay;
    Store.add('meals', copie);
    UI.haptic('success');
    render();
    UI.toast(m.nom + ' ajouté une deuxième fois');
  }

  const goals = () => Object.assign({}, SEED.NUTRI_DEFAULTS, Store.get('nutriGoals', {}));
  const entries = (d) => Store.all('meals').filter((m) => m.day === (d || viewDay));

  function totals(list) {
    const t = { kcal: 0, prot: 0, carb: 0, fat: 0, fiber: 0, sugar: 0, sodium: 0 };
    (list || entries()).forEach((m) => {
      Object.keys(t).forEach((k) => { t[k] += Number(m[k]) || 0; });
    });
    return t;
  }
  const water = (d) => Store.get('water.' + (d || viewDay), 0);
  const setWater = (v, d) => Store.set('water.' + (d || viewDay), Math.max(0, v));

  /* ============================================================
     Rendu principal
     ============================================================ */
  function mount(el) {
    root = el;
    render();
  }

  function render() {
    const g = goals(), list = entries(), t = totals(list);
    const isToday = viewDay === UI.day.today();

    root.innerHTML =
      '<div class="wrap">' +
        dayNav(isToday) +
        ringsBlock(t, g) +
        macroBlock(t, g) +
        waterBlock(g) +
        addBlock() +
        mealsBlock(list) +
        analysisBlock() +
      '</div>';

    bind();
  }

  function dayNav(isToday) {
    /* L'astuce du balayage ne s'affiche que les premieres fois :
       une fois le geste connu, la phrase devient du bruit. */
    const vus = Store.get('astuceBalayage', 0);
    const astuce = (vus < 4 && global.Gestes && Gestes.tactile())
      ? '<div class="indice-geste">' + Icon('swipe', 15) + 'Balaie l\'écran pour changer de jour</div>' : '';
    if (astuce) Store.set('astuceBalayage', vus + 1);

    return '<div class="row-between" style="padding:14px 0 2px">' +
      '<button class="tbtn" data-day="-1" aria-label="Jour précédent">' + Icon('back', 18) + '</button>' +
      '<div style="text-align:center"><b style="font-size:17px;letter-spacing:-.02em">' + UI.esc(UI.day.label(viewDay)) + '</b></div>' +
      '<button class="tbtn" data-day="1" aria-label="Jour suivant" ' + (isToday ? 'style="opacity:.3"' : '') + '>' + Icon('next', 18) + '</button>' +
      '</div>' + astuce;
  }

  function ringsBlock(t, g) {
    const left = Math.max(0, g.kcal - t.kcal);
    return '<div class="panel" style="padding:18px 14px">' +
      '<div class="rings">' +
        UI.ring(t.kcal, g.kcal, UI.fmt.n(t.kcal), 'sur ' + UI.fmt.n(g.kcal) + ' kcal') +
        '<div style="flex:1;min-width:170px">' +
          '<div class="stat" style="box-shadow:none;background:transparent;padding:0">' +
            '<div class="k">' + Icon('flame', 13) + (t.kcal > g.kcal ? 'Dépassement' : 'Il te reste') + '</div>' +
            '<div class="v">' + UI.fmt.n(t.kcal > g.kcal ? t.kcal - g.kcal : left) + '<small>kcal</small></div>' +
            '<div class="d ' + (t.kcal > g.kcal ? 'down' : 'flat') + '">' +
              (t.kcal > g.kcal ? "Au-dessus de l'objectif" : Math.round(100 * t.kcal / g.kcal) + ' % de la journée') +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div></div>';
  }

  function macroBlock(t, g) {
    const rows = MACROS.map((m) => {
      const v = t[m.k] || 0, target = g[m.k] || 0;
      const pct = target ? Math.min(100, 100 * v / target) : 0;
      const over = target && v > target * 1.08;
      return '<div class="macro"><div class="row-between">' +
        '<span>' + UI.esc(m.nom) + '</span>' +
        '<span>' + UI.fmt.n(v) + ' / ' + UI.fmt.n(target) + ' ' + m.unit + '</span></div>' +
        '<div class="bar-track"><div class="bar-fill" style="width:' + pct.toFixed(0) + '%;background:' + (over ? 'var(--warn)' : 'var(--accent)') + '"></div></div></div>';
    }).join('');
    const extra = '<div class="stats" style="margin-top:12px">' +
      '<div class="stat"><div class="k">Sucrés</div><div class="v">' + UI.fmt.n(t.sugar) + '<small>g</small></div></div>' +
      '<div class="stat"><div class="k">Sodium</div><div class="v">' + UI.fmt.n(t.sodium) + '<small>mg</small></div></div>' +
      '</div>';
    return '<div class="panel" style="margin-top:12px">' + rows + extra + '</div>';
  }

  function waterBlock(g) {
    const w = water(), pct = Math.min(100, 100 * w / (g.water || 2500));
    return '<div class="panel" style="margin-top:12px">' +
      '<div class="row-between" style="margin-bottom:8px">' +
        '<b style="display:flex;align-items:center;gap:7px">' + Icon('water', 17) + 'Eau</b>' +
        '<span class="muted tabnum">' + UI.fmt.n(w) + ' / ' + UI.fmt.n(g.water) + ' ml</span></div>' +
      '<div class="bar-track"><div class="bar-fill" style="width:' + pct.toFixed(0) + '%;background:var(--info)"></div></div>' +
      '<div class="btnrow" style="margin-top:10px">' +
        '<button class="btn sm soft" data-water="250">+ 25 cl</button>' +
        '<button class="btn sm soft" data-water="500">+ 50 cl</button>' +
        '<button class="btn sm ghost" data-water="-250">Retirer</button>' +
      '</div></div>';
  }

  function addBlock() {
    return '<div class="grid tight two" style="margin-top:14px">' +
      '<button class="btn primary lg" data-act="scan">' + Icon('camera', 19) + 'Scanner</button>' +
      '<button class="btn lg" data-act="search">' + Icon('search', 19) + 'Chercher</button>' +
      '</div>' +
      '<div class="btnrow" style="margin-top:8px">' +
        '<button class="btn sm ghost" data-act="manual">' + Icon('plus', 15) + 'Saisie manuelle</button>' +
        '<button class="btn sm ghost" data-act="fromcodex">' + Icon('coffee', 15) + 'Mes recettes</button>' +
      '</div>';
  }

  function mealsBlock(list) {
    return SLOTS.map((s) => {
      const items = list.filter((m) => m.slot === s.id);
      const kcal = items.reduce((a, b) => a + (Number(b.kcal) || 0), 0);
      return '<div class="section" style="padding-bottom:0">' +
        '<div class="sechead"><h2 style="font-size:16px;display:flex;align-items:center;gap:8px">' + Icon(s.icon, 17) + UI.esc(s.nom) + '</h2>' +
        '<span>' + (kcal ? UI.fmt.kcal(kcal) : '—') + '</span></div>' +
        /* Le bouton d'ajout est toujours la derniere ligne du repas,
           meme quand il contient deja quelque chose : sans ca, on ne
           pouvait pas ajouter un deuxieme plat a un dejeuner. */
        '<div class="list">' + items.map(mealRow).join('') +
          '<button class="rowitem addrow" data-addslot="' + s.id + '">' +
            '<span class="ic">' + Icon('plus', 17) + '</span>' +
            '<span class="tx"><b>Ajouter</b></span></button>' +
        '</div>' +
      '</div>';
    }).join('');
  }

  function mealRow(m) {
    const q = m.qty ? UI.fmt.n(m.qty) + ' ' + UI.esc(m.unit || 'g') : '';
    /* Un aliment de la table interne rapporte sa famille, donc sa
       couleur : le journal se lit alors comme une image et pas
       comme un tableau. */
    const ref = global.ALIMENTS ? ALIMENTS.TABLE.find((a) => ALIMENTS.norm(a.nom) === ALIMENTS.norm(m.nom)) : null;
    const vign = m.photoUrl || m.image
      ? '<span class="thumb"><img loading="lazy" src="' + UI.attr(m.photoUrl || m.image) + '" alt=""></span>'
      : '<span class="thumb" style="background:' + (ref ? (CATTINT[ref.cat] || 'var(--accent-soft)') : 'var(--accent-soft)') + ';color:var(--ink-2)">' +
          Icon(ref ? (CATICON[ref.cat] || 'fork') : (m.src === 'ai' ? 'sparkle' : m.src === 'off' ? 'scan' : 'fork'), 19) + '</span>';
    const ligne = '<div class="rowitem" data-meal="' + UI.attr(m.id) + '">' + vign +
      '<span class="tx"><b>' + UI.esc(m.nom) + '</b><small>' + q + (m.brand ? ' · ' + UI.esc(m.brand) : '') + '</small></span>' +
      '<span class="rt tabnum">' + UI.fmt.n(m.kcal) + ' kcal</span></div>';
    /* Tirer la ligne vers la gauche decouvre les deux actions
       qu'on fait vraiment : dupliquer et supprimer. */
    return global.Gestes ? Gestes.ligne(ligne, [
      { id: 'dup:' + m.id, icon: 'copy', label: 'Copier', classe: 'accent' },
      { id: 'del:' + m.id, icon: 'trash', label: 'Retirer', classe: 'danger' }
    ]) : ligne;
  }

  function analysisBlock() {
    const cached = Store.get('analysis.' + viewDay, null);
    if (cached) {
      return '<div class="section"><div class="sechead"><h2 style="font-size:16px">Analyse du jour</h2>' +
        '<button data-act="analyse">Refaire</button></div>' + analysisHtml(cached) + '</div>';
    }
    return '<div class="section"><div class="panel" style="text-align:center">' +
      '<b style="display:block;margin-bottom:6px">Analyse de la journée</b>' +
      '<p class="muted" style="font-size:13px;margin-bottom:12px">Ce qui va, ce qui ne va pas, et le même repas corrige avec deux ou trois changements.</p>' +
      '<button class="btn primary" data-act="analyse">' + Icon('sparkle', 17) + 'Analyser avec l\'IA</button>' +
      '</div></div>';
  }

  function analysisHtml(a) {
    const bloc = (title, items, cls, ic) => (items && items.length)
      ? '<div class="panel" style="margin-top:10px"><h4 style="display:flex;align-items:center;gap:7px;margin-bottom:8px;color:var(--' + cls + ')">' + Icon(ic, 16) + UI.esc(title) + '</h4>' +
        '<ul style="padding-left:18px">' + items.map((x) => '<li style="margin-bottom:6px;font-size:13.5px">' + UI.esc(x) + '</li>').join('') + '</ul></div>'
      : '';
    const swaps = (a.remplacements || []).map((s) =>
      '<div class="rowitem" style="border-bottom:1px solid var(--hairline)">' +
        '<span class="ic">' + Icon('refresh', 16) + '</span>' +
        '<span class="tx"><b>' + UI.esc(s.a_la_place_de) + ' → ' + UI.esc(s.mettre) + '</b><small>' + UI.esc(s.pourquoi || '') + '</small></span>' +
      '</div>').join('');

    return '<div class="panel" style="background:var(--accent-soft)">' +
        '<div class="row" style="gap:10px;align-items:flex-start">' + Icon('sparkle', 18) +
        '<div><b style="display:block;margin-bottom:4px">Verdict</b>' +
        '<p style="font-size:14px;line-height:1.5">' + UI.esc(a.verdict || '') + '</p>' +
        (a.note != null ? '<div class="tier" data-t="' + (a.note >= 8 ? 'or' : a.note >= 6 ? 'argent' : a.note >= 4 ? 'bronze' : 'lead') + '" style="margin-top:10px">' + Icon('trophy', 14) + a.note + ' / 10</div>' : '') +
        '</div></div></div>' +
      bloc('Ce qui va', a.bien, 'ok', 'check') +
      bloc('Ce qui ne va pas', a.moins_bien, 'warn', 'alert') +
      (swaps ? '<div class="panel" style="margin-top:10px"><h4 style="margin-bottom:8px">Le même repas, corrige</h4><div class="list" style="box-shadow:none">' + swaps + '</div>' +
        (a.resultat_corrige ? '<p class="muted" style="font-size:13px;margin-top:10px">' + UI.esc(a.resultat_corrige) + '</p>' : '') + '</div>' : '') +
      bloc('À ajouter demain', a.a_ajouter, 'info', 'plus') +
      '<p class="muted" style="font-size:11px;margin-top:10px;text-align:center">Analyse générée par IA. Ce ne sont pas des conseils medicaux.</p>';
  }

  /* ============================================================
     Interactions
     ============================================================ */
  /* Un seul chemin pour changer de jour : la fleche, le balayage
     et le clavier passent tous par la. */
  function allerJour(n) {
    if (n > 0 && viewDay === UI.day.today()) { UI.toast("On ne consigne pas l'avenir"); return; }
    viewDay = UI.day.add(viewDay, n);
    render();
  }

  function bind() {
    root.querySelectorAll('[data-day]').forEach((b) => b.onclick = () => allerJour(+b.dataset.day));

    /* Le pouce vers la droite recule d'un jour, comme on tourne
       une page en arriere. Les fleches du clavier font pareil sur
       ordinateur. */
    if (global.Gestes) {
      if (detacheGeste) detacheGeste();
      detacheGeste = Gestes.page(root, {
        onPrecedent: () => allerJour(-1),
        onSuivant: () => allerJour(1)
      });
      Gestes.activer(root, (action) => {
        const [quoi, id] = action.split(':');
        if (quoi === 'del') retirerRepas(id);
        if (quoi === 'dup') dupliquerRepas(id);
      });
    }
    root.querySelectorAll('[data-water]').forEach((b) => b.onclick = () => {
      setWater(water() + (+b.dataset.water)); UI.haptic('light'); render();
    });
    root.querySelectorAll('[data-act]').forEach((b) => b.onclick = () => actions[b.dataset.act] && actions[b.dataset.act]());
    root.querySelectorAll('[data-addslot]').forEach((b) => b.onclick = () => actions.search(b.dataset.addslot));
    root.querySelectorAll('[data-meal]').forEach((b) => b.onclick = () => openMeal(b.dataset.meal));
  }

  const actions = {
    scan: () => scanFlow(),
    search: (slot) => searchFlow(typeof slot === 'string' ? slot : null),
    manual: () => manualFlow(),
    fromcodex: () => codexFlow(),
    analyse: () => analyse()
  };

  function guessSlot() {
    const h = new Date().getHours();
    return h < 11 ? 'matin' : h < 15 ? 'midi' : h < 18 ? 'collation' : 'soir';
  }

  /* ---------- Ajout ---------- */
  function addEntry(item, slot) {
    const m = Store.add('meals', Object.assign({
      day: viewDay, slot: slot || item.slot || guessSlot(),
      nom: item.nom, qty: item.qty || null, unit: item.unit || 'g', brand: item.brand || '',
      kcal: Math.round(item.kcal || 0),
      prot: r1(item.prot), carb: r1(item.carb), fat: r1(item.fat),
      fiber: r1(item.fiber), sugar: r1(item.sugar), sodium: Math.round(item.sodium || 0),
      src: item.src || 'manual'
    }));
    Store.log('meal', { id: m.id, nom: m.nom, kcal: m.kcal });
    if (global.Game) Game.award('repas', 10);
    Store.set('analysis.' + viewDay, null);
    render();
    UI.toast(item.nom + ' ajoute');
    return m;
  }
  const r1 = (v) => v == null ? 0 : Math.round(Number(v) * 10) / 10;

  function openMeal(id) {
    const m = Store.find('meals', id);
    if (!m) return;
    UI.openSheet(
      '<div class="mbody" style="padding-top:6px">' +
        '<h2 style="font-size:23px">' + UI.esc(m.nom) + '</h2>' +
        (m.brand ? '<p class="muted" style="font-size:13px">' + UI.esc(m.brand) + '</p>' : '') +
        '<div class="nums" style="margin-top:16px">' +
          '<div class="num"><b>' + UI.fmt.n(m.kcal) + '</b><span>kcal</span></div>' +
          '<div class="num"><b>' + UI.fmt.n(m.prot) + '</b><span>prot. g</span></div>' +
          '<div class="num"><b>' + UI.fmt.n(m.carb) + '</b><span>gluc. g</span></div>' +
          '<div class="num"><b>' + UI.fmt.n(m.fat) + '</b><span>lip. g</span></div>' +
        '</div>' +
        '<div class="list" style="margin-top:14px">' +
          '<div class="rowitem"><span class="tx"><b>Quantité</b></span><span class="rt">' + UI.fmt.n(m.qty) + ' ' + UI.esc(m.unit) + '</span></div>' +
          '<div class="rowitem"><span class="tx"><b>Fibres</b></span><span class="rt">' + UI.fmt.n(m.fiber) + ' g</span></div>' +
          '<div class="rowitem"><span class="tx"><b>Sucrés</b></span><span class="rt">' + UI.fmt.n(m.sugar) + ' g</span></div>' +
          '<div class="rowitem"><span class="tx"><b>Sodium</b></span><span class="rt">' + UI.fmt.n(m.sodium) + ' mg</span></div>' +
        '</div>' +
        '<div class="btnrow" style="margin-top:18px">' +
          '<button class="btn grow" data-dup>' + Icon('copy', 16) + 'Dupliquer</button>' +
          '<button class="btn danger" data-del>' + Icon('trash', 16) + 'Supprimer</button>' +
        '</div>' +
      '</div>',
      { onMount: (s) => {
        s.querySelector('[data-del]').onclick = () => { Store.del('meals', id); UI.closeSheet(); Store.set('analysis.' + viewDay, null); render(); UI.toast('Supprime'); };
        s.querySelector('[data-dup]').onclick = () => { UI.closeSheet(); addEntry(m, m.slot); };
      } }
    );
  }

  /* ---------- Scan photo ---------- */
  const SCAN_SCHEMA = AI.T.obj({
    aliments: AI.T.arr(AI.T.obj({
      nom: AI.T.str('Nom court en francais'),
      quantite: AI.T.num('Quantité estimée'),
      unite: AI.T.enu(['g', 'ml', 'pièce', 'portion'], 'Unité'),
      kcal: AI.T.num('Calories totales de cette portion'),
      proteines: AI.T.num('Grammes'),
      glucides: AI.T.num('Grammes'),
      lipides: AI.T.num('Grammes'),
      fibres: AI.T.num('Grammes'),
      sucres: AI.T.num('Grammes'),
      sodium: AI.T.num('Milligrammes'),
      confiance: AI.T.enu(['haute', 'moyenne', 'basse'], 'Confiance de l estimation')
    })),
    commentaire: AI.T.str('Une phrase sur le plat')
  }, ['aliments']);

  function scanFlow() {
    if (!AI.available()) return needKey();
    /* Passe par Photos.pick : c'est lui qui corrige la premiere
       photo qui ne declenchait rien sur iPhone. */
    Photos.pick(async (f) => {
      if (!f) return;
      UI.openSheet('<div class="mbody">' + UI.thinking('Analyse de la photo…') + '</div>');
      try {
        const img = await AI.shrink(f, 1280, 0.82);
        const res = await AI.vision([img],
          "Analyse cette photo de repas. Identifie chaque aliment visible et estime la portion reelle à partir des repères de l'image (assiette, couverts, verre). " +
          "Donne les valeurs nutritionnelles POUR LA PORTION VISIBLE, pas pour 100 g. Reste realiste : une estimation honnete vaut mieux qu'un chiffre précis invente. " +
          "Si un aliment est incertain, mets confiance basse. Réponds en francais.",
          SCAN_SCHEMA, { cache: false });
        showScanResult(res, img);
      } catch (e) {
        UI.closeSheet();
        UI.toast(AI.humanError(e) || 'Analyse impossible');
      }
    }, { capture: 'environment' });
  }

  function showScanResult(res, img) {
    const list = (res.aliments || []).map((a, i) =>
      '<label class="rowitem" style="cursor:pointer">' +
        '<input type="checkbox" data-i="' + i + '" checked style="width:20px;height:20px;accent-color:var(--accent)">' +
        '<span class="tx"><b>' + UI.esc(a.nom) + '</b><small>' + UI.fmt.n(a.quantite) + ' ' + UI.esc(a.unite) +
        (a.confiance === 'basse' ? ' · estimation incertaine' : '') + '</small></span>' +
        '<span class="rt tabnum">' + UI.fmt.n(a.kcal) + ' kcal</span></label>').join('');

    UI.openSheet(
      '<div class="mimg"><img class="bg" src="' + img + '" alt=""><img src="' + img + '" alt=""></div>' +
      '<div class="mbody">' +
        '<h2 style="font-size:22px">Ce que je vois</h2>' +
        (res.commentaire ? '<p class="mdesc">' + UI.esc(res.commentaire) + '</p>' : '') +
        '<label class="field" style="margin-top:14px"><span>Moment</span><select data-slot>' +
          SLOTS.map((s) => '<option value="' + s.id + '"' + (s.id === guessSlot() ? ' selected' : '') + '>' + s.nom + '</option>').join('') +
        '</select></label>' +
        '<div class="list">' + (list || '<div class="rowitem"><span class="tx"><b>Rien d\'identifiable</b></span></div>') + '</div>' +
        '<button class="btn primary block lg" style="margin-top:16px" data-confirm>Ajouter àu journal</button>' +
        '<p class="muted" style="font-size:11px;margin-top:10px;text-align:center">Estimations IA. Corrige une ligne en la rouvrant après ajout.</p>' +
      '</div>',
      { onMount: (s) => {
        s.querySelector('[data-confirm]').onclick = () => {
          const slot = s.querySelector('[data-slot]').value;
          const checks = Array.from(s.querySelectorAll('[data-i]'));
          let n = 0;
          checks.forEach((c) => {
            if (!c.checked) return;
            const a = res.aliments[+c.dataset.i];
            addEntry({ nom: a.nom, qty: a.quantite, unit: a.unite, kcal: a.kcal,
              prot: a.proteines, carb: a.glucides, fat: a.lipides,
              fiber: a.fibres, sugar: a.sucres, sodium: a.sodium, src: 'ai' }, slot);
            n++;
          });
          UI.closeSheet();
          if (n && global.Game) Game.award('scan', 20);
        };
      } }
    );
  }

  /* ---------- Recherche Open Food Facts ---------- */
  /* ============================================================
     Recherche d'aliments

     Deux sources, dans cet ordre :
       1. la table interne (js/data/aliments.js) : les plats, la
          street food, les fruits, tout ce qui n'a pas de
          code-barres. C'est elle qui permet enfin de consigner un
          kebab ;
       2. Open Food Facts pour les produits emballes.

     La table repond instantanement, sans reseau. Open Food Facts
     arrive ensuite et vient completer la liste.
     ============================================================ */
  function searchFlow(slot) {
    slot = slot || guessSlot();
    UI.openSheet(
      '<div class="mbody" style="padding-top:6px">' +
        '<h2 style="font-size:22px;margin-bottom:12px">Ajouter un aliment</h2>' +
        '<label class="search" style="box-shadow:var(--sh-inset)">' + Icon('search', 17) +
        '<input type="search" data-q placeholder="Kebab, pates, yaourt, code-barres…" autocomplete="off"></label>' +
        '<div class="btnrow" style="margin-top:10px">' +
          '<button class="btn soft sm" data-bar>' + Icon('scan', 16) + 'Scanner un code-barres</button>' +
          '<button class="btn soft sm" data-manual>' + Icon('plus', 16) + 'Saisir à la main</button>' +
        '</div>' +
        '<div data-res style="margin-top:14px"></div>' +
      '</div>',
      { onMount: (s) => {
        const q = s.querySelector('[data-q]'), out = s.querySelector('[data-res]');
        setTimeout(() => q.focus(), 260);

        s.querySelector('[data-bar]').onclick = () => { UI.closeSheet(); barcodeFlow(slot); };
        s.querySelector('[data-manual]').onclick = () => { UI.closeSheet(); manualFlow(q.value.trim(), slot); };

        const run = UI.debounce(async () => {
          const v = q.value.trim();
          if (v.length < 2) { out.innerHTML = startBlock(slot); bindPick(out, slot); return; }

          /* La table repond tout de suite. */
          const locaux = global.ALIMENTS ? ALIMENTS.chercher(v, 10) : [];
          out.innerHTML = resultList(locaux) + UI.thinking('On regarde aussi les produits emballés…');
          bindPick(out, slot);

          const rows = await offSearch(v);
          const vus = new Set(locaux.map((x) => ALIMENTS.norm(x.nom)));
          const nets = rows.filter((r) => !vus.has(ALIMENTS.norm(r.nom)));
          const tout = locaux.concat(nets);

          if (!tout.length) {
            out.innerHTML = UI.empty('search', 'Rien sous ce nom', "Ajoute-le à la main : l'IA remplira les calories toute seule.") +
              '<button class="btn primary block" data-man2>' + Icon('plus', 16) + 'Ajouter « ' + UI.esc(v) + ' »</button>';
            out.querySelector('[data-man2]').onclick = () => { UI.closeSheet(); manualFlow(v, slot); };
            return;
          }
          out.innerHTML = resultList(tout) +
            '<button class="btn ghost block" style="margin-top:10px" data-man2>' + Icon('plus', 16) + 'Aucun ne correspond, saisir à la main</button>';
          bindPick(out, slot);
          out.querySelector('[data-man2]').onclick = () => { UI.closeSheet(); manualFlow(v, slot); };
        }, 320);

        q.oninput = run;
        out.innerHTML = startBlock(slot);
        bindPick(out, slot);
      } }
    );
  }

  /* Une vignette pour chaque aliment : photo du produit quand Open
     Food Facts en fournit une, sinon une pastille de couleur par
     famille. Une liste d'aliments doit se lire d'un coup d'oeil. */
  const CATTINT = {
    plat: '#E9F1FB', sandwich: '#FBEDE3', viande: '#FBE7E7', poisson: '#E4F1F6',
    feculent: '#F7EFDF', legume: '#E7F5EC', fruit: '#FBEFF4', laitier: '#F1F0FB',
    petitdej: '#FAF0DE', entree: '#EFF3E9', dessert: '#FBE9EF', snack: '#F2EFEA',
    boisson: '#E4F0F6', sauce: '#F5EEE6'
  };
  const CATICON = {
    plat: 'pot', sandwich: 'fork', viande: 'fork', poisson: 'fork',
    feculent: 'fork', legume: 'apple', fruit: 'apple', laitier: 'apple',
    petitdej: 'coffee', entree: 'fork', dessert: 'apple', snack: 'apple',
    boisson: 'glass', sauce: 'fork'
  };
  function vignette(r) {
    if (r.image) return '<span class="thumb"><img loading="lazy" src="' + UI.attr(r.image) + '" alt=""></span>';
    const tint = CATTINT[r.cat] || 'var(--accent-soft)';
    return '<span class="thumb" style="background:' + tint + ';color:var(--ink-2)">' + Icon(CATICON[r.cat] || 'fork', 19) + '</span>';
  }

  function resultList(rows) {
    if (!rows.length) return '';
    return '<div class="list">' + rows.map((r) =>
      '<button class="rowitem" data-pick=\'' + UI.attr(JSON.stringify(r)) + '\'>' +
        vignette(r) +
        '<span class="tx"><b>' + UI.esc(r.nom) + '</b><small>' +
          (r.brand ? UI.esc(r.brand) + ' · ' : (r.catNom ? UI.esc(r.catNom) + ' · ' : '')) +
          UI.fmt.n(r.kcal100) + ' kcal / 100 ' + r.base + '</small></span>' +
        '<span class="rt">' + Icon('next', 15) + '</span></button>').join('') + '</div>';
  }

  /* Avant la premiere lettre : ce qu'il a mange recemment, puis les
     aliments les plus courants. Rien de vide, jamais. */
  function startBlock(slot) {
    const seen = new Map();
    Store.all('meals').slice().reverse().forEach((m) => { if (!seen.has(m.nom)) seen.set(m.nom, m); });
    const recents = Array.from(seen.values()).slice(0, 6).map(mealToPick);

    const courants = global.ALIMENTS
      ? ['Kebab', 'Pizza margherita', 'Pates cuites', 'Riz blanc cuit', 'Escalope de poulet', 'Salade composee',
         'Oeuf', 'Yaourt nature', 'Banane', 'Pomme', 'Baguette', 'Frites']
          .map((n) => ALIMENTS.TABLE.find((a) => a.nom === n)).filter(Boolean)
      : [];

    const titre = (t) => '<h4 style="font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:var(--muted);margin:14px 0 8px">' + t + '</h4>';
    return (recents.length ? titre('Récemment') + resultList(recents) : '') +
           (courants.length ? titre('Les plus courants') + resultList(courants) : '');
  }

  function mealToPick(m) {
    return {
      nom: m.nom, brand: m.brand || '', base: m.unit === 'ml' ? 'ml' : 'g',
      kcal100: Math.round(m.qty ? (m.kcal / m.qty) * 100 : m.kcal),
      per100: { prot: safe100(m.prot, m.qty), carb: safe100(m.carb, m.qty), fat: safe100(m.fat, m.qty),
                fiber: safe100(m.fiber, m.qty), sugar: safe100(m.sugar, m.qty), sodium: safe100(m.sodium, m.qty) },
      defaultQty: m.qty || 100, src: m.src, cat: 'plat'
    };
  }

  function bindPick(out, slot) {
    out.querySelectorAll('[data-pick]').forEach((b) => b.onclick = () => {
      let r; try { r = JSON.parse(b.dataset.pick); } catch (e) { return; }
      askQuantity(r, slot);
    });
  }

  function recentSuggestions(slot) {
    const seen = new Map();
    Store.all('meals').slice().reverse().forEach((m) => { if (!seen.has(m.nom)) seen.set(m.nom, m); });
    const rows = Array.from(seen.values()).slice(0, 8);
    if (!rows.length) return '<p class="muted" style="font-size:13px">Tape au moins deux lettres. La base Open Food Facts couvre les produits emballes et les codes-barres.</p>';
    return '<h4 style="font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:var(--muted);margin-bottom:8px">Recemment</h4>' +
      '<div class="list">' + rows.map((m) =>
        '<button class="rowitem" data-pick=\'' + UI.attr(JSON.stringify({
          nom: m.nom, brand: m.brand, base: m.unit === 'ml' ? 'ml' : 'g',
          kcal100: m.qty ? (m.kcal / m.qty) * 100 : m.kcal,
          per100: { prot: safe100(m.prot, m.qty), carb: safe100(m.carb, m.qty), fat: safe100(m.fat, m.qty), fiber: safe100(m.fiber, m.qty), sugar: safe100(m.sugar, m.qty), sodium: safe100(m.sodium, m.qty) },
          defaultQty: m.qty || 100, src: m.src
        })) + '\'>' +
          '<span class="ic">' + Icon('clock', 17) + '</span>' +
          '<span class="tx"><b>' + UI.esc(m.nom) + '</b><small>' + UI.fmt.n(m.qty) + ' ' + UI.esc(m.unit) + ' · ' + UI.fmt.n(m.kcal) + ' kcal</small></span>' +
          '<span class="rt">' + Icon('next', 15) + '</span></button>').join('') + '</div>';
  }
  const safe100 = (v, q) => (q ? (Number(v) || 0) / q * 100 : (Number(v) || 0));

  async function offSearch(q) {
    const isBarcode = /^\d{8,14}$/.test(q);
    const base = (global.EVER_CONFIG && EVER_CONFIG.foodApi) || 'https://world.openfoodfacts.org/api/v2';
    const url = isBarcode
      ? base + '/product/' + encodeURIComponent(q) + '?fields=product_name,product_name_fr,brands,nutriments,quantity,serving_quantity,image_front_small_url,image_small_url'
      : base + '/search?search_terms=' + encodeURIComponent(q) + '&page_size=24&fields=product_name,product_name_fr,brands,nutriments,quantity,serving_quantity,image_front_small_url,image_small_url';
    try {
      const r = await fetch(url, { headers: { 'Accept': 'application/json' } });
      if (!r.ok) return [];
      const j = await r.json();
      const raw = isBarcode ? (j.product ? [j.product] : []) : (j.products || []);
      return raw.map(offMap).filter((x) => x && x.nom && x.kcal100 != null);
    } catch (e) { return []; }
  }

  function offMap(p) {
    const n = p.nutriments || {};
    const kcal = n['energy-kcal_100g'] != null ? n['energy-kcal_100g'] : (n.energy_100g ? n.energy_100g / 4.184 : null);
    if (kcal == null) return null;
    return {
      nom: p.product_name_fr || p.product_name || '',
      brand: (p.brands || '').split(',')[0].trim(),
      base: 'g',
      kcal100: Math.round(kcal),
      per100: {
        prot: n.proteins_100g || 0, carb: n.carbohydrates_100g || 0, fat: n.fat_100g || 0,
        fiber: n.fiber_100g || 0, sugar: n.sugars_100g || 0, sodium: (n.sodium_100g || 0) * 1000
      },
      defaultQty: Number(p.serving_quantity) || 100,
      image: p.image_front_small_url || p.image_small_url || '',
      src: 'off'
    };
  }

  async function askQuantity(r, slot) {
    const res = await UI.promptSheet(r.nom, [
      { name: 'qty', label: 'Quantité', type: 'number', inputmode: 'decimal', value: r.defaultQty || 100, hint: r.base === 'ml' ? 'en millilitres' : 'en grammes' },
      { name: 'slot', label: 'Moment', type: 'select', value: slot, options: SLOTS.map((s) => ({ v: s.id, n: s.nom })) }
    ], 'Ajouter');
    if (!res) return;
    const q = Number(res.qty) || 100, f = q / 100;
    addEntry({
      nom: r.nom, brand: r.brand, qty: q, unit: r.base,
      kcal: r.kcal100 * f,
      prot: (r.per100.prot || 0) * f, carb: (r.per100.carb || 0) * f, fat: (r.per100.fat || 0) * f,
      fiber: (r.per100.fiber || 0) * f, sugar: (r.per100.sugar || 0) * f, sodium: (r.per100.sodium || 0) * f,
      src: r.src || 'off'
    }, res.slot);
  }

  /* ---------- Saisie manuelle ---------- */
  async function manualFlow(prefill, slot) {
    const res = await UI.promptSheet('Ajouter un aliment', [
      { name: 'nom', label: 'Nom', value: prefill || '', placeholder: 'Poulet roti' },
      { name: 'qty', label: 'Quantité (g ou ml)', type: 'number', inputmode: 'decimal', value: 100 },
      { name: 'kcal', label: 'Calories', type: 'number', inputmode: 'numeric', value: '' },
      { name: 'prot', label: 'Protéines (g)', type: 'number', inputmode: 'decimal', value: '' },
      { name: 'carb', label: 'Glucides (g)', type: 'number', inputmode: 'decimal', value: '' },
      { name: 'fat', label: 'Lipides (g)', type: 'number', inputmode: 'decimal', value: '' },
      { name: 'slot', label: 'Moment', type: 'select', value: slot || guessSlot(), options: SLOTS.map((s) => ({ v: s.id, n: s.nom })) }
    ], 'Ajouter');
    if (!res || !res.nom) return;

    /* Si l'utilisateur ne remplit que le nom, on demande a Gemini
       une estimation plutôt que d'enregistrer des zeros. */
    if (!res.kcal && AI.available()) {
      try {
        UI.toast('Estimation en cours…');
        const est = await AI.json(
          'Valeurs nutritionnelles de : ' + res.nom + ', pour ' + (res.qty || 100) + ' g. Chiffres réalistes, base de données francaise.',
          AI.T.obj({ kcal: AI.T.num(''), proteines: AI.T.num(''), glucides: AI.T.num(''), lipides: AI.T.num(''), fibres: AI.T.num(''), sucres: AI.T.num(''), sodium: AI.T.num('') }),
          { ttl: 30 * 86400e3 });
        res.kcal = est.kcal; res.prot = est.proteines; res.carb = est.glucides; res.fat = est.lipides;
        res.fiber = est.fibres; res.sugar = est.sucres; res.sodium = est.sodium;
      } catch (e) {}
    }
    addEntry({
      nom: res.nom, qty: Number(res.qty) || null, unit: 'g',
      kcal: Number(res.kcal) || 0, prot: Number(res.prot) || 0, carb: Number(res.carb) || 0, fat: Number(res.fat) || 0,
      fiber: Number(res.fiber) || 0, sugar: Number(res.sugar) || 0, sodium: Number(res.sodium) || 0,
      src: 'manual'
    }, res.slot);
  }

  /* ============================================================
     Code-barres

     Deux chemins, parce qu'aucun ne marche partout :
       - BarcodeDetector, natif, quand le navigateur le propose
         (Chrome, Android). Lecture en direct, instantanee.
       - sinon une photo du code-barres, lue par Gemini. C'est le
         cas d'iOS, ou l'API native n'existe pas dans Safari.
     Dans les deux cas on finit par un chiffre, qu'on envoie a Open
     Food Facts.
     ============================================================ */
  function barcodeFlow(slot) {
    if ('BarcodeDetector' in global) return barcodeLive(slot);
    return barcodePhoto(slot);
  }

  async function barcodeLive(slot) {
    let stream = null, arret = false;
    UI.openSheet(
      '<div class="mbody" style="padding-top:6px">' +
        '<h2 style="font-size:22px;margin-bottom:4px">Vise le code-barres</h2>' +
        '<p class="muted" style="font-size:13px;margin-bottom:12px">Approche jusqu\'à ce que les barres remplissent le cadre.</p>' +
        '<div class="scanbox"><video data-v playsinline muted autoplay></video><div class="scanline"></div></div>' +
        '<button class="btn ghost block" style="margin-top:12px" data-photo>Plutôt prendre une photo</button>' +
      '</div>',
      { onMount: async (sh) => {
          const v = sh.querySelector('[data-v]');
          sh.querySelector('[data-photo]').onclick = () => { arret = true; stop(); UI.closeSheet(); barcodePhoto(slot); };
          try {
            stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
            v.srcObject = stream;
          } catch (e) { UI.closeSheet(); barcodePhoto(slot); return; }

          const det = new global.BarcodeDetector({ formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128'] });
          const boucle = async () => {
            if (arret) return;
            try {
              const codes = await det.detect(v);
              if (codes && codes.length) {
                arret = true; stop(); UI.closeSheet();
                return lookupBarcode(codes[0].rawValue, slot);
              }
            } catch (e) {}
            requestAnimationFrame(boucle);
          };
          requestAnimationFrame(boucle);
        },
        onClose: () => { arret = true; stop(); } }
    );
    function stop() { if (stream) stream.getTracks().forEach((t) => t.stop()); stream = null; }
  }

  function barcodePhoto(slot) {
    if (!AI.available()) { UI.toast("Ajoute ta clé IA dans les réglages pour lire un code en photo"); return manualFlow('', slot); }
    Photos.pick(async (f) => {
      if (!f) return;
      UI.toast('Lecture du code…');
      try {
        const petite = await AI.shrink(f, 1100, 0.85);
        const lu = await AI.vision([petite],
          "Cette photo contient un code-barres de produit alimentaire. Renvoie uniquement la suite de chiffres imprimee sous les barres, sans espace ni tiret. Si aucun code n'est lisible, renvoie une chaine vide.",
          AI.T.obj({ code: AI.T.str('Les chiffres du code-barres, ou une chaine vide') }, ['code']),
          { cache: false });
        const code = String((lu && lu.code) || '').replace(/\D/g, '');
        if (code.length < 8) { UI.toast('Code illisible, réessaie de plus près'); return; }
        lookupBarcode(code, slot);
      } catch (e) { UI.toast(AI.humanError ? AI.humanError(e) : 'Lecture impossible'); }
    }, { capture: 'environment' });
  }

  async function lookupBarcode(code, slot) {
    UI.toast('Produit ' + code + '…');
    const rows = await offSearch(code);
    if (!rows.length) {
      UI.toast('Produit inconnu de la base');
      return manualFlow('', slot);
    }
    askQuantity(rows[0], slot || guessSlot());
  }

  /* ============================================================
     Depuis le Codex

     L'ancienne version lisait `global.DRINKS`, qui n'existe pas :
     les donnees du Codex sont declarees en `const` au niveau du
     script, donc visibles par la portee mais absentes de `window`.
     Resultat : une feuille vide des qu'aucun favori n'existait.
     On lit maintenant directement les trois jeux de donnees, et on
     affiche les photos.
     ============================================================ */
  function codexFlow(slot) {
    slot = slot || guessSlot();
    const favs = (global.Codex && Codex.favorites) ? Codex.favorites() : [];

    const boissons = (typeof DRINKS !== 'undefined' ? DRINKS : [])
      .map((d) => ({ nom: d.nom, kcal: d.kcal, img: IMG[d.id] }));
    const cocktails = (typeof COCKTAILS !== 'undefined' ? COCKTAILS : [])
      .map((d) => ({ nom: d.nom, kcal: null, img: IMG['ck-' + d.id] }));
    const plats = (typeof MAMIE !== 'undefined' ? MAMIE : [])
      .map((d) => ({ nom: d.nom, kcal: null, img: IMG['mm-' + (d.img || 'crepes-bocuse')] }));

    const favRows = favs.map((f) => ({
      nom: f.nom, kcal: f.kcal != null ? f.kcal : null,
      img: f.tab === 'sb' ? IMG[f.id] : f.tab === 'ck' ? IMG['ck-' + f.id] : IMG['mm-' + f.id]
    }));

    const bloc = (titre, rows) => rows.length
      ? '<h4 style="font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:var(--muted);margin:16px 0 8px">' + titre + '</h4>' +
        '<div class="list">' + rows.map((r) =>
          '<button class="rowitem" data-c="' + UI.attr(r.nom) + '" data-k="' + (r.kcal == null ? '' : r.kcal) + '">' +
            (r.img ? '<span class="thumb"><img loading="lazy" src="' + UI.attr(r.img) + '" alt=""></span>'
                   : '<span class="ic">' + Icon('coffee', 17) + '</span>') +
            '<span class="tx"><b>' + UI.esc(r.nom) + '</b></span>' +
            '<span class="rt tabnum">' + (r.kcal != null ? UI.fmt.n(r.kcal) + ' kcal' : Icon('next', 15)) + '</span>' +
          '</button>').join('') + '</div>'
      : '';

    UI.openSheet(
      '<div class="mbody" style="padding-top:6px">' +
        '<h2 style="font-size:22px;margin-bottom:2px">Mes boissons et recettes</h2>' +
        '<p class="muted" style="font-size:13px">Tout ce qui est dans Café, Bar et Recettes.</p>' +
        '<label class="search" style="box-shadow:var(--sh-inset);margin-top:12px">' + Icon('search', 17) +
          '<input type="search" data-cq placeholder="Filtrer…" autocomplete="off"></label>' +
        '<div data-cout>' +
          bloc('Mes favoris', favRows) +
          bloc('Café', boissons) +
          bloc('Bar', cocktails) +
          bloc('Recettes', plats) +
        '</div>' +
      '</div>',
      { onMount: (sh) => {
          const bind = () => sh.querySelectorAll('[data-c]').forEach((b) => b.onclick = () => {
            UI.closeSheet();
            const k = b.dataset.k;
            if (k === '') return manualFlow(b.dataset.c, slot);
            addEntry({ nom: b.dataset.c, kcal: +k, qty: 1, unit: 'portion', src: 'manual' }, slot);
          });
          bind();
          const q = sh.querySelector('[data-cq]'), out = sh.querySelector('[data-cout]');
          q.oninput = () => {
            const v = ALIMENTS ? ALIMENTS.norm(q.value) : q.value.toLowerCase();
            if (!v) { out.querySelectorAll('[data-c]').forEach((b) => b.style.display = ''); return; }
            out.querySelectorAll('[data-c]').forEach((b) => {
              const n = ALIMENTS ? ALIMENTS.norm(b.dataset.c) : b.dataset.c.toLowerCase();
              b.style.display = n.indexOf(v) >= 0 ? '' : 'none';
            });
          };
        } }
    );
  }

  function quickAdd(item) {
    addEntry({ nom: item.nom, kcal: item.kcal || 0, qty: 1, unit: 'portion', src: 'manual' }, guessSlot());
  }

  /* ---------- Analyse du jour ---------- */
  const ANALYSIS_SCHEMA = AI.T.obj({
    note: AI.T.int('Note de 0 a 10 de la qualite nutritionnelle du jour'),
    verdict: AI.T.str('Deux phrases maximum, direct, sans flatterie'),
    bien: AI.T.arr(AI.T.str(''), 'Ce qui a ete bien mange'),
    moins_bien: AI.T.arr(AI.T.str(''), 'Ce qui pose problème et pourquoi'),
    remplacements: AI.T.arr(AI.T.obj({
      a_la_place_de: AI.T.str('Aliment consomme a remplacer'),
      mettre: AI.T.str('Aliment de remplacement concret et courant en France'),
      pourquoi: AI.T.str('Une ligne, avec le gain chiffre si possible')
    }), 'Deux a quatre remplacements seulement, on garde le même repas'),
    resultat_corrige: AI.T.str('Ce que la journée serait devenue avec ces changements, avec les calories et protéines estimées'),
    a_ajouter: AI.T.arr(AI.T.str(''), 'Aliments manquants a ajouter demain')
  }, ['note', 'verdict', 'bien', 'moins_bien', 'remplacements']);

  async function analyse() {
    if (!AI.available()) return needKey();
    const list = entries();
    if (!list.length) { UI.toast('Rien à analyser pour ce jour'); return; }
    const g = goals(), t = totals(list);

    const target = root.querySelector('[data-act="analyse"]');
    if (target) target.outerHTML = UI.thinking('Analyse de la journée…');

    const detail = SLOTS.map((s) => {
      const it = list.filter((m) => m.slot === s.id);
      if (!it.length) return null;
      return s.nom + ' : ' + it.map((m) => m.nom + ' (' + UI.fmt.n(m.qty) + ' ' + m.unit + ', ' + Math.round(m.kcal) + ' kcal, P ' + r1(m.prot) + ' G ' + r1(m.carb) + ' L ' + r1(m.fat) + ')').join(', ');
    }).filter(Boolean).join('\n');

    const prompt =
      "Tu es un nutritionniste francais, direct, sans flatterie. Analyse cette journée alimentaire.\n\n" +
      "OBJECTIFS : " + g.kcal + " kcal, " + g.prot + " g de protéines, " + g.carb + " g de glucides, " + g.fat + " g de lipides, " + g.fiber + " g de fibres.\n" +
      "REALISE : " + Math.round(t.kcal) + " kcal, " + r1(t.prot) + " g de protéines, " + r1(t.carb) + " g de glucides, " + r1(t.fat) + " g de lipides, " + r1(t.fiber) + " g de fibres, " + r1(t.sugar) + " g de sucrés, " + Math.round(t.sodium) + " mg de sodium.\n\n" +
      "DETAIL :\n" + detail + "\n\n" +
      "Règles de reponse :\n" +
      "- Ne felicite pas pour rien. Si la journée est médiocre, dis-le.\n" +
      "- Les remplacements doivent garder le même repas et le même plaisir : on change deux ou trois aliments, on ne remplace pas un burger par une salade.\n" +
      "- Les aliments proposes doivent exister en supermarche francais.\n" +
      "- Chiffre les gains quand c'est possible.\n" +
      "- Pas de conseil medical, pas de discours sur le poids.";

    try {
      const res = await AI.json(prompt, ANALYSIS_SCHEMA, { cache: false, temperature: 0.6 });
      Store.set('analysis.' + viewDay, res);
      if (global.Game) Game.award('analyse', 15);
      render();
    } catch (e) {
      UI.toast(AI.humanError(e) || 'Analyse impossible');
      render();
    }
  }

  function needKey() {
    UI.openSheet('<div class="mbody" style="padding-top:6px">' +
      '<h2 style="font-size:22px">Clé Gemini requise</h2>' +
      '<p class="mdesc">Le scan et les analyses passent par Gemini. La clé reste sur cet appareil, elle n\'est jamais publiée.</p>' +
      '<button class="btn primary block lg" style="margin-top:18px" data-go>Ouvrir les réglages</button></div>',
      { onMount: (s) => s.querySelector('[data-go]').onclick = () => { UI.closeSheet(); App.go('#/m/settings/ia'); } });
  }

  /* ============================================================
     Passerelle nutrition (MyFitnessPal et autres)
     ------------------------------------------------------------
     L'interface est stable. Aujourd'hui seul l'adaptateur fichier
     est branche. Le jour ou une API existe, on ajoute un
     adaptateur ici sans toucher au reste de l'application.
     ============================================================ */
  const Bridge = {
    providers: {
      file: {
        id: 'file', nom: 'Fichier (MyFitnessPal, Yazio, Cronometer)',
        canRead: true, canWrite: true, live: false,
        note: "Import du CSV exporté depuis MyFitnessPal et export d'un CSV reimportable."
      }
    },
    /* Import CSV MyFitnessPal : Date, Meal, Food, Calories, ... */
    importCsv(text) {
      const rows = parseCsv(text);
      if (!rows.length) throw new Error('Fichier vide');
      const head = rows[0].map((h) => h.toLowerCase().trim());
      const col = (names) => { for (const n of names) { const i = head.indexOf(n); if (i >= 0) return i; } return -1; };
      const iDate = col(['date']);
      const iMeal = col(['meal', 'repas']);
      const iName = col(['food', 'aliment', 'food name', 'nom']);
      const iKcal = col(['calories', 'energy (kcal)', 'kcal']);
      const iProt = col(['protein (g)', 'protéines (g)', 'protein']);
      const iCarb = col(['carbohydrates (g)', 'carbs (g)', 'glucides (g)']);
      const iFat  = col(['fat (g)', 'lipides (g)']);
      const iFib  = col(['fiber (g)', 'fibres (g)']);
      const iSug  = col(['sugar (g)', 'sucrés (g)']);
      const iSod  = col(['sodium (mg)', 'sodium']);
      if (iName < 0 || iKcal < 0) throw new Error('Colonnes Food et Calories introuvables');

      const slotMap = { breakfast: 'matin', lunch: 'midi', dinner: 'soir', snacks: 'collation', snack: 'collation' };
      let n = 0;
      rows.slice(1).forEach((r) => {
        if (!r[iName]) return;
        const d = iDate >= 0 ? normDate(r[iDate]) : UI.day.today();
        const slot = iMeal >= 0 ? (slotMap[(r[iMeal] || '').toLowerCase().trim()] || 'collation') : 'collation';
        Store.add('meals', {
          day: d, slot: slot, nom: r[iName], qty: null, unit: 'portion',
          kcal: num(r[iKcal]), prot: num(r[iProt]), carb: num(r[iCarb]), fat: num(r[iFat]),
          fiber: num(r[iFib]), sugar: num(r[iSug]), sodium: num(r[iSod]),
          src: 'mfp'
        });
        n++;
      });
      return n;
    },
    exportCsv(fromDay, toDay) {
      const rows = [['Date', 'Meal', 'Food', 'Calories', 'Protein (g)', 'Carbohydrates (g)', 'Fat (g)', 'Fiber (g)', 'Sugar (g)', 'Sodium (mg)']];
      const meals = Store.all('meals')
        .filter((m) => (!fromDay || m.day >= fromDay) && (!toDay || m.day <= toDay))
        .sort((a, b) => a.day < b.day ? -1 : 1);
      const back = { matin: 'Breakfast', midi: 'Lunch', soir: 'Dinner', collation: 'Snacks' };
      meals.forEach((m) => rows.push([m.day, back[m.slot] || 'Snacks', m.nom,
        Math.round(m.kcal || 0), r1(m.prot), r1(m.carb), r1(m.fat), r1(m.fiber), r1(m.sugar), Math.round(m.sodium || 0)]));
      return rows.map((r) => r.map(csvCell).join(',')).join('\n');
    }
  };

  function csvCell(v) { const s = String(v == null ? '' : v); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }
  function num(v) { const x = parseFloat(String(v || '').replace(',', '.').replace(/[^\d.\-]/g, '')); return isNaN(x) ? 0 : x; }
  function normDate(s) {
    const t = String(s || '').trim();
    let m = /^(\d{4})-(\d{2})-(\d{2})/.exec(t); if (m) return m[1] + '-' + m[2] + '-' + m[3];
    m = /^(\d{1,2})[\/.](\d{1,2})[\/.](\d{4})/.exec(t);
    if (m) return m[3] + '-' + String(m[2]).padStart(2, '0') + '-' + String(m[1]).padStart(2, '0');
    const d = new Date(t);
    return isNaN(d.getTime()) ? UI.day.today() : UI.day.key(d);
  }
  function parseCsv(text) {
    const out = []; let row = [], cell = '', q = false;
    const s = String(text).replace(/\r\n?/g, '\n');
    for (let i = 0; i < s.length; i++) {
      const c = s[i];
      if (q) {
        if (c === '"') { if (s[i + 1] === '"') { cell += '"'; i++; } else q = false; }
        else cell += c;
      } else if (c === '"') q = true;
      else if (c === ',' || c === ';') { row.push(cell); cell = ''; }
      else if (c === '\n') { row.push(cell); out.push(row); row = []; cell = ''; }
      else cell += c;
    }
    if (cell || row.length) { row.push(cell); out.push(row); }
    return out.filter((r) => r.some((x) => String(x).trim()));
  }

  /* Statistiques exposees aux autres modules (sante, paliers). */
  function summary(days) {
    days = days || 7;
    const out = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = UI.day.add(UI.day.today(), -i);
      out.push(Object.assign({ day: d }, totals(entries(d))));
    }
    return out;
  }

  global.Food = { mount, quickAdd, totals, entries, goals, summary, Bridge, SLOTS, addEntry, analyse };
  App.register('food', { mount: mount });
})(window);
