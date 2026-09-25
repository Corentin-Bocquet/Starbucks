/* ============================================================
   EVER — Penderie et tenues

   Reprise du projet Outfit, avec ce qui lui manquait : un vrai
   stockage des photos et la couche IA.

   Le geste quotidien tient en une phrase : j'ouvre, je choisis un
   mood, l'app regarde la météo et me donne une tenue. Si elle ne
   me plait pas, j'en demande une autre.
   ============================================================ */
(function (global) {
  'use strict';

  let root = null, ctx = null, view = 'jour';

  const garments = () => Store.all('garments');
  const outfits  = () => Store.all('outfits');
  const bySlot   = (slot) => garments().filter((g) => g.slot === slot);

  function mount(el) {
    root = el;
    ctx = {
      place: Ctx.place(), weather: null, season: UI.day.season(),
      slot: UI.day.slot(), hour: new Date().getHours(),
      weekend: [0, 6].indexOf(new Date().getDay()) >= 0,
      date: UI.day.today(), budget: Store.get('budget', 2)
    };
    render();
    composerLeJour();
    Ctx.snapshot().then((full) => {
      if (!root.isConnected) return;
      ctx = full;
      if (full.weather) render();
    }).catch(() => {});

    /* Rattrapage discret : sur un appareil qui vient de se connecter,
       les images n'existent qu'en ligne. On les redescend en fond. */
    if (global.Cloud && Cloud.ready() && Store.all('garments').some((g) => g.photoUrl && !g.photo)) {
      Photos.sync('garments', 'photo', 'garments').then((r) => {
        if (r.down && root && root.isConnected) render();
      }).catch(() => {});
    }
  }

  function render() {
    root.innerHTML = '<div class="wrap">' +
      '<div class="seg full" style="margin-top:16px">' +
        [['jour', 'Aujourd\'hui'], ['penderie', 'Penderie'], ['tenues', 'Mes tenues']].map((v) =>
          '<button data-view="' + v[0] + '" class="' + (view === v[0] ? 'on' : '') + '">' + v[1] + '</button>').join('') +
      '</div>' +
      (view === 'jour' ? dayView() : view === 'penderie' ? wardrobeView() : outfitsView()) +
      '</div>';
    bind();
    Photos.hydrate(root);
  }

  /* ============================================================
     Aujourd'hui

     Tous les styles sont proposés d'office, sans rien demander :
     on ouvre l'onglet, les cinq tenues sont là. On peut en
     régénérer une seule ou toutes.

     Une bascule commande la source :
       - « Ma penderie » compose avec ce qu'on possède ;
       - « Inventer » demande à l'IA des tenues qu'on n'a pas
         forcément, pour donner des idées d'achat ou de
         combinaison.
     ============================================================ */
  const MODE = () => Store.get('tenueMode', 'penderie');
  const setMode = (m) => Store.set('tenueMode', m);

  function dayView() {
    const wx = ctx && ctx.weather;
    const mode = MODE();
    const jour = Store.get('tenuesJour', null);
    const frais = jour && jour.day === UI.day.today() && jour.mode === mode;
    const tenues = frais ? jour.tenues : null;

    return '<div class="section">' +
      (wx ? bandeauMeteo(wx) : '') +
      '<div class="bascule">' +
        '<button class="cote' + (mode === 'penderie' ? ' on' : '') + '" data-mode="penderie">' +
          Icon('shirt', 16) + 'Ma penderie</button>' +
        '<button class="cote' + (mode === 'inventer' ? ' on' : '') + '" data-mode="inventer">' +
          Icon('sparkle', 16) + 'Inventer</button>' +
      '</div>' +
      (mode === 'penderie' && garments().length < 3
        ? tenueDeBase(wx)
        : (tenues
            ? '<div class="carrousel" style="margin-top:14px">' + tenues.map(carteStyle).join('') + '</div>' +
              '<button class="btn block" style="margin-top:6px" data-act="regenererTout">' +
                Icon('refresh', 16) + 'Tout régénérer</button>'
            : '<div class="panel" style="text-align:center;margin-top:14px" data-attente>' +
              UI.thinking(mode === 'inventer' ? 'L\'IA compose…' : 'Composition…') + '</div>')) +
      '</div>';
  }

  /* ============================================================
     La tenue de base

     Une penderie vide affichait « Ta penderie est vide » et rien
     d'autre : l'onglet ne servait à rien le premier jour. On
     propose maintenant, toujours, une tenue qui colle à la météo,
     tirée de règles simples. Aucune IA, aucun réseau requis : elle
     s'affiche même hors ligne. Les vêtements ajoutés prennent le
     relais dès qu'il y en a trois.
     ============================================================ */
  function piecesDuTemps(wx) {
    const t = wx ? wx.temp : ({ hiver: 4, automne: 12, printemps: 15, ete: 25 })[UI.day.season()] || 15;
    const pluie = wx && /pluie|averse|orage|bruine|neige/i.test(wx.text || '');
    let p;
    if (t < 8)       p = { haut: 'Pull en laine', bas: 'Jean brut', manteau: 'Manteau chaud', chaussures: 'Boots en cuir' };
    else if (t < 15) p = { haut: 'Pull fin ou sweat', bas: 'Chino', manteau: 'Veste ou trench', chaussures: 'Baskets en cuir' };
    else if (t < 22) p = { haut: 'T-shirt ou chemise', bas: 'Chino ou jean', manteau: 'Surchemise pour le soir', chaussures: 'Baskets' };
    else             p = { haut: 'T-shirt léger ou lin', bas: 'Short ou pantalon en lin', manteau: null, chaussures: 'Sneakers en toile' };
    if (pluie) { p.manteau = 'Imperméable'; p.chaussures = 'Boots imperméables'; }
    return { t: t, pluie: pluie, p: p };
  }

  function tenueDeBase(wx) {
    const r = piecesDuTemps(wx);
    const slots = [['haut', 'Haut'], ['bas', 'Bas'], ['manteau', 'Veste'], ['chaussures', 'Chaussures']]
      .filter((x) => r.p[x[0]]);
    const conseil = r.pluie ? 'Il va pleuvoir : couvre-toi.'
      : r.t < 8 ? 'Il fait froid : superpose.'
      : r.t < 15 ? 'Frais : une couche en plus.'
      : r.t < 22 ? 'Doux : léger, avec une veste le soir.' : 'Chaud : matières légères.';
    return '<div class="section" style="padding-top:14px">' +
      '<div class="secbar"><h2>Ta tenue du jour</h2></div>' +
      '<p class="muted" style="font-size:13px;margin:-4px 0 12px">' + UI.esc(conseil) + '</p>' +
      '<div class="tenuebase">' + slots.map((x) =>
        '<div class="piece"><span class="pv">' + (global.Ic ? Ic.balise(x[0] === 'manteau' ? 'manteau' : x[0]) : '') + '</span>' +
        '<small>' + x[1] + '</small><b>' + UI.esc(r.p[x[0]]) + '</b></div>').join('') + '</div>' +
      '<div class="row" style="gap:8px;margin-top:12px">' +
        '<button class="btn primary grow" data-mode="inventer">' + Icon('sparkle', 16) + 'Des idées avec l\'IA</button>' +
        '<button class="btn" data-act="addGarment">' + Icon('camera', 16) + 'Mes vêtements</button>' +
      '</div>' +
      '<p class="muted" style="font-size:12px;margin-top:10px">Ajoute trois vêtements en photo, et EVER compose avec ce que tu as vraiment.</p>' +
      '</div>';
  }

  /* La carte météo de la maquette : la température en très grand,
     le ciel en une ligne, et un astre de verre à droite. */
  function bandeauMeteo(wx) {
    return '<div class="meteo-hero">' +
      '<div class="col-g">' +
        '<small>Aujourd\'hui · ' + UI.esc(ctx.place.name) + '</small>' +
        '<b class="t">' + wx.temp + '°</b>' +
        '<span>' + UI.esc(wx.text) + ' · ressenti ' + wx.feels + '°</span>' +
      '</div>' +
      '<span class="astre ' + (/pluie|averse|orage|bruine/i.test(wx.text || '') ? 'pluie' : (/nuage|couvert|brume|brouillard/i.test(wx.text || '') ? 'nuage' : 'soleil')) + '">' + Icon(wx.icon, 34) + '</span>' +
    '</div>';
  }

  /* Une carte par style. Modèle des maquettes : visuel, dégradé,
     surtitre, nom, puces, action. */
  /* ============================================================
     L'image d'une tenue

     Une mosaique de quatre bouts de vetements ne donne pas envie de
     cliquer : on voit un patchwork, pas une tenue. Une carte doit
     montrer UNE image, celle de la tenue portee.

     Trois niveaux, du meilleur au dernier recours :
       1. l'apercu genere avec le visage de Corentin, s'il existe ;
       2. sinon une image de la tenue sur un mannequin, dessinee a
          partir de la liste des pieces. Gratuite, sans cle, stable
          dans le temps : la meme tenue rend toujours la meme image ;
       3. sinon seulement, la photo d'une piece.
     ============================================================ */
  function resumePieces(t) {
    const p = (t.pieces || []).map((g) => (typeof g === 'string' ? g : g.nom)).filter(Boolean);
    return p.slice(0, 5).join(', ');
  }

  /* ============================================================
     L'image d'une tenue

     Plus aucune image dessinée par l'IA. Deux cas seulement :
       1. la photo que tu as prise de toi dans la tenue ;
       2. sinon, une mosaïque de mini-cartes : les pièces qui la
          composent (quatre au plus), chacune avec sa photo ou le
          visuel de sa catégorie.
     ============================================================ */
  const SLOT_VIS = { haut: 'haut', bas: 'bas', chaussures: 'chaussures', veste: 'veste',
    accessoire: 'accessoires', sousvetement: 'sous-vetement', chaussettes: 'chaussettes' };

  const piecesDe = (t) => (t.items && t.items.length
    ? t.items.map((id) => garments().find((g) => g.id === id)).filter(Boolean)
    : (t.pieces || [])).filter(Boolean);

  const court = (n) => { const x = String(n || '').trim(); return x.length > 22 ? x.slice(0, 21) + '…' : x; };

  function miniPiece(g) {
    const nom = typeof g === 'string' ? g : g.nom;
    const slot = typeof g === 'string' ? devinerSlot(g) : (g.slot || devinerSlot(g.nom));
    const aPhoto = typeof g !== 'string' && (g.photo || g.photoUrl);
    return '<span class="mini">' +
      '<span class="mvis' + (aPhoto ? ' photo' : '') + '">' +
        (aPhoto ? Photos.img(g, 'photo') : Vis.html(SLOT_VIS[slot] || 'haut')) + '</span>' +
      '<small>' + UI.esc(court(nom)) + '</small></span>';
  }

  function mosaique(pieces) {
    const l = (pieces || []).filter(Boolean).slice(0, 4);
    if (!l.length) return '<span class="mosaique n0">' + Vis.html('tenue') + '</span>';
    return '<span class="mosaique n' + l.length + '">' + l.map(miniPiece).join('') + '</span>';
  }

  function visuelTenue(t) {
    if (t.photo || t.photoUrl) return '<span class="tphoto">' + Photos.img(t, 'photo') + '</span>';
    return mosaique(piecesDe(t));
  }

  /* La carte d'une tenue, partout la même : le visuel en haut, le
     texte en bas, jamais l'un sur l'autre. */
  function carteT(o, attrs, extra) {
    const m = SEED.MOODS.find((x) => x.id === o.mood) || SEED.MOODS[0];
    const teinte = TEINTES_MOOD[o.mood] || TEINTES_MOOD.chill;
    const n = piecesDe(o).length;
    return '<div class="tcarte" role="button" tabindex="0" ' + attrs + ' style="--g1:' + teinte[0] + ';--g2:' + teinte[1] + '">' +
      '<span class="tvis">' + visuelTenue(o) + '</span>' +
      '<span class="ttx">' +
        '<span class="tsur">' + Icon(m.icon, 12) + UI.esc(m.nom) + '</span>' +
        '<b>' + UI.esc(o.nom || m.nom) + '</b>' +
        '<small>' + n + ' pièce' + (n > 1 ? 's' : '') + (o.photo || o.photoUrl ? ' · ta photo' : '') + '</small>' +
      '</span>' + (extra || '') +
    '</div>';
  }

  function carteStyle(t) {
    return carteT(t, 'data-style="' + UI.attr(t.mood) + '"',
      '<button class="relance" data-relance="' + UI.attr(t.mood) + '" aria-label="Régénérer">' + Icon('refresh', 15) + '</button>');
  }

  /* ---------- Fabrication des cinq tenues ---------- */
  async function composerLeJour(force) {
    const mode = MODE();
    const jour = Store.get('tenuesJour', null);
    if (!force && jour && jour.day === UI.day.today() && jour.mode === mode) return;

    if (mode === 'penderie') {
      if (garments().length < 3) return;
      const tenues = SEED.MOODS.map((m) => tenueDepuisPenderie(m.id)).filter(Boolean);
      Store.set('tenuesJour', { day: UI.day.today(), mode: mode, tenues: tenues });
      render();
      return;
    }
    await inventerLeJour();
  }

  function tenueDepuisPenderie(mood) {
    const o = buildOutfit(mood);
    if (!o.items || o.items.length < 2) return null;
    const pieces = o.items.map((id) => garments().find((g) => g.id === id)).filter(Boolean);
    return { mood: mood, nom: o.nom === 'Tenue du jour' ? nomDeStyle(mood) : o.nom, source: 'penderie', items: o.items, pieces: pieces };
  }

  const nomDeStyle = (mood) => (SEED.MOODS.find((m) => m.id === mood) || {}).nom || 'Tenue';

  /* ============================================================
     Inventer

     Les règles de style comptent autant que la météo. Un jogging
     dans une tenue « classe » ou « old money » n'est pas une
     approximation, c'est une faute : on l'interdit explicitement.
     ============================================================ */
  const REGLES = {
    chill:    "Confortable et simple : jean droit ou chino, t-shirt ou sweat uni, baskets propres. Rien de technique, rien de brillant.",
    soiree:   "Sombre et net : pantalon foncé, chemise ou pull fin, une pièce forte. Chaussures habillées ou baskets minimalistes en cuir.",
    classe:   "STRICTEMENT habillé. Pantalon à pinces ou chino net, chemise, éventuellement une veste. INTERDIT : jogging, survêtement, short, sweat à capuche, baskets de sport, casquette.",
    oldmoney: "Discret et cher : maille fine, couleurs neutres (beige, crème, marine, gris), matières nobles (laine, lin, coton épais), mocassins ou derbies. INTERDIT : jogging, survêtement, logo visible, couleur vive, sweat à capuche, baskets de sport.",
    sport:    "Technique et respirant : short ou jogging, t-shirt technique, baskets de running. C'est le seul registre où le survêtement a sa place."
  };

  async function inventerLeJour(seulement) {
    if (!AI.available()) return UI.echecIA('NO_KEY', { titre: "Inventer des tenues demande une clé IA" });
    const wx = ctx && ctx.weather;
    const cibles = seulement ? [seulement] : SEED.MOODS.map((m) => m.id);

    try {
      const res = await AI.json(
        "Compose une tenue masculine pour chacun de ces registres, pour aujourd'hui.\n\n" +
        (wx ? 'Météo : ' + wx.temp + ' degrés, ' + wx.text + ', ressenti ' + wx.feels + '°.\n' : '') +
        'Saison : ' + (ctx ? ctx.season : UI.day.season()) + '.\n\n' +
        cibles.map((c) => '- ' + nomDeStyle(c) + ' : ' + REGLES[c]).join('\n') + '\n\n' +
        "Chaque tenue liste quatre à cinq pièces précises, avec leur couleur : « chino beige », « chemise en lin blanche ». " +
        "Respecte les interdits à la lettre. Réponds en français.",
        AI.T.obj({ tenues: AI.T.arr(AI.T.obj({
          mood: AI.T.enu(SEED.MOODS.map((m) => m.id), ''),
          nom: AI.T.str('Nom court de la tenue, trois mots maximum'),
          pieces: AI.T.arr(AI.T.str('Une pièce avec sa couleur'), 'Quatre a cinq pieces'),
          resume: AI.T.str('La tenue en une phrase, pour illustrer'),
          pourquoi: AI.T.str('Une ligne : pourquoi ca marche aujourd hui')
        })) }), { cache: false, temperature: 0.95 });

      const neuves = (res.tenues || []).map((t) => ({
        mood: t.mood, nom: t.nom, source: 'ia',
        pieces: t.pieces || [], resume: t.resume, pourquoi: t.pourquoi
      }));

      const jour = Store.get('tenuesJour', null);
      let tenues;
      if (seulement && jour && jour.mode === 'inventer') {
        tenues = jour.tenues.map((t) => (t.mood === seulement && neuves[0]) ? neuves[0] : t);
      } else {
        tenues = neuves;
      }
      Store.set('tenuesJour', { day: UI.day.today(), mode: 'inventer', tenues: tenues });
      render();
    } catch (e) { UI.echecIA(e, { titre: "Les tenues du jour n'ont pas pu être inventées", reessayer: () => inventerLeJour(seulement) }); }
  }

  function relancer(mood) {
    UI.haptic('light');
    if (MODE() === 'inventer') return inventerLeJour(mood);
    const jour = Store.get('tenuesJour', null);
    if (!jour) return composerLeJour(true);
    const neuve = tenueDepuisPenderie(mood);
    if (!neuve) { UI.toast('Pas assez de pièces pour ce style'); return; }
    Store.set('tenuesJour', {
      day: UI.day.today(), mode: 'penderie',
      tenues: jour.tenues.map((t) => t.mood === mood ? neuve : t)
    });
    render();
  }

  /* Ouvre une tenue du jour : détail, enregistrement, aperçu porté. */
  function ouvrirStyle(mood) {
    const jour = Store.get('tenuesJour', null);
    if (!jour) return;
    const t = jour.tenues.find((x) => x.mood === mood);
    if (!t) return;
    const m = SEED.MOODS.find((x) => x.id === mood) || SEED.MOODS[0];
    const teinte = TEINTES_MOOD[mood] || TEINTES_MOOD.chill;

    UI.openSheet(
      '<div class="result plein">' +
        '<div class="rtete" style="--g1:' + teinte[0] + ';--g2:' + teinte[1] + '">' +
          '<div class="sur">' + UI.esc(m.nom) + '</div>' +
          '<div class="titreligne"><h3>' + UI.esc(t.nom || m.nom) + '</h3></div>' +
        '</div>' +
      '</div>' +
      '<div class="mbody">' +
        '<div class="tgrand">' + mosaique(piecesDe(t)) + '</div>' +
        (piecesDe(t).length > 4 ? '<div class="list" style="margin-top:12px">' + piecesDe(t).slice(4).map((x) =>
          '<div class="rowitem">' + miniPiece(x) + '</div>').join('') + '</div>' : '') +
        (t.pourquoi ? '<div class="rwhy" style="margin-top:12px">' + UI.esc(t.pourquoi) + '</div>' : '') +
        '<div class="ract" style="margin-top:16px">' +
          '<button class="btn primary grow lg" data-garder>' + Icon('star', 17) + 'Garder cette tenue</button>' +
          '<button class="btn lg" data-relance2 aria-label="Régénérer">' + Icon('refresh', 17) + '</button>' +
        '</div>' +
      '</div>',
      { onMount: async (sh) => {
          await Photos.hydrate(sh);
          sh.querySelector('[data-garder]').onclick = () => {
            Store.add('outfits', {
              nom: t.nom || m.nom, mood: mood,
              items: t.items || [], pieces: t.source === 'ia' ? t.pieces : null,
              note: t.pourquoi || '', source: t.source
            });
            UI.closeSheet(); UI.haptic('success'); UI.toast('Tenue gardée');
            view = 'tenues'; render();
          };
          sh.querySelector('[data-relance2]').onclick = () => { UI.closeSheet(); relancer(mood); };
        } }
    );
  }

  /* Une couleur par ambiance de tenue. */
  const TEINTES_MOOD = {
    chill:    ['#2F6B5A', '#17372E'],
    soiree:   ['#3B2A5E', '#1A1230'],
    classe:   ['#2C4A6B', '#132435'],
    oldmoney: ['#6B5A3E', '#332B1C'],
    sport:    ['#B4402E', '#511710']
  };

  const moodName = (id) => (SEED.MOODS.find((m) => m.id === id) || {}).nom || 'Tenue';
  const slotName = (id) => (SEED.GARMENT_SLOTS.find((s) => s.id === id) || {}).nom || 'Pièce';

  /* ============================================================
     Penderie
     ============================================================ */
  /* ============================================================
     La penderie

     Avant : sept sections empilees, chacune une grille de vignettes
     de cent pixels. Il fallait defiler pour trouver ses chaussures.

     Maintenant : une carte par categorie. On touche « Hauts », la
     pop-up s'ouvre avec le carrousel de tous les hauts, on touche
     une piece, la pop-up se met a jour sur cette piece, et la
     fleche en haut a gauche ramene a la categorie.

     Un bouton « Tout voir » garde l'ancien affichage complet, pour
     les fois ou on veut embrasser toute la penderie d'un coup.
     ============================================================ */
  /* Une icône 3D par catégorie de penderie. Le sous-vêtement et
     les chaussettes n'en ont pas : ils reprennent celle du haut et
     du bas, plus juste qu'une photo de banque prise au hasard. */
  const PHOTO_SLOT = SLOT_VIS;

  const cartePiece = (g) => ({
    id: g.id,
    titre: g.nom,
    sous: [slotName(g.slot), g.matiere].filter(Boolean).join(' · '),
    img: (g.photo || g.photoUrl) ? null : null,
    ph: g.nom, type: 'vetement'
  });

  /* Une piece avec sa vraie photo quand elle existe. */
  function carteVetement(g) {
    const aPhoto = g.photo || g.photoUrl;
    return '<button class="kart" data-kart="' + UI.attr(g.id) + '">' +
      '<span class="vis">' + (aPhoto
        ? Photos.img(g, 'photo', 'width:100%;height:100%;object-fit:cover')
        : Vis.html(PHOTO_SLOT[g.slot] || 'haut', { classe: 'fond' })) + '</span>' +
      '<span class="voile"></span>' +
      (g.couleurs && g.couleurs.length
        ? '<span class="pts">' + g.couleurs.slice(0, 3).map((c) =>
            '<i style="background:' + UI.attr(safeHex(c)) + '"></i>').join('') + '</span>'
        : '') +
      '<span class="tx"><b>' + UI.esc(g.nom) + '</b>' +
      '<small>' + UI.esc(slotName(g.slot)) + '</small></span>' +
      '</button>';
  }

  function wardrobeView() {
    const all = garments();
    /* Toutes les catégories principales sont là, même vides : une
       catégorie vide est grisée et s'ouvre sur « ajouter ». */
    const cats = SEED.GARMENT_SLOTS.filter((sl) => bySlot(sl.id).length || ['haut', 'bas', 'chaussures', 'veste', 'accessoire'].indexOf(sl.id) >= 0)
      .map((sl) => {
        const l = bySlot(sl.id);
        return { id: sl.id, titre: sl.nom, n: l.length,
          sous: l.length ? l.length + (l.length > 1 ? ' pièces' : ' pièce') : 'Ajouter' };
      });

    return '<div class="section">' +
      '<div class="secbar">' +
        '<h2>' + all.length + ' pièce' + (all.length > 1 ? 's' : '') + '</h2>' +
        '<div class="btnrow">' +
          (all.length ? '<button class="lientout" data-act="toutePenderie">Tout voir</button>' : '') +
          '<button class="btn sm primary" data-act="addGarment">' + Icon('camera', 15) + 'Ajouter</button>' +
        '</div>' +
      '</div>' +
      photoSyncBlock(all) +
      '<div class="kgrille penderie">' + cats.map((c) =>
        '<button class="kart catpiece' + (c.n ? '' : ' gris') + '" data-cat="' + UI.attr(c.id) + '">' +
          '<span class="vis">' + Vis.html(PHOTO_SLOT[c.id] || 'haut', { classe: 'fond' }) + '</span>' +
          (c.n ? '<span class="badge">' + c.n + '</span>' : '<span class="badge plus">' + Icon('plus', 13) + '</span>') +
          '<span class="tx"><b>' + UI.esc(c.titre) + '</b><small>' + UI.esc(c.sous) + '</small></span>' +
        '</button>').join('') + '</div>' +
      '</div>';
  }

  /* Toutes les pieces d'une categorie, en carrousel. */
  function ouvrirCategorie(slotId) {
    const sl = SEED.GARMENT_SLOTS.find((x) => x.id === slotId);
    const l = bySlot(slotId);
    if (!sl) return;
    if (!l.length) { addGarment(slotId); return; }

    Cartes.ouvrir({
      tete: Cartes.tete(sl.nom, l.length + (l.length > 1 ? ' pièces' : ' pièce'),
        ['#3E4A63', '#7C8CA8'], 'chemise'),
      corps: '<div class="kcarrousel">' + l.map(carteVetement).join('') + '</div>' +
        '<button class="btn block" style="margin-top:10px" data-tout>' + Icon('grid', 16) + 'Tout voir en grille</button>' +
        '<button class="btn primary block lg" style="margin-top:8px" data-add>' +
          Icon('camera', 17) + 'Ajouter dans ' + UI.esc(sl.nom.toLowerCase()) + '</button>',
      onMount: async (sh) => {
        await Photos.hydrate(sh);
        sh.querySelector('[data-add]').onclick = () => { UI.closeSheet(); addGarment(slotId); };
        sh.querySelector('[data-tout]').onclick = () => {
          Cartes.empiler({
            tete: Cartes.tete(sl.nom, 'Tout, d\'un coup', ['#3E4A63', '#7C8CA8'], 'chemise'),
            corps: '<div class="kgrille">' + l.map(carteVetement).join('') + '</div>',
            onMount: (s2) => { Photos.hydrate(s2); },
            onCarte: (id) => { UI.closeSheet(); openGarment(id); }
          });
        };
      },
      onCarte: (id) => { UI.closeSheet(); openGarment(id); }
    });
  }

  /* Toute la penderie, sans passer par les categories. */
  function toutePenderie() {
    const all = garments();
    if (!all.length) return;
    Cartes.ouvrir({
      tete: Cartes.tete('Toute la penderie', all.length + ' pièces', ['#3E4A63', '#7C8CA8'], 'chemise'),
      corps: SEED.GARMENT_SLOTS.map((sl) => {
        const l = bySlot(sl.id);
        if (!l.length) return '';
        return '<h4 class="ftitre">' + UI.esc(sl.nom) + ' · ' + l.length + '</h4>' +
          '<div class="kgrille trois">' + l.map(carteVetement).join('') + '</div>';
      }).join(''),
      onMount: (sh) => { Photos.hydrate(sh); },
      onCarte: (id) => { UI.closeSheet(); openGarment(id); }
    });
  }


  /* Les photos ne suivent pas toutes seules : IndexedDB est propre à
     un appareil. Ce bloc dit franchement où en est la penderie et
     propose de rattraper en un geste. */
  function photoSyncBlock(all) {
    if (!all.length) return '';
    const connecte = global.Cloud && Cloud.ready();
    const aEnvoyer = Photos.pendingUploads('garments');
    const sansRien = all.filter((g) => !g.photo && !g.photoUrl).length;

    if (!connecte) {
      if (!aEnvoyer) return '';
      return '<div class="banner warn" style="margin-bottom:12px">' + Icon('info', 18) +
        '<span><b>' + aEnvoyer + ' photo' + (aEnvoyer > 1 ? 's' : '') + ' seulement sur cet appareil.</b> ' +
        'Connecte-toi pour les retrouver sur ton téléphone.</span>' +
        '<button class="btn sm" data-act="account" style="flex:none">Compte</button></div>';
    }
    if (aEnvoyer) {
      return '<div class="banner warn" style="margin-bottom:12px">' + Icon('sync', 18) +
        '<span><b>' + aEnvoyer + ' photo' + (aEnvoyer > 1 ? 's' : '') + ' à envoyer.</b> ' +
        'Tant qu\'elles ne sont pas en ligne, les autres appareils voient un carré vide.</span>' +
        '<button class="btn sm primary" data-act="syncPhotos" style="flex:none">Envoyer</button></div>';
    }
    if (sansRien) {
      return '<div class="banner" style="margin-bottom:12px">' + Icon('info', 18) +
        '<span>' + sansRien + ' pièce' + (sansRien > 1 ? 's' : '') + ' sans photo. ' +
        'Ouvre-la et ajoute-en une, ou supprime-la.</span></div>';
    }
    return '<div class="banner ok" style="margin-bottom:12px">' + Icon('check', 18) +
      '<span>Toutes les photos sont en ligne : tu les retrouves sur tous tes appareils.</span></div>';
  }

  async function syncPhotos() {
    if (!global.Cloud || !Cloud.ready()) { App.go('#/m/settings/compte'); return; }
    const box = UI.openSheet('<div class="mbody"><h2 style="font-size:20px;margin-bottom:14px">Synchronisation des photos</h2>' +
      '<div class="bar-track"><div class="bar-fill" data-prog style="width:2%"></div></div>' +
      '<p class="muted" style="font-size:13px;margin-top:10px" data-msg>Préparation…</p></div>');
    const setMsg = (t) => { const e = box.querySelector('[data-msg]'); if (e) e.textContent = t; };
    const setProg = (a, b) => { const e = box.querySelector('[data-prog]'); if (e) e.style.width = Math.max(2, Math.round(a / Math.max(1, b) * 100)) + '%'; };
    try {
      const r = await Photos.sync('garments', 'photo', 'garments', (a, b) => { setProg(a, b); setMsg(a + ' sur ' + b); });
      UI.closeSheet();
      UI.toast(r.up + ' envoyée' + (r.up > 1 ? 's' : '') + (r.down ? ', ' + r.down + ' récupérée' + (r.down > 1 ? 's' : '') : ''));
      render();
    } catch (e) {
      UI.closeSheet(); UI.toast('Synchronisation impossible pour le moment');
    }
  }

  /* ============================================================
     Tenues enregistrées
     ============================================================ */
  /* ============================================================
     Mes tenues

     Des cartes, toutes de la meme taille, triees par registre.
     Ce qu'on voit sur une carte, dans l'ordre de preference :
       1. la photo generee ou on porte la tenue ;
       2. a defaut, la photo de la piece principale ;
       3. a defaut seulement, une mosaique.

     Une ligne de titre, une ligne de sous-titre, jamais deux : des
     cartes de hauteurs differentes dans une meme grille, ca se
     voit tout de suite et ca fait brouillon.
     ============================================================ */
  const MOOD_VIS = { chill: 'chill', soiree: 'soiree', classe: 'classe', oldmoney: 'oldmoney', sport: 'sport-tenue' };

  function outfitsView() {
    const all = outfits();
    const compte = (id) => all.filter((o) => o.mood === id).length;
    return '<div class="section">' +
      '<div class="secbar">' +
        '<h2>' + all.length + ' tenue' + (all.length > 1 ? 's' : '') + '</h2>' +
        '<div class="btnrow">' +
          (all.length ? '<button class="lientout" data-act="toutesTenues">Tout voir</button>' : '') +
        '</div>' +
      '</div>' +
      '<div class="kgrille penderie">' + SEED.MOODS.map((m) => {
        const n = compte(m.id);
        return '<button class="kart catpiece' + (n ? '' : ' gris') + '" data-mood="' + m.id + '">' +
          '<span class="vis">' + Vis.html(MOOD_VIS[m.id], { classe: 'fond' }) + '</span>' +
          (n ? '<span class="badge">' + n + '</span>' : '<span class="badge plus">' + Icon('plus', 13) + '</span>') +
          '<span class="tx"><b>' + UI.esc(m.nom) + '</b><small>' + (n ? n + ' tenue' + (n > 1 ? 's' : '') : 'Composer') + '</small></span>' +
        '</button>';
      }).join('') + '</div>' +
      '<div class="row" style="gap:8px;margin-top:14px">' +
        '<button class="btn grow" data-act="composeOutfit">' + Icon('plus', 16) + 'Composer</button>' +
        (AI.available() ? '<button class="btn primary grow" data-act="aiOutfits">' + Icon('sparkle', 16) + 'Générer</button>' : '') +
      '</div>' +
      '</div>';
  }

  /* Les tenues d'un mood, en carrousel, et une carte grise pour en
     composer une nouvelle. */
  function ouvrirMoodTenues(mood) {
    const m = SEED.MOODS.find((x) => x.id === mood);
    const l = outfits().filter((o) => o.mood === mood);
    if (!l.length) { composeOutfit(mood); return; }
    const t = TEINTES_MOOD[mood] || TEINTES_MOOD.chill;
    Cartes.ouvrir({
      tete: Cartes.tete(m.nom, l.length + ' tenue' + (l.length > 1 ? 's' : ''), t, 'chemise'),
      corps: '<div class="tcarrousel">' + l.map((o) => carteT(o, 'data-o="' + UI.attr(o.id) + '"')).join('') +
        '<button class="tcarte ajout" data-ajout>' + '<span class="tvis"><span class="tplus">' + Icon('plus', 26) + '</span></span>' +
        '<span class="ttx"><b>Nouvelle tenue</b><small>' + UI.esc(m.nom) + '</small></span></button></div>',
      onMount: (sh) => {
        Photos.hydrate(sh);
        sh.querySelectorAll('[data-o]').forEach((b) => b.onclick = () => ouvrirTenue(b.dataset.o, true));
        sh.querySelector('[data-ajout]').onclick = () => { UI.closeSheet(); composeOutfit(mood); };
      }
    });
  }

  function toutesTenues() {
    const all = outfits();
    Cartes.ouvrir({
      tete: Cartes.tete('Toutes mes tenues', all.length + ' tenues', ['#3E4A63', '#7C8CA8'], 'chemise'),
      corps: SEED.MOODS.map((m) => {
        const l = all.filter((o) => o.mood === m.id);
        return l.length ? '<h4 class="ftitre">' + UI.esc(m.nom) + ' · ' + l.length + '</h4>' +
          '<div class="tgrille">' + l.map((o) => carteT(o, 'data-o="' + UI.attr(o.id) + '"')).join('') + '</div>' : '';
      }).join(''),
      onMount: (sh) => {
        Photos.hydrate(sh);
        sh.querySelectorAll('[data-o]').forEach((b) => b.onclick = () => ouvrirTenue(b.dataset.o, true));
      }
    });
  }

  /* ============================================================
     La fiche d'une tenue

     On l'ouvre pour REGARDER, pas pour remplir un formulaire. Donc
     par defaut : la tenue en grand, puis ses pieces en carrousel,
     une par ecran. Modifier est un bouton, et ca ouvre une
     deuxieme pop-up.
     ============================================================ */
  function ouvrirTenue(id, empile) {
    const o = Store.find('outfits', id);
    if (!o) return;
    const items = piecesDe(o);
    const t = TEINTES_MOOD[o.mood] || TEINTES_MOOD.chill;
    const aPhoto = o.photo || o.photoUrl;

    const vue = {
      tete: '<div class="mtete" style="--t1:' + t[0] + ';--t2:' + t[1] + '">' +
        '<h2>' + UI.esc(o.nom || 'Tenue') + '</h2><p>' + UI.esc(moodName(o.mood)) + ' · ' + items.length + ' pièces</p></div>',
      corps:
        (aPhoto ? '<div class="tphotogrande">' + Photos.img(o, 'photo') + '</div>' : '') +
        '<h4 class="ftitre">Ce qu\'il y a dedans</h4>' +
        '<div class="tgrand">' + mosaique(items) + '</div>' +
        (items.length > 4 ? '<div class="list" style="margin-top:10px">' + items.slice(4).map((x) =>
          '<div class="rowitem">' + miniPiece(x) + '</div>').join('') + '</div>' : '') +
        (o.note ? '<div class="rwhy" style="margin-top:12px">' + UI.esc(o.note) + '</div>' : '') +
        '<div class="btnrow" style="margin-top:18px">' +
          '<button class="btn primary grow lg" data-maphoto>' + Icon('camera', 17) + (aPhoto ? 'Changer ma photo' : 'Ajouter ma photo') + '</button>' +
          '<button class="btn lg" data-edit aria-label="Modifier">' + Icon('edit', 17) + '</button>' +
        '</div>' +
        (aPhoto ? '<button class="btn ghost block" style="margin-top:8px" data-sansphoto>' + Icon('trash', 15) + 'Retirer la photo</button>' : ''),
      onMount: async (sh) => {
        await Photos.hydrate(sh);
        sh.querySelector('[data-maphoto]').onclick = () => {
          Photos.choisir(async (f) => {
            if (!f) return;
            try {
              const saved = await Photos.save(f, 'garments', 1200);
              Store.put('outfits', id, { photo: saved.id, photoUrl: saved.url || null });
              UI.toast('Photo ajoutée'); UI.haptic('success');
              if (root) render();
              ouvrirTenue(id);
            } catch (e) { UI.toast('Photo non enregistrée'); }
          }, { titre: 'Ta photo dans cette tenue', capture: 'user' });
        };
        const sp = sh.querySelector('[data-sansphoto]');
        if (sp) sp.onclick = () => { Store.put('outfits', id, { photo: null, photoUrl: null }); if (root) render(); ouvrirTenue(id); };
        sh.querySelector('[data-edit]').onclick = () => { UI.closeSheet(); editerTenue(id); };
      }
    };
    if (empile) Cartes.empiler(vue); else Cartes.ouvrir(vue);
  }

  /* La deuxieme pop-up : celle ou on change vraiment les choses. */
  function editerTenue(id) {
    const o = Store.find('outfits', id);
    if (!o) return;
    let brouillon = { nom: o.nom || 'Tenue', mood: o.mood || 'chill', items: (o.items || []).slice() };

    const corps = () => {
      const parSlot = SEED.GARMENT_SLOTS
        .map((sl) => ({ sl: sl, liste: bySlot(sl.id) }))
        .filter((x) => x.liste.length);

      return '<div class="mbody form-visuel">' +
        '<div class="champ"><span class="lb">Nom</span>' +
          '<input type="text" data-nom value="' + UI.attr(brouillon.nom) + '"></div>' +

        '<div class="champ"><span class="lb">Registre</span>' +
        '<div class="chips">' + SEED.MOODS.map((m) =>
          '<button type="button" class="chip' + (brouillon.mood === m.id ? ' on' : '') + '" data-mo="' + m.id + '">' +
          Icon(m.icon, 14) + UI.esc(m.nom) + '</button>').join('') + '</div></div>' +

        parSlot.map((x) =>
          '<div class="champ"><span class="lb">' + UI.esc(x.sl.nom) + '</span>' +
          '<div class="choixpieces">' + x.liste.map((g) =>
            '<button class="pc' + (brouillon.items.indexOf(g.id) >= 0 ? ' on' : '') + '" data-pc="' + UI.attr(g.id) + '">' +
              '<span class="ph">' +
                (g.photo || g.photoUrl ? Photos.img(g, 'photo', 'width:100%;height:100%;object-fit:cover') : Icon('shirt', 18)) +
              '</span><small>' + UI.esc(g.nom) + '</small></button>').join('') + '</div></div>').join('') +

        '<button class="btn primary block lg" style="margin-top:10px" data-save>' + Icon('check', 18) + 'Enregistrer</button>' +
        '<button class="btn danger block" style="margin-top:8px" data-sup>' + Icon('trash', 16) + 'Supprimer</button>' +
      '</div>';
    };

    const tete = () => {
      const t = TEINTES_MOOD[brouillon.mood] || TEINTES_MOOD.chill;
      return '<div class="mtete" style="--t1:' + t[0] + ';--t2:' + t[1] + '">' +
        '<h2>Modifier</h2><p>' + UI.esc(brouillon.nom) + ' · ' + brouillon.items.length + ' pièces</p></div>';
    };

    UI.openSheet(tete() + corps(), { onMount: monter });

    async function monter(sh) {
      await Photos.hydrate(sh);
      const relire = () => { brouillon.nom = sh.querySelector('[data-nom]').value.trim() || 'Tenue'; };
      const redessiner = () => { relire(); UI.closeSheet(); UI.openSheet(tete() + corps(), { onMount: monter }); };

      sh.querySelectorAll('[data-mo]').forEach((b) => b.onclick = () => { brouillon.mood = b.dataset.mo; redessiner(); });
      sh.querySelectorAll('[data-pc]').forEach((b) => b.onclick = () => {
        const i = brouillon.items.indexOf(b.dataset.pc);
        if (i >= 0) brouillon.items.splice(i, 1); else brouillon.items.push(b.dataset.pc);
        UI.haptic('tick');
        redessiner();
      });
      sh.querySelector('[data-save]').onclick = () => {
        relire();
        Store.put('outfits', id, { nom: brouillon.nom, mood: brouillon.mood, items: brouillon.items });
        UI.closeSheet(); UI.haptic('success'); UI.toast('Tenue enregistrée'); render();
      };
      sh.querySelector('[data-sup]').onclick = async () => {
        if (!await UI.confirmSheet('Supprimer ?', 'La tenue disparaît, les vêtements restent.', true)) { editerTenue(id); return; }
        Store.del('outfits', id); UI.closeSheet(); render();
      };
    }
  }

  /* ============================================================
     Ajout d'un vêtement avec reconnaissance
     ============================================================ */
  /* La reconnaissance ratait souvent la categorie et sortait des
     couleurs approximatives. Trois corrections :
       - on nomme le type exact avant de le classer, ce qui force
         le modele a regarder la piece plutot qu'a deviner ;
       - la couleur est demandee en francais ET en hexadecimal, et
         les deux doivent correspondre ;
       - la photo part en meilleure definition. */
  const GARMENT_SCHEMA = AI.T.obj({
    type: AI.T.str('Le type exact du vetement en un ou deux mots : t-shirt, chemise, pull, sweat, jean, chino, short, jupe, robe, veste, manteau, basket, botte, chaussure de ville, casquette, echarpe, ceinture, sac…'),
    nom: AI.T.str('Nom court et parlant, en francais : matiere ou motif + type + couleur. Exemple : chemise en lin beige'),
    slot: AI.T.enu(['haut', 'bas', 'chaussures', 'veste', 'sousvetement', 'chaussettes', 'accessoire'], 'La categorie deduite du type'),
    couleur_nom: AI.T.str('La couleur principale en francais courant : beige, bleu marine, blanc casse…'),
    couleurs: AI.T.arr(AI.T.str('Code hexadecimal exact, ex. #2C3E50'), 'Une a trois couleurs dominantes, la principale en premier'),
    motif: AI.T.str('uni, raye, carreaux, imprime, jean brut, delave, ou autre'),
    matiere: AI.T.str('Matiere apparente'),
    marque: AI.T.str('Marque si un logo est nettement lisible, sinon chaine vide'),
    styles: AI.T.arr(AI.T.enu(['chill', 'soiree', 'classe', 'oldmoney', 'sport'], ''), 'Registres qui conviennent'),
    saisons: AI.T.arr(AI.T.enu(['printemps', 'ete', 'automne', 'hiver'], ''), ''),
    chaleur: AI.T.int('De 1 (tres leger, un t-shirt) a 5 (tres chaud, une doudoune)'),
    pluie: AI.T.bool('Convient sous la pluie')
  }, ['type', 'nom', 'slot', 'couleur_nom', 'couleurs', 'chaleur']);

  const PROMPT_VETEMENT =
    "Tu remplis la fiche d'un vetement dans un dressing numerique.\n\n" +
    "Methode, dans cet ordre :\n" +
    "1. Nomme d'abord le type exact de la piece (t-shirt, chemise, pull, jean, veste, basket, casquette…).\n" +
    "2. Deduis-en la categorie : un t-shirt, une chemise, un pull, un sweat et un polo sont des « haut » ; " +
    "un jean, un chino, un pantalon, un short et une jupe sont des « bas » ; " +
    "une veste, un blouson, un manteau et un blazer sont des « veste » ; " +
    "les baskets, bottes et chaussures de ville sont des « chaussures » ; " +
    "casquettes, bonnets, echarpes, ceintures, sacs, montres et bijoux sont des « accessoire ».\n" +
    "3. Donne la couleur principale en francais courant, puis son code hexadecimal. Les deux doivent decrire la meme couleur : " +
    "si tu ecris « bleu marine », le code doit etre sombre. Prends la couleur du tissu, pas celle du fond ni de l'ombre.\n" +
    "4. Estime la chaleur d'apres l'epaisseur visible du tissu.\n\n" +
    "Si plusieurs vetements sont visibles, ne decris que celui du premier plan. " +
    "N'invente pas de marque : si aucun logo n'est nettement lisible, laisse le champ vide. Reponds en francais.";

  /* Un seul chemin de reconnaissance, utilise a l'ajout et au
     bouton « relancer l'IA » de la fiche. */
  async function reconnaitre(image) {
    const meta = await AI.vision([image], PROMPT_VETEMENT, GARMENT_SCHEMA, { cache: false, temperature: 0.2 });
    const slots = SEED.GARMENT_SLOTS.map((x) => x.id);
    if (slots.indexOf(meta.slot) < 0) meta.slot = devinerSlot(meta.type);
    meta.couleurs = (meta.couleurs || []).map((c) => safeHex(c)).slice(0, 4);
    if (!meta.couleurs.length) meta.couleurs = ['#888888'];
    if (!meta.nom) meta.nom = [meta.type, meta.couleur_nom].filter(Boolean).join(' ') || 'Piece';
    meta.chaleur = Math.max(1, Math.min(5, Number(meta.chaleur) || 3));
    if (meta.marque === 'chaine vide') meta.marque = '';
    return meta;
  }

  /* Filet de securite quand le modele renvoie une categorie hors
     liste : on retombe sur le type, qui lui est presque toujours bon. */
  const MOTS_SLOT = [
    ['chaussures', /basket|sneaker|botte|chaussure|mocassin|derby|sandale|tong|escarpin/i],
    ['veste',      /veste|blouson|manteau|parka|doudoune|blazer|trench|gilet/i],
    ['bas',        /jean|pantalon|chino|short|jupe|jogging|bermuda|legging/i],
    ['chaussettes', /chaussette|socquette/i],
    ['sousvetement', /calecon|boxer|slip|sous-vetement|maillot de corps/i],
    ['accessoire', /casquette|bonnet|echarpe|ceinture|sac|montre|lunette|bijou|chapeau|gant|cravate/i],
    ['haut',       /t-shirt|tee-shirt|chemise|pull|sweat|polo|debardeur|hoodie|robe|top/i]
  ];
  function devinerSlot(type) {
    const t = String(type || '');
    for (const [slot, re] of MOTS_SLOT) if (re.test(t)) return slot;
    return 'haut';
  }

  /* `slotVoulu` force la categorie quand on ajoute depuis une
     categorie precise : sans ca, l'IA reclassait la piece ailleurs
     et elle disparaissait de la liste qu'on venait d'ouvrir. */
  function addGarment(slotVoulu) {
    /* Photos.choisir demande d'abord la source : appareil photo,
       photothèque ou fichiers. Avant, le système tranchait seul et
       on tombait rarement là où on voulait. */
    Photos.choisir(async (files) => {
      files = [].concat(files || []);
      if (!files.length) return;
      UI.openSheet('<div class="mbody">' + UI.thinking('Analyse de ' + files.length + ' photo' + (files.length > 1 ? 's' : '') + '…') + '</div>');
      let n = 0;
      for (const f of files) {
        try {
          /* 1400 px : la definition d'origine etait trop basse pour
             que le modele distingue une maille d'un tissage. */
          const small = await AI.shrink(f, 1400, 0.86);
          const saved = await Photos.save(small, 'garments');
          let meta = { nom: 'Pièce ' + (garments().length + 1), slot: slotVoulu || 'haut', couleurs: ['#888888'], styles: ['chill'], chaleur: 3 };
          if (AI.available()) {
            try { meta = await reconnaitre(small); } catch (e) { console.warn(e); }
          }
          if (slotVoulu) meta.slot = slotVoulu;
          Store.add('garments', Object.assign({ photo: saved.id, photoUrl: saved.url || null }, meta));
          n++;
        } catch (e) { console.warn(e); }
      }
      UI.closeSheet();
      UI.toast(n + ' pièce' + (n > 1 ? 's ajoutées' : ' ajoutée'));
      if (n && global.Game) Game.award('vetement', 5);
      view = 'penderie'; render();
    }, { multiple: true });
  }

  /* ============================================================
     La fiche d'un vetement

     Tout est modifiable : la categorie, les couleurs une par une,
     la matiere, les styles, les saisons, la chaleur, la pluie et
     la photo. L'IA propose, elle ne decide pas, et une categorie
     fausse se corrige en deux touches.
     ============================================================ */
  const SAISONS = [
    { id: 'printemps', nom: 'Printemps' }, { id: 'ete', nom: 'Été' },
    { id: 'automne', nom: 'Automne' }, { id: 'hiver', nom: 'Hiver' }
  ];
  const CHALEURS = ['Très léger', 'Léger', 'Moyen', 'Chaud', 'Très chaud'];

  function openGarment(id) {
    const g = Store.find('garments', id);
    if (!g) return;

    /* Copie de travail : on n'ecrit dans le stock qu'a l'enregistrement. */
    const w = {
      nom: g.nom || '',
      slot: g.slot || 'haut',
      couleurs: (g.couleurs && g.couleurs.length ? g.couleurs.slice() : ['#888888']),
      matiere: g.matiere || '',
      marque: g.marque || '',
      styles: (g.styles || []).slice(),
      saisons: (g.saisons || []).slice(),
      chaleur: Number(g.chaleur) || 3,
      pluie: !!g.pluie
    };

    const chip = (actif, attr, val, texte, extra) =>
      '<button class="chip' + (actif ? ' on' : '') + '" data-' + attr + '="' + UI.attr(val) + '">' + (extra || '') + UI.esc(texte) + '</button>';

    const corps = () =>
      '<div class="mbody">' +
        '<label class="field"><span>Nom</span><input type="text" data-nom value="' + UI.attr(w.nom) + '" placeholder="Chemise en lin beige"></label>' +

        '<h4 class="ftitre">Catégorie</h4>' +
        '<div class="chips">' + SEED.GARMENT_SLOTS.map((sl) => chip(w.slot === sl.id, 'slot', sl.id, sl.nom)).join('') + '</div>' +

        '<h4 class="ftitre">Couleurs</h4>' +
        '<div class="couleurs" data-cols>' +
          w.couleurs.map((c, i) =>
            '<label class="pastille" style="background:' + UI.attr(c) + '">' +
              '<input type="color" data-col="' + i + '" value="' + UI.attr(safeHex(c)) + '">' +
              '<button class="x" data-delcol="' + i + '" aria-label="Retirer">' + Icon('close', 12) + '</button>' +
            '</label>').join('') +
          (w.couleurs.length < 4 ? '<button class="pastille add" data-addcol>' + Icon('plus', 18) + '</button>' : '') +
        '</div>' +
        /* Trois façons de corriger une couleur, parce qu'aucune ne
           suffit seule : la pipette sur la photo quand elle existe,
           la palette des teintes de vêtements, et le nuancier du
           téléphone en touchant la pastille. */
        '<div class="btnrow" style="margin-top:10px">' +
          ((g.photo || g.photoUrl) ? '<button class="btn sm" data-pipette>' + Icon('pipette', 15) + 'Pipette</button>' : '') +
          '<button class="btn sm" data-palette>' + Icon('palette', 15) + 'Palette</button>' +
        '</div>' +

        '<h4 class="ftitre">Style</h4>' +
        '<div class="chips">' + SEED.MOODS.map((m) => chip(w.styles.indexOf(m.id) >= 0, 'style', m.id, m.nom)).join('') + '</div>' +

        '<h4 class="ftitre">Saisons</h4>' +
        '<div class="chips">' + SAISONS.map((x) => chip(w.saisons.indexOf(x.id) >= 0, 'saison', x.id, x.nom)).join('') + '</div>' +

        '<h4 class="ftitre">Chaleur</h4>' +
        '<div class="chips">' + CHALEURS.map((n, i) => chip(w.chaleur === i + 1, 'chaleur', i + 1, n)).join('') + '</div>' +

        '<h4 class="ftitre">Et aussi</h4>' +
        '<div class="chips">' + chip(w.pluie, 'pluie', '1', 'Va sous la pluie', Icon('water', 14) + ' ') + '</div>' +

        '<label class="field" style="margin-top:14px"><span>Matière</span><input type="text" data-mat value="' + UI.attr(w.matiere) + '" placeholder="Coton, lin, laine…"></label>' +
        '<label class="field"><span>Marque</span><input type="text" data-marque value="' + UI.attr(w.marque) + '" placeholder="Facultatif"></label>' +

        '<button class="btn primary block lg" style="margin-top:18px" data-save>' + Icon('check', 18) + 'Enregistrer</button>' +
        '<div class="btnrow" style="margin-top:8px">' +
          '<button class="btn grow" data-reia>' + Icon('sparkle', 16) + 'Relancer l\'IA</button>' +
          '<button class="btn grow" data-rephoto>' + Icon('camera', 16) + 'Changer la photo</button>' +
        '</div>' +
        '<button class="btn danger block" style="margin-top:8px" data-del>' + Icon('trash', 16) + 'Supprimer ce vêtement</button>' +
      '</div>';

    const entete = () => ((g.photo || g.photoUrl) ? '<div class="mimg cover">' + Photos.img(g) + '</div>' : '');

    UI.openSheet(entete() + corps(), { onMount: monter });

    async function monter(sh) {
      await Photos.hydrate(sh);

      const relire = () => {
        const el = (sel) => sh.querySelector(sel);
        w.nom = el('[data-nom]').value.trim();
        w.matiere = el('[data-mat]').value.trim();
        w.marque = el('[data-marque]').value.trim();
      };
      const redessiner = () => {
        relire();
        const body = sh.querySelector('.mbody');
        body.outerHTML = corps();
        monter(sh);
      };

      sh.querySelectorAll('[data-slot]').forEach((b) => b.onclick = () => { w.slot = b.dataset.slot; redessiner(); });
      sh.querySelectorAll('[data-style]').forEach((b) => b.onclick = () => { bascule(w.styles, b.dataset.style); redessiner(); });
      sh.querySelectorAll('[data-saison]').forEach((b) => b.onclick = () => { bascule(w.saisons, b.dataset.saison); redessiner(); });
      sh.querySelectorAll('[data-chaleur]').forEach((b) => b.onclick = () => { w.chaleur = Number(b.dataset.chaleur); redessiner(); });
      const bp = sh.querySelector('[data-pluie]');
      if (bp) bp.onclick = () => { w.pluie = !w.pluie; redessiner(); };

      sh.querySelectorAll('[data-col]').forEach((inp) => {
        inp.oninput = () => {
          w.couleurs[Number(inp.dataset.col)] = inp.value;
          inp.parentNode.style.background = inp.value;
        };
      });
      sh.querySelectorAll('[data-delcol]').forEach((b) => b.onclick = (e) => {
        e.preventDefault(); e.stopPropagation();
        if (w.couleurs.length <= 1) return;
        w.couleurs.splice(Number(b.dataset.delcol), 1); redessiner();
      });
      const add = sh.querySelector('[data-addcol]');
      if (add) add.onclick = () => { w.couleurs.push('#cccccc'); redessiner(); };

      const pip = sh.querySelector('[data-pipette]');
      if (pip) pip.onclick = () => pipette(g, (hex) => {
        if (!w.couleurs.length || w.couleurs[0] === '#888888' || w.couleurs[0] === '#cccccc') w.couleurs[0] = hex;
        else if (w.couleurs.length < 4) w.couleurs.push(hex);
        else w.couleurs[w.couleurs.length - 1] = hex;
        redessiner();
      });
      const pal = sh.querySelector('[data-palette]');
      if (pal) pal.onclick = () => choisirDansPalette((hex) => {
        if (w.couleurs.length < 4) w.couleurs.push(hex); else w.couleurs[w.couleurs.length - 1] = hex;
        redessiner();
      });

      sh.querySelector('[data-save]').onclick = () => {
        relire();
        Store.put('garments', id, {
          nom: w.nom || 'Pièce', slot: w.slot, couleurs: w.couleurs,
          matiere: w.matiere, marque: w.marque, styles: w.styles,
          saisons: w.saisons, chaleur: w.chaleur, pluie: w.pluie
        });
        UI.closeSheet(); UI.haptic('success'); UI.toast('Enregistré'); render();
      };

      sh.querySelector('[data-del]').onclick = async () => {
        const sur = await UI.confirmSheet('Supprimer ?', 'Ce vêtement disparaît de la penderie et des tenues.', true);
        if (!sur) { openGarment(id); return; }
        await Photos.del(g.photo); Store.del('garments', id); UI.closeSheet(); render();
      };

      sh.querySelector('[data-rephoto]').onclick = () => {
        Photos.choisir(async (f) => {
          if (!f) return;
          UI.toast('Enregistrement…');
          const petite = await AI.shrink(f, 1400, 0.85);
          const saved = await Photos.save(petite, 'garments');
          if (g.photo) await Photos.del(g.photo);
          Store.put('garments', id, { photo: saved.id, photoUrl: saved.url || null });
          render(); openGarment(id);
        });
      };

      sh.querySelector('[data-reia]').onclick = async () => {
        if (!AI.available()) return UI.echecIA('NO_KEY', { titre: 'Reconnaître une pièce demande une clé IA' });
        /* Photos.pourIA ramene la photo en data:, qu'elle vienne de
           l'appareil ou du compte. Une URL https etait ignoree par
           l'API de vision : le modele repondait sans rien voir. */
        const src = await Photos.pourIA(g);
        if (!src) { UI.toast('Pas de photo à analyser'); return; }
        UI.toast('Analyse…');
        try {
          const meta = await reconnaitre(src);
          Object.assign(w, {
            nom: meta.nom || w.nom, slot: meta.slot || w.slot,
            couleurs: (meta.couleurs && meta.couleurs.length ? meta.couleurs : w.couleurs),
            matiere: meta.matiere || w.matiere,
            styles: meta.styles || w.styles, saisons: meta.saisons || w.saisons,
            chaleur: meta.chaleur || w.chaleur, pluie: meta.pluie != null ? meta.pluie : w.pluie
          });
          redessiner();
          UI.toast('Propositions mises à jour, vérifie et enregistre');
        } catch (e) { UI.echecIA(e, { titre: "La pièce n'a pas pu être analysée" }); }
      };
    }
  }

  /* ============================================================
     La pipette

     On affiche la photo du vêtement, on touche le tissu, on
     récupère la couleur exacte. C'est plus juste que n'importe
     quelle description et plus rapide que n'importe quel nuancier :
     la couleur vient de l'objet lui-même.

     La valeur retenue est la moyenne d'un petit carré autour du
     doigt, pas le pixel exact : sur une photo, un pixel isolé peut
     être un reflet ou une ombre.
     ============================================================ */
  async function pipette(g, onChoix) {
    const src = await Photos.pourIA(g);
    if (!src) { UI.toast('Pas de photo'); return; }

    UI.openSheet(
      '<div class="mbody" style="padding-top:6px">' +
        '<h2 style="font-size:21px;margin-bottom:2px">Touche la couleur</h2>' +
        '<p class="muted" style="font-size:13px;margin-bottom:12px">Appuie sur le tissu, la teinte est relevée sur place.</p>' +
        '<div class="pipettebox"><canvas data-cv></canvas><span class="viseur" data-viseur hidden></span></div>' +
        '<div class="apercu-couleur" data-apercu hidden>' +
          '<span class="pastille" data-pst></span>' +
          '<b data-hex></b>' +
          '<button class="btn sm primary" data-ok>Choisir</button>' +
        '</div>' +
      '</div>',
      { onMount: (sh) => {
          const cv = sh.querySelector('[data-cv]');
          const ctx2d = cv.getContext('2d', { willReadFrequently: true });
          const viseur = sh.querySelector('[data-viseur]');
          const zone = sh.querySelector('[data-apercu]');
          const pst = sh.querySelector('[data-pst]');
          const hexEl = sh.querySelector('[data-hex]');
          let choisi = null;

          const im = new Image();
          im.crossOrigin = 'anonymous';
          im.onload = () => {
            const L = 640;
            const r = Math.min(1, L / Math.max(im.width, im.height));
            cv.width = Math.round(im.width * r);
            cv.height = Math.round(im.height * r);
            ctx2d.drawImage(im, 0, 0, cv.width, cv.height);
          };
          im.src = src;

          const relever = (ev) => {
            const p = ev.touches ? ev.touches[0] : ev;
            const b = cv.getBoundingClientRect();
            const x = Math.round((p.clientX - b.left) / b.width * cv.width);
            const y = Math.round((p.clientY - b.top) / b.height * cv.height);
            if (x < 0 || y < 0 || x >= cv.width || y >= cv.height) return;

            /* Moyenne sur un carré de neuf pixels : un pixel isolé
               peut être un reflet ou une poussière. */
            const t = 3;
            const d = ctx2d.getImageData(Math.max(0, x - t), Math.max(0, y - t), t * 2 + 1, t * 2 + 1).data;
            let R = 0, G = 0, B = 0, n = 0;
            for (let i = 0; i < d.length; i += 4) { R += d[i]; G += d[i + 1]; B += d[i + 2]; n++; }
            const hex = '#' + [R / n, G / n, B / n].map((v) =>
              Math.round(v).toString(16).padStart(2, '0')).join('');

            choisi = hex;
            viseur.hidden = false;
            viseur.style.left = ((p.clientX - b.left) / b.width * 100) + '%';
            viseur.style.top = ((p.clientY - b.top) / b.height * 100) + '%';
            viseur.style.background = hex;
            zone.hidden = false;
            pst.style.background = hex;
            hexEl.textContent = hex.toUpperCase();
            UI.haptic('tick');
          };

          cv.addEventListener('pointerdown', relever);
          cv.addEventListener('pointermove', (e) => { if (e.buttons) relever(e); });
          cv.addEventListener('touchmove', (e) => { e.preventDefault(); relever(e); }, { passive: false });

          sh.querySelector('[data-ok]').onclick = () => {
            if (!choisi) return;
            UI.closeSheet();
            onChoix(choisi);
          };
        } }
    );
  }

  /* Les teintes qu'on trouve vraiment dans une garde-robe. Plus
     rapide qu'un nuancier complet, et le résultat est meilleur :
     personne n'a de pantalon fuchsia électrique. */
  const PALETTE = [
    ['Noir', '#16181B'], ['Anthracite', '#33373C'], ['Gris', '#8A8F96'], ['Gris clair', '#C6CBD1'],
    ['Blanc', '#F5F4F1'], ['Écru', '#E9E1D3'], ['Beige', '#D5C3A5'], ['Camel', '#B08A5F'],
    ['Marron', '#6B4A2E'], ['Chocolat', '#41291A'], ['Kaki', '#6E6B4A'], ['Olive', '#4C5233'],
    ['Vert forêt', '#2C4A38'], ['Vert sauge', '#9BAE97'], ['Bleu marine', '#1E2A43'], ['Bleu jean', '#3E5A82'],
    ['Bleu clair', '#9EB8D4'], ['Bordeaux', '#5C1F27'], ['Rouge', '#B02A2A'], ['Rouille', '#A9552F'],
    ['Moutarde', '#C79A32'], ['Rose poudré', '#DDB6B1'], ['Violet', '#4A3A63'], ['Crème', '#F0E7D6']
  ];

  /* ============================================================
     La roue chromatique

     Le nuancier de vingt-quatre teintes allait vite mais fermait
     la porte : impossible d'attraper le bleu exact d'une chemise
     qui n'y figurait pas.

     Ici, c'est la roue complete. La teinte tourne autour du
     centre, la saturation part du centre vers le bord, et un
     curseur sous la roue regle la luminosite. On pose le doigt et
     on le deplace : la couleur suit en direct.

     Les vingt-quatre teintes restent dessous, en acces rapide,
     parce que neuf fois sur dix c'est l'une d'elles.
     ============================================================ */
  function hsl2hex(h, s2, l) {
    const a = s2 * Math.min(l, 1 - l);
    const f = (n) => {
      const k = (n + h / 30) % 12;
      const c = l - a * Math.max(-1, Math.min(k - 3, Math.min(9 - k, 1)));
      return Math.round(255 * c).toString(16).padStart(2, '0');
    };
    return '#' + f(0) + f(8) + f(4);
  }

  function choisirDansPalette(onChoix, depart) {
    let teinte = 210, sat = 0.7, lum = 0.5;

    UI.openSheet(
      '<div class="mtete" style="--t1:#6D4B9E;--t2:#C86FA8">' +
        '<h2>Choisis ta couleur</h2>' +
        '<p>Fais glisser sur la roue, puis règle la clarté.</p>' +
      '</div>' +
      '<div class="mbody">' +
        '<div class="roue-couleur">' +
          '<canvas data-roue width="320" height="320"></canvas>' +
          '<span class="curseur" data-cur></span>' +
        '</div>' +
        '<input type="range" class="jauge-lum" data-lum min="6" max="94" value="50">' +
        '<div class="apercu-couleur ouvert">' +
          '<span class="pastille" data-pst></span>' +
          '<b data-hex>#3E5A82</b>' +
          '<button class="btn sm primary" data-ok>Choisir</button>' +
        '</div>' +
        '<h4 class="ftitre">Teintes courantes</h4>' +
        '<div class="nuancier">' + PALETTE.map(([nom, hex]) =>
          '<button class="teinte" data-hex="' + hex + '" style="--c:' + hex + '">' +
            '<span></span><small>' + UI.esc(nom) + '</small></button>').join('') + '</div>' +
      '</div>',
      { onMount: (sh) => {
          const cv = sh.querySelector('[data-roue]');
          const c2 = cv.getContext('2d');
          const cur = sh.querySelector('[data-cur]');
          const pst = sh.querySelector('[data-pst]');
          const hexEl = sh.querySelector('[data-hex]');
          const lumEl = sh.querySelector('[data-lum]');
          const R = cv.width / 2;

          /* On peint la roue une fois, pixel par pixel : c'est le
             seul moyen d'avoir un vrai degre de saturation continu
             du centre vers le bord. */
          function peindre(l) {
            const im = c2.createImageData(cv.width, cv.height);
            const d = im.data;
            for (let y = 0; y < cv.height; y++) {
              for (let x = 0; x < cv.width; x++) {
                const dx = x - R, dy = y - R;
                const r = Math.sqrt(dx * dx + dy * dy);
                const k = (y * cv.width + x) * 4;
                if (r > R) { d[k + 3] = 0; continue; }
                const h = (Math.atan2(dy, dx) * 180 / Math.PI + 360) % 360;
                const sv = Math.min(1, r / R);
                const hex = hsl2hex(h, sv, l);
                d[k] = parseInt(hex.slice(1, 3), 16);
                d[k + 1] = parseInt(hex.slice(3, 5), 16);
                d[k + 2] = parseInt(hex.slice(5, 7), 16);
                d[k + 3] = r > R - 1.5 ? Math.round(255 * (R - r) / 1.5) : 255;
              }
            }
            c2.putImageData(im, 0, 0);
          }

          function majAffichage() {
            const hex = hsl2hex(teinte, sat, lum);
            pst.style.background = hex;
            hexEl.textContent = hex.toUpperCase();
            cur.style.background = hex;
            const rad = teinte * Math.PI / 180;
            cur.style.left = (50 + Math.cos(rad) * sat * 50) + '%';
            cur.style.top = (50 + Math.sin(rad) * sat * 50) + '%';
          }

          function viser(ev) {
            const p = ev.touches ? ev.touches[0] : ev;
            const b = cv.getBoundingClientRect();
            const dx = (p.clientX - b.left) / b.width * cv.width - R;
            const dy = (p.clientY - b.top) / b.height * cv.height - R;
            const r = Math.sqrt(dx * dx + dy * dy);
            teinte = (Math.atan2(dy, dx) * 180 / Math.PI + 360) % 360;
            sat = Math.min(1, r / R);
            majAffichage();
            UI.haptic('tick');
          }

          cv.addEventListener('pointerdown', (e) => { cv.setPointerCapture(e.pointerId); viser(e); });
          cv.addEventListener('pointermove', (e) => { if (e.buttons) viser(e); });
          cv.addEventListener('touchmove', (e) => { e.preventDefault(); viser(e); }, { passive: false });

          lumEl.oninput = () => { lum = Number(lumEl.value) / 100; peindre(lum); majAffichage(); };

          if (depart && /^#[0-9a-f]{6}$/i.test(depart)) {
            const r0 = parseInt(depart.slice(1, 3), 16) / 255;
            const g0 = parseInt(depart.slice(3, 5), 16) / 255;
            const b0 = parseInt(depart.slice(5, 7), 16) / 255;
            const mx = Math.max(r0, g0, b0), mn = Math.min(r0, g0, b0);
            lum = (mx + mn) / 2;
            const dd = mx - mn;
            sat = dd === 0 ? 0 : dd / (1 - Math.abs(2 * lum - 1));
            if (dd !== 0) {
              teinte = mx === r0 ? ((g0 - b0) / dd % 6) : (mx === g0 ? (b0 - r0) / dd + 2 : (r0 - g0) / dd + 4);
              teinte = (teinte * 60 + 360) % 360;
            }
            lumEl.value = Math.round(lum * 100);
          }
          peindre(lum);
          majAffichage();

          sh.querySelector('[data-ok]').onclick = () => {
            UI.closeSheet(); UI.haptic('select'); onChoix(hsl2hex(teinte, sat, lum));
          };
          sh.querySelectorAll('[data-hex][style]').forEach((b) => b.onclick = () => {
            UI.closeSheet(); UI.haptic('select'); onChoix(b.dataset.hex);
          });
        } }
    );
  }

  const bascule = (arr, v) => { const i = arr.indexOf(v); if (i >= 0) arr.splice(i, 1); else arr.push(v); };
  const safeHex = (c) => /^#[0-9a-fA-F]{6}$/.test(String(c || '')) ? c : '#888888';

  /* ============================================================
     Composition
     ============================================================ */
  /* ============================================================
     Ce qui n'a pas sa place

     Un jogging dans une tenue « classe » ou « old money » n'est
     pas une approximation, c'est une faute. Le score ne suffit
     pas : une pièce mal notée finit quand même par sortir si le
     vestiaire est petit. Ces registres appliquent donc une
     exclusion sèche, pas une pénalité.
     ============================================================ */
  const HABILLE = ['classe', 'oldmoney'];
  const BANNIS = /jogging|surv[eê]tement|jogg|short|sweat|capuche|hoodie|training|running|basket de sport|claquette|tong/i;

  function interdit(g, mood) {
    if (!mood || mood === 'random') return false;
    const nom = String(g.nom || '');
    const styles = g.styles || [];

    if (HABILLE.indexOf(mood) >= 0) {
      if (BANNIS.test(nom)) return true;
      /* Une pièce marquée « sport » et rien d'autre n'a rien à
         faire dans un registre habillé. */
      if (styles.length && styles.indexOf(mood) < 0 && styles.indexOf('sport') >= 0) return true;
    }
    if (mood === 'soiree' && /jogging|surv[eê]tement|short|claquette|tong/i.test(nom)) return true;
    if (mood === 'sport' && /costume|blazer|mocassin|derby|cravate/i.test(nom)) return true;
    return false;
  }

  function buildOutfit(mood) {
    const wx = ctx && ctx.weather;
    const temp = wx ? wx.temp : 16;
    const rain = wx ? (wx.kind === 'pluie' || wx.kind === 'orage') : false;

    /* Chaleur cible : 1 quand il fait 30 degres, 5 quand il gele. */
    const targetWarm = temp >= 26 ? 1 : temp >= 20 ? 2 : temp >= 13 ? 3 : temp >= 5 ? 4 : 5;

    function score(g) {
      let s = 50;
      /* Le registre pèse lourd : une pièce du bon style doit sortir
         presque toujours, sinon on retrouve un pantalon à pinces
         dans une tenue de sport. */
      if (mood && mood !== 'random' && g.styles && g.styles.indexOf(mood) >= 0) s += 55;
      else if (mood && mood !== 'random') s -= 28;
      if (g.chaleur) s -= Math.abs(g.chaleur - targetWarm) * 9;
      if (rain && g.pluie === false) s -= 22;
      if (g.saisons && g.saisons.length && g.saisons.indexOf(ctx.season) < 0) s -= 18;
      const rec = Reco.recentMap('tenue', 10)[g.id];
      if (rec) s *= 0.55;
      return Math.max(1, s);
    }

    const items = [];
    ['haut', 'bas', 'chaussures'].forEach((slot) => {
      const pool = bySlot(slot).filter((g) => !interdit(g, mood));
      if (!pool.length) return;
      const pick = Roulette.pick(pool, { weight: score, sharpness: 2.6 });
      if (pick) items.push(pick.id);
    });
    if (temp < 15 || rain) {
      const vestes = bySlot('veste').filter((g) => !interdit(g, mood));
      if (vestes.length) { const v = Roulette.pick(vestes, { weight: score }); if (v) items.push(v.id); }
    }
    const acc = bySlot('accessoire').filter((g) => !interdit(g, mood));
    if (acc.length && Math.random() < 0.6) {
      const a = Roulette.pick(acc, { weight: score });
      if (a) items.push(a.id);
    }
    return { mood: mood === 'random' ? SEED.MOODS[(Math.random() * SEED.MOODS.length) | 0].id : mood, items: items, nom: 'Tenue du jour' };
  }

  async function composeOutfit(moodVoulu) {
    const slots = SEED.GARMENT_SLOTS.filter((s) => bySlot(s.id).length);
    if (!slots.length) { UI.toast('Ajoute des vêtements d\'abord'); return; }
    const chosen = [];
    UI.openSheet('<div class="mbody" style="padding-top:6px"><h2 style="font-size:22px;margin-bottom:12px">Composer une tenue</h2>' +
      slots.map((s) => '<div style="margin-bottom:16px"><h4 style="font-size:12px;color:var(--muted);margin-bottom:8px;text-transform:uppercase;letter-spacing:.08em">' + UI.esc(s.nom) + '</h4>' +
        '<div class="row" style="gap:8px;overflow-x:auto;padding-bottom:4px">' + bySlot(s.id).map((g) =>
          '<button data-pick="' + UI.attr(g.id) + '" style="flex:none;width:72px;text-align:center">' +
          '<div style="position:relative;aspect-ratio:1;border-radius:var(--r-sm);overflow:hidden;background:var(--surface-2);box-shadow:var(--sh-inset)">' +
          '<div style="position:absolute;inset:0;display:grid;place-items:center;color:var(--faint)">' + Icon('shirt', 20) + '</div>' +
          Photos.img(g, 'photo', 'position:relative;width:100%;height:100%;object-fit:cover') +
          '</div><small style="font-size:10.5px;color:var(--muted);display:block;margin-top:4px">' + UI.esc(g.nom.slice(0, 14)) + '</small></button>').join('') +
        '</div></div>').join('') +
      '<label class="field"><span>Mood</span><select data-mood>' + SEED.MOODS.map((m) => '<option value="' + m.id + '"' + (m.id === moodVoulu ? ' selected' : '') + '>' + m.nom + '</option>').join('') + '</select></label>' +
      '<button class="btn primary block lg" data-save>Enregistrer la tenue</button></div>', {
      onMount: async (s) => {
        await Photos.hydrate(s);
        s.querySelectorAll('[data-pick]').forEach((b) => b.onclick = () => {
          const id = b.dataset.pick, i = chosen.indexOf(id);
          if (i >= 0) { chosen.splice(i, 1); b.style.outline = ''; }
          else { chosen.push(id); b.style.outline = '3px solid var(--accent)'; b.style.outlineOffset = '2px'; b.style.borderRadius = 'var(--r-sm)'; }
          UI.haptic('tick');
        });
        s.querySelector('[data-save]').onclick = () => {
          if (chosen.length < 2) { UI.toast('Choisis au moins deux pièces'); return; }
          Store.add('outfits', { nom: 'Tenue ' + (outfits().length + 1), mood: s.querySelector('[data-mood]').value, items: chosen.slice() });
          UI.closeSheet(); view = 'tenues'; render(); UI.toast('Tenue enregistrée');
        };
      }
    });
  }

  /* ---------- Génération IA de tenues ---------- */
  async function aiOutfits() {
    if (!AI.available()) return UI.echecIA('NO_KEY', { titre: "Inventer des tenues demande une clé IA" });
    const all = garments();
    if (all.length < 4) { UI.toast('Il faut au moins quatre pièces'); return; }
    UI.openSheet('<div class="mbody">' + UI.thinking('Association des pièces…') + '</div>');
    try {
      const list = all.map((g) => g.id + ' = ' + g.nom + ' (' + g.slot + ', couleurs ' + (g.couleurs || []).join(' ') + ', styles ' + (g.styles || []).join(' ') + ')').join('\n');
      const res = await AI.json(
        "Voici une garde-robe. Compose des tenues cohérentes en couleur et en registre.\n\n" + list + "\n\n" +
        "Règles : un haut, un bas, des chaussures au minimum ; harmonie ou contraste assume, jamais trois couleurs vives ; " +
        "au maximum deux accessoires. Cinq tenues. Utilisé uniquement les identifiants fournis.",
        AI.T.obj({ tenues: AI.T.arr(AI.T.obj({
          nom: AI.T.str('Nom court et parlant'),
          mood: AI.T.enu(['chill', 'soiree', 'classe', 'oldmoney', 'sport'], ''),
          pieces: AI.T.arr(AI.T.str('Identifiant exact'), ''),
          pourquoi: AI.T.str('Une ligne sur l accord des couleurs')
        })) }), { cache: false, temperature: 0.9 });

      const known = new Set(all.map((g) => g.id));
      let n = 0;
      (res.tenues || []).forEach((t) => {
        const items = (t.pieces || []).filter((p) => known.has(p));
        if (items.length < 2) return;
        Store.add('outfits', { nom: t.nom, mood: t.mood, items: items, note: t.pourquoi, source: 'ia' });
        n++;
      });
      UI.closeSheet(); UI.toast(n + ' tenue' + (n > 1 ? 's générées' : ' générée'));
      view = 'tenues'; render();
    } catch (e) { UI.closeSheet(); UI.echecIA(e, { titre: "Les tenues n'ont pas pu être générées" }); }
  }

  /* Le portrait enregistré dans les réglages (conservé pour le
     compte, plus utilisé pour fabriquer des images). */
  async function definirPortrait() {
    return new Promise((resolve) => {
      Photos.choisir(async (f) => {
        if (!f) { resolve(null); return; }
        UI.toast('Enregistrement…');
        const saved = await Photos.save(f, 'garments', 900);
        Store.set('portraitPhoto', saved.id);
        Store.set('portraitPhotoUrl', saved.url || null);
        UI.toast('Photo enregistrée');
        /* Les Réglages peuvent appeler cette fonction alors que la
           page Tenues n'est pas montée : pas de racine, pas de
           redessin. */
        if (root) render();
        resolve(saved.id);
      });
    });
  }

  async function portraitSource() {
    const id = Store.get('portraitPhoto', null);
    const url = Store.get('portraitPhotoUrl', null);
    if (url) return url;
    if (id) return await Photos.get(id);
    return null;
  }

  /* ============================================================
     Interactions
     ============================================================ */
  function bind() {
    root.querySelectorAll('[data-view]').forEach((b) => b.onclick = () => { view = b.dataset.view; render(); });
    root.querySelectorAll('[data-g]').forEach((b) => b.onclick = () => openGarment(b.dataset.g));
    root.querySelectorAll('[data-cat]').forEach((b) => b.onclick = () => ouvrirCategorie(b.dataset.cat));
    root.querySelectorAll('[data-rmoutfit]').forEach((b) => b.onclick = () => { Store.del('outfits', b.dataset.rmoutfit); render(); });
    root.querySelectorAll('[data-act]').forEach((b) => b.onclick = () => acts[b.dataset.act] && acts[b.dataset.act]());

    /* La bascule entre piocher et inventer. */
    root.querySelectorAll('[data-mode]').forEach((b) => b.onclick = () => {
      if (MODE() === b.dataset.mode) return;
      setMode(b.dataset.mode);
      UI.haptic('select');
      render();
      composerLeJour(true);
    });
    root.querySelectorAll('[data-relance]').forEach((b) => b.onclick = (e) => {
      e.stopPropagation();
      relancer(b.dataset.relance);
    });
    root.querySelectorAll('[data-style]').forEach((b) => b.onclick = (e) => {
      if (e.target.closest('[data-relance]')) return;
      ouvrirStyle(b.dataset.style);
    });
    root.querySelectorAll('[data-outfit]').forEach((b) => b.onclick = () => ouvrirTenue(b.dataset.outfit));
    root.querySelectorAll('[data-mood]').forEach((b) => b.onclick = () => { UI.haptic('select'); ouvrirMoodTenues(b.dataset.mood); });
  }

  const acts = {
    addGarment: addGarment,
    syncPhotos: syncPhotos,
    account: () => App.go('#/m/settings/compte'),
    composeOutfit: composeOutfit,
    aiOutfits: aiOutfits,
    regenererTout: () => { UI.haptic('light'); composerLeJour(true); },
    toutePenderie: () => toutePenderie(),
    toutesTenues: () => toutesTenues(),
    portrait: definirPortrait
  };

  App.register('outfits', { mount: mount });
  global.Outfits = { mount, definirPortrait, portraitSource };
})(window);
