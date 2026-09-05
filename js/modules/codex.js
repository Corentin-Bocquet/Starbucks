/* ============================================================
   EVER — Codex : Cafe, Bar, Recettes

   Reprise du moteur d'origine (assistant en trois étapes, fiches,
   stock, favoris, export) avec quatre changements :

   1. Le heros n'ecrase plus l'image. Le texte a desormais sa
      propre zone, au-dessus de la photo, et le haut de l'image se
      fond dans la couleur du bloc. Aucune superposition n'est plus
      possible, quelle que soit la largeur de l'ecran : c'etait le
      bug le plus visible sur iPhone, sur les trois onglets.
   2. Les trois onglets s'appellent Cafe, Bar et Recettes.
   3. L'état passe par Store, donc il se synchronise avec le compte.
   4. Les emoji de l'interface sont remplaces par des icones ;
      ceux des données d'origine sont conserves tels quels.
   ============================================================ */
(function (global) {
  'use strict';

  const TABKEY = { sb: 'cafe', ck: 'bar', mm: 'recettes' };
  const allKeys = (t) => STOCKDEF[t].map((b) => b.k);

  const S = {
    tab: 'sb', q: '', size: 'g', all: false, step: 0,
    fav: new Set(), stock: { sb: new Set(), ck: new Set(), mm: new Set() },
    wiz: { sb: [null, null, null], ck: [null, null, null], mm: [null, null, null] },
    cat: { sb: 'all', ck: 'all', mm: 'all' }
  };

  function loadState() {
    S.fav = new Set(Store.get('codexFav', []));
    ['sb', 'ck', 'mm'].forEach((t) => {
      const v = Store.get('codexStock_' + t, null);
      S.stock[t] = new Set(v === null ? allKeys(t) : v);
    });
    S.size = Store.get('codexSize', 'g');
  }
  const saveFav = () => Store.set('codexFav', Array.from(S.fav));
  const saveStock = (t) => Store.set('codexStock_' + (t || S.tab), Array.from(S.stock[t || S.tab]));

  /* ============================================================
     Mes creations

     Chaque onglet peut fabriquer ses propres fiches avec l'IA :
     une boisson dans Cafe, un cocktail dans Bar, un plat dans
     Recettes. Elles sont rangees avec les autres, au meme format,
     et se retrouvent partout : recherche, categories, favoris,
     journal alimentaire.

     Point important : l'IA ne travaille pas dans le vide. On lui
     donne le stock coche par l'utilisateur, donc elle propose ce
     qui est faisable ce soir, pas une recette a faire les courses.
     ============================================================ */
  const creations = (t) => Store.all('creations').filter((c) => c.tab === (t || S.tab));
  const ALL = (t) => creations(t).concat(DATA[t] ? DATA[t]() : []);
  const estCreation = (d) => !!(d && d.cree);

  /* Vignette de remplacement : une creation n'a pas de photo, mais
     une liste d'images ne doit pas avoir de trou. */
  const TEINTE = { sb: ['#0E6E4B', '#31A876'], ck: ['#6B2A4E', '#AE4A80'], mm: ['#A8542A', '#D08A4E'] };
  function vignetteCreation(d, tab) {
    const g = TEINTE[tab || S.tab] || TEINTE.sb;
    /* Si l'image du plat a ete fabriquee, elle prend la place du
       degrade : une carte avec sa photo vaut mieux qu'un aplat. */
    return '<div class="ph creation" style="--g1:' + g[0] + ';--g2:' + g[1] + '">' +
      Imagerie.vignette('plat', d.visuel || d.nom, { cle: Imagerie.cleDe('plat', d.nom), classe: 'large fondu' }) +
      '<span>' + Icon(tab === 'ck' || S.tab === 'ck' ? 'glass' : (tab === 'mm' || S.tab === 'mm') ? 'pot' : 'coffee', 30) + '</span>' +
      '<b>' + UI.esc(d.nom) + '</b></div>';
  }

  /* ---------- Stock ---------- */
  const missing = (d, t) => (d.sk || []).filter((k) => !S.stock[t].has(k));
  const doable = (d, t) => missing(d, t).length === 0;

  /* ---------- Filtrage ---------- */
  function passes(d, depth) {
    const steps = WIZ[S.tab];
    for (let i = 0; i < depth; i++) {
      const st = steps[i], v = S.wiz[S.tab][i];
      if (v === null || v === undefined) continue;
      if (st.key === '__stock') { if (v === 'oui' && !doable(d, S.tab)) return false; }
      else if (d[st.key] !== v) return false;
    }
    return true;
  }
  function results() {
    const all = ALL(S.tab);
    for (let depth = 3; depth >= 1; depth--) {
      const r = all.filter((d) => passes(d, depth));
      if (r.length >= 3 || depth === 1) return { list: r, depth: depth };
    }
    return { list: all, depth: 0 };
  }
  function searchable(d) {
    const base = d.nom + ' ' + d.desc + ' ' + (d.tag || []).join(' ') + ' ' + d.ing.map((i) => i.n).join(' ');
    return S.tab === 'ck' ? base + ' ' + d.verre + ' ' + d.tech : base;
  }
  function searchHits() {
    const w = S.q.toLowerCase().split(' ').filter(Boolean);
    return ALL(S.tab).filter((d) => { const s = searchable(d).toLowerCase(); return w.every((x) => s.indexOf(x) >= 0); });
  }

  /* ---------- Cartes ---------- */
  const KEY = (d) => S.tab + ':' + d.id;
  const favBtn = (k) => '<button class="fav ' + (S.fav.has(k) ? 'on' : '') + '" data-fav="' + UI.attr(k) + '" aria-label="Favori">' + Icon('star', 18) + '</button>';

  function card(d) {
    const k = KEY(d), ms = missing(d, S.tab);
    const stockBadge = estCreation(d) ? '<span class="badge sec">Ma création</span>'
      : ms.length ? '<span class="badge miss">Il manque ' + ms.length + '</span>' : '';
    if (S.tab === 'sb') return '<div class="card" data-id="' + UI.attr(d.id) + '">' +
      (BADGE[d.statut] ? '<span class="badge ' + (BCLS[d.statut] || '') + '">' + BADGE[d.statut] + '</span>' : stockBadge) +
      favBtn(k) +
      (estCreation(d) ? vignetteCreation(d, 'sb') : '<div class="ph"><img loading="lazy" src="' + IMG[d.id] + '" alt=""></div>') +
      '<div class="bd"><h3>' + UI.esc(d.nom) + '</h3>' +
      '<div class="tags">' + d.tag.slice(0, 2).map((t, i) => '<span class="tg ' + (i ? 'b' : '') + '">' + UI.esc(t) + '</span>').join('') + '</div>' +
      '<div class="meta"><span><b>' + d.kcal + '</b> kcal</span><span><b>' + d.caf + '</b> mg caf.</span></div></div></div>';

    if (S.tab === 'ck') return '<div class="card" data-id="' + UI.attr(d.id) + '">' +
      (ms.length ? stockBadge : '<span class="badge ok">Réalisable</span>') + favBtn(k) +
      (estCreation(d) ? vignetteCreation(d, 'ck') : '<div class="ph"><img loading="lazy" src="' + IMG['ck-' + d.id] + '" alt=""></div>') +
      '<div class="bd"><h3>' + d.ico + ' ' + UI.esc(d.nom) + '</h3>' +
      '<div class="tags">' + d.tag.slice(0, 2).map((t, i) => '<span class="tg ' + (i ? 'b' : '') + '">' + UI.esc(t) + '</span>').join('') + '</div>' +
      '<div class="meta"><span><b>' + UI.esc(d.abv) + '</b> d\'alcool</span><span><b>' + UI.esc(d.temps) + '</b></span></div></div></div>';

    return '<div class="card wide" data-id="' + UI.attr(d.id) + '">' + stockBadge + favBtn(k) +
      (estCreation(d) ? vignetteCreation(d, 'mm') : '<div class="ph"><img loading="lazy" src="' + IMG['mm-' + (d.img || 'crepes-bocuse')] + '" alt=""></div>') +
      '<div class="bd"><h3>' + d.emoji + ' ' + UI.esc(d.nom) + '</h3>' +
      '<div class="tags">' + d.tag.slice(0, 2).map((t, i) => '<span class="tg ' + (i ? 'b' : '') + '">' + UI.esc(t) + '</span>').join('') + '</div>' +
      '<div class="meta"><span><b>' + UI.esc(d.temps) + '</b></span><span><b>' + d.ing.length + '</b> ingr.</span></div></div></div>';
  }

  function bindCards(el) {
    el.querySelectorAll('.card').forEach((c) => {
      c.onclick = (e) => { if (e.target.closest('[data-fav]')) return; openIt(c.dataset.id); };
    });
    el.querySelectorAll('[data-fav]').forEach((b) => {
      b.onclick = (e) => {
        e.stopPropagation();
        const k = b.dataset.fav;
        const on = !S.fav.has(k);
        on ? S.fav.add(k) : S.fav.delete(k);
        saveFav(); UI.haptic('light');
        b.classList.toggle('on', on);
        UI.toast(on ? 'Ajouté aux favoris' : 'Retiré des favoris');
        if (on && global.Game) Game.award('favori', 5);
      };
    });
  }

  /* ---------- Heros ---------- */
  /* ============================================================
     L'appel a creer

     Le bouton de creation etait une pastille a cote de la barre de
     recherche : minuscule, sans libelle, on ne le voyait pas et il
     ne donnait pas envie. Il devient une grande carte posee sous
     le carrousel, avec son illustration et sa promesse.
     ============================================================ */
  const CREER = {
    sb: ['Inventer une boisson', 'Dis ton envie, l\'IA compose la recette', 'tasse', ['#0E6E4B', '#31A876']],
    ck: ['Inventer un cocktail', 'Avec ce que tu as sous la main',        'verre', ['#6B2A4E', '#AE4A80']],
    mm: ['Inventer un plat',     'Trois idées, tu choisis',               'marmite', ['#8A4B1E', '#C98A4A']]
  };

  function boutonCreer() {
    const c = CREER[S.tab] || CREER.mm;
    return '<div class="section">' +
      '<button class="appel" data-creer style="--a1:' + c[3][0] + ';--a2:' + c[3][1] + '">' +
        (global.Art ? '<span class="ill">' + Anime.art(c[2], 56) + '</span>' : '') +
        '<span class="tx"><b>' + UI.esc(c[0]) + '</b><small>' + UI.esc(c[1]) + '</small></span>' +
        '<span class="go">' + Icon('sparkle', 22) + '</span>' +
      '</button></div>';
  }

  function bindCreer(el) {
    el.querySelectorAll('[data-creer]').forEach((b) => b.onclick = () => createFlow());
  }

  function renderHero() {
    const h = HERO[S.tab];
    UI.$('#codexHero').innerHTML =
      '<div class="hero-in">' +
        '<div class="eyebrow">' + Icon(S.tab === 'sb' ? 'coffee' : S.tab === 'ck' ? 'glass' : 'pot', 13) + UI.esc(h.eye) + '</div>' +
        '<h1>' + UI.esc(h.t) + '</h1>' +
        '<p>' + UI.esc(h.p) + '</p>' +
        '<div class="herostats">' + h.stats.map((s) => '<div><b>' + UI.esc(s[0]) + '</b><span>' + UI.esc(s[1]) + '</span></div>').join('') + '</div>' +
      '</div>' +
      '<div class="hero-media"><img src="' + h.img + '" alt=""></div>';
  }

  /* ---------- Rendu ---------- */
  function render() {
    const app = UI.$('#codexApp');
    UI.$('#codexSizes').classList.toggle('hide', S.tab !== 'sb');
    UI.$('#codexAll').classList.toggle('on', S.all);
    UI.$('#codexQ').placeholder =
      S.tab === 'sb' ? 'Chercher une boisson…' : S.tab === 'ck' ? 'Chercher un cocktail, un alcool…' : 'Chercher une recette…';

    if (S.q) {
      const l = searchHits();
      app.innerHTML = '<div class="section"><div class="sechead"><h2>Recherche</h2><span>' + l.length + ' résultat' + (l.length > 1 ? 's' : '') + '</span></div>' +
        (l.length ? '<div class="rail" style="margin-top:14px">' + l.map(card).join('') + '</div>'
                  : UI.empty('search', 'Rien trouvé', "Essaie un ingrédient, un nom d'alcool, ou vide la barre.")) +
        '</div>' + boutonCreer();
      bindCards(app); bindCreer(app); Imagerie.peupler(app, { generer: false }); renderFoot(); return;
    }

    if (S.all) {
      app.innerHTML = allView(); bindCards(app); bindCreer(app); Imagerie.peupler(app, { generer: false });
      app.querySelectorAll('[data-c]').forEach((b) => b.onclick = () => { S.cat[S.tab] = b.dataset.c; render(); });
      renderFoot(); return;
    }

    app.innerHTML = wizView();
    bindCards(app); bindWiz(); bindCreer(app); renderFoot();
    Imagerie.peupler(app, { generer: false });
  }

  function allView() {
    const all = ALL(S.tab), c = S.cat[S.tab];
    const list = c === 'all' ? all : all.filter((d) => d.cat === c);
    let chips = '<button class="chip ' + (c === 'all' ? 'on' : '') + '" data-c="all">Tout <span class="n">' + all.length + '</span></button>';
    CATLIST[S.tab]().forEach((x) => {
      const n = all.filter((d) => d.cat === x.id).length;
      chips += '<button class="chip ' + (c === x.id ? 'on' : '') + '" data-c="' + UI.attr(x.id) + '">' + x.ico + ' ' + UI.esc(x.nom) + ' <span class="n">' + n + '</span></button>';
    });
    /* Une categorie = un carrousel. Sur telephone on voit une carte
       en grand, la suivante deborde a peine ; sur grand ecran la
       carte grandit avec la fenetre au lieu de laisser du vide a
       droite. Avant, c'etait une grille de vignettes de deux cent
       dix pixels : minuscules sur ordinateur, illisibles. */
    let body = '';
    if (c === 'all') {
      CATLIST[S.tab]().forEach((x) => {
        const s = all.filter((d) => d.cat === x.id); if (!s.length) return;
        body += '<div class="section"><div class="sechead"><h2>' + x.ico + ' ' + UI.esc(x.nom) + '</h2><span>' + s.length + '</span></div>' +
          '<p class="secdesc">' + UI.esc(x.desc) + '</p>' +
          '<div class="rail">' + s.map(card).join('') + '</div></div>';
      });
    } else {
      body = '<div class="section"><div class="sechead"><h2>' + CATOBJ[c].ico + ' ' + UI.esc(CATNAME[c]) + '</h2><span>' + list.length + '</span></div>' +
        '<p class="secdesc">' + UI.esc(CATOBJ[c].desc) + '</p>' +
        '<div class="rail">' + list.map(card).join('') + '</div></div>';
    }
    return '<div style="padding-top:16px"><div class="chips">' + chips + '</div></div>' + body + boutonCreer();
  }

  function countFor(idx, val) {
    const save = S.wiz[S.tab][idx];
    S.wiz[S.tab][idx] = val;
    const n = ALL(S.tab).filter((d) => passes(d, idx + 1)).length;
    S.wiz[S.tab][idx] = save;
    return n;
  }

  function wizView() {
    const steps = WIZ[S.tab], chosen = S.wiz[S.tab];
    let crumbs = '';
    steps.forEach((st, i) => {
      if (i < S.step) {
        const o = st.opts.find((o) => o.v === chosen[i]);
        crumbs += '<button class="crumb" data-goto="' + i + '">' + UI.esc(st.q.replace(/\s*\?.*/, '')) + ' · <b>' + UI.esc(o ? o.n : 'Peu importé') + '</b></button>';
      } else if (i === S.step) crumbs += '<span class="crumb step">Étape ' + (i + 1) + '</span>';
      else crumbs += '<span class="crumb ghost">' + (i + 1) + '</span>';
    });

    if (S.step < steps.length) {
      const st = steps[S.step], pal = CARDCOL[S.tab];
      const cards = st.opts.map((o, i) => {
        const col = pal[i % pal.length];
        const n = countFor(S.step, o.v);
        return '<button class="opt ' + (chosen[S.step] === o.v ? 'sel' : '') + '" data-v="' + UI.attr(o.v === null ? '' : o.v) + '" data-null="' + (o.v === null ? 1 : 0) + '"' +
          ' style="background:' + col[0] + ';color:' + col[1] + '">' +
          '<span class="disc" style="background:' + col[1] + '"></span>' +
          '<img class="im" src="' + IMG[o.img] + '" alt="">' +
          '<span class="nm">' + UI.esc(o.n) + '</span><span class="sb">' + UI.esc(o.s) + '</span>' +
          '<span class="cnt">' + n + ' ' + (n > 1 ? 'recettes' : 'recette') + '</span></button>';
      }).join('');
      return '<div class="wiz"><div class="crumbs">' + crumbs + '</div>' +
        '<div class="wizhead"><div class="num">Étape ' + (S.step + 1) + ' sur ' + steps.length + '</div><h2>' + UI.esc(st.q) + '</h2><p>' + UI.esc(st.sub) + '</p></div>' +
        '<div class="trackwrap"><div class="track" id="codexTrack">' + cards + '</div>' +
        '<div class="arrows"><button data-ar="-1">' + Icon('back', 17) + '</button><button data-ar="1">' + Icon('next', 17) + '</button></div></div>' +
        '<div class="wizact">' + (S.step > 0 ? '<button class="btn sm" data-back="1">' + Icon('back', 15) + 'Revenir</button>' : '') +
        '<button class="btn sm" data-skip="1">Passer cette étape</button></div></div>';
    }

    const r = results();
    const shown = r.list.slice(0, 8);
    const relax = r.depth < 3 ? '<div class="note">Aucune combinaison exacte avec les trois criteres. On a relache ' + (3 - r.depth === 1 ? 'le dernier critere' : 'les deux derniers criteres') + ' pour te proposer quand même quelque chose.</div>' : '';
    const more = r.list.length > 8 ? '<p class="secdesc">' + (r.list.length - 8) + ' autre' + (r.list.length - 8 > 1 ? 's' : '') + ' correspondent aussi, affine ou ouvre la liste complète.</p>' : '';
    return '<div class="wiz"><div class="crumbs">' + crumbs + '<button class="crumb ghost" data-reset="1">recommencer</button></div>' +
      '<div class="wizhead"><div class="num">Résultat</div><h2>' + shown.length + ' propositions pour toi</h2>' +
      '<p>' + (S.tab === 'ck' ? 'Le badge indique si ton bar suffit.' : 'Classees par pertinence.') + '</p></div>' +
      relax + more + '<div class="rail">' + shown.map(card).join('') + '</div>' +
      '<div class="wizact" style="margin-top:18px"><button class="btn sm" data-back="1">' + Icon('back', 15) + 'Changer le dernier choix</button>' +
      '<button class="btn sm primary" data-reset="1">Recommencer</button></div>' +
      boutonCreer() + '</div>';
  }

  function bindWiz() {
    const app = UI.$('#codexApp');
    app.querySelectorAll('[data-v]').forEach((b) => b.onclick = () => {
      S.wiz[S.tab][S.step] = b.dataset.null === '1' ? null : b.dataset.v;
      S.step++; UI.haptic('light'); render();
      const bar = UI.$('#codexBar');
      if (bar) window.scrollTo({ top: bar.offsetTop - 1, behavior: 'smooth' });
    });
    app.querySelectorAll('[data-back]').forEach((b) => b.onclick = () => { S.step = Math.max(0, S.step - 1); render(); });
    app.querySelectorAll('[data-skip]').forEach((b) => b.onclick = () => { S.wiz[S.tab][S.step] = null; S.step++; render(); });
    app.querySelectorAll('[data-goto]').forEach((b) => b.onclick = () => { S.step = +b.dataset.goto; render(); });
    app.querySelectorAll('[data-reset]').forEach((b) => b.onclick = () => { S.wiz[S.tab] = [null, null, null]; S.step = 0; render(); });

    const tr = UI.$('#codexTrack');
    if (tr) {
      const mark = () => {
        const c = tr.scrollLeft + tr.clientWidth / 2;
        let best = null, bd = 1e9;
        Array.from(tr.children).forEach((el) => { const d = Math.abs(el.offsetLeft + el.offsetWidth / 2 - c); if (d < bd) { bd = d; best = el; } });
        Array.from(tr.children).forEach((el) => el.classList.toggle('mid', el === best));
      };
      tr.addEventListener('scroll', () => { clearTimeout(tr._t); tr._t = setTimeout(mark, 40); }, { passive: true });
      mark();
      app.querySelectorAll('[data-ar]').forEach((b) => b.onclick = () => tr.scrollBy({ left: +b.dataset.ar * 210, behavior: 'smooth' }));
    }
  }

  /* Deux mots de vocabulaire de bar. Personne n'a besoin de les
     connaitre pour boire le cocktail, donc ils vivent derriere un
     point d'interrogation et pas dans la fiche. */
  const VERRES =
    "Highball : le grand verre droit, celui des sodas.\n" +
    "Old fashioned : le verre bas et large, pour boire sur un gros glaçon.\n" +
    "Coupe et verre à martini : les verres à pied, servis sans glace.\n" +
    "Hurricane et tiki : les grands verres galbés des cocktails exotiques.\n" +
    "Rien de tout ça sous la main ? N'importe quel verre fait l'affaire, le goût ne change pas.";
  const TECHS =
    "Shaké : on secoue au shaker avec des glaçons, puis on filtre.\n" +
    "Remué : on tourne à la cuillère, sans secouer, pour garder le liquide limpide.\n" +
    "Construit : on verse les ingrédients directement dans le verre, dans l'ordre.\n" +
    "Pilé : on écrase d'abord les herbes ou les fruits au fond du verre.\n" +
    "Blendé : on passe le tout au blender avec de la glace.";

  /* Le pied de page ne raconte plus rien : ces précisions sont
     vraies mais ne changent rien à ce qu'on fait. Elles attendent
     derrière un point d'interrogation. */
  const FOOT = {
    sb: ["D'où viennent ces recettes",
      "Starbucks ne publie pas ses recettes. Les quantités viennent de baristas et de reconstitutions qui donnent toutes les mêmes chiffres.\nLes calories correspondent à un format Grande au lait entier."],
    ck: ['À propos des cocktails',
      "Les doses suivent la référence internationale des barmans quand elle existe. Le Coco est une invention maison.\nL'abus d'alcool est dangereux pour la santé."],
    mm: ['À propos de ces recettes',
      'Ce sont les recettes de famille, reprises telles quelles depuis Notion, photos comprises.']
  };
  function renderFoot() {
    const f = FOOT[S.tab];
    UI.$('#codexFoot').innerHTML = f
      ? '<button type="button" class="footnote" data-hint="' + UI.attr(f[1]) + '" data-hint-t="' + UI.attr(f[0]) + '">' +
          '<span class="q">?</span>' + UI.esc(f[0]) + '</button>'
      : '';
  }

  /* ============================================================
     Creer avec l'IA

     Meme moteur pour les trois onglets, seul le schema change.
     L'IA recoit le stock coche : elle propose donc quelque chose
     de faisable maintenant, pas une recette a aller acheter.
     ============================================================ */
  const bandeauCreation = (d, tab) => {
    const g = TEINTE[tab] || TEINTE.sb;
    return '<div class="mimg creation" style="--g1:' + g[0] + ';--g2:' + g[1] + '">' +
      Imagerie.vignette('plat', d.visuel || d.nom, { cle: Imagerie.cleDe('plat', d.nom), classe: 'large fondu' }) +
      '<div>' + Icon(tab === 'ck' ? 'glass' : tab === 'mm' ? 'pot' : 'coffee', 40) +
      '<b>' + UI.esc(d.nom) + '</b><small>Créé avec l\'IA</small></div></div>';
  };

  const ING = () => AI.T.arr(AI.T.obj({
    n: AI.T.str('Nom de l ingredient'),
    q: AI.T.str('Quantite precise, avec l unite')
  }), 'Tous les ingredients, avec les quantites');

  const SCHEMAS = {
    sb: () => AI.T.obj({
      nom: AI.T.str('Nom court et appetissant, en francais'),
      desc: AI.T.str('Deux phrases simples : le gout et pour qui c est'),
      cat: AI.T.str('Un identifiant parmi : ' + CATS.map((c) => c.id).join(', ')),
      tag: AI.T.arr(AI.T.str(''), 'Deux mots-cles courts'),
      kcal: AI.T.int('Calories estimees pour un format Grande'),
      caf: AI.T.int('Milligrammes de cafeine, 0 si sans cafe'),
      temp2: AI.T.str('chaud, glace ou mixe'),
      ing: ING(),
      steps: AI.T.arr(AI.T.str(''), 'Les etapes dans l ordre, une phrase chacune'),
      eletta: AI.T.str('Comment faire avec une machine a cafe automatique'),
      astuce: AI.T.str('Le detail qui change tout, une phrase')
    }, ['nom', 'desc', 'cat', 'tag', 'kcal', 'ing', 'steps']),
    ck: () => AI.T.obj({
      nom: AI.T.str('Nom court du cocktail, en francais'),
      desc: AI.T.str('Deux phrases simples : le gout et le moment'),
      cat: AI.T.str('Un identifiant parmi : ' + CKCATS.map((c) => c.id).join(', ')),
      tag: AI.T.arr(AI.T.str(''), 'Deux mots-cles courts'),
      verre: AI.T.str('Type de verre'),
      tech: AI.T.str('Shake, remue, construit, pile ou blende'),
      abv: AI.T.str('Degre estime, par exemple 14 %'),
      temps: AI.T.str('Temps de preparation, par exemple 4 min'),
      ing: ING(),
      steps: AI.T.arr(AI.T.str(''), 'Les etapes dans l ordre'),
      astuce: AI.T.str('Le detail qui change tout')
    }, ['nom', 'desc', 'cat', 'tag', 'ing', 'steps']),
    mm: () => AI.T.obj({
      nom: AI.T.str('Nom du plat, en francais'),
      desc: AI.T.str('Deux phrases simples'),
      cat: AI.T.str('Un identifiant parmi : ' + MMCATS.map((c) => c.id).join(', ')),
      tag: AI.T.arr(AI.T.str(''), 'Deux mots-cles courts'),
      temps: AI.T.str('Temps total, par exemple 35 min'),
      portions: AI.T.str('Pour combien de personnes'),
      four: AI.T.str('Temperature et duree du four, ou « sans four »'),
      serv: AI.T.str('chaud ou froid'),
      ing: ING(),
      materiel: AI.T.arr(AI.T.str(''), 'Le materiel indispensable'),
      steps: AI.T.arr(AI.T.str(''), 'Les etapes dans l ordre'),
      astuce: AI.T.str('Le conseil qui evite de rater')
    }, ['nom', 'desc', 'cat', 'tag', 'ing', 'steps'])
  };

  const ENVIES = {
    sb: ['Doux et crémeux', 'Bien caféiné', 'Glacé', 'Sans café', 'Peu sucré', 'De saison'],
    ck: ['Frais', 'Fort', 'Sans alcool', 'Sucré', 'Amer', 'Pétillant'],
    mm: ['Rapide', 'Réconfortant', 'Léger', 'Pour recevoir', 'Sucré', "Avec ce que j'ai"]
  };
  const TITRE_CREER = { sb: 'Inventer une boisson', ck: 'Inventer un cocktail', mm: 'Inventer un plat' };

  function createFlow() {
    if (!AI.available()) { UI.toast('Ajoute ta clé Gemini dans Réglages'); App.go('#/m/settings/ia'); return; }
    const tab = S.tab;
    const envies = ENVIES[tab];

    UI.openSheet(
      Portes.tete(TITRE_CREER[tab], 'Dis ce dont tu as envie.',
        tab === 'ck' ? ['#6B2A4E', '#AE4A80'] : (tab === 'sb' ? ['#0E6E4B', '#31A876'] : ['#8A4B1E', '#C98A4A']),
        tab === 'ck' ? 'verre' : (tab === 'sb' ? 'tasse' : 'marmite')) +
      '<div class="mbody form-visuel">' +
        '<div class="chips" style="margin-bottom:12px">' +
          envies.map((e) => '<button class="chip" data-envie="' + UI.attr(e) + '">' + UI.esc(e) + '</button>').join('') +
        '</div>' +
        '<div class="champ"><span class="lb">Ton envie</span>' +
          '<input type="text" data-envietxt placeholder="' + (tab === 'mm' ? 'Un truc chaud pour ce soir' : tab === 'ck' ? 'Quelque chose de frais' : 'Un latte gourmand') + '"></div>' +
        '<label class="rowitem" style="margin-top:10px;background:var(--surface);border-radius:var(--r-md);box-shadow:var(--sh-inset)">' +
          '<input type="checkbox" data-stockonly checked style="width:20px;height:20px;accent-color:var(--accent)">' +
          '<span class="tx"><b>Seulement avec ce que j\'ai</b><small>Sinon l\'IA peut proposer une course</small></span></label>' +
        '<button class="btn primary block lg" style="margin-top:16px" data-go>' + Icon('sparkle', 18) + 'Créer' + '</button>' +
        '<div data-out style="margin-top:14px"></div>' +
      '</div>',
      { onMount: (sh) => {
          const txt = sh.querySelector('[data-envietxt]'), out = sh.querySelector('[data-out]');
          sh.querySelectorAll('[data-envie]').forEach((b) => b.onclick = () => {
            b.classList.toggle('on');
            const on = Array.from(sh.querySelectorAll('[data-envie].on')).map((x) => x.dataset.envie);
            txt.value = on.join(', ');
          });
          sh.querySelector('[data-go]').onclick = async () => {
            const btn = sh.querySelector('[data-go]');
            btn.classList.add('is-loading');
            out.innerHTML = UI.thinking('L\'IA cherche trois idées…');
            try {
              const trois = await proposerTrois(tab, txt.value.trim(), sh.querySelector('[data-stockonly]').checked);
              btn.classList.remove('is-loading');
              montrerPropositions(sh, out, tab, trois);
            } catch (e) {
              btn.classList.remove('is-loading');
              out.innerHTML = UI.empty('alert', 'Ça n\'a pas marché', AI.humanError(e));
            }
          };
        } }
    );
  }

  /* ============================================================
     Trois idées, en carrousel

     Une seule proposition, c'est à prendre ou à laisser. Trois,
     on choisit. Chaque carte porte son image, fabriquée à la
     volée, et on les fait défiler du pouce.
     ============================================================ */
  const QUOI = { sb: 'une boisson', ck: 'un cocktail', mm: 'une recette' };

  async function proposerTrois(tab, envie, seulementStock) {
    const dispo = Array.from(S.stock[tab]).map((k) => STOCKNAME[k]).filter(Boolean);
    const dejaLa = ALL(tab).map((d) => d.nom).slice(0, 60).join(', ');

    const res = await AI.json(
      'Propose trois idées différentes de ' + QUOI[tab] + '.\n\n' +
      (envie ? 'ENVIE : ' + envie + '\n\n' : '') +
      'CE QUE J AI SOUS LA MAIN : ' + (dispo.length ? dispo.join(', ') : 'rien de precise') + '\n' +
      (seulementStock
        ? "Regle absolue : n'utilise que des ingredients de cette liste, plus l'eau, le sel, le poivre et le sucre.\n"
        : 'Tu peux ajouter au maximum deux ingredients absents de la liste.\n') +
      'A NE PAS REPROPOSER : ' + dejaLa + '\n\n' +
      'Trois idees vraiment differentes les unes des autres. Pour chacune, un nom court, ' +
      'une phrase de description, et les ingredients principaux. Reponds en francais.',
      AI.T.obj({ idees: AI.T.arr(AI.T.obj({
        nom: AI.T.str('Nom court et appetissant'),
        desc: AI.T.str('Une phrase : le gout et le moment'),
        ingredients: AI.T.arr(AI.T.str(''), 'Quatre a six ingredients principaux'),
        temps: AI.T.str('Temps de preparation'),
        visuel: AI.T.str('Le plat decrit pour une photo : couleurs, texture, dressage')
      })) }), { cache: false, temperature: 1 });

    return (res.idees || []).slice(0, 3);
  }

  function montrerPropositions(sh, out, tab, idees) {
    if (!idees.length) { out.innerHTML = UI.empty('search', 'Rien trouvé', 'Reformule ton envie.'); return; }

    out.innerHTML =
      '<h4 style="font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:var(--muted);margin:16px 0 8px">Trois idées</h4>' +
      '<div class="carrousel">' + idees.map((x, i) =>
        '<div class="carteidee" data-idee="' + i + '">' +
          '<div class="visuel">' +
            Imagerie.vignette('plat', x.visuel || x.nom, { classe: 'large', cle: Imagerie.cleDe('plat', x.nom) }) +
          '</div>' +
          '<div class="corps">' +
            '<b>' + UI.esc(x.nom) + '</b>' +
            '<small>' + UI.esc(x.desc || '') + '</small>' +
            '<div class="puces">' + (x.ingredients || []).slice(0, 3).map((g) =>
              '<span>' + UI.esc(g) + '</span>').join('') + '</div>' +
            '<span class="cta">' + Icon('check', 15) + 'Choisir</span>' +
          '</div>' +
        '</div>').join('') + '</div>';

    Imagerie.peupler(out, { generer: true, max: 3 });

    out.querySelectorAll('[data-idee]').forEach((b) => b.onclick = async () => {
      const x = idees[+b.dataset.idee];
      b.querySelector('.cta').innerHTML = UI.thinking('Je détaille…');
      try {
        const d = await detailler(tab, x);
        UI.closeSheet();
        openIt(d.id);
        UI.toast('Ajouté à ' + (tab === 'sb' ? 'Café' : tab === 'ck' ? 'Bar' : 'Recettes'));
        if (global.Game) Game.award('creation', 12);
      } catch (e) {
        b.querySelector('.cta').innerHTML = Icon('alert', 15) + 'Réessayer';
        UI.toast(AI.humanError(e));
      }
    });
  }

  /* Une idée retenue devient une fiche complète. */
  async function detailler(tab, idee) {
    return creerAvecIA(tab, idee.nom + '. ' + (idee.desc || '') +
      ' Ingredients principaux : ' + (idee.ingredients || []).join(', ') + '.', false, idee);
  }

  async function creerAvecIA(tab, envie, seulementStock, idee) {
    const dispo = Array.from(S.stock[tab]).map((k) => STOCKNAME[k]).filter(Boolean);
    const dejaLa = ALL(tab).map((d) => d.nom).slice(0, 60).join(', ');
    const quoi = tab === 'sb' ? 'une boisson de type Starbucks, faisable a la maison'
               : tab === 'ck' ? 'un cocktail'
               : 'une recette de cuisine familiale';

    const prompt =
      'Invente ' + quoi + '.\n\n' +
      (envie ? 'ENVIE : ' + envie + '\n\n' : '') +
      'CE QUE J AI SOUS LA MAIN : ' + (dispo.length ? dispo.join(', ') : 'rien de precise') + '\n' +
      (seulementStock
        ? "Regle absolue : n'utilise que des ingredients de cette liste, plus l'eau, le sel, le poivre et le sucre. Si c'est impossible, fais au plus simple avec ce qui est disponible.\n"
        : "Tu peux ajouter au maximum deux ingredients qui ne sont pas dans la liste.\n") +
      'A NE PAS REPROPOSER : ' + dejaLa + '\n\n' +
      "Ecris en francais simple, comme pour quelqu'un qui debute. Pas de jargon : si un terme technique est indispensable, explique-le dans la meme phrase. " +
      'Les quantites doivent etre precises et realistes. Reponds uniquement avec les champs demandes.';

    const res = await AI.json(prompt, SCHEMAS[tab](), { cache: false, temperature: 1 });

    /* On range la creation exactement comme une fiche d'origine :
       meme forme, donc elle marche partout sans cas particulier. */
    const cats = tab === 'sb' ? CATS : tab === 'ck' ? CKCATS : MMCATS;
    const cat = cats.some((c) => c.id === res.cat) ? res.cat : cats[0].id;
    const base = {
      tab: tab, cree: true, cat: cat,
      nom: res.nom, desc: res.desc,
      tag: (res.tag || []).slice(0, 2).concat(['Ma creation']).slice(0, 2),
      ing: (res.ing || []).map((i) => ({ n: i.n, q: i.q, t: i.q, g: i.q, v: i.q })),
      steps: res.steps || [],
      astuce: res.astuce || '',
      sk: []
    };
    if (tab === 'sb') Object.assign(base, {
      statut: 'secret', kcal: res.kcal || 0, caf: res.caf || 0,
      temp2: ['chaud', 'glace', 'mixe'].indexOf(res.temp2) >= 0 ? res.temp2 : 'chaud',
      temp: res.temp2 === 'glace' ? 'froid' : 'chaud',
      eletta: res.eletta || 'A adapter selon ta machine.'
    });
    if (tab === 'ck') Object.assign(base, {
      ico: '', verre: res.verre || 'Highball', tech: res.tech || 'Construit',
      abv: res.abv || '—', temps: res.temps || '5 min'
    });
    if (tab === 'mm') Object.assign(base, {
      emoji: '', temps: res.temps || '30 min', portions: res.portions || '4 personnes',
      four: res.four || 'sans four', serv: res.serv === 'froid' ? 'froid' : 'chaud',
      materiel: res.materiel || [], notion: ''
    });

    if (idee && idee.visuel) base.visuel = idee.visuel;
    const saved = Store.add('creations', base);
    render();
    /* L'image du plat part en fond : la fiche s'ouvre tout de
       suite, la photo arrive quelques secondes plus tard. */
    Imagerie.obtenir(tab === 'ck' ? 'boisson' : tab === 'sb' ? 'boisson' : 'plat',
      base.visuel || base.nom, { cle: Imagerie.cleDe('plat', base.nom) });
    return saved;
  }

  function supprimerCreation(id) {
    Store.del('creations', id);
    UI.closeSheet();
    UI.toast('Création supprimée');
    render();
  }

  /* ---------- Fiche ---------- */
  function openIt(id) {
    const d = ALL(S.tab).find((x) => x.id === id);
    if (!d) return;
    let body = S.tab === 'sb' ? sheetSB(d) : S.tab === 'ck' ? sheetCK(d) : sheetMM(d);
    if (estCreation(d)) body += '<div class="mbody" style="padding-top:0">' +
      '<button class="btn danger block" data-delcrea>' + Icon('trash', 16) + 'Supprimer ce que j\'ai créé</button></div>';
    UI.openSheet(body, {
      onMount: (s) => {
        /* Les vignettes du placard se remplissent en arriere-plan. */
        Imagerie.peupler(s, { generer: true, max: 6 });
        const b = s.querySelector('[data-addfood]');
        if (b) b.onclick = () => { UI.closeSheet(); Food.quickAdd({ nom: d.nom, kcal: d.kcal || null }); };
        const del = s.querySelector('[data-delcrea]');
        if (del) del.onclick = () => supprimerCreation(d.id);
      }
    });
    Store.log('codex-open', { id: id, tab: S.tab, nom: d.nom });
  }

  /* ============================================================
     Une ligne d'ingrédient

     Chaque ingrédient porte sa vignette. Une liste de courses en
     texte pur se lit mal ; avec les images, on repère d'un coup
     d'œil ce qu'on a déjà dans le placard.
     ============================================================ */
  function ligneIngredient(nom, quantite, note, pastille) {
    return '<div class="carteing">' +
      '<span class="vis">' + Imagerie.vignette('ingredient', nom, { classe: 'carree' }) +
        (pastille || '') + '</span>' +
      '<span class="tx"><b>' + UI.esc(nom) + '</b>' +
      '<small>' + UI.esc(quantite || note || '') + '</small></span>' +
    '</div>';
  }

  /* Les ingredients ne sont plus une liste : ce sont des cartes,
     avec la photo de l'ingredient dessus. « Vin blanc » sur une
     ligne de texte ne dit rien ; une bouteille de blanc, si.
     Les photos viennent de la photothèque libre, sans clé. */
  const grilleIngredients = (html) => '<div class="grilleing">' + html + '</div>';

  const mimg = (img, cover) => '<div class="mimg' + (cover ? ' cover' : '') + '"><img class="bg" src="' + img + '" alt=""><img src="' + img + '" alt=""></div>';
  const tagsOf = (d) => '<div class="mtags">' + d.tag.map((t, i) => '<span class="tg ' + (i % 2 ? 'b' : '') + '">' + UI.esc(t) + '</span>').join('') + '</div>';
  function stockLine(d) {
    const ms = missing(d, S.tab);
    return ms.length
      ? '<div class="warn"><b>Il te manque ' + ms.length + ' chose' + (ms.length > 1 ? 's' : '') + ' :</b> ' + UI.esc(ms.map((k) => STOCKNAME[k]).join(', ')) + '.</div>'
      : '<div class="warn good"><b>Tu as tout ce qu\'il faut.</b></div>';
  }

  function sheetSB(d) {
    const b = BADGE[d.statut];
    return (estCreation(d) ? bandeauCreation(d, 'sb') : mimg(IMG[d.id])) + '<div class="mbody">' +
      '<div class="mcat">' + CATOBJ[d.cat].ico + ' ' + UI.esc(CATNAME[d.cat]) + (b ? ' · ' + b : '') + '</div><h2>' + UI.esc(d.nom) + '</h2>' + tagsOf(d) +
      '<p class="mdesc">' + UI.esc(d.desc) + '</p>' +
      '<div class="nums"><div class="num"><b>' + d.kcal + '</b><span>kcal (Grande)</span></div>' +
      '<div class="num"><b>' + d.caf + '</b><span>mg cafeine</span></div>' +
      '<div class="num"><b>' + (d.temp2 === 'mixe' ? 'Mixe' : d.temp2 === 'chaud' ? 'Chaud' : 'Glace') + '</b><span>service</span></div>' +
      '<div class="num"><b>' + d.ing.length + '</b><span>ingredients</span></div></div>' +
      stockLine(d) +
      '<button class="btn soft block" data-addfood>' + Icon('plus', 17) + 'Consigner dans Alimentation</button>' +
      '<div class="blk"><h4>Composition <span class="sz">' + SIZENAME[S.size] + '</span></h4>' +
      grilleIngredients(d.ing.map((i) => ligneIngredient(i.n, i[S.size], i.note)).join('')) + '</div>' +
      '<div class="blk"><h4>Ordre d\'assemblage</h4><ol class="steps">' + d.steps.map((s) => '<li>' + UI.esc(s) + '</li>').join('') + '</ol></div>' +
      '<div class="machbox"><h4>Sur la Eletta Explore</h4><p>' + UI.esc(d.eletta) + '</p></div>' +
      '<div class="tipbox"><h4>Le détail qui change tout</h4><p>' + UI.esc(d.astuce) + '</p></div></div>';
  }

  function sheetCK(d) {
    return (estCreation(d) ? bandeauCreation(d, 'ck') : mimg(IMG['ck-' + d.id])) + '<div class="mbody">' +
      '<div class="mcat">' + CATOBJ[d.cat].ico + ' ' + UI.esc(CATNAME[d.cat]) + '</div><h2>' + d.ico + ' ' + UI.esc(d.nom) + '</h2>' + tagsOf(d) +
      '<p class="mdesc">' + UI.esc(d.desc) + '</p>' +
      '<div class="nums"><div class="num"><b>' + UI.esc(d.verre) + '</b><span>à servir dans' + UI.hint(VERRES, 'Les verres') + '</span></div>' +
      '<div class="num"><b>' + UI.esc(d.tech) + '</b><span>façon de faire' + UI.hint(TECHS, 'Les gestes') + '</span></div>' +
      '<div class="num"><b>' + UI.esc(d.abv) + '</b><span>alcool</span></div>' +
      '<div class="num"><b>' + UI.esc(d.temps) + '</b><span>à préparer</span></div></div>' +
      stockLine(d) +
      '<div class="blk"><h4>Composition</h4>' +
      grilleIngredients(d.ing.map((i) => {
        const st = (!i.k || i.opt) ? '' : (S.stock.ck.has(i.k) ? '<span class="pill y">OK</span>' : '<span class="pill n">manque</span>');
        return ligneIngredient(i.n, i.q, i.opt ? 'optionnel' : '', st);
      }).join('')) + '</div>' +
      '<div class="blk"><h4>Préparation</h4><ol class="steps">' + d.steps.map((s) => '<li>' + UI.esc(s) + '</li>').join('') + '</ol></div>' +
      '<div class="tipbox"><h4>Le détail qui change tout</h4><p>' + UI.esc(d.astuce) + '</p></div></div>';
  }

  function sheetMM(d) {
    const img = IMG['mm-' + (d.img || 'crepes-bocuse')];
    return (estCreation(d) ? bandeauCreation(d, 'mm') : mimg(img, true)) + '<div class="mbody">' +
      '<div class="mcat">' + CATOBJ[d.cat].ico + ' ' + UI.esc(CATNAME[d.cat]) + '</div><h2>' + d.emoji + ' ' + UI.esc(d.nom) + '</h2>' + tagsOf(d) +
      '<p class="mdesc">' + UI.esc(d.desc) + '</p>' +
      '<div class="nums"><div class="num"><b>' + UI.esc(d.temps) + '</b><span>durée</span></div>' +
      '<div class="num"><b>' + UI.esc(d.portions) + '</b><span>pour</span></div>' +
      '<div class="num"><b>' + UI.esc(d.four) + '</b><span>four</span></div>' +
      '<div class="num"><b>' + (d.serv === 'chaud' ? 'Chaud' : 'Froid') + '</b><span>service</span></div></div>' +
      stockLine(d) +
      '<div class="blk"><h4>Ingredients</h4>' +
      grilleIngredients(d.ing.map((i) => ligneIngredient(i.n, i.q)).join('')) + '</div>' +
      (d.materiel && d.materiel.length ? '<div class="blk"><h4>Matériel</h4><ul class="mat">' + d.materiel.map((m) => '<li>' + UI.esc(m) + '</li>').join('') + '</ul></div>' : '') +
      '<div class="blk"><h4>Préparation</h4><ol class="steps">' + d.steps.map((s) => '<li>' + UI.esc(s) + '</li>').join('') + '</ol></div>' +
      (d.img2 ? '<div class="blk"><h4>En vrai</h4><img src="' + IMG['mm-' + d.img2] + '" style="border-radius:14px;width:100%"></div>' : '') +
      '<div class="tipbox"><h4>Le conseil de Mamie</h4><p>' + UI.esc(d.astuce) + '</p></div>' +
      '<a class="srclink" href="' + UI.attr(d.notion) + '" target="_blank" rel="noopener">Ouvrir la recette dans Notion</a></div>';
  }

  /* ---------- Tiroir de stock ---------- */
  function renderDrawer() {
    const t = S.tab, def = STOCKDEF[t];
    const fams = Array.from(new Set(def.map((b) => b.fam)));
    const all = ALL(t), ok = all.filter((d) => doable(d, t)).length;
    UI.$('#drawer').innerHTML =
      '<div class="dhead"><h3>' + UI.esc(STOCKTITLE[t]) + '</h3><button class="tbtn" data-close>' + Icon('close', 16) + '</button></div>' +
      '<p class="dsub">Tout est coche par défaut. Décoche ce que tu n\'as pas : les propositions s\'ajustent aussitot.</p>' +
      '<div class="dcount"><b>' + ok + ' sur ' + all.length + '</b><span>réalisables avec ce que tu as coche</span></div>' +
      '<div class="dact"><button data-sall="1">Tout cocher</button><button data-sall="0">Tout decocher</button></div>' +
      fams.map((f) => '<div class="dfam"><h5>' + UI.esc(f) + '</h5>' +
        def.filter((b) => b.fam === f).map((b) => {
          const n = all.filter((d) => (d.sk || []).indexOf(b.k) >= 0).length;
          return '<div class="dline ' + (S.stock[t].has(b.k) ? 'on' : '') + '" data-b="' + UI.attr(b.k) + '"><div class="dbox">' + Icon('check', 13) + '</div><span>' + UI.esc(b.n) + '</span><i>' + n + '</i></div>';
        }).join('') + '</div>').join('') +
      '<div class="dsec"><h5>Mes données du Codex</h5>' +
      '<p>Stockées sur cet appareil, et sur ton compte si tu es connecté.</p>' +
      '<textarea class="exp" id="codexExp" readonly>' + UI.esc(exportText()) + '</textarea>' +
      '<button class="dbtn" data-copy>Copier</button>' +
      '<button class="dbtn sec" data-dl="json">Télécharger en JSON</button>' +
      '<button class="dbtn sec" data-dl="txt">Télécharger la liste de courses</button></div>' +
      '<div class="dsec"><h5>Effacer</h5><p>Suppression definitive sur cet appareil.</p>' +
      '<button class="dbtn dan" data-wipe="fav">Effacer mes favoris (' + S.fav.size + ')</button>' +
      '<button class="dbtn dan" data-wipe="stock">Reinitialiser ' + UI.esc(STOCKTITLE[t].toLowerCase()) + '</button></div>';

    const dr = UI.$('#drawer');
    dr.querySelector('[data-close]').onclick = closeDrawer;
    dr.querySelectorAll('[data-b]').forEach((el) => el.onclick = () => {
      const k = el.dataset.b;
      S.stock[t].has(k) ? S.stock[t].delete(k) : S.stock[t].add(k);
      saveStock(t); renderDrawer(); render(); UI.haptic('tick');
    });
    dr.querySelectorAll('[data-sall]').forEach((b) => b.onclick = () => {
      STOCKDEF[t].forEach((x) => b.dataset.sall === '1' ? S.stock[t].add(x.k) : S.stock[t].delete(x.k));
      saveStock(t); renderDrawer(); render();
    });
    dr.querySelector('[data-copy]').onclick = () => UI.copy(exportText());
    dr.querySelectorAll('[data-dl]').forEach((b) => b.onclick = () => dlExp(b.dataset.dl));
    dr.querySelectorAll('[data-wipe]').forEach((b) => b.onclick = async () => {
      const what = b.dataset.wipe;
      if (!await UI.confirmSheet('Confirmer la suppression', 'Cette action est definitive sur cet appareil.', true)) return;
      if (what === 'fav') { S.fav.clear(); saveFav(); }
      if (what === 'stock') { S.stock[t] = new Set(allKeys(t)); saveStock(t); }
      renderDrawer(); render(); UI.toast('Effacé');
    });
  }

  function favNames() {
    const o = { sb: [], ck: [], mm: [] };
    S.fav.forEach((k) => {
      const p = k.split(':'), t = p[0], id = p[1];
      const d = ALL(t).find((x) => x.id === id);
      if (d) o[t].push(d.nom);
    });
    return o;
  }
  function shopping() {
    const need = new Set();
    S.fav.forEach((k) => {
      const p = k.split(':'), t = p[0], id = p[1];
      const d = ALL(t).find((x) => x.id === id);
      if (d) missing(d, t).forEach((m) => need.add(m));
    });
    return Array.from(need).map((k) => STOCKNAME[k]);
  }
  function exportObj() {
    const f = favNames();
    return {
      mon_placard: Array.from(S.stock.sb).map((k) => STOCKNAME[k]).sort(),
      mon_bar: Array.from(S.stock.ck).map((k) => STOCKNAME[k]).sort(),
      mon_garde_manger: Array.from(S.stock.mm).map((k) => STOCKNAME[k]).sort(),
      cocktails_realisables: COCKTAILS.filter((c) => doable(c, 'ck')).map((c) => c.nom),
      favoris: { cafe: f.sb, bar: f.ck, recettes: f.mm },
      liste_de_courses: shopping()
    };
  }
  const exportText = () => JSON.stringify(exportObj(), null, 1);
  function dlExp(kind) {
    const o = exportObj();
    if (kind === 'json') UI.download('ever-codex.json', JSON.stringify(o, null, 2), 'application/json');
    else {
      const txt = 'LISTE DE COURSES\n\n' + (o.liste_de_courses.length ? o.liste_de_courses.map((x) => '- ' + x).join('\n') : 'Rien a acheter pour tes favoris.') +
        '\n\nCOCKTAILS REALISABLES\n\n' + o.cocktails_realisables.map((x) => '- ' + x).join('\n');
      UI.download('liste-de-courses.txt', txt, 'text/plain');
    }
    UI.toast('Téléchargé');
  }

  function openDrawer() { renderDrawer(); UI.$('#drawer').classList.add('on'); UI.$('#dov').classList.add('on'); }
  function closeDrawer() { UI.$('#drawer').classList.remove('on'); UI.$('#dov').classList.remove('on'); }

  /* ---------- Cycle de vie ---------- */
  function init() {
    loadState();
    UI.$('#codexAll').onclick = () => { S.all = !S.all; S.q = ''; UI.$('#codexQ').value = ''; render(); };
    UI.$('#codexStockBtn').onclick = openDrawer;
    const bCreer = UI.$('#codexCreate');
    if (bCreer) bCreer.onclick = () => { UI.haptic('light'); createFlow(); };
    UI.$('#dov').onclick = closeDrawer;
    UI.$('#codexQ').oninput = UI.debounce((e) => { S.q = e.target.value.trim(); render(); }, 140);
    UI.$$('#codexSizes button').forEach((b) => b.onclick = () => {
      S.size = b.dataset.s; Store.set('codexSize', S.size);
      UI.$$('#codexSizes button').forEach((x) => x.classList.toggle('on', x === b));
      render();
    });
    UI.$$('#codexSizes button').forEach((b) => b.classList.toggle('on', b.dataset.s === S.size));
  }

  function show(tab) {
    S.tab = tab; S.q = ''; S.step = 0; S.all = false;
    const q = UI.$('#codexQ'); if (q) q.value = '';
    renderHero(); render();
  }

  /* Accessible aux autres modules : favoris du Codex et recettes. */
  function favorites() {
    return Array.from(S.fav).map((k) => {
      const p = k.split(':'), t = p[0], id = p[1];
      const d = ALL(t).find((x) => x.id === id);
      return d ? { tab: t, id: id, nom: d.nom, kcal: d.kcal } : null;
    }).filter(Boolean);
  }

  global.Codex = { init, show, favorites, openDrawer, createFlow, creations, state: S };
})(window);
