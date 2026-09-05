/* ============================================================
   EVER — Cartes, carrousels et pile de pop-up

   Trois briques, une seule idee : on regarde, on touche, ca ouvre.
   Plus de listes de lignes grises avec une petite icone.

   Carte      une image, un titre sur une ligne, un sous-titre sur
              une ligne. Toutes les cartes d'une meme grille ont
              exactement la meme hauteur : une grille dont les
              cartes se decalent se voit tout de suite.

   Carrousel  sur telephone une carte occupe l'ecran et la suivante
              deborde juste assez pour dire qu'elle existe. Sur
              grand ecran la carte grandit avec la fenetre, sans
              jamais devenir enorme et sans laisser de vide a droite.

   Pile       une pop-up peut en ouvrir une autre. La fleche en haut
              a gauche revient a la precedente au lieu de tout
              fermer. C'est ce qui manquait partout : on cliquait,
              on ne pouvait que refermer.
   ============================================================ */
(function (global) {
  'use strict';

  /* ---------- Une carte ----------
     d : { id, titre, sous, ph, img, type, badge, coche, teinte } */
  function carte(d, opts) {
    opts = opts || {};
    const cls = 'kart' + (opts.classe ? ' ' + opts.classe : '') + (d.coche ? ' faite' : '');
    const visuel = d.img
      ? '<img src="' + UI.attr(d.img) + '" alt="" loading="lazy">'
      : (global.Stock
          ? Stock.ic(d.ph || d.titre, { classe: 'fond', type: d.type || 'icone' })
          : '');
    return '<button class="' + cls + '" data-kart="' + UI.attr(d.id == null ? d.titre : d.id) + '"' +
      (d.teinte ? ' style="--k1:' + UI.attr(d.teinte[0]) + ';--k2:' + UI.attr(d.teinte[1]) + '"' : '') + '>' +
      '<span class="vis">' + visuel + '</span>' +
      '<span class="voile"></span>' +
      (d.badge ? '<span class="badge">' + UI.esc(d.badge) + '</span>' : '') +
      (d.coche && global.Art ? '<span class="fait">' + Anime.art('coche', 44) + '</span>' : '') +
      '<span class="tx"><b>' + UI.esc(d.titre) + '</b>' +
      (d.sous ? '<small>' + UI.esc(d.sous) + '</small>' : '') + '</span>' +
      '</button>';
  }

  const grille = (liste, opts) =>
    '<div class="kgrille' + ((opts && opts.classe) ? ' ' + opts.classe : '') + '">' +
    liste.filter(Boolean).map((d) => carte(d, opts)).join('') + '</div>';

  const carrousel = (liste, opts) =>
    '<div class="kcarrousel' + ((opts && opts.classe) ? ' ' + opts.classe : '') + '">' +
    liste.filter(Boolean).map((d) => carte(d, opts)).join('') + '</div>';

  /* Une section : titre, bouton « Tout voir » facultatif, carrousel. */
  function section(titre, liste, opts) {
    opts = opts || {};
    if (!liste || !liste.length) return '';
    return '<div class="ksection">' +
      (titre ? '<div class="secbar"><h2>' + UI.esc(titre) + '</h2>' +
        (opts.tout ? '<button class="lientout" data-tout="' + UI.attr(opts.tout) + '">Tout voir</button>' : '') +
        '</div>' : '') +
      carrousel(liste, opts) + '</div>';
  }

  /* ============================================================
     La pile de pop-up

     UI.openSheet remplace le contenu de la feuille. On garde donc
     nous-memes ce qui etait affiche avant, pour pouvoir y revenir.
     ============================================================ */
  const pile = [];

  function dessiner(vue, racine) {
    UI.openSheet(
      (vue.tete || '') + '<div class="mbody">' + (vue.corps || '') + '</div>',
      {
        racine: !!racine,
        onMount: (sh) => {
          if (global.Stock) Stock.peupler(sh);
          if (global.Anime) Anime.animer(sh);
          sh.querySelectorAll('[data-kart]').forEach((b) => b.onclick = () => {
            if (vue.onCarte) vue.onCarte(b.dataset.kart, b, sh);
          });
          sh.querySelectorAll('[data-tout]').forEach((b) => b.onclick = () => {
            if (vue.onTout) vue.onTout(b.dataset.tout, sh);
          });
          if (vue.onMount) vue.onMount(sh);
        },
        onClose: vue.onClose
      }
    );
  }

  /* Ouvre une premiere pop-up : elle n'a pas de fleche de retour. */
  function ouvrir(vue) { pile.length = 0; dessiner(vue, true); }

  /* Empile une pop-up par-dessus la courante : UI garde l'ecran
     precedent et pose la fleche tout seul. */
  function empiler(vue) { dessiner(vue, false); }

  const retour = () => UI.backSheet();

  /* L'en-tete coloree, collee au bord haut de la feuille. */
  function tete(titre, sous, teinte, art, image) {
    const g = teinte || ['#3E4A63', '#7C8CA8'];
    if (image) {
      return '<div class="mimg cover"><img src="' + UI.attr(image) + '" alt=""></div>' +
        '<div class="mtitre"><h2>' + UI.esc(titre) + '</h2>' +
        (sous ? '<p>' + UI.esc(sous) + '</p>' : '') + '</div>';
    }
    return '<div class="mtete" style="--t1:' + UI.attr(g[0]) + ';--t2:' + UI.attr(g[1]) + '">' +
      (art && global.Art ? '<span class="ill">' + Anime.art(art, 46) + '</span>' : '') +
      '<h2>' + UI.esc(titre) + '</h2>' +
      (sous ? '<p>' + UI.esc(sous) + '</p>' : '') + '</div>';
  }

  global.Cartes = { carte, grille, carrousel, section, ouvrir, empiler, retour, tete, pile };
})(window);
