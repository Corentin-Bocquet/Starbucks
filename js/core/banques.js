/* ============================================================
   EVER — Banques d'images spécialisées

   Une photothèque généraliste cherche « lasagnes » comme elle
   cherche « chaise » : par mots-clés, dans un fonds où rien n'est
   garanti. Il existe des bases faites POUR un domaine, où chaque
   entrée est une vraie recette ou un vrai cocktail, avec sa photo.
   Quand le sujet tombe dans un de ces domaines, elles gagnent à
   tous les coups.

   Trois bases, toutes libres, toutes sans clé (la clé publique de
   test « 1 » est celle que leurs auteurs publient eux-mêmes) :

     TheMealDB      plats et recettes du monde
     TheCocktailDB  cocktails, avec leur verre et leur recette
     Open Food Facts  produits emballés, déjà utilisé ailleurs

   Rien ici n'est bloquant : si une base ne répond pas, ne connaît
   pas le sujet, ou refuse la requête, la fonction renvoie null et
   l'application repart sur la photothèque puis sur la génération.
   Une base qui tombe ne casse donc jamais un écran.

   Ordre complet, une fois branché :
     1. cache local            gratuit, instantané
     2. base spécialisée (ici) gratuite, la BONNE photo
     3. Openverse              gratuite, une photo plausible
     4. génération libre       gratuite, une image dessinée
     5. Gemini                 payant, seulement pour le visage
   ============================================================ */
