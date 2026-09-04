/* ============================================================
   EVER — Portes

   Une seule facon d'entrer quelque part dans l'application : une
   tuile avec une vraie photo dessus, qu'on touche et qui ouvre une
   pop-up.

   Avant, chaque page avait sa propre rangee de boutons avec une
   petite icone bleue sur fond bleu, et tout s'empilait sur le meme
   ecran. Trois consequences : on ne voyait rien, on lisait au lieu
   de regarder, et il fallait defiler pour trouver.

   Regles, valables partout :
     - meme hauteur, meme taille de texte, jamais deux lignes de
       titre : une grille dont les tuiles se decalent se voit ;
     - une photo au fond, un voile sombre par-dessus pour que le
       texte reste lisible quelle que soit la photo tiree ;
     - en attendant la photo, un gris qui respire, jamais un aplat
       de couleur ni un carre vide.
   ============================================================ */
(function (global) {
  'use strict';

  /* Une tuile. `d` : { act, nom, sub, ph } où ph est le sujet
     photo (français, la photothèque traduit). */
  function tuile(d) {
    return '<button class="porte" data-act="' + UI.attr(d.act) + '"' +
      (d.attr || '') + '>' +
      (global.Stock ? Stock.ic(d.ph || d.nom, { classe: 'fond' }) : '') +
      '<span class="voile"></span>' +
      '<span class="tx"><b>' + UI.esc(d.nom) + '</b>' +
      (d.sub ? '<small>' + UI.esc(d.sub) + '</small>' : '') + '</span>' +
      (d.badge ? '<span class="pastille">' + UI.esc(d.badge) + '</span>' : '') +
      '</button>';
  }

  function grille(liste, opts) {
    opts = opts || {};
    return '<div class="portes' + (opts.classe ? ' ' + opts.classe : '') + '">' +
      liste.filter(Boolean).map(tuile).join('') + '</div>';
  }

  /* Une section complete : un titre, un bouton reglages
     optionnel, et la grille. */
  function section(titre, liste, opts) {
    opts = opts || {};
    return '<div class="section" style="padding-top:' + (opts.serre ? '10' : '14') + 'px">' +
      (titre ? '<div class="secbar"><h2>' + UI.esc(titre) + '</h2>' +
        (opts.reglages ? '<button class="rondgris" data-act="' + UI.attr(opts.reglages) +
          '" aria-label="Réglages">' + Icon('settings', 18) + '</button>' : '') +
        '</div>' : '') +
      grille(liste, opts) + '</div>';
  }

  /* L'en-tete coloree d'une pop-up. Elle demarre au premier pixel
     de la feuille : pas de bande blanche au-dessus. */
  function tete(titre, sous, teinte, art) {
    const g = teinte || ['#3E4A63', '#7C8CA8'];
    return '<div class="mtete" style="--t1:' + UI.attr(g[0]) + ';--t2:' + UI.attr(g[1]) + '">' +
      (art && global.Art ? '<span class="ill">' + Art(art, 46) + '</span>' : '') +
      '<h2>' + UI.esc(titre) + '</h2>' +
      (sous ? '<p>' + UI.esc(sous) + '</p>' : '') + '</div>';
  }

  /* Ouvre une pop-up deja habillee. `actions` : { cle: fonction }
     branchees sur les [data-act] du contenu. */
  function ouvrir(titre, sous, teinte, art, corps, opts) {
    opts = opts || {};
    return UI.openSheet(tete(titre, sous, teinte, art) + '<div class="mbody">' + corps + '</div>', {
      onClose: opts.onClose,
      onMount: (sh) => {
        if (global.Stock) Stock.peupler(sh);
        if (opts.actions) {
          sh.querySelectorAll('[data-act]').forEach((b) => {
            const f = opts.actions[b.dataset.act];
            if (f) b.onclick = () => f(b, sh);
          });
        }
        if (opts.onMount) opts.onMount(sh);
      }
    });
  }

  global.Portes = { tuile, grille, section, tete, ouvrir };
})(window);
