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
        '<b style="display:block;margin-bottom:6px">Quel registre aujourd\'hui ?</b>' +
        '<p class="muted" style="font-size:13px">Choisis un mood ci-dessus. La météo et l\'heure sont déjà prises en compte.</p>' +
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
          '<div style="aspect-ratio:1;border-radius:var(--r-md);overflow:hidden;background:var(--surface-2)">' +
          (g.photo ? '<img data-photo="' + UI.attr(g.photo) + '" style="width:100%;height:100%;object-fit:cover" alt="">'
                   : '<div style="width:100%;height:100%;display:grid;place-items:center;color:var(--faint)">' + Icon('shirt', 22) + '</div>') +
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
      (all.length ? SEED.GARMENT_SLOTS.map((s) => {
        const list = bySlot(s.id);
        if (!list.length) return '';
        return '<div class="section" style="padding-top:8px"><div class="sechead"><h2 style="font-size:15px">' + UI.esc(s.nom) + '</h2><span>' + list.length + '</span></div>' +
          '<div class="grid tight" style="grid-template-columns:repeat(auto-fill,minmax(104px,1fr))">' +
          list.map((g) => '<div class="card" data-g="' + UI.attr(g.id) + '">' +
            '<div class="ph" style="aspect-ratio:1">' +
            (g.photo ? '<img data-photo="' + UI.attr(g.photo) + '" alt="">' : '<div style="width:100%;height:100%;display:grid;place-items:center;color:var(--faint)">' + Icon('shirt', 24) + '</div>') +
            '</div><div class="bd" style="padding:8px 9px 10px"><h3 style="font-size:12.5px">' + UI.esc(g.nom) + '</h3>' +
            (g.couleurs ? '<div class="row" style="gap:3px;margin-top:5px">' + (g.couleurs || []).slice(0, 4).map((c) =>
              '<span style="width:11px;height:11px;border-radius:50%;background:' + UI.attr(c) + ';box-shadow:inset 0 0 0 1px rgba(0,0,0,.15)"></span>').join('') + '</div>' : '') +
            '</div></div>').join('') + '</div></div>';
      }).join('') : UI.empty('shirt', 'Penderie vide', 'Prends tes vêtements en photo : l\'IA reconnaît le type, les couleurs et le style.')) +
      '</div>';
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
        '<div style="flex:none;width:64px;height:64px;border-radius:var(--r-sm);overflow:hidden;background:var(--surface-2)">' +
        (g.photo ? '<img data-photo="' + UI.attr(g.photo) + '" style="width:100%;height:100%;object-fit:cover" alt="">'
                 : '<div style="width:100%;height:100%;display:grid;place-items:center;color:var(--faint)">' + Icon('shirt', 18) + '</div>') +
        '</div>').join('') + '</div></div>';
  }

  /* ============================================================
     Ajout d'un vêtement avec reconnaissance
     ============================================================ */
  const GARMENT_SCHEMA = AI.T.obj({
    nom: AI.T.str('Nom court, en francais, ex. chemise en lin beige'),
    slot: AI.T.enu(['haut', 'bas', 'chaussures', 'veste', 'sousvetement', 'chaussettes', 'accessoire'], ''),
    couleurs: AI.T.arr(AI.T.str('Code hexadecimal, ex. #2C3E50'), 'Une a trois couleurs dominantes'),
    matiere: AI.T.str('Matière apparente'),
    styles: AI.T.arr(AI.T.enu(['chill', 'soiree', 'classe', 'oldmoney', 'sport'], ''), 'Registres qui conviennent'),
    saisons: AI.T.arr(AI.T.enu(['printemps', 'ete', 'automne', 'hiver'], ''), ''),
    chaleur: AI.T.int('De 1 (très leger) a 5 (très chaud)'),
    pluie: AI.T.bool('Convient sous la pluie')
  }, ['nom', 'slot', 'couleurs']);

  function addGarment() {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = 'image/*'; input.multiple = true;
    input.onchange = async () => {
      const files = Array.from(input.files || []);
      if (!files.length) return;
      UI.openSheet('<div class="mbody">' + UI.thinking('Analyse de ' + files.length + ' photo' + (files.length > 1 ? 's' : '') + '…') + '</div>');
      let n = 0;
      for (const f of files) {
        try {
          const small = await AI.shrink(f, 1000, 0.82);
          const photoId = await Photos.put(small);
          let meta = { nom: 'Piece ' + (garments().length + 1), slot: 'haut', couleurs: ['#888888'], styles: ['chill'], chaleur: 3 };
          if (AI.available()) {
            try {
              meta = await AI.vision([small],
                "Decris ce vêtement pour un dressing numérique. Sois précis sur les couleurs : donne des codes hexadecimaux fideles. " +
                "Si plusieurs vêtements sont visibles, decris le plus au premier plan. Réponds en francais.",
                GARMENT_SCHEMA, { cache: false });
            } catch (e) {}
          }
          Store.add('garments', Object.assign({ photo: photoId }, meta));
          n++;
        } catch (e) { console.warn(e); }
      }
      UI.closeSheet();
      UI.toast(n + ' pièce' + (n > 1 ? 's ajoutées' : ' ajoutée'));
      if (n && global.Game) Game.award('vetement', 5);
      view = 'penderie'; render();
    };
    input.click();
  }

  function openGarment(id) {
    const g = Store.find('garments', id);
    if (!g) return;
    UI.openSheet(
      (g.photo ? '<div class="mimg"><img data-photo="' + UI.attr(g.photo) + '" alt=""></div>' : '') +
      '<div class="mbody"><h2 style="font-size:22px">' + UI.esc(g.nom) + '</h2>' +
      '<div class="mtags" style="margin-top:10px">' +
        '<span class="tg b">' + UI.esc((SEED.GARMENT_SLOTS.find((s) => s.id === g.slot) || {}).nom || g.slot) + '</span>' +
        (g.matiere ? '<span class="tg">' + UI.esc(g.matiere) + '</span>' : '') +
        (g.styles || []).map((s) => '<span class="tg">' + UI.esc(moodName(s)) + '</span>').join('') +
      '</div>' +
      (g.couleurs && g.couleurs.length ? '<div class="row" style="gap:8px;margin-top:14px">' + g.couleurs.map((c) =>
        '<span style="width:30px;height:30px;border-radius:10px;background:' + UI.attr(c) + ';box-shadow:inset 0 0 0 1px rgba(0,0,0,.15)"></span>').join('') + '</div>' : '') +
      '<div class="btnrow" style="margin-top:20px">' +
        '<button class="btn grow" data-rename>' + Icon('edit', 16) + 'Renommer</button>' +
        '<button class="btn danger" data-del>' + Icon('trash', 16) + 'Supprimer</button>' +
      '</div></div>', {
      onMount: async (s) => {
        await Photos.hydrate(s);
        s.querySelector('[data-del]').onclick = async () => {
          await Photos.del(g.photo); Store.del('garments', id); UI.closeSheet(); render();
        };
        s.querySelector('[data-rename]').onclick = async () => {
          const r = await UI.promptSheet('Renommer', [{ name: 'nom', label: 'Nom', value: g.nom }], 'Enregistrer');
          if (r && r.nom) { Store.put('garments', id, { nom: r.nom }); render(); }
        };
      }
    });
  }

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
          '<div style="aspect-ratio:1;border-radius:var(--r-sm);overflow:hidden;background:var(--surface-2);box-shadow:var(--sh-inset)">' +
          (g.photo ? '<img data-photo="' + UI.attr(g.photo) + '" style="width:100%;height:100%;object-fit:cover" alt="">' : Icon('shirt', 20)) +
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
        const id = await Photos.put(f, 900);
        Store.set('portraitPhoto', id);
        preview();
      };
      input.click();
      return;
    }

    UI.openSheet('<div class="mbody">' + UI.thinking('Génération de l\'aperçu…') + '</div>');
    try {
      const items = (pick.outfit.items || []).map((id) => garments().find((g) => g.id === id)).filter(Boolean);
      const imgs = [await Photos.get(portrait)];
      for (const g of items.slice(0, 4)) { const p = await Photos.get(g.photo); if (p) imgs.push(p); }

      const out = await AI.vision(imgs,
        "La première image est un portrait. Les suivantes sont des vêtements. " +
        "Généré une image de cette personne portant exactement ces vêtements, en pied, cadrage neutre, fond uni clair, lumière naturelle. " +
        "Respecte les couleurs et les coupes des vêtements fournis.",
        null, { model: 'gemini-2.5-flash-image', cache: false });

      /* Certains modeles renvoient l'image en base64 dans le texte,
         d'autres refusent la génération de personnes reelles. */
      const m = /data:image\/[a-z]+;base64,[A-Za-z0-9+/=]+/.exec(out || '');
      if (m) {
        UI.openSheet('<div class="mimg"><img src="' + m[0] + '" alt=""></div>' +
          '<div class="mbody"><h2 style="font-size:20px">Aperçu</h2>' +
          '<p class="muted" style="font-size:12.5px;margin-top:8px">Image générée, a titre indicatif.</p></div>');
      } else {
        UI.openSheet('<div class="mbody"><h2 style="font-size:20px">Aperçu indisponible</h2>' +
          '<p class="mdesc">Le modele d\'image a refusé de representer une personne reelle, ou n\'est pas disponible sur ta clé. ' +
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
