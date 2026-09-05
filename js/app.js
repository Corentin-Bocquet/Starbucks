/* ============================================================
   EVER — Coque applicative
   Barre superieure, cinq onglets, hub de modules secondaires,
   routage par ancre, theme, amorcage des données.
   ============================================================ */
(function (global) {
  'use strict';

  /* ============================================================
     Une seule liste de destinations.

     `bas: true` place la destination dans la barre du bas, les
     autres vivent dans le hub. Déplacer une entrée d'un endroit à
     l'autre revient à changer ce booléen : les routes, les titres
     et les icônes suivent tout seuls.

     La barre du bas garde cinq entrées. Au-delà, on ne vise plus
     rien au pouce.
     ============================================================ */
  const DEST = [
    /* --- Barre du bas --- */
    { id: 'activities', label: 'Activités',    icon: 'activity', accent: 'activites', bas: true },
    { id: 'outfits',    label: 'Tenues',       icon: 'shirt',    accent: 'tenues',    bas: true },
    { id: 'recettes',   label: 'Recettes',     icon: 'pot',      accent: 'recettes',  bas: true, codex: 'mm' },
    { id: 'food',       label: 'Alimentation', icon: 'apple',    accent: 'food',      bas: true },
    { id: 'health',     label: 'Santé',        icon: 'heart',    accent: 'health',    bas: true },

    /* --- Hub ---
       Un nom, une icône, un dégradé. Rien d'autre : le sous-titre
       n'apprenait rien qu'on ne devine en ouvrant. */
    { id: 'cafe',  label: 'Café',    icon: 'coffee', art: 'tasse', accent: 'cafe', codex: 'sb',
      g1: '#0E6E4B', g2: '#31A876' },
    { id: 'bar',   label: 'Bar',     icon: 'glass', art: 'verre',  accent: 'bar',  codex: 'ck',
      g1: '#6B2A4E', g2: '#AE4A80' },
    { id: 'foods', label: 'Aliments', icon: 'fork', art: 'marmite',  accent: 'brand',
      g1: '#C05F26', g2: '#EBA255' },
    { id: 'gifts', label: 'Cadeaux', icon: 'gift', art: 'cadeau',   accent: 'brand',
      g1: '#A31F46', g2: '#E45C82' },
    { id: 'media', label: 'Films',   icon: 'film', art: 'clap',     accent: 'brand',
      g1: '#3B3690', g2: '#7268CF' },
    { id: 'city',  label: 'Ville',   icon: 'map', art: 'carte',    accent: 'brand',
      g1: '#1B6C7A', g2: '#3FA9B6' },
    { id: 'profiles', label: 'Profils', icon: 'users', art: 'gens', accent: 'brand',
      g1: '#46536A', g2: '#8090A6' },
    { id: 'stats', label: 'Paliers', icon: 'trophy', art: 'medaille', accent: 'brand',
      g1: '#96660F', g2: '#DCA842' }
  ];

  const TABS = DEST.filter((d) => d.bas);
  const MODULES = DEST.filter((d) => !d.bas);
  const dest = (id) => DEST.find((d) => d.id === id) || null;

  const registry = {};           /* id -> { mount(el, route) } */
  let current = null;            /* onglet actif */
  let currentModule = null;      /* module secondaire actif */

  function register(id, mod) { registry[id] = mod; }

  /* ---------- Thème ---------- */
  function applyTheme() {
    const t = Store.get('theme', 'auto');
    if (t === 'auto') document.documentElement.removeAttribute('data-theme');
    else document.documentElement.setAttribute('data-theme', t);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      const dark = t === 'dark' || (t === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches);
      meta.setAttribute('content', dark ? '#0E0C0C' : '#F6F4F3');
    }
  }

  /* ---------- Amorcage ---------- */
  function seedOnce() {
    if (Store.get('seeded', false)) return;

    Object.keys(SEED.ACTIVITIES).forEach((cityId) => {
      SEED.ACTIVITIES[cityId].forEach((a) => {
        Store.add('activities', Object.assign({}, a, { city: cityId, source: 'seed' }));
      });
    });
    SEED.FOODS.forEach((f) => Store.add('foods', Object.assign({}, f, { source: 'seed' })));

    Store.set('nutriGoals', SEED.NUTRI_DEFAULTS);
    Store.set('seeded', true);
    Store.set('seededAt', Date.now());
  }

  /* ---------- Barre superieure ---------- */
  function renderTopbar() {
    const bar = UI.$('#topbar');
    const title = UI.$('#topTitle') ? UI.$('#topTitle').textContent : 'EVER';
    const u = global.Cloud && Cloud.ready() ? Cloud.user() : null;
    const initial = u ? (u.user_metadata && u.user_metadata.pseudo || u.email || '?').charAt(0).toUpperCase() : '';
    const photo = Store.get('avatar', null), photoUrl = Store.get('avatarUrl', null);

    bar.innerHTML =
      '<button class="tbtn" id="btnHub" aria-label="Modules">' + Icon('grid', 20) + '</button>' +
      '<div class="title" id="topTitle">' + UI.esc(title) + '</div>' +
      '<button class="tbtn" id="btnAccount" aria-label="Compte" style="overflow:hidden;position:relative">' +
        (initial ? '<b style="font-size:14px">' + UI.esc(initial) + '</b>' : Icon('user', 20)) +
        ((photo || photoUrl) ? Photos.img({ photo: photo, photoUrl: photoUrl }, 'photo',
          'position:absolute;inset:0;width:100%;height:100%;object-fit:cover') : '') +
      '</button>';
    UI.$('#btnHub').onclick = () => { UI.haptic('light'); openHub(); };
    UI.$('#btnAccount').onclick = () => { UI.haptic('light'); go('#/m/settings'); };
    if (photo || photoUrl) Photos.hydrate(bar);
  }

  function setTitle(t) { const el = UI.$('#topTitle'); if (el) el.textContent = t; }

  /* ---------- Barre d'onglets ---------- */
  function renderTabbar() {
    const bar = UI.$('#tabbar');
    bar.innerHTML = TABS.map((t) =>
      /* Le titre reste dans l'attribut : l'icone seule a l'ecran,
         mais un lecteur d'ecran annonce toujours le nom. */
      '<button data-tab="' + t.id + '" aria-label="' + UI.attr(t.label) + '" title="' + UI.attr(t.label) + '">' +
        Icon(t.icon, 23) + '<span class="lb">' + UI.esc(t.label) + '</span>' +
      '</button>').join('');
    UI.$$('#tabbar button').forEach((b) => {
      b.onclick = () => { UI.haptic('light'); go('#/' + b.dataset.tab); };
    });
  }

  /* ---------- Hub ---------- */
  function openHub() {
    const html =
      '<div class="mbody" style="padding-top:2px">' +
        '<h2 style="font-size:24px;margin-bottom:16px">Tout le reste</h2>' +
        '<div class="hubgrid">' +
          MODULES.map((m) =>
            '<button class="hubtile" data-mod="' + m.id + '" style="--g1:' + m.g1 + ';--g2:' + m.g2 + '">' +
              '<span class="ic">' + (m.art ? Anime.art(m.art, 40) : Icon(m.icon, 25)) + '</span>' +
              '<b>' + UI.esc(m.label) + '</b>' +
            '</button>').join('') +
          '<button class="hubtile" data-mod="settings" style="--g1:#5B5754;--g2:#918B86">' +
            '<span class="ic">' + Anime.art('roue', 40) + '</span><b>Réglages</b>' +
          '</button>' +
        '</div>' +
      '</div>';
    UI.openSheet(html, {
      onMount: (s) => {
        s.querySelectorAll('[data-mod]').forEach((b) => {
          b.onclick = () => { UI.closeSheet(); go('#/m/' + b.dataset.mod); };
        });
      }
    });
  }

  /* ---------- Routage ---------- */
  function go(hash) {
    if (location.hash === hash) route();
    else location.hash = hash;
  }

  /* Une destination se rejoint par `#/<id>` ou `#/m/<id>`, peu
     importe où elle vit. Les anciens liens continuent donc de
     fonctionner après le déménagement du café et du bar. */
  function parse() {
    const defaut = TABS[0].id;
    const h = (location.hash || '#/' + defaut).replace(/^#\/?/, '');
    const parts = h.split('/').filter(Boolean);
    if (!parts.length) return { id: defaut, rest: [] };
    if (parts[0] === 'm') return { id: parts[1] || 'settings', rest: parts.slice(2) };
    if (parts[0] === 'settings') return { id: 'settings', rest: parts.slice(1) };
    if (dest(parts[0])) return { id: parts[0], rest: parts.slice(1) };
    return { id: defaut, rest: [] };
  }

  function route() {
    const r = parse();
    const d = dest(r.id);
    const reglages = r.id === 'settings';

    current = d ? d.id : null;
    currentModule = d && d.bas ? null : r.id;
    document.body.dataset.accent = d ? d.accent : 'brand';
    if (d && d.bas) Store.set('lastTab', d.id);

    UI.$$('.view').forEach((v) => v.classList.remove('on'));
    /* Le second argument de toggle doit etre un vrai booleen :
       avec `undefined` il bascule au lieu de forcer, et tous les
       onglets finissaient allumes en meme temps sur une page de
       module. */
    UI.$$('#tabbar button').forEach((b) => b.classList.toggle('on', !!(d && d.bas && b.dataset.tab === d.id)));
    setTitle(reglages ? 'Réglages' : (d ? d.label : 'EVER'));

    /* Café, bar et recettes partagent le même moteur de fiches. */
    if (d && d.codex) {
      UI.$('#viewCodex').classList.add('on');
      Codex.show(d.codex);
      window.scrollTo({ top: 0, behavior: 'instant' });
      return;
    }

    /* Sinon : une vue dédiée si le HTML en déclare une, la vue
       générique pour tout le reste. */
    const propre = d ? UI.$('#view' + d.id.charAt(0).toUpperCase() + d.id.slice(1)) : null;
    const el = propre || UI.$('#viewModule');
    el.classList.add('on');
    if (!propre) el.innerHTML = '';

    const mod = registry[r.id];
    if (mod && mod.mount) {
      try { mod.mount(el, r.rest); }
      catch (e) { console.error(e); el.innerHTML = UI.empty('alert', 'Souci de chargement', String(e.message || e)); }
    } else if (!propre) {
      el.innerHTML = UI.empty('info', 'Bientôt', "Cette partie n'est pas encore prête.");
    }
    window.scrollTo({ top: 0, behavior: 'instant' });
  }

  /* ---------- Defilement : ombre de la barre superieure ---------- */
  function watchScroll() {
    const bar = UI.$('#topbar');
    let ticking = false;
    addEventListener('scroll', () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => { bar.classList.toggle('scrolled', scrollY > 8); ticking = false; });
    }, { passive: true });
  }

  /* ---------- Démarrage ---------- */
  async function boot() {
    applyTheme();
    matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyTheme);

    seedOnce();
    renderTopbar();
    renderTabbar();
    watchScroll();

    Codex.init();
    Object.keys(registry).forEach((k) => { if (registry[k].init) registry[k].init(); });

    addEventListener('hashchange', route);
    if (!location.hash) {
      const memo = Store.get('lastTab', TABS[0].id);
      location.hash = '#/' + (TABS.some((t) => t.id === memo) ? memo : TABS[0].id);
    }
    route();

    Store.on('auth', async (user) => {
      renderTopbar();
      if (!user) return;
      /* À la connexion : on récupère la photo du profil si l'appareil
         ne l'a pas, et on rattrape les photos de vêtements en fond. */
      try {
        const prof = await Cloud.getProfile();
        if (prof && prof.avatar_url && !Store.get('avatarUrl', null)) {
          Store.set('avatarUrl', prof.avatar_url);
          renderTopbar();
        }
      } catch (e) {}
      if (global.Photos) Photos.sync('garments', 'photo', 'garments').catch(() => {});
    });
    Store.on('sync', (s) => { if (!s.ok) console.warn('[EVER] synchronisation differee'); });

    /* Supabase en arrière-plan : on n'attend jamais dessus. */
    if (global.Cloud && Cloud.configured()) Cloud.init();

    /* Gamification : on note le passage du jour. */
    if (global.Game) Game.touch();

    document.documentElement.classList.add('ready');
  }

  global.App = { boot, go, register, route, setTitle, TABS, MODULES, openHub, applyTheme, seedOnce,
    refreshTopbar: renderTopbar,
    currentTab: () => current, currentModule: () => currentModule };
})(window);
