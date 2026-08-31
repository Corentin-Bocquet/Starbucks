/* ============================================================
   EVER — Statistiques et progression
   Une page de lecture, pas de saisie : ce que l'app sait de toi,
   résumé honnetement.
   ============================================================ */
(function (global) {
  'use strict';

  let root = null;

  function mount(el) { root = el; render(); }

  function render() {
    const g = Game.state(), t = Game.tierOf(g.xp), nx = Game.nextTier(g.xp);
    const pct = nx ? Math.min(100, ((g.xp - t.min) / (nx.min - t.min)) * 100) : 100;
    const food = global.Food ? Food.summary(14) : [];
    const health = global.Health ? Health.lastDays(14) : [];

    root.innerHTML = '<div class="wrap">' +
      '<div class="section" style="padding-top:16px">' +
        '<div class="panel" style="text-align:center;padding:24px 18px">' +
          '<div style="width:64px;height:64px;margin:0 auto 12px;border-radius:22px;display:grid;place-items:center;' +
          'background:color-mix(in srgb, var(--tier-' + t.id + ') 18%, transparent);color:var(--tier-' + t.id + ')">' + Icon('trophy', 32) + '</div>' +
          '<b style="font-size:22px;letter-spacing:-.02em;display:block">' + UI.esc(t.nom) + '</b>' +
          '<small class="muted">' + UI.fmt.n(g.xp) + ' points</small>' +
          (nx ? '<div class="bar-track" style="margin-top:14px"><div class="bar-fill" style="width:' + pct.toFixed(0) + '%;background:var(--tier-' + t.id + ')"></div></div>' +
            '<small class="muted" style="display:block;margin-top:6px">' + UI.fmt.n(nx.min - g.xp) + ' points avant ' + nx.nom + '</small>' : '') +
        '</div>' +
      '</div>' +

      '<div class="stats" style="margin-top:12px">' +
        tile('Série', (g.streak || 0) + ' j', 'flame') +
        tile('Repas notés', String(Store.all('meals').length), 'fork') +
        tile('Roues lancées', String(Store.history('activite').length + Store.history('aliment').length), 'dice') +
        tile('Favoris', String(Store.get('favs', []).length + Store.get('codexFav', []).length), 'star') +
      '</div>' +

      '<div class="section"><div class="sechead"><h2 style="font-size:16px">Cette semaine</h2></div>' +
        '<div class="quests">' + Game.quests().map(quest).join('') + '</div></div>' +

      (food.some((f) => f.kcal) ? '<div class="section"><div class="sechead"><h2 style="font-size:16px">Calories, 14 jours</h2></div>' +
        '<div class="panel">' + UI.sparkline(food.map((f) => f.kcal)) +
        '<div class="row-between" style="margin-top:6px;font-size:12px;color:var(--muted)">' +
        '<span>moyenne ' + UI.fmt.n(avg(food.map((f) => f.kcal))) + ' kcal</span>' +
        '<span>objectif ' + UI.fmt.n(Food.goals().kcal) + '</span></div></div></div>' : '') +

      (health.some((h) => h.steps) ? '<div class="section"><div class="sechead"><h2 style="font-size:16px">Pas, 14 jours</h2></div>' +
        '<div class="panel">' + UI.sparkline(health.map((h) => h.steps || 0)) +
        '<div class="row-between" style="margin-top:6px;font-size:12px;color:var(--muted)">' +
        '<span>moyenne ' + UI.fmt.n(avg(health.map((h) => h.steps || 0))) + ' pas</span>' +
        '<span>objectif ' + UI.fmt.n(Health.goals().steps) + '</span></div></div></div>' : '') +

      '<div class="section"><div class="sechead"><h2 style="font-size:16px">Historique</h2></div>' +
        historyBlock() + '</div>' +

      '<div class="section"><p class="muted" style="font-size:11.5px;line-height:1.55">' +
      'Les points ne servent à rien d\'autre qu\'a se situer. Aucune fonctionnalité n\'est verrouillee derriere un palier, ' +
      'et rien n\'est envoye a qui que ce soit.</p></div>' +
      '</div>';
  }

  const tile = (k, v, ic) => '<div class="stat"><div class="k">' + Icon(ic, 13) + UI.esc(k) + '</div><div class="v">' + UI.esc(v) + '</div></div>';
  const avg = (a) => { const f = a.filter((x) => x); return f.length ? f.reduce((x, y) => x + y, 0) / f.length : 0; };

  function quest(q) {
    const done = q.value >= q.target;
    const pct = Math.min(100, (q.value / q.target) * 100);
    return '<div class="quest ' + (done ? 'done' : '') + '">' +
      '<span class="qi">' + Icon(done ? 'check' : q.icon, 17) + '</span>' +
      '<span class="qt"><b>' + UI.esc(q.nom) + '</b>' +
      '<span class="bar-track"><span class="bar-fill" style="width:' + pct.toFixed(0) + '%"></span></span></span>' +
      '<span class="rt tabnum" style="font-size:12.5px;color:var(--muted)">' + q.value + '/' + q.target + '</span></div>';
  }

  function historyBlock() {
    const h = Store.history(null, 40);
    const label = { activite: 'Activité', etablissement: 'Établissement', aliment: 'Aliment', cadeau: 'Cadeau',
      media: 'Film ou serie', meal: 'Repas', tenue: 'Tenue', calendrier: 'Calendrier', 'codex-open': 'Recette' };
    if (!h.length) return UI.empty('clock', 'Rien encore', 'Utilisé l\'app un peu, tout se retrouve ici.');
    return '<div class="list">' + h.map((x) =>
      '<div class="rowitem"><span class="ic">' + Icon(iconFor(x.kind), 17) + '</span>' +
      '<span class="tx"><b>' + UI.esc(x.payload.label || x.payload.nom || x.payload.title || label[x.kind] || x.kind) + '</b>' +
      '<small>' + UI.esc(label[x.kind] || x.kind) + ' · ' + UI.esc(UI.fmt.dateShort(x.at)) + '</small></span></div>').join('') + '</div>';
  }
  const iconFor = (k) => ({ activite: 'activity', etablissement: 'pin', aliment: 'fork', cadeau: 'gift',
    media: 'film', meal: 'plate', tenue: 'shirt', calendrier: 'calendar', 'codex-open': 'coffee' })[k] || 'clock';

  App.register('stats', { mount: mount });
  global.Stats = { mount };
})(window);
