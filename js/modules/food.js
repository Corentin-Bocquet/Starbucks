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
    { id: 'matin',     nom: 'Petit-dejeuner', icon: 'coffee' },
    { id: 'midi',      nom: 'Dejeuner',       icon: 'fork' },
    { id: 'soir',      nom: 'Diner',          icon: 'plate' },
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
    return '<div class="row-between" style="padding:14px 0 6px">' +
      '<button class="tbtn" data-day="-1" aria-label="Jour précédent">' + Icon('back', 18) + '</button>' +
      '<div style="text-align:center"><b style="font-size:17px;letter-spacing:-.02em">' + UI.esc(UI.day.label(viewDay)) + '</b></div>' +
      '<button class="tbtn" data-day="1" aria-label="Jour suivant" ' + (isToday ? 'style="opacity:.3"' : '') + '>' + Icon('next', 18) + '</button>' +
      '</div>';
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
        '<button class="btn sm ghost" data-act="fromcodex">' + Icon('coffee', 15) + 'Depuis le Codex</button>' +
      '</div>';
  }

  function mealsBlock(list) {
    return SLOTS.map((s) => {
      const items = list.filter((m) => m.slot === s.id);
      const kcal = items.reduce((a, b) => a + (Number(b.kcal) || 0), 0);
      return '<div class="section" style="padding-bottom:0">' +
        '<div class="sechead"><h2 style="font-size:16px;display:flex;align-items:center;gap:8px">' + Icon(s.icon, 17) + UI.esc(s.nom) + '</h2>' +
        '<span>' + (kcal ? UI.fmt.kcal(kcal) : '—') + '</span></div>' +
        (items.length
          ? '<div class="list">' + items.map(mealRow).join('') + '</div>'
          : '<button class="list rowitem" data-addslot="' + s.id + '" style="width:100%;border-radius:var(--r-md)">' +
              '<span class="ic">' + Icon('plus', 17) + '</span><span class="tx"><b class="muted" style="font-weight:600">Ajouter</b></span></button>') +
        '</div>';
    }).join('');
  }

  function mealRow(m) {
    const q = m.qty ? UI.fmt.n(m.qty) + ' ' + UI.esc(m.unit || 'g') : '';
    return '<div class="rowitem" data-meal="' + UI.attr(m.id) + '">' +
      '<span class="ic">' + Icon(m.src === 'ai' ? 'sparkle' : m.src === 'off' ? 'scan' : 'fork', 17) + '</span>' +
      '<span class="tx"><b>' + UI.esc(m.nom) + '</b><small>' + q + (m.brand ? ' · ' + UI.esc(m.brand) : '') + '</small></span>' +
      '<span class="rt tabnum">' + UI.fmt.n(m.kcal) + ' kcal</span></div>';
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
  function bind() {
    root.querySelectorAll('[data-day]').forEach((b) => b.onclick = () => {
      const n = +b.dataset.day;
      if (n > 0 && viewDay === UI.day.today()) return;
      viewDay = UI.day.add(viewDay, n); render();
    });
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
    const input = document.createElement('input');
    input.type = 'file'; input.accept = 'image/*'; input.capture = 'environment';
    input.onchange = async () => {
      const f = input.files && input.files[0];
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
    };
    input.click();
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
  function searchFlow(slot) {
    slot = slot || guessSlot();
    UI.openSheet(
      '<div class="mbody" style="padding-top:6px">' +
        '<h2 style="font-size:22px;margin-bottom:12px">Chercher un aliment</h2>' +
        '<label class="search" style="box-shadow:var(--sh-inset)">' + Icon('search', 17) +
        '<input type="search" data-q placeholder="Nom du produit ou code-barres" autocomplete="off"></label>' +
        '<div data-res style="margin-top:14px"></div>' +
      '</div>',
      { onMount: (s) => {
        const q = s.querySelector('[data-q]'), out = s.querySelector('[data-res]');
        setTimeout(() => q.focus(), 260);
        const run = UI.debounce(async () => {
          const v = q.value.trim();
          if (v.length < 2) { out.innerHTML = recentSuggestions(slot); bindPick(out, slot); return; }
          out.innerHTML = UI.thinking('Recherche…');
          const rows = await offSearch(v);
          if (!rows.length) {
            out.innerHTML = UI.empty('search', 'Aucun produit', 'Essaie un autre nom, ou passe par la saisie manuelle.') +
              '<button class="btn block" data-manual>' + Icon('plus', 16) + 'Saisie manuelle</button>';
            const b = out.querySelector('[data-manual]');
            if (b) b.onclick = () => { UI.closeSheet(); manualFlow(v, slot); };
            return;
          }
          out.innerHTML = '<div class="list">' + rows.map((r, i) =>
            '<button class="rowitem" data-pick=\'' + UI.attr(JSON.stringify(r)) + '\'>' +
              '<span class="ic">' + Icon('scan', 17) + '</span>' +
              '<span class="tx"><b>' + UI.esc(r.nom) + '</b><small>' + UI.esc(r.brand || '') + ' · ' + UI.fmt.n(r.kcal100) + ' kcal / 100 ' + r.base + '</small></span>' +
              '<span class="rt">' + Icon('next', 15) + '</span></button>').join('') + '</div>';
          bindPick(out, slot);
        }, 380);
        q.oninput = run;
        out.innerHTML = recentSuggestions(slot);
        bindPick(out, slot);
      } }
    );
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
      ? base + '/product/' + encodeURIComponent(q) + '?fields=product_name,product_name_fr,brands,nutriments,quantity,serving_quantity'
      : base + '/search?search_terms=' + encodeURIComponent(q) + '&countries_tags_en=france&page_size=14&fields=product_name,product_name_fr,brands,nutriments,quantity,serving_quantity';
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

  function codexFlow() {
    const favs = Codex.favorites();
    const drinks = (global.DRINKS || []).slice(0, 40);
    const rows = (favs.length ? favs : drinks.map((d) => ({ nom: d.nom, kcal: d.kcal })));
    UI.openSheet(
      '<div class="mbody" style="padding-top:6px"><h2 style="font-size:22px;margin-bottom:12px">Depuis le Codex</h2>' +
      '<div class="list">' + rows.map((r) =>
        '<button class="rowitem" data-c="' + UI.attr(r.nom) + '" data-k="' + (r.kcal || 0) + '">' +
        '<span class="ic">' + Icon('coffee', 17) + '</span><span class="tx"><b>' + UI.esc(r.nom) + '</b></span>' +
        '<span class="rt tabnum">' + (r.kcal ? UI.fmt.n(r.kcal) + ' kcal' : '') + '</span></button>').join('') + '</div></div>',
      { onMount: (s) => s.querySelectorAll('[data-c]').forEach((b) => b.onclick = () => { UI.closeSheet(); quickAdd({ nom: b.dataset.c, kcal: +b.dataset.k }); }) }
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
    if (!list.length) { UI.toast('Rien a analyser pour ce jour'); return; }
    const g = goals(), t = totals(list);

    const target = root.querySelector('[data-act="analyse"]');
    if (target) target.outerHTML = UI.thinking('Analyse de la journée…');

    const détail = SLOTS.map((s) => {
      const it = list.filter((m) => m.slot === s.id);
      if (!it.length) return null;
      return s.nom + ' : ' + it.map((m) => m.nom + ' (' + UI.fmt.n(m.qty) + ' ' + m.unit + ', ' + Math.round(m.kcal) + ' kcal, P ' + r1(m.prot) + ' G ' + r1(m.carb) + ' L ' + r1(m.fat) + ')').join(', ');
    }).filter(Boolean).join('\n');

    const prompt =
      "Tu es un nutritionniste francais, direct, sans flatterie. Analyse cette journée alimentaire.\n\n" +
      "OBJECTIFS : " + g.kcal + " kcal, " + g.prot + " g de protéines, " + g.carb + " g de glucides, " + g.fat + " g de lipides, " + g.fiber + " g de fibres.\n" +
      "REALISE : " + Math.round(t.kcal) + " kcal, " + r1(t.prot) + " g de protéines, " + r1(t.carb) + " g de glucides, " + r1(t.fat) + " g de lipides, " + r1(t.fiber) + " g de fibres, " + r1(t.sugar) + " g de sucrés, " + Math.round(t.sodium) + " mg de sodium.\n\n" +
      "DETAIL :\n" + détail + "\n\n" +
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
