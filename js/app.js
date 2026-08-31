/* ============================================================
   EVER — Coque applicative
   Barre superieure, cinq onglets, hub de modules secondaires,
   routage par ancre, theme, amorcage des données.
   ============================================================ */
(function (global) {
  'use strict';

  const TABS = [
    { id: 'cafe',     label: 'Café',         icon: 'coffee',   accent: 'cafe',     codex: 'sb' },
    { id: 'bar',      label: 'Bar',          icon: 'glass',    accent: 'bar',      codex: 'ck' },
    { id: 'recettes', label: 'Recettes',     icon: 'pot',      accent: 'recettes', codex: 'mm' },
    { id: 'food',     label: 'Alimentation', icon: 'apple',    accent: 'food' },
    { id: 'health',   label: 'Santé',        icon: 'heart',    accent: 'health' }
  ];

  /* Modules secondaires : ils vivent dans le hub, pas dans la barre
     basse. La barre basse reste a cinq entrées, c'est la limite
     au-dela de laquelle on ne vise plus rien du pouce. */
  const MODULES = [
    { id: 'activities', title: "Qu'est-ce qu'on fait ?",   short: 'Activités',       icon: 'activity', tint: '#E6F0FA', tintink: '#2C5F8A' },
    { id: 'foods',      title: "Qu'est-ce qu'on mange ?",  short: 'Aliments',        icon: 'fork',     tint: '#E7F5EC', tintink: '#1F7A46' },
    { id: 'gifts',      title: "Qu'est-ce que je lui offre ?", short: 'Cadeaux',     icon: 'gift',     tint: '#FBE9EF', tintink: '#B0264F' },
    { id: 'media',      title: "Qu'est-ce qu'on regarde ?", short: 'Cinéma & series', icon: 'film',    tint: '#EFE9F8', tintink: '#5B3E96' },
    { id: 'city',       title: 'Guide de ville',            short: 'Guide de ville',  icon: 'map',      tint: '#FDF0E0', tintink: '#A9713C' },
    { id: 'outfits',    title: 'Ma penderie',               short: 'Tenues',          icon: 'shirt',    tint: '#E9F2F1', tintink: '#2F6B5A' },
    { id: 'profiles',   title: 'Profils et partages',       short: 'Profils',         icon: 'users',    tint: '#F0EFEC', tintink: '#6B635E' },
    { id: 'stats',      title: 'Statistiques et paliers',   short: 'Progression',     icon: 'trophy',   tint: '#FBF2DC', tintink: '#A2801F' }
  ];

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
    const u = global.Cloud && Cloud.ready() ? Cloud.user() : null;
    const initial = u ? (u.user_metadata && u.user_metadata.pseudo || u.email || '?').charAt(0).toUpperCase() : '';
    bar.innerHTML =
      '<button class="tbtn" id="btnHub" aria-label="Modules">' + Icon('grid', 20) + '</button>' +
      '<div class="title" id="topTitle">EVER</div>' +
      '<button class="tbtn" id="btnAccount" aria-label="Compte">' +
        (initial ? '<b style="font-size:14px">' + UI.esc(initial) + '</b>' : Icon('user', 20)) +
      '</button>';
    UI.$('#btnHub').onclick = () => { UI.haptic('light'); openHub(); };
    UI.$('#btnAccount').onclick = () => { UI.haptic('light'); go('#/m/settings'); };
  }

  function setTitle(t) { const el = UI.$('#topTitle'); if (el) el.textContent = t; }

  /* ---------- Barre d'onglets ---------- */
  function renderTabbar() {
    const bar = UI.$('#tabbar');
    bar.innerHTML = TABS.map((t) =>
      '<button data-tab="' + t.id + '" aria-label="' + UI.attr(t.label) + '">' +
        '<span class="ic">' + Icon(t.icon, 23) + '</span><span class="lb">' + UI.esc(t.label) + '</span>' +
      '</button>').join('');
    UI.$$('#tabbar button').forEach((b) => {
      b.onclick = () => { UI.haptic('light'); go('#/' + b.dataset.tab); };
    });
  }

  /* ---------- Hub ---------- */
  function openHub() {
    const html =
      '<div class="mbody" style="padding-top:2px">' +
        '<h2 style="font-size:24px;margin-bottom:4px">Modules</h2>' +
        '<p class="secdesc">Tout ce qui ne merite pas une place permanente en bas.</p>' +
        '<div class="hubgrid">' +
          MODULES.map((m) =>
            '<button class="hubtile" data-mod="' + m.id + '" style="--tint:' + m.tint + ';--tintink:' + m.tintink + '">' +
              '<span class="ic">' + Icon(m.icon, 21) + '</span>' +
              '<b>' + UI.esc(m.short) + '</b>' +
              '<small>' + UI.esc(m.title) + '</small>' +
            '</button>').join('') +
        '</div>' +
        '<div class="list" style="margin-top:16px">' +
          '<button class="rowitem" data-mod="settings"><span class="ic">' + Icon('settings', 17) + '</span>' +
            '<span class="tx"><b>Réglages</b><small>Compte, IA, objectifs, données</small></span>' +
            '<span class="rt">' + Icon('next', 15) + '</span></button>' +
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

  function parse() {
    const h = (location.hash || '#/cafe').replace(/^#\/?/, '');
    const parts = h.split('/').filter(Boolean);
    if (!parts.length) return { kind: 'tab', id: 'cafe', rest: [] };
    if (parts[0] === 'm') return { kind: 'module', id: parts[1] || 'settings', rest: parts.slice(2) };
    if (TABS.some((t) => t.id === parts[0])) return { kind: 'tab', id: parts[0], rest: parts.slice(1) };
    return { kind: 'tab', id: 'cafe', rest: [] };
  }

  function route() {
    const r = parse();
    const moduleView = UI.$('#viewModule');

    if (r.kind === 'module') {
      currentModule = r.id;
      UI.$$('.view').forEach((v) => v.classList.remove('on'));
      moduleView.classList.add('on');
      document.body.dataset.accent = 'brand';
      const mod = registry[r.id];
      const meta = MODULES.find((m) => m.id === r.id);
      setTitle(meta ? meta.short : (r.id === 'settings' ? 'Réglages' : 'EVER'));
      UI.$$('#tabbar button').forEach((b) => b.classList.remove('on'));
      if (mod && mod.mount) {
        moduleView.innerHTML = '';
        try { mod.mount(moduleView, r.rest); }
        catch (e) { console.error(e); moduleView.innerHTML = UI.empty('alert', 'Ce module a un souci', String(e.message || e)); }
      } else {
        moduleView.innerHTML = UI.empty('info', 'Module indisponible', "Ce module n'est pas encore charge.");
      }
      window.scrollTo({ top: 0, behavior: 'instant' });
      return;
    }

    currentModule = null;
    const tab = TABS.find((t) => t.id === r.id) || TABS[0];
    current = tab.id;
    document.body.dataset.accent = tab.accent;
    Store.set('lastTab', tab.id);

    UI.$$('.view').forEach((v) => v.classList.remove('on'));
    UI.$$('#tabbar button').forEach((b) => b.classList.toggle('on', b.dataset.tab === tab.id));
    setTitle(tab.label);

    if (tab.codex) {
      UI.$('#viewCodex').classList.add('on');
      Codex.show(tab.codex);
    } else {
      const el = UI.$('#view' + tab.id.charAt(0).toUpperCase() + tab.id.slice(1));
      if (el) {
        el.classList.add('on');
        const mod = registry[tab.id];
        if (mod && mod.mount) {
          try { mod.mount(el, r.rest); }
          catch (e) { console.error(e); el.innerHTML = UI.empty('alert', 'Souci de chargement', String(e.message || e)); }
        }
      }
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
    if (!location.hash) location.hash = '#/' + Store.get('lastTab', 'cafe');
    route();

    Store.on('auth', () => renderTopbar());
    Store.on('sync', (s) => { if (!s.ok) console.warn('[EVER] synchronisation differee'); });

    /* Supabase en arrière-plan : on n'attend jamais dessus. */
    if (global.Cloud && Cloud.configured()) Cloud.init();

    /* Gamification : on note le passage du jour. */
    if (global.Game) Game.touch();

    document.documentElement.classList.add('ready');
  }

  global.App = { boot, go, register, route, setTitle, TABS, MODULES, openHub, applyTheme, seedOnce,
    currentTab: () => current, currentModule: () => currentModule };
})(window);
