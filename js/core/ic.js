/* ============================================================
   EVER — Les icônes 3D

   Trente-trois illustrations en verre, bleu et violet, dessinées
   pour cette application. Elles remplacent les photos cherchées
   sur des banques d'images : une photo trouvée par mot-clé est
   toujours un peu à côté, jamais deux fois le même cadrage, et
   quinze cartes côte à côte ne forment aucun ensemble.

   Chaque icône existe en deux fonds, blanc et noir, cuits dans le
   fichier. Pas de transparence : une icône en verre posée sur un
   fond transparent perd ses reflets, et un PNG à canal alpha pèse
   dix fois le poids d'un WebP opaque. Le thème choisit le fichier,
   la carte porte le fond correspondant, et la jointure ne se voit
   pas.

   Le point d'entrée est `Ic.trouve(mot)`. Il accepte aussi bien
   « Dessert » que « sucré » ou « chocolate cake dessert » : les
   appels existants passaient des mots-clés de photo, souvent en
   anglais, et on ne voulait pas réécrire les cent endroits qui
   les fabriquent.
   ============================================================ */
(function (global) {
  'use strict';

  const BASE = 'img/ic/';

  /* Les fichiers réellement présents. Toute demande qui ne tombe
     pas là-dedans repart vers la photothèque : mieux vaut une
     photo approximative qu'un carré vide. */
  const DISPO = ['3-idees', 'a-saisir-ajouter', 'accessoires', 'apero', 'apple-sante',
    'bas', 'cafe', 'chaud', 'chaussures', 'chercher', 'codebarre', 'de-hasard',
    'dessert', 'entree', 'equilibre', 'fruite', 'glace', 'gourmand', 'guide', 'haut',
    'historique', 'leger', 'lieux', 'manteau', 'mixe', 'mood', 'objectifs', 'plat',
    'poubelle-a-jeter', 'recettes', 'sans-cafe', 'scanner', 'the-matcha'];
  const SET = {};
  DISPO.forEach((s) => { SET[s] = true; });

  const sansAccent = (s) => String(s || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ').trim();

  /* ---------- Les synonymes ----------
     À gauche l'icône, à droite tout ce qui doit y mener. L'ordre
     compte : on teste les expressions longues avant les mots
     courts, sinon « cafe » attraperait « sans cafe ». */
  const MOTS = {
    'sans-cafe':   ['sans cafe', 'sans cafeine', 'deca', 'non alcoolise', 'sans alcool', 'soft', 'lait', 'chocolat chaud'],
    'the-matcha':  ['the matcha', 'matcha', 'the', 'infusion', 'tisane'],
    'de-hasard':   ['de hasard', 'hasard', 'au hasard', 'tourner', 'tourner ici', 'roulette', 'roue', 'la roue',
                    'choisis pour moi', 'surprends moi', 'surprise', 'dice', 'random', 'relancer'],
    '3-idees':     ['3 idees', 'trois idees', 'troisidees', 'plusieurs idees'],
    'a-saisir-ajouter': ['a saisir ajouter', 'saisir ce jour', 'modifier ce jour', 'saisir', 'ajouter', 'noter',
                    'nouvelle entree', 'ajouter un aliment', 'ajouter une activite', 'ajouter un plat',
                    'tout ajouter', 'ajouter au journal', 'add', 'plus', 'creer', 'inventer', 'nouveau', 'nouvelle'],
    'poubelle-a-jeter': ['poubelle a jeter', 'a jeter', 'poubelle', 'tout effacer', 'effacer', 'supprimer', 'vider', 'retirer'],
    'apple-sante': ['apple sante', 'sante', 'apple health', 'iphone health', 'import sante', 'bilan',
                    'favoris', 'favori', 'coup de coeur', 'j aime', 'aimes'],
    'objectifs':   ['objectifs', 'mes objectifs', 'objectif', 'cible', 'target', 'but', 'palier', 'paliers'],
    'historique':  ['historique', 'mon historique', 'deja fait', 'deja sorti', 'passe', 'recent', 'journal',
                    'photo album', 'archives', 'hier'],
    'chercher':    ['chercher', 'rechercher', 'recherche', 'a la main', 'a la  main', 'saisie manuelle',
                    'dans la base', 'search', 'trouver'],
    'codebarre':   ['codebarre', 'code barre', 'code barres', 'code a barres', 'barcode', 'scanner un code'],
    'scanner':     ['scanner', 'scan', 'prendre en photo', 'photo du plat', 'appareil photo', 'camera', 'photographier'],
    'recettes':    ['recettes', 'mes recettes', 'recette', 'cuisine', 'cuisiner', 'chef', 'livre de recettes'],
    'guide':       ['guide', 'le guide', 'histoire', 'culture', 'a savoir', 'pourquoi elle est connue',
                    'connue pour', 'city guide', 'travel city guide', 'pratique', 'a lire', 'livre'],
    'lieux':       ['lieux', 'lieu', 'mes etablissements', 'etablissement', 'ou c est', 'adresse', 'adresses',
                    'sur la carte', 'la carte', 'position', 'autour de moi', 'coins discrets', 'insolite',
                    'bons plans', 'shopping', 'a voir', 'a faire'],
    'mood':        ['mood', 'ton mood', 'mon mood', 'humeur', 'etat d esprit', 'comment tu te sens', 'soleil'],
    'haut':        ['haut', 'hauts', 'le haut', 't shirt', 'tshirt', 'chemise', 'pull', 'sweat', 'hoodie', 'top'],
    'bas':         ['bas', 'le bas', 'pantalon', 'jean', 'jeans', 'short', 'bermuda'],
    'chaussures':  ['chaussures', 'chaussure', 'souliers', 'baskets', 'shoes'],
    'manteau':     ['manteau', 'veste', 'blouson', 'parka', 'trench', 'coat', 'surcouche'],
    'accessoires': ['accessoires', 'accessoire', 'echarpe', 'foulard', 'bonnet', 'ceinture', 'montre', 'sac'],
    'plat':        ['plat', 'plats', 'plat principal', 'sale', 'sales', 'repas', 'diner', 'dejeuner',
                    'main course', 'notebook food journal', 'alimentation'],
    'dessert':     ['dessert', 'desserts', 'sucre', 'sucres', 'gateau', 'patisserie'],
    'entree':      ['entree', 'entrees', 'starter', 'crudites'],
    'apero':       ['apero', 'aperitif', 'aperos', 'tapas', 'grignotage', 'planche'],
    'chaud':       ['chaud', 'chaude', 'chaudes', 'boisson chaude', 'hot'],
    'glace':       ['glace', 'glacee', 'glacees', 'froid', 'froide', 'iced', 'frais', 'boisson glacee'],
    'mixe':        ['mixe', 'mixee', 'frappe', 'frappuccino', 'milkshake', 'smoothie', 'blend'],
    'equilibre':   ['equilibre', 'equilibree', 'classique', 'cappuccino', 'latte'],
    'gourmand':    ['gourmand', 'gourmande', 'creme', 'crémeux', 'cremeux', 'sundae', 'onctueux'],
    'leger':       ['leger', 'legere', 'alcoolise', 'alcool', 'cocktail', 'verre', 'whisky', 'spiritueux'],
    'fruite':      ['fruite', 'fruitee', 'fruit', 'fruits', 'fraise', 'agrumes'],
    'cafe':        ['cafe', 'expresso', 'espresso', 'grains', 'coffee', 'cafeine']
  };

  /* Index inversé, trié par longueur décroissante : la recherche
     par inclusion doit rencontrer « sans cafe » avant « cafe ». */
  const INDEX = [];
  Object.keys(MOTS).forEach((slug) => {
    if (!SET[slug]) return;
    MOTS[slug].forEach((m) => INDEX.push([sansAccent(m), slug]));
  });
  INDEX.sort((a, b) => b[0].length - a[0].length);
  const EXACT = {};
  INDEX.forEach(([m, s]) => { if (!EXACT[m]) EXACT[m] = s; });

  /* ============================================================
     L'interrupteur

     Les icones 3D sont de nouveau la regle sur les cartes d'action.
     Les photos tirees d'une banque par mot-cle tombaient trop
     souvent a cote du sujet (une « balade » illustree par un
     parking) : une icone dessinee pour l'app est toujours juste.
     Les vraies photos restent la ou elles sont sures : boissons,
     cocktails et recettes, qui ont chacun la leur dans assets/.

     Tout passe par `trouve` : cartes.js, stock.js et codex.js
     appellent tous cette fonction ou consultent `actif()`. Un seul
     endroit a basculer, aucun risque d'en oublier un.
     ============================================================ */
  function actif() {
    return true;
  }

  /* Les anciennes icônes bleues et violettes sont retirées : chaque
     ancien nom pointe désormais vers son visuel du catalogue. */
  const VERS = {
    '3-idees': 'trois-idees', 'a-saisir-ajouter': 'ajouter', accessoires: 'accessoires', apero: 'mm-apero',
    'apple-sante': 'apple-sante', bas: 'bas', cafe: 'sb-cafe', chaud: 'sb-chaud', chaussures: 'chaussures',
    chercher: 'chercher', codebarre: 'codebarre', 'de-hasard': 'de', dessert: 'mm-dessert', entree: 'mm-entree',
    equilibre: 'sb-equilibre', fruite: 'sb-fruit', glace: 'sb-glace', gourmand: 'sb-gourmand', guide: 'guide',
    haut: 'haut', historique: 'historique', leger: 'sb-leger', lieux: 'lieu', manteau: 'veste', mixe: 'sb-mixe',
    mood: 'mood', objectifs: 'objectifs', plat: 'mm-plat', 'poubelle-a-jeter': 'effacer', recettes: 'mm-plat',
    'sans-cafe': 'sb-lait', scanner: 'scanner', 'the-matcha': 'sb-the'
  };
  const cible = (slug) => {
    if (!slug || !global.Vis) return null;
    if (Vis.SET.has(slug)) return slug;
    const v = VERS[slug];
    return v && Vis.SET.has(v) ? v : null;
  };

  /* Le visuel pour un mot, ou null si rien ne colle. */
  function trouve(mot) {
    if (!actif() || !global.Vis) return null;
    const direct = Vis.trouve(mot, 'icone');
    if (direct) return direct;
    const m = sansAccent(mot);
    if (!m) return null;
    if (SET[m.replace(/ /g, '-')]) return cible(m.replace(/ /g, '-'));
    if (EXACT[m]) return cible(EXACT[m]);
    for (let i = 0; i < INDEX.length; i++) {
      const [cle, slug] = INDEX[i];
      if (cle.length < 4) continue;
      if (m === cle || m.indexOf(cle + ' ') === 0 || m.indexOf(' ' + cle) >= 0) return cible(slug);
    }
    return null;
  }

  const url = (slug) => global.Vis ? Vis.src(cible(slug)) : null;
  const sombre = () => document.documentElement.getAttribute('data-theme') === 'dark';
  function rafraichir() {}

  function html(slug, opts) {
    opts = opts || {};
    const s = url(slug);
    if (!s) return '';
    return '<span class="ic3d vis3d' + (opts.classe ? ' ' + opts.classe : '') + '">' +
      '<img src="' + s + '" alt="" loading="lazy" decoding="async" draggable="false"></span>';
  }

  /* Pour les endroits qui veulent la balise sans l'enveloppe. */
  function balise(slug, alt) {
    const s = url(slug);
    if (!s) return '';
    return '<img class="ic3dimg" src="' + s + '" alt="' + UI.attr(alt || '') + '" loading="lazy" decoding="async" draggable="false">';
  }

  global.Ic = { trouve, actif, html, balise, url, sombre, rafraichir, DISPO, a: (m) => !!trouve(m) };
})(window);
