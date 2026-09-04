/* ============================================================
   EVER — Animations

   Une application qui ne bouge jamais donne l'impression de ne pas
   repondre. Une qui bouge tout le temps fatigue en trois minutes.

   Donc : rien pendant l'usage courant, et un petit evenement
   visuel aux trois moments qui le meritent vraiment.

     gouttes     un verre d'eau ajoute
     confettis   un palier franchi
     halo        un objectif atteint

   Tout est dessine en CSS et supprime a la fin : rien ne reste
   dans la page, rien ne tourne en arriere-plan. Et tout respecte
   « animations reduites » du systeme : dans ce cas, rien ne bouge.
   ============================================================ */
(function (global) {
  'use strict';

  const calme = () => global.matchMedia &&
    global.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function scene(duree) {
    const el = document.createElement('div');
    el.className = 'anim-scene';
    document.body.appendChild(el);
    setTimeout(() => el.remove(), duree);
    return el;
  }

  /* Des gouttes qui tombent depuis le point touche. */
  function gouttes(origine) {
    if (calme()) return;
    const s = scene(1400);
    const r = origine && origine.getBoundingClientRect
      ? origine.getBoundingClientRect()
      : { left: innerWidth / 2 - 10, top: innerHeight / 3, width: 20, height: 20 };
    const x0 = r.left + r.width / 2, y0 = r.top + r.height / 2;

    for (let i = 0; i < 12; i++) {
      const g = document.createElement('i');
      g.className = 'goutte';
      const a = (-140 + Math.random() * 100) * Math.PI / 180;
      const d = 40 + Math.random() * 70;
      g.style.left = x0 + 'px';
      g.style.top = y0 + 'px';
      g.style.setProperty('--dx', Math.cos(a) * d + 'px');
      g.style.setProperty('--dy', Math.sin(a) * d + 'px');
      g.style.setProperty('--t', (600 + Math.random() * 500) + 'ms');
      g.style.animationDelay = (Math.random() * 140) + 'ms';
      g.style.width = g.style.height = (5 + Math.random() * 6) + 'px';
      s.appendChild(g);
    }
  }

  /* Des confettis qui tombent du haut de l'ecran. */
  function confettis(n) {
    if (calme()) return;
    const s = scene(3200);
    const teintes = ['#E0A52C', '#C6402F', '#2E9E5B', '#3D82C4', '#8F6BD0', '#E37A3C'];
    const total = n || 46;
    for (let i = 0; i < total; i++) {
      const c = document.createElement('i');
      c.className = 'confetti';
      c.style.left = (Math.random() * 100) + 'vw';
      c.style.background = teintes[i % teintes.length];
      c.style.setProperty('--t', (1700 + Math.random() * 1200) + 'ms');
      c.style.setProperty('--rot', (Math.random() * 720 - 360) + 'deg');
      c.style.setProperty('--dx', (Math.random() * 90 - 45) + 'px');
      c.style.animationDelay = (Math.random() * 500) + 'ms';
      c.style.width = (5 + Math.random() * 5) + 'px';
      c.style.height = (8 + Math.random() * 7) + 'px';
      if (i % 3 === 0) c.style.borderRadius = '50%';
      s.appendChild(c);
    }
    if (global.Feedback) Feedback.fire('success');
  }

  /* Une onde qui part d'un element : objectif atteint. */
  function halo(el, couleur) {
    if (calme() || !el) return;
    const r = el.getBoundingClientRect();
    const s = scene(1000);
    const o = document.createElement('i');
    o.className = 'halo';
    o.style.left = (r.left + r.width / 2) + 'px';
    o.style.top = (r.top + r.height / 2) + 'px';
    o.style.borderColor = couleur || 'var(--accent)';
    s.appendChild(o);
  }

  /* Un chiffre qui monte jusqu'a sa valeur. Utile sur un total :
     on voit qu'il a change, on ne le decouvre pas deja change. */
  function compter(el, de, a, duree) {
    if (!el) return;
    if (calme()) { el.textContent = Math.round(a); return; }
    const t0 = performance.now(), d = duree || 700;
    const pas = (t) => {
      const k = Math.min(1, (t - t0) / d);
      const doux = 1 - Math.pow(1 - k, 3);
      el.textContent = Math.round(de + (a - de) * doux).toLocaleString('fr-FR');
      if (k < 1) requestAnimationFrame(pas);
    };
    requestAnimationFrame(pas);
  }

  global.Anim = { gouttes, confettis, halo, compter };
})(window);