(function (global) {
  'use strict';

  const MEAL = 'https://www.themealdb.com/api/json/v1/1';
  const COCK = 'https://www.thecocktaildb.com/api/json/v1/1';
  const CLE = 'bq.';
  const TTL_VIDE = 14 * 24 * 3600 * 1000;

  /* Une base qui a refusé une fois refuse probablement encore :
     on la met de côté pour la session plutôt que de rejouer une
     requête qui échoue à chaque affichage. */
  const coupees = {};

  const sansAccent = (s) => String(s || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

  const clef = (base, sujet) => CLE + base + ':' +
    sansAccent(sujet).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);

  function enCache(c) {
    const v = Store.get(c, null);
    if (!v) return undefined;
    if (v.vide) return (Date.now() - (v.at || 0) > TTL_VIDE) ? undefined : null;
    return v.u || null;
  }

  /* ---------- Traduction minimale ----------
     Ces bases sont anglophones. On ne traduit pas tout : on couvre
     ce que l'application nomme vraiment, et le reste part tel quel
     (beaucoup de noms de plats et de cocktails sont identiques). */
  const PLATS = {
    'lasagnes': 'lasagna', 'lasagnes bolognaise': 'lasagna',
    'spaghetti bolognaise': 'spaghetti bolognese', 'pates carbonara': 'carbonara',
    'poulet roti': 'roast chicken', 'poulet curry riz': 'chicken curry',
    'burger classique': 'hamburger', 'cheeseburger': 'cheeseburger',
    'pizza margherita': 'margherita', 'pizza': 'pizza',
    'sushis assortis': 'sushi', 'makis saumon': 'sushi', 'california rolls': 'sushi',
    'pad thai': 'pad thai', 'ramen': 'ramen', 'couscous royal': 'couscous',
    'tajine de poulet': 'tagine', 'chili con carne': 'chilli con carne',
    'hachis parmentier': 'shepherds pie', 'gratin dauphinois': 'gratin',
    'quiche lorraine': 'quiche', 'boeuf bourguignon': 'beef bourguignon',
    'paella': 'paella', 'moussaka': 'moussaka', 'omelette': 'omelette',
    'salade cesar': 'caesar salad', 'soupe de legumes': 'vegetable soup',
    'risotto': 'risotto', 'riz cantonais': 'fried rice',
    'crepes': 'pancakes', 'tarte aux pommes': 'apple pie',
    'brownie': 'brownies', 'tiramisu': 'tiramisu', 'cheesecake': 'cheesecake',
    'frites': 'fries', 'nuggets de poulet': 'chicken nuggets',
    'falafels': 'falafel', 'kebab': 'kebab', 'wrap poulet': 'chicken wrap',
    'hot-dog': 'hot dog', 'croque-monsieur': 'croque monsieur',
    'poke bowl saumon': 'poke', 'bo bun': 'noodle salad'
  };

  const COCKTAILS = {
    'mojito': 'mojito', 'margarita': 'margarita', 'daiquiri': 'daiquiri',
    'negroni': 'negroni', 'spritz': 'spritz', 'aperol spritz': 'spritz',
    'moscow mule': 'moscow mule', 'pina colada': 'pina colada',
    'cosmopolitan': 'cosmopolitan', 'old fashioned': 'old fashioned',
    'manhattan': 'manhattan', 'martini': 'martini', 'dry martini': 'dry martini',
    'whisky sour': 'whiskey sour', 'gin tonic': 'gin tonic',
    'bloody mary': 'bloody mary', 'caipirinha': 'caipirinha',
    'sex on the beach': 'sex on the beach', 'tequila sunrise': 'tequila sunrise',
    'long island': 'long island tea', 'mai tai': 'mai tai',
    'espresso martini': 'espresso martini', 'french 75': 'french 75',
    'dark and stormy': 'dark and stormy', 'penicillin': 'penicillin',
    'paloma': 'paloma', 'americano': 'americano', 'boulevardier': 'boulevardier',
    'sidecar': 'sidecar', 'white russian': 'white russian',
    'bellini': 'bellini', 'kir royal': 'kir royal', 'sangria': 'sangria'
  };

  function traduire(table, sujet) {
    const b = sansAccent(sujet).replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
    if (!b) return '';
    if (table[b]) return table[b];
    /* Un plat compose : « pizza quatre fromages » retrouve « pizza ». */
    const k = Object.keys(table).find((x) => b.indexOf(x) === 0 || x.indexOf(b) === 0);
    return k ? table[k] : b;
  }

  async function demander(url) {
    const r = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return r.json();
  }

  /* ---------- Un plat ---------- */
  async function plat(sujet) {
    if (coupees.meal) return null;
    const c = clef('meal', sujet);
    const cache = enCache(c);
    if (cache !== undefined) return cache;
    const q = traduire(PLATS, sujet);
    if (!q) return null;
    try {
      const j = await demander(MEAL + '/search.php?s=' + encodeURIComponent(q));
      const m = (j && j.meals && j.meals[0]) || null;
      const u = m && m.strMealThumb ? m.strMealThumb : null;
      Store.set(c, u ? { u: u, at: Date.now() } : { vide: 1, at: Date.now() });
      return u;
    } catch (e) { coupees.meal = true; return null; }
  }

  /* ---------- Un cocktail ---------- */
  async function cocktail(sujet) {
    if (coupees.cock) return null;
    const c = clef('cock', sujet);
    const cache = enCache(c);
    if (cache !== undefined) return cache;
    const q = traduire(COCKTAILS, sujet);
    if (!q) return null;
    try {
      const j = await demander(COCK + '/search.php?s=' + encodeURIComponent(q));
      const d = (j && j.drinks && j.drinks[0]) || null;
      const u = d && d.strDrinkThumb ? d.strDrinkThumb : null;
      Store.set(c, u ? { u: u, at: Date.now() } : { vide: 1, at: Date.now() });
      return u;
    } catch (e) { coupees.cock = true; return null; }
  }

  /* ---------- Un ingrédient ----------
     TheMealDB sert ses vignettes d'ingrédients par NOM, sans
     recherche : l'adresse se construit directement, donc aucune
     requête à faire. On vérifie juste que l'image existe. */
  async function ingredient(sujet) {
    if (coupees.ing) return null;
    const c = clef('ing', sujet);
    const cache = enCache(c);
    if (cache !== undefined) return cache;
    const q = traduire(PLATS, sujet);
    if (!q) return null;
    const u = 'https://www.themealdb.com/images/ingredients/' +
      encodeURIComponent(q.replace(/ /g, '_')) + '.png';
    try {
      const r = await fetch(u, { method: 'HEAD' });
      const ok = r.ok ? u : null;
      Store.set(c, ok ? { u: ok, at: Date.now() } : { vide: 1, at: Date.now() });
      return ok;
    } catch (e) { coupees.ing = true; return null; }
  }

  /* Le point d'entrée unique : rend une URL, ou null si le sujet
     ne relève d'aucune base spécialisée. */
  async function chercher(type, sujet) {
    if (!sujet) return null;
    if (type === 'plat') return plat(sujet);
    if (type === 'boisson') return cocktail(sujet);
    if (type === 'ingredient') return ingredient(sujet);
    return null;
  }

  function vider() {
    Object.keys(localStorage).forEach((k) => {
      if (k.indexOf(Store.NS + 's.' + CLE) === 0) localStorage.removeItem(k);
    });
    coupees.meal = coupees.cock = coupees.ing = false;
  }

  global.Banques = { chercher, plat, cocktail, ingredient, vider, PLATS, COCKTAILS };
})(window);
