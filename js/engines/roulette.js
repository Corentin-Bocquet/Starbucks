/* ============================================================
   EVER — Moteur de roulette

   Un seul moteur pour les activités, les aliments, les cadeaux,
   les films, les series et tout ce qui viendra ensuite.

   Deux responsabilites separees :
     1. choisir  -> tirage aleatoire pondere (Roulette.pick)
     2. montrer  -> une bande verticale qui defile et ralentit

   Ce n'est pas un casino : pas de clignotement, pas de son, une
   seule decceleration nette, un retour haptique discret sur les
   derniers crans et un résultat qui s'ouvre en fondu.
   ============================================================ */
(function (global) {
  'use strict';

  /* ---------- Tirage pondere ----------
     Les poids sont des scores positifs. On accentue les écarts
     avec un exposant (par défaut 1.6) pour que le meilleur soit
     nettement favori sans que les autres deviennent impossibles.
     Un score de 95 face a 82 doit gagner souvent, pas toujours. */
  function pick(items, opts) {
    opts = opts || {};
    const list = (items || []).filter(Boolean);
    if (!list.length) return null;
    const getW = opts.weight || ((x) => (x.weight == null ? 1 : x.weight));
    const exp = opts.sharpness == null ? 1.6 : opts.sharpness;
    const floor = opts.floor == null ? 0.06 : opts.floor;

    const raws = list.map((x) => Math.max(0, Number(getW(x)) || 0));
    const max = Math.max.apply(null, raws) || 1;
    const weights = raws.map((w) => Math.pow(w / max, exp) + floor);
    const total = weights.reduce((a, b) => a + b, 0);

    let r = Math.random() * total;
    for (let i = 0; i < list.length; i++) {
      r -= weights[i];
      if (r <= 0) return list[i];
    }
    return list[list.length - 1];
  }

  /* n résultats distincts, du plus probable au moins probable */
  function pickMany(items, n, opts) {
    const pool = (items || []).slice();
    const out = [];
    while (out.length < n && pool.length) {
      const p = pick(pool, opts);
      if (!p) break;
      out.push(p);
      pool.splice(pool.indexOf(p), 1);
    }
    return out;
  }

  /* ---------- Rendu ---------- */
  const ITEM_H = 44;

  function label(it) {
    return typeof it === 'string' ? it : (it.label || it.nom || it.name || '');
  }

  function stripHtml(items, winnerIndex, repeats) {
    /* On empile plusieurs passages du jeu complet, melange, et on
       force le gagnant a l'avant-dernière position visible. */
    const seq = [];
    for (let r = 0; r < repeats; r++) {
      const copy = items.slice();
      for (let i = copy.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; const t = copy[i]; copy[i] = copy[j]; copy[j] = t; }
      seq.push.apply(seq, copy);
    }
    seq.push(items[winnerIndex]);
    return {
      html: seq.map((it) => '<div class="it">' +
        (it && it.icon ? Icon(it.icon, 18) : '') +
        '<span>' + UI.esc(label(it)) + '</span></div>').join(''),
      stopIndex: seq.length - 1
    };
  }

  /* Lance l'animation puis resout avec l'élément gagnant. */
  function spin(win, items, winner, ms) {
    return new Promise((resolve) => {
      const idx = items.indexOf(winner);
      const built = stripHtml(items, idx < 0 ? 0 : idx, Math.max(3, Math.ceil(26 / Math.max(1, items.length))));
      const strip = win.querySelector('.roulstrip');
      strip.style.transition = 'none';
      strip.style.transform = 'translateY(0px)';
      strip.innerHTML = built.html;

      /* Le marqueur est a 44 px du haut : on aligne le gagnant dessus. */
      const target = built.stopIndex * ITEM_H - 44;
      const dur = ms || 2600;

      /* Retour haptique sur les derniers crans, sans bloquer le fil. */
      const ticks = [];
      for (let i = 6; i >= 1; i--) ticks.push(dur - (i * i * 26));
      ticks.forEach((t) => { if (t > 0) setTimeout(() => UI.haptic('tick'), t); });

      requestAnimationFrame(() => {
        strip.style.transition = 'transform ' + dur + 'ms cubic-bezier(.14,.72,.16,1)';
        strip.style.transform = 'translateY(' + (-target) + 'px)';
      });
      setTimeout(() => { UI.haptic('success'); resolve(winner); }, dur + 60);
    });
  }

  /* ---------- Composant complet ----------
     mount(el, options) rend la fenêtre, le bouton et gère l'état.
     options :
       items()      fonction qui renvoie la liste courante
       weight(it)   poids d'un élément (optionnel)
       render(it)   HTML de la fiche résultat
       onResult(it) appele après l'animation
       emptyText    message quand la liste est vide
       cta          libelle du bouton
  */
  function mount(el, options) {
    const o = options || {};
    let busy = false;
    let last = null;

    function shell() {
      el.innerHTML =
        '<div class="roul">' +
          '<div class="roulwin"><div class="marker"></div><div class="roulstrip"></div></div>' +
          '<button class="btn primary lg block roulbtn" data-spin>' + Icon('dice', 18) + '<span>' + UI.esc(o.cta || 'TOURNER') + '</span></button>' +
          '<div data-result style="width:100%;display:flex;justify-content:center"></div>' +
        '</div>';
      el.querySelector('[data-spin]').onclick = run;
      idle();
    }

    function idle() {
      const items = o.items() || [];
      const strip = el.querySelector('.roulstrip');
      if (!items.length) {
        strip.innerHTML = '<div class="it muted">' + UI.esc(o.emptyText || 'Rien a proposer pour l\'instant') + '</div>';
        el.querySelector('[data-spin]').setAttribute('disabled', '');
        return;
      }
      el.querySelector('[data-spin]').removeAttribute('disabled');
      strip.style.transition = 'none';
      strip.style.transform = 'translateY(-44px)';
      strip.innerHTML = items.slice(0, 6).concat(items.slice(0, 3)).map((it) =>
        '<div class="it">' + (it.icon ? Icon(it.icon, 18) : '') + '<span>' + UI.esc(label(it)) + '</span></div>').join('');
    }

    async function run() {
      if (busy) return;
      const items = o.items() || [];
      if (!items.length) { UI.toast(o.emptyText || 'Ajoute des éléments avant de tourner'); return; }
      busy = true;
      UI.haptic('medium');
      el.querySelector('[data-spin]').setAttribute('disabled', '');
      el.querySelector('[data-result]').innerHTML = '';

      /* On evite de retomber deux fois de suite sur le même. */
      let winner = pick(items, { weight: o.weight });
      if (last && items.length > 2 && winner && winner.id === last.id) {
        winner = pick(items.filter((x) => x.id !== last.id), { weight: o.weight }) || winner;
      }
      await spin(el.querySelector('.roulwin'), items, winner, o.duration);
      last = winner;
      busy = false;
      el.querySelector('[data-spin]').removeAttribute('disabled');
      el.querySelector('[data-spin]').querySelector('span').textContent = 'Relancer';

      if (o.render) el.querySelector('[data-result]').innerHTML = o.render(winner);
      if (o.onResult) o.onResult(winner, el.querySelector('[data-result]'));
    }

    shell();
    return { refresh: idle, spin: run, last: () => last };
  }

  global.Roulette = { pick, pickMany, mount, spin };
})(window);
