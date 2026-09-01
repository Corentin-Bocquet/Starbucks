/* ============================================================
   EVER — Cinéma et series : "Qu'est-ce qu'on regarde ?"

   Une seule page : À voir, Vus, Favoris, et les recommandations.
   La roue tire dans la liste choisie. Les affiches viennent de
   TMDB si une clé est renseignee dans Réglages (gratuite, deux
   minutes a obtenir) ; sinon on affiche une vignette sobre, ce qui
   ne gêne en rien l'usage.
   ============================================================ */
(function (global) {
  'use strict';

  const TMDB = 'https://api.themoviedb.org/3';
  const IMG = 'https://image.tmdb.org/t/p/w342';

  let root = null, roul = null;
  const prefs = () => Object.assign({ view: 'avoir', type: 'all' }, Store.get('mediaPrefs', {}));
  const setPrefs = (p) => Store.set('mediaPrefs', Object.assign(prefs(), p));

  const items = () => Store.all('media');
  const tmdbKey = () => Store.get('tmdbKey', '');

  function filtered() {
    const p = prefs();
    let list = items();
    if (p.view === 'avoir') list = list.filter((m) => m.status === 'avoir');
    else if (p.view === 'vus') list = list.filter((m) => m.status === 'vu');
    else if (p.view === 'favoris') list = list.filter((m) => Store.isFav('media', m.id));
    if (p.type !== 'all') list = list.filter((m) => m.type === p.type);
    return list;
  }

  function mount(el) { root = el; render(); }

  function render() {
    const p = prefs(), list = filtered();
    root.innerHTML = '<div class="wrap">' +
      '<div class="section" style="padding:16px 0 0"><div class="row-between">' +
        '<div><b style="font-size:19px;letter-spacing:-.02em">Qu\'est-ce qu\'on regarde ?</b>' +
        '<small class="muted" style="display:block">' + items().length + ' titre' + (items().length > 1 ? 's' : '') + ' au total</small></div>' +
        '<button class="tbtn" data-act="add">' + Icon('plus', 18) + '</button>' +
      '</div></div>' +
      '<div class="seg full" style="margin-top:14px">' +
        [['avoir', 'À voir'], ['vus', 'Vus'], ['favoris', 'Favoris']].map((v) =>
          '<button data-view="' + v[0] + '" class="' + (p.view === v[0] ? 'on' : '') + '">' + v[1] + '</button>').join('') +
      '</div>' +
      '<div class="seg full" style="margin-top:8px">' +
        [['all', 'Tout'], ['film', 'Films'], ['serie', 'Séries']].map((v) =>
          '<button data-type="' + v[0] + '" class="' + (p.type === v[0] ? 'on' : '') + '">' + v[1] + '</button>').join('') +
      '</div>' +
      '<div id="mediaRoul" style="margin-top:14px"></div>' +
      gridBlock(list) +
      recoBlock() +
      '</div>';

    roul = Roulette.mount(UI.$('#mediaRoul'), {
      items: () => filtered().map((m) => Object.assign({}, m, { label: m.titre, icon: m.type === 'serie' ? 'tv' : 'film' })),
      weight: (m) => (Store.isFav('media', m.id) ? 80 : 50) + Reco.prefOf(m) * 20,
      cta: 'TOURNER',
      emptyText: 'Aucun titre dans cette liste',
      onResult: (m, box) => { box.innerHTML = card(m); bindCard(box, m); Store.log('media', { id: m.id, label: m.titre }); }
    });
    bind();
  }

  function gridBlock(list) {
    if (!list.length) return '<div class="section">' + UI.empty('film', 'Liste vide', "Ajoute un film ou une série, ou demande-en à l'IA.") + '</div>';
    return '<div class="section"><div class="grid tight" style="grid-template-columns:repeat(auto-fill,minmax(120px,1fr))">' +
      list.map((m) => '<div class="card" data-m="' + UI.attr(m.id) + '">' +
        (Store.isFav('media', m.id) ? '<span class="badge sec">Favori</span>' : '') +
        '<div class="ph" style="aspect-ratio:2/3">' + poster(m) + '</div>' +
        '<div class="bd" style="padding:9px 10px 11px"><h3 style="font-size:13px">' + UI.esc(m.titre) + '</h3>' +
        '<div class="meta" style="margin-top:5px;font-size:11px"><span>' + UI.esc(m.annee || '') + '</span>' +
        (m.note ? '<span><b>' + m.note + '</b>/10</span>' : '') + '</div></div></div>').join('') +
      '</div></div>';
  }

  function poster(m) {
    if (m.poster) return '<img loading="lazy" src="' + UI.attr(m.poster) + '" alt="">';
    const seed = (m.titre || '').split('').reduce((a, c) => a + c.charCodeAt(0), 0);
    const hue = seed % 360;
    return '<div style="width:100%;height:100%;display:grid;place-items:center;background:linear-gradient(160deg,hsl(' + hue + ',34%,72%),hsl(' + ((hue + 40) % 360) + ',30%,52%));color:#fff">' +
      Icon(m.type === 'serie' ? 'tv' : 'film', 28) + '</div>';
  }

  function recoBlock() {
    const r = Store.all('mediaIdeas');
    return '<div class="section"><div class="sechead"><h2 style="font-size:16px">Pour toi</h2>' +
      (r.length ? '<button data-act="reco">Regenerer</button>' : '') + '</div>' +
      (r.length ? '<div class="list">' + r.map((x) =>
        '<div class="rowitem" data-idea="' + UI.attr(x.id) + '"><span class="ic">' + Icon(x.type === 'serie' ? 'tv' : 'film', 17) + '</span>' +
        '<span class="tx"><b>' + UI.esc(x.titre) + '</b><small>' + UI.esc(x.annee || '') + ' · ' + UI.esc(x.pourquoi || '') + '</small></span>' +
        '<span class="rt">' + Icon('plus', 15) + '</span></div>').join('') + '</div>'
        : '<div class="panel" style="text-align:center"><p class="muted" style="font-size:13px;margin-bottom:12px">' +
          'À partir de ce que tu as aimé et déjà vu, sans jamais reproposer un titre de tes listes.</p>' +
          '<button class="btn primary" data-act="reco">' + Icon('sparkle', 17) + 'Me proposer des titres</button></div>') +
      '</div>';
  }

  function card(m) {
    const isFav = Store.isFav('media', m.id);
    return '<div class="result">' +
      (m.poster ? '<div class="rimg" style="aspect-ratio:16/9;background:#000"><img src="' + UI.attr(m.poster) + '" style="object-fit:contain"></div>' : '') +
      '<div class="rbody">' +
      '<div class="rkick">' + (m.type === 'serie' ? 'Série' : 'Film') + '</div>' +
      '<h3>' + UI.esc(m.titre) + '</h3>' +
      '<div class="rmeta">' +
        (m.annee ? '<span>' + UI.esc(m.annee) + '</span>' : '') +
        (m.genre ? '<span>' + UI.esc(m.genre) + '</span>' : '') +
        (m.duree ? '<span>' + UI.esc(m.duree) + '</span>' : '') +
        (m.saisons ? '<span>' + m.saisons + ' saisons</span>' : '') +
        (m.note ? '<span>' + m.note + '/10</span>' : '') +
        (m.plateforme ? '<span>' + UI.esc(m.plateforme) + '</span>' : '') +
      '</div>' +
      (m.resume ? '<div class="rwhy">' + UI.esc(m.resume) + '</div>' : '') +
      '<div class="ract">' +
        '<button class="btn sm primary" data-seen>' + Icon('check', 15) + (m.status === 'vu' ? 'Déjà vu' : 'Marquer vu') + '</button>' +
        '<button class="btn sm" data-fav>' + Icon('star', 15) + (isFav ? 'Retirer' : 'Favori') + '</button>' +
        '<button class="btn sm ghost" data-cal>' + Icon('calendar', 15) + 'Soirée ciné</button>' +
      '</div></div></div>';
  }

  function bindCard(box, m) {
    box.querySelector('[data-seen]').onclick = async () => {
      Store.put('media', m.id, { status: 'vu', seenAt: Date.now() });
      UI.haptic('success');
      const liked = await UI.confirmSheet('Tu as aimé ?', 'Ca sert directement aux prochaines propositions.', false);
      Reco.learn(m, liked);
      if (liked) Store.toggleFav('media', m.id);
      if (global.Game) Game.award('media-vu', 8);
      render();
    };
    box.querySelector('[data-fav]').onclick = (e) => {
      const on = Store.toggleFav('media', m.id);
      e.currentTarget.innerHTML = Icon('star', 15) + (on ? 'Retirer' : 'Favori');
    };
    box.querySelector('[data-cal]').onclick = () => Cal.add({
      title: 'Soirée cinéma : ' + m.titre, minutes: m.type === 'serie' ? 60 : 130, kind: 'media', time: '20:30'
    });
  }

  /* ---------- Ajout ---------- */
  async function addFlow() {
    UI.openSheet('<div class="mbody" style="padding-top:6px">' +
      '<h2 style="font-size:22px;margin-bottom:12px">Ajouter un titre</h2>' +
      '<label class="search" style="box-shadow:var(--sh-inset)">' + Icon('search', 17) +
      '<input data-q placeholder="Titre du film ou de la serie" autocomplete="off"></label>' +
      '<div data-res style="margin-top:14px"></div></div>', {
      onMount: (s) => {
        const q = s.querySelector('[data-q]'), out = s.querySelector('[data-res]');
        setTimeout(() => q.focus(), 260);
        q.oninput = UI.debounce(async () => {
          const v = q.value.trim();
          if (v.length < 2) { out.innerHTML = ''; return; }
          out.innerHTML = UI.thinking('Recherche…');
          const rows = tmdbKey() ? await tmdbSearch(v) : await aiSearch(v);
          if (!rows.length) {
            out.innerHTML = '<button class="btn block primary" data-manual>' + Icon('plus', 16) + 'Ajouter « ' + UI.esc(v) +' » quand même</button>';
            out.querySelector('[data-manual]').onclick = () => { addRaw({ titre: v, type: 'film', status: 'avoir' }); UI.closeSheet(); };
            return;
          }
          out.innerHTML = '<div class="list">' + rows.map((r, i) =>
            '<button class="rowitem" data-i="' + i + '">' +
            '<span class="ic" style="width:36px;height:52px;border-radius:6px;overflow:hidden;background:var(--surface-2)">' +
            (r.poster ? '<img src="' + UI.attr(r.poster) + '" style="width:100%;height:100%;object-fit:cover">' : Icon(r.type === 'serie' ? 'tv' : 'film', 16)) + '</span>' +
            '<span class="tx"><b>' + UI.esc(r.titre) + '</b><small>' + UI.esc(r.annee || '') + ' · ' + (r.type === 'serie' ? 'Série' : 'Film') + (r.note ? ' · ' + r.note + '/10' : '') + '</small></span>' +
            '<span class="rt">' + Icon('plus', 15) + '</span></button>').join('') + '</div>';
          out.querySelectorAll('[data-i]').forEach((b) => b.onclick = () => {
            const r = rows[+b.dataset.i];
            if (items().some((m) => m.titre.toLowerCase() === r.titre.toLowerCase())) { UI.toast('Déjà dans tes listes'); return; }
            addRaw(Object.assign({ status: 'avoir' }, r));
            UI.closeSheet();
          });
        }, 420);
      }
    });
  }

  function addRaw(r) {
    const m = Store.add('media', r);
    UI.toast(r.titre + ' ajoute');
    if (global.Game) Game.award('media-ajout', 3);
    render();
    return m;
  }

  async function tmdbSearch(q) {
    try {
      const r = await fetch(TMDB + '/search/multi?api_key=' + encodeURIComponent(tmdbKey()) + '&language=fr-FR&query=' + encodeURIComponent(q));
      if (!r.ok) return [];
      const j = await r.json();
      return (j.results || []).filter((x) => x.media_type === 'movie' || x.media_type === 'tv').slice(0, 10).map((x) => ({
        titre: x.title || x.name,
        type: x.media_type === 'tv' ? 'serie' : 'film',
        annee: (x.release_date || x.first_air_date || '').slice(0, 4),
        note: x.vote_average ? Math.round(x.vote_average * 10) / 10 : null,
        resume: x.overview || '',
        poster: x.poster_path ? IMG + x.poster_path : null,
        tmdb: x.id
      }));
    } catch (e) { return []; }
  }

  async function aiSearch(q) {
    if (!AI.available()) return [];
    try {
      const res = await AI.json(
        'Films et séries correspondant a « ' + q + ' ». Titres reels uniquement, six maximum.',
        AI.T.obj({ resultats: AI.T.arr(AI.T.obj({
          titre: AI.T.str(''), type: AI.T.enu(['film', 'serie'], ''), annee: AI.T.str(''),
          genre: AI.T.str(''), duree: AI.T.str('Durée ou nombre de saisons'),
          note: AI.T.num('Note sur 10'), plateforme: AI.T.str('Plateforme en France si connue'),
          resume: AI.T.str('Deux phrases')
        })) }), { ttl: 30 * 86400e3 });
      return res.resultats || [];
    } catch (e) { return []; }
  }

  /* ---------- Recommandations ---------- */
  async function reco() {
    if (!AI.available()) { UI.toast('Ajoute ta clé Gemini dans Réglages'); return App.go('#/m/settings/ia'); }
    const all = items();
    const liked = all.filter((m) => Store.isFav('media', m.id)).map((m) => m.titre);
    const seen = all.filter((m) => m.status === 'vu').map((m) => m.titre);
    const known = all.map((m) => m.titre);
    const disliked = Store.history('dislike', 40).map((h) => h.payload.label).filter(Boolean);

    UI.openSheet('<div class="mbody">' + UI.thinking('Je cherche…') + '</div>');
    try {
      const res = await AI.json(
        "Recommande des films et séries à quelqu'un dont voici les goûts.\n\n" +
        (liked.length ? "A adore : " + liked.join(', ') + "\n" : '') +
        (seen.length ? "Déjà vu : " + seen.join(', ') + "\n" : '') +
        (disliked.length ? "N'a pas aime : " + disliked.join(', ') + "\n" : '') +
        "Ne propose AUCUN titre de cette liste : " + known.join(', ') + "\n\n" +
        "Huit propositions, moitie films moitie series, varie les epoques et les pays. " +
        "Explique en une ligne le lien avec ses goûts, pas un résumé du film. Réponds en francais.",
        AI.T.obj({ propositions: AI.T.arr(AI.T.obj({
          titre: AI.T.str(''), type: AI.T.enu(['film', 'serie'], ''), annee: AI.T.str(''),
          genre: AI.T.str(''), plateforme: AI.T.str('Plateforme en France si connue'),
          pourquoi: AI.T.str('Le lien avec ses goûts, une ligne')
        })) }), { cache: false, temperature: 1 });

      Store.all('mediaIdeas').forEach((x) => Store.del('mediaIdeas', x.id));
      const lower = new Set(known.map((k) => k.toLowerCase()));
      (res.propositions || []).forEach((p) => { if (!lower.has(String(p.titre).toLowerCase())) Store.add('mediaIdeas', p); });
      UI.closeSheet(); render();
    } catch (e) { UI.closeSheet(); UI.toast(AI.humanError(e)); }
  }

  async function acceptIdea(id) {
    const i = Store.find('mediaIdeas', id);
    if (!i) return;
    let extra = {};
    if (tmdbKey()) {
      const found = await tmdbSearch(i.titre);
      if (found[0]) extra = found[0];
    }
    addRaw(Object.assign({ status: 'avoir', resume: i.pourquoi }, i, extra, { titre: i.titre }));
    Store.del('mediaIdeas', id);
    render();
  }

  function bind() {
    root.querySelectorAll('[data-view]').forEach((b) => b.onclick = () => { setPrefs({ view: b.dataset.view }); render(); });
    root.querySelectorAll('[data-type]').forEach((b) => b.onclick = () => { setPrefs({ type: b.dataset.type }); render(); });
    root.querySelectorAll('[data-act]').forEach((b) => b.onclick = () => ({ add: addFlow, reco: reco })[b.dataset.act]());
    root.querySelectorAll('[data-m]').forEach((b) => b.onclick = () => openOne(b.dataset.m));
    root.querySelectorAll('[data-idea]').forEach((b) => b.onclick = () => acceptIdea(b.dataset.idea));
  }

  function openOne(id) {
    const m = Store.find('media', id);
    if (!m) return;
    UI.openSheet('<div class="mbody" style="padding-top:6px">' + card(m).replace('<div class="result">', '<div>').replace(/<\/div>$/, '') +
      '<button class="btn danger block" style="margin-top:14px" data-del>' + Icon('trash', 16) + 'Retirer de mes listes</button></div>', {
      onMount: (s) => {
        bindCard(s, m);
        s.querySelector('[data-del]').onclick = () => { Store.del('media', id); UI.closeSheet(); render(); };
      }
    });
  }

  App.register('media', { mount: mount });
  global.Media = { mount };
})(window);
