/* ============================================================
   EVER — Photothèque libre

   Le problème : l'application nomme des centaines de choses (un
   kebab, un musée, une balade en bord de mer) et chacune mérite
   une image. Générer chacune d'elles coûte du quota et prend
   plusieurs secondes.

   La plupart de ces choses existent déjà en photo, et en libre de
   droits. On va donc les chercher plutôt que de les fabriquer.

   Source : Openverse (la Wikipédia de l'image libre, opérée par
   WordPress). Aucune clé, aucun compte, CORS ouvert, 200 requêtes
   par jour et par adresse. On filtre volontairement sur CC0 et
   domaine public : ces licences ne demandent aucune mention, donc
   l'interface reste propre.

   Chaque réponse est mémorisée pour toujours dans les réglages :
   on ne stocke que l'URL, quelques dizaines d'octets. La deuxième
   fois, la photo est instantanée et ne coûte plus rien.

   Ordre d'appel dans l'application :
     1. cache local            gratuit, instantané
     2. Openverse (ici)        gratuit, ~400 ms
     3. génération Gemini      payante, en dernier recours
   ============================================================ */
(function (global) {
  'use strict';

  const API = 'https://api.openverse.org/v1/images/';
  const CLE = 'ph.';
  const TTL_VIDE = 7 * 24 * 3600 * 1000;   /* on retente une semaine plus tard */

  const actif = () => Store.get('photosLibres', true);

  /* ---------- Vocabulaire ----------
     Openverse indexe en anglais. Traduire à la volée coûterait un
     appel de plus ; la table couvre ce que l'application dit
     vraiment, le reste passe tel quel (les noms de plats et de
     villes se cherchent très bien sans traduction). */
  const MOTS = {
    /* actions et rubriques */
    'ajouter une activite': 'checklist notebook',
    'mes etablissements': 'restaurant storefront',
    'evenements du moment': 'festival crowd',
    'eviter ce qui vient': 'calendar planning',
    'historique': 'vintage photo album',
    'favoris': 'gold star',
    'guide': 'travel guidebook',
    'budget': 'coins money',
    'reglages': 'gears machine',
    'humeur': 'colorful abstract paint',
    'hasard': 'dice game',
    'surprise': 'gift confetti',
    'meteo': 'clouds sky',
    /* familles d'activites */
    'restaurant': 'restaurant table setting',
    'bar': 'cocktail bar counter',
    'cafe': 'coffee shop interior',
    'culture': 'art museum gallery',
    'musee': 'museum hall',
    'cinema': 'cinema seats screen',
    'concert': 'concert stage lights',
    'theatre': 'theatre stage curtain',
    'sport': 'running track sport',
    'nature': 'forest path nature',
    'plage': 'sandy beach sea',
    'balade': 'walking path park',
    'randonnee': 'hiking mountain trail',
    'velo': 'bicycle road',
    'piscine': 'swimming pool water',
    'shopping': 'shopping street boutique',
    'marche': 'street market stalls',
    'parc': 'city park trees',
    'jeux': 'board games table',
    'bowling': 'bowling alley lanes',
    'karting': 'go kart racing',
    'escalade': 'climbing wall',
    'patinoire': 'ice skating rink',
    'spa': 'spa massage stones',
    'voyage': 'suitcase travel',
    'soiree': 'party night lights',
    'maison': 'cozy living room',
    'lecture': 'open book reading',
    'musique': 'vinyl records music',
    'photo': 'vintage camera',
    'cuisine': 'kitchen cooking',
    'brunch': 'brunch table food',
    'glace': 'ice cream cone',
    'patisserie': 'pastry shop cakes',
    /* aliments courants */
    'poulet': 'roast chicken',
    'poulet roti': 'roast chicken',
    'boeuf': 'beef steak',
    'steak': 'grilled steak',
    'porc': 'pork meat',
    'agneau': 'lamb meat',
    'dinde': 'turkey meat',
    'canard': 'duck meat',
    'jambon': 'ham slices',
    'saumon': 'salmon fillet',
    'thon': 'tuna fish',
    'cabillaud': 'white fish fillet',
    'crevette': 'shrimp',
    'oeuf': 'eggs',
    'omelette': 'omelette',
    'fromage': 'cheese board',
    'yaourt': 'yogurt bowl',
    'lait': 'milk glass',
    'pain': 'bread loaf',
    'baguette': 'french baguette',
    'riz': 'cooked rice bowl',
    'pates': 'pasta bowl',
    'spaghetti': 'spaghetti pasta',
    'pizza': 'pizza slice',
    'burger': 'hamburger',
    'frites': 'french fries',
    'kebab': 'kebab wrap',
    'tacos': 'tacos',
    'sandwich': 'sandwich',
    'wrap': 'wrap sandwich',
    'sushi': 'sushi plate',
    'salade': 'green salad bowl',
    'soupe': 'soup bowl',
    'lasagnes': 'lasagna',
    'gratin': 'gratin dish',
    'quiche': 'quiche tart',
    'couscous': 'couscous dish',
    'curry': 'curry bowl',
    'ramen': 'ramen bowl',
    'pomme': 'apple',
    'banane': 'banana',
    'orange': 'orange fruit',
    'fraise': 'strawberries',
    'raisin': 'grapes',
    'poire': 'pear',
    'peche': 'peach fruit',
    'ananas': 'pineapple',
    'mangue': 'mango',
    'citron': 'lemon',
    'tomate': 'tomatoes',
    'carotte': 'carrots',
    'courgette': 'zucchini',
    'brocoli': 'broccoli',
    'epinard': 'spinach',
    'salade verte': 'lettuce',
    'oignon': 'onions',
    'ail': 'garlic',
    'poivron': 'bell pepper',
    'champignon': 'mushrooms',
    'pomme de terre': 'potatoes',
    'haricot': 'green beans',
    'lentille': 'lentils',
    'pois chiche': 'chickpeas',
    'amande': 'almonds',
    'noix': 'walnuts',
    'avocat': 'avocado',
    'olive': 'olives',
    'chocolat': 'chocolate bar',
    'gateau': 'cake slice',
    'tarte': 'fruit tart',
    'glace': 'ice cream',
    'cookie': 'cookies',
    'croissant': 'croissant',
    'crepe': 'crepes',
    'yaourt nature': 'plain yogurt',
    'cafe noir': 'espresso coffee',
    'the': 'tea cup',
    'biere': 'beer glass',
    'vin': 'wine glass',
    'jus': 'fruit juice',
    'eau': 'water glass',
    'soda': 'soda glass',
    'cocktail': 'cocktail glass',
    'huile': 'olive oil bottle',
    'beurre': 'butter',
    'miel': 'honey jar',
    'sucre': 'sugar',
    /* registres de tenue */
    'classe': 'elegant suit menswear',
    'oldmoney': 'classic tailoring wool',
    'decontracte': 'casual denim outfit',
    'sportif': 'sportswear sneakers',
    'chaud': 'winter coat knitwear'
  };

  /* ============================================================
     La generation libre, en dernier recours gratuit

     Openverse ne trouve pas tout : un plat precis, un cocktail
     maison, une tenue qui n'existe pas encore. Plutot que de
     laisser une pastille a initiale, on fait dessiner l'image.

     Pollinations rend une image a partir d'une simple URL : aucune
     cle, aucun compte, aucun quota a surveiller. Une graine tiree
     du sujet rend le resultat STABLE : le meme plat donne toujours
     la meme image, donc le navigateur la met en cache et l'app ne
     redessine jamais deux fois la meme chose.

     Ordre complet dans l'application :
       1. cache local                gratuit, instantane
       2. Openverse                  gratuit, vraie photo
       3. generation libre (ici)     gratuit, image dessinee
       4. Gemini                     payant, seulement pour ce qui
                                     a besoin du visage de Corentin
     ============================================================ */
  const GEN = 'https://image.pollinations.ai/prompt/';

  const STYLE_GEN = {
    plat:       'appetizing food photography of {S}, plated on a ceramic dish, natural window light, shallow depth of field, top down',
    ingredient: 'single {S} on a clean light neutral background, studio product photography, soft shadow, centred',
    boisson:    '{S} served in the correct glass, bar counter, warm light, condensation, product photography',
    vetement:   'men fashion lookbook photo, {S}, full body, plain light grey studio background, soft daylight',
    tenue:      'men fashion lookbook, full body model wearing {S}, plain light grey studio background, soft daylight, editorial',
    lieu:       'travel photography of {S}, golden hour, wide shot, no people in focus',
    activite:   'candid lifestyle photography, people doing {S}, natural light, documentary style',
    sport:      'dynamic sports photography, athlete doing {S}, gym or outdoor, motion, dramatic light',
    icone:      'minimal 3d render icon of {S}, soft studio lighting, pastel background, clay material, centred'
  };

  /* Une graine stable tiree du texte : meme sujet, meme image. */
  function graine(txt) {
    let h = 2166136261;
    String(txt).split('').forEach((c) => { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); });
    return Math.abs(h) % 1000000;
  }

  /* Plus aucune image dessinée à la volée : le catalogue local, ou
     rien. Les appelants gèrent l'absence d'image. */
  function genere(type, sujet) {
    return global.Vis ? Vis.url(sujet, type) : null;
  }

  const QUALIF = {
    plat: 'food dish',
    ingredient: 'food ingredient',
    boisson: 'drink glass',
    vetement: 'clothing garment',
    lieu: 'place travel',
    activite: 'people activity',
    icone: ''
  };

  const sansAccent = (s) => String(s || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

  function requete(type, sujet) {
    const brut = sansAccent(sujet).replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
    if (!brut) return '';
    let mot = MOTS[brut];
    if (!mot) {
      const cle = Object.keys(MOTS).find((k) => brut.indexOf(k) === 0 || k.indexOf(brut) === 0);
      if (cle) mot = MOTS[cle];
    }
    const q = mot || brut;
    const suffixe = QUALIF[type] != null ? QUALIF[type] : '';
    return (q + ' ' + suffixe).trim();
  }

  /* ---------- Cache ----------
     Une URL par sujet. Un échec est mémorisé aussi, pour ne pas
     rappeler l'API à chaque affichage d'un sujet introuvable. */
  const clef = (type, sujet) => CLE + sansAccent(type) + ':' +
    sansAccent(sujet).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);

  function enCache(c) {
    const v = Store.get(c, null);
    if (!v) return undefined;
    if (v.vide) return (Date.now() - (v.at || 0) > TTL_VIDE) ? undefined : null;
    return v.u || null;
  }

  /* ---------- Appel réseau ----------
     Une requête à la fois : Openverse limite à vingt par minute et
     rien ne presse, les images arrivent au fil de l'affichage. */
  let file = Promise.resolve();
  let coupe = false;          /* passe à vrai si l'API refuse, on arrete pour la session */

  function enchainer(fn) {
    const p = file.then(fn, fn);
    file = p.then(() => {}, () => {});
    return p;
  }

  async function interroger(q) {
    const base = API + '?format=json&page_size=8&mature=false&license=cc0,pdm' +
      '&q=' + encodeURIComponent(q);
    /* D'abord les banques modernes, qui donnent des photos nettes
       et actuelles ; sinon tout le catalogue, quitte a tomber sur
       une archive. */
    for (const url of [base + '&source=stocksnap,rawpixel', base]) {
      const r = await fetch(url, { headers: { Accept: 'application/json' } });
      if (r.status === 429) { coupe = true; return null; }
      if (!r.ok) continue;
      const d = await r.json();
      const liste = (d && d.results) || [];
      if (liste.length) {
        const choix = liste[Math.floor(Math.random() * Math.min(4, liste.length))];
        return choix.thumbnail || choix.url || null;
      }
    }
    return null;
  }

  /* URL d'une photo pour un sujet. Ne lève jamais : renvoie null
     quand il n'y a rien, l'appelant garde sa pastille. */
  async function url(type, sujet) {
    return global.Vis ? Vis.url(sujet, type) : null;
  }

  /* ---------- Icônes photo ----------
     Les petits ronds posés devant un libellé de bouton. Ils
     partent d'un dégradé tiré du mot, puis se remplissent. */
  function teinte(sujet) {
    let n = 0;
    String(sujet || '').split('').forEach((c) => { n = (n * 31 + c.charCodeAt(0)) % 360; });
    return ['hsl(' + n + ',52%,66%)', 'hsl(' + ((n + 40) % 360) + ',50%,42%)'];
  }

  const ARTS = [
    ['haltere', /gym|muscu|weight|fitness|halter/], ['velo', /velo|cycl|bike/],
    ['pas', /running|course|walking|marche|\bpas\b|sport/], ['de', /dice|hasard|\bde\b/],
    ['roue', /refresh|reglage|settings|station|pratique|gear/], ['calendrier', /calendar|agenda|evenement|festival|planning/],
    ['marmite', /restaurant|manger|plat|repas|cuisine|food|recette/], ['verre', /\bbar\b|cocktail|boire|verre/],
    ['tasse', /cafe|coffee|\bthe\b/], ['livre', /culture|histoire|guide|book|museum|musee|heritage|savoir/],
    ['lieu', /monument|landmark|lieu|place|adresse|ville|city|travel|etablissement/], ['cadeau', /shopping|cadeau|gift|surprise/],
    ['eclair', /soiree|energie|analys|chart|nuit blanche/], ['cible', /budget|bon plan|objectif|target/],
    ['loupe', /hidden|insolite|cherch|search/], ['gens', /\bgens\b|ami|friend|crowd|profil|famille|couple|liste/],
    ['clap', /film|cinema|serie/], ['coeur', /sante|heart|favori|humeur|mood/], ['pomme', /fruit|pomme|aliment/],
    ['etoile', /star|famous|connue/], ['codebarre', /codebarre|barcode/], ['balance', /poids|scale/],
    ['lune', /sommeil|sleep/], ['goutte', /\beau\b|water/], ['appareil', /photo|camera|scan/],
    ['refaire', /historique|deja|history/], ['chemise', /tenue|vetement|shirt|penderie/]
  ];
  function artPour(sujet) {
    const m = String(sujet || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
    for (let i = 0; i < ARTS.length; i++) if (ARTS[i][1].test(m)) return ARTS[i][0];
    return null;
  }

  const TYPES = { plat: 'plat', aliment: 'plat', ingredient: 'ingredient', boisson: 'boisson',
    vetement: 'vetement', tenue: 'vetement', activite: 'activite', lieu: 'lieu', sport: 'activite' };

  function ic(sujet, opts) {
    opts = opts || {};
    const type = TYPES[opts.type] || 'icone';
    const slug = global.Vis ? (Vis.trouve(sujet, type) || (type !== 'icone' ? Vis.trouve(sujet, 'icone') : null)) : null;
    if (slug) return Vis.html(slug, { classe: opts.classe });
    /* Rien dans le catalogue : un verre vide, jamais une lettre ni
       un point d'interrogation. La mise en page tient sans image. */
    return '<span class="phic vide' + (opts.classe ? ' ' + opts.classe : '') + '"></span>';
  }

  /* Plus rien à remplir après coup : tout est déjà dans la page. */
  async function peupler() {}

  function stats() {
    let n = 0, vides = 0;
    Object.keys(localStorage).forEach((k) => {
      if (k.indexOf(Store.NS + 's.' + CLE) !== 0) return;
      n++;
      try { if ((JSON.parse(localStorage.getItem(k)) || {}).vide) vides++; } catch (e) {}
    });
    return { total: n, trouvees: n - vides, actif: actif() };
  }

  function vider() {
    Object.keys(localStorage).forEach((k) => {
      if (k.indexOf(Store.NS + 's.' + CLE) === 0) localStorage.removeItem(k);
    });
    coupe = false;
  }

  global.Stock = { url, ic, peupler, stats, vider, requete, actif, genere, graine, MOTS };
})(window);
