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
    { k: 'a_savoir',      nom: 'À savoir',            icon: 'info',    type: 'list' },
    { k: 'histoire',      nom: 'Histoire',            icon: 'book',    type: 'text' },
    { k: 'culture',       nom: 'Culture',             icon: 'book',    type: 'text' },
    { k: 'connue_pour',   nom: 'Pourquoi elle est connue', icon: 'star', type: 'text' },
    { k: 'a_voir',        nom: 'À voir',              icon: 'eye',     type: 'places' },
    { k: 'a_faire',       nom: 'À faire',             icon: 'activity', type: 'places' },
    { k: 'ou_manger',     nom: 'Où manger',           icon: 'fork',    type: 'places' },
    { k: 'ou_boire',      nom: 'Où boire un verre',   icon: 'glass',   type: 'places' },
    { k: 'ou_cafe',       nom: 'Ou prendre un cafe',  icon: 'coffee',  type: 'places' },
    { k: 'ou_sortir',     nom: 'Où sortir',           icon: 'sparkle', type: 'places' },
    { k: 'shopping',      nom: 'Shopping',            icon: 'bag',     type: 'places' },
    { k: 'bons_plans',    nom: 'Bons plans',          icon: 'target',  type: 'list' },
    { k: 'insolite',      nom: 'Les coins que tout le monde ne connaît pas', icon: 'map', type: 'places' },
    { k: 'pratique',      nom: 'Pratique',            icon: 'settings', type: 'list' }
  ];

  const CONTEXTES = [
    { id: 'auto',    nom: 'Peu importe' },
    { id: 'solo',    nom: 'Seul' },
    { id: 'couple',  nom: 'À deux' },
    { id: 'amis',    nom: 'Entre amis' },
    { id: 'famille', nom: 'En famille' }
  ];
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

    root.innerHTML = '<div class="wrap">' +
      header() +
      (at ? '<div class="section" style="padding-bottom:0"><div class="banner" style="padding:9px 12px;font-size:12px">' +
        Icon('clock', 16) + '<span>Guide écrit le ' + UI.esc(UI.fmt.date(at)) + ' pour la saison en cours. ' +
        'Les horaires et les adresses changent : vérifie avant de te déplacer.</span></div></div>' : '') +
      fiveThings() +
      mustSee() +
      SECTIONS.map(section).join('') +
      '<div class="section"><div class="list">' +
        '<button class="rowitem" data-act="roue"><span class="ic">' + Icon('dice', 17) + '</span>' +
          '<span class="tx"><b>Faire tourner la roue ici</b><small>Une activité au hasard a ' + UI.esc(city) + '</small></span>' +
          '<span class="rt">' + Icon('next', 15) + '</span></button>' +
        '<button class="rowitem" data-act="refresh"><span class="ic">' + Icon('refresh', 17) + '</span>' +
          '<span class="tx"><b>Actualiser le guide</b><small>' + (at ? 'Généré le ' + UI.fmt.dateShort(at) : '') + '</small></span>' +
          '<span class="rt">' + Icon('next', 15) + '</span></button>' +
      '</div>' +
      '<p class="muted" style="font-size:11px;margin-top:12px;line-height:1.5">Guide généré par IA à partir de connaissances generales. ' +
      'Les horaires et les établissements changent : vérifie avant de te déplacer.</p></div>' +
      '</div>';
    bindHeader(); bindBody();
  }

  function header() {
    return '<div class="section" style="padding:16px 0 0">' +
      '<div class="row-between">' +
        '<div><b style="font-size:24px;letter-spacing:-.03em;display:block">' + UI.esc(city) + '</b>' +
        '<small class="muted">Guide · ' + UI.esc(UI.day.season()) + '</small></div>' +
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
        '<div class="card" data-place="' + UI.attr(x.nom) + '" style="cursor:pointer">' +
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
      '<div class="rowitem" data-place="' + UI.attr(x.nom) + '">' +
      '<span class="ic">' + Icon(s.icon, 17) + '</span>' +
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
        UI.empty('key', 'Clé Gemini requise', 'Le guide est ecrit a la demande. Ajoute ta clé dans Réglages, elle reste sur ton telephone.') +
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
                  '<button class="btn sm primary" data-go>' + Icon('map', 15) + 'Y aller</button>' +
                  '<button class="btn sm" data-keep>' + Icon('star', 15) + 'Garder</button>' +
                '</div></div></div>';
              out.querySelector('[data-go]').onclick = () => {
                const prov = Store.get('mapsProvider', 'apple');
                const q = encodeURIComponent(r.nom + ' ' + (r.adresse || city));
                window.open(prov === 'google' ? 'https://www.google.com/maps/search/?api=1&query=' + q : 'https://maps.apple.com/?q=' + q, '_blank', 'noopener');
              };
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
      const prov = Store.get('mapsProvider', 'apple');
      const q = encodeURIComponent(el.dataset.place + ' ' + city);
      window.open(prov === 'google' ? 'https://www.google.com/maps/search/?api=1&query=' + q : 'https://maps.apple.com/?q=' + q, '_blank', 'noopener');
    });
    root.querySelectorAll('[data-savep]').forEach((b) => b.onclick = (e) => {
      e.stopPropagation();
      let p; try { p = JSON.parse(b.dataset.savep); } catch (err) { return; }
      const place = Ctx.place();
      Store.add('places', Object.assign(p, { city: slug(city), source: 'guide', lat: place.lat, lon: place.lon }));
      UI.haptic('light'); UI.toast('Ajoute a mes établissements');
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
            '<button class="rowitem" data-i="' + i + '"><span class="ic">' + Icon('pin', 17) + '</span>' +
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
