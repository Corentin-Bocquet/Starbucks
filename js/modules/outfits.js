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
     ============================================================ */
  function dayView() {
    const wx = ctx && ctx.weather;
    const pick = Store.get('outfitToday', null);
    const fresh = pick && pick.day === UI.day.today();

    return '<div class="section">' +
      (wx ? '<div class="panel row" style="gap:14px;align-items:center">' +
        '<span style="color:var(--accent)">' + Icon(wx.icon, 30) + '</span>' +
        '<div class="grow"><b style="font-size:17px">' + wx.temp + '° · ' + UI.esc(wx.text) + '</b>' +
        '<small class="muted" style="display:block">' + UI.esc(ctx.place.name) + ' · ressenti ' + wx.feels + '° · vent ' + wx.wind + ' km/h</small></div>' +
      '</div>' : '') +
      '<div class="chips" style="margin-top:14px">' +
        SEED.MOODS.map((m) => '<button class="chip" data-mood="' + m.id + '">' + Icon(m.icon, 15) + UI.esc(m.nom) + '</button>').join('') +
        '<button class="chip" data-mood="random">' + Icon('dice', 15) + 'Au hasard</button>' +
      '</div>' +
      (fresh ? outfitCard(pick.outfit, pick.pourquoi) :
        '<div class="panel" style="text-align:center;padding:26px 18px">' +
        '<div class="ei" style="width:52px;height:52px;margin:0 auto 12px;border-radius:16px;display:grid;place-items:center;background:var(--accent-soft);color:var(--accent)">' + Icon('shirt', 26) + '</div>' +
        '<b style="display:block;margin-bottom:6px;font-size:17px">Tu t\'habilles comment aujourd\'hui ?</b>' +
        '<p class="muted" style="font-size:13px">Choisis une ambiance juste au-dessus. La météo et l\'heure sont déjà prises en compte.</p>' +
        (garments().length < 3 ? '<button class="btn primary" style="margin-top:14px" data-act="addGarment">' + Icon('plus', 16) + 'Ajouter des vêtements</button>' : '') +
        '</div>') +
      '</div>';
  }

  function outfitCard(o, why) {
    const items = (o.items || []).map((id) => garments().find((g) => g.id === id)).filter(Boolean);
    return '<div class="result" style="margin-top:14px"><div class="rbody">' +
      '<div class="rkick">' + UI.esc(moodName(o.mood)) + '</div>' +
      '<h3>' + UI.esc(o.nom || 'Tenue du jour') + '</h3>' +
      '<div class="grid tight" style="grid-template-columns:repeat(auto-fill,minmax(88px,1fr));margin-top:14px">' +
        items.map((g) => '<div style="text-align:center">' +
          '<div style="position:relative;aspect-ratio:1;border-radius:var(--r-md);overflow:hidden;background:var(--surface-2)">' +
          '<div style="position:absolute;inset:0;display:grid;place-items:center;color:var(--faint)">' + Icon('shirt', 22) + '</div>' +
          Photos.img(g, 'photo', 'position:relative;width:100%;height:100%;object-fit:cover') +
          '</div><small style="display:block;font-size:11px;margin-top:5px;color:var(--muted)">' + UI.esc(g.nom) + '</small></div>').join('') +
      '</div>' +
      (why ? '<div class="rwhy"><b>Pourquoi ? </b>' + UI.esc(why) + '</div>' : '') +
      '<div class="ract">' +
        '<button class="btn sm primary" data-act="another">' + Icon('refresh', 15) + 'Une autre</button>' +
        '<button class="btn sm" data-act="saveOutfit">' + Icon('star', 15) + 'Garder</button>' +
        (AI.available() ? '<button class="btn sm ghost" data-act="preview">' + Icon('sparkle', 15) + 'Voir sur moi</button>' : '') +
      '</div></div></div>';
  }
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
    return '<div class="panel" style="margin-bottom:10px">' +
      '<div class="row-between" style="margin-bottom:10px">' +
        '<div><b style="font-size:15px">' + UI.esc(o.nom || 'Tenue') + '</b>' +
        '<small class="muted" style="display:block">' + UI.esc(moodName(o.mood)) + '</small></div>' +
        '<button class="tbtn" data-rmoutfit="' + UI.attr(o.id) + '">' + Icon('trash', 16) + '</button>' +
      '</div>' +
      '<div class="row" style="gap:7px;overflow-x:auto">' + items.map((g) =>
        '<div style="position:relative;flex:none;width:64px;height:64px;border-radius:var(--r-sm);overflow:hidden;background:var(--surface-2)">' +
        '<div style="position:absolute;inset:0;display:grid;place-items:center;color:var(--faint)">' + Icon('shirt', 18) + '</div>' +
        Photos.img(g, 'photo', 'position:relative;width:100%;height:100%;object-fit:cover') +
        '</div>').join('') + '</div></div>';
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
        const src = g.photoUrl || (g.photo ? await Photos.get(g.photo) : null);
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

  const bascule = (arr, v) => { const i = arr.indexOf(v); if (i >= 0) arr.splice(i, 1); else arr.push(v); };
  const safeHex = (c) => /^#[0-9a-fA-F]{6}$/.test(String(c || '')) ? c : '#888888';

  /* ============================================================
     Composition
     ============================================================ */
  function buildOutfit(mood) {
    const wx = ctx && ctx.weather;
    const temp = wx ? wx.temp : 16;
    const rain = wx ? (wx.kind === 'pluie' || wx.kind === 'orage') : false;

    /* Chaleur cible : 1 quand il fait 30 degres, 5 quand il gele. */
    const targetWarm = temp >= 26 ? 1 : temp >= 20 ? 2 : temp >= 13 ? 3 : temp >= 5 ? 4 : 5;

    function score(g) {
      let s = 50;
      if (mood && mood !== 'random' && g.styles && g.styles.indexOf(mood) >= 0) s += 30;
      else if (mood && mood !== 'random') s -= 12;
      if (g.chaleur) s -= Math.abs(g.chaleur - targetWarm) * 9;
      if (rain && g.pluie === false) s -= 22;
      if (g.saisons && g.saisons.length && g.saisons.indexOf(ctx.season) < 0) s -= 18;
      const rec = Reco.recentMap('tenue', 10)[g.id];
      if (rec) s *= 0.55;
      return Math.max(1, s);
    }

    const items = [];
    ['haut', 'bas', 'chaussures'].forEach((slot) => {
      const pool = bySlot(slot);
      if (!pool.length) return;
      const pick = Roulette.pick(pool, { weight: score, sharpness: 2 });
      if (pick) items.push(pick.id);
    });
    if (temp < 15 || rain) {
      const vestes = bySlot('veste');
      if (vestes.length) { const v = Roulette.pick(vestes, { weight: score }); if (v) items.push(v.id); }
    }
    const acc = bySlot('accessoire');
    if (acc.length && Math.random() < 0.6) {
      const a = Roulette.pick(acc, { weight: score });
      if (a) items.push(a.id);
    }
    return { mood: mood === 'random' ? SEED.MOODS[(Math.random() * SEED.MOODS.length) | 0].id : mood, items: items, nom: 'Tenue du jour' };
  }

  function suggest(mood) {
    if (garments().length < 3) { UI.toast('Ajoute au moins un haut, un bas et des chaussures'); return; }
    const o = buildOutfit(mood);
    if (o.items.length < 2) { UI.toast('Pas assez de pièces compatibles'); return; }
    const wx = ctx && ctx.weather;
    const why = wx
      ? wx.text.toLowerCase() + ', ' + wx.temp + ' degres a ' + ctx.place.name + ' : ' +
        (wx.temp < 12 ? 'on couvre' : wx.temp > 24 ? 'on allège' : 'température moyenne') +
        (wx.kind === 'pluie' ? ', et il pleut' : '') + '.'
      : null;
    Store.set('outfitToday', { day: UI.day.today(), outfit: o, pourquoi: why });
    o.items.forEach((id) => Store.log('tenue', { id: id }));
    UI.haptic('success');
    render();
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

  /* ---------- Aperçu porte ----------
     Généré une image à partir des photos des vêtements et d'un
     portrait de référence. C'est experimental : la ressemblance
     n'est jamais garantie, et le modele peut refuser. On le dit. */
  async function preview() {
    const pick = Store.get('outfitToday', null);
    if (!pick) return;
    const portrait = Store.get('portraitPhoto', null);
    if (!portrait) {
      const ok = await UI.confirmSheet('Une photo de toi', "Pour t'afficher habille, il faut une photo de référence. Elle reste sur ton appareil.", false);
      if (!ok) return;
      const input = document.createElement('input');
      input.type = 'file'; input.accept = 'image/*';
      input.onchange = async () => {
        const f = input.files && input.files[0];
        if (!f) return;
        const saved = await Photos.save(f, 'garments', 900);
        Store.set('portraitPhoto', saved.id);
        Store.set('portraitPhotoUrl', saved.url || null);
        preview();
      };
      input.click();
      return;
    }

    UI.openSheet('<div class="mbody">' + UI.thinking('Génération de l\'aperçu…') + '</div>');
    try {
      const items = (pick.outfit.items || []).map((id) => garments().find((g) => g.id === id)).filter(Boolean);
      const imgs = [await Photos.get(portrait) || Store.get('portraitPhotoUrl', null)];
      for (const g of items.slice(0, 4)) {
        const p = await Photos.get(g.photo) || (g.photoUrl ? await Photos.get(g.photoUrl) : null);
        if (p) imgs.push(p);
      }

      const res = await AI.vision(imgs,
        "La première image est un portrait. Les suivantes sont des vêtements. " +
        "Généré une image de cette personne portant exactement ces vêtements, en pied, cadrage neutre, fond uni clair, lumière naturelle. " +
        "Respecte les couleurs et les coupes des vêtements fournis.",
        null, { kind: 'image', wantImages: true, cache: false });

      /* Certains modeles renvoient l'image en base64 dans le texte,
         d'autres refusent la génération de personnes reelles. */
      const m = /data:image\/[a-z]+;base64,[A-Za-z0-9+/=]+/.exec(out || '');
      if (m) {
        UI.openSheet('<div class="mimg"><img src="' + m[0] + '" alt=""></div>' +
          '<div class="mbody"><h2 style="font-size:20px">Aperçu</h2>' +
          '<p class="muted" style="font-size:12.5px;margin-top:8px">Image générée, a titre indicatif.</p></div>');
      } else {
        UI.openSheet('<div class="mbody"><h2 style="font-size:20px">Aperçu indisponible</h2>' +
          '<p class="mdesc">Le modèle d\'image a refusé de représenter une personne réelle, ou n\'est pas disponible sur ta clé. ' +
          'C\'est une restriction côté Google, pas un reglage de l\'application.</p>' +
          (out ? '<div class="rwhy" style="margin-top:12px">' + UI.esc(String(out).slice(0, 400)) + '</div>' : '') + '</div>');
      }
    } catch (e) {
      UI.closeSheet(); UI.toast(AI.humanError(e) || 'Aperçu impossible');
    }
  }

  /* ============================================================
     Interactions
     ============================================================ */
  function bind() {
    root.querySelectorAll('[data-view]').forEach((b) => b.onclick = () => { view = b.dataset.view; render(); });
    root.querySelectorAll('[data-mood]').forEach((b) => { if (b.dataset.mood) b.onclick = () => suggest(b.dataset.mood); });
    root.querySelectorAll('[data-g]').forEach((b) => b.onclick = () => openGarment(b.dataset.g));
    root.querySelectorAll('[data-rmoutfit]').forEach((b) => b.onclick = () => { Store.del('outfits', b.dataset.rmoutfit); render(); });
    root.querySelectorAll('[data-act]').forEach((b) => b.onclick = () => acts[b.dataset.act] && acts[b.dataset.act]());
  }

  const acts = {
    addGarment: addGarment,
    syncPhotos: syncPhotos,
    account: () => App.go('#/m/settings/compte'),
    composeOutfit: composeOutfit,
    aiOutfits: aiOutfits,
    preview: preview,
    another: () => { const p = Store.get('outfitToday', null); suggest(p ? p.outfit.mood : 'random'); },
    saveOutfit: () => {
      const p = Store.get('outfitToday', null);
      if (!p) return;
      Store.add('outfits', Object.assign({}, p.outfit, { nom: 'Tenue du ' + UI.fmt.dateShort(Date.now()) }));
      UI.toast('Tenue gardee');
      if (global.Game) Game.award('tenue', 5);
    }
  };

  App.register('outfits', { mount: mount });
  global.Outfits = { mount };
})(window);
