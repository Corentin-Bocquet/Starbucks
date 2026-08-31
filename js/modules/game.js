/* ============================================================
   EVER — Progression

   Volontairement discrete : ce n'est pas le sujet de l'app. Un
   compteur de points, cinq paliers, une serie de jours, quelques
   objectifs hebdomadaires. Aucune notification, aucun rappel
   culpabilisant, aucun classement contre les autres.
   ============================================================ */
(function (global) {
  'use strict';

  const state = () => Object.assign({ xp: 0, streak: 0, lastDay: null, week: {}, weekOf: null }, Store.get('game', {}));
  const save = (s) => Store.set('game', s);

  function tierOf(xp) {
    let t = SEED.TIERS[0];
    SEED.TIERS.forEach((x) => { if (xp >= x.min) t = x; });
    return t;
  }
  function nextTier(xp) {
    return SEED.TIERS.find((x) => x.min > xp) || null;
  }

  function weekKey(d) {
    const x = d ? new Date(d) : new Date();
    const day = (x.getDay() + 6) % 7;
    x.setDate(x.getDate() - day);
    return UI.day.key(x);
  }

  /* Appele au démarrage : met a jour la serie de jours. */
  function touch() {
    const s = state();
    const today = UI.day.today();
    if (s.lastDay === today) return;
    if (s.lastDay === UI.day.add(today, -1)) s.streak = (s.streak || 0) + 1;
    else if (s.lastDay) s.streak = 1;
    else s.streak = 1;
    s.lastDay = today;
    if (s.weekOf !== weekKey()) { s.week = {}; s.weekOf = weekKey(); }
    save(s);
  }

  /* Attribution de points. Les valeurs sont volontairement plates :
     rien ne doit pousser a tricher pour gagner un palier. */
  function award(kind, points) {
    const s = state();
    const before = tierOf(s.xp).id;
    s.xp = (s.xp || 0) + (points || 5);
    if (s.weekOf !== weekKey()) { s.week = {}; s.weekOf = weekKey(); }
    s.week[kind] = (s.week[kind] || 0) + 1;
    save(s);
    const after = tierOf(s.xp).id;
    if (after !== before) celebrate(tierOf(s.xp));
  }

  function celebrate(tier) {
    UI.haptic('success');
    UI.openSheet('<div class="mbody" style="text-align:center;padding-top:14px">' +
      '<div style="width:76px;height:76px;margin:0 auto 16px;border-radius:26px;display:grid;place-items:center;' +
      'background:color-mix(in srgb, var(--tier-' + tier.id + ') 18%, transparent);color:var(--tier-' + tier.id + ')">' + Icon('trophy', 38) + '</div>' +
      '<h2 style="font-size:24px">Palier ' + UI.esc(tier.nom) + '</h2>' +
      '<p class="mdesc">Tu viens de passer un cran. Rien ne change dans l\'app, c\'est juste noté.</p>' +
      '<button class="btn primary block lg" style="margin-top:20px" data-sheet-close>Continuer</button></div>');
  }

  /* Objectifs de la semaine, calcules a la volee. */
  function quests() {
    const s = state();
    const w = s.week || {};
    const food = global.Food ? Food.summary(7) : [];
    const daysLogged = food.filter((d) => d.kcal > 0).length;
    const health = global.Health ? Health.lastDays(7) : [];
    const activeDays = health.filter((d) => (d.steps || 0) >= (Health.goals().steps * 0.8)).length;

    return [
      { id: 'journal',  nom: 'Consigner 5 jours',        icon: 'fork',     value: daysLogged,        target: 5 },
      { id: 'analyse',  nom: 'Analyser 3 journées',      icon: 'sparkle',  value: w.analyse || 0,    target: 3 },
      { id: 'bouger',   nom: 'Atteindre son objectif de pas 4 jours', icon: 'steps', value: activeDays, target: 4 },
      { id: 'roulette', nom: 'Lancer la roue 5 fois',    icon: 'dice',     value: w.roulette || 0,   target: 5 },
      { id: 'decouvrir', nom: 'Découvrir une ville',     icon: 'map',      value: w.guide || 0,      target: 1 }
    ];
  }

  function badge() {
    const s = state(), t = tierOf(s.xp);
    return '<span class="tier" data-t="' + t.id + '">' + Icon('trophy', 14) + UI.esc(t.nom) + '</span>';
  }

  global.Game = { touch, award, state, tierOf, nextTier, quests, badge };
})(window);
