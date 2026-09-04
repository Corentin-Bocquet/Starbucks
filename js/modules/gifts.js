/* ============================================================
   EVER — Cadeaux : "Qu'est-ce que je lui offre ?"

   Trois couches :
     1. les listes explicites, celles que la personne assume
     2. les indices privés : ce qu'elle aimé sans l'avoir demande.
        Ils restent invisibles pour elle et servent de matière a
        l'IA. C'est la partie qui change tout.
     3. les suggestions générées, qu'on peut promouvoir en vraie
        idée cadeau d'un geste.
   ============================================================ */
(function (global) {
  'use strict';

  let root = null, personId = null, roul = null;

  const people  = () => Store.all('people');
  const gifts   = (pid) => Store.all('gifts').filter((g) => g.person === pid);
  const hints   = (pid) => Store.all('giftHints').filter((h) => h.person === pid);
  const sugg    = (pid) => Store.all('giftIdeas').filter((s) => s.person === pid);

  function mount(el, rest) {
    root = el;
    personId = (rest && rest[0]) || Store.get('lastPerson', null);
    if (personId && !Store.find('people', personId)) personId = null;
    render();
  }

  function render() {
    if (!personId) return renderPeople();
    Store.set('lastPerson', personId);
    const p = Store.find('people', personId);
    const list = gifts(personId);

    root.innerHTML = '<div class="wrap">' +
      '<div class="section" style="padding:16px 0 0"><div class="row-between">' +
        '<button class="row" style="gap:10px" data-back>' + Icon('back', 18) +
        '<span><b style="font-size:19px;letter-spacing:-.02em">' + UI.esc(p.nom) + '</b>' +
        '<small class="muted" style="display:block">' + list.length + ' idée' + (list.length > 1 ? 's' : '') + ' · ' + hints(personId).length + ' indice' + (hints(personId).length > 1 ? 's' : '') + '</small></span></button>' +
        '<button class="tbtn" data-act="editPerson">' + Icon('edit', 17) + '</button>' +
      '</div></div>' +
      '<div id="giftRoul" style="margin-top:12px"></div>' +
      listBlock(list) +
      hintBlock() +
      suggBlock() +
      '</div>';

    roul = Roulette.mount(UI.$('#giftRoul'), {
      items: () => gifts(personId).map((g) => Object.assign({}, g, { label: g.nom, icon: catIcon(g.cat) })),
      weight: (g) => (Store.isFav('gift', g.id) ? 80 : 50) + (g.priority || 0) * 10,
      cta: 'TOURNER',
      emptyText: 'Aucune idée dans la liste',
      onResult: (g, box) => { box.innerHTML = card(g); bindCard(box, g); Store.log('cadeau', { id: g.id, label: g.nom }); }
    });
    bind();
  }

  const catIcon = (c) => (SEED.GIFT_CATS.find((x) => x.id === c) || { icon: 'gift' }).icon;

  function renderPeople() {
    const list = people();
    root.innerHTML = '<div class="wrap">' +
      '<div class="section" style="padding:16px 0 0">' +
        '<h2 style="font-size:22px">Pour qui ?</h2>' +
        '<p class="secdesc">Une fiche par personne. Ce que tu notes ici ne quitte pas ton appareil, sauf si tu partages la liste.</p>' +
        (list.length
          ? '<div class="kgrille">' + list.map((p) => {
              const aPhoto = p.photo || p.photoUrl;
              return '<button class="kart" data-p="' + UI.attr(p.id) + '">' +
                '<span class="vis">' + (aPhoto
                  ? Photos.img(p, 'photo', 'width:100%;height:100%;object-fit:cover')
                  : (global.Stock ? Stock.ic(p.relation || p.nom, { classe: 'fond' }) : '')) + '</span>' +
                '<span class="voile"></span>' +
                (aPhoto ? '' : '<span class="badge">Photo ?</span>') +
                '<span class="tx"><b>' + UI.esc(p.nom) + '</b>' +
                '<small>' + gifts(p.id).length + ' idées · ' + hints(p.id).length + ' indices</small></span>' +
                '</button>';
            }).join('') + '</div>'
          : UI.empty('users', "Personne pour l'instant", 'Ajoute quelqu\'un pour commencer à noter des idées.')) +
        '<div class="btnrow" style="margin-top:16px">' +
          '<button class="btn primary grow lg" data-act="addPerson">' + Icon('plus', 17) + 'Ajouter quelqu\'un</button>' +
          '<button class="btn lg" data-act="share" aria-label="Listes partagées">' + Icon('users', 17) + '</button>' +
        '</div>' +
      '</div></div>';
    Photos.hydrate(root);
    if (global.Stock) Stock.peupler(root);
    bind();
  }

  function listBlock(list) {
    return '<div class="section"><div class="sechead"><h2 style="font-size:16px">Sa liste</h2>' +
      '<button data-act="addGift">Ajouter</button></div>' +
      (list.length ? '<div class="list">' + list.map((g) =>
        '<div class="rowitem" data-gift="' + UI.attr(g.id) + '"><span class="ic">' + Icon(catIcon(g.cat), 17) + '</span>' +
        '<span class="tx"><b>' + UI.esc(g.nom) + '</b><small>' + UI.esc((SEED.GIFT_CATS.find((c) => c.id === g.cat) || {}).nom || '') +
        (g.prix ? ' · ' + UI.esc(g.prix) : '') + '</small></span>' +
        '<button class="rt" data-rmgift="' + UI.attr(g.id) + '">' + Icon('trash', 16) + '</button></div>').join('') + '</div>'
        : '<p class="muted" style="font-size:13px">Rien encore. Les indices ci-dessous suffisent a lancer l\'IA.</p>') + '</div>';
  }

  function hintBlock() {
    const h = hints(personId);
    return '<div class="section"><div class="sechead"><h2 style="font-size:16px">Ce qu\'elle aimé</h2>' +
      '<button data-act="addHint">Ajouter</button></div>' +
      '<div class="banner" style="margin-bottom:10px">' + Icon('lock', 18) +
      '<span>Privé. Ces indices ne sont jamais partages, même si tu partages la liste de cadeaux. Ils servent uniquement a nourrir les suggestions.</span></div>' +
      (h.length ? '<div class="list">' + h.map((x) =>
        '<div class="rowitem"><span class="ic">' + Icon('heart', 17) + '</span>' +
        '<span class="tx"><b>' + UI.esc(x.nom) + '</b>' + (x.note ? '<small>' + UI.esc(x.note) + '</small>' : '') + '</span>' +
        '<button class="rt" data-rmhint="' + UI.attr(x.id) + '">' + Icon('trash', 16) + '</button></div>').join('') + '</div>'
        : '<p class="muted" style="font-size:13px">Les fleurs, les bougies, un parfum précis, un restaurant, une couleur : tout compte.</p>') +
      '</div>';
  }

  function suggBlock() {
    const s = sugg(personId);
    return '<div class="section"><div class="sechead"><h2 style="font-size:16px">Peut-être qu\'elle aimerait…</h2>' +
      (s.length ? '<button data-act="ai">Regenerer</button>' : '') + '</div>' +
      (s.length ? '<div class="list">' + s.map((x) =>
        '<div class="rowitem" data-idea="' + UI.attr(x.id) + '"><span class="ic">' + Icon('sparkle', 17) + '</span>' +
        '<span class="tx"><b>' + UI.esc(x.nom) + '</b><small>' + UI.esc(x.pourquoi || '') + '</small></span>' +
        '<span class="rt">' + Icon('next', 15) + '</span></div>').join('') + '</div>'
        : '<div class="panel" style="text-align:center"><p class="muted" style="font-size:13px;margin-bottom:12px">' +
          'À partir des indices, l\'IA cherche des idées du même esprit : objets, expériences, et ou les acheter.</p>' +
          '<button class="btn primary" data-act="ai">' + Icon('sparkle', 17) + 'Chercher des idées</button></div>') +
      '</div>';
  }

  function card(g) {
    const isFav = Store.isFav('gift', g.id);
    return '<div class="result"><div class="rbody">' +
      '<div class="rkick">' + UI.esc((SEED.GIFT_CATS.find((c) => c.id === g.cat) || {}).nom || 'Cadeau') + '</div>' +
      '<h3>' + UI.esc(g.nom) + '</h3>' +
      (g.note ? '<p class="muted" style="font-size:13.5px;margin-top:6px">' + UI.esc(g.note) + '</p>' : '') +
      (g.prix ? '<div class="rmeta"><span>' + UI.esc(g.prix) + '</span></div>' : '') +
      '<div class="ract">' +
        '<button class="btn sm primary" data-cal>' + Icon('calendar', 15) + 'Planifier</button>' +
        '<button class="btn sm" data-fav><span class="etoile' + (isFav ? ' on' : '') + '">' + Icon('star', 15) + '</span>' + (isFav ? 'Retirer' : 'Favori') + '</button>' +
        '<button class="btn sm ghost" data-where>' + Icon('pin', 15) + 'Ou l\'acheter</button>' +
      '</div></div></div>';
  }

  function bindCard(box, g) {
    box.querySelector('[data-cal]').onclick = () => planBuy(g.nom);
    box.querySelector('[data-fav]').onclick = (e) => {
      const on = Store.toggleFav('gift', g.id);
      e.currentTarget.innerHTML = '<span class="etoile' + (on ? ' on' : '') + '">' + Icon('star', 15) + '</span>' + (on ? 'Retirer' : 'Favori');
    };
    box.querySelector('[data-where]').onclick = () => whereToBuy(g.nom);
  }

  /* ============================================================
     IA
     ============================================================ */
  const IDEA_SCHEMA = AI.T.obj({
    idees: AI.T.arr(AI.T.obj({
      nom: AI.T.str('Idée concrete, précise, pas une catégorie'),
      categorie: AI.T.enu(['vetements', 'parfums', 'livres', 'jeux', 'objets', 'experiences', 'restaurants', 'voyages', 'deco', 'autre'], ''),
      pourquoi: AI.T.str('Une ligne, le lien avec ce qu elle aimé déjà'),
      budget: AI.T.str('Fourchette de prix en euros'),
      ou: AI.T.str('Type de commerce ou enseigne ou le trouver en France')
    }))
  });

  async function aiIdeas() {
    if (!AI.available()) { UI.toast('Ajoute ta clé Gemini dans Réglages'); return App.go('#/m/settings/ia'); }
    const p = Store.find('people', personId);
    const h = hints(personId), g = gifts(personId);
    if (!h.length && !g.length) { UI.toast('Ajoute d\'abord un indice ou une idée'); return; }

    UI.openSheet('<div class="mbody">' + UI.thinking('Recherche d\'idées…') + '</div>');
    try {
      const res = await AI.json(
        "Trouve des idées de cadeau pour une personne dont voici ce que je sais.\n\n" +
        (p.relation ? "Relation : " + p.relation + "\n" : '') +
        (p.age ? "Age approximatif : " + p.age + "\n" : '') +
        "Elle aime : " + h.map((x) => x.nom + (x.note ? ' (' + x.note + ')' : '')).join(', ') + "\n" +
        (g.length ? "Déjà dans sa liste, a ne pas repeter : " + g.map((x) => x.nom).join(', ') + "\n" : '') +
        "Lieu : " + Ctx.place().name + ", France.\n\n" +
        "Règles :\n" +
        "- des idées précises, achetables, pas des catégories vagues ;\n" +
        "- varie les budgets et les registres, dont au moins une expérience ;\n" +
        "- cherche le lien reel avec ses goûts, pas le cliche du genre ;\n" +
        "- huit idées maximum ;\n" +
        "- réponds en francais.",
        IDEA_SCHEMA, { cache: false, temperature: 0.95 });

      sugg(personId).forEach((s) => Store.del('giftIdeas', s.id));
      (res.idees || []).forEach((i) => Store.add('giftIdeas', {
        person: personId, nom: i.nom, cat: i.categorie, pourquoi: i.pourquoi, budget: i.budget, ou: i.ou
      }));
      UI.closeSheet();
      if (global.Game) Game.award('idée-cadeau', 10);
      render();
    } catch (e) { UI.closeSheet(); UI.toast(AI.humanError(e)); }
  }

  function openIdea(id) {
    const i = Store.find('giftIdeas', id);
    if (!i) return;
    UI.openSheet('<div class="mbody" style="padding-top:6px">' +
      '<div class="mcat">Suggestion</div><h2 style="font-size:23px">' + UI.esc(i.nom) + '</h2>' +
      '<p class="mdesc">' + UI.esc(i.pourquoi || '') + '</p>' +
      '<div class="list" style="margin-top:14px">' +
        (i.budget ? '<div class="rowitem"><span class="tx"><b>Budget</b></span><span class="rt">' + UI.esc(i.budget) + '</span></div>' : '') +
        (i.ou ? '<div class="rowitem"><span class="tx"><b>Ou</b></span><span class="rt">' + UI.esc(i.ou) + '</span></div>' : '') +
      '</div>' +
      '<div class="btnrow" style="margin-top:18px">' +
        '<button class="btn primary grow" data-add>' + Icon('plus', 16) + 'Ajouter à sa liste</button>' +
        '<button class="btn" data-where>' + Icon('pin', 16) + 'Où acheter</button>' +
      '</div>' +
      '<button class="btn ghost block" style="margin-top:8px" data-cal>' + Icon('calendar', 16) + 'Planifier l\'achat</button>' +
      '</div>', {
      onMount: (s) => {
        s.querySelector('[data-add]').onclick = () => {
          Store.add('gifts', { person: personId, nom: i.nom, cat: i.cat, note: i.pourquoi, prix: i.budget, source: 'ia' });
          Store.del('giftIdeas', id);
          UI.closeSheet(); UI.toast('Ajouter à sa liste'); render();
        };
        s.querySelector('[data-where]').onclick = () => whereToBuy(i.nom);
        s.querySelector('[data-cal]').onclick = () => planBuy(i.nom);
      }
    });
  }

  /* Planification intelligente : si la personne a une date importante,
     on propose d'acheter quelques jours avant, sur un créneau libre. */
  function planBuy(what) {
    const p = Store.find('people', personId) || {};
    let date = UI.day.today();
    if (p.date) {
      const target = String(p.date).slice(0, 10);
      const soon = UI.day.add(target, -4);
      if (soon > UI.day.today()) date = soon;
      else if (target >= UI.day.today()) date = UI.day.today();
    }
    const slot = Cal.freeSlot(date, 60, 10, 19);
    Cal.add({
      title: 'Acheter : ' + what,
      description: p.nom ? 'Cadeau pour ' + p.nom + (p.date ? ' (date importante le ' + p.date + ')' : '') : '',
      kind: 'cadeau', minutes: 60, date: date,
      time: slot ? String(slot.getHours()).padStart(2, '0') + ':' + String(slot.getMinutes()).padStart(2, '0') : '11:00'
    });
  }

  async function whereToBuy(what) {
    if (!AI.available()) { UI.toast('Ajoute ta clé Gemini dans Réglages'); return; }
    const place = Ctx.place();
    UI.openSheet('<div class="mbody">' + UI.thinking('Recherche des commerces…') + '</div>');
    try {
      const res = await AI.json(
        'Où acheter « ' + what + ' » a ' + place.name + ' ou aux alentours ? ' +
        'Donne des commerces qui existent vraiment, et des sites marchands francais serieux si le produit ne se trouve pas sur place. ' +
        "Si tu n'es pas sur d'une enseigne locale, ne l'inventes pas.",
        AI.T.obj({
          commerces: AI.T.arr(AI.T.obj({ nom: AI.T.str(''), adresse: AI.T.str(''), pourquoi: AI.T.str('') })),
          en_ligne: AI.T.arr(AI.T.obj({ nom: AI.T.str(''), url: AI.T.str('Adresse du site') }))
        }), { ttl: 7 * 86400e3 });

      UI.openSheet('<div class="mbody" style="padding-top:6px"><h2 style="font-size:22px;margin-bottom:12px">Où trouver ça</h2>' +
        (res.commerces && res.commerces.length ? '<h4 style="font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:var(--muted);margin-bottom:8px">Sur place</h4><div class="list">' +
          res.commerces.map((c) => '<button class="rowitem" data-q="' + UI.attr(c.nom + ' ' + (c.adresse || place.name)) + '">' +
            '<span class="ic">' + Icon('pin', 17) + '</span><span class="tx"><b>' + UI.esc(c.nom) + '</b><small>' + UI.esc(c.adresse || '') + ' · ' + UI.esc(c.pourquoi || '') + '</small></span>' +
            '<span class="rt">' + Icon('map', 15) + '</span></button>').join('') + '</div>' : '') +
        (res.en_ligne && res.en_ligne.length ? '<h4 style="font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:var(--muted);margin:16px 0 8px">En ligne</h4><div class="list">' +
          res.en_ligne.map((c) => '<a class="rowitem" href="' + UI.attr(/^https?:/.test(c.url || '') ? c.url : 'https://' + (c.url || '')) + '" target="_blank" rel="noopener">' +
            '<span class="ic">' + Icon('link', 17) + '</span><span class="tx"><b>' + UI.esc(c.nom) + '</b><small>' + UI.esc(c.url || '') + '</small></span>' +
            '<span class="rt">' + Icon('next', 15) + '</span></a>').join('') + '</div>' : '') +
        '<p class="muted" style="font-size:11px;margin-top:14px">Suggestions générées : vérifie l\'adresse avant de te déplacer.</p></div>', {
        onMount: (s) => s.querySelectorAll('[data-q]').forEach((b) => b.onclick = () => {
          const prov = Store.get('mapsProvider', 'apple');
          const q = encodeURIComponent(b.dataset.q);
          window.open(prov === 'google' ? 'https://www.google.com/maps/search/?api=1&query=' + q : 'https://maps.apple.com/?q=' + q, '_blank', 'noopener');
        })
      });
    } catch (e) { UI.closeSheet(); UI.toast(AI.humanError(e)); }
  }

  /* ============================================================
     Interactions
     ============================================================ */
  function bind() {
    root.querySelectorAll('[data-p]').forEach((b) => b.onclick = () => { personId = b.dataset.p; render(); });
    const bk = root.querySelector('[data-back]');
    if (bk) bk.onclick = () => { personId = null; Store.set('lastPerson', null); render(); };
    root.querySelectorAll('[data-act]').forEach((b) => b.onclick = () => acts[b.dataset.act] && acts[b.dataset.act]());
    root.querySelectorAll('[data-rmgift]').forEach((b) => b.onclick = (e) => { e.stopPropagation(); Store.del('gifts', b.dataset.rmgift); render(); });
    root.querySelectorAll('[data-rmhint]').forEach((b) => b.onclick = (e) => { e.stopPropagation(); Store.del('giftHints', b.dataset.rmhint); render(); });
    root.querySelectorAll('[data-idea]').forEach((b) => b.onclick = () => openIdea(b.dataset.idea));
  }

  /* ============================================================
     La photo d'un proche

     Elle change tout : une carte avec un visage se reconnait sans
     lire, une carte sans visage se lit. Elle est donc proposee des
     la creation, et modifiable ensuite depuis la fiche.
     ============================================================ */
  async function proposerPhoto(id, nom) {
    const ok = await UI.confirmSheet('Une photo de ' + nom + ' ?',
      'Elle apparaîtra sur sa carte. Elle reste sur ton appareil.', false);
    if (ok) choisirPhoto(id);
  }

  function choisirPhoto(id) {
    Photos.pick(async (f) => {
      if (!f) return;
      UI.toast('Enregistrement…');
      const saved = await Photos.save(f, 'people', 700);
      Store.put('people', id, { photo: saved.id, photoUrl: saved.url || null });
      UI.haptic('success'); UI.toast('Photo enregistrée');
      render();
    });
  }

  const acts = {
    addPerson: async () => {
      const r = await UI.promptSheet("Ajouter quelqu'un", [
        { name: 'nom', label: 'Prénom' },
        { name: 'relation', label: 'Relation', type: 'tiles', options: [
            { v: 'copine', n: 'Copine' }, { v: 'frère', n: 'Frère' }, { v: 'sœur', n: 'Sœur' },
            { v: 'mère', n: 'Mère' }, { v: 'père', n: 'Père' }, { v: 'ami', n: 'Ami' },
            { v: 'amie', n: 'Amie' }, { v: 'collègue', n: 'Collègue' }, { v: 'autre', n: 'Autre' } ] },
        { name: 'date', label: 'Date importante', type: 'date', value: '' }
      ], { submit: 'Ajouter', art: 'personne', teinte: ['#215D93', '#4E93CE'] });
      if (!r || !r.nom) return;
      const p = Store.add('people', { nom: r.nom, relation: r.relation, date: r.date });
      personId = p.id; render();
      /* On propose la photo dans la foulee : demandee plus tard,
         elle n'est jamais ajoutee, et la carte reste anonyme. */
      proposerPhoto(p.id, p.nom);
    },
    editPerson: async () => {
      const p = Store.find('people', personId);
      const r = await UI.promptSheet('Modifier', [
        { name: 'nom', label: 'Prénom', value: p.nom },
        { name: 'relation', label: 'Relation', value: p.relation || '' },
        { name: 'date', label: 'Date importante', type: 'date', value: p.date || '' }
      ], { submit: 'Enregistrer', art: 'personne', teinte: ['#215D93', '#4E93CE'], sub: p.nom });
      if (!r) return;
      Store.put('people', personId, { nom: r.nom, relation: r.relation, date: r.date });
      render();
    },
    photoPerson: () => {
      const p = Store.find('people', personId);
      if (p) choisirPhoto(p.id);
    },
    addGift: async () => {
      const r = await UI.promptSheet('Nouvelle idée', [
        { name: 'nom', label: 'Quoi' },
        { name: 'cat', label: 'Catégorie', type: 'select', value: 'objets', options: SEED.GIFT_CATS.map((c) => ({ v: c.id, n: c.nom })) },
        { name: 'prix', label: 'Budget', placeholder: '40 a 60 euros' },
        { name: 'note', label: 'Note', placeholder: 'Facultatif' }
      ], 'Ajouter');
      if (!r || !r.nom) return;
      Store.add('gifts', { person: personId, nom: r.nom, cat: r.cat, prix: r.prix, note: r.note });
      render();
    },
    addHint: async () => {
      const r = await UI.promptSheet('Ce qu\'elle aimé', [
        { name: 'nom', label: 'Quoi', placeholder: 'Les pivoines, les bougies Diptyque…' },
        { name: 'note', label: 'Précision', placeholder: 'Facultatif' }
      ], 'Ajouter');
      if (!r || !r.nom) return;
      Store.add('giftHints', { person: personId, nom: r.nom, note: r.note });
      render();
    },
    ai: () => aiIdeas(),
    share: () => Lists.open('gifts')
  };

  App.register('gifts', { mount: mount });
  global.Gifts = { mount };
})(window);
