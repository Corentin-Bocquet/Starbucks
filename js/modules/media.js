/* ============================================================
   EVER — Films et séries

   Ce que la page sait faire :
     - chercher et ajouter plusieurs titres d'affilée, sans que le
       panneau se referme entre deux ;
     - reconnaitre ce qui est déjà dans les listes et le dire ;
     - marquer vu, et surtout dé-marquer vu ;
     - pour une série, cocher les saisons une par une, le nombre
       total étant tenu à jour par l'IA ;
     - dire où le voir, avec un lien direct vers la plateforme ;
     - proposer des titres proches de ce qu'on aime, en carrousel.

   Les affiches viennent de TMDB si une clé est renseignée (gratuite,
   deux minutes à obtenir). Sans clé, l'IA donne les titres et le
   service d'images fabrique une affiche. Rien ne reste vide.
   ============================================================ */
(function (global) {
  'use strict';

  const TMDB = 'https://api.themoviedb.org/3';
  const IMG = 'https://image.tmdb.org/t/p/w500';

  let root = null, roul = null;

  const prefs = () => Object.assign({ view: 'avoir', type: 'all' }, Store.get('mediaPrefs', {}));
  const setPrefs = (p) => Store.set('mediaPrefs', Object.assign(prefs(), p));

  const items = () => Store.all('media');
  const tmdbKey = () => Store.get('tmdbKey', '');

  /* ============================================================
     Doublons

     Deux titres sont le même dès qu'ils portent le même nom une
     fois débarrassé des accents, de la ponctuation et des articles.
     « Le Parrain » et « The Godfather » restent deux entrées, mais
     « Breaking Bad » et « breaking bad. » n'en font plus qu'une.
     ============================================================ */
  const clef = (t) => String(t || '').toLowerCase()
    .replace(/œ/g, 'oe').normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/^(le |la |les |l'|the |a |an )/, '')
    .replace(/[^a-z0-9]+/g, '');

  const dejaLa = (titre, type) => items().find((m) =>
    clef(m.titre) === clef(titre) && (!type || !m.type || m.type === type));

  /* Fusionne les doublons déjà enregistrés. On garde la fiche la
     plus complète et on lui reporte ce que les autres avaient. */
  function fusionnerDoublons() {
    const par = {};
    items().forEach((m) => {
      const k = clef(m.titre) + '|' + (m.type || 'film');
      (par[k] = par[k] || []).push(m);
    });
    let n = 0;
    Object.values(par).forEach((groupe) => {
      if (groupe.length < 2) return;
      /* Le plus riche gagne : le plus de champs renseignés. */
      groupe.sort((a, b) => Object.keys(b).length - Object.keys(a).length);
      const garde = groupe[0];
      const patch = {};
      groupe.slice(1).forEach((autre) => {
        Object.keys(autre).forEach((c) => {
          if (c === 'id' || c === '_up') return;
          if (garde[c] == null || garde[c] === '') patch[c] = autre[c];
        });
        if (autre.status === 'vu') patch.status = 'vu';
        if (Store.isFav('media', autre.id)) Store.toggleFav('media', garde.id);
        Store.del('media', autre.id);
        n++;
      });
      if (Object.keys(patch).length) Store.put('media', garde.id, patch);
    });
    return n;
  }

  function filtered() {
    const p = prefs();
    let list = items();
    if (p.view === 'avoir') list = list.filter((m) => m.status !== 'vu');
    else if (p.view === 'vus') list = list.filter((m) => m.status === 'vu');
    else if (p.view === 'favoris') list = list.filter((m) => Store.isFav('media', m.id));
    if (p.type !== 'all') list = list.filter((m) => m.type === p.type);
    return list;
  }

  /* ============================================================
     Les plateformes

     Un lien de recherche par service : on tombe sur la fiche du
     titre, prêt à lancer. Ce sont des liens de recherche et non des
     liens directs, parce qu'aucune de ces plateformes ne publie
     d'adresse stable par titre sans contrat.
     ============================================================ */
  const PLATEFORMES = {
    netflix:   { nom: 'Netflix',     c1: '#E50914', c2: '#8B0009', url: (t) => 'https://www.netflix.com/search?q=' + encodeURIComponent(t) },
    prime:     { nom: 'Prime Video', c1: '#1FA2E1', c2: '#0B5C86', url: (t) => 'https://www.primevideo.com/search/ref=atv_nb_sr?phrase=' + encodeURIComponent(t) },
    disney:    { nom: 'Disney+',     c1: '#2B4B9B', c2: '#0F1B45', url: (t) => 'https://www.disneyplus.com/fr-fr/search?q=' + encodeURIComponent(t) },
    appletv:   { nom: 'Apple TV',    c1: '#3B3B3D', c2: '#101012', url: (t) => 'https://tv.apple.com/fr/search?term=' + encodeURIComponent(t) },
    canal:     { nom: 'Canal+',      c1: '#2B2B2B', c2: '#000000', url: (t) => 'https://www.canalplus.com/recherche/?q=' + encodeURIComponent(t) },
    maxi:      { nom: 'Max',         c1: '#0046FF', c2: '#001E6E', url: (t) => 'https://play.max.com/search?q=' + encodeURIComponent(t) },
    paramount: { nom: 'Paramount+',  c1: '#0064FF', c2: '#00286B', url: (t) => 'https://www.paramountplus.com/fr/search/?q=' + encodeURIComponent(t) },
    arte:      { nom: 'Arte',        c1: '#FF3C28', c2: '#8A1508', url: (t) => 'https://www.arte.tv/fr/search/?q=' + encodeURIComponent(t) },
    france:    { nom: 'france.tv',   c1: '#0A2E86', c2: '#04143C', url: (t) => 'https://www.france.tv/recherche/?q=' + encodeURIComponent(t) },
    youtube:   { nom: 'YouTube',     c1: '#FF0033', c2: '#8B0018', url: (t) => 'https://www.youtube.com/results?search_query=' + encodeURIComponent(t + ' film complet') }
  };

  /* TMDB donne les fournisseurs par pays. On traduit ses noms vers
     nos identifiants ; ce qui ne correspond à rien est ignoré. */
  const CORRESPONDANCE = [
    [/netflix/i, 'netflix'], [/amazon|prime/i, 'prime'], [/disney/i, 'disney'],
    [/apple/i, 'appletv'], [/canal/i, 'canal'], [/hbo|max/i, 'maxi'],
    [/paramount/i, 'paramount'], [/arte/i, 'arte'], [/france/i, 'france'],
    [/youtube/i, 'youtube']
  ];
  const versId = (nom) => {
    for (const [re, id] of CORRESPONDANCE) if (re.test(nom)) return id;
    return null;
  };

  /* ============================================================
     Rendu
     ============================================================ */
  function mount(el) {
    root = el;
    const n = fusionnerDoublons();
    render();
    if (n) UI.toast(n + ' doublon' + (n > 1 ? 's fusionnés' : ' fusionné'));
  }

  function render() {
    const p = prefs(), list = filtered();
    root.innerHTML = '<div class="wrap">' +
      enteteBlock() +
      '<div class="seg full" style="margin-top:14px">' +
        [['avoir', 'À voir'], ['vus', 'Vus'], ['favoris', 'Favoris']].map((v) =>
          '<button data-view="' + v[0] + '" class="' + (p.view === v[0] ? 'on' : '') + '">' + v[1] + '</button>').join('') +
      '</div>' +
      '<div class="seg full" style="margin-top:8px">' +
        [['all', 'Tout'], ['film', 'Films'], ['serie', 'Séries']].map((v) =>
          '<button data-type="' + v[0] + '" class="' + (p.type === v[0] ? 'on' : '') + '">' + v[1] + '</button>').join('') +
      '</div>' +
      '<div id="mediaRoul" style="margin-top:14px"></div>' +
      carrouselMien(list) +
      carrouselIdees() +
      '</div>';

    roul = Roulette.mount(UI.$('#mediaRoul'), {
      items: () => filtered().map((m) => Object.assign({}, m, { label: m.titre, icon: m.type === 'serie' ? 'tv' : 'film' })),
      weight: (m) => (Store.isFav('media', m.id) ? 80 : 50) + Reco.prefOf(m) * 20,
      cta: 'TOURNER',
      emptyText: 'Aucun titre dans cette liste',
      onResult: (m, box) => { box.innerHTML = grandeCarte(m); brancherCarte(box, m); Store.log('media', { id: m.id, label: m.titre }); }
    });
    bind();
    Imagerie.peupler(root, { generer: true, max: 3 });
  }

  function enteteBlock() {
    const n = items().length, vus = items().filter((m) => m.status === 'vu').length;
    return '<div class="section" style="padding:16px 0 0">' +
      '<div class="bandeau-media">' +
        '<div class="illu">' + Anime.art('coupe', 46) + '</div>' +
        '<div class="grow">' +
          '<b>Qu\'est-ce qu\'on regarde ?</b>' +
          '<small>' + n + ' titre' + (n > 1 ? 's' : '') + (vus ? ' · ' + vus + ' vu' + (vus > 1 ? 's' : '') : '') + '</small>' +
        '</div>' +
        '<button class="rond" data-act="add" aria-label="Ajouter">' + Icon('plus', 20) + '</button>' +
      '</div></div>';
  }

  /* ---------- Le carrousel de mes titres ---------- */
  function carrouselMien(list) {
    if (!list.length) {
      return '<div class="section">' + UI.empty('film', 'Rien ici', 'Ajoute des titres, ou demande des idées à l\'IA.') + '</div>';
    }
    return '<div class="section"><div class="sechead"><h2 style="font-size:16px">Ma liste</h2>' +
      '<span>' + list.length + '</span></div>' +
      '<div class="carrousel">' + list.map((m) => carteAffiche(m)).join('') + '</div></div>';
  }

  /* Une carte d'affiche : image, dégradé, titre, badges. Le modèle
     des maquettes, en format portrait. */
  function carteAffiche(m) {
    const vu = m.status === 'vu';
    const fav = Store.isFav('media', m.id);
    const prog = progression(m);
    return '<button class="affiche" data-m="' + UI.attr(m.id) + '">' +
      visuel(m) +
      '<div class="voile"></div>' +
      (vu ? '<span class="marque vu">' + Icon('check', 13) + '</span>' : '') +
      (fav ? '<span class="marque fav"><span class="etoile on">' + Icon('star', 13) + '</span></span>' : '') +
      '<div class="txt">' +
        '<b>' + UI.esc(m.titre) + '</b>' +
        '<small>' + UI.esc([m.annee, m.type === 'serie' ? 'Série' : 'Film'].filter(Boolean).join(' · ')) + '</small>' +
        (prog ? '<div class="jauge"><i style="width:' + prog.pct + '%"></i></div>' : '') +
      '</div>' +
    '</button>';
  }

  function visuel(m) {
    if (m.poster) return '<img loading="lazy" src="' + UI.attr(m.poster) + '" alt="">';
    /* Sans affiche TMDB, on en fabrique une plutot que d'afficher
       une initiale sur un degrade. */
    if (global.Stock) {
      return '<img loading="lazy" src="' + UI.attr(Stock.genere('lieu',
        'movie poster for ' + (m.type === 'serie' ? 'the TV series' : 'the film') + ' ' + m.titre,
        { l: 500, h: 750 })) + '" alt="">';
    }
    return Imagerie.vignette('lieu', 'affiche de ' + (m.type === 'serie' ? 'la série ' : 'du film ') + m.titre,
      { classe: 'haute', cle: Imagerie.cleDe('affiche', m.titre) });
  }

  /* ---------- Le carrousel des idées ---------- */
  function carrouselIdees() {
    const r = Store.all('mediaIdeas');
    if (!r.length) {
      return '<div class="section"><div class="panel" style="text-align:center">' +
        '<div style="margin-bottom:8px">' + Anime.art('eclair', 46) + '</div>' +
        '<b style="display:block;margin-bottom:6px">Des titres pour toi</b>' +
        '<p class="muted" style="font-size:13px;margin-bottom:12px">À partir de ce que tu as aimé, sans jamais reproposer ce que tu as déjà.</p>' +
        '<button class="btn primary" data-act="reco">' + Icon('sparkle', 17) + 'Me proposer</button>' +
        '</div></div>';
    }
    return '<div class="section"><div class="sechead"><h2 style="font-size:16px">Pour toi</h2>' +
      '<button data-act="reco">Régénérer</button></div>' +
      '<div class="carrousel">' + r.map((x) =>
        '<div class="affiche idee" data-idee="' + UI.attr(x.id) + '">' +
          (x.poster
            ? '<img loading="lazy" src="' + UI.attr(x.poster) + '" alt="">'
            : Imagerie.vignette('lieu', 'affiche de ' + (x.type === 'serie' ? 'la série ' : 'du film ') + x.titre,
                { classe: 'haute', cle: Imagerie.cleDe('affiche', x.titre) })) +
          '<div class="voile"></div>' +
          '<div class="txt"><b>' + UI.esc(x.titre) + '</b>' +
          '<small>' + UI.esc(x.pourquoi || x.annee || '') + '</small></div>' +
          '<span class="ajout">' + Icon('plus', 15) + '</span>' +
        '</div>').join('') + '</div></div>';
  }

  const progression = (m) => {
    if (m.type !== 'serie' || !m.saisons) return null;
    const vues = (m.saisonsVues || []).length;
    return { vues: vues, total: m.saisons, pct: Math.round(vues / m.saisons * 100) };
  };

  /* ============================================================
     La fiche d'un titre
     ============================================================ */
  function grandeCarte(m) {
    const vu = m.status === 'vu';
    const fav = Store.isFav('media', m.id);
    const prog = progression(m);
    const plats = (m.plateformes || []).map((id) => PLATEFORMES[id]).filter(Boolean);

    return '<div class="result">' +
      '<div class="rtete" style="--g1:#3B3690;--g2:#15123F">' +
        '<div class="sur">' + (m.type === 'serie' ? 'Série' : 'Film') + (m.annee ? ' · ' + UI.esc(m.annee) : '') + '</div>' +
        '<div class="titreligne"><h3>' + UI.esc(m.titre) + '</h3>' +
        (m.note ? '<span class="valeur">' + String(m.note).replace('.', ',') + ' ★</span>' : '') + '</div>' +
      '</div>' +
      '<div class="rbody">' +
        (m.resume ? '<p class="muted" style="font-size:13.5px;line-height:1.5">' + UI.esc(m.resume) + '</p>' : '') +
        '<div class="rmeta">' +
          (m.genre ? '<span>' + UI.esc(m.genre) + '</span>' : '') +
          (m.duree ? '<span>' + UI.esc(m.duree) + '</span>' : '') +
          (prog ? '<span>' + prog.vues + ' / ' + prog.total + ' saisons</span>' : '') +
        '</div>' +
        (prog ? blocSaisons(m) : '') +
        (plats.length ? blocPlateformes(m, plats) : '') +
        '<div class="ract">' +
          '<button class="btn primary grow lg" data-seen>' + Icon(vu ? 'refresh' : 'check', 17) +
            (vu ? 'Pas encore vu' : 'Marquer vu') + '</button>' +
          '<button class="btn lg" data-fav aria-label="Favori"><span class="etoile' + (fav ? ' on' : '') + '">' + Icon('star', 17) + '</span></button>' +
          '<button class="btn lg" data-cal aria-label="Planifier">' + Icon('calendar', 17) + '</button>' +
        '</div>' +
        (fav ? '<p class="muted" style="font-size:12px;margin-top:8px;text-align:center">Dans tes favoris</p>' : '') +
      '</div></div>';
  }

  /* Les saisons se cochent d'un appui. C'est le seul moyen simple
     de savoir où on en est dans une série de huit saisons. */
  function blocSaisons(m) {
    const vues = new Set(m.saisonsVues || []);
    let cases = '';
    for (let i = 1; i <= m.saisons; i++) {
      cases += '<button class="saison' + (vues.has(i) ? ' on' : '') + '" data-saison="' + i + '">' +
        (vues.has(i) ? Icon('check', 13) : '') + 'S' + i + '</button>';
    }
    return '<div class="blocsaisons">' +
      '<div class="row-between" style="margin-bottom:8px">' +
        '<b style="font-size:13px">Où j\'en suis</b>' +
        '<button class="lien" data-majsaisons>' + Icon('refresh', 13) + 'Vérifier</button>' +
      '</div>' +
      '<div class="saisons">' + cases + '</div></div>';
  }

  function blocPlateformes(m, plats) {
    return '<div class="blocplats">' +
      '<b style="font-size:13px;display:block;margin-bottom:8px">Où le voir</b>' +
      '<div class="plats">' + plats.map((p) =>
        '<a class="plat" href="' + UI.attr(p.url(m.titre)) + '" target="_blank" rel="noopener"' +
          ' style="--g1:' + p.c1 + ';--g2:' + p.c2 + '">' +
          '<b>' + UI.esc(p.nom) + '</b>' + Icon('external', 13) + '</a>').join('') + '</div>' +
      (m.acces ? '<p class="muted" style="font-size:12px;margin-top:8px">' + UI.esc(m.acces) + '</p>' : '') +
    '</div>';
  }

  function brancherCarte(box, m) {
    const q = (s) => box.querySelector(s);

    if (q('[data-seen]')) q('[data-seen]').onclick = async () => {
      if (m.status === 'vu') {
        /* Le retour en arrière manquait : on ne pouvait plus
           dé-marquer un titre vu par erreur. */
        Store.put('media', m.id, { status: 'avoir', seenAt: null });
        UI.haptic('light');
        UI.toast('Remis dans « à voir »');
        render();
        return;
      }
      Store.put('media', m.id, { status: 'vu', seenAt: Date.now() });
      UI.haptic('success');
      const aime = await UI.confirmSheet('Tu as aimé ?', 'Ça sert directement aux prochaines propositions.', false);
      Reco.learn(m, aime);
      if (aime && !Store.isFav('media', m.id)) Store.toggleFav('media', m.id);
      if (global.Game) Game.award('media-vu', 8);
      render();
    };

    if (q('[data-fav]')) q('[data-fav]').onclick = () => {
      const on = Store.toggleFav('media', m.id);
      UI.haptic('toggle');
      UI.toast(on ? 'Ajouté aux favoris' : 'Retiré des favoris');
      render();
    };

    if (q('[data-cal]')) q('[data-cal]').onclick = () => Cal.add({
      title: 'Soirée cinéma : ' + m.titre,
      minutes: m.type === 'serie' ? 60 : 130, kind: 'media', time: '20:30'
    });

    box.querySelectorAll('[data-saison]').forEach((b) => b.onclick = () => {
      const n = Number(b.dataset.saison);
      const vues = new Set(m.saisonsVues || []);
      if (vues.has(n)) vues.delete(n); else vues.add(n);
      const liste = Array.from(vues).sort((a, x) => a - x);
      Store.put('media', m.id, { saisonsVues: liste });
      m.saisonsVues = liste;
      UI.haptic('select');
      /* Toutes les saisons cochées valent « vu ». */
      if (liste.length === m.saisons && m.status !== 'vu') Store.put('media', m.id, { status: 'vu', seenAt: Date.now() });
      render();
    });

    if (q('[data-majsaisons]')) q('[data-majsaisons]').onclick = () => majSaisons(m.id);
  }

  /* ============================================================
     Le nombre de saisons, tenu à jour

     Une série gagne des saisons. TMDB le sait tout de suite ; sans
     clé, on demande à l'IA, qui se trompe rarement sur une série
     connue mais qui peut avoir du retard. On le dit.
     ============================================================ */
  async function majSaisons(id) {
    const m = Store.find('media', id);
    if (!m) return;
    UI.toast('Vérification…');
    try {
      if (m.tmdb && tmdbKey()) {
        const r = await fetch(TMDB + '/tv/' + m.tmdb + '?api_key=' + encodeURIComponent(tmdbKey()) + '&language=fr-FR');
        if (r.ok) {
          const j = await r.json();
          const n = j.number_of_seasons || m.saisons;
          Store.put('media', id, { saisons: n, majSaisons: Date.now() });
          UI.toast(n + ' saison' + (n > 1 ? 's' : '') + ' au total');
          render();
          return;
        }
      }
      if (!AI.available()) { UI.toast('Ajoute ta clé Gemini ou ta clé TMDB'); return; }
      const res = await AI.json(
        'Combien de saisons de la série « ' + m.titre + ' » sont sorties à ce jour ? ' +
        'Donne le nombre de saisons diffusées, et la date de la dernière.',
        AI.T.obj({
          saisons: AI.T.int('Nombre total de saisons diffusées'),
          derniere: AI.T.str('Année de la dernière saison sortie'),
          suite: AI.T.str('Une saison de plus est-elle annoncée, et quand')
        }), { cache: false });
      const n = Math.max(1, Number(res.saisons) || m.saisons || 1);
      Store.put('media', id, { saisons: n, majSaisons: Date.now(), suite: res.suite || '' });
      UI.toast(n + ' saison' + (n > 1 ? 's' : '') + (res.suite ? ' · ' + res.suite : ''));
      render();
    } catch (e) { UI.toast(AI.humanError(e)); }
  }

  /* ============================================================
     Ajouter — plusieurs d'affilée

     Le panneau ne se ferme plus après chaque ajout : on tape une
     fois, on ajoute cinq titres, on ferme quand on a fini. Chaque
     ligne dit si le titre est déjà dans les listes.
     ============================================================ */
  function addFlow() {
    let resultats = [];

    UI.openSheet(
      '<div class="mbody" style="padding-top:6px">' +
        '<h2 style="font-size:22px;margin-bottom:2px">Ajouter des titres</h2>' +
        '<p class="muted" style="font-size:13px;margin-bottom:12px">Le panneau reste ouvert : ajoute-en autant que tu veux.</p>' +
        '<label class="search" style="box-shadow:var(--sh-inset)">' + Icon('search', 17) +
        '<input data-q placeholder="Titre du film ou de la série" autocomplete="off"></label>' +
        '<div data-res style="margin-top:14px"></div>' +
        '<button class="btn primary block lg" style="margin-top:14px" data-fini>Terminé</button>' +
      '</div>',
      { onMount: (sh) => {
          const q = sh.querySelector('[data-q]'), out = sh.querySelector('[data-res]');
          setTimeout(() => q.focus(), 260);
          sh.querySelector('[data-fini]').onclick = () => { UI.closeSheet(); render(); };

          const dessiner = () => {
            out.innerHTML = '<div class="list">' + resultats.map((r, i) => {
              const dedans = dejaLa(r.titre, r.type);
              return '<button class="rowitem" data-i="' + i + '"' + (dedans ? ' data-dedans="1"' : '') + '>' +
                '<span class="thumb" style="width:38px;height:56px;border-radius:8px">' +
                  (r.poster ? '<img src="' + UI.attr(r.poster) + '" alt="">' : Icon(r.type === 'serie' ? 'tv' : 'film', 17)) +
                '</span>' +
                '<span class="tx"><b>' + UI.esc(r.titre) + '</b><small>' +
                  UI.esc([r.annee, r.type === 'serie' ? 'Série' : 'Film', r.note ? r.note + '/10' : ''].filter(Boolean).join(' · ')) +
                '</small></span>' +
                (dedans
                  ? '<span class="rt pastille-ok">' + Icon('check', 14) + 'Déjà</span>'
                  : '<span class="rt">' + Icon('plus', 16) + '</span>') +
              '</button>';
            }).join('') + '</div>';

            out.querySelectorAll('[data-i]').forEach((b) => b.onclick = () => {
              const r = resultats[+b.dataset.i];
              const dedans = dejaLa(r.titre, r.type);
              if (dedans) {
                /* On ne bloque pas : on ouvre la fiche existante. */
                UI.toast('Déjà dans « ' + (dedans.status === 'vu' ? 'Vus' : 'À voir') + ' »');
                return;
              }
              ajouter(Object.assign({ status: 'avoir' }, r), true);
              UI.haptic('success');
              dessiner();
            });
          };

          q.oninput = UI.debounce(async () => {
            const v = q.value.trim();
            if (v.length < 2) { resultats = []; out.innerHTML = ''; return; }
            out.innerHTML = UI.thinking('Recherche…');
            resultats = tmdbKey() ? await tmdbSearch(v) : await aiSearch(v);
            if (!resultats.length) {
              out.innerHTML = '<button class="btn block" data-manuel>' + Icon('plus', 16) +
                'Ajouter « ' + UI.esc(v) + ' » quand même</button>';
              out.querySelector('[data-manuel]').onclick = () => {
                ajouter({ titre: v, type: 'film', status: 'avoir' }, true);
                q.value = ''; resultats = []; out.innerHTML = '';
              };
              return;
            }
            dessiner();
          }, 380);
        } }
    );
  }

  function ajouter(r, silencieux) {
    const m = Store.add('media', r);
    if (!silencieux) UI.toast(r.titre + ' ajouté');
    if (global.Game) Game.award('media-ajout', 3);
    /* On complète en arrière-plan : saisons et plateformes. */
    completer(m.id);
    return m;
  }

  /* Après l'ajout, on va chercher ce qui manque sans faire attendre. */
  async function completer(id) {
    const m = Store.find('media', id);
    if (!m) return;
    try {
      if (m.tmdb && tmdbKey()) {
        const chemin = m.type === 'serie' ? '/tv/' : '/movie/';
        const r = await fetch(TMDB + chemin + m.tmdb + '?api_key=' + encodeURIComponent(tmdbKey()) +
          '&language=fr-FR&append_to_response=watch/providers');
        if (r.ok) {
          const j = await r.json();
          const patch = {};
          if (j.number_of_seasons) patch.saisons = j.number_of_seasons;
          if (j.runtime) patch.duree = j.runtime + ' min';
          if (j.genres && j.genres.length) patch.genre = j.genres.map((g) => g.name).join(', ');
          const fr = ((j['watch/providers'] || {}).results || {}).FR || {};
          const ids = [];
          ['flatrate', 'free', 'rent', 'buy'].forEach((k) => {
            (fr[k] || []).forEach((p) => { const id2 = versId(p.provider_name); if (id2 && ids.indexOf(id2) < 0) ids.push(id2); });
          });
          if (ids.length) patch.plateformes = ids.slice(0, 5);
          if (fr.flatrate && fr.flatrate.length) patch.acces = 'Compris dans l\'abonnement';
          else if (fr.rent || fr.buy) patch.acces = 'À louer ou à acheter';
          if (Object.keys(patch).length) { Store.put('media', id, patch); render(); }
          return;
        }
      }
      if (!AI.available()) return;
      const res = await AI.json(
        'Pour « ' + m.titre + ' » (' + (m.type === 'serie' ? 'série' : 'film') + (m.annee ? ', ' + m.annee : '') + ') : ' +
        'sur quelles plateformes peut-on le voir en France aujourd\'hui, et est-ce compris dans l\'abonnement, à louer, ou gratuit ?' +
        (m.type === 'serie' ? ' Donne aussi le nombre total de saisons diffusées.' : ''),
        AI.T.obj({
          plateformes: AI.T.arr(AI.T.enu(Object.keys(PLATEFORMES), ''), 'Les plateformes françaises où il est disponible'),
          acces: AI.T.str('Compris dans l abonnement, a louer, a acheter, ou gratuit'),
          saisons: AI.T.int('Nombre de saisons diffusees, 0 pour un film'),
          genre: AI.T.str('Genres principaux'),
          duree: AI.T.str('Duree d un episode ou du film')
        }), { ttl: 7 * 86400e3 });
      const patch = { acces: res.acces || '', genre: m.genre || res.genre, duree: m.duree || res.duree };
      if (res.plateformes && res.plateformes.length) patch.plateformes = res.plateformes.slice(0, 5);
      if (m.type === 'serie' && res.saisons) patch.saisons = res.saisons;
      Store.put('media', id, patch);
      render();
    } catch (e) { /* silencieux : ce n'est qu'un complement */ }
  }

  async function tmdbSearch(q) {
    try {
      const r = await fetch(TMDB + '/search/multi?api_key=' + encodeURIComponent(tmdbKey()) + '&language=fr-FR&query=' + encodeURIComponent(q));
      if (!r.ok) return [];
      const j = await r.json();
      return (j.results || []).filter((x) => x.media_type === 'movie' || x.media_type === 'tv').slice(0, 12).map((x) => ({
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
        'Films et séries correspondant à « ' + q + ' ». Titres réels uniquement, huit maximum.',
        AI.T.obj({ resultats: AI.T.arr(AI.T.obj({
          titre: AI.T.str(''), type: AI.T.enu(['film', 'serie'], ''), annee: AI.T.str(''),
          genre: AI.T.str(''), duree: AI.T.str('Duree ou nombre de saisons'),
          note: AI.T.num('Note sur 10'), saisons: AI.T.int('Nombre de saisons, 0 pour un film'),
          resume: AI.T.str('Deux phrases')
        })) }), { ttl: 30 * 86400e3 });
      return (res.resultats || []).map((r) => { if (!r.saisons) delete r.saisons; return r; });
    } catch (e) { return []; }
  }

  /* ============================================================
     Les idées
     ============================================================ */
  async function reco() {
    if (!AI.available()) { UI.toast('Ajoute ta clé Gemini dans Réglages'); return App.go('#/m/settings/ia'); }
    const all = items();
    const aimes = all.filter((m) => Store.isFav('media', m.id)).map((m) => m.titre);
    const vus = all.filter((m) => m.status === 'vu').map((m) => m.titre);
    const connus = all.map((m) => m.titre);
    const rejetes = Store.history('dislike', 40).map((h) => h.payload.label).filter(Boolean);

    UI.openSheet('<div class="mbody">' + UI.thinking('Je cherche…') + '</div>');
    try {
      const res = await AI.json(
        "Recommande des films et séries à quelqu'un dont voici les goûts.\n\n" +
        (aimes.length ? 'A adoré : ' + aimes.join(', ') + '\n' : '') +
        (vus.length ? 'Déjà vu : ' + vus.join(', ') + '\n' : '') +
        (rejetes.length ? "N'a pas aimé : " + rejetes.join(', ') + '\n' : '') +
        (connus.length ? 'Ne propose AUCUN titre de cette liste : ' + connus.join(', ') + '\n\n' : '\n') +
        'Dix propositions, moitié films moitié séries, varie les époques et les pays. ' +
        "Explique en une ligne le lien avec ses goûts, pas un résumé. Réponds en français.",
        AI.T.obj({ propositions: AI.T.arr(AI.T.obj({
          titre: AI.T.str(''), type: AI.T.enu(['film', 'serie'], ''), annee: AI.T.str(''),
          genre: AI.T.str(''), pourquoi: AI.T.str('Le lien avec ses goûts, une ligne')
        })) }), { cache: false, temperature: 1 });

      Store.all('mediaIdeas').forEach((x) => Store.del('mediaIdeas', x.id));
      const bas = new Set(connus.map(clef));
      const gardees = (res.propositions || []).filter((p) => !bas.has(clef(p.titre)));
      gardees.forEach((p) => Store.add('mediaIdeas', p));
      UI.closeSheet();
      render();

      /* Les affiches arrivaient seulement APRES l'ajout a la liste :
         le carrousel des suggestions n'affichait donc que des
         lettres. On va les chercher tout de suite, en tache de
         fond, et le carrousel se remplit tout seul. */
      affichesDesIdees();
    } catch (e) { UI.closeSheet(); UI.toast(AI.humanError(e)); }
  }

  /* Va chercher l'affiche de chaque suggestion. TMDB quand la cle
     est renseignee, sinon une image fabriquee : jamais une lettre. */
  async function affichesDesIdees() {
    const idees = Store.all('mediaIdeas').filter((x) => !x.poster);
    for (const x of idees) {
      let url = null;
      if (tmdbKey()) {
        try {
          const r = await fetch(TMDB + '/search/' + (x.type === 'serie' ? 'tv' : 'movie') +
            '?api_key=' + encodeURIComponent(tmdbKey()) +
            '&language=fr-FR&query=' + encodeURIComponent(x.titre));
          if (r.ok) {
            const j = await r.json();
            const t = (j.results || [])[0];
            if (t && t.poster_path) url = IMG + t.poster_path;
          }
        } catch (e) { /* on passe a l'image fabriquee */ }
      }
      if (!url && global.Stock) {
        url = Stock.genere('lieu',
          'movie poster for ' + (x.type === 'serie' ? 'the TV series' : 'the film') + ' ' + x.titre,
          { l: 500, h: 750 });
      }
      if (url) Store.put('mediaIdeas', x.id, { poster: url });
    }
    if (idees.length && root) render();
  }

  async function accepterIdee(id) {
    const i = Store.find('mediaIdeas', id);
    if (!i) return;
    if (dejaLa(i.titre, i.type)) { UI.toast('Déjà dans tes listes'); Store.del('mediaIdeas', id); render(); return; }
    let extra = {};
    if (tmdbKey()) { const trouve = await tmdbSearch(i.titre); if (trouve[0]) extra = trouve[0]; }
    ajouter(Object.assign({ status: 'avoir', resume: i.pourquoi }, i, extra, { titre: i.titre }));
    Store.del('mediaIdeas', id);
    UI.haptic('success');
    UI.toast(i.titre + ' ajouté');
    render();
  }

  /* ============================================================
     Interactions
     ============================================================ */
  function bind() {
    root.querySelectorAll('[data-view]').forEach((b) => b.onclick = () => { setPrefs({ view: b.dataset.view }); render(); });
    root.querySelectorAll('[data-type]').forEach((b) => b.onclick = () => { setPrefs({ type: b.dataset.type }); render(); });
    root.querySelectorAll('[data-act]').forEach((b) => b.onclick = () => ({ add: addFlow, reco: reco })[b.dataset.act]());
    root.querySelectorAll('[data-m]').forEach((b) => b.onclick = () => ouvrir(b.dataset.m));
    root.querySelectorAll('[data-idee]').forEach((b) => b.onclick = () => accepterIdee(b.dataset.idee));
  }

  function ouvrir(id) {
    const m = Store.find('media', id);
    if (!m) return;
    UI.openSheet(
      grandeCarte(m).replace('<div class="result">', '<div class="result plein">') +
      '<div class="mbody" style="padding-top:0">' +
        '<button class="btn danger block" data-del>' + Icon('trash', 16) + 'Retirer de mes listes</button>' +
      '</div>',
      { onMount: (sh) => {
          brancherCarte(sh, m);
          sh.querySelector('[data-del]').onclick = () => {
            Store.del('media', id); UI.closeSheet(); UI.haptic('warning'); render();
          };
        } }
    );
  }

  App.register('media', { mount: mount });
  global.Media = { mount, PLATEFORMES };
})(window);
