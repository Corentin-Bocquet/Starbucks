/* ============================================================
   EVER — Service worker

   Deux strategies, choisies selon ce qu'on demande :
     - la coque (HTML, CSS, JS, icones) : reseau d'abord, cache en
       secours. On evite ainsi le grand classique de la PWA qui
       reste bloquee sur une vieille version.
     - les images du Codex : cache d'abord. Elles ne changent
       jamais et representent l'essentiel du poids.

   Les appels aux API (Gemini, Supabase, météo, Open Food Facts)
   ne sont jamais mis en cache.
   ============================================================ */
const VERSION = 'ever-v2.0.0';
const SHELL = VERSION + '-shell';
const MEDIA = VERSION + '-media';

const CORE = [
  './', './index.html', './manifest.webmanifest',
  './css/tokens.css', './css/base.css', './css/components.css',
  './js/config.js',
  './js/core/icons.js', './js/core/feedback.js', './js/core/ui.js', './js/core/store.js', './js/core/photos.js',
  './js/core/ai.js', './js/core/cloud.js', './js/core/calendar.js', './js/core/map.js',
  './js/data/codex.data.js', './js/data/codex.config.js', './js/data/seed.js', './js/data/moods.js',
  './js/engines/context.js', './js/engines/reco.js', './js/engines/roulette.js', './js/engines/events.js', './js/engines/mood.js',
  './js/app.js',
  './js/modules/game.js', './js/modules/codex.js', './js/modules/food.js', './js/modules/health.js',
  './js/modules/lists.js', './js/modules/activities.js', './js/modules/foodroulette.js',
  './js/modules/gifts.js', './js/modules/media.js', './js/modules/city.js',
  './js/modules/outfits.js', './js/modules/profiles.js', './js/modules/stats.js', './js/modules/settings.js',
  './icons/icon-192.png', './icons/icon-512.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(SHELL)
      .then((c) => Promise.allSettled(CORE.map((u) => c.add(u))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.indexOf(VERSION) !== 0).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  /* Rien de tout ce qui vit ne passe par le cache. */
  if (/generativelanguage|supabase|open-meteo|openfoodfacts|themoviedb|googleapis|gstatic/.test(url.hostname)) return;

  /* Images et polices : cache d'abord. */
  if (url.origin === location.origin && /\.(webp|png|jpg|jpeg|svg|woff2?|mp3)$/i.test(url.pathname)) {
    e.respondWith(
      caches.match(req).then((hit) => hit || fetch(req).then((res) => {
        if (res.ok) { const copy = res.clone(); caches.open(MEDIA).then((c) => c.put(req, copy)); }
        return res;
      }).catch(() => hit))
    );
    return;
  }

  /* Coque : reseau d'abord. */
  if (url.origin === location.origin) {
    e.respondWith(
      fetch(req).then((res) => {
        if (res.ok) { const copy = res.clone(); caches.open(SHELL).then((c) => c.put(req, copy)); }
        return res;
      }).catch(() => caches.match(req).then((hit) => hit || caches.match('./index.html')))
    );
  }
});
