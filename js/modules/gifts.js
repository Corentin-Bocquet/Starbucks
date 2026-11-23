/* ============================================================
   EVER — Cadeaux : "Qu'est-ce que je lui offre ?"

   Trois couches :
     1. les listes explicites, celles que la personne assume
     2. les indices privés : ce que la personne aime sans l'avoir
        demandé. Ils restent invisibles pour elle et servent de
        matière à l'IA. C'est la partie qui change tout.
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
        '<button class="tbtn" data-act="editPerson" aria-label="Modifier la fiche">' + Icon('edit', 17) + '</button>' +
      '</div></div>' +
      '<div id="giftRoul" style="margin-top:12px"></div>' +
      listBlock(list) +
      hintBlock() +
      suggBlock() +
      '<div class="section"><button class="btn ghost block danger-txt" data-act="delPerson">' +
        Icon('trash', 16) + 'Supprimer cette personne</button></div>' +
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
        '<p class="secdesc">Une fiche par personne. Sans compte, tout reste sur ton appareil. ' +
          'Avec un compte, tes fiches et leurs photos sont sauvegardées en ligne pour tes autres appareils. ' +
          'Les indices ne sont jamais partagés.</p>' +
        (list.length
          ? '<div class="kgrille">' + list.map((p) => {
              const aPhoto = p.photo || p.photoUrl;
              /* L'image de repli reste toujours dessous : une photo
                 qui ne s'affiche pas (copie locale absente sur un
                 autre appareil, envoi raté) ne laisse plus une carte
                 vide, elle se cache et le repli apparaît. */
              return '<button class="kart" data-p="' + UI.attr(p.id) + '">' +
                '<span class="vis">' + (global.Stock ? Stock.ic(p.relation || p.nom, { classe: 'fond' }) : '') +
                  (aPhoto ? Photos.img(p, 'photo', 'position:absolute;inset:0;width:100%;height:100%;object-fit:cover') : '') +
                '</span>' +
                '<span class="voile"></span>' +
                (aPhoto ? '' : '<span class="badge">Photo ?</span>') +
                '<span class="tx"><b>' + UI.esc(p.nom) + '</b>' +
                '<small>' + gifts(p.id).length + ' idées · ' + hints(p.id).length + ' indices</small></span>' +
                '</button>';
            }).join('') + '</div>'
          : UI.empty('users', "Personne pour l'instant", 'Ajoute quelqu\'un pour commencer à noter des idées.')) +
        '<div class="btnrow" style="margin-top:16px">' +
          '<button class="btn primary grow lg" data-act="addPerson">' + Icon('plus', 17) + 'Ajouter quelqu\'un</button>' +
          '<button class="btn lg" data-act="share" aria-label="Listes partagées" title="Listes partagées">' + Icon('users', 17) + '</button>' +
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
        : '<p class="muted" style="font-size:13px">Rien encore. Ajoute une idée, ou note quelques goûts ci-dessous pour demander des suggestions.</p>') + '</div>';
  }

  function hintBlock() {
    const h = hints(personId);
    return '<div class="section"><div class="sechead"><h2 style="font-size:16px">Ses goûts</h2>' +
      '<button data-act="addHint">Ajouter</button></div>' +
      '<div class="banner" style="margin-bottom:10px">' + Icon('lock', 18) +
      '<span>Privé. Ces indices ne sont jamais partagés, même si tu partages la liste de cadeaux. Ils servent uniquement à nourrir les suggestions.</span></div>' +
      (h.length ? '<div class="list">' + h.map((x) =>
        '<div class="rowitem"><span class="ic">' + Icon('heart', 17) + '</span>' +
        '<span class="tx"><b>' + UI.esc(x.nom) + '</b>' + (x.note ? '<small>' + UI.esc(x.note) + '</small>' : '') + '</span>' +
        '<button class="rt" data-rmhint="' + UI.attr(x.id) + '">' + Icon('trash', 16) + '</button></div>').join('') + '</div>'
        : '<p class="muted" style="font-size:13px">Les fleurs, les bougies, un parfum précis, un restaurant, une couleur : tout compte.</p>') +
      '</div>';
  }

  function suggBlock() {
    const s = sugg(personId);
    return '<div class="section"><div class="sechead"><h2 style="font-size:16px">Idées pour lui faire plaisir</h2>' +
      (s.length ? '<button data-act="ai">Régénérer</button>' : '') + '</div>' +
      (s.length ? '<div class="list">' + s.map((x) =>
        '<div class="rowitem" data-idea="' + UI.attr(x.id) + '"><span class="ic">' + Icon('sparkle', 17) + '</span>' +
        '<span class="tx"><b>' + UI.esc(x.nom) + '</b><small>' + UI.esc(x.pourquoi || '') + '</small></span>' +
        '<span class="rt">' + Icon('next', 15) + '</span></div>').join('') + '</div>'
        : '<div class="panel" style="text-align:center"><p class="muted" style="font-size:13px;margin-bottom:12px">' +
          'À partir de ses goûts, l\'IA cherche des idées du même esprit : objets, expériences, et où les acheter.</p>' +
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
        '<button class="btn sm ghost" data-where>' + Icon('pin', 15) + 'Où l\'acheter</button>' +
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
      pourquoi: AI.T.str('Une ligne, le lien avec ce que la personne aime déjà'),
      budget: AI.T.str('Fourchette de prix en euros'),
      ou: AI.T.str('Type de commerce ou enseigne ou le trouver en France')
    }))
  });

  async function aiIdeas() {
    if (!AI.available()) {
      return UI.echecIA('NO_KEY', {
        titre: "Les suggestions de cadeaux ne sont pas disponibles",
        repli: { nom: 'Ajouter une idée moi-même', faire: () => acts.addGift() }
      });
    }
    const p = Store.find('people', personId);
    const h = hints(personId), g = gifts(personId);
    if (!h.length && !g.length) { UI.toast('Ajoute d\'abord un indice ou une idée'); return; }

    UI.openSheet('<div class="mbody">' + UI.thinking('Recherche d\'idées…') + '</div>');
    try {
      const res = await AI.json(
        "Trouve des idées de cadeau pour une personne dont voici ce que je sais.\n\n" +
        (p.relation ? "Relation : " + p.relation + "\n" : '') +
        (p.age ? "Age approximatif : " + p.age + "\n" : '') +
        "Ses goûts : " + h.map((x) => x.nom + (x.note ? ' (' + x.note + ')' : '')).join(', ') + "\n" +
        (g.length ? "Déjà dans sa liste, à ne pas répéter : " + g.map((x) => x.nom).join(', ') + "\n" : '') +
        "Lieu : " + Ctx.place().name + ", France.\n\n" +
        "Règles :\n" +
        "- des idées précises, achetables, pas des catégories vagues ;\n" +
        "- varie les budgets et les registres, dont au moins une expérience ;\n" +
        "- cherche le lien réel avec ses goûts, pas le cliché du genre ;\n" +
        "- huit idées maximum ;\n" +
        "- réponds en français.",
        IDEA_SCHEMA, { cache: false, temperature: 0.95 });

      sugg(personId).forEach((s) => Store.del('giftIdeas', s.id));
      (res.idees || []).forEach((i) => Store.add('giftIdeas', {
        person: personId, nom: i.nom, cat: i.categorie, pourquoi: i.pourquoi, budget: i.budget, ou: i.ou
      }));
      UI.closeSheet();
      if (global.Game) Game.award('idée-cadeau', 10);
      render();
    } catch (e) {
      UI.closeSheet();
      UI.echecIA(e, {
        titre: "Pas d'idées de cadeaux pour le moment", reessayer: () => aiIdeas(),
        repli: { nom: 'Ajouter une idée moi-même', faire: () => acts.addGift() }
      });
    }
  }

  function openIdea(id) {
    const i = Store.find('giftIdeas', id);
    if (!i) return;
    UI.openSheet('<div class="mbody" style="padding-top:6px">' +
      '<div class="mcat">Suggestion</div><h2 style="font-size:23px">' + UI.esc(i.nom) + '</h2>' +
      '<p class="mdesc">' + UI.esc(i.pourquoi || '') + '</p>' +
      '<div class="list" style="margin-top:14px">' +
        (i.budget ? '<div class="rowitem"><span class="tx"><b>Budget</b></span><span class="rt">' + UI.esc(i.budget) + '</span></div>' : '') +
        (i.ou ? '<div class="rowitem"><span class="tx"><b>Où</b></span><span class="rt">' + UI.esc(i.ou) + '</span></div>' : '') +
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
          UI.closeSheet(); UI.toast('Ajouté à sa liste'); render();
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

  /* Sans IA, on peut toujours chercher le produit sur une carte. */
  function chercherSurCarte(what) {
    const place = Ctx.place();
    const prov = Store.get('mapsProvider', 'apple');
    const q = encodeURIComponent(what + ' ' + (place.name || ''));
    window.open(prov === 'google' ? 'https://www.google.com/maps/search/?api=1&query=' + q : 'https://maps.apple.com/?q=' + q, '_blank', 'noopener');
  }

  async function whereToBuy(what) {
    const repli = { nom: 'Chercher sur une carte', faire: () => chercherSurCarte(what) };
    if (!AI.available()) return UI.echecIA('NO_KEY', { titre: "La recherche de commerces n'est pas disponible", repli: repli });
    const place = Ctx.place();
    UI.openSheet('<div class="mbody">' + UI.thinking('Recherche des commerces…') + '</div>');
    try {
      const res = await AI.json(
        'Où acheter « ' + what + ' » à ' + place.name + ' ou aux alentours ? ' +
        'Donne des commerces qui existent vraiment, et des sites marchands français sérieux si le produit ne se trouve pas sur place. ' +
        "Si tu n'es pas sûr d'une enseigne locale, ne l'invente pas.",
        AI.T.obj({
          commerces: AI.T.arr(AI.T.obj({ nom: AI.T.str(''), adresse: AI.T.str(''), pourquoi: AI.T.str('') })),
          en_ligne: AI.T.arr(AI.T.obj({ nom: AI.T.str(''), url: AI.T.str('Adresse du site') }))
        }), { ttl: 7 * 86400e3 });

      const rien = !(res.commerces && res.commerces.length) && !(res.en_ligne && res.en_ligne.length);
      /* remplacer : la flèche Retour ne doit pas ramener au sablier. */
      UI.openSheet('<div class="mbody" style="padding-top:6px"><h2 style="font-size:22px;margin-bottom:12px">Où trouver ça</h2>' +
        (rien ? '<p class="mdesc">Aucune adresse sûre trouvée.</p><button class="btn block" data-carte>' +
          Icon('map', 16) + 'Chercher sur une carte</button>' : '') +
        (res.commerces && res.commerces.length ? '<h4 style="font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:var(--muted);margin-bottom:8px">Sur place</h4><div class="list">' +
          res.commerces.map((c) => '<button class="rowitem" data-q="' + UI.attr(c.nom + ' ' + (c.adresse || place.name)) + '">' +
            '<span class="ic">' + Icon('pin', 17) + '</span><span class="tx"><b>' + UI.esc(c.nom) + '</b><small>' + UI.esc(c.adresse || '') + ' · ' + UI.esc(c.pourquoi || '') + '</small></span>' +
            '<span class="rt">' + Icon('map', 15) + '</span></button>').join('') + '</div>' : '') +
        (res.en_ligne && res.en_ligne.length ? '<h4 style="font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:var(--muted);margin:16px 0 8px">En ligne</h4><div class="list">' +
          res.en_ligne.map((c) => '<a class="rowitem" href="' + UI.attr(/^https?:/.test(c.url || '') ? c.url : 'https://' + (c.url || '')) + '" target="_blank" rel="noopener">' +
            '<span class="ic">' + Icon('link', 17) + '</span><span class="tx"><b>' + UI.esc(c.nom) + '</b><small>' + UI.esc(c.url || '') + '</small></span>' +
            '<span class="rt">' + Icon('next', 15) + '</span></a>').join('') + '</div>' : '') +
        '<p class="muted" style="font-size:11px;margin-top:14px">Suggestions générées : vérifie l\'adresse avant de te déplacer.</p></div>', {
        remplacer: true,
        onMount: (s) => {
          s.querySelectorAll('[data-q]').forEach((b) => b.onclick = () => {
            const prov = Store.get('mapsProvider', 'apple');
            const q = encodeURIComponent(b.dataset.q);
            window.open(prov === 'google' ? 'https://www.google.com/maps/search/?api=1&query=' + q : 'https://maps.apple.com/?q=' + q, '_blank', 'noopener');
          });
          const c = s.querySelector('[data-carte]');
          if (c) c.onclick = () => chercherSurCarte(what);
        }
      });
    } catch (e) {
      UI.closeSheet();
      UI.echecIA(e, { titre: "Pas d'adresses pour le moment", reessayer: () => whereToBuy(what), repli: repli });
    }
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

     Elle change tout : une carte avec un visage se reconnaît sans
     lire, une carte sans visage se lit. Elle est donc proposée dès
     la création, et modifiable ensuite depuis « Modifier ».
     ============================================================ */
  async function proposerPhoto(id, nom) {
    const ok = await UI.confirmSheet('Une photo de ' + nom + ' ?',
      'Elle apparaîtra sur sa carte.' + (global.Cloud && Cloud.ready()
        ? ' Avec ton compte, elle est aussi sauvegardée en ligne pour tes autres appareils.'
        : ' Elle reste sur cet appareil.'), false);
    if (ok) choisirPhoto(id);
  }

  function choisirPhoto(id) {
    Photos.choisir(async (f) => {
      if (!f) return;
      UI.toast('Enregistrement…');
      await enregistrerPhoto(id, f);
    });
  }

  /* Enregistre la photo (fichier ou data:) et remplace l'ancienne.
     Le stockage local peut échouer (navigation privée, mémoire
     pleine) : on le dit au lieu de rester sur « Enregistrement… ». */
  async function enregistrerPhoto(id, f) {
    const avant = Store.find('people', id);
    try {
      const saved = await Photos.save(f, 'people', 700);
      if (avant) effacerPhoto(avant);
      Store.put('people', id, { photo: saved.id, photoUrl: saved.url || null });
      UI.haptic('success'); UI.toast('Photo enregistrée');
      render();
      return true;
    } catch (e) {
      console.warn('[EVER] photo du proche', e);
      UI.haptic('warning');
      UI.toast('Photo impossible à enregistrer');
      return false;
    }
  }

  /* Retire la photo d'une fiche : copie locale et copie en ligne. */
  function effacerPhoto(p) {
    if (!p) return;
    if (p.photo) Photos.del(p.photo).catch(() => {});
    const url = p.photoUrl || '';
    const i = url.indexOf('/ever-people/');
    if (i >= 0 && global.Cloud && Cloud.ready()) {
      Cloud.deleteImage('people', decodeURIComponent(url.slice(i + '/ever-people/'.length).split('?')[0])).catch(() => {});
    }
  }

  const acts = {
    addPerson: async () => {
      const r = await UI.promptSheet("Ajouter quelqu'un", [
        { name: 'nom', label: 'Prénom' },
        { name: 'relation', label: 'Relation', type: 'tiles', options: [
            { v: 'copine', n: 'Copine', ph: 'couple' }, { v: 'frère', n: 'Frère', ph: 'fratrie' }, { v: 'sœur', n: 'Sœur', ph: 'fratrie' },
            { v: 'mère', n: 'Mère', ph: 'parent' }, { v: 'père', n: 'Père', ph: 'parent' }, { v: 'ami', n: 'Ami', ph: 'ami' },
            { v: 'amie', n: 'Amie', ph: 'ami' }, { v: 'enfant', n: 'Enfant', ph: 'enfant' },
            { v: 'grand-parent', n: 'Grand-parent', ph: 'grands-parents' }, { v: 'collègue', n: 'Collègue', ph: 'collegue' },
            { v: 'autre', n: 'Autre', ph: 'cadeau' } ] },
        { name: 'date', label: 'Date importante', type: 'date', value: '' }
      ], { submit: 'Ajouter', photo: 'cadeau', teinte: ['#9C3D54', '#D0667E'] });
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
        { name: 'relation', label: 'Relation', type: 'tiles', value: p.relation || 'autre', options: [
            { v: 'copine', n: 'Copine', ph: 'couple' }, { v: 'frère', n: 'Frère', ph: 'fratrie' }, { v: 'sœur', n: 'Sœur', ph: 'fratrie' },
            { v: 'mère', n: 'Mère', ph: 'parent' }, { v: 'père', n: 'Père', ph: 'parent' }, { v: 'ami', n: 'Ami', ph: 'ami' },
            { v: 'amie', n: 'Amie', ph: 'ami' }, { v: 'enfant', n: 'Enfant', ph: 'enfant' },
            { v: 'grand-parent', n: 'Grand-parent', ph: 'grands-parents' }, { v: 'collègue', n: 'Collègue', ph: 'collegue' },
            { v: 'autre', n: 'Autre', ph: 'cadeau' } ] },
        { name: 'date', label: 'Date importante', type: 'date', value: p.date || '' },
        { name: 'photo', label: 'Photo', type: 'photo', apercu: (p.photo || p.photoUrl) ? p : null }
      ], { submit: 'Enregistrer', photo: 'cadeau', teinte: ['#9C3D54', '#D0667E'], sub: p.nom, pasDeFocus: true });
      if (!r) return;
      const id = personId;
      Store.put('people', id, { nom: (r.nom || '').trim() || p.nom, relation: r.relation, date: r.date });
      if (r.photo === '__suppr__') {
        effacerPhoto(Store.find('people', id));
        Store.put('people', id, { photo: null, photoUrl: null });
      } else if (/^data:/.test(r.photo || '')) {
        UI.toast('Enregistrement…');
        await enregistrerPhoto(id, r.photo);
        return;
      }
      render();
    },
    delPerson: async () => {
      const p = Store.find('people', personId);
      if (!p) return;
      const ok = await UI.confirmSheet('Supprimer ' + p.nom + ' ?',
        'Sa fiche, sa liste de cadeaux, ses goûts et les suggestions seront supprimés.', true);
      if (!ok) return;
      gifts(p.id).forEach((g) => Store.del('gifts', g.id));
      hints(p.id).forEach((h) => Store.del('giftHints', h.id));
      sugg(p.id).forEach((x) => Store.del('giftIdeas', x.id));
      effacerPhoto(p);
      Store.del('people', p.id);
      personId = null;
      Store.set('lastPerson', null);
      UI.haptic('warning');
      UI.toast(p.nom + ' supprimé de tes proches');
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
        { name: 'prix', label: 'Budget', placeholder: '40 à 60 euros' },
        { name: 'note', label: 'Note', placeholder: 'Facultatif' }
      ], 'Ajouter');
      if (!r || !r.nom) return;
      Store.add('gifts', { person: personId, nom: r.nom, cat: r.cat, prix: r.prix, note: r.note });
      render();
    },
    addHint: async () => {
      const r = await UI.promptSheet('Un de ses goûts', [
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
