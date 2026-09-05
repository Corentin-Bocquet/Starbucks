/* ============================================================
   EVER — Guide de ville

   Un Routard court, ecrit a la demande pour la ville choisie, la
   saison en cours et la date du jour. Ce n'est pas une
   encyclopedie : c'est ce qu'on veut savoir en arrivant.

   Le guide est mis en cache par ville et par saison, et affiche
   sa date de génération. On peut le rafraichir a la main.
   ============================================================ */
(function (global) {
  'use strict';

  let root = null, city = null, data = null;

  const SECTIONS = [
    { k: 'a_savoir',      nom: 'À savoir',            icon: 'info',    art: 'livre',      type: 'list',   ph: 'guide' },
    { k: 'histoire',      nom: 'Histoire',            icon: 'book',    art: 'livre',      type: 'text',   ph: 'old town heritage' },
    { k: 'culture',       nom: 'Culture',             icon: 'book',    art: 'carte',      type: 'text',   ph: 'culture' },
    { k: 'connue_pour',   nom: 'Pourquoi elle est connue', icon: 'star', art: 'etoile',   type: 'text',   ph: 'landmark famous' },
    { k: 'a_voir',        nom: 'À voir',              icon: 'eye',     art: 'lieu',       type: 'places', ph: 'monument' },
    { k: 'a_faire',       nom: 'À faire',             icon: 'activity', art: 'ballon',    type: 'places', ph: 'activite' },
    { k: 'ou_manger',     nom: 'Où manger',           icon: 'fork',    art: 'marmite',    type: 'places', ph: 'restaurant' },
    { k: 'ou_boire',      nom: 'Où boire un verre',   icon: 'glass',   art: 'verre',      type: 'places', ph: 'bar' },
    { k: 'ou_cafe',       nom: 'Où prendre un café',  icon: 'coffee',  art: 'tasse',      type: 'places', ph: 'cafe' },
    { k: 'ou_sortir',     nom: 'Où sortir',           icon: 'sparkle', art: 'eclair',     type: 'places', ph: 'soiree' },
    { k: 'shopping',      nom: 'Shopping',            icon: 'bag',     art: 'cadeau',     type: 'places', ph: 'shopping' },
    { k: 'bons_plans',    nom: 'Bons plans',          icon: 'target',  art: 'cible',      type: 'list',   ph: 'budget' },
    { k: 'insolite',      nom: 'Les coins discrets',  icon: 'map',     art: 'loupe',      type: 'places', ph: 'hidden alley' },
    { k: 'pratique',      nom: 'Pratique',            icon: 'settings', art: 'roue',      type: 'list',   ph: 'train station' }
  ];
  const CONTEXTES = [
    { id: 'auto',    nom: 'Peu importe' },
    { id: 'solo',    nom: 'Seul' },
    { id: 'couple',  nom: 'À deux' },
    { id: 'amis',    nom: 'Entre amis' },
    { id: 'famille', nom: 'En famille' }
  ];
  const SAISON = { hiver: 'hiver', printemps: 'printemps', ete: 'été', automne: 'automne' };
  const contexte = () => Store.get('guideContexte', 'auto');
  const cacheKey = (name, season) => 'guide:' + name.toLowerCase() + ':' + season + ':' + contexte();

  function prep(name, kind) {
    const n = String(name || '');
    if (/^Le /i.test(n))  return (kind === 'de' ? 'du ' : 'au ') + n.slice(3);
    if (/^Les /i.test(n)) return (kind === 'de' ? 'des ' : 'aux ') + n.slice(4);
    if (/^La /i.test(n))  return (kind === 'de' ? 'de la ' : 'à la ') + n.slice(3);
    if (/^L'/i.test(n))   return (kind === 'de' ? "de l'" : "à l'") + n.slice(2);
    return (kind === 'de' ? 'de ' : 'à ') + n;
  }

  function mount(el, rest) {
    root = el;
    const slug = rest && rest[0];
    city = slug ? unslug(slug) : (Ctx.place().name || 'Le Touquet');
    load();
  }
  const unslug = (s) => ({ 'le-touquet': 'Le Touquet', 'meribel': 'Méribel' })[s] || s.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

  function load() {
    const season = UI.day.season();
    const cached = Store.get(cacheKey(city, season), null);
    data = cached ? cached.data : null;
    render(cached ? cached.at : null);
    if (!data) generate();
  }

  function render(at) {
    if (!data) {
      root.innerHTML = '<div class="wrap">' + header() +
        '<div class="section"><div class="panel" style="text-align:center;padding:30px 18px">' +
        UI.thinking('Écriture du guide ' + prep(city, 'de') + '…') +
        '<p class="muted" style="font-size:12.5px;margin-top:8px">Une dizaine de secondes, une seule fois par saison.</p>' +
        '</div></div></div>';
      bindHeader();
      return;
    }

    /* ============================================================
       Le guide, en cartes

       Le contenu ne bouge pas : c'est la forme qui changeait tout.
       Quatorze sections empilees les unes sous les autres se
       parcourent au pouce pendant une minute avant de trouver
       « ou boire un verre ». En cartes, on voit tout d'un coup et
       on ouvre celle qu'on veut.
       ============================================================ */
    const dispo = SECTIONS.filter((sec) => {
      const v = data[sec.k];
      return v && (Array.isArray(v) ? v.length : String(v).trim());
    });

    root.innerHTML = '<div class="wrap">' +
      header() +
      (at ? '<div class="section" style="padding-bottom:0"><div class="banner" style="padding:9px 12px;font-size:12px">' +
        Icon('clock', 16) + '<span>Guide écrit le ' + UI.esc(UI.fmt.date(at)) + ' pour la saison en cours. ' +
        'Vérifie les horaires avant de te déplacer.</span></div></div>' : '') +
      fiveThings() +
      mustSee() +
      '<div class="section">' +
        '<div class="secbar"><h2>Le guide ' + UI.esc(prep(city, 'de')) + '</h2></div>' +
        Cartes.grille(dispo.map((sec) => ({
          id: sec.k, titre: sec.nom, ph: sec.ph + ' ' + city, type: 'lieu',
          sous: Array.isArray(data[sec.k]) ? data[sec.k].length + ' entrées' : 'À lire'
        }))) +
      '</div>' +
      Portes.section('', [
        { act: 'roue',    nom: 'Tourner ici', sub: 'Une activité au hasard', ph: 'hasard' },
        { act: 'refresh', nom: 'Actualiser',  sub: at ? UI.fmt.dateShort(at) : 'Réécrire le guide', ph: 'refresh arrows' }
      ]) +
      '<div class="section" style="padding-top:0"><p class="muted" style="font-size:11px;line-height:1.5">' +
      'Guide écrit par IA. Les horaires et les établissements changent.</p></div>' +
      '</div>';

    bindHeader(); bindBody();
    if (global.Stock) Stock.peupler(root);

    root.querySelectorAll('[data-kart]').forEach((b) => b.onclick = () => {
      const sec = SECTIONS.find((x) => x.k === b.dataset.kart);
      if (sec) ouvrirSection(sec);
    });
  }

  /* Une section du guide, dans sa pop-up. Les lieux y sont des
     cartes ; toucher une carte ouvre la fiche avec sa carte
     geographique, et la fleche ramene a la section. */
  function ouvrirSection(sec) {
    const v = data[sec.k];
    const teinte = ['#7A2E54', '#BE5F8C'];

    if (sec.type === 'text') {
      Cartes.ouvrir({
        tete: Cartes.tete(sec.nom, UI.esc(city), teinte, sec.art),
        corps: '<p class="textelong">' + UI.esc(v) + '</p>'
      });
      return;
    }
    if (sec.type === 'list') {
      Cartes.ouvrir({
        tete: Cartes.tete(sec.nom, v.length + ' points', teinte, sec.art),
        corps: '<ol class="listelong">' + v.map((x) => '<li>' + UI.esc(x) + '</li>').join('') + '</ol>'
      });
      return;
    }

    Cartes.ouvrir({
      tete: Cartes.tete(sec.nom, v.length + ' adresses ' + prep(city), teinte, sec.art),
      corps: Cartes.grille(v.map((x, i) => ({
        id: 'p' + i, titre: x.nom, sous: x.description || x.adresse || '',
        ph: x.nom + ' ' + city, type: 'lieu'
      }))),
      onCarte: (id) => {
        const x = v[Number(String(id).slice(1))];
        if (!x) return;
        ouvrirLieuGuide(x, sec);
      }
    });
  }

  /* La fiche d'un lieu du guide : la carte geographique en haut,
     jamais un rectangle gris. */
  function ouvrirLieuGuide(x, sec) {
    Cartes.empiler({
      tete: Cartes.tete(x.nom, sec.nom, ['#1F5E93', '#4E93CE'], sec.art),
      corps:
        '<div class="minicarte" data-mini></div>' +
        (x.description ? '<p class="mdesc" style="margin-top:14px">' + UI.esc(x.description) + '</p>' : '') +
        (x.adresse ? '<p class="aide">' + UI.esc(x.adresse) + '</p>' : '') +
        '<div class="btnrow" style="margin-top:16px">' +
          '<button class="btn primary grow lg" data-plan>' + Icon('map', 17) + 'Voir le plan</button>' +
          '<button class="btn lg" data-gard aria-label="Garder">' + Icon('star', 17) + '</button>' +
        '</div>',
      onMount: (sh) => {
        if (global.MapPick && MapPick.mini) {
          MapPick.mini(sh.querySelector('[data-mini]'),
            { nom: x.nom, adresse: [x.adresse, city].filter(Boolean).join(', ') });
        }
        sh.querySelector('[data-plan]').onclick = () => {
          UI.closeSheet();
          MapPick.fiche({ nom: x.nom, adresse: x.adresse, ville: city, categorie: sec.nom, pitch: x.description });
        };
        sh.querySelector('[data-gard]').onclick = () => {
          Store.add('places', { nom: x.nom, kind: kindOf(sec.k), adresse: x.adresse || '',
            city: slug(city), source: 'guide' });
          UI.haptic('success'); UI.toast('Gardé dans tes adresses');
        };
      }
    });
  }

  function header() {
    return '<div class="section" style="padding:16px 0 0">' +
      '<div class="row-between">' +
        '<div><b style="font-size:24px;letter-spacing:-.03em;display:block">' + UI.esc(city) + '</b>' +
        '<small class="muted">Guide · ' + UI.esc(SAISON[UI.day.season()] || UI.day.season()) + '</small></div>' +
        '<button class="tbtn" data-city aria-label="Changer de ville">' + Icon('search', 18) + '</button>' +
      '</div>' +
      '<div class="chips" style="margin-top:12px">' + CONTEXTES.map((c) =>
        '<button class="chip ' + (contexte() === c.id ? 'on' : '') + '" data-ctxt="' + c.id + '">' + UI.esc(c.nom) + '</button>').join('') +
      '</div></div>';
  }

  function fiveThings() {
    const l = data.cinq_choses || [];
    if (!l.length) return '';
    return '<div class="section"><div class="panel" style="background:var(--accent-soft)">' +
      '<h3 style="font-size:15px;margin-bottom:10px;display:flex;align-items:center;gap:8px">' + Icon('sparkle', 17) + 'Cinq choses a savoir</h3>' +
      '<ol style="padding-left:20px">' + l.map((x) => '<li style="margin-bottom:8px;font-size:14px;line-height:1.5">' + UI.esc(x) + '</li>').join('') + '</ol>' +
      '</div></div>';
  }

  function mustSee() {
    const l = data.a_ne_pas_manquer || [];
    if (!l.length) return '';
    return '<div class="section"><div class="sechead"><h2 style="font-size:17px">À ne pas manquer</h2></div>' +
      '<div class="grid tight">' + l.map((x) =>
        '<div class="card" data-place="' + UI.attr(x.nom) + '" data-pitch="' + UI.attr(x.description || '') + '" data-adresse="' + UI.attr(x.adresse || '') + '" data-cat="À ne pas manquer" style="cursor:pointer">' +
        '<div class="bd" style="padding:14px">' +
        '<h3 style="font-size:15px">' + UI.esc(x.nom) + '</h3>' +
        '<p class="muted" style="font-size:12.5px;margin-top:6px;line-height:1.45">' + UI.esc(x.description || '') + '</p>' +
        (x.distance ? '<div class="meta"><span>' + UI.esc(x.distance) + '</span></div>' : '') +
        '</div></div>').join('') + '</div></div>';
  }

  function section(s) {
    const v = data[s.k];
    if (!v || (Array.isArray(v) && !v.length)) return '';
    let body;
    if (s.type === 'text') body = '<p style="font-size:14px;line-height:1.6;color:var(--ink-2)">' + UI.esc(v) + '</p>';
    else if (s.type === 'list') body = '<ul style="padding-left:19px">' + v.map((x) => '<li style="margin-bottom:7px;font-size:13.8px;line-height:1.5">' + UI.esc(x) + '</li>').join('') + '</ul>';
    else body = '<div class="list">' + v.map((x) =>
      '<div class="rowitem" data-place="' + UI.attr(x.nom) + '" data-pitch="' + UI.attr(x.description || '') + '" data-adresse="' + UI.attr(x.adresse || '') + '" data-cat="' + UI.attr(s.nom) + '">' +
      (global.Stock ? Stock.ic(x.nom + ' ' + s.nom, { classe: 'vignligne', type: 'lieu' })
                    : '<span class="ic">' + Icon(s.icon, 17) + '</span>') +
      '<span class="tx"><b>' + UI.esc(x.nom) + '</b><small>' + UI.esc(x.description || '') + '</small></span>' +
      '<button class="rt" data-savep=\'' + UI.attr(JSON.stringify({ nom: x.nom, kind: kindOf(s.k), adresse: x.adresse || '' })) + '\'>' + Icon('star', 15) + '</button>' +
      '</div>').join('') + '</div>';

    return '<div class="section"><div class="sechead"><h2 style="font-size:16px;display:flex;align-items:center;gap:8px">' + Icon(s.icon, 17) + UI.esc(s.nom) + '</h2></div>' +
      '<div class="panel">' + body + '</div></div>';
  }

  const kindOf = (k) => ({ ou_manger: 'restaurant', ou_boire: 'bar', ou_cafe: 'cafe', shopping: 'shopping', ou_sortir: 'bar', a_voir: 'monument', a_faire: 'autre', insolite: 'monument' })[k] || 'autre';

  /* ---------- Génération ---------- */
  const SCHEMA = AI.T.obj({
    cinq_choses: AI.T.arr(AI.T.str(''), 'Exactement cinq informations utiles ou surprenantes'),
    a_savoir: AI.T.arr(AI.T.str(''), 'Informations essentielles, quatre a six'),
    histoire: AI.T.str('Un paragraphe, l essentiel seulement'),
    culture: AI.T.str('Un paragraphe sur les particularites locales'),
    connue_pour: AI.T.str('Deux phrases'),
    a_voir: AI.T.arr(AI.T.obj({ nom: AI.T.str(''), description: AI.T.str('Une ligne'), adresse: AI.T.str('') }), 'Cinq maximum'),
    a_faire: AI.T.arr(AI.T.obj({ nom: AI.T.str(''), description: AI.T.str(''), adresse: AI.T.str('') }), 'Cinq maximum'),
    ou_manger: AI.T.arr(AI.T.obj({ nom: AI.T.str(''), description: AI.T.str(''), adresse: AI.T.str('') }), 'Cinq maximum'),
    ou_boire: AI.T.arr(AI.T.obj({ nom: AI.T.str(''), description: AI.T.str(''), adresse: AI.T.str('') }), 'Cinq maximum'),
    ou_cafe: AI.T.arr(AI.T.obj({ nom: AI.T.str(''), description: AI.T.str(''), adresse: AI.T.str('') }), 'Trois maximum'),
    ou_sortir: AI.T.arr(AI.T.obj({ nom: AI.T.str(''), description: AI.T.str(''), adresse: AI.T.str('') }), 'Trois maximum'),
    shopping: AI.T.arr(AI.T.obj({ nom: AI.T.str(''), description: AI.T.str(''), adresse: AI.T.str('') }), 'Trois maximum'),
    bons_plans: AI.T.arr(AI.T.str(''), 'Quatre conseils concrets'),
    insolite: AI.T.arr(AI.T.obj({ nom: AI.T.str(''), description: AI.T.str(''), adresse: AI.T.str('') }), 'Trois maximum'),
    a_ne_pas_manquer: AI.T.arr(AI.T.obj({ nom: AI.T.str(''), description: AI.T.str(''), distance: AI.T.str('') }), 'Trois maximum'),
    pratique: AI.T.arr(AI.T.str(''), 'Transport, stationnement, meilleure période, spécificités')
  }, ['cinq_choses', 'a_savoir', 'connue_pour']);

  async function generate(force) {
    if (!AI.available()) {
      root.innerHTML = '<div class="wrap">' + header() + '<div class="section">' +
        UI.empty('key', 'Clé Gemini requise', "Le guide est écrit à la demande. Ajoute ta clé dans Réglages, elle reste sur ton téléphone.") +
        '<button class="btn primary block" data-act="settings">Ouvrir les réglages</button></div></div>';
      bindHeader();
      const b = root.querySelector('[data-act="settings"]');
      if (b) b.onclick = () => App.go('#/m/settings/ia');
      return;
    }
    const season = UI.day.season();
    try {
      const res = await AI.json(
        "Ecris un guide court et utile de " + city + ", pour quelqu'un qui vient d'arriver.\n\n" +
        "Contexte : nous sommes en " + season + ", le " + new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) + ".\n" +
        (contexte() !== 'auto' ? "Le visiteur vient " + ({ solo: 'seul', couple: 'à deux', amis: 'entre amis', famille: 'en famille avec des enfants' })[contexte()] + " : adapte les sélections sans jamais le mentionner explicitement.\n" : '') +
        "\n" +
        "Règles :\n" +
        "- Qualite plutôt que quantite : quelques lignes justes valent mieux qu'une liste longue.\n" +
        "- Mets en avant ce qui a du sens a cette saison.\n" +
        "- N'invente aucun établissement. Si tu n'es pas sur, mets moins d'entrées.\n" +
        "- Pas de superlatifs creux, pas de ton d'office de tourisme.\n" +
        "- Une ligne par lieu, précise et concrete.\n" +
        "- Réponds en francais.",
        SCHEMA, { cache: !force, ttl: 30 * 86400e3, temperature: 0.7 });
      data = res;
      Store.set(cacheKey(city, season), { at: Date.now(), data: res });
      if (global.Game) Game.award('guide', 12);
      render(Date.now());
    } catch (e) {
      root.innerHTML = '<div class="wrap">' + header() + '<div class="section">' +
        UI.empty('alert', 'Guide indisponible', AI.humanError(e)) + '</div></div>';
      bindHeader();
    }
  }

  /* La roue depuis le guide : elle tire dans les listes du guide
     lui-même, pas dans les activités génériques. C'est ce qui rend
     le guide utile le premier jour dans une ville inconnue. */
  const SPINNABLE = [
    { k: 'ou_manger', nom: 'Un restaurant', icon: 'fork', kind: 'restaurant' },
    { k: 'ou_boire',  nom: 'Un bar',        icon: 'glass', kind: 'bar' },
    { k: 'ou_cafe',   nom: 'Un café',       icon: 'coffee', kind: 'cafe' },
    { k: 'a_faire',   nom: 'Une activité',  icon: 'activity', kind: 'autre' },
    { k: 'a_voir',    nom: 'Un lieu à voir', icon: 'pin', kind: 'monument' }
  ];

  function spinFromGuide() {
    const avail = SPINNABLE.filter((s) => (data[s.k] || []).length);
    if (!avail.length) { UI.toast('Le guide n\'a rien à faire tourner'); return; }

    UI.openSheet('<div class="mbody" style="padding-top:6px">' +
      '<h2 style="font-size:22px;margin-bottom:4px">Faire tourner la roue</h2>' +
      '<p class="secdesc">Dans les sélections du guide ' + UI.esc(prep(city, 'de')) + '.</p>' +
      '<div class="list">' + avail.map((s, i) =>
        '<button class="rowitem" data-s="' + i + '"><span class="ic">' + Icon(s.icon, 17) + '</span>' +
        '<span class="tx"><b>' + UI.esc(s.nom) + '</b><small>' + (data[s.k] || []).length + ' dans le guide</small></span>' +
        '<span class="rt">' + Icon('next', 15) + '</span></button>').join('') + '</div>' +
      '<div id="guideRoul" style="margin-top:16px"></div></div>', {
      onMount: (sheet) => {
        sheet.querySelectorAll('[data-s]').forEach((b) => b.onclick = () => {
          const sec = avail[+b.dataset.s];
          const rows = (data[sec.k] || []).map((x, i) => ({
            id: 'g' + i, label: x.nom, nom: x.nom, icon: sec.icon,
            description: x.description, adresse: x.adresse || '', kind: sec.kind
          }));
          const box = sheet.querySelector('#guideRoul');
          Roulette.mount(box, {
            items: () => rows,
            cta: 'TOURNER',
            onResult: (r, out) => {
              out.innerHTML = '<div class="result"><div class="rbody">' +
                '<div class="rkick">' + UI.esc(sec.nom) + '</div>' +
                '<h3>' + UI.esc(r.nom) + '</h3>' +
                (r.description ? '<p class="muted" style="font-size:13.5px;margin-top:6px">' + UI.esc(r.description) + '</p>' : '') +
                (r.adresse ? '<div class="rmeta"><span>' + UI.esc(r.adresse) + '</span></div>' : '') +
                '<div class="ract">' +
                  '<button class="btn sm primary" data-go>' + Icon('location', 15) + 'Voir sur la carte</button>' +
                  '<button class="btn sm" data-keep>' + Icon('star', 15) + 'Garder</button>' +
                '</div></div></div>';
              /* On ouvre la fiche du lieu dans l'application, avec
                 sa carte, plutot que de partir directement dehors. */
              out.querySelector('[data-go]').onclick = () => MapPick.fiche({
                nom: r.nom, adresse: r.adresse || '', ville: city,
                pitch: r.description || '', categorie: r.kind || ''
              });
              out.querySelector('[data-keep]').onclick = () => {
                const place = Ctx.place();
                Store.add('places', { nom: r.nom, kind: r.kind, adresse: r.adresse, city: slug(city), source: 'guide', lat: place.lat, lon: place.lon });
                UI.toast('Ajouté à mes établissements');
              };
              Store.log('etablissement', { id: r.id, label: r.nom });
            }
          });
          box.scrollIntoView({ behavior: 'smooth', block: 'center' });
        });
      }
    });
  }

  function bindHeader() {
    const b = root.querySelector('[data-city]');
    if (b) b.onclick = pickCity;
    root.querySelectorAll('[data-ctxt]').forEach((x) => x.onclick = () => {
      Store.set('guideContexte', x.dataset.ctxt);
      UI.haptic('select');
      load();
    });
  }

  function bindBody() {
    root.querySelectorAll('[data-place]').forEach((el) => el.onclick = (e) => {
      if (e.target.closest('[data-savep]')) return;
      MapPick.fiche({
        nom: el.dataset.place, ville: city,
        adresse: el.dataset.adresse || '',
        pitch: el.dataset.pitch || '',
        categorie: el.dataset.cat || ''
      });
    });
    root.querySelectorAll('[data-savep]').forEach((b) => b.onclick = (e) => {
      e.stopPropagation();
      let p; try { p = JSON.parse(b.dataset.savep); } catch (err) { return; }
      const place = Ctx.place();
      Store.add('places', Object.assign(p, { city: slug(city), source: 'guide', lat: place.lat, lon: place.lon }));
      UI.haptic('light'); UI.toast('Ajouter à mes adresses');
    });
    root.querySelectorAll('[data-act]').forEach((b) => b.onclick = () => {
      if (b.dataset.act === 'refresh') { data = null; render(); generate(true); }
      if (b.dataset.act === 'roue') spinFromGuide();
    });
  }
  const slug = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-');

  function pickCity() {
    UI.openSheet('<div class="mbody" style="padding-top:6px"><h2 style="font-size:22px;margin-bottom:12px">Quelle ville ?</h2>' +
      '<label class="search" style="box-shadow:var(--sh-inset)">' + Icon('search', 17) +
      '<input data-q placeholder="Paris, Lisbonne, Méribel…" autocomplete="off"></label>' +
      '<div data-res style="margin-top:12px"></div></div>', {
      onMount: (s) => {
        const q = s.querySelector('[data-q]'), out = s.querySelector('[data-res]');
        setTimeout(() => q.focus(), 260);
        q.oninput = UI.debounce(async () => {
          if (q.value.trim().length < 2) { out.innerHTML = ''; return; }
          out.innerHTML = UI.thinking('Recherche…');
          const r = await Ctx.searchCity(q.value.trim());
          out.innerHTML = r.length ? '<div class="list">' + r.map((c, i) =>
            '<button class="rowitem" data-i="' + i + '">' +
            (global.MapPick && MapPick.vignette(c) || '<span class="ic">' + Icon('pin', 17) + '</span>') +
            '<span class="tx"><b>' + UI.esc(c.name) + '</b><small>' + UI.esc(c.label) + '</small></span></button>').join('') + '</div>'
            : '<p class="muted" style="font-size:13px">Aucun résultat.</p>';
          out.querySelectorAll('[data-i]').forEach((b) => b.onclick = () => {
            const c = r[+b.dataset.i];
            Ctx.setPlace(c); city = c.name; UI.closeSheet(); load();
          });
        }, 400);
      }
    });
  }

  App.register('city', { mount: mount });
  global.City = { mount };
})(window);
