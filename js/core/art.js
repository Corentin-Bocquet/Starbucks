/* ============================================================
   EVER — Illustrations

   Les icônes de trait disent ce qu'une chose est. Ces
   illustrations-là disent qu'elle compte. On les pose là où l'œil
   doit s'arrêter : un palier gagné, une séance de sport, une
   récompense.

   Elles sont dessinées en SVG et pas en image :
     - nettes à toutes les tailles, y compris sur un écran Retina ;
     - deux kilo-octets au lieu de deux cents ;
     - la couleur suit le thème, donc rien à redessiner en sombre.

   La profondeur est fabriquée à la main, toujours de la même
   façon : une face arrière assombrie et décalée pour l'épaisseur,
   la face avant en dégradé, un reflet clair en haut, une ombre
   portée douce en dessous. Lumière en haut à gauche, partout.
   ============================================================ */
(function (global) {
  'use strict';

  let n = 0;
  const uid = () => 'a' + (++n);

  /* Enveloppe commune : viewBox carré, ombre portée optionnelle. */
  function wrap(inner, size, defs) {
    const s = size || 64;
    return '<svg class="art" viewBox="0 0 64 64" width="' + s + '" height="' + s + '" fill="none" aria-hidden="true">' +
      (defs ? '<defs>' + defs + '</defs>' : '') + inner + '</svg>';
  }

  const lin = (id, x1, y1, x2, y2, stops) =>
    '<linearGradient id="' + id + '" x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '" gradientUnits="userSpaceOnUse">' +
    stops.map((s) => '<stop offset="' + s[0] + '" stop-color="' + s[1] + '"' + (s[2] != null ? ' stop-opacity="' + s[2] + '"' : '') + '/>').join('') +
    '</linearGradient>';

  const sol = (cx, cy, rx, ry, op) =>
    '<ellipse cx="' + cx + '" cy="' + cy + '" rx="' + rx + '" ry="' + ry + '" fill="rgba(15,12,10,' + (op || .16) + ')"/>';

  /* ---------- Haltère ----------
     Deux piles de disques et une barre. L'épaisseur vient d'une
     copie sombre décalée de deux pixels vers le bas. */
  function haltere(size) {
    const a = uid(), b = uid(), c = uid();
    const defs =
      lin(a, 0, 20, 0, 46, [[0, '#6A6A72'], [.45, '#3C3C43'], [1, '#1B1B20']]) +
      lin(b, 0, 26, 0, 40, [[0, '#57575F'], [1, '#2A2A30']]) +
      lin(c, 10, 22, 54, 44, [[0, '#FFFFFF', .34], [.5, '#FFFFFF', .06], [1, '#FFFFFF', 0]]);

    const disque = (x, y, w, h) =>
      '<rect x="' + x + '" y="' + (y + 2) + '" width="' + w + '" height="' + h + '" rx="' + (w / 2.4).toFixed(1) + '" fill="#141418" opacity=".55"/>' +
      '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="' + (w / 2.4).toFixed(1) + '" fill="url(#' + a + ')"/>' +
      '<rect x="' + (x + 1.4) + '" y="' + (y + 1.6) + '" width="' + (w - 2.8) + '" height="' + (h * .34) + '" rx="' + (w / 3.6).toFixed(1) + '" fill="url(#' + c + ')"/>';

    return wrap(
      sol(32, 53, 21, 3.6, .18) +
      disque(5, 24, 8, 16) + disque(13.5, 19, 9, 26) +
      '<rect x="22" y="29" width="20" height="8" rx="4" fill="#141418" opacity=".5" transform="translate(0,2)"/>' +
      '<rect x="22" y="29" width="20" height="8" rx="4" fill="url(#' + b + ')"/>' +
      '<rect x="23.5" y="30.2" width="17" height="2.6" rx="1.3" fill="url(#' + c + ')"/>' +
      disque(41.5, 19, 9, 26) + disque(51, 24, 8, 16),
      size, defs);
  }

  /* ---------- Éclair ----------
     Le jaune de la maquette. Face avant en dégradé, tranche
     ambrée décalée, reflet blanc sur la moitié haute. */
  function eclair(size) {
    const a = uid(), b = uid();
    const d = 'M38.5 5 17 34.5h10.5L24.5 59 47 28.5H36.5L38.5 5Z';
    const defs =
      lin(a, 20, 6, 44, 58, [[0, '#FFE479'], [.42, '#FFC53D'], [1, '#F09104']]) +
      lin(b, 20, 6, 40, 32, [[0, '#FFFFFF', .62], [1, '#FFFFFF', 0]]);
    return wrap(
      sol(32, 55, 15, 3, .16) +
      '<path d="' + d + '" fill="#B96C02" transform="translate(2.2,2.2)"/>' +
      '<path d="' + d + '" fill="url(#' + a + ')"/>' +
      '<path d="M38.5 5 17 34.5h10.5L38.5 5Z" fill="url(#' + b + ')"/>',
      size, defs);
  }

  /* ---------- Médaille de palier ----------
     Un hexagone à ailes, décliné par rang. C'est l'objet que
     l'utilisateur veut voir grandir : il change de matière, pas
     seulement de couleur. */
  const MATIERES = {
    bois:    ['#C9955C', '#8B5E2B', '#5E3C15'],
    bronze:  ['#E5A46A', '#B4713C', '#7A461D'],
    argent:  ['#F2F4F7', '#B9C0CB', '#7C8593'],
    or:      ['#FFE480', '#F0B429', '#B57C09'],
    platine: ['#D8F5F0', '#7FCFC4', '#3E938A'],
    diamant: ['#DCE0FF', '#9AA4F2', '#5B63C9']
  };

  function medaille(rang, size) {
    const m = MATIERES[rang] || MATIERES.bois;
    const a = uid(), b = uid(), c = uid(), d = uid();
    const defs =
      lin(a, 20, 10, 46, 50, [[0, m[0]], [.5, m[1]], [1, m[2]]]) +
      lin(b, 0, 20, 30, 36, [[0, m[2]], [1, m[1]]]) +
      lin(c, 34, 20, 64, 36, [[0, m[1]], [1, m[2]]]) +
      lin(d, 22, 12, 36, 30, [[0, '#FFFFFF', .78], [1, '#FFFFFF', 0]]);

    const hexa = 'M32 8 48.5 17.5v19L32 46 15.5 36.5v-19L32 8Z';
    const etoile = 'M32 19.5l3.2 6.6 7.3 1-5.3 5.1 1.3 7.2-6.5-3.4-6.5 3.4 1.3-7.2-5.3-5.1 7.3-1L32 19.5Z';

    /* Ailes : trois plumes de chaque cote, du plus long au plus
       court, avec une nuance differente pour la profondeur. */
    const plumesG =
      '<path d="M17 18 0 21.5 10 25.5 17 24Z" fill="url(#' + b + ')"/>' +
      '<path d="M17 23 3.5 27.5 12.5 30 17 28.5Z" fill="url(#' + b + ')" opacity=".85"/>' +
      '<path d="M17 28 7.5 32.5 14.5 34 17 32.5Z" fill="url(#' + b + ')" opacity=".7"/>';
    const plumesD =
      '<path d="M47 18 64 21.5 54 25.5 47 24Z" fill="url(#' + c + ')"/>' +
      '<path d="M47 23 60.5 27.5 51.5 30 47 28.5Z" fill="url(#' + c + ')" opacity=".85"/>' +
      '<path d="M47 28 56.5 32.5 49.5 34 47 32.5Z" fill="url(#' + c + ')" opacity=".7"/>';

    return wrap(
      sol(32, 57, 15, 3, .2) +
      plumesG + plumesD +
      /* Socle */
      '<path d="M26.5 43.5h11L36 55h-8l-1.5-11.5Z" fill="url(#' + c + ')"/>' +
      '<path d="M25 53h14v3.5H25Z" fill="url(#' + b + ')"/>' +
      /* Hexagone */
      '<path d="' + hexa + '" fill="' + m[2] + '" transform="translate(1.5,1.8)"/>' +
      '<path d="' + hexa + '" fill="url(#' + a + ')"/>' +
      '<path d="M32 8 48.5 17.5 32 27 15.5 17.5 32 8Z" fill="url(#' + d + ')"/>' +
      '<path d="' + etoile + '" fill="#FFFFFF" opacity=".94"/>' +
      '<path d="' + etoile + '" fill="' + m[1] + '" opacity=".3"/>',
      size, defs);
  }

  /* ---------- Flamme ---------- */
  function flamme(size) {
    const a = uid(), b = uid();
    const defs =
      lin(a, 22, 8, 42, 58, [[0, '#FFD04A'], [.4, '#FB8B24'], [1, '#E2402B']]) +
      lin(b, 26, 30, 38, 56, [[0, '#FFF0A8'], [1, '#FFB43C']]);
    return wrap(
      sol(32, 56, 13, 2.8, .16) +
      '<path d="M32 4c1 9-6 12-9.5 18.5C19 29 18 33 18 37c0 9 6.3 16 14 16s14-7 14-16c0-7-4-12-7.5-16.5C36 17 35 14 35.5 9 34 12 31 14 29 17c-1-4 1.5-9 3-13Z" fill="url(#' + a + ')"/>' +
      '<path d="M32 30c.6 5-3.5 7-5.4 10.5C25.4 43 25 45 25 47c0 4.4 3.1 8 7 8s7-3.6 7-8c0-3.4-2.2-5.9-4.1-8.2C33.2 36.7 32 34 32 30Z" fill="url(#' + b + ')"/>',
      size, defs);
  }

  /* ---------- Coupe ---------- */
  function coupe(size) {
    const a = uid(), b = uid();
    const defs =
      lin(a, 20, 8, 46, 44, [[0, '#FFE480'], [.5, '#F0B429'], [1, '#B57C09']]) +
      lin(b, 24, 10, 34, 28, [[0, '#FFFFFF', .6], [1, '#FFFFFF', 0]]);
    return wrap(
      sol(32, 57, 15, 3, .18) +
      '<path d="M17 10h30v10a15 15 0 0 1-30 0V10Z" fill="' + '#B57C09' + '" transform="translate(1.4,1.6)"/>' +
      '<path d="M17 10h30v10a15 15 0 0 1-30 0V10Z" fill="url(#' + a + ')"/>' +
      '<path d="M17 10h30l-3 6H20l-3-6Z" fill="url(#' + b + ')"/>' +
      '<path d="M17 13H12a6 6 0 0 0 6 8M47 13h5a6 6 0 0 1-6 8" stroke="' + '#D79A17' + '" stroke-width="3" stroke-linecap="round"/>' +
      '<rect x="29" y="34" width="6" height="10" rx="2" fill="#D79A17"/>' +
      '<rect x="21" y="44" width="22" height="7" rx="3" fill="url(#' + a + ')"/>',
      size, defs);
  }

  /* ---------- Pomme ---------- */
  function pomme(size) {
    const a = uid(), b = uid();
    const defs =
      lin(a, 16, 16, 48, 56, [[0, '#FF8A7A'], [.45, '#E0342F'], [1, '#9E1418']]) +
      lin(b, 20, 18, 34, 34, [[0, '#FFFFFF', .55], [1, '#FFFFFF', 0]]);
    return wrap(
      sol(32, 56, 15, 3, .16) +
      '<path d="M31 14c-2-4-6-6-10-6 0 5 3 8 7 9" fill="#4E8A3C"/>' +
      '<path d="M32 13c1-4 3-6 6-7 .6 4-1 7-4 8" fill="#63A94D"/>' +
      '<path d="M32 15c3-2 7-3 10-1 5 2.6 7 8 7 14 0 11-7 21-13 21-2 0-3-1-4-1s-2 1-4 1c-6 0-13-10-13-21 0-6 2-11.4 7-14 3-2 7-1 10 1Z" fill="url(#' + a + ')"/>' +
      '<path d="M23 20c-3 2-5 6-5 10 0 2 .3 4 .8 6C16.5 30 18 23 23 20Z" fill="url(#' + b + ')"/>',
      size, defs);
  }

  /* ---------- Goutte d'eau ---------- */
  function goutte(size) {
    const a = uid(), b = uid();
    const defs =
      lin(a, 22, 8, 44, 56, [[0, '#8FD8FF'], [.5, '#3FA3E8'], [1, '#1C6FB8']]) +
      lin(b, 24, 14, 34, 32, [[0, '#FFFFFF', .7], [1, '#FFFFFF', 0]]);
    return wrap(
      sol(32, 56, 12, 2.6, .16) +
      '<path d="M32 6c8 11 15 18 15 27a15 15 0 0 1-30 0c0-9 7-16 15-27Z" fill="url(#' + a + ')"/>' +
      '<path d="M32 12c-4 6-8 11-9 16 3-3 7-4 9-8 1-3 1-5 0-8Z" fill="url(#' + b + ')"/>',
      size, defs);
  }

  /* ---------- Cœur ---------- */
  function coeur(size) {
    const a = uid(), b = uid();
    const defs =
      lin(a, 18, 12, 46, 52, [[0, '#FF8FA8'], [.5, '#E8384F'], [1, '#A81030']]) +
      lin(b, 20, 14, 34, 30, [[0, '#FFFFFF', .6], [1, '#FFFFFF', 0]]);
    const d = 'M32 54S9 40 9 24.5C9 16 15.5 10 23 10c4.6 0 8 2.2 9 5 1-2.8 4.4-5 9-5 7.5 0 14 6 14 14.5C55 40 32 54 32 54Z';
    return wrap(
      sol(32, 56, 14, 2.8, .16) +
      '<path d="' + d + '" fill="#8C0B26" transform="translate(1.4,1.6)"/>' +
      '<path d="' + d + '" fill="url(#' + a + ')"/>' +
      '<path d="M23 14c-4.5 0-8 3.4-8 8 0 2 .6 3.9 1.6 5.8C15 22 18 16.5 23 14Z" fill="url(#' + b + ')"/>',
      size, defs);
  }

  /* ---------- Cible ---------- */
  function cible(size) {
    const a = uid();
    const defs = lin(a, 14, 14, 50, 50, [[0, '#FF9A8B'], [.5, '#E8384F'], [1, '#9E1030']]);
    return wrap(
      sol(32, 54, 17, 3, .16) +
      '<circle cx="32" cy="32" r="21" fill="url(#' + a + ')"/>' +
      '<circle cx="32" cy="32" r="14.5" fill="#FFFFFF" opacity=".95"/>' +
      '<circle cx="32" cy="32" r="9" fill="url(#' + a + ')"/>' +
      '<circle cx="32" cy="32" r="3.6" fill="#FFFFFF"/>' +
      '<path d="M14 14a21 21 0 0 1 22 -1L14 14Z" fill="#FFFFFF" opacity=".28"/>',
      size, defs);
  }

  /* ---------- Étoile ---------- */
  function etoile(size) {
    const a = uid(), b = uid();
    const defs =
      lin(a, 18, 10, 46, 52, [[0, '#FFE884'], [.45, '#F5C042'], [1, '#C98A0A']]) +
      lin(b, 22, 12, 34, 30, [[0, '#FFFFFF', .68], [1, '#FFFFFF', 0]]);
    const d = 'M32 5.5l8 16.4 18 2.6-13 12.7 3 17.9L32 46.6 15.9 55.1l3-17.9L6 24.5l18-2.6 8-16.4Z';
    return wrap(
      sol(32, 57, 15, 2.8, .16) +
      '<path d="' + d + '" fill="#B37A08" transform="translate(1.4,1.6)"/>' +
      '<path d="' + d + '" fill="url(#' + a + ')"/>' +
      '<path d="M32 5.5l8 16.4-8 4Z" fill="url(#' + b + ')"/>',
      size, defs);
  }

  /* ---------- Tasse ---------- */
  function tasse(size) {
    const a = uid(), b = uid();
    const defs =
      lin(a, 14, 20, 46, 52, [[0, '#FFFFFF'], [1, '#D6D0CB']]) +
      lin(b, 16, 22, 30, 36, [[0, '#FFFFFF', .9], [1, '#FFFFFF', 0]]);
    return wrap(
      sol(32, 55, 17, 3, .16) +
      '<path d="M46 25h4a7 7 0 0 1 0 14h-4" stroke="#C6BFBA" stroke-width="4" fill="none" stroke-linecap="round"/>' +
      '<path d="M13 22h33v17a16 16 0 0 1-33 0V22Z" fill="#B7AFA9" transform="translate(1.2,1.6)"/>' +
      '<path d="M13 22h33v17a16 16 0 0 1-33 0V22Z" fill="url(#' + a + ')"/>' +
      '<ellipse cx="29.5" cy="22" rx="16.5" ry="4.4" fill="#6B4A2E"/>' +
      '<path d="M15 23c2 6 8 9 15 9V23Z" fill="url(#' + b + ')" opacity=".5"/>' +
      '<path d="M22 8c-2 3-2 5 0 7M30 6c-2 3-2 5 0 7M38 8c-2 3-2 5 0 7" stroke="#C6BFBA" stroke-width="2.6" stroke-linecap="round" fill="none"/>',
      size, defs);
  }

  /* ---------- Chemise ---------- */
  function chemise(size) {
    const a = uid(), b = uid();
    const defs =
      lin(a, 12, 12, 52, 56, [[0, '#7FA9D8'], [.5, '#3E6FA8'], [1, '#22456E']]) +
      lin(b, 16, 14, 30, 32, [[0, '#FFFFFF', .5], [1, '#FFFFFF', 0]]);
    const d = 'M24 8 12 14 8 27l8 3v25h32V30l8-3-4-13L40 8l-8 6-8-6Z';
    return wrap(
      sol(32, 58, 17, 3, .16) +
      '<path d="' + d + '" fill="#1B3654" transform="translate(1.4,1.6)"/>' +
      '<path d="' + d + '" fill="url(#' + a + ')"/>' +
      '<path d="M24 8 32 14 24 22 16 16Z" fill="url(#' + b + ')"/>' +
      '<path d="M32 14v41" stroke="#1B3654" stroke-width="1.6" opacity=".5"/>',
      size, defs);
  }

  /* ---------- Marmite ---------- */
  function marmite(size) {
    const a = uid(), b = uid();
    const defs =
      lin(a, 12, 24, 52, 54, [[0, '#B9BFC7'], [.5, '#7C848F'], [1, '#4A515B']]) +
      lin(b, 16, 26, 30, 38, [[0, '#FFFFFF', .55], [1, '#FFFFFF', 0]]);
    return wrap(
      sol(32, 57, 18, 3, .18) +
      '<path d="M22 6c-2 4-2 7 0 10M32 4c-2 4-2 7 0 10M42 6c-2 4-2 7 0 10" stroke="#CFC9C4" stroke-width="2.8" stroke-linecap="round" fill="none"/>' +
      '<rect x="8" y="22" width="48" height="7" rx="3.5" fill="#5A626D"/>' +
      '<path d="M12 29h40v16a10 10 0 0 1-10 10H22a10 10 0 0 1-10-10V29Z" fill="url(#' + a + ')"/>' +
      '<path d="M4 31h6v8H4a4 4 0 0 1 0-8ZM54 31h6a4 4 0 0 1 0 8h-6Z" fill="#5A626D"/>' +
      '<path d="M14 31c1 8 5 13 12 15V31Z" fill="url(#' + b + ')"/>',
      size, defs);
  }

  /* ---------- Cadeau ---------- */
  function cadeau(size) {
    const a = uid(), b = uid();
    const defs =
      lin(a, 10, 22, 54, 56, [[0, '#F58BAE'], [.5, '#D63668'], [1, '#8E1039']]) +
      lin(b, 12, 24, 30, 36, [[0, '#FFFFFF', .4], [1, '#FFFFFF', 0]]);
    return wrap(
      sol(32, 57, 18, 3, .16) +
      '<path d="M32 20c-4-7-8-10-12-9a5 5 0 0 0 0 10ZM32 20c4-7 8-10 12-9a5 5 0 0 1 0 10Z" fill="#F0A93C"/>' +
      '<rect x="8" y="20" width="48" height="11" rx="3" fill="#F0A93C"/>' +
      '<path d="M12 31h40v18a6 6 0 0 1-6 6H18a6 6 0 0 1-6-6V31Z" fill="url(#' + a + ')"/>' +
      '<rect x="28" y="20" width="8" height="35" fill="#F0A93C"/>' +
      '<path d="M14 33c1 9 4 15 9 19V33Z" fill="url(#' + b + ')"/>',
      size, defs);
  }

  /* ---------- Carte ---------- */
  function carte(size) {
    const a = uid(), b = uid();
    const defs =
      lin(a, 8, 12, 56, 54, [[0, '#8FD6A8'], [.5, '#3F9E68'], [1, '#1F5C3C']]) +
      lin(b, 12, 14, 30, 32, [[0, '#FFFFFF', .45], [1, '#FFFFFF', 0]]);
    return wrap(
      sol(32, 57, 19, 3, .16) +
      '<path d="m5 15 17-6 20 6 17-6v38l-17 6-20-6-17 6V15Z" fill="#1B4E33" transform="translate(1.2,1.6)"/>' +
      '<path d="m5 15 17-6 20 6 17-6v38l-17 6-20-6-17 6V15Z" fill="url(#' + a + ')"/>' +
      '<path d="M22 9v38M42 15v38" stroke="#1B4E33" stroke-width="1.6" opacity=".45"/>' +
      '<path d="m5 15 17-6v10L5 25Z" fill="url(#' + b + ')"/>' +
      '<circle cx="40" cy="26" r="6" fill="#E8384F"/>' +
      '<path d="M40 44c0-6 5-10 5-15a5 5 0 0 0-10 0c0 5 5 9 5 15Z" fill="#E8384F"/>' +
      '<circle cx="40" cy="29" r="2.6" fill="#fff"/>',
      size, defs);
  }

  /* ---------- Verre a cocktail ---------- */
  function verre(size) {
    const a = uid(), b = uid();
    const defs =
      lin(a, 14, 12, 50, 34, [[0, '#F6A8C6'], [.5, '#D6437E'], [1, '#8E1447']]) +
      lin(b, 16, 14, 30, 26, [[0, '#FFFFFF', .55], [1, '#FFFFFF', 0]]);
    return wrap(
      sol(32, 57, 15, 2.8, .16) +
      '<path d="M9 11h46L32 37Z" fill="#7A1240" transform="translate(1.2,1.4)"/>' +
      '<path d="M9 11h46L32 37Z" fill="url(#' + a + ')"/>' +
      '<path d="M13 14h38l-4 4H17Z" fill="url(#' + b + ')"/>' +
      '<rect x="29.5" y="36" width="5" height="17" rx="2" fill="#C6BFBA"/>' +
      '<rect x="19" y="51" width="26" height="5" rx="2.5" fill="#C6BFBA"/>' +
      '<circle cx="43" cy="16" r="5" fill="#7FBF3F"/>' +
      '<path d="M43 11c3 0 5 2 5 5Z" fill="#A5D96A"/>',
      size, defs);
  }

  /* ---------- Deux personnes ---------- */
  function gens(size) {
    const a = uid(), b = uid();
    const defs =
      lin(a, 8, 14, 40, 54, [[0, '#8FA9D6'], [.5, '#4A6CA8'], [1, '#28406B']]) +
      lin(b, 26, 12, 58, 52, [[0, '#F6B48F'], [.5, '#D9713C'], [1, '#8E4218']]);
    return wrap(
      sol(32, 56, 19, 3, .16) +
      '<circle cx="42" cy="21" r="9" fill="url(#' + b + ')"/>' +
      '<path d="M42 32c8 0 14 5 14 12v8H28v-8c0-7 6-12 14-12Z" fill="url(#' + b + ')"/>' +
      '<circle cx="23" cy="24" r="10" fill="url(#' + a + ')"/>' +
      '<path d="M23 36c9 0 15 6 15 13v3H8v-3c0-7 6-13 15-13Z" fill="url(#' + a + ')"/>' +
      '<circle cx="19" cy="20" r="3.4" fill="#FFFFFF" opacity=".28"/>',
      size, defs);
  }


  /* ---------- Clap de cinéma ----------
     L'ardoise et son bras articulé. Les bandes claires sont
     découpées par un masque pour ne pas déborder des angles
     arrondis. */
  function clap(size) {
    const a = uid(), b = uid(), c1 = uid(), c2 = uid();
    const defs =
      lin(a, 8, 26, 56, 54, [[0, '#39414F'], [.55, '#242A35'], [1, '#141920']]) +
      lin(b, 8, 12, 56, 25, [[0, '#4A5464'], [.55, '#2E3542'], [1, '#1B212B']]) +
      '<clipPath id="' + c1 + '"><rect x="8" y="26" width="48" height="27" rx="5"/></clipPath>' +
      '<clipPath id="' + c2 + '"><rect x="8" y="12.5" width="48" height="11.5" rx="3"/></clipPath>';
    const bandesCorps =
      '<g clip-path="url(#' + c1 + ')" opacity=".13">' +
      [0, 14, 28, 42].map((x) =>
        '<path d="M' + (x + 10) + ' 26h7l-9 27h-7Z" fill="#FFFFFF"/>').join('') +
      '</g>';
    const bandesBras =
      '<g clip-path="url(#' + c2 + ')">' +
      [0, 12, 24, 36].map((x) =>
        '<path d="M' + (x + 9) + ' 12.5h6.5l-4 11.5H5Z" fill="#F4F6FA" opacity=".9"/>').join('') +
      '</g>';
    return wrap(
      sol(32, 56, 20, 3.2, .18) +
      '<rect x="8" y="28.5" width="48" height="27" rx="5" fill="#0F131A"/>' +
      '<rect x="8" y="26" width="48" height="27" rx="5" fill="url(#' + a + ')"/>' +
      bandesCorps +
      '<g transform="rotate(-9 11 24)">' +
      '<rect x="8" y="14" width="48" height="11.5" rx="3" fill="#0F131A"/>' +
      '<rect x="8" y="12.5" width="48" height="11.5" rx="3" fill="url(#' + b + ')"/>' +
      bandesBras +
      '</g>' +
      '<circle cx="12.5" cy="27.5" r="2.2" fill="#FFFFFF" opacity=".3"/>',
      size, defs);
  }

  /* ---------- Roue crantée ----------
     Huit dents posées en couronne, un moyeu creux, et la même
     copie sombre décalée que partout ailleurs pour l'épaisseur. */
  function roue(size) {
    const a = uid(), b = uid();
    const defs =
      lin(a, 12, 10, 52, 54, [[0, '#C8D2E0'], [.42, '#8492A6'], [1, '#4E5867']]) +
      lin(b, 24, 24, 40, 40, [[0, '#2C3340'], [1, '#171C25']]);
    const dents = (dy, fill) =>
      [0, 45, 90, 135, 180, 225, 270, 315].map((r) =>
        '<rect x="28" y="' + (5 + dy) + '" width="8" height="14" rx="3" fill="' + fill +
        '" transform="rotate(' + r + ' 32 ' + (32 + dy) + ')"/>').join('');
    return wrap(
      sol(32, 57, 18, 3, .16) +
      dents(2.5, '#3A4250') +
      '<circle cx="32" cy="34.5" r="18" fill="#3A4250"/>' +
      dents(0, 'url(#' + a + ')') +
      '<circle cx="32" cy="32" r="18" fill="url(#' + a + ')"/>' +
      '<circle cx="32" cy="32" r="8.5" fill="url(#' + b + ')"/>' +
      '<circle cx="32" cy="32" r="8.5" fill="none" stroke="#0F131A" stroke-opacity=".35" stroke-width="1.2"/>' +
      '<path d="M20 22a17 17 0 0 1 11-5" stroke="#FFFFFF" stroke-opacity=".45" stroke-width="2.6" stroke-linecap="round" fill="none"/>',
      size, defs);
  }


  /* ---------- Epingle de lieu ---------- */
  function lieu(size) {
    const a = uid(), b = uid();
    const defs =
      lin(a, 16, 6, 48, 46, [[0, '#F0857A'], [.5, '#D63F35'], [1, '#8E1B18']]) +
      lin(b, 24, 18, 40, 34, [[0, '#FFFFFF'], [1, '#D9DEE6']]);
    return wrap(
      sol(32, 58, 12, 3, .2) +
      '<path d="M32 6c-9.4 0-17 7.4-17 16.6C15 34.8 29.6 51 31 52.5a1.4 1.4 0 0 0 2 0C34.4 51 49 34.8 49 22.6 49 13.4 41.4 6 32 6Z" fill="#7A1512"/>' +
      '<path d="M32 4c-9.4 0-17 7.4-17 16.6C15 32.8 29.6 49 31 50.5a1.4 1.4 0 0 0 2 0C34.4 49 49 32.8 49 20.6 49 11.4 41.4 4 32 4Z" fill="url(#' + a + ')"/>' +
      '<circle cx="32" cy="20.5" r="7" fill="url(#' + b + ')"/>' +
      '<path d="M22 13a13 13 0 0 1 8-6" stroke="#FFFFFF" stroke-opacity=".5" stroke-width="2.6" stroke-linecap="round" fill="none"/>',
      size, defs);
  }

  /* ---------- De a six faces ---------- */
  function de(size) {
    const a = uid(), b = uid(), c1 = uid();
    const defs =
      lin(a, 12, 14, 34, 40, [[0, '#FFFFFF'], [1, '#D5D9E0']]) +
      lin(b, 32, 20, 54, 50, [[0, '#C8CED8'], [1, '#8E96A4']]) +
      lin(c1, 14, 6, 50, 24, [[0, '#FFFFFF'], [1, '#E6EAF0']]);
    const pt = (x, y, f) => '<circle cx="' + x + '" cy="' + y + '" r="2.6" fill="' + f + '"/>';
    return wrap(
      sol(32, 57, 17, 3, .18) +
      /* dessus */
      '<path d="M32 6 54 18 32 30 10 18Z" fill="url(#' + c1 + ')"/>' +
      /* face gauche */
      '<path d="M10 18 32 30v22L10 40Z" fill="url(#' + a + ')"/>' +
      /* face droite */
      '<path d="M54 18 32 30v22l22-12Z" fill="url(#' + b + ')"/>' +
      pt(32, 18, '#C6402F') +
      pt(17, 27, '#3A4250') + pt(25, 31.5, '#3A4250') +
      pt(17, 36, '#3A4250') + pt(25, 40.5, '#3A4250') +
      pt(39, 31.5, '#2A303C') + pt(47, 27, '#2A303C') +
      pt(39, 40.5, '#2A303C') + pt(47, 36, '#2A303C'),
      size, defs);
  }

  /* ---------- Fleche de rafraichissement ---------- */
  function refaire(size) {
    const a = uid();
    const defs = lin(a, 12, 12, 52, 52, [[0, '#7FD8B4'], [.5, '#2FA97C'], [1, '#126B4C']]);
    const arc = 'M50 32a18 18 0 1 1-6.2-13.6';
    return wrap(
      sol(32, 56, 16, 3, .16) +
      '<path d="' + arc + '" transform="translate(0,2.5)" stroke="#0E5238" stroke-width="8" stroke-linecap="round" fill="none"/>' +
      '<path d="' + arc + '" stroke="url(#' + a + ')" stroke-width="8" stroke-linecap="round" fill="none"/>' +
      '<path d="M52 8v13H39Z" fill="#0E5238" transform="translate(0,2.5)"/>' +
      '<path d="M52 8v13H39Z" fill="url(#' + a + ')"/>' +
      '<path d="M20 22a16 16 0 0 1 9-6" stroke="#FFFFFF" stroke-opacity=".5" stroke-width="2.8" stroke-linecap="round" fill="none"/>',
      size, defs);
  }

  /* ---------- Coche ---------- */
  function coche(size) {
    const a = uid();
    const defs = lin(a, 10, 10, 54, 54, [[0, '#8BE0A8'], [.5, '#2E9E5B'], [1, '#136135']]);
    return wrap(
      sol(32, 57, 16, 3, .18) +
      '<circle cx="32" cy="34.5" r="24" fill="#0E4527"/>' +
      '<circle cx="32" cy="32" r="24" fill="url(#' + a + ')"/>' +
      '<path d="m20 33 8.5 8.5L44 24" stroke="#0E4527" stroke-opacity=".35" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" fill="none" transform="translate(0,1.5)"/>' +
      '<path d="m20 33 8.5 8.5L44 24" stroke="#FFFFFF" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" fill="none"/>' +
      '<path d="M17 22a22 22 0 0 1 12-8" stroke="#FFFFFF" stroke-opacity=".4" stroke-width="3" stroke-linecap="round" fill="none"/>',
      size, defs);
  }

  /* ---------- Une personne ---------- */
  function personne(size) {
    const a = uid(), b = uid();
    const defs =
      lin(a, 20, 8, 44, 30, [[0, '#F7C9A4'], [.5, '#E09A63'], [1, '#A2612F']]) +
      lin(b, 14, 32, 50, 58, [[0, '#8FA9D6'], [.5, '#4A6CA8'], [1, '#28406B']]);
    return wrap(
      sol(32, 57, 17, 3, .16) +
      '<circle cx="32" cy="22" r="11" fill="#8A5228"/>' +
      '<circle cx="32" cy="20.5" r="11" fill="url(#' + a + ')"/>' +
      '<path d="M32 35c10 0 17 7 17 15v6H15v-6c0-8 7-15 17-15Z" fill="#22375C"/>' +
      '<path d="M32 34c10 0 17 7 17 15v6H15v-6c0-8 7-15 17-15Z" fill="url(#' + b + ')"/>' +
      '<circle cx="27" cy="16" r="3.4" fill="#FFFFFF" opacity=".3"/>',
      size, defs);
  }

  /* ---------- Synchronisation ---------- */
  function sync(size) {
    const a = uid();
    const defs = lin(a, 10, 10, 54, 54, [[0, '#9CC7F5'], [.5, '#3B82D8'], [1, '#1B4A85']]);
    const d1 = 'M46 26a15 15 0 0 0-26-6';
    const d2 = 'M18 38a15 15 0 0 0 26 6';
    return wrap(
      sol(32, 57, 16, 3, .16) +
      '<g transform="translate(0,2.5)" stroke="#12365F" stroke-width="7" stroke-linecap="round" fill="none">' +
        '<path d="' + d1 + '"/><path d="' + d2 + '"/></g>' +
      '<g stroke="url(#' + a + ')" stroke-width="7" stroke-linecap="round" fill="none">' +
        '<path d="' + d1 + '"/><path d="' + d2 + '"/></g>' +
      '<path d="M14 20v10h10Z" fill="url(#' + a + ')"/>' +
      '<path d="M50 44V34H40Z" fill="url(#' + a + ')"/>',
      size, defs);
  }

  /* ---------- Cle ---------- */
  function cle(size) {
    const a = uid();
    const defs = lin(a, 10, 12, 54, 50, [[0, '#FFE08A'], [.5, '#E5A72C'], [1, '#96650F']]);
    return wrap(
      sol(32, 57, 16, 3, .16) +
      '<g transform="translate(0,2.5)" fill="#7A5209">' +
        '<circle cx="22" cy="26" r="13"/><rect x="30" y="21" width="26" height="10" rx="4"/>' +
        '<rect x="42" y="29" width="6" height="9" rx="2.5"/><rect x="51" y="29" width="6" height="9" rx="2.5"/></g>' +
      '<circle cx="22" cy="26" r="13" fill="url(#' + a + ')"/>' +
      '<rect x="30" y="21" width="26" height="10" rx="4" fill="url(#' + a + ')"/>' +
      '<rect x="42" y="29" width="6" height="9" rx="2.5" fill="url(#' + a + ')"/>' +
      '<rect x="51" y="29" width="6" height="9" rx="2.5" fill="url(#' + a + ')"/>' +
      '<circle cx="22" cy="26" r="5.5" fill="#6B4708"/>' +
      '<path d="M14 19a12 12 0 0 1 7-4" stroke="#FFFFFF" stroke-opacity=".5" stroke-width="2.6" stroke-linecap="round" fill="none"/>',
      size, defs);
  }

  /* ---------- Sortie ---------- */
  function sortie(size) {
    const a = uid();
    const defs = lin(a, 10, 12, 40, 52, [[0, '#F3A9A2'], [.5, '#D6493C'], [1, '#8B211A']]);
    return wrap(
      sol(32, 57, 16, 3, .16) +
      '<rect x="10" y="12.5" width="26" height="43" rx="6" fill="#7A1B15"/>' +
      '<rect x="10" y="10" width="26" height="43" rx="6" fill="url(#' + a + ')"/>' +
      '<circle cx="29" cy="32" r="2.6" fill="#FFFFFF" opacity=".85"/>' +
      '<path d="M40 32h15" stroke="#3A4250" stroke-width="6" stroke-linecap="round"/>' +
      '<path d="M48 24l8 8-8 8" stroke="#3A4250" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" fill="none"/>' +
      '<path d="M15 18a10 10 0 0 1 5-3" stroke="#FFFFFF" stroke-opacity=".45" stroke-width="2.6" stroke-linecap="round" fill="none"/>',
      size, defs);
  }

  /* ---------- Corbeille ---------- */
  function corbeille(size) {
    const a = uid();
    const defs = lin(a, 16, 18, 48, 54, [[0, '#B9C2CE'], [.5, '#7B8593'], [1, '#464E5B']]);
    return wrap(
      sol(32, 58, 15, 3, .18) +
      '<rect x="14" y="20.5" width="36" height="35" rx="7" fill="#39404B"/>' +
      '<rect x="14" y="18" width="36" height="35" rx="7" fill="url(#' + a + ')"/>' +
      '<rect x="10" y="11" width="44" height="8" rx="4" fill="#5A6371"/>' +
      '<rect x="25" y="6" width="14" height="7" rx="3.5" fill="#5A6371"/>' +
      '<g stroke="#39404B" stroke-width="3" stroke-linecap="round" opacity=".55">' +
        '<path d="M25 27v18M32 27v18M39 27v18"/></g>' +
      '<path d="M18 25a14 14 0 0 1 4-4" stroke="#FFFFFF" stroke-opacity=".4" stroke-width="2.6" stroke-linecap="round" fill="none"/>',
      size, defs);
  }

  /* ---------- Empreinte de pas ----------
     Les orteils EN HAUT, la plante en dessous. Dessine dans
     l'autre sens, ca ressemblait a une plante en pot. */
  function pas(size) {
    const a = uid();
    const defs = lin(a, 16, 8, 48, 54, [[0, '#A8E6C6'], [.5, '#3FAE79'], [1, '#186B4A']]);
    const orteils =
      '<ellipse cx="22.5" cy="17" rx="4.2" ry="4.8"/>' +
      '<ellipse cx="30.5" cy="13.5" rx="3.6" ry="4.2"/>' +
      '<ellipse cx="37" cy="14.5" rx="3.2" ry="3.8"/>' +
      '<ellipse cx="42.5" cy="17.5" rx="2.8" ry="3.4"/>' +
      '<ellipse cx="46.5" cy="21.5" rx="2.4" ry="3"/>';
    const plante =
      'M20 30c0-6 5-9 12-9s13 4 13 10c0 5-3 8-6 10-3 2-4 4-4 7 0 4-3 7-7 7s-7-3-7-7c0-4 1-6 1-9 0-4-2-5-2-9Z';
    return wrap(
      sol(32, 58, 14, 3, .16) +
      '<g fill="#12523A" transform="translate(0,2.5)">' + orteils + '<path d="' + plante + '"/></g>' +
      '<g fill="url(#' + a + ')">' + orteils + '<path d="' + plante + '"/></g>' +
      '<path d="M24 28a10 10 0 0 1 6-4" stroke="#FFFFFF" stroke-opacity=".45" stroke-width="2.6" stroke-linecap="round" fill="none"/>',
      size, defs);
  }

  /* ---------- Lune de sommeil ---------- */
  function lune(size) {
    const a = uid();
    const defs = lin(a, 14, 10, 48, 52, [[0, '#E8D9FF'], [.5, '#9B7BD8'], [1, '#5A3E95']]);
    return wrap(
      sol(32, 57, 15, 3, .16) +
      '<path d="M40 8a24 24 0 1 0 14 40A20 20 0 0 1 40 8Z" fill="#4A3080" transform="translate(0,2.5)"/>' +
      '<path d="M40 8a24 24 0 1 0 14 40A20 20 0 0 1 40 8Z" fill="url(#' + a + ')"/>' +
      '<circle cx="26" cy="26" r="3" fill="#FFFFFF" opacity=".35"/>' +
      '<circle cx="22" cy="38" r="2" fill="#FFFFFF" opacity=".28"/>',
      size, defs);
  }

  /* ---------- Steak de proteines ---------- */
  function proteine(size) {
    const a = uid(), b = uid();
    const defs =
      lin(a, 12, 16, 52, 48, [[0, '#E88C7A'], [.5, '#B84634'], [1, '#75211A']]) +
      lin(b, 30, 24, 46, 40, [[0, '#F7E3D3'], [1, '#D9BCA6']]);
    return wrap(
      sol(32, 55, 19, 3, .18) +
      '<path d="M14 28c0-9 9-15 20-15s18 6 18 14c0 10-8 20-19 20S14 38 14 28Z" fill="#5F1912" transform="translate(0,2.5)"/>' +
      '<path d="M14 28c0-9 9-15 20-15s18 6 18 14c0 10-8 20-19 20S14 38 14 28Z" fill="url(#' + a + ')"/>' +
      '<path d="M40 22c5 1 8 4 8 8s-3 7-7 7-6-3-6-7 2-8 5-8Z" fill="url(#' + b + ')"/>' +
      '<path d="M20 24a14 14 0 0 1 8-6" stroke="#FFFFFF" stroke-opacity=".4" stroke-width="2.8" stroke-linecap="round" fill="none"/>',
      size, defs);
  }

  /* ---------- Ballon ---------- */
  function ballon(size) {
    const a = uid();
    const defs = lin(a, 12, 10, 52, 52, [[0, '#FFFFFF'], [.55, '#DDE2E9'], [1, '#9AA3AF']]);
    return wrap(
      sol(32, 57, 16, 3, .18) +
      '<circle cx="32" cy="34.5" r="23" fill="#7C8593"/>' +
      '<circle cx="32" cy="32" r="23" fill="url(#' + a + ')"/>' +
      '<path d="m32 20 8 6-3 9.5h-10L24 26Z" fill="#2B313B"/>' +
      '<g fill="#2B313B" opacity=".85">' +
        '<path d="M32 9.5 24 15l-1.5-3.6A23 23 0 0 1 32 9.5Z"/>' +
        '<path d="M48.5 22 41 25l-2-7.5 5.5-4A23 23 0 0 1 48.5 22Z"/>' +
        '<path d="M45 47l-5-6 5-7 7 2A23 23 0 0 1 45 47Z"/>' +
        '<path d="M19 47a23 23 0 0 1-7-11l7-2 5 7Z"/>' +
      '</g>' +
      '<path d="M16 21a23 23 0 0 1 11-8" stroke="#FFFFFF" stroke-opacity=".55" stroke-width="3" stroke-linecap="round" fill="none"/>',
      size, defs);
  }

  /* ---------- Velo ---------- */
  function velo(size) {
    const a = uid();
    const defs = lin(a, 10, 20, 54, 48, [[0, '#8FD3F4'], [.5, '#2E86C8'], [1, '#144B78']]);
    return wrap(
      sol(32, 56, 20, 3, .16) +
      '<g fill="none" stroke="#0F3A5E" stroke-width="4" transform="translate(0,2.5)">' +
        '<circle cx="16" cy="38" r="11"/><circle cx="48" cy="38" r="11"/></g>' +
      '<g fill="none" stroke="url(#' + a + ')" stroke-width="4">' +
        '<circle cx="16" cy="36" r="11"/><circle cx="48" cy="36" r="11"/>' +
        '<path d="M16 36 28 20h10l10 16M28 20l6 16h-18" stroke-linejoin="round" stroke-linecap="round"/></g>' +
      '<circle cx="32" cy="36" r="3.4" fill="url(#' + a + ')"/>' +
      '<path d="M36 17h7" stroke="url(#' + a + ')" stroke-width="4" stroke-linecap="round"/>',
      size, defs);
  }

  /* ---------- Livre ---------- */
  function livre(size) {
    const a = uid(), b = uid();
    const defs =
      lin(a, 8, 12, 32, 52, [[0, '#F6D9A8'], [1, '#D5B27A']]) +
      lin(b, 32, 12, 56, 52, [[0, '#FFFFFF'], [1, '#DCE0E7']]);
    return wrap(
      sol(32, 57, 20, 3, .18) +
      '<path d="M32 16c-5-4-13-5-22-4v36c9-1 17 0 22 4Z" fill="#B08A4E" transform="translate(0,2.5)"/>' +
      '<path d="M32 16c5-4 13-5 22-4v36c-9-1-17 0-22 4Z" fill="#B7BCC5" transform="translate(0,2.5)"/>' +
      '<path d="M32 14c-5-4-13-5-22-4v36c9-1 17 0 22 4Z" fill="url(#' + a + ')"/>' +
      '<path d="M32 14c5-4 13-5 22-4v36c-9-1-17 0-22 4Z" fill="url(#' + b + ')"/>' +
      '<g stroke="#B08A4E" stroke-width="2" stroke-linecap="round" opacity=".55">' +
        '<path d="M15 20h12M15 26h12M15 32h9"/></g>' +
      '<g stroke="#A9AFB9" stroke-width="2" stroke-linecap="round" opacity=".55">' +
        '<path d="M37 20h12M37 26h12M37 32h9"/></g>',
      size, defs);
  }

  /* ---------- Calendrier ---------- */
  function calendrier(size) {
    const a = uid();
    const defs = lin(a, 10, 16, 54, 54, [[0, '#FFFFFF'], [1, '#DDE2E9']]);
    return wrap(
      sol(32, 57, 18, 3, .18) +
      '<rect x="9" y="16.5" width="46" height="40" rx="8" fill="#8E96A4"/>' +
      '<rect x="9" y="14" width="46" height="40" rx="8" fill="url(#' + a + ')"/>' +
      '<path d="M9 22a8 8 0 0 1 8-8h30a8 8 0 0 1 8 8v4H9Z" fill="#C6402F"/>' +
      '<rect x="19" y="6" width="6" height="12" rx="3" fill="#5A6371"/>' +
      '<rect x="39" y="6" width="6" height="12" rx="3" fill="#5A6371"/>' +
      '<g fill="#B9C0CA">' +
        '<rect x="17" y="32" width="7" height="6" rx="2"/><rect x="28" y="32" width="7" height="6" rx="2"/>' +
        '<rect x="39" y="32" width="7" height="6" rx="2"/><rect x="17" y="42" width="7" height="6" rx="2"/></g>' +
      '<rect x="28" y="42" width="7" height="6" rx="2" fill="#2E9E5B"/>',
      size, defs);
  }

  /* ---------- Loupe ---------- */
  function loupe(size) {
    const a = uid();
    const defs = lin(a, 12, 10, 44, 42, [[0, '#BFE3FF'], [.5, '#6FA9DA'], [1, '#2E5B87']]);
    return wrap(
      sol(32, 57, 15, 3, .16) +
      '<rect x="35" y="38" width="18" height="9" rx="4.5" fill="#3A4250" transform="rotate(45 44 42)"/>' +
      '<circle cx="27" cy="27.5" r="17" fill="#2E5B87"/>' +
      '<circle cx="27" cy="26" r="17" fill="url(#' + a + ')"/>' +
      '<circle cx="27" cy="26" r="12" fill="#EAF3FB" opacity=".55"/>' +
      '<path d="M18 19a13 13 0 0 1 8-5" stroke="#FFFFFF" stroke-opacity=".7" stroke-width="3" stroke-linecap="round" fill="none"/>',
      size, defs);
  }

  /* ---------- Code-barres ---------- */
  function codebarre(size) {
    const a = uid();
    const defs = lin(a, 8, 14, 56, 50, [[0, '#FFFFFF'], [1, '#D9DEE6']]);
    const barres = [[16, 3], [21, 2], [25, 4], [31, 2], [35, 3], [40, 2], [44, 4]];
    return wrap(
      sol(32, 55, 20, 3, .18) +
      '<rect x="7" y="16.5" width="50" height="32" rx="6" fill="#8E96A4"/>' +
      '<rect x="7" y="14" width="50" height="32" rx="6" fill="url(#' + a + ')"/>' +
      '<g fill="#2B313B">' + barres.map((b) =>
        '<rect x="' + b[0] + '" y="20" width="' + b[1] + '" height="20" rx="1"/>').join('') + '</g>' +
      '<path d="M10 52h44" stroke="#C6402F" stroke-width="3" stroke-linecap="round"/>',
      size, defs);
  }

  /* ---------- Appareil photo ---------- */
  function appareil(size) {
    const a = uid(), b = uid();
    const defs =
      lin(a, 8, 18, 56, 50, [[0, '#5A6371'], [.5, '#3A4250'], [1, '#22272F']]) +
      lin(b, 24, 26, 40, 42, [[0, '#9FD8F5'], [.6, '#3C7FB0'], [1, '#1B3F5C']]);
    return wrap(
      sol(32, 55, 21, 3, .18) +
      '<rect x="6" y="20.5" width="52" height="32" rx="8" fill="#171B21"/>' +
      '<rect x="6" y="18" width="52" height="32" rx="8" fill="url(#' + a + ')"/>' +
      '<path d="M23 18l3-5h12l3 5Z" fill="url(#' + a + ')"/>' +
      '<circle cx="32" cy="34" r="12" fill="#171B21"/>' +
      '<circle cx="32" cy="34" r="9.5" fill="url(#' + b + ')"/>' +
      '<circle cx="28.5" cy="30.5" r="3" fill="#FFFFFF" opacity=".55"/>' +
      '<circle cx="49" cy="25" r="2.4" fill="#E0A52C"/>',
      size, defs);
  }

  /* ---------- Balance ---------- */
  function balance(size) {
    const a = uid();
    const defs = lin(a, 10, 16, 54, 52, [[0, '#FFFFFF'], [1, '#C8CED8']]);
    return wrap(
      sol(32, 57, 20, 3, .18) +
      '<rect x="8" y="18.5" width="48" height="36" rx="9" fill="#8E96A4"/>' +
      '<rect x="8" y="16" width="48" height="36" rx="9" fill="url(#' + a + ')"/>' +
      '<path d="M20 40a12 12 0 0 1 24 0Z" fill="#E9EDF2"/>' +
      '<path d="M20 40a12 12 0 0 1 24 0" stroke="#8E96A4" stroke-width="2" fill="none"/>' +
      '<path d="M32 40 40 31" stroke="#C6402F" stroke-width="3" stroke-linecap="round"/>' +
      '<circle cx="32" cy="40" r="2.6" fill="#3A4250"/>' +
      '<path d="M14 24a20 20 0 0 1 9-5" stroke="#FFFFFF" stroke-opacity=".6" stroke-width="2.8" stroke-linecap="round" fill="none"/>',
      size, defs);
  }

  const CATALOGUE = { haltere, eclair, flamme, coupe, pomme, goutte, coeur, cible, etoile, tasse,
    chemise, marmite, cadeau, carte, verre, gens, clap, roue,
    lieu, de, refaire, coche, personne, sync, cle, sortie, corbeille, pas, lune,
    proteine, ballon, velo, livre, calendrier, loupe, codebarre, appareil, balance };

  function art(nom, size) {
    if (nom === 'medaille') return medaille('or', size);
    const f = CATALOGUE[nom];
    return f ? f(size) : '';
  }
  art.medaille = medaille;
  art.matieres = MATIERES;
  art.noms = () => Object.keys(CATALOGUE).concat('medaille');

  global.Art = art;
})(window);
