/* ============================================================
   EVER — Gestes

   Deux gestes, deux usages, un seul module :

   1. BALAYAGE DE PAGE. Le pouce glisse de gauche à droite sur le
      journal alimentaire et on recule d'un jour. C'est plus rapide
      que de viser une flèche de trente pixels.

   2. BALAYAGE DE LIGNE. On tire une ligne vers la gauche et les
      actions apparaissent dessous : supprimer, modifier. Le geste
      standard d'iOS, avec le même seuil et le même rebond.

   Sur ordinateur, ni l'un ni l'autre : la souris fait autre chose
   du glissement (sélectionner du texte). Les flèches du clavier
   remplacent le balayage de page, et les boutons restent visibles
   au survol. On ne casse jamais l'accès à une action.

   Règle absolue : un balayage vertical ne doit jamais être volé.
   Tant que le doigt monte ou descend plus qu'il n'avance, on ne
   prend pas la main, et la page défile normalement.
   ============================================================ */
(function (global) {
  'use strict';

  const tactile = () => matchMedia('(pointer: coarse)').matches;

  /* ============================================================
     1. Balayage de page
     ============================================================ */
  function page(el, opts) {
    opts = opts || {};
    const seuil = opts.seuil || 70;      /* distance minimale */
    const pente = opts.pente || 1.4;     /* combien plus horizontal que vertical */
    let x0 = 0, y0 = 0, actif = false, verrou = null;

    /* Le clavier fait le même travail sur ordinateur. */
    const clavier = (e) => {
      if (e.target && /input|textarea|select/i.test(e.target.tagName || '')) return;
      if (e.key === 'ArrowLeft' && opts.onPrecedent) { opts.onPrecedent(); }
      if (e.key === 'ArrowRight' && opts.onSuivant) { opts.onSuivant(); }
    };
    addEventListener('keydown', clavier);

    const debut = (e) => {
      if (e.touches.length !== 1) { actif = false; return; }
      /* Un balayage qui démarre sur une ligne déjà ouverte
         appartient à cette ligne, pas à la page. */
      if (e.target.closest('.glissable')) { actif = false; return; }
      const t = e.touches[0];
      x0 = t.clientX; y0 = t.clientY; actif = true; verrou = null;
    };
    const bouge = (e) => {
      if (!actif) return;
      const t = e.touches[0];
      const dx = t.clientX - x0, dy = t.clientY - y0;
      if (verrou === null) {
        if (Math.abs(dx) < 12 && Math.abs(dy) < 12) return;
        verrou = Math.abs(dx) > Math.abs(dy) * pente ? 'x' : 'y';
      }
      if (verrou === 'x') e.preventDefault();
    };
    const fin = (e) => {
      if (!actif || verrou !== 'x') { actif = false; return; }
      actif = false;
      const t = e.changedTouches[0];
      const dx = t.clientX - x0;
      if (Math.abs(dx) < seuil) return;
      UI.haptic('light');
      if (dx > 0 && opts.onPrecedent) opts.onPrecedent();
      if (dx < 0 && opts.onSuivant) opts.onSuivant();
    };

    el.addEventListener('touchstart', debut, { passive: true });
    el.addEventListener('touchmove', bouge, { passive: false });
    el.addEventListener('touchend', fin, { passive: true });
    el.addEventListener('touchcancel', () => { actif = false; }, { passive: true });

    return () => {
      removeEventListener('keydown', clavier);
      el.removeEventListener('touchstart', debut);
      el.removeEventListener('touchmove', bouge);
      el.removeEventListener('touchend', fin);
    };
  }

  /* ============================================================
     2. Balayage de ligne

     La ligne est enveloppée dans un conteneur qui porte les
     actions. Le contenu glisse par-dessus, les actions se
     découvrent. Au relâchement : ouvert si on a dépassé la
     moitié, refermé sinon.
     ============================================================ */
  const OUVERTURE = 58;   /* largeur d'une action, rond + espace */

  function actions(liste) {
    return '<div class="actions">' + liste.map((a) =>
      '<button class="act ' + (a.classe || '') + '" data-glisse="' + UI.attr(a.id) + '">' +
        Icon(a.icon, 19) + '<span>' + UI.esc(a.label) + '</span></button>').join('') + '</div>';
  }

  /* Enveloppe une ligne déjà écrite. `contenu` est du HTML. */
  function ligne(contenu, listeActions) {
    if (!listeActions || !listeActions.length) return contenu;
    return '<div class="glissable" style="--nact:' + listeActions.length + '">' +
      actions(listeActions) +
      '<div class="dessus">' + contenu + '</div>' +
    '</div>';
  }

  /* Active le geste sur toutes les lignes glissables d'un bloc. */
  function activer(racine, surAction) {
    let ouverte = null;

    const fermer = (el) => {
      if (!el) return;
      el.classList.remove('ouvert');
      el.querySelector('.dessus').style.transform = '';
      if (ouverte === el) ouverte = null;
    };
    const ouvrir = (el, largeur) => {
      if (ouverte && ouverte !== el) fermer(ouverte);
      el.classList.add('ouvert');
      el.querySelector('.dessus').style.transform = 'translateX(-' + largeur + 'px)';
      ouverte = el;
      UI.haptic('light');
    };

    racine.querySelectorAll('.glissable').forEach((el) => {
      const dessus = el.querySelector('.dessus');
      const n = Number(el.style.getPropertyValue('--nact')) || 1;
      const large = n * OUVERTURE;
      let x0 = 0, y0 = 0, dx = 0, verrou = null, parti = false;

      el.addEventListener('touchstart', (e) => {
        if (!tactile() || e.touches.length !== 1) return;
        const t = e.touches[0];
        x0 = t.clientX; y0 = t.clientY; dx = 0; verrou = null; parti = true;
        dessus.style.transition = 'none';
      }, { passive: true });

      el.addEventListener('touchmove', (e) => {
        if (!parti) return;
        const t = e.touches[0];
        const ax = t.clientX - x0, ay = t.clientY - y0;
        if (verrou === null) {
          if (Math.abs(ax) < 10 && Math.abs(ay) < 10) return;
          verrou = Math.abs(ax) > Math.abs(ay) * 1.3 ? 'x' : 'y';
        }
        if (verrou !== 'x') return;
        e.preventDefault();
        const base = el.classList.contains('ouvert') ? -large : 0;
        /* Résistance au-delà des actions : on sent le bout. */
        dx = base + ax;
        if (dx > 0) dx = dx * .28;
        if (dx < -large) dx = -large - (Math.abs(dx) - large) * .28;
        dessus.style.transform = 'translateX(' + dx + 'px)';
      }, { passive: false });

      const relacher = () => {
        if (!parti) return;
        parti = false;
        dessus.style.transition = '';
        if (verrou !== 'x') return;
        if (dx < -large / 2) ouvrir(el, large); else fermer(el);
      };
      el.addEventListener('touchend', relacher, { passive: true });
      el.addEventListener('touchcancel', relacher, { passive: true });

      el.querySelectorAll('[data-glisse]').forEach((b) => {
        b.onclick = (e) => {
          e.stopPropagation();
          fermer(el);
          if (surAction) surAction(b.dataset.glisse, el);
        };
      });
    });

    /* Un appui ailleurs referme la ligne ouverte. */
    const dehors = (e) => { if (ouverte && !ouverte.contains(e.target)) fermer(ouverte); };
    document.addEventListener('click', dehors, true);
    return () => document.removeEventListener('click', dehors, true);
  }

  global.Gestes = { page, ligne, activer, tactile, OUVERTURE };
})(window);
