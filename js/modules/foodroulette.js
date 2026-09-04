/* ============================================================
   EVER — Aliments : "Qu'est-ce qu'on mange ?"

   La liste appartient a l'utilisateur : tout est modifiable.
   Le résultat de la roue se consigne en un geste dans le journal
   d'Alimentation, et peut partir dans un fichier reimportable
   par MyFitnessPal.
   ============================================================ */
(function (global) {
  'use strict';

  let root = null, roul = null;
  const prefs = () => Object.assign({ cat: 'all', favOnly: false, listId: null }, Store.get('foodRoulPrefs', {}));
  const setPrefs = (p) => Store.set('foodRoulPrefs', Object.assign(prefs(), p));

  function pool() {
    const p = prefs();
    let list = Store.all('foods');
    if (p.cat !== 'all') list = list.filter((f) => f.cat === p.cat);
    if (p.favOnly) list = list.filter((f) => Store.isFav('food', f.id));
    return list;
  }

  function mount(el) { root = el; render(); }

  /* Les six familles, en photos. « Salé » sur une pastille grise
     ne dit rien ; une assiette de pates, si. */
  const PHOTO_CAT = {
    all: 'plate of food variety', sale: 'savoury dish plate', sucre: 'dessert sweet',
    boisson: 'fresh juice glass', alcool: 'cocktail glass bar', commander: 'takeaway delivery box'
  };

  function render() {
    const p = prefs(), list = pool();
    const cat = SEED.FOOD_CATS.find((c) => c.id === p.cat) || SEED.FOOD_CATS[0];

    root.innerHTML = '<div class="wrap">' +
      '<div class="section" style="padding:16px 0 0">' +
        '<div class="secbar">' +
          '<div><h2>Qu\'est-ce qu\'on mange ?</h2>' +
          '<small class="muted" style="display:block;margin-top:2px">' + list.length +
            ' idée' + (list.length > 1 ? 's' : '') +
            (p.cat === 'all' ? '' : ' en ' + UI.esc(cat.nom.toLowerCase())) +
            (p.favOnly ? ' · favoris' : '') + '</small></div>' +
          '<button class="rondgris" data-act="manage" aria-label="Gérer la liste">' + Icon('settings', 18) + '</button>' +
        '</div>' +
      '</div>' +

      /* Les familles, en cartes photo plutot qu'en puces grises. */
      '<div class="section" style="padding-top:0">' +
        '<div class="carrousel familles">' + SEED.FOOD_CATS.map((c) =>
          '<button class="cartefamille' + (p.cat === c.id ? ' on' : '') + '" data-cat="' + c.id + '">' +
            (global.Stock ? Stock.ic(PHOTO_CAT[c.id] || c.nom, { classe: 'fond', type: 'plat' }) : '') +
            '<span class="voile"></span><span class="tx">' + UI.esc(c.nom) + '</span>' +
          '</button>').join('') + '</div>' +
      '</div>' +

      Portes.section('', [
        { act: 'roue',     nom: 'Tourner',   sub: 'Le hasard choisit',  ph: 'hasard' },
        { act: 'ai',       nom: 'Choisis pour moi', sub: 'Selon mes macros', ph: 'chef cooking' },
        { act: 'three',    nom: 'Trois idées', sub: 'Puis la roue',     ph: 'surprise' },
        { act: 'add',      nom: 'Ajouter',   sub: 'Un aliment de plus', ph: 'grocery shelf food' },
        { act: 'share',    nom: 'Listes',    sub: 'Couple, famille',    ph: 'gens' },
        { act: 'favoris',  nom: p.favOnly ? 'Favoris' : 'Tout',
          sub: p.favOnly ? 'Filtré' : 'Sans filtre', ph: 'favoris' }
      ], { serre: true }) +
      '</div>';

    bind();
    if (global.Stock) Stock.peupler(root);
  }

  /* La roue vit dans sa pop-up : sur la page, elle poussait tout
     le reste vers le bas et il fallait defiler pour la voir. */
  function ouvrirRoue() {
    Portes.ouvrir('Tourner la roue', 'Elle tient compte de tes goûts et de l\'heure.',
      ['#B4472C', '#E8804F'], 'marmite', '<div id="foodRoul"></div>',
      { onMount: (sh) => monterRoue(sh.querySelector('#foodRoul')) });
  }

  /* La roue n'est plus posee sur la page : avant de l'utiliser,
     il faut donc s'assurer que sa pop-up est ouverte. */
  function avecRoue() {
    const deja = UI.$('#foodRoul');
    if (deja) return Promise.resolve(deja);
    return new Promise((res) => {
      Portes.ouvrir('Tourner la roue', 'Elle tient compte de tes goûts et de l\'heure.',
        ['#B4472C', '#E8804F'], 'marmite', '<div id="foodRoul"></div>',
        { onMount: (sh) => { const c = sh.querySelector('#foodRoul'); monterRoue(c); res(c); } });
    });
  }

  function monterRoue(cible) {
    roul = Roulette.mount(cible, {
      items: () => pool().map((f) => Object.assign({}, f, { label: f.nom, icon: catIcon(f.cat) })),
      weight: (f) => weightOf(f),
      cta: 'TOURNER',
      emptyText: 'Aucun aliment avec ces filtres',
      onResult: (f, box) => { box.innerHTML = card(f); bindCard(box, f); Store.log('aliment', { id: f.id, label: f.nom }); if (global.Game) Game.award('roulette', 5); }
    });
  }

  const catIcon = (c) => (SEED.FOOD_CATS.find((x) => x.id === c) || { icon: 'plate' }).icon;

  function weightOf(f) {
    let w = 50;
    if (Store.isFav('food', f.id)) w += 25;
    w += Reco.prefOf(f) * 15;
    const rec = Reco.recentMap('aliment', 21)[f.id];
    if (rec) { const days = (Date.now() - rec) / 86400e3; w *= 0.3 + 0.7 * Math.min(1, days / 21); }
    /* On evite l'alcool le matin, ce n'est pas de la morale, c'est du bon sens. */
    const h = new Date().getHours();
    if (f.cat === 'alcool' && h < 16) w *= 0.15;
    if (f.cat === 'sucre' && h < 10) w *= 0.6;
    return Math.max(1, w);
  }

  function card(f) {
    const isFav = Store.isFav('food', f.id);
    return '<div class="result"><div class="rbody">' +
      '<div class="rkick">' + UI.esc((SEED.FOOD_CATS.find((c) => c.id === f.cat) || {}).nom || '') + '</div>' +
      '<h3>' + UI.esc(f.nom) + '</h3>' +
      (f.note ? '<div class="rwhy">' + UI.esc(f.note) + '</div>' : '') +
      '<div class="ract">' +
        '<button class="btn sm primary" data-log>' + Icon('plus', 15) + 'Consigner</button>' +
        '<button class="btn sm" data-fav><span class="etoile' + (isFav ? ' on' : '') + '">' + Icon('star', 15) + '</span>' + (isFav ? 'Retirer' : 'Favori') + '</button>' +
        '<button class="btn sm ghost" data-like="0">Pas envie</button>' +
      '</div></div></div>';
  }

  function bindCard(box, f) {
    box.querySelector('[data-log]').onclick = () => logIt(f);
    box.querySelector('[data-fav]').onclick = (e) => {
      const on = Store.toggleFav('food', f.id);
      e.currentTarget.innerHTML = '<span class="etoile' + (on ? ' on' : '') + '">' + Icon('star', 15) + '</span>' + (on ? 'Retirer' : 'Favori');
      UI.haptic('light');
    };
    box.querySelector('[data-like]').onclick = () => { Reco.learn(f, false); UI.toast('On evitera'); };
  }

  /* Consigner : quantité simple, estimation IA des macros si absente. */
  async function logIt(f) {
    const res = await UI.promptSheet(f.nom, [
      { name: 'qty', label: 'Quantité', type: 'number', inputmode: 'decimal', value: 1 },
      { name: 'unit', label: 'Unité', type: 'select', value: 'portion', options: [
        { v: 'portion', n: 'portion' }, { v: 'g', n: 'grammes' }, { v: 'ml', n: 'millilitres' }, { v: 'pièce', n: 'pièce' } ] },
      { name: 'slot', label: 'Moment', type: 'select', value: guess(), options: Food.SLOTS.map((s) => ({ v: s.id, n: s.nom })) }
    ], 'Consigner');
    if (!res) return;

    let macros = { kcal: 0 };
    if (AI.available()) {
      try {
        UI.toast('Estimation…');
        macros = await AI.json(
          'Valeurs nutritionnelles réalistes pour : ' + f.nom + ', quantité ' + res.qty + ' ' + res.unit + '. Base de données francaise.',
          AI.T.obj({ kcal: AI.T.num(''), proteines: AI.T.num(''), glucides: AI.T.num(''), lipides: AI.T.num(''), fibres: AI.T.num(''), sucres: AI.T.num(''), sodium: AI.T.num('') }),
          { ttl: 30 * 86400e3 });
      } catch (e) {}
    }
    Food.addEntry({
      nom: f.nom, qty: Number(res.qty) || 1, unit: res.unit,
      kcal: macros.kcal || 0, prot: macros.proteines || 0, carb: macros.glucides || 0, fat: macros.lipides || 0,
      fiber: macros.fibres || 0, sugar: macros.sucres || 0, sodium: macros.sodium || 0,
      src: macros.kcal ? 'ai' : 'manual'
    }, res.slot);
    UI.toast('Consigné dans Alimentation');
  }
  const guess = () => { const h = new Date().getHours(); return h < 11 ? 'matin' : h < 15 ? 'midi' : h < 18 ? 'collation' : 'soir'; };

  function bind() {
    root.querySelectorAll('[data-cat]').forEach((b) => b.onclick = () => {
      UI.haptic('select'); setPrefs({ cat: b.dataset.cat }); render();
    });
    root.querySelectorAll('[data-act]').forEach((b) => b.onclick = () => acts[b.dataset.act] && acts[b.dataset.act]());
  }

  /* Surprends-moi : on ignore les filtres, on prend le contexte du
     moment (heure, ce qui a déjà été mangé aujourd'hui) et on lance. */
  async function surprise() {
    UI.haptic('launch');
    const all = Store.all('foods');
    if (!all.length) { UI.toast('Ta liste est vide'); return; }
    const t = global.Food ? Food.totals(Food.entries()) : { kcal: 0, prot: 0 };
    const g = global.Food ? Food.goals() : { kcal: 2400, prot: 150 };

    /* Pondération contextuelle : s'il manque des protéines, le salé
       remonte ; si le quota calorique est explosé, le sucré descend. */
    const w = (f) => {
      let x = weightOf(f);
      if (t.prot < g.prot * 0.6 && f.cat === 'sale') x *= 1.5;
      if (t.kcal > g.kcal * 0.9 && f.cat === 'sucre') x *= 0.4;
      return x;
    };
    const winner = Roulette.pick(all, { weight: w, sharpness: 2.2 });
    const hote = await avecRoue();
    const box = hote.querySelector('[data-result]');
    await Roulette.spin(hote.querySelector('.roulwin'),
      all.map((f) => Object.assign({}, f, { label: f.nom, icon: catIcon(f.cat) })),
      Object.assign({}, winner, { label: winner.nom, icon: catIcon(winner.cat) }), 2200);

    const bits = [];
    bits.push(new Date().getHours() + ' h');
    if (t.kcal) bits.push(Math.round(t.kcal) + ' kcal déjà consignées');
    if (t.prot < g.prot * 0.6) bits.push('il te manque des protéines');
    box.innerHTML = card(winner).replace('</h3>', '</h3><div class="rwhy" style="margin-top:10px"><b>Pourquoi ? </b>' + UI.esc(bits.join(', ')) + '.</div>');
    bindCard(box, winner);
    Store.log('aliment', { id: winner.id, label: winner.nom });
    box.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function threeIdeas() {
    const all = pool();
    if (all.length < 3) { UI.toast('Pas assez d\'aliments pour trois idées'); return; }
    const picks = Roulette.pickMany(all, 3, { weight: weightOf, sharpness: 2 });
    UI.openSheet(
      '<div class="mbody" style="padding-top:6px">' +
        '<h2 style="font-size:22px;margin-bottom:4px">Trois idées</h2>' +
        '<p class="secdesc">Choisis, ou laisse la roue trancher.</p>' +
        '<div class="list">' + picks.map((f, i) =>
          '<button class="rowitem" data-i="' + i + '"><span class="ic">' + Icon(catIcon(f.cat), 17) + '</span>' +
          '<span class="tx"><b>' + UI.esc(f.nom) + '</b><small>' +
          UI.esc((SEED.FOOD_CATS.find((c) => c.id === f.cat) || {}).nom || '') + '</small></span>' +
          '<span class="rt">' + Icon('next', 15) + '</span></button>').join('') + '</div>' +
        '<button class="btn primary block lg" style="margin-top:14px" data-wheel>' + Icon('dice', 17) + 'Laisser la roue décider</button>' +
      '</div>',
      { onMount: (s) => {
        const show = async (f, why) => {
          const hote = await avecRoue();
          const box = hote.querySelector('[data-result]');
          box.innerHTML = card(f).replace('</h3>', '</h3><div class="rwhy" style="margin-top:10px"><b>Pourquoi ? </b>' + UI.esc(why) + '</div>');
          bindCard(box, f);
          Store.log('aliment', { id: f.id, label: f.nom });
          box.scrollIntoView({ behavior: 'smooth', block: 'center' });
        };
        s.querySelectorAll('[data-i]').forEach((b) => b.onclick = () => {
          UI.closeSheet(); show(picks[+b.dataset.i], 'tu l\'as choisi parmi trois.');
        });
        s.querySelector('[data-wheel]').onclick = async () => {
          UI.closeSheet();
          const winner = Roulette.pick(picks, { weight: weightOf });
          await Roulette.spin(UI.$('#foodRoul').querySelector('.roulwin'),
            picks.map((f) => Object.assign({}, f, { label: f.nom, icon: catIcon(f.cat) })),
            Object.assign({}, winner, { label: winner.nom, icon: catIcon(winner.cat) }), 2000);
          show(winner, 'la roue a tranché entre trois idées.');
        };
      } }
    );
  }

  const acts = {
    roue: () => ouvrirRoue(),
    favoris: () => { setPrefs({ favOnly: !prefs().favOnly }); UI.haptic('toggle'); render(); },
    manage: () => manage(),
    surprise: () => surprise(),
    three: () => threeIdeas(),
    add: () => addFood(),
    ai: () => aiPick(),
    share: () => Lists.open('foods')
  };

  function manage() {
    const list = Store.all('foods');
    UI.openSheet('<div class="mbody" style="padding-top:6px">' +
      '<h2 style="font-size:22px;margin-bottom:12px">Ma liste</h2>' +
      '<div class="list">' + list.map((f) =>
        '<div class="rowitem"><span class="ic">' + Icon(catIcon(f.cat), 17) + '</span>' +
        '<span class="tx"><b>' + UI.esc(f.nom) + '</b><small>' + UI.esc((SEED.FOOD_CATS.find((c) => c.id === f.cat) || {}).nom || '') + '</small></span>' +
        '<button class="rt" data-rm="' + UI.attr(f.id) + '">' + Icon('trash', 16) + '</button></div>').join('') + '</div></div>', {
      onMount: (s) => s.querySelectorAll('[data-rm]').forEach((b) => b.onclick = () => {
        Store.del('foods', b.dataset.rm); b.closest('.rowitem').remove(); render();
      })
    });
  }

  async function addFood() {
    const res = await UI.promptSheet('Nouvel aliment', [
      { name: 'nom', label: 'Nom' },
      { name: 'cat', label: 'Catégorie', type: 'select', value: 'sale', options: SEED.FOOD_CATS.filter((c) => c.id !== 'all').map((c) => ({ v: c.id, n: c.nom })) },
      { name: 'note', label: 'Note (facultatif)', placeholder: 'Chez le traiteur du marche' }
    ], 'Ajouter');
    if (!res || !res.nom) return;
    Store.add('foods', { nom: res.nom, cat: res.cat, note: res.note, source: 'user' });
    UI.toast('Ajoute'); render();
  }

  async function aiPick() {
    if (!AI.available()) { UI.toast('Ajoute ta clé Gemini dans Réglages'); return App.go('#/m/settings/ia'); }
    const g = Food.goals(), t = Food.totals(Food.entries());
    const list = pool().map((f) => f.nom).slice(0, 120);
    UI.openSheet('<div class="mbody">' + UI.thinking('Je regarde ta journée…') + '</div>');
    try {
      const res = await AI.json(
        "Choisis dans cette liste ce qui va le mieux maintenant.\n\n" +
        "LISTE : " + list.join(' | ') + "\n\n" +
        "Déjà mange aujourd'hui : " + Math.round(t.kcal) + " kcal sur " + g.kcal + ", " + Math.round(t.prot) + " g de protéines sur " + g.prot + ".\n" +
        "Heure : " + new Date().getHours() + " h.\n\n" +
        "Choisis exactement un aliment de la liste, et explique en une phrase, sans flatterie.",
        AI.T.obj({ choix: AI.T.str('Nom exact repris de la liste'), pourquoi: AI.T.str('Une phrase') }),
        { cache: false, temperature: 0.8 });
      const found = pool().find((f) => f.nom.toLowerCase() === String(res.choix).toLowerCase()) || pool()[0];
      UI.closeSheet();
      const box = UI.$('#foodRoul').querySelector('[data-result]');
      box.innerHTML = card(found).replace('</h3>', '</h3><div class="rwhy" style="margin-top:10px"><b>Pourquoi ? </b>' + UI.esc(res.pourquoi) + '</div>');
      bindCard(box, found);
      box.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } catch (e) { UI.closeSheet(); UI.toast(AI.humanError(e)); }
  }

  App.register('foods', { mount: mount });
  global.FoodRoulette = { mount };
})(window);
