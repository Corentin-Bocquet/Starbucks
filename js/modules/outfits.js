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
        ? '<div class="panel" style="text-align:center;margin-top:14px;padding:24px 18px">' +
          '<div style="margin-bottom:10px">' + Art('cible', 52) + '</div>' +
          '<b style="display:block;margin-bottom:6px;font-size:17px">Ta penderie est vide</b>' +
          '<p class="muted" style="font-size:13px;margin-bottom:14px">Ajoute des vêtements, ou passe sur « Inventer » pour voir des idées.</p>' +
          '<button class="btn primary" data-act="addGarment">' + Icon('camera', 16) + 'Prendre en photo</button></div>'
        : (tenues
            ? '<div class="carrousel" style="margin-top:14px">' + tenues.map(carteStyle).join('') + '</div>' +
              '<button class="btn block" style="margin-top:6px" data-act="regenererTout">' +
                Icon('refresh', 16) + 'Tout régénérer</button>'
            : '<div class="panel" style="text-align:center;margin-top:14px" data-attente>' +
              UI.thinking(mode === 'inventer' ? 'L\'IA compose…' : 'Composition…') + '</div>')) +
      '</div>';
  }

  function bandeauMeteo(wx) {
    return '<div class="meteo-jour">' +
      '<span class="ic">' + Icon(wx.icon, 26) + '</span>' +
      '<div class="grow"><b>' + wx.temp + '° · ' + UI.esc(wx.text) + '</b>' +
      '<small>' + UI.esc(ctx.place.name) + ' · ressenti ' + wx.feels + '°</small></div>' +
    '</div>';
  }

  /* Une carte par style. Modèle des maquettes : visuel, dégradé,
     surtitre, nom, puces, action. */
  function carteStyle(t, i) {
    const m = SEED.MOODS.find((x) => x.id === t.mood) || SEED.MOODS[0];
    const teinte = TEINTES_MOOD[t.mood] || TEINTES_MOOD.chill;
    const pieces = t.pieces || [];

    return '<div class="cartestyle" data-style="' + UI.attr(t.mood) + '" style="--g1:' + teinte[0] + ';--g2:' + teinte[1] + '">' +
      '<div class="visuel">' +
        (t.image
          ? '<img src="' + UI.attr(t.image) + '" alt="">'
          : (t.source === 'penderie'
              ? '<div class="mosaique">' + pieces.slice(0, 4).map((g) =>
                  '<span class="case">' + (g.photo || g.photoUrl
                    ? Photos.img(g, 'photo', 'width:100%;height:100%;object-fit:cover')
                    : Icon('shirt', 20)) + '</span>').join('') + '</div>'
              : Imagerie.vignette('vetement', t.resume || m.nom, { classe: 'large', cle: Imagerie.cleDe('tenue', t.mood + '-' + (t.nom || '')) }))) +
      '</div>' +
      '<div class="voile"></div>' +
      '<div class="txt">' +
        '<div class="sur">' + Icon(m.icon, 12) + UI.esc(m.nom) + '</div>' +
        '<b>' + UI.esc(t.nom || m.nom) + '</b>' +
        '<div class="puces">' + pieces.slice(0, 4).map((g) =>
          '<span>' + UI.esc(typeof g === 'string' ? g : g.nom) + '</span>').join('') + '</div>' +
      '</div>' +
      '<button class="relance" data-relance="' + UI.attr(t.mood) + '" aria-label="Régénérer">' + Icon('refresh', 15) + '</button>' +
    '</div>';
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
    if (!AI.available()) { UI.toast('Ajoute ta clé Gemini dans Réglages'); return; }
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
      /* Les visuels arrivent ensuite, un par un, sans bloquer. */
      Imagerie.peupler(root, { generer: true, max: 2 });
    } catch (e) { UI.toast(AI.humanError(e)); }
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
        (t.source === 'penderie'
          ? '<div class="grillepieces">' + (t.pieces || []).map((g) =>
              '<div class="piece"><div class="ph">' +
                (g.photo || g.photoUrl ? Photos.img(g, 'photo', 'width:100%;height:100%;object-fit:cover') : Icon('shirt', 22)) +
              '</div><small>' + UI.esc(g.nom) + '</small></div>').join('') + '</div>'
          : '<div class="list">' + (t.pieces || []).map((x) =>
              '<div class="rowitem">' + Imagerie.vignette('vetement', String(x), { classe: 'petite', style: 'w' }) +
              '<span class="tx"><b>' + UI.esc(String(x)) + '</b></span></div>').join('') + '</div>') +
        (t.pourquoi ? '<div class="rwhy" style="margin-top:12px">' + UI.esc(t.pourquoi) + '</div>' : '') +
        '<div class="ract" style="margin-top:16px">' +
          '<button class="btn primary grow lg" data-garder>' + Icon('star', 17) + 'Garder cette tenue</button>' +
          '<button class="btn lg" data-relance2 aria-label="Régénérer">' + Icon('refresh', 17) + '</button>' +
        '</div>' +
        (AI.available()
          ? '<button class="btn block" style="margin-top:8px" data-porte>' + Icon('sparkle', 16) + 'Me voir avec</button>'
          : '') +
      '</div>',
      { onMount: async (sh) => {
          await Photos.hydrate(sh);
          Imagerie.peupler(sh, { generer: true, max: 5 });
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
          const p = sh.querySelector('[data-porte]');
          if (p) p.onclick = () => { UI.closeSheet(); porte(t); };
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

  /* ============================================================
     Penderie
     ============================================================ */
  function wardrobeView() {
    const all = garments();
    return '<div class="section">' +
      '<div class="row-between" style="margin-bottom:12px">' +
        '<b style="font-size:17px">' + all.length + ' pièce' + (all.length > 1 ? 's' : '') + '</b>' +
        '<button class="btn sm primary" data-act="addGarment">' + Icon('camera', 15) + 'Ajouter</button>' +
      '</div>' +
      photoSyncBlock(all) +
      (all.length ? SEED.GARMENT_SLOTS.map((s) => {
        const list = bySlot(s.id);
        if (!list.length) return '';
        return '<div class="section" style="padding-top:8px"><div class="sechead"><h2 style="font-size:15px">' + UI.esc(s.nom) + '</h2><span>' + list.length + '</span></div>' +
          '<div class="grid tight" style="grid-template-columns:repeat(auto-fill,minmax(104px,1fr))">' +
          list.map((g) => '<div class="card" data-g="' + UI.attr(g.id) + '">' +
            '<div class="ph" style="position:relative;aspect-ratio:1">' +
            '<div style="position:absolute;inset:0;display:grid;place-items:center;color:var(--faint)">' + Icon('shirt', 24) + '</div>' +
            Photos.img(g, 'photo', 'position:relative;width:100%;height:100%;object-fit:cover') +
            '</div><div class="bd" style="padding:8px 9px 10px"><h3 style="font-size:12.5px">' + UI.esc(g.nom) + '</h3>' +
            (g.couleurs ? '<div class="row" style="gap:3px;margin-top:5px">' + (g.couleurs || []).slice(0, 4).map((c) =>
              '<span style="width:11px;height:11px;border-radius:50%;background:' + UI.attr(c) + ';box-shadow:inset 0 0 0 1px rgba(0,0,0,.15)"></span>').join('') + '</div>' : '') +
            '</div></div>').join('') + '</div></div>';
      }).join('') : UI.empty('shirt', 'Penderie vide', 'Prends tes vêtements en photo : l\'IA reconnaît le type, les couleurs et le style.')) +
      '</div>';
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
  function outfitsView() {
    const all = outfits();
    return '<div class="section">' +
      '<div class="row-between" style="margin-bottom:12px">' +
        '<b style="font-size:17px">' + all.length + ' tenue' + (all.length > 1 ? 's' : '') + '</b>' +
        '<div class="btnrow">' +
          '<button class="btn sm" data-act="composeOutfit">' + Icon('plus', 15) + 'Composer</button>' +
          (AI.available() ? '<button class="btn sm primary" data-act="aiOutfits">' + Icon('sparkle', 15) + 'Générer</button>' : '') +
        '</div>' +
      '</div>' +
      (all.length ? all.map((o) => outfitRow(o)).join('')
        : UI.empty('shirt', 'Aucune tenue', 'Compose la tienne, ou laisse l\'IA associer tes pièces par couleur et par style.')) +
      '</div>';
  }

  function outfitRow(o) {
    const items = (o.items || []).map((id) => garments().find((g) => g.id === id)).filter(Boolean);
    const teinte = TEINTES_MOOD[o.mood] || TEINTES_MOOD.chill;
    const noms = items.length ? items.map((g) => g.nom) : (o.pieces || []);
    return '<button class="tenue-ligne" data-outfit="' + UI.attr(o.id) + '" style="--g1:' + teinte[0] + ';--g2:' + teinte[1] + '">' +
      '<span class="apercu">' +
        (items.length
          ? items.slice(0, 4).map((g) => '<span class="c">' +
              (g.photo || g.photoUrl ? Photos.img(g, 'photo', 'width:100%;height:100%;object-fit:cover') : Icon('shirt', 15)) +
            '</span>').join('')
          : '<span class="c seul">' + Icon('sparkle', 20) + '</span>') +
      '</span>' +
      '<span class="tx"><b>' + UI.esc(o.nom || 'Tenue') + '</b>' +
        '<small>' + UI.esc(moodName(o.mood)) + (noms.length ? ' · ' + UI.esc(noms.slice(0, 3).join(', ')) : '') + '</small></span>' +
      '<span class="rt">' + Icon('next', 15) + '</span>' +
    '</button>';
  }

  /* ============================================================
     Une tenue enregistrée, entièrement modifiable

     Le nom, les pièces, le registre : tout se change. Une tenue
     figée dès sa création n'a aucun intérêt, on la refait à la
     main la fois suivante.
     ============================================================ */
  function ouvrirTenue(id) {
    const o = Store.find('outfits', id);
    if (!o) return;
    let brouillon = {
      nom: o.nom || 'Tenue',
      mood: o.mood || 'chill',
      items: (o.items || []).slice()
    };
    const teinte = () => TEINTES_MOOD[brouillon.mood] || TEINTES_MOOD.chill;

    const corps = () => {
      const parSlot = SEED.GARMENT_SLOTS
        .map((sl) => ({ sl: sl, liste: bySlot(sl.id) }))
        .filter((x) => x.liste.length);

      return '<div class="mbody">' +
        '<label class="field"><span>Nom</span>' +
          '<input type="text" data-nom value="' + UI.attr(brouillon.nom) + '"></label>' +

        '<h4 class="ftitre">Registre</h4>' +
        '<div class="chips">' + SEED.MOODS.map((m) =>
          '<button class="chip' + (brouillon.mood === m.id ? ' on' : '') + '" data-mo="' + m.id + '">' +
          Icon(m.icon, 14) + UI.esc(m.nom) + '</button>').join('') + '</div>' +

        parSlot.map((x) =>
          '<h4 class="ftitre">' + UI.esc(x.sl.nom) + '</h4>' +
          '<div class="choixpieces">' + x.liste.map((g) =>
            '<button class="pc' + (brouillon.items.indexOf(g.id) >= 0 ? ' on' : '') + '" data-pc="' + UI.attr(g.id) + '">' +
              '<span class="ph">' +
                (g.photo || g.photoUrl ? Photos.img(g, 'photo', 'width:100%;height:100%;object-fit:cover') : Icon('shirt', 18)) +
              '</span><small>' + UI.esc(g.nom) + '</small></button>').join('') + '</div>').join('') +

        '<button class="btn primary block lg" style="margin-top:18px" data-save>' + Icon('check', 18) + 'Enregistrer</button>' +
        (AI.available() ? '<button class="btn block" style="margin-top:8px" data-porte>' + Icon('sparkle', 16) + 'Me voir avec</button>' : '') +
        '<button class="btn danger block" style="margin-top:8px" data-sup>' + Icon('trash', 16) + 'Supprimer</button>' +
      '</div>';
    };

    const entete = () =>
      '<div class="result plein"><div class="rtete" style="--g1:' + teinte()[0] + ';--g2:' + teinte()[1] + '">' +
        '<div class="sur">' + UI.esc(moodName(brouillon.mood)) + '</div>' +
        '<div class="titreligne"><h3>' + UI.esc(brouillon.nom) + '</h3>' +
        '<span class="valeur">' + brouillon.items.length + ' pièces</span></div>' +
      '</div></div>';

    UI.openSheet(entete() + corps(), { onMount: monter });

    async function monter(sh) {
      await Photos.hydrate(sh);
      const relire = () => { brouillon.nom = sh.querySelector('[data-nom]').value.trim() || 'Tenue'; };
      const redessiner = () => { relire(); sh.innerHTML = sh.innerHTML; UI.closeSheet(); UI.openSheet(entete() + corps(), { onMount: monter }); };

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
        if (!await UI.confirmSheet('Supprimer ?', 'La tenue disparaît, les vêtements restent.', true)) { ouvrirTenue(id); return; }
        Store.del('outfits', id); UI.closeSheet(); render();
      };
      const p = sh.querySelector('[data-porte]');
      if (p) p.onclick = () => {
        relire();
        UI.closeSheet();
        porte({ nom: brouillon.nom, mood: brouillon.mood, items: brouillon.items, source: 'penderie',
                pieces: brouillon.items.map((x) => garments().find((g) => g.id === x)).filter(Boolean) });
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

  function addGarment() {
    /* Photos.pick corrige la premiere photo qui ne declenchait rien. */
    Photos.pick(async (files) => {
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
          let meta = { nom: 'Pièce ' + (garments().length + 1), slot: 'haut', couleurs: ['#888888'], styles: ['chill'], chaleur: 3 };
          if (AI.available()) {
            try { meta = await reconnaitre(small); } catch (e) { console.warn(e); }
          }
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
          ((g.photo || g.photoUrl) ? '<button class="btn sm" data-pipette>' + Icon('search', 15) + 'Pipette sur la photo</button>' : '') +
          '<button class="btn sm" data-palette>' + Icon('sparkle', 15) + 'Palette</button>' +
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
        Photos.pick(async (f) => {
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
        if (!AI.available()) { UI.toast('Ajoute ta clé Gemini dans Réglages'); return; }
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
        } catch (e) { UI.toast(AI.humanError(e)); }
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

  function choisirDansPalette(onChoix) {
    UI.openSheet(
      '<div class="mbody" style="padding-top:6px">' +
        '<h2 style="font-size:21px;margin-bottom:12px">Une couleur</h2>' +
        '<div class="nuancier">' + PALETTE.map(([nom, hex]) =>
          '<button class="teinte" data-hex="' + hex + '" style="--c:' + hex + '">' +
            '<span></span><small>' + UI.esc(nom) + '</small></button>').join('') + '</div>' +
      '</div>',
      { onMount: (sh) => sh.querySelectorAll('[data-hex]').forEach((b) => b.onclick = () => {
          UI.closeSheet(); UI.haptic('select'); onChoix(b.dataset.hex);
        }) }
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

  async function composeOutfit() {
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
      '<label class="field"><span>Mood</span><select data-mood>' + SEED.MOODS.map((m) => '<option value="' + m.id + '">' + m.nom + '</option>').join('') + '</select></label>' +
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
    if (!AI.available()) { UI.toast('Ajoute ta clé Gemini dans Réglages'); return; }
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
    } catch (e) { UI.closeSheet(); UI.toast(AI.humanError(e)); }
  }

  /* ============================================================
     Me voir avec

     Le portrait de référence est enregistré une fois dans les
     réglages, puis réutilisé. L'image est fabriquée à partir de ce
     portrait et des photos des vêtements.

     Deux limites qu'il faut dire : Google refuse parfois de
     représenter une personne réelle, et la ressemblance n'est
     jamais garantie. Ce n'est pas un réglage de l'application.
     ============================================================ */
  async function definirPortrait() {
    return new Promise((resolve) => {
      Photos.pick(async (f) => {
        if (!f) { resolve(null); return; }
        UI.toast('Enregistrement…');
        const saved = await Photos.save(f, 'garments', 900);
        Store.set('portraitPhoto', saved.id);
        Store.set('portraitPhotoUrl', saved.url || null);
        UI.toast('Portrait enregistré');
        render();
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

  async function porte(t) {
    if (!AI.available()) { UI.toast('Ajoute ta clé Gemini dans Réglages'); return; }

    let src = await Photos.versDataUrl(await portraitSource());
    if (!src) {
      const ok = await UI.confirmSheet('Une photo de toi',
        "Pour t'afficher habillé, il faut une photo de référence. Elle reste sur ton appareil.", false);
      if (!ok) return;
      await definirPortrait();
      src = await Photos.versDataUrl(await portraitSource());
      if (!src) return;
    }

    UI.openSheet('<div class="mbody">' + UI.thinking("Génération de l'aperçu…") + '</div>');
    try {
      const images = [src];
      const pieces = t.pieces || [];
      const decrits = [];

      for (const g of pieces.slice(0, 5)) {
        if (typeof g === 'string') { decrits.push(g); continue; }
        const ph = await Photos.pourIA(g);
        if (ph) images.push(ph); else decrits.push(g.nom);
      }

      const consigne =
        'La première image est un portrait de la personne à habiller. ' +
        (images.length > 1 ? 'Les images suivantes sont ses vêtements. ' : '') +
        (decrits.length ? 'Ajoute aussi : ' + decrits.join(', ') + '. ' : '') +
        'Génère une photographie de cette personne portant exactement cette tenue, ' +
        'debout, en pied, cadrage vertical, fond uni gris clair, lumière naturelle douce. ' +
        'Respecte fidèlement les couleurs et les coupes. Aucun texte, aucun logo.';

      const out = await AI.vision(images, consigne, null, { kind: 'image', wantImages: true, cache: false });
      const dataUrl = extraireImage(out);

      if (dataUrl) {
        const saved = await Photos.save(dataUrl, 'illustrations', 1000);
        UI.openSheet(
          '<div class="mimg cover"><img src="' + UI.attr(saved.url || dataUrl) + '" alt=""></div>' +
          '<div class="mbody"><h2 style="font-size:21px">' + UI.esc(t.nom || 'Aperçu') + '</h2>' +
          '<p class="muted" style="font-size:12.5px;margin-top:8px">Image générée, à titre indicatif.</p>' +
          '<button class="btn block" style="margin-top:14px" data-refaire>' + Icon('refresh', 16) + 'Refaire</button></div>',
          { onMount: (sh) => { sh.querySelector('[data-refaire]').onclick = () => { UI.closeSheet(); porte(t); }; } });
      } else {
        UI.openSheet('<div class="mbody"><h2 style="font-size:20px">Aperçu indisponible</h2>' +
          '<p class="mdesc">Le modèle a refusé de représenter une personne réelle, ou il n\'est pas ' +
          'disponible sur ta clé. C\'est une restriction côté Google, pas un réglage de l\'application.</p></div>');
      }
    } catch (e) {
      UI.closeSheet();
      UI.toast(AI.humanError(e) || 'Aperçu impossible');
    }
  }

  function extraireImage(out) {
    if (!out) return null;
    if (out.images && out.images.length) {
      const im = out.images[0];
      if (typeof im === 'string') return im;
      if (im.data) return 'data:' + (im.mimeType || 'image/png') + ';base64,' + im.data;
    }
    const texte = typeof out === 'string' ? out : (out.text || '');
    const m = /data:image\/[a-z+]+;base64,[A-Za-z0-9+/=]+/.exec(texte);
    return m ? m[0] : null;
  }

  /* ============================================================
     Interactions
     ============================================================ */
  function bind() {
    root.querySelectorAll('[data-view]').forEach((b) => b.onclick = () => { view = b.dataset.view; render(); });
    root.querySelectorAll('[data-g]').forEach((b) => b.onclick = () => openGarment(b.dataset.g));
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

    Imagerie.peupler(root, { generer: MODE() === 'inventer', max: 2 });
  }

  const acts = {
    addGarment: addGarment,
    syncPhotos: syncPhotos,
    account: () => App.go('#/m/settings/compte'),
    composeOutfit: composeOutfit,
    aiOutfits: aiOutfits,
    regenererTout: () => { UI.haptic('light'); composerLeJour(true); },
    portrait: definirPortrait
  };

  App.register('outfits', { mount: mount });
  global.Outfits = { mount };
})(window);
