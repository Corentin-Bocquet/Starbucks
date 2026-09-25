/* ============================================================
   EVER — Imagerie

   Le principe : chaque chose que l'application nomme finit par
   avoir sa photo. Une recette, un ingrédient, un cocktail, une
   tenue. On ne peut pas livrer cinq cents images avec l'app, et on
   ne veut pas les télécharger d'un serveur qu'il faudrait payer.
   Elles sont donc fabriquées à la demande.

   Comment ça marche :

   1. On demande une image pour un sujet, avec une clé stable
      (« recette:tarte-aux-pommes »).
   2. Si elle est déjà en cache, elle revient instantanément et
      rien n'est consommé.
   3. Sinon Gemini la génère une seule fois, elle est rangée dans
      IndexedDB et poussée sur le compte, puis servie.

   Trois garde-fous, parce qu'une image coûte environ quarante fois
   un texte :
     - une seule génération à la fois, mise en file d'attente ;
     - un plafond quotidien, réglable, coupure nette au-delà ;
     - un interrupteur général dans les réglages.

   Tant qu'une image n'existe pas, on affiche une pastille dégradée
   avec l'initiale du sujet. Jamais un carré gris, jamais un trou.
   ============================================================ */
(function (global) {
  'use strict';

  const CLE_CACHE = 'img.';
  const CLE_JOUR = 'imgQuota';
  const DEFAUT_PLAFOND = 60;

  const actif = () => false;
  const plafond = () => Number(Store.get('imgPlafond', DEFAUT_PLAFOND)) || DEFAUT_PLAFOND;

  function quota() {
    const q = Store.get(CLE_JOUR, null);
    const aujourdhui = UI.day.today();
    if (!q || q.jour !== aujourdhui) return { jour: aujourdhui, n: 0 };
    return q;
  }
  const resteAujourdhui = () => Math.max(0, plafond() - quota().n);
  function consommer() {
    const q = quota();
    Store.set(CLE_JOUR, { jour: q.jour, n: q.n + 1 });
  }

  /* ---------- Cache ----------
     La référence tient dans les réglages (quelques octets), la
     donnée dans IndexedDB. Le compte reçoit l'URL, donc l'image
     suit d'un appareil à l'autre. */
  const ref = (cle) => Store.get(CLE_CACHE + cle, null);
  const poser = (cle, v) => Store.set(CLE_CACHE + cle, v);

  async function lire(cle) {
    const r = ref(cle);
    if (!r) return null;
    if (r.url) return r.url;
    if (r.id) {
      const d = await Photos.get(r.id);
      if (d) return d;
    }
    return null;
  }

  /* ---------- File d'attente ----------
     Une image à la fois : deux générations en parallèle doublent
     l'attente et saturent le quota pour rien. */
  let enCours = null;
  const attente = [];

  function suivant() {
    if (enCours || !attente.length) return;
    const tache = attente.shift();
    enCours = tache.fn()
      .then((v) => tache.ok(v))
      .catch((e) => tache.ko(e))
      .then(() => { enCours = null; suivant(); });
  }
  const enfiler = (fn) => new Promise((ok, ko) => { attente.push({ fn, ok, ko }); suivant(); });

  /* ---------- Les recettes de prompt ----------
     Chaque type de sujet a sa mise en scène. C'est ce qui fait que
     toutes les images de l'app se ressemblent au lieu de partir
     dans tous les sens. */
  const STYLES = {
    plat:
      "Photographie culinaire d'un plat : {sujet}. Vue de trois quarts, assiette blanche ronde, " +
      "fond blanc pur et uni, lumière naturelle douce venant de la gauche, ombre portée légère. " +
      "Aucun texte, aucune main, aucun couvert. Cadrage carré, le plat occupe les trois quarts de l'image.",
    ingredient:
      "Photographie d'un seul ingrédient : {sujet}. Objet isolé, fond blanc pur et uni, " +
      "lumière naturelle douce, ombre portée très légère sous l'objet. " +
      "Aucun texte, aucun décor, aucune main. Cadrage carré, l'objet centré occupe les deux tiers.",
    boisson:
      "Photographie d'une boisson : {sujet}. Verre ou tasse sur fond blanc pur et uni, " +
      "lumière naturelle douce, reflets nets, ombre portée légère. " +
      "Aucun texte, aucune main. Cadrage carré.",
    vetement:
      "Photographie produit d'un vêtement : {sujet}. Vêtement seul, posé à plat ou sur cintre invisible, " +
      "fond blanc pur et uni, lumière d'atelier douce et régulière, aucune ombre dure. " +
      "Aucun texte, aucun mannequin, aucun accessoire. Cadrage carré.",
    lieu:
      "Photographie d'ambiance : {sujet}. Lumière naturelle, cadrage large, aucune personne reconnaissable, " +
      "aucun texte, aucun logo. Format paysage.",
    activite:
      "Photographie d'ambiance illustrant : {sujet}. Lumière naturelle, aucune personne reconnaissable de face, " +
      "aucun texte, aucun logo. Format paysage."
  };

  /* Une clé stable pour un sujet : deux fois le même plat donnent
     la même image, et donc un seul appel. */
  const cleDe = (type, sujet) => type + ':' + String(sujet || '').toLowerCase()
    .replace(/œ/g, 'oe').normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);

  /* ============================================================
     L'appel principal

     Renvoie l'image (data: ou URL), ou null si elle n'existe pas
     encore et ne peut pas être fabriquée maintenant.
     ============================================================ */
  async function obtenir(type, sujet, opts) {
    opts = opts || {};
    const cat = global.Vis ? Vis.url(sujet, type) : null;
    if (cat) return cat;
    return lire(opts.cle || cleDe(type, sujet));
  }

  /* Le modèle renvoie soit des parties inlineData, soit une chaîne
     data: noyée dans le texte. On accepte les deux. */
  function extraire(out) {
    if (!out) return null;
    if (out.images && out.images.length) {
      const im = out.images[0];
      if (typeof im === 'string') return im;
      if (im.data) return 'data:' + (im.mimeType || 'image/png') + ';base64,' + im.data;
    }
    const texte = typeof out === 'string' ? out : (out.text || '');
    const m = /data:image\/[a-z+]+;base64,[A-Za-z0-9+/=]+/.exec(texte);
    return m ? m[0] : null;
  }

  /* ============================================================
     Affichage

     `vignette` rend tout de suite quelque chose de correct : la
     photo si elle existe, sinon une pastille dégradée tirée du nom
     du sujet. Puis `peupler` remplace en silence ce qui peut
     l'être. Aucun écran ne reste vide en attendant.
     ============================================================ */
  function teinteDe(sujet) {
    let n = 0;
    String(sujet || '').split('').forEach((c) => { n = (n * 31 + c.charCodeAt(0)) % 360; });
    return ['hsl(' + n + ',42%,64%)', 'hsl(' + ((n + 34) % 360) + ',44%,44%)'];
  }

  function vignette(type, sujet, opts) {
    opts = opts || {};
    const cle = opts.cle || cleDe(type, sujet);
    const cls = 'vign' + (opts.classe ? ' ' + opts.classe : '');
    const cat = global.Vis ? Vis.url(sujet, type) : null;
    if (cat) {
      return '<span class="' + cls + ' catalogue" data-remplie="1"' + (opts.style ? ' data-style="' + UI.attr(opts.style) + '"' : '') + '>' +
        '<img loading="lazy" decoding="async" src="' + cat + '" alt="" draggable="false"></span>';
    }
    /* Pas de visuel : un bloc de verre, jamais une lettre. Une photo
       prise par l'utilisateur, si elle existe, viendra le remplir. */
    return '<span class="' + cls + ' vide" data-img="' + UI.attr(cle) + '"' +
      (opts.style ? ' data-style="' + UI.attr(opts.style) + '"' : '') + '></span>';
  }

  /* Remplit les vignettes avec les photos déjà rangées sur
     l'appareil. Plus aucune génération, plus aucune banque. */
  async function peupler(racine) {
    const cases = Array.from((racine || document).querySelectorAll('[data-img]:not([data-remplie])'));
    for (const el of cases) {
      const src = await lire(el.dataset.img);
      if (src && el.isConnected) poserImage(el, src);
    }
  }

  function poserImage(el, src) {
    el.dataset.remplie = '1';
    el.classList.remove('vide');
    el.innerHTML = '<img loading="lazy" src="' + UI.attr(src) + '" alt="">';
  }

  /* Combien d'images sont déjà en cache, pour l'affichage des
     réglages. */
  function stats() {
    let n = 0;
    Object.keys(localStorage).forEach((k) => {
      if (k.indexOf(Store.NS + 's.' + CLE_CACHE) === 0) n++;
    });
    return { enCache: n, reste: resteAujourdhui(), plafond: plafond(), actif: actif() };
  }

  function vider() {
    Object.keys(localStorage).forEach((k) => {
      if (k.indexOf(Store.NS + 's.' + CLE_CACHE) === 0) localStorage.removeItem(k);
    });
  }

  global.Imagerie = {
    obtenir, vignette, peupler, cleDe, lire, stats, vider,
    actif, resteAujourdhui, STYLES
  };
})(window);
