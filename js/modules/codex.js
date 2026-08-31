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
    const all = DATA[S.tab]();
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
    return DATA[S.tab]().filter((d) => { const s = searchable(d).toLowerCase(); return w.every((x) => s.indexOf(x) >= 0); });
  }

  /* ---------- Cartes ---------- */
  const KEY = (d) => S.tab + ':' + d.id;
  const favBtn = (k) => '<button class="fav ' + (S.fav.has(k) ? 'on' : '') + '" data-fav="' + UI.attr(k) + '" aria-label="Favori">' + Icon('star', 18) + '</button>';

  function card(d) {
    const k = KEY(d), ms = missing(d, S.tab);
    const stockBadge = ms.length ? '<span class="badge miss">Il manque ' + ms.length + '</span>' : '';
    if (S.tab === 'sb') return '<div class="card" data-id="' + UI.attr(d.id) + '">' +
      (BADGE[d.statut] ? '<span class="badge ' + (BCLS[d.statut] || '') + '">' + BADGE[d.statut] + '</span>' : stockBadge) +
      favBtn(k) +
      '<div class="ph"><img loading="lazy" src="' + IMG[d.id] + '" alt=""></div>' +
      '<div class="bd"><h3>' + UI.esc(d.nom) + '</h3>' +
      '<div class="tags">' + d.tag.slice(0, 2).map((t, i) => '<span class="tg ' + (i ? 'b' : '') + '">' + UI.esc(t) + '</span>').join('') + '</div>' +
      '<div class="meta"><span><b>' + d.kcal + '</b> kcal</span><span><b>' + d.caf + '</b> mg caf.</span></div></div></div>';

    if (S.tab === 'ck') return '<div class="card" data-id="' + UI.attr(d.id) + '">' +
      (ms.length ? stockBadge : '<span class="badge ok">Réalisable</span>') + favBtn(k) +
      '<div class="ph"><img loading="lazy" src="' + IMG['ck-' + d.id] + '" alt=""></div>' +
      '<div class="bd"><h3>' + d.ico + ' ' + UI.esc(d.nom) + '</h3>' +
      '<div class="tags">' + d.tag.slice(0, 2).map((t, i) => '<span class="tg ' + (i ? 'b' : '') + '">' + UI.esc(t) + '</span>').join('') + '</div>' +
      '<div class="meta"><span><b>' + UI.esc(d.verre) + '</b></span><span><b>' + UI.esc(d.abv) + '</b></span></div></div></div>';

    return '<div class="card wide" data-id="' + UI.attr(d.id) + '">' + stockBadge + favBtn(k) +
      '<div class="ph"><img loading="lazy" src="' + IMG['mm-' + (d.img || 'crepes-bocuse')] + '" alt=""></div>' +
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
        (l.length ? '<div class="grid" style="margin-top:14px">' + l.map(card).join('') + '</div>'
                  : UI.empty('search', 'Rien trouve', "Essaie un ingredient, un nom d'alcool, ou vide la barre.")) + '</div>';
      bindCards(app); renderFoot(); return;
    }

    if (S.all) {
      app.innerHTML = allView(); bindCards(app);
      app.querySelectorAll('[data-c]').forEach((b) => b.onclick = () => { S.cat[S.tab] = b.dataset.c; render(); });
      renderFoot(); return;
    }

    app.innerHTML = wizView();
    bindCards(app); bindWiz(); renderFoot();
  }

  function allView() {
    const all = DATA[S.tab](), c = S.cat[S.tab];
    const list = c === 'all' ? all : all.filter((d) => d.cat === c);
    let chips = '<button class="chip ' + (c === 'all' ? 'on' : '') + '" data-c="all">Tout <span class="n">' + all.length + '</span></button>';
    CATLIST[S.tab]().forEach((x) => {
      const n = all.filter((d) => d.cat === x.id).length;
      chips += '<button class="chip ' + (c === x.id ? 'on' : '') + '" data-c="' + UI.attr(x.id) + '">' + x.ico + ' ' + UI.esc(x.nom) + ' <span class="n">' + n + '</span></button>';
    });
    let body = '';
    if (c === 'all') {
      CATLIST[S.tab]().forEach((x) => {
        const s = all.filter((d) => d.cat === x.id); if (!s.length) return;
        body += '<div class="section"><div class="sechead"><h2>' + x.ico + ' ' + UI.esc(x.nom) + '</h2><span>' + s.length + '</span></div>' +
          '<p class="secdesc">' + UI.esc(x.desc) + '</p><div class="grid">' + s.map(card).join('') + '</div></div>';
      });
    } else {
      body = '<div class="section"><div class="sechead"><h2>' + CATOBJ[c].ico + ' ' + UI.esc(CATNAME[c]) + '</h2><span>' + list.length + '</span></div>' +
        '<p class="secdesc">' + UI.esc(CATOBJ[c].desc) + '</p><div class="grid">' + list.map(card).join('') + '</div></div>';
    }
    return '<div style="padding-top:16px"><div class="chips">' + chips + '</div></div>' + body;
  }

  function countFor(idx, val) {
    const save = S.wiz[S.tab][idx];
    S.wiz[S.tab][idx] = val;
    const n = DATA[S.tab]().filter((d) => passes(d, idx + 1)).length;
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
      relax + more + '<div class="grid">' + shown.map(card).join('') + '</div>' +
      '<div class="wizact" style="margin-top:18px"><button class="btn sm" data-back="1">' + Icon('back', 15) + 'Changer le dernier choix</button>' +
      '<button class="btn sm primary" data-reset="1">Recommencer</button></div></div>';
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

  function renderFoot() {
    const F = {
      sb: '<p><b>Valeurs indicatives.</b> Starbucks ne publié aucun bareme officiel de pumps : les quantités viennent de temoignages baristas et de recettes copycat concordantes.</p>',
      ck: "<p><b>Dosages IBA</b> quand ils existent. Le Coco est une création maison. L'abus d'alcool est dangereux pour la sante.</p>",
      mm: '<p><b>Recettes familiales</b> importées telles quelles depuis Notion, photos comprises.</p>'
    };
    UI.$('#codexFoot').innerHTML = F[S.tab];
  }

  /* ---------- Fiche ---------- */
  function openIt(id) {
    const d = DATA[S.tab]().find((x) => x.id === id);
    if (!d) return;
    const body = S.tab === 'sb' ? sheetSB(d) : S.tab === 'ck' ? sheetCK(d) : sheetMM(d);
    UI.openSheet(body, {
      onMount: (s) => {
        const b = s.querySelector('[data-addfood]');
        if (b) b.onclick = () => { UI.closeSheet(); Food.quickAdd({ nom: d.nom, kcal: d.kcal || null }); };
      }
    });
    Store.log('codex-open', { id: id, tab: S.tab, nom: d.nom });
  }

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
    return mimg(IMG[d.id]) + '<div class="mbody">' +
      '<div class="mcat">' + CATOBJ[d.cat].ico + ' ' + UI.esc(CATNAME[d.cat]) + (b ? ' · ' + b : '') + '</div><h2>' + UI.esc(d.nom) + '</h2>' + tagsOf(d) +
      '<p class="mdesc">' + UI.esc(d.desc) + '</p>' +
      '<div class="nums"><div class="num"><b>' + d.kcal + '</b><span>kcal (Grande)</span></div>' +
      '<div class="num"><b>' + d.caf + '</b><span>mg cafeine</span></div>' +
      '<div class="num"><b>' + (d.temp2 === 'mixe' ? 'Mixe' : d.temp2 === 'chaud' ? 'Chaud' : 'Glace') + '</b><span>service</span></div>' +
      '<div class="num"><b>' + d.ing.length + '</b><span>ingredients</span></div></div>' +
      stockLine(d) +
      '<button class="btn soft block" data-addfood>' + Icon('plus', 17) + 'Consigner dans Alimentation</button>' +
      '<div class="blk"><h4>Composition <span class="sz">' + SIZENAME[S.size] + '</span></h4>' +
      d.ing.map((i) => '<div class="ing"><div class="l"><div>' + UI.esc(i.n) + (i.note ? '<small>' + UI.esc(i.note) + '</small>' : '') + '</div></div><div class="q">' + UI.esc(i[S.size]) + '</div></div>').join('') + '</div>' +
      '<div class="blk"><h4>Ordre d\'assemblage</h4><ol class="steps">' + d.steps.map((s) => '<li>' + UI.esc(s) + '</li>').join('') + '</ol></div>' +
      '<div class="machbox"><h4>Sur la Eletta Explore</h4><p>' + UI.esc(d.eletta) + '</p></div>' +
      '<div class="tipbox"><h4>Le détail qui change tout</h4><p>' + UI.esc(d.astuce) + '</p></div></div>';
  }

  function sheetCK(d) {
    return mimg(IMG['ck-' + d.id]) + '<div class="mbody">' +
      '<div class="mcat">' + CATOBJ[d.cat].ico + ' ' + UI.esc(CATNAME[d.cat]) + '</div><h2>' + d.ico + ' ' + UI.esc(d.nom) + '</h2>' + tagsOf(d) +
      '<p class="mdesc">' + UI.esc(d.desc) + '</p>' +
      '<div class="nums"><div class="num"><b>' + UI.esc(d.verre) + '</b><span>verre</span></div>' +
      '<div class="num"><b>' + UI.esc(d.tech) + '</b><span>technique</span></div>' +
      '<div class="num"><b>' + UI.esc(d.abv) + '</b><span>degré estime</span></div>' +
      '<div class="num"><b>' + UI.esc(d.temps) + '</b><span>préparation</span></div></div>' +
      stockLine(d) +
      '<div class="blk"><h4>Composition</h4>' +
      d.ing.map((i) => {
        const st = (!i.k || i.opt) ? '' : (S.stock.ck.has(i.k) ? '<span class="pill y">OK</span>' : '<span class="pill n">manque</span>');
        return '<div class="ing"><div class="l">' + st + '<div>' + UI.esc(i.n) + (i.opt ? '<small>optionnel</small>' : '') + '</div></div><div class="q">' + UI.esc(i.q) + '</div></div>';
      }).join('') + '</div>' +
      '<div class="blk"><h4>Préparation</h4><ol class="steps">' + d.steps.map((s) => '<li>' + UI.esc(s) + '</li>').join('') + '</ol></div>' +
      '<div class="tipbox"><h4>Le détail qui change tout</h4><p>' + UI.esc(d.astuce) + '</p></div></div>';
  }

  function sheetMM(d) {
    const img = IMG['mm-' + (d.img || 'crepes-bocuse')];
    return mimg(img, true) + '<div class="mbody">' +
      '<div class="mcat">' + CATOBJ[d.cat].ico + ' ' + UI.esc(CATNAME[d.cat]) + '</div><h2>' + d.emoji + ' ' + UI.esc(d.nom) + '</h2>' + tagsOf(d) +
      '<p class="mdesc">' + UI.esc(d.desc) + '</p>' +
      '<div class="nums"><div class="num"><b>' + UI.esc(d.temps) + '</b><span>durée</span></div>' +
      '<div class="num"><b>' + UI.esc(d.portions) + '</b><span>pour</span></div>' +
      '<div class="num"><b>' + UI.esc(d.four) + '</b><span>four</span></div>' +
      '<div class="num"><b>' + (d.serv === 'chaud' ? 'Chaud' : 'Froid') + '</b><span>service</span></div></div>' +
      stockLine(d) +
      '<div class="blk"><h4>Ingredients</h4>' +
      d.ing.map((i) => '<div class="ing"><div class="l"><div>' + UI.esc(i.n) + '</div></div><div class="q">' + UI.esc(i.q) + '</div></div>').join('') + '</div>' +
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
    const all = DATA[t](), ok = all.filter((d) => doable(d, t)).length;
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
      const d = (DATA[t] ? DATA[t]() : []).find((x) => x.id === id);
      if (d) o[t].push(d.nom);
    });
    return o;
  }
  function shopping() {
    const need = new Set();
    S.fav.forEach((k) => {
      const p = k.split(':'), t = p[0], id = p[1];
      const d = (DATA[t] ? DATA[t]() : []).find((x) => x.id === id);
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
      const d = (DATA[t] ? DATA[t]() : []).find((x) => x.id === id);
      return d ? { tab: t, id: id, nom: d.nom, kcal: d.kcal } : null;
    }).filter(Boolean);
  }

  global.Codex = { init, show, favorites, openDrawer, state: S };
})(window);
