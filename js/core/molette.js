/* ============================================================
   EVER — Le sélecteur à molette

   Une règle graduée qui défile sous un trait fixe. On pose le
   pouce, on tire, la valeur suit, et chaque cran claque.

   Pourquoi pas un champ de saisie : parce qu'on change une charge
   de 80 à 82,5 kg, pas de 80 à 137. Un clavier numérique demande
   trois gestes et cache la moitié de l'écran ; une molette en
   demande un seul et laisse tout visible. Pour les grands sauts,
   le champ reste accessible d'un appui sur le nombre.

   La mécanique repose sur le défilement natif du navigateur :
   inertie, rebond et accrochage sont ceux du système, donc ils
   sont parfaits sur iPhone et ne coûtent pas une ligne. On lit la
   position, on en déduit la valeur, rien de plus.
   ============================================================ */
(function (global) {
  'use strict';

  const PAS_PX = 13;          /* écart entre deux graduations */
  let compteur = 0;

  /* opts : { min, max, pas, valeur, unite, label, decimales, onChange } */
  function html(opts) {
    const o = normaliser(opts);
    const n = Math.round((o.max - o.min) / o.pas);
    let traits = '';
    for (let i = 0; i <= n; i++) {
      const v = o.min + i * o.pas;
      /* Une graduation sur cinq est haute et porte son chiffre :
         sans repère chiffré, on ne sait plus où on est. */
      const majeure = i % 5 === 0;
      traits += '<span class="tr' + (majeure ? ' maj' : '') + '">' +
        (majeure ? '<i>' + fmt(v, o.decimales) + '</i>' : '') + '</span>';
    }
    return '<div class="molette" data-molette="' + o.id + '"' +
        ' data-min="' + o.min + '" data-max="' + o.max + '" data-pas="' + o.pas + '"' +
        ' data-dec="' + o.decimales + '" data-val="' + o.valeur + '">' +
      '<div class="tete">' +
        '<span class="lib">' + UI.esc(o.label) + '</span>' +
        '<button type="button" class="chiffre" data-saisir>' +
          '<b>' + fmt(o.valeur, o.decimales) + '</b><small>' + UI.esc(o.unite) + '</small>' +
        '</button>' +
      '</div>' +
      '<div class="regle">' +
        '<div class="piste" data-piste>' +
          '<div class="marge"></div>' + traits + '<div class="marge"></div>' +
        '</div>' +
        '<div class="curseur"></div>' +
        '<div class="voile g"></div><div class="voile d"></div>' +
      '</div>' +
    '</div>';
  }

  function normaliser(o) {
    o = o || {};
    const pas = o.pas || 1;
    const dec = o.decimales != null ? o.decimales : (String(pas).indexOf('.') >= 0 ? 1 : 0);
    return {
      id: o.id || ('m' + (++compteur)),
      min: o.min != null ? o.min : 0,
      max: o.max != null ? o.max : 100,
      pas: pas, decimales: dec,
      valeur: o.valeur != null ? o.valeur : (o.min != null ? o.min : 0),
      unite: o.unite || '',
      label: o.label || ''
    };
  }

  const fmt = (v, dec) => dec ? v.toFixed(dec).replace('.', ',') : String(Math.round(v));

  /* Rend vivantes toutes les molettes d'un bloc. */
  function activer(racine, onChange) {
    racine.querySelectorAll('[data-molette]').forEach((el) => {
      if (el._branchee) return;
      el._branchee = true;

      const piste = el.querySelector('[data-piste]');
      const chiffre = el.querySelector('.chiffre b');
      const min = Number(el.dataset.min), max = Number(el.dataset.max);
      const pas = Number(el.dataset.pas), dec = Number(el.dataset.dec);
      let valeur = Number(el.dataset.val);
      let dernier = valeur;

      /* Une graduation est centree sur elle-meme (scroll-snap-align
         center), donc son centre tombe a i x PAS + PAS/2 apres la
         marge. Oublier ce demi-cran decale la regle d'une demi-
         graduation, et la valeur saute d'un cran au relachement. */
      const DEMI = PAS_PX / 2;
      const versPos = (v) => Math.round((v - min) / pas) * PAS_PX + DEMI;
      const versVal = (x) => {
        const i = Math.round((x - DEMI) / PAS_PX);
        return Math.min(max, Math.max(min, min + i * pas));
      };

      /* Position de départ, sans animation ni bruit. */
      const poser = () => { piste.scrollLeft = versPos(valeur); };
      poser();
      /* La largeur n'est connue qu'une fois la feuille peinte. */
      requestAnimationFrame(poser);
      setTimeout(poser, 120);

      let libre = null;
      piste.addEventListener('scroll', () => {
        const v = versVal(piste.scrollLeft);
        if (v !== dernier) {
          dernier = v;
          valeur = v;
          el.dataset.val = String(v);
          chiffre.textContent = fmt(v, dec);
          /* Un cran plus marqué toutes les cinq graduations :
             l'oreille compte sans qu'on y pense. */
          Feedback.cran(Math.round((v - min) / pas) % 5 === 0);
        }
        clearTimeout(libre);
        libre = setTimeout(() => { if (onChange) onChange(el.dataset.molette, valeur, el); }, 90);
      }, { passive: true });

      /* Le nombre reste cliquable : pour passer de 20 à 140 kg,
         personne ne veut faire défiler cent vingt crans. */
      el.querySelector('[data-saisir]').onclick = async () => {
        const r = await UI.promptSheet(el.querySelector('.lib').textContent, [
          { name: 'v', label: 'Valeur', type: 'number', inputmode: 'decimal', value: valeur }
        ], 'Valider');
        if (!r) return;
        const v = Math.min(max, Math.max(min, Math.round(Number(r.v) / pas) * pas));
        if (!isFinite(v)) return;
        valeur = v; dernier = v;
        el.dataset.val = String(v);
        chiffre.textContent = fmt(v, dec);
        piste.scrollTo({ left: versPos(v), behavior: 'smooth' });
        if (onChange) onChange(el.dataset.molette, v, el);
      };
    });
  }

  /* Lecture directe, pour l'enregistrement. */
  const valeur = (racine, id) => {
    const el = racine.querySelector('[data-molette="' + id + '"]');
    return el ? Number(el.dataset.val) : null;
  };

  global.Molette = { html, activer, valeur, PAS_PX };
})(window);
