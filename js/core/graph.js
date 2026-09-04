/* ============================================================
   EVER — Graphiques

   Les anciens etaient etires : dix fois plus larges que hauts, on
   n'y lisait rien. Et ils etaient empiles les uns sous les autres,
   ce qui obligeait a defiler pour comparer deux chiffres.

   Cinq formes, toutes en SVG, toutes lisibles en clair comme en
   sombre, et toutes construites sur la meme regle : la hauteur ne
   descend jamais sous la moitie de la largeur.

     anneau    une progression vers un objectif
     barres    une valeur par jour, la plus recente mise en avant
     courbe    une tendance, lissee, avec son aire
     points    une repartition en semis de points (les macros)
     radar     un profil sur plusieurs axes (l'equilibre du corps)
   ============================================================ */
(function (global) {
  'use strict';

  const TAU = Math.PI * 2;
  const pol = (cx, cy, r, a) => [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  const n2 = (v) => Math.round(v * 100) / 100;

  /* ---------- Anneau de progression ----------
     Un arc ouvert en bas, comme un compteur : la partie manquante
     se lit aussi bien que la partie faite. */
  function anneau(o) {
    o = o || {};
    const val = Math.max(0, Number(o.valeur) || 0);
    const but = Math.max(1, Number(o.objectif) || 1);
    const part = Math.min(1.4, val / but);
    const R = 44, C = 56, E = o.epais || 11;
    const debut = Math.PI * 0.75, arc = Math.PI * 1.5;
    const id = 'g' + Math.random().toString(36).slice(2, 8);

    const chemin = (de, a) => {
      const p1 = pol(C, C, R, de), p2 = pol(C, C, R, a);
      const grand = (a - de) > Math.PI ? 1 : 0;
      return 'M' + n2(p1[0]) + ' ' + n2(p1[1]) + 'A' + R + ' ' + R + ' 0 ' + grand + ' 1 ' + n2(p2[0]) + ' ' + n2(p2[1]);
    };

    return '<div class="gchart anneau' + (o.classe ? ' ' + o.classe : '') + '">' +
      '<svg viewBox="0 0 112 112" aria-hidden="true">' +
        '<defs><linearGradient id="' + id + '" x1="12" y1="12" x2="100" y2="100" gradientUnits="userSpaceOnUse">' +
          '<stop offset="0" stop-color="' + (o.c1 || '#6FD3A8') + '"/>' +
          '<stop offset="1" stop-color="' + (o.c2 || '#2E8F66') + '"/></linearGradient></defs>' +
        '<path d="' + chemin(debut, debut + arc) + '" fill="none" stroke="var(--piste)" stroke-width="' + E + '" stroke-linecap="round"/>' +
        (part > 0.002
          ? '<path d="' + chemin(debut, debut + arc * Math.min(1, part)) + '" fill="none" stroke="url(#' + id + ')" stroke-width="' + E + '" stroke-linecap="round"/>'
          : '') +
      '</svg>' +
      '<div class="dedans">' +
        '<b>' + UI.esc(o.centre != null ? o.centre : Math.round(part * 100) + ' %') + '</b>' +
        (o.sous ? '<small>' + UI.esc(o.sous) + '</small>' : '') +
      '</div></div>';
  }

  /* ---------- Barres ----------
     Coins arrondis, la derniere colonne pleine, les autres en
     retrait : l'oeil va au jour en cours sans le chercher. */
  function barres(o) {
    o = o || {};
    const vals = (o.valeurs || []).map((v) => Number(v) || 0);
    if (!vals.length) return '';
    const max = Math.max.apply(null, vals.concat([1]));
    const L = 200, H = 110, n = vals.length;
    const large = Math.max(4, Math.min(18, (L - (n - 1) * 4) / n));
    const ecart = n > 1 ? (L - large) / (n - 1) : 0;
    const actif = o.actif == null ? n - 1 : o.actif;

    return '<div class="gchart barres' + (o.classe ? ' ' + o.classe : '') + '">' +
      '<svg viewBox="0 0 ' + L + ' ' + H + '" preserveAspectRatio="none" aria-hidden="true">' +
        vals.map((v, i) => {
          const h = Math.max(3, (v / max) * (H - 8));
          const x = n2(i * ecart);
          return '<rect x="' + x + '" y="' + n2(H - h) + '" width="' + n2(large) + '" height="' + n2(h) +
            '" rx="' + n2(Math.min(large / 2, 5)) + '" fill="' + (i === actif ? (o.c2 || '#E0A52C') : (o.c1 || 'var(--piste)')) + '"/>';
        }).join('') +
      '</svg></div>';
  }

  /* ---------- Courbe lissee ----------
     Une spline de Catmull-Rom convertie en Bezier : une ligne
     brisee fait un graphique de tableur, une courbe douce fait un
     graphique qu'on regarde. */
  function courbe(o) {
    o = o || {};
    const vals = (o.valeurs || []).map((v) => Number(v) || 0);
    if (vals.length < 2) return '';
    const L = 240, H = 120, P = 8;
    const min = o.min != null ? o.min : Math.min.apply(null, vals);
    const max = o.max != null ? o.max : Math.max.apply(null, vals);
    const etendue = (max - min) || 1;
    const px = (i) => P + (i / (vals.length - 1)) * (L - 2 * P);
    const py = (v) => H - P - ((v - min) / etendue) * (H - 2 * P);
    const pts = vals.map((v, i) => [px(i), py(v)]);
    const id = 'c' + Math.random().toString(36).slice(2, 8);

    let d = 'M' + n2(pts[0][0]) + ' ' + n2(pts[0][1]);
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
      const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
      const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
      d += 'C' + n2(c1[0]) + ' ' + n2(c1[1]) + ' ' + n2(c2[0]) + ' ' + n2(c2[1]) + ' ' + n2(p2[0]) + ' ' + n2(p2[1]);
    }

    return '<div class="gchart courbe' + (o.classe ? ' ' + o.classe : '') + '">' +
      '<svg viewBox="0 0 ' + L + ' ' + H + '" aria-hidden="true">' +
        '<defs><linearGradient id="' + id + '" x1="0" y1="0" x2="0" y2="' + H + '" gradientUnits="userSpaceOnUse">' +
          '<stop offset="0" stop-color="' + (o.c1 || '#4A9BE0') + '" stop-opacity=".38"/>' +
          '<stop offset="1" stop-color="' + (o.c1 || '#4A9BE0') + '" stop-opacity="0"/></linearGradient></defs>' +
        '<path d="' + d + 'L' + n2(L - P) + ' ' + (H - P) + 'L' + P + ' ' + (H - P) + 'Z" fill="url(#' + id + ')"/>' +
        '<path d="' + d + '" fill="none" stroke="' + (o.c1 || '#4A9BE0') + '" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>' +
        '<circle cx="' + n2(pts[pts.length - 1][0]) + '" cy="' + n2(pts[pts.length - 1][1]) +
          '" r="4.5" fill="' + (o.c1 || '#4A9BE0') + '" stroke="var(--bg-elev)" stroke-width="2.5"/>' +
      '</svg></div>';
  }

  /* ---------- Semis de points ----------
     Une grille de points dont la part remplie represente la valeur.
     Beaucoup plus parlant qu'un chiffre : on VOIT qu'il manque un
     tiers des proteines. */
  function points(o) {
    o = o || {};
    const part = Math.max(0, Math.min(1.2, (Number(o.valeur) || 0) / Math.max(1, Number(o.objectif) || 1)));
    const cols = o.cols || 8, lignes = o.lignes || 5;
    const total = cols * lignes;
    const pleins = Math.round(part * total);
    let html = '';
    for (let i = 0; i < total; i++) {
      const c = i % cols, l = Math.floor(i / cols);
      /* On remplit par le bas, comme un verre qui se remplit. */
      const rang = (lignes - 1 - l) * cols + c;
      html += '<circle cx="' + (5 + c * 10) + '" cy="' + (5 + l * 10) + '" r="3.4" fill="' +
        (rang < pleins ? (o.c1 || '#E0A52C') : 'var(--piste)') + '"/>';
    }
    return '<div class="gchart semis' + (o.classe ? ' ' + o.classe : '') + '">' +
      '<svg viewBox="0 0 ' + (cols * 10) + ' ' + (lignes * 10) + '" aria-hidden="true">' + html + '</svg>' +
      (o.libelle ? '<span class="lg" style="color:' + (o.c1 || '#E0A52C') + '">' + UI.esc(o.libelle) + '</span>' : '') +
      '</div>';
  }

  /* ---------- Radar ----------
     Le profil sur plusieurs axes, en une seule forme. Les sommets
     sont adoucis pour donner la silhouette organique de l'image de
     reference plutot qu'un polygone anguleux. */
  function radar(o) {
    o = o || {};
    const axes = o.axes || [];
    if (axes.length < 3) return '';
    const C = 100, R = 78;
    const id = 'r' + Math.random().toString(36).slice(2, 8);
    const pas = TAU / axes.length;
    const dep = -Math.PI / 2;

    const sommets = axes.map((a, i) => {
      const v = Math.max(0.06, Math.min(1, Number(a.v) || 0));
      return pol(C, C, R * v, dep + i * pas);
    });

    /* Meme lissage que la courbe, mais referme sur lui-meme. */
    const at = (i) => sommets[(i + sommets.length) % sommets.length];
    let d = 'M' + n2(at(0)[0]) + ' ' + n2(at(0)[1]);
    for (let i = 0; i < sommets.length; i++) {
      const p0 = at(i - 1), p1 = at(i), p2 = at(i + 1), p3 = at(i + 2);
      const c1 = [p1[0] + (p2[0] - p0[0]) / 5, p1[1] + (p2[1] - p0[1]) / 5];
      const c2 = [p2[0] - (p3[0] - p1[0]) / 5, p2[1] - (p3[1] - p1[1]) / 5];
      d += 'C' + n2(c1[0]) + ' ' + n2(c1[1]) + ' ' + n2(c2[0]) + ' ' + n2(c2[1]) + ' ' + n2(p2[0]) + ' ' + n2(p2[1]);
    }
    d += 'Z';

    const toiles = [0.34, 0.67, 1].map((k) =>
      '<circle cx="' + C + '" cy="' + C + '" r="' + n2(R * k) + '" fill="none" stroke="var(--piste)" stroke-width="1"/>').join('');
    const rayons = axes.map((a, i) => {
      const p = pol(C, C, R, dep + i * pas);
      return '<line x1="' + C + '" y1="' + C + '" x2="' + n2(p[0]) + '" y2="' + n2(p[1]) +
        '" stroke="var(--piste)" stroke-width="1"/>' +
        '<circle cx="' + n2(p[0]) + '" cy="' + n2(p[1]) + '" r="3" fill="' + (o.c1 || '#6C79D8') + '"/>';
    }).join('');
    const noms = axes.map((a, i) => {
      const p = pol(C, C, R + 16, dep + i * pas);
      const anc = Math.abs(p[0] - C) < 6 ? 'middle' : (p[0] > C ? 'start' : 'end');
      return '<text x="' + n2(p[0]) + '" y="' + n2(p[1] + 4) + '" text-anchor="' + anc +
        '" font-size="11" font-weight="650" fill="var(--muted)">' + UI.esc(a.nom) + '</text>';
    }).join('');

    return '<div class="gchart radar' + (o.classe ? ' ' + o.classe : '') + '">' +
      '<svg viewBox="-24 -14 248 228" aria-hidden="true">' +
        '<defs><linearGradient id="' + id + '" x1="0" y1="0" x2="0" y2="200" gradientUnits="userSpaceOnUse">' +
          '<stop offset="0" stop-color="' + (o.c1 || '#6C79D8') + '" stop-opacity=".34"/>' +
          '<stop offset="1" stop-color="' + (o.c1 || '#6C79D8') + '" stop-opacity=".08"/></linearGradient></defs>' +
        toiles + rayons +
        '<path d="' + d + '" fill="url(#' + id + ')" stroke="' + (o.c1 || '#6C79D8') + '" stroke-width="2.5"/>' +
        noms +
      '</svg></div>';
  }

  /* Une tuile de statistique : couleur douce, illustration, chiffre
     en gros, graphique a droite. C'est le format des images de
     reference : quatre tuiles disent la journee sans une phrase. */
  function tuile(o) {
    o = o || {};
    return '<div class="gtuile" style="--t:' + UI.attr(o.teinte || '#4A9BE0') + '"' +
      (o.act ? ' data-act="' + UI.attr(o.act) + '"' : '') + '>' +
      '<div class="haut">' +
        (o.art && global.Art ? '<span class="ill">' + Art(o.art, 26) + '</span>' : '') +
        '<b>' + UI.esc(o.nom) + '</b>' +
      '</div>' +
      '<div class="bas">' +
        '<div class="chiffre"><b>' + UI.esc(o.valeur) + '</b>' +
          (o.unite ? '<small>' + UI.esc(o.unite) + '</small>' : '') + '</div>' +
        (o.graph || '') +
      '</div></div>';
  }

  global.Graph = { anneau, barres, courbe, points, radar, tuile };
})(window);
