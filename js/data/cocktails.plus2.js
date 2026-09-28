/* EVER : cocktails, deuxième vague.

   Chargé après cocktails.plus.js. But : qu'au bout des deux choix de
   l'assistant (alcool, puis envie) il reste au moins cinq vraies
   recettes. Deux leviers :
   - des classiques réels qui manquaient (IBA ou recettes de référence
     des bars qui les ont créés) ;
   - un second profil de goût quand un cocktail en a vraiment deux
     (un Manhattan est corsé ET chic) : humeur devient une liste.
   Le contrôle est dans tools/verif-bar.js. */
(function () {
  'use strict';

  BAR.push(
    { k: 'lillet', n: 'Lillet blanc', fam: 'Vermouths & amers' },
    { k: 'amaro', n: 'Amaro (Nonino, Montenegro)', fam: 'Vermouths & amers' },
    { k: 'absinthe', n: 'Absinthe', fam: 'Liqueurs' },
    { k: 'liqueur-cerise', n: 'Liqueur de cerise (Cherry Heering)', fam: 'Liqueurs' },
    { k: 'creme-cacao', n: 'Crème de cacao', fam: 'Liqueurs' },
    { k: 'creme-menthe', n: 'Crème de menthe blanche', fam: 'Liqueurs' },
    { k: 'lait', n: 'Lait entier', fam: 'Frais & divers' },
    { k: 'lait-concentre', n: 'Lait concentré sucré', fam: 'Frais & divers' },
    { k: 'oeuf', n: 'Œuf entier', fam: 'Frais & divers' },
    { k: 'fraise', n: 'Fraises', fam: 'Fruits & jus' },
    { k: 'basilic', n: 'Basilic frais', fam: 'Frais & divers' },
    { k: 'piment', n: 'Piment rouge frais', fam: 'Frais & divers' },
    { k: 'coriandre', n: 'Coriandre fraîche', fam: 'Frais & divers' },
    { k: 'fleur-oranger', n: "Eau de fleur d'oranger", fam: 'Frais & divers' },
    { k: 'mangue', n: 'Mangue (purée ou fruit)', fam: 'Fruits & jus' },
    { k: 'mezcal', n: 'Mezcal', fam: 'Alcools' }
  );

  /* Second profil de goût pour les recettes qui en ont vraiment deux. */
  const DEUX = {
    'daiquiri': ['frais', 'chic'], 'margarita': ['frais', 'chic'], 'manhattan': ['corse', 'chic'],
    'new-york-sour': ['corse', 'chic'], 'martini-dry': ['chic', 'corse'], 'godfather': ['corse', 'gourmand'],
    'espresso-martini': ['chic', 'gourmand'], 'blue-hawaiian': ['tropical', 'gourmand'],
    'old-fashioned': ['corse', 'chic'], 'sidecar': ['chic', 'corse'], 'americano': ['corse', 'frais'],
    'amaretto-sour': ['gourmand', 'frais'], 'pina-colada': ['gourmand', 'tropical'], 'painkiller': ['gourmand', 'tropical'],
    'clover-club': ['chic', 'gourmand'], 'white-lady': ['chic', 'gourmand'], 'last-word': ['corse', 'chic'],
    'mai-tai': ['tropical', 'corse'], 'bellini': ['chic', 'tropical']
  };
  COCKTAILS.forEach((c) => { if (DEUX[c.id]) c.humeur = DEUX[c.id]; });

  const I = (k, n, q, opt) => (opt ? { k: k, n: n, q: q, opt: true } : { k: k, n: n, q: q });
  const O = (n, q) => ({ k: null, n: n, q: q, opt: true });
  const C = (o) => COCKTAILS.push(o);

  /* ================= Rhum ================= */
  C({ id: 'jungle-bird', nom: 'Jungle Bird', cat: 'fruite', ico: '🦜', vis: 'cocktail-exotique',
    desc: "Né au Hilton de Kuala Lumpur en 1978 : l'ananas du tiki et l'amertume du Campari dans le même verre.",
    verre: 'Old fashioned', tech: 'Shaker', abv: '≈ 16 %', temps: '3 min', tag: ['Tiki', 'Amer'],
    ing: [I('rhum-ambre', 'Rhum ambré', '4,5 cl'), I('campari', 'Campari', '2 cl'), I('jus-ananas', "Jus d'ananas", '4,5 cl'), I('citron-vert', 'Jus de citron vert', '1,5 cl'), I('sirop-sucre', 'Sirop de sucre', '1,5 cl'), O("Feuille d'ananas", '1')],
    steps: ['Tout verser dans le shaker avec des glaçons.', 'Secouer fort 10 secondes.', 'Filtrer sur un gros glaçon dans un old fashioned.'],
    astuce: "Un rhum ambré bien typé (jamaïcain) : le Campari écrase un rhum trop léger.",
    alcool: 'rhum', humeur: ['tropical', 'corse'] });

  C({ id: 'el-presidente', nom: 'El Presidente', cat: 'classique', ico: '🎩', vis: 'cocktails',
    desc: 'Le cocktail chic de La Havane des années 1920 : rhum, vermouth et une touche de grenadine, remué.',
    verre: 'Coupe', tech: 'Remué (stir)', abv: '≈ 25 %', temps: '3 min', tag: ['Élégant', 'Cuba'],
    ing: [I('rhum-blanc', 'Rhum blanc', '4,5 cl'), I('vermouth-sec', 'Vermouth sec (blanc)', '2 cl'), I('triple-sec', 'Triple sec', '1 cl'), I('grenadine', 'Grenadine', '1 cuillère de bar'), O("Zeste d'orange", '1')],
    steps: ['Verser tous les ingrédients dans un verre à mélange rempli de glaçons.', 'Remuer 20 secondes.', 'Filtrer dans une coupe glacée, exprimer le zeste au-dessus.'],
    astuce: 'Une vraie grenadine à la grenade, pas un sirop à la fraise : la couleur et le goût changent tout.',
    alcool: 'rhum', humeur: ['chic', 'corse'] });

  C({ id: 'mary-pickford', nom: 'Mary Pickford', cat: 'classique', ico: '🎞️', vis: 'jus-rouge',
    desc: "Baptisé en l'honneur de l'actrice lors d'un tournage à Cuba : rhum, ananas et marasquin, rose et soyeux.",
    verre: 'Coupe', tech: 'Shaker', abv: '≈ 15 %', temps: '3 min', tag: ['IBA', 'Fruité'],
    ing: [I('rhum-blanc', 'Rhum blanc', '6 cl'), I('jus-ananas', "Jus d'ananas", '6 cl'), I('maraschino', 'Marasquin', '1 cl'), I('grenadine', 'Grenadine', '1 cl')],
    steps: ['Tout secouer fort avec des glaçons.', 'Filtrer finement dans une coupe glacée.'],
    astuce: "Secouer longtemps : l'ananas mousse et donne une jolie couche blanche.",
    alcool: 'rhum', humeur: ['chic', 'tropical'] });

  C({ id: 'hemingway-daiquiri', nom: 'Hemingway Daiquiri', cat: 'classique', ico: '✍️', vis: 'citronnade',
    desc: 'Le daiquiri sans sucre de l\'écrivain au Floridita : pamplemousse et marasquin, très sec.',
    verre: 'Coupe', tech: 'Shaker', abv: '≈ 20 %', temps: '3 min', tag: ['IBA', 'Sec'],
    ing: [I('rhum-blanc', 'Rhum blanc', '6 cl'), I('citron-vert', 'Jus de citron vert', '2 cl'), I('jus-pamplemousse', 'Jus de pamplemousse', '1,5 cl'), I('maraschino', 'Marasquin', '1,5 cl')],
    steps: ['Tout secouer avec des glaçons.', 'Filtrer dans une coupe glacée.'],
    astuce: "Trop sec pour toi ? Ajoute 0,5 cl de sirop de sucre, c'est la version des bars d'aujourd'hui.",
    alcool: 'rhum', humeur: ['frais', 'chic'] });

  C({ id: 'rum-old-fashioned', nom: 'Rum Old Fashioned', cat: 'classique', ico: '🥃', vis: 'rhum-arrange',
    desc: "L'old fashioned avec un rhum vieux à la place du bourbon : plus rond, notes de vanille et de fruits secs.",
    verre: 'Old fashioned', tech: 'Remué (stir)', abv: '≈ 32 %', temps: '3 min', tag: ['Sec', 'Dégustation'],
    ing: [I('rhum-ambre', 'Rhum vieux ou ambré', '6 cl'), I('sirop-sucre', 'Sirop de sucre', '0,5 cl'), I('angostura', 'Angostura', '2 traits'), O("Zeste d'orange", '1')],
    steps: ['Verser le sirop, l\'angostura et le rhum sur un gros glaçon.', 'Remuer 30 secondes.', 'Exprimer le zeste d\'orange au-dessus et le déposer.'],
    astuce: 'Un seul gros glaçon : il fond lentement et ne noie pas le rhum.',
    alcool: 'rhum', humeur: ['corse', 'chic'] });

  C({ id: 'bushwacker', nom: 'Bushwacker', cat: 'digestif', ico: '🍫', vis: 'liqueur-creme',
    desc: 'Le milkshake adulte des Îles Vierges : rhum, café, cacao et coco, mixés avec de la glace.',
    verre: 'Hurricane', tech: 'Mixé (blender)', abv: '≈ 10 %', temps: '4 min', tag: ['Dessert', 'Glacé'],
    ing: [I('rhum-ambre', 'Rhum ambré', '3 cl'), I('liqueur-cafe', 'Liqueur de café', '3 cl'), I('creme-cacao', 'Crème de cacao', '3 cl'), I('creme-coco', 'Crème de coco', '6 cl'), I('lait', 'Lait entier', '6 cl'), O('Muscade râpée', '1 pincée')],
    steps: ['Mettre tous les ingrédients dans un blender avec une tasse de glace.', 'Mixer jusqu\'à une texture de milkshake.', 'Verser et râper un peu de muscade dessus.'],
    astuce: 'Pas assez épais ? Plus de glace, pas plus de lait.',
    alcool: 'rhum', humeur: ['gourmand', 'tropical'] });

  C({ id: 'strawberry-daiquiri', nom: 'Daiquiri fraise', cat: 'fruite', ico: '🍓', vis: 'jus-rouge',
    desc: "Le daiquiri glacé à la fraise : rhum, fraises fraîches et citron vert, mixés en granité.",
    verre: 'Coupe ou verre à pied', tech: 'Mixé (blender)', abv: '≈ 10 %', temps: '4 min', tag: ['Glacé', 'Été'],
    ing: [I('rhum-blanc', 'Rhum blanc', '5 cl'), I('fraise', 'Fraises', '6'), I('citron-vert', 'Jus de citron vert', '2,5 cl'), I('sirop-sucre', 'Sirop de sucre', '1,5 cl')],
    steps: ['Équeuter les fraises.', 'Mixer avec le reste et une tasse de glace pilée.', 'Servir aussitôt, une fraise sur le bord.'],
    astuce: 'Des fraises surgelées remplacent la glace : plus de goût, moins d\'eau.',
    alcool: 'rhum', humeur: ['tropical', 'frais'] });

  C({ id: 'coquito', nom: 'Coquito', cat: 'digestif', ico: '🥥', vis: 'liqueur-creme',
    desc: "Le « petit coco » de Porto Rico, servi à Noël : rhum, coco, lait concentré et cannelle.",
    verre: 'Petit verre', tech: 'Mixé puis frais', abv: '≈ 12 %', temps: '5 min', tag: ['Noël', 'Dessert'],
    ing: [I('rhum-blanc', 'Rhum blanc', '4 cl'), I('creme-coco', 'Crème de coco', '6 cl'), I('lait-concentre', 'Lait concentré sucré', '3 cl'), I('lait', 'Lait entier', '6 cl'), O('Cannelle', '1 pincée')],
    steps: ['Mixer tous les ingrédients 30 secondes.', 'Laisser au moins 1 heure au frais.', 'Secouer avant de servir, cannelle dessus.'],
    astuce: "Ça se prépare en bouteille la veille : c'est meilleur le lendemain.",
    alcool: 'rhum', humeur: ['gourmand'] });

  /* ================= Whisky ================= */
  C({ id: 'rob-roy', nom: 'Rob Roy', cat: 'classique', ico: '🏴', vis: 'whisky-miel',
    desc: 'Le Manhattan écossais : scotch, vermouth rouge et angostura. Créé à New York en 1894.',
    verre: 'Coupe', tech: 'Remué (stir)', abv: '≈ 28 %', temps: '3 min', tag: ['IBA', 'Sec'],
    ing: [I('whisky', 'Scotch whisky', '5 cl'), I('vermouth-rouge', 'Vermouth rouge', '2,5 cl'), I('angostura', 'Angostura', '1 trait'), O('Cerise au marasquin', '1')],
    steps: ['Remuer tous les ingrédients avec des glaçons 25 secondes.', 'Filtrer dans une coupe glacée, une cerise au fond.'],
    astuce: 'Un blend doux plutôt qu\'un single malt tourbé : la tourbe prend toute la place.',
    alcool: 'whisky', humeur: ['chic', 'corse'] });

  C({ id: 'sazerac', nom: 'Sazerac', cat: 'classique', ico: '🎷', vis: 'whisky-miel',
    desc: "La Nouvelle-Orléans en un verre : rye, sucre et bitters dans un verre rincé à l'absinthe.",
    verre: 'Old fashioned (sans glace)', tech: 'Remué (stir)', abv: '≈ 35 %', temps: '4 min', tag: ['IBA', 'Puissant'],
    ing: [I('rye', 'Rye whisky', '5 cl'), I('sirop-sucre', 'Sirop de sucre', '0,75 cl'), I('angostura', "Bitters (Peychaud's idéalement)", '3 traits'), I('absinthe', 'Absinthe', '1 trait pour rincer'), O('Zeste de citron', '1')],
    steps: ["Rincer un verre froid avec l'absinthe et jeter l'excédent.", 'Remuer le rye, le sirop et les bitters avec des glaçons.', 'Filtrer dans le verre rincé, sans glace.', 'Exprimer le zeste de citron au-dessus, sans le laisser dans le verre.'],
    astuce: "L'absinthe ne se boit pas : elle parfume juste les parois.",
    alcool: 'whisky', humeur: ['corse', 'chic'] });

  C({ id: 'paper-plane', nom: 'Paper Plane', cat: 'classique', ico: '✈️', vis: 'citronnade',
    desc: 'Quatre ingrédients à parts égales, créé à Chicago en 2008 : bourbon, Aperol, amaro et citron.',
    verre: 'Coupe', tech: 'Shaker', abv: '≈ 18 %', temps: '3 min', tag: ['Moderne', 'Équilibré'],
    ing: [I('bourbon', 'Bourbon', '2,25 cl'), I('aperol', 'Aperol', '2,25 cl'), I('amaro', 'Amaro Nonino', '2,25 cl'), I('citron-jaune', 'Jus de citron jaune', '2,25 cl')],
    steps: ['Tout secouer avec des glaçons.', 'Filtrer dans une coupe glacée.'],
    astuce: 'Les parts égales, c\'est la règle : impossible de le rater.',
    alcool: 'whisky', humeur: ['frais', 'chic'] });

  C({ id: 'gold-rush', nom: 'Gold Rush', cat: 'classique', ico: '🍯', vis: 'whisky-miel',
    desc: 'Le whiskey sour au miel du Milk & Honey de New York : trois ingrédients, aucun défaut.',
    verre: 'Old fashioned', tech: 'Shaker', abv: '≈ 20 %', temps: '3 min', tag: ['Moderne', 'Facile'],
    ing: [I('bourbon', 'Bourbon', '6 cl'), I('sirop-miel', 'Sirop de miel', '2,25 cl'), I('citron-jaune', 'Jus de citron jaune', '2,25 cl')],
    steps: ['Tout secouer avec des glaçons.', 'Filtrer sur un gros glaçon.'],
    astuce: 'Sirop de miel : 2 volumes de miel pour 1 d\'eau chaude, sinon il fige au contact de la glace.',
    alcool: 'whisky', humeur: ['frais'] });

  C({ id: 'brown-derby', nom: 'Brown Derby', cat: 'fruite', ico: '🎩', vis: 'citronnade',
    desc: 'Hollywood, années 1930 : bourbon, pamplemousse et miel. Fruité, rafraîchissant, pas sucré.',
    verre: 'Coupe', tech: 'Shaker', abv: '≈ 18 %', temps: '3 min', tag: ['Agrumes', 'Facile'],
    ing: [I('bourbon', 'Bourbon', '4,5 cl'), I('jus-pamplemousse', 'Jus de pamplemousse', '3 cl'), I('sirop-miel', 'Sirop de miel', '1,5 cl')],
    steps: ['Tout secouer avec des glaçons.', 'Filtrer dans une coupe glacée.'],
    astuce: 'Pamplemousse rose pressé minute : le jus en brique le rend plat.',
    alcool: 'whisky', humeur: ['frais', 'tropical'] });

  C({ id: 'port-light', nom: 'Port Light', cat: 'fruite', ico: '🏝️', vis: 'cocktail-exotique',
    desc: 'Un des rares tikis au bourbon, signé Trader Vic : fruit de la passion, citron et grenadine.',
    verre: 'Hurricane', tech: 'Shaker', abv: '≈ 14 %', temps: '3 min', tag: ['Tiki', 'Fruité'],
    ing: [I('bourbon', 'Bourbon', '4,5 cl'), I('fruit-passion', 'Jus de fruit de la passion', '3 cl'), I('citron-jaune', 'Jus de citron jaune', '1,5 cl'), I('sirop-sucre', 'Sirop de sucre', '1,5 cl'), I('grenadine', 'Grenadine', '0,5 cl'), I('blanc-oeuf', "Blanc d'œuf", '1', true)],
    steps: ['Secouer d\'abord sans glace si tu mets le blanc d\'œuf.', 'Ajouter la glace et secouer encore.', 'Verser sur glace pilée.'],
    astuce: "Le bourbon tient tête à la passion là où un rhum léger disparaîtrait.",
    alcool: 'whisky', humeur: ['tropical'] });

  C({ id: 'blood-and-sand', nom: 'Blood and Sand', cat: 'classique', ico: '🐂', vis: 'jus-rouge',
    desc: 'Nommé d\'après un film de corrida de 1922 : scotch, vermouth, cerise et orange à parts égales.',
    verre: 'Coupe', tech: 'Shaker', abv: '≈ 18 %', temps: '3 min', tag: ['IBA', 'Fruité'],
    ing: [I('whisky', 'Scotch whisky', '2,25 cl'), I('vermouth-rouge', 'Vermouth rouge', '2,25 cl'), I('liqueur-cerise', 'Liqueur de cerise', '2,25 cl'), I('jus-orange', "Jus d'orange frais", '2,25 cl')],
    steps: ['Tout secouer avec des glaçons.', 'Filtrer dans une coupe glacée.'],
    astuce: "Orange pressée à la minute, sinon le cocktail tourne à l'orangeade.",
    alcool: 'whisky', humeur: ['chic', 'tropical'] });

  C({ id: 'bourbon-milk-punch', nom: 'Bourbon Milk Punch', cat: 'digestif', ico: '🥛', vis: 'liqueur-creme',
    desc: 'Le brunch de La Nouvelle-Orléans : bourbon, lait froid, vanille et muscade.',
    verre: 'Highball', tech: 'Shaker', abv: '≈ 12 %', temps: '3 min', tag: ['Brunch', 'Doux'],
    ing: [I('bourbon', 'Bourbon', '5 cl'), I('lait', 'Lait entier', '9 cl'), I('sirop-sucre', 'Sirop de sucre', '1,5 cl'), I('sirop-vanille', 'Sirop de vanille', '0,5 cl'), O('Muscade râpée', '1 pincée')],
    steps: ['Tout secouer fort avec des glaçons.', 'Verser sur glace, muscade dessus.'],
    astuce: 'Secouer longtemps : le lait mousse et le cocktail devient aérien.',
    alcool: 'whisky', humeur: ['gourmand'] });

  C({ id: 'eggnog', nom: 'Eggnog', cat: 'digestif', ico: '🎄', vis: 'liqueur-creme',
    desc: 'Le lait de poule des fêtes : œuf, lait, crème, bourbon et muscade.',
    verre: 'Tasse ou petit verre', tech: 'Shaker', abv: '≈ 10 %', temps: '4 min', tag: ['Noël', 'Dessert'],
    ing: [I('bourbon', 'Bourbon', '4 cl'), I('oeuf', 'Œuf entier', '1'), I('lait', 'Lait entier', '6 cl'), I('creme-liquide', 'Crème liquide', '3 cl'), I('sirop-sucre', 'Sirop de sucre', '1,5 cl'), O('Muscade râpée', '1 pincée')],
    steps: ['Secouer tout sans glace 15 secondes.', 'Ajouter de la glace et secouer encore.', 'Filtrer et râper la muscade.'],
    astuce: 'Moitié bourbon, moitié rhum ambré : la version préférée des barmans.',
    alcool: 'whisky', humeur: ['gourmand'] });

  C({ id: 'whisky-highball', nom: 'Whisky Highball', cat: 'classique', ico: '🫧', vis: 'citronnade',
    desc: 'La boisson des bars de Tokyo : whisky, eau très gazeuse, beaucoup de glace. Rien de plus.',
    verre: 'Highball', tech: 'Construit (build)', abv: '≈ 10 %', temps: '2 min', tag: ['Léger', 'Deux ingrédients'],
    ing: [I('whisky', 'Whisky', '5 cl'), I('eau-gazeuse', 'Eau gazeuse très froide', '15 cl'), O('Zeste de citron', '1')],
    steps: ['Remplir un highball de glaçons.', 'Verser le whisky et remuer pour refroidir.', 'Compléter d\'eau gazeuse en la versant le long d\'une cuillère.', 'Un seul tour de cuillère, zeste au-dessus.'],
    astuce: 'Tout doit être glacé, verre compris : les bulles tiennent deux fois plus.',
    alcool: 'whisky', humeur: ['frais'] });

  /* ================= Vodka ================= */
  C({ id: 'vodka-martini', nom: 'Vodka Martini', cat: 'classique', ico: '🍸', vis: 'cocktails',
    desc: 'Le martini version vodka, très sec et glacé, avec un zeste ou une olive.',
    verre: 'Verre à martini', tech: 'Remué (stir)', abv: '≈ 32 %', temps: '3 min', tag: ['Sec', 'Élégant'],
    ing: [I('vodka', 'Vodka', '6 cl'), I('vermouth-sec', 'Vermouth sec', '1 cl'), O('Zeste de citron ou olive', '1')],
    steps: ['Remuer la vodka et le vermouth avec beaucoup de glace 30 secondes.', 'Filtrer dans un verre glacé, zeste ou olive.'],
    astuce: 'Remuer, pas secouer : secoué, il devient trouble et plus dilué.',
    alcool: 'vodka', humeur: ['chic', 'corse'] });

  C({ id: 'sea-breeze', nom: 'Sea Breeze', cat: 'fruite', ico: '🌊', vis: 'jus-rouge',
    desc: 'Vodka, canneberge et pamplemousse : acidulé, rose, très facile à boire.',
    verre: 'Highball', tech: 'Construit (build)', abv: '≈ 8 %', temps: '2 min', tag: ['Facile', 'Long drink'],
    ing: [I('vodka', 'Vodka', '4 cl'), I('jus-canneberge', 'Jus de canneberge', '12 cl'), I('jus-pamplemousse', 'Jus de pamplemousse', '3 cl'), O('Quartier de citron vert', '1')],
    steps: ['Remplir un highball de glaçons.', 'Verser la vodka puis la canneberge.', 'Finir par le pamplemousse et remuer.'],
    astuce: 'Versé en dernier, le pamplemousse fait un joli dégradé.',
    alcool: 'vodka', humeur: ['frais', 'tropical'] });

  C({ id: 'bay-breeze', nom: 'Bay Breeze', cat: 'fruite', ico: '🏖️', vis: 'cocktail-exotique',
    desc: "Le Sea Breeze côté plage : l'ananas remplace le pamplemousse, plus doux et tropical.",
    verre: 'Highball', tech: 'Construit (build)', abv: '≈ 8 %', temps: '2 min', tag: ['Facile', 'Long drink'],
    ing: [I('vodka', 'Vodka', '4 cl'), I('jus-canneberge', 'Jus de canneberge', '9 cl'), I('jus-ananas', "Jus d'ananas", '6 cl')],
    steps: ['Remplir un highball de glaçons.', 'Verser la vodka, la canneberge puis l\'ananas.', 'Remuer doucement.'],
    astuce: "Un jus d'ananas pressé fait une mousse blanche sur le dessus.",
    alcool: 'vodka', humeur: ['tropical'] });

  C({ id: 'screwdriver', nom: 'Screwdriver', cat: 'fruite', ico: '🍊', vis: 'citronnade',
    desc: 'Le plus simple des long drinks : vodka et jus d\'orange frais sur glace.',
    verre: 'Highball', tech: 'Construit (build)', abv: '≈ 10 %', temps: '1 min', tag: ['IBA', 'Deux ingrédients'],
    ing: [I('vodka', 'Vodka', '5 cl'), I('jus-orange', "Jus d'orange frais", '10 cl'), O("Tranche d'orange", '1')],
    steps: ['Remplir un highball de glaçons.', 'Verser la vodka puis le jus d\'orange.', 'Remuer et poser la tranche d\'orange.'],
    astuce: "Tout se joue sur le jus : pressé minute, c'est un autre cocktail.",
    alcool: 'vodka', humeur: ['frais', 'tropical'] });

  C({ id: 'kamikaze', nom: 'Kamikaze', cat: 'classique', ico: '⚡', vis: 'citronnade',
    desc: 'Vodka, triple sec et citron vert à parts égales : sec, vif et acidulé.',
    verre: 'Coupe', tech: 'Shaker', abv: '≈ 22 %', temps: '2 min', tag: ['IBA', 'Parts égales'],
    ing: [I('vodka', 'Vodka', '3 cl'), I('triple-sec', 'Triple sec', '3 cl'), I('citron-vert', 'Jus de citron vert', '3 cl')],
    steps: ['Tout secouer avec des glaçons.', 'Filtrer dans une coupe glacée.'],
    astuce: 'Servi en shots, c\'est la même recette en plus petit.',
    alcool: 'vodka', humeur: ['frais', 'corse'] });

  C({ id: 'caipiroska', nom: 'Caipiroska', cat: 'fruite', ico: '🍋‍🟩', vis: 'caipirinha',
    desc: 'La caipirinha à la vodka : citron vert pilé, sucre, glace pilée.',
    verre: 'Old fashioned', tech: 'Pilé', abv: '≈ 18 %', temps: '3 min', tag: ['Facile', 'Frais'],
    ing: [I('vodka', 'Vodka', '5 cl'), I('citron-vert', 'Citron vert', '½'), I('sucre', 'Sucre en poudre', '2 cuillères à café')],
    steps: ['Couper le demi-citron vert en quartiers dans le verre.', 'Ajouter le sucre et piler pour extraire le jus.', 'Remplir de glace pilée, verser la vodka et remuer.'],
    astuce: 'Piler le citron avec le sucre : les grains râpent la peau et libèrent les huiles.',
    alcool: 'vodka', humeur: ['frais'] });

  C({ id: 'woo-woo', nom: 'Woo Woo', cat: 'fruite', ico: '🍑', vis: 'sex-on-the-beach',
    desc: 'Vodka, liqueur de pêche et canneberge : fruité et doux, le cousin du Sex on the Beach.',
    verre: 'Highball', tech: 'Construit (build)', abv: '≈ 10 %', temps: '2 min', tag: ['Facile', 'Fruité'],
    ing: [I('vodka', 'Vodka', '4 cl'), I('liqueur-peche', 'Liqueur de pêche', '2 cl'), I('jus-canneberge', 'Jus de canneberge', '8 cl'), O('Quartier de citron vert', '1')],
    steps: ['Remplir un highball de glaçons.', 'Verser tout et remuer.'],
    astuce: 'Un filet de citron vert enlève le côté trop sucré.',
    alcool: 'vodka', humeur: ['tropical'] });

  C({ id: 'chocolate-martini', nom: 'Chocolate Martini', cat: 'digestif', ico: '🍫', vis: 'liqueur-creme',
    desc: 'Le dessert en verre à martini : vodka, cacao et crème, bord de cacao en poudre.',
    verre: 'Verre à martini', tech: 'Shaker', abv: '≈ 20 %', temps: '3 min', tag: ['Dessert', 'Élégant'],
    ing: [I('vodka', 'Vodka', '4 cl'), I('creme-cacao', 'Crème de cacao', '3 cl'), I('liqueur-creme', 'Liqueur de crème', '3 cl'), O('Cacao en poudre pour le bord', '1 cuillère')],
    steps: ['Givrer le bord du verre avec le cacao.', 'Secouer les liquides avec des glaçons.', 'Filtrer dans le verre.'],
    astuce: 'Un peu de sauce chocolat sur les parois avant de verser : effet garanti.',
    alcool: 'vodka', humeur: ['gourmand', 'chic'] });

  C({ id: 'godmother', nom: 'Godmother', cat: 'digestif', ico: '👑', vis: 'whisky-miel',
    desc: 'La version vodka du Godfather : vodka et amaretto sur glace, doux et puissant.',
    verre: 'Old fashioned', tech: 'Construit (build)', abv: '≈ 30 %', temps: '1 min', tag: ['Deux ingrédients', 'Digestif'],
    ing: [I('vodka', 'Vodka', '4,5 cl'), I('amaretto', 'Amaretto', '2,5 cl')],
    steps: ['Verser les deux sur de gros glaçons.', 'Remuer 10 secondes.'],
    astuce: 'Plus d\'amaretto si tu le veux plus doux, jamais plus que la vodka.',
    alcool: 'vodka', humeur: ['corse', 'gourmand'] });

  /* ================= Tequila ================= */
  C({ id: 'rosita', nom: 'Rosita', cat: 'classique', ico: '🌹', vis: 'jus-rouge',
    desc: 'Le negroni mexicain : tequila, Campari et deux vermouths, remué.',
    verre: 'Old fashioned', tech: 'Remué (stir)', abv: '≈ 25 %', temps: '3 min', tag: ['Amer', 'Élégant'],
    ing: [I('tequila', 'Tequila reposado', '4,5 cl'), I('campari', 'Campari', '1,5 cl'), I('vermouth-rouge', 'Vermouth rouge', '1,5 cl'), I('vermouth-sec', 'Vermouth sec', '1,5 cl'), I('angostura', 'Angostura', '1 trait')],
    steps: ['Remuer tout avec des glaçons 25 secondes.', 'Filtrer sur un gros glaçon, zeste de citron.'],
    astuce: 'Reposado plutôt que blanca : ses notes boisées répondent au vermouth.',
    alcool: 'tequila', humeur: ['corse', 'chic'] });

  C({ id: 'brave-bull', nom: 'Brave Bull', cat: 'digestif', ico: '🐃', vis: 'whisky-miel',
    desc: 'Le Black Russian mexicain : tequila et liqueur de café sur glace.',
    verre: 'Old fashioned', tech: 'Construit (build)', abv: '≈ 28 %', temps: '1 min', tag: ['Deux ingrédients', 'Café'],
    ing: [I('tequila', 'Tequila', '4,5 cl'), I('liqueur-cafe', 'Liqueur de café', '3 cl')],
    steps: ['Verser sur des glaçons.', 'Remuer.'],
    astuce: 'Un trait de crème par-dessus et tu as un « Toro blanco » (Brave Bull blanc).',
    alcool: 'tequila', humeur: ['corse', 'gourmand'] });

  C({ id: 'mexican-coffee', nom: 'Mexican coffee', cat: 'digestif', ico: '☕', vis: 'cold-brew',
    desc: "L'Irish coffee du Mexique : café chaud, tequila, liqueur de café et crème fouettée.",
    verre: 'Verre à pied chaud', tech: 'Construit (build)', abv: '≈ 10 %', temps: '4 min', tag: ['Chaud', 'Café'],
    ing: [I('tequila', 'Tequila', '3 cl'), I('liqueur-cafe', 'Liqueur de café', '1,5 cl'), I('espresso', 'Café chaud', '12 cl'), I('creme-liquide', 'Crème fouettée', '3 cl'), O('Cannelle', '1 pincée')],
    steps: ['Verser la tequila et la liqueur de café dans le verre chaud.', 'Compléter de café.', 'Déposer la crème à peine fouettée, un peu de cannelle.'],
    astuce: 'La liqueur de café sucre déjà : pas besoin de sucre en plus.',
    alcool: 'tequila', humeur: ['gourmand'] });

  C({ id: 'batanga', nom: 'Batanga', cat: 'fruite', ico: '🌵', vis: 'citronnade',
    desc: 'Le cuba libre à la tequila, né à Tequila même : cola, citron vert, bord salé.',
    verre: 'Highball', tech: 'Construit (build)', abv: '≈ 10 %', temps: '2 min', tag: ['Facile', 'Mexique'],
    ing: [I('tequila', 'Tequila', '5 cl'), I('citron-vert', 'Jus de citron vert', '1,5 cl'), I('cola', 'Cola', '12 cl'), O('Sel pour le bord', '1 pincée')],
    steps: ['Saler le bord du verre.', 'Glaçons, tequila, citron vert.', 'Compléter de cola et remuer avec le couteau, comme au Mexique.'],
    astuce: 'Un cola au sucre de canne (mexicain) fait toute la différence.',
    alcool: 'tequila', humeur: ['frais'] });

  C({ id: 'cantarito', nom: 'Cantarito', cat: 'fruite', ico: '🏺', vis: 'cocktail-exotique',
    desc: 'Servi dans un pot en terre à Jalisco : tequila, trois agrumes et soda pamplemousse.',
    verre: 'Pot en terre ou highball', tech: 'Construit (build)', abv: '≈ 10 %', temps: '3 min', tag: ['Agrumes', 'Mexique'],
    ing: [I('tequila', 'Tequila', '5 cl'), I('jus-orange', "Jus d'orange", '3 cl'), I('jus-pamplemousse', 'Jus de pamplemousse', '3 cl'), I('citron-vert', 'Jus de citron vert', '1,5 cl'), I('soda-pamplemousse', 'Soda au pamplemousse', '8 cl'), O('Sel', '1 pincée')],
    steps: ['Glaçons, tequila et les trois jus.', 'Une pincée de sel.', 'Compléter de soda et remuer.'],
    astuce: 'La pincée de sel réveille les agrumes, on ne la sent pas.',
    alcool: 'tequila', humeur: ['tropical', 'frais'] });

  C({ id: 'matador', nom: 'Matador', cat: 'fruite', ico: '🍍', vis: 'cocktail-exotique',
    desc: "Tequila, ananas et citron vert, secoués : la margarita version tropicale.",
    verre: 'Coupe ou old fashioned', tech: 'Shaker', abv: '≈ 14 %', temps: '2 min', tag: ['Tropical', 'Facile'],
    ing: [I('tequila', 'Tequila', '4,5 cl'), I('jus-ananas', "Jus d'ananas", '9 cl'), I('citron-vert', 'Jus de citron vert', '1,5 cl')],
    steps: ['Tout secouer avec des glaçons.', 'Servir sur glace.'],
    astuce: "L'ananas mousse au shaker : secoue fort pour la belle tête blanche.",
    alcool: 'tequila', humeur: ['tropical'] });

  C({ id: 'siesta', nom: 'Siesta', cat: 'classique', ico: '😴', vis: 'jus-rouge',
    desc: 'Créé au Death & Co de New York : tequila, Campari et pamplemousse, entre margarita et negroni.',
    verre: 'Coupe', tech: 'Shaker', abv: '≈ 18 %', temps: '3 min', tag: ['Moderne', 'Amer'],
    ing: [I('tequila', 'Tequila', '4,5 cl'), I('campari', 'Campari', '1,5 cl'), I('jus-pamplemousse', 'Jus de pamplemousse', '2,25 cl'), I('citron-vert', 'Jus de citron vert', '1,5 cl'), I('sirop-sucre', 'Sirop de sucre', '1,5 cl')],
    steps: ['Tout secouer avec des glaçons.', 'Filtrer dans une coupe glacée.'],
    astuce: 'Le Campari à petite dose : juste assez pour une amertume élégante.',
    alcool: 'tequila', humeur: ['chic', 'frais'] });

  C({ id: 'picante', nom: 'Picante de la Casa', cat: 'signature', ico: '🌶️', vis: 'citronnade',
    desc: 'La margarita pimentée de la Soho House : piment rouge, coriandre, agave.',
    verre: 'Old fashioned', tech: 'Shaker', abv: '≈ 16 %', temps: '4 min', tag: ['Épicé', 'Moderne'],
    ing: [I('tequila', 'Tequila', '5 cl'), I('citron-vert', 'Jus de citron vert', '2,5 cl'), I('sirop-agave', "Sirop d'agave", '2 cl'), I('piment', 'Piment rouge', '2 rondelles'), I('coriandre', 'Coriandre', '4 brins')],
    steps: ['Piler légèrement le piment et la coriandre dans le shaker.', 'Ajouter le reste et la glace, secouer.', 'Filtrer finement sur glace, une rondelle de piment dessus.'],
    astuce: 'Épépine le piment si tu crains le feu : le goût reste, la brûlure part.',
    alcool: 'tequila', humeur: ['frais', 'chic'] });

  C({ id: 'tequila-old-fashioned', nom: 'Tequila Old Fashioned', cat: 'classique', ico: '🥃', vis: 'whisky-miel',
    desc: 'Une tequila reposado traitée comme un bourbon : agave, bitters, zeste d\'orange.',
    verre: 'Old fashioned', tech: 'Remué (stir)', abv: '≈ 32 %', temps: '3 min', tag: ['Sec', 'Dégustation'],
    ing: [I('tequila', 'Tequila reposado', '6 cl'), I('sirop-agave', "Sirop d'agave", '0,5 cl'), I('angostura', 'Angostura', '2 traits'), O("Zeste d'orange", '1')],
    steps: ['Remuer tout sur un gros glaçon 30 secondes.', "Exprimer le zeste d'orange au-dessus."],
    astuce: "L'agave à la place du sucre : il prolonge le goût de la tequila.",
    alcool: 'tequila', humeur: ['corse', 'chic'] });

  /* ================= Gin ================= */
  C({ id: 'singapore-sling', nom: 'Singapore Sling', cat: 'fruite', ico: '🇸🇬', vis: 'cocktail-exotique',
    desc: "Né au Raffles Hotel de Singapour vers 1915 : gin, cerise, ananas et agrumes.",
    verre: 'Hurricane ou highball', tech: 'Shaker', abv: '≈ 12 %', temps: '4 min', tag: ['IBA', 'Mythique'],
    ing: [I('gin', 'Gin', '3 cl'), I('liqueur-cerise', 'Liqueur de cerise', '1,5 cl'), I('triple-sec', 'Triple sec', '0,75 cl'), O('Bénédictine', '0,75 cl'), I('jus-ananas', "Jus d'ananas", '12 cl'), I('citron-vert', 'Jus de citron vert', '1,5 cl'), I('grenadine', 'Grenadine', '1 cl'), I('angostura', 'Angostura', '1 trait')],
    steps: ['Tout secouer avec des glaçons.', 'Filtrer dans un grand verre rempli de glace.', "Tranche d'ananas et cerise."],
    astuce: 'Sans Bénédictine il reste très bon : ajoute juste un filet de miel.',
    alcool: 'gin', humeur: ['tropical', 'chic'] });

  C({ id: 'saturn', nom: 'Saturn', cat: 'fruite', ico: '🪐', vis: 'cocktail-exotique',
    desc: 'Le tiki au gin qui a gagné un concours en 1967 : passion, orgeat et citron.',
    verre: 'Old fashioned', tech: 'Mixé rapide (flash blend)', abv: '≈ 16 %', temps: '3 min', tag: ['Tiki', 'Fruité'],
    ing: [I('gin', 'Gin', '4,5 cl'), I('citron-jaune', 'Jus de citron jaune', '2 cl'), I('fruit-passion', 'Jus de fruit de la passion', '1,5 cl'), I('sirop-orgeat', "Sirop d'orgeat", '1 cl'), O('Falernum', '0,75 cl')],
    steps: ['Mixer 5 secondes avec une poignée de glace pilée.', 'Verser sans filtrer dans le verre.', "Un zeste de citron autour d'une cerise."],
    astuce: 'Pas de blender ? Secoue avec de la glace pilée, le résultat est très proche.',
    alcool: 'gin', humeur: ['tropical'] });

  C({ id: 'bees-knees', nom: "Bee's Knees", cat: 'classique', ico: '🐝', vis: 'whisky-miel',
    desc: 'Un classique de la Prohibition : gin, miel et citron. Le miel adoucit le gin de baignoire.',
    verre: 'Coupe', tech: 'Shaker', abv: '≈ 20 %', temps: '3 min', tag: ['IBA', 'Facile'],
    ing: [I('gin', 'Gin', '5,25 cl'), I('sirop-miel', 'Sirop de miel', '2 cl'), I('citron-jaune', 'Jus de citron jaune', '2 cl')],
    steps: ['Tout secouer avec des glaçons.', 'Filtrer dans une coupe glacée.'],
    astuce: 'Un miel de lavande ou de fleurs : le gin adore.',
    alcool: 'gin', humeur: ['frais', 'chic'] });

  C({ id: 'gin-basil-smash', nom: 'Gin Basil Smash', cat: 'classique', ico: '🌿', vis: 'mojito',
    desc: 'Le moderne de Hambourg (2008) : gin, citron et une grosse poignée de basilic.',
    verre: 'Old fashioned', tech: 'Pilé puis shaker', abv: '≈ 18 %', temps: '4 min', tag: ['Moderne', 'Herbacé'],
    ing: [I('gin', 'Gin', '6 cl'), I('citron-jaune', 'Jus de citron jaune', '3 cl'), I('sirop-sucre', 'Sirop de sucre', '2 cl'), I('basilic', 'Feuilles de basilic', '10 à 12')],
    steps: ['Piler le basilic avec le citron dans le shaker.', 'Ajouter le gin, le sirop et la glace, secouer fort.', 'Filtrer finement sur glace, une feuille de basilic.'],
    astuce: 'Filtrer deux fois : pas de morceaux de feuilles, juste un vert éclatant.',
    alcool: 'gin', humeur: ['frais'] });

  C({ id: 'southside', nom: 'Southside', cat: 'classique', ico: '🌱', vis: 'mojito',
    desc: 'Le mojito au gin, servi en coupe : gin, citron vert, menthe. Chicago, années 1920.',
    verre: 'Coupe', tech: 'Shaker', abv: '≈ 18 %', temps: '3 min', tag: ['Frais', 'Élégant'],
    ing: [I('gin', 'Gin', '6 cl'), I('citron-vert', 'Jus de citron vert', '3 cl'), I('sirop-sucre', 'Sirop de sucre', '1,5 cl'), I('menthe', 'Feuilles de menthe', '8')],
    steps: ['Mettre la menthe dans le shaker avec le reste et la glace.', 'Secouer fort.', 'Filtrer finement dans une coupe.'],
    astuce: 'Secouer la menthe suffit, pas besoin de la piler.',
    alcool: 'gin', humeur: ['frais', 'chic'] });

  C({ id: 'corpse-reviver', nom: 'Corpse Reviver n°2', cat: 'classique', ico: '💀', vis: 'citronnade',
    desc: "Le remède d'après-soirée du Savoy : gin, triple sec, Lillet et citron, une touche d'absinthe.",
    verre: 'Coupe', tech: 'Shaker', abv: '≈ 20 %', temps: '3 min', tag: ['IBA', 'Parts égales'],
    ing: [I('gin', 'Gin', '2,25 cl'), I('triple-sec', 'Triple sec', '2,25 cl'), I('lillet', 'Lillet blanc', '2,25 cl'), I('citron-jaune', 'Jus de citron jaune', '2,25 cl'), I('absinthe', 'Absinthe', '1 trait')],
    steps: ["Rincer une coupe glacée à l'absinthe.", 'Secouer le reste avec des glaçons.', 'Filtrer dans la coupe.'],
    astuce: 'Une seule goutte d\'absinthe de trop et elle écrase tout.',
    alcool: 'gin', humeur: ['chic', 'frais'] });

  C({ id: 'ramos-gin-fizz', nom: 'Ramos Gin Fizz', cat: 'classique', ico: '☁️', vis: 'citronnade',
    desc: "La Nouvelle-Orléans, 1888 : gin, agrumes, crème et blanc d'œuf, secoués jusqu'à devenir un nuage.",
    verre: 'Highball étroit', tech: 'Shaker long', abv: '≈ 10 %', temps: '6 min', tag: ['IBA', 'Mousseux'],
    ing: [I('gin', 'Gin', '4,5 cl'), I('citron-jaune', 'Jus de citron jaune', '1,5 cl'), I('citron-vert', 'Jus de citron vert', '1,5 cl'), I('sirop-sucre', 'Sirop de sucre', '3 cl'), I('creme-liquide', 'Crème liquide', '6 cl'), I('blanc-oeuf', "Blanc d'œuf", '1'), I('fleur-oranger', "Eau de fleur d'oranger", '3 gouttes'), I('eau-gazeuse', 'Eau gazeuse', '3 cl')],
    steps: ['Secouer tout sauf l\'eau gazeuse, sans glace, 30 secondes.', 'Ajouter la glace et secouer encore 1 minute.', 'Verser dans le verre, laisser reposer 1 minute.', 'Verser l\'eau gazeuse au centre : la mousse monte au-dessus du bord.'],
    astuce: 'Le secret, c\'est la durée : plus tu secoues, plus la mousse tient.',
    alcool: 'gin', humeur: ['gourmand', 'chic'] });

  C({ id: 'alexander', nom: 'Alexander', cat: 'digestif', ico: '🍮', vis: 'liqueur-creme',
    desc: "L'ancêtre au gin du Brandy Alexander : gin, crème de cacao et crème, muscade.",
    verre: 'Coupe', tech: 'Shaker', abv: '≈ 18 %', temps: '3 min', tag: ['Dessert', 'Rétro'],
    ing: [I('gin', 'Gin', '3 cl'), I('creme-cacao', 'Crème de cacao', '3 cl'), I('creme-liquide', 'Crème liquide', '3 cl'), O('Muscade râpée', '1 pincée')],
    steps: ['Tout secouer fort avec des glaçons.', 'Filtrer dans une coupe, muscade dessus.'],
    astuce: 'Crème de cacao blanche pour un cocktail ivoire, brune pour un chocolat au lait.',
    alcool: 'gin', humeur: ['gourmand'] });

  C({ id: 'martinez', nom: 'Martinez', cat: 'classique', ico: '🕰️', vis: 'jus-rouge',
    desc: "L'ancêtre du Martini (1880) : gin, vermouth rouge à parts égales, marasquin et bitters.",
    verre: 'Coupe', tech: 'Remué (stir)', abv: '≈ 24 %', temps: '3 min', tag: ['IBA', 'Rétro'],
    ing: [I('gin', 'Gin', '4,5 cl'), I('vermouth-rouge', 'Vermouth rouge', '4,5 cl'), I('maraschino', 'Marasquin', '1 cuillère de bar'), I('angostura', 'Bitters', '2 traits')],
    steps: ['Remuer tout avec des glaçons 25 secondes.', 'Filtrer dans une coupe glacée, zeste d\'orange.'],
    astuce: 'Un gin plus rond (Old Tom) est encore plus fidèle à l\'original.',
    alcool: 'gin', humeur: ['corse', 'chic'] });

  C({ id: 'vesper', nom: 'Vesper', cat: 'classique', ico: '🎲', vis: 'cocktails',
    desc: 'Le martini de James Bond dans Casino Royale : gin, vodka et Lillet, zeste de citron.',
    verre: 'Verre à martini', tech: 'Shaker', abv: '≈ 32 %', temps: '3 min', tag: ['IBA', 'Puissant'],
    ing: [I('gin', 'Gin', '4,5 cl'), I('vodka', 'Vodka', '1,5 cl'), I('lillet', 'Lillet blanc', '0,75 cl'), O('Zeste de citron', '1')],
    steps: ['Secouer tout avec beaucoup de glace.', 'Filtrer dans un verre glacé, grand zeste de citron.'],
    astuce: 'Pour une fois, secoué et pas remué : c\'est ce que Bond demande.',
    alcool: 'gin', humeur: ['chic', 'corse'] });

  /* ================= Autres alcools ================= */
  C({ id: 'champagne-cocktail', nom: 'Champagne cocktail', cat: 'petillant', ico: '🥂', vis: 'cocktails',
    desc: 'Un sucre imbibé de bitters au fond d\'une flûte, un trait de cognac, le champagne par-dessus.',
    verre: 'Flûte', tech: 'Construit (build)', abv: '≈ 14 %', temps: '2 min', tag: ['IBA', 'Festif'],
    ing: [I('sucre', 'Morceau de sucre', '1'), I('angostura', 'Angostura', '2 traits'), I('cognac', 'Cognac', '1 cl'), I('champagne', 'Champagne', '9 cl'), O("Zeste d'orange", '1')],
    steps: ['Imbiber le sucre d\'angostura au fond de la flûte.', 'Ajouter le cognac.', 'Compléter doucement de champagne.'],
    astuce: 'Le sucre fait monter des bulles en continu : c\'est le spectacle.',
    alcool: 'autre', humeur: ['chic'] });

  C({ id: 'rossini', nom: 'Rossini', cat: 'petillant', ico: '🍓', vis: 'jus-rouge',
    desc: 'Le cousin fraise du Bellini, à Venise : purée de fraises et prosecco.',
    verre: 'Flûte', tech: 'Construit (build)', abv: '≈ 8 %', temps: '3 min', tag: ['Festif', 'Fruité'],
    ing: [I('fraise', 'Fraises mixées', '5 ou 6'), I('prosecco', 'Prosecco', '10 cl'), I('sirop-sucre', 'Sirop de sucre', '0,5 cl', true)],
    steps: ['Mixer et passer les fraises au chinois.', 'Verser 3 cl de purée dans la flûte.', 'Compléter lentement de prosecco en remuant une fois.'],
    astuce: 'Prosecco très froid et versé lentement : sinon il déborde sur la purée.',
    alcool: 'autre', humeur: ['chic', 'frais'] });

  C({ id: 'brandy-alexander', nom: 'Brandy Alexander', cat: 'digestif', ico: '🍫', vis: 'liqueur-creme',
    desc: 'Cognac, crème de cacao et crème, muscade râpée : le digestif le plus doux qui soit.',
    verre: 'Coupe', tech: 'Shaker', abv: '≈ 18 %', temps: '3 min', tag: ['IBA', 'Dessert'],
    ing: [I('cognac', 'Cognac', '3 cl'), I('creme-cacao', 'Crème de cacao brune', '3 cl'), I('creme-liquide', 'Crème liquide', '3 cl'), O('Muscade râpée', '1 pincée')],
    steps: ['Tout secouer fort avec des glaçons.', 'Filtrer dans une coupe, muscade dessus.'],
    astuce: 'Muscade fraîchement râpée, jamais en poudre : c\'est la moitié du goût.',
    alcool: 'autre', humeur: ['gourmand', 'chic'] });

  C({ id: 'batida-coco', nom: 'Batida de coco', cat: 'digestif', ico: '🥥', vis: 'liqueur-creme',
    desc: 'Le Brésil en version dessert : cachaça, coco et lait concentré, mixés glacés.',
    verre: 'Old fashioned', tech: 'Mixé (blender)', abv: '≈ 12 %', temps: '3 min', tag: ['Brésil', 'Dessert'],
    ing: [I('cachaca', 'Cachaça', '5 cl'), I('creme-coco', 'Crème de coco', '5 cl'), I('lait-concentre', 'Lait concentré sucré', '3 cl')],
    steps: ['Mixer avec une poignée de glace.', 'Servir aussitôt.'],
    astuce: 'Une pincée de noix de coco râpée grillée dessus.',
    alcool: 'autre', humeur: ['gourmand', 'tropical'] });

  C({ id: 'batida-maracuja', nom: 'Batida de maracujá', cat: 'fruite', ico: '💛', vis: 'cocktail-exotique',
    desc: 'La batida au fruit de la passion : acidulée, crémeuse, très brésilienne.',
    verre: 'Old fashioned', tech: 'Mixé (blender)', abv: '≈ 12 %', temps: '3 min', tag: ['Brésil', 'Fruité'],
    ing: [I('cachaca', 'Cachaça', '5 cl'), I('fruit-passion', 'Jus de fruit de la passion', '6 cl'), I('lait-concentre', 'Lait concentré sucré', '3 cl')],
    steps: ['Mixer avec une poignée de glace.', 'Servir avec une demi-passion dessus.'],
    astuce: 'Pulpe fraîche avec les graines : plus de goût que le jus.',
    alcool: 'autre', humeur: ['tropical', 'gourmand'] });

  C({ id: 'pisco-punch', nom: 'Pisco Punch', cat: 'fruite', ico: '🍍', vis: 'cocktail-exotique',
    desc: 'La star de San Francisco au XIXᵉ siècle : pisco, ananas et citron vert.',
    verre: 'Old fashioned', tech: 'Shaker', abv: '≈ 16 %', temps: '3 min', tag: ['Historique', 'Fruité'],
    ing: [I('pisco', 'Pisco', '6 cl'), I('jus-ananas', "Jus d'ananas", '3 cl'), I('citron-vert', 'Jus de citron vert', '1,5 cl'), I('sirop-sucre', 'Sirop de sucre', '1,5 cl')],
    steps: ['Tout secouer avec des glaçons.', "Servir sur glace, un morceau d'ananas."],
    astuce: 'Faire mariner des morceaux d\'ananas dans le sirop la veille : la recette d\'origine.',
    alcool: 'autre', humeur: ['tropical'] });

  C({ id: 'chilcano', nom: 'Chilcano', cat: 'fruite', ico: '🇵🇪', vis: 'citronnade',
    desc: 'Le long drink national du Pérou : pisco, ginger beer, citron vert et bitters.',
    verre: 'Highball', tech: 'Construit (build)', abv: '≈ 10 %', temps: '2 min', tag: ['Facile', 'Pérou'],
    ing: [I('pisco', 'Pisco', '5 cl'), I('citron-vert', 'Jus de citron vert', '1,5 cl'), I('ginger-beer', 'Ginger beer (ou ginger ale)', '12 cl'), I('angostura', 'Angostura', '2 traits')],
    steps: ['Glaçons, pisco, citron vert.', 'Compléter de ginger beer.', "Quelques traits d'angostura dessus."],
    astuce: 'Ginger ale pour une version douce, ginger beer pour du piquant.',
    alcool: 'autre', humeur: ['frais'] });

  C({ id: 'campari-soda', nom: 'Campari soda', cat: 'classique', ico: '🇮🇹', vis: 'jus-rouge',
    desc: "L'apéritif milanais le plus simple : Campari, eau gazeuse, rondelle d'orange.",
    verre: 'Highball', tech: 'Construit (build)', abv: '≈ 8 %', temps: '1 min', tag: ['Apéro', 'Deux ingrédients'],
    ing: [I('campari', 'Campari', '5 cl'), I('eau-gazeuse', 'Eau gazeuse', '10 cl'), O("Rondelle d'orange", '1')],
    steps: ['Glaçons, Campari, eau gazeuse.', "Une rondelle d'orange."],
    astuce: 'Tout doit être très froid : un Campari tiède est trop amer.',
    alcool: 'autre', humeur: ['corse', 'frais'] });

  C({ id: 'stinger', nom: 'Stinger', cat: 'digestif', ico: '🦂', vis: 'whisky-miel',
    desc: 'Le digestif de la haute société new-yorkaise : cognac et crème de menthe blanche.',
    verre: 'Coupe ou old fashioned', tech: 'Remué (stir)', abv: '≈ 30 %', temps: '2 min', tag: ['Digestif', 'Rétro'],
    ing: [I('cognac', 'Cognac', '5 cl'), I('creme-menthe', 'Crème de menthe blanche', '2 cl')],
    steps: ['Remuer avec des glaçons.', 'Filtrer dans une coupe, ou servir sur glace pilée.'],
    astuce: 'Menthe blanche et pas verte : le cocktail reste doré.',
    alcool: 'autre', humeur: ['corse', 'chic'] });

  C({ id: 'grasshopper', nom: 'Grasshopper', cat: 'digestif', ico: '🦗', vis: 'liqueur-creme',
    desc: "La « sauterelle » vert tendre de La Nouvelle-Orléans : menthe, cacao et crème. Un After Eight liquide.",
    verre: 'Coupe', tech: 'Shaker', abv: '≈ 14 %', temps: '3 min', tag: ['IBA', 'Dessert'],
    ing: [I('creme-menthe', 'Crème de menthe', '3 cl'), I('creme-cacao', 'Crème de cacao blanche', '3 cl'), I('creme-liquide', 'Crème liquide', '3 cl')],
    steps: ['Tout secouer fort avec des glaçons.', 'Filtrer dans une coupe glacée.'],
    astuce: 'La version verte demande une crème de menthe verte ; blanche, il est ivoire et aussi bon.',
    alcool: 'autre', humeur: ['gourmand'] });

  C({ id: 'aperol-sour', nom: 'Aperol Sour', cat: 'classique', ico: '🍊', vis: 'citronnade',
    desc: "L'Aperol en sour : citron, sucre et blanc d'œuf. Amer doux, mousse épaisse.",
    verre: 'Coupe', tech: 'Shaker', abv: '≈ 8 %', temps: '4 min', tag: ['Léger', 'Mousseux'],
    ing: [I('aperol', 'Aperol', '5 cl'), I('citron-jaune', 'Jus de citron jaune', '2,5 cl'), I('sirop-sucre', 'Sirop de sucre', '1,5 cl'), I('blanc-oeuf', "Blanc d'œuf", '1')],
    steps: ['Secouer sans glace 15 secondes.', 'Ajouter la glace et secouer encore.', 'Filtrer dans une coupe.'],
    astuce: "Peu d'alcool, beaucoup de goût : parfait pour l'apéro.",
    alcool: 'autre', humeur: ['frais', 'gourmand'] });

  C({ id: 'caipirinha-fraise', nom: 'Caipirinha fraise', cat: 'fruite', ico: '🍓', vis: 'caipirinha',
    desc: 'La caipirinha du Brésil avec des fraises pilées : plus fruitée, toujours aussi fraîche.',
    verre: 'Old fashioned', tech: 'Pilé', abv: '≈ 16 %', temps: '3 min', tag: ['Été', 'Fruité'],
    ing: [I('cachaca', 'Cachaça', '5 cl'), I('fraise', 'Fraises', '3'), I('citron-vert', 'Citron vert', '½'), I('sucre', 'Sucre en poudre', '2 cuillères à café')],
    steps: ['Piler les fraises, le citron vert en quartiers et le sucre.', 'Remplir de glace pilée.', 'Verser la cachaça et remuer.'],
    astuce: 'Des fraises bien mûres : le sucre ne rattrape pas une fraise fade.',
    alcool: 'autre', humeur: ['tropical', 'frais'] });

  /* ================= Pour que chaque envie ait ses cinq recettes ================= */
  C({ id: 'kentucky-buck', nom: 'Kentucky Buck', cat: 'fruite', ico: '🍓', vis: 'jus-rouge',
    desc: 'Le mule au bourbon et à la fraise, créé à San Francisco : fruité, piquant de gingembre.',
    verre: 'Highball', tech: 'Pilé puis shaker', abv: '≈ 12 %', temps: '4 min', tag: ['Moderne', 'Fruité'],
    ing: [I('bourbon', 'Bourbon', '4,5 cl'), I('fraise', 'Fraises', '2'), I('citron-jaune', 'Jus de citron jaune', '2 cl'), I('sirop-sucre', 'Sirop de sucre', '1,5 cl'), I('ginger-beer', 'Ginger beer', '6 cl'), I('angostura', 'Angostura', '2 traits', true)],
    steps: ['Piler les fraises dans le shaker.', 'Ajouter bourbon, citron, sirop et glace, secouer.', 'Filtrer sur glace, compléter de ginger beer.'],
    astuce: 'Une fraise coupée en éventail sur le bord : il est aussi beau que bon.',
    alcool: 'whisky', humeur: ['tropical', 'frais'] });

  C({ id: 'ward-eight', nom: 'Ward Eight', cat: 'classique', ico: '🗳️', vis: 'jus-rouge',
    desc: "Boston, 1898, pour fêter une élection : rye, orange, citron et grenadine.",
    verre: 'Coupe', tech: 'Shaker', abv: '≈ 18 %', temps: '3 min', tag: ['Historique', 'Fruité'],
    ing: [I('rye', 'Rye whisky', '6 cl'), I('jus-orange', "Jus d'orange", '1,5 cl'), I('citron-jaune', 'Jus de citron jaune', '1,5 cl'), I('grenadine', 'Grenadine', '1 cl')],
    steps: ['Tout secouer avec des glaçons.', 'Filtrer dans une coupe glacée.'],
    astuce: 'Une vraie grenadine à la grenade : la couleur rubis vient de là.',
    alcool: 'whisky', humeur: ['tropical', 'frais'] });

  C({ id: 'bourbon-flip', nom: 'Bourbon Flip', cat: 'digestif', ico: '🥚', vis: 'liqueur-creme',
    desc: "Un classique du XIXᵉ siècle : bourbon, œuf entier et sucre, secoués jusqu'à devenir velours.",
    verre: 'Petite coupe', tech: 'Shaker', abv: '≈ 18 %', temps: '4 min', tag: ['Rétro', 'Velouté'],
    ing: [I('bourbon', 'Bourbon', '6 cl'), I('oeuf', 'Œuf entier', '1'), I('sirop-sucre', 'Sirop de sucre', '2 cl'), O('Muscade râpée', '1 pincée')],
    steps: ['Secouer sans glace 15 secondes.', 'Ajouter la glace et secouer encore.', 'Filtrer, muscade dessus.'],
    astuce: 'Un œuf très frais et bien froid : la texture est plus dense.',
    alcool: 'whisky', humeur: ['gourmand'] });

  C({ id: 'margarita-mangue', nom: 'Margarita mangue', cat: 'fruite', ico: '🥭', vis: 'cocktail-exotique',
    desc: 'La margarita glacée à la mangue : tequila, mangue mûre et citron vert, bord sucre et piment.',
    verre: 'Verre à margarita', tech: 'Mixé (blender)', abv: '≈ 10 %', temps: '4 min', tag: ['Glacé', 'Été'],
    ing: [I('tequila', 'Tequila', '5 cl'), I('mangue', 'Mangue mûre', '½'), I('triple-sec', 'Triple sec', '2 cl'), I('citron-vert', 'Jus de citron vert', '2,5 cl'), I('sirop-agave', "Sirop d'agave", '1 cl', true)],
    steps: ['Mixer tout avec une tasse de glace.', 'Verser dans un verre au bord givré (sucre et une pointe de piment).'],
    astuce: 'Mangue surgelée : pas besoin de glace, et un goût bien plus fort.',
    alcool: 'tequila', humeur: ['tropical'] });

  C({ id: 'tequila-negroni', nom: 'Tequila Negroni', cat: 'classique', ico: '🇲🇽', vis: 'jus-rouge',
    desc: 'Le negroni avec une tequila reposado à la place du gin : plus rond, notes végétales.',
    verre: 'Old fashioned', tech: 'Remué (stir)', abv: '≈ 24 %', temps: '2 min', tag: ['Amer', 'Parts égales'],
    ing: [I('tequila', 'Tequila reposado', '3 cl'), I('campari', 'Campari', '3 cl'), I('vermouth-rouge', 'Vermouth rouge', '3 cl'), O("Zeste d'orange", '1')],
    steps: ['Remuer sur glace 20 secondes.', "Servir sur un gros glaçon, zeste d'orange."],
    astuce: 'Parts égales comme le négroni : la tequila prend juste la place du gin.',
    alcool: 'tequila', humeur: ['corse'] });

  C({ id: 'suffering-bastard', nom: 'Suffering Bastard', cat: 'fruite', ico: '🤕', vis: 'cocktail-exotique',
    desc: "Le remède anti-gueule de bois du Shepheard's Hotel du Caire (1942) : gin, cognac, citron vert, ginger beer.",
    verre: 'Highball', tech: 'Shaker', abv: '≈ 12 %', temps: '3 min', tag: ['Tiki', 'Épicé'],
    ing: [I('gin', 'Gin', '3 cl'), I('cognac', 'Cognac', '3 cl'), I('citron-vert', 'Jus de citron vert', '1,5 cl'), I('sirop-sucre', 'Sirop de sucre', '0,75 cl'), I('angostura', 'Angostura', '2 traits'), I('ginger-beer', 'Ginger beer', '12 cl')],
    steps: ['Secouer tout sauf la ginger beer avec des glaçons.', 'Filtrer sur glace et compléter de ginger beer.', 'Menthe et tranche d\'orange.'],
    astuce: 'Une ginger beer bien piquante : c\'est elle qui fait le cocktail.',
    alcool: 'gin', humeur: ['tropical', 'frais'] });

  C({ id: 'army-navy', nom: 'Army & Navy', cat: 'classique', ico: '⚓', vis: 'citronnade',
    desc: "Le gin sour à l'amande : gin, orgeat et citron. Doux, soyeux, légèrement exotique.",
    verre: 'Coupe', tech: 'Shaker', abv: '≈ 20 %', temps: '3 min', tag: ['Classique', 'Amande'],
    ing: [I('gin', 'Gin', '6 cl'), I('sirop-orgeat', "Sirop d'orgeat", '2 cl'), I('citron-jaune', 'Jus de citron jaune', '2 cl'), I('angostura', 'Angostura', '1 trait', true)],
    steps: ['Tout secouer avec des glaçons.', 'Filtrer dans une coupe, zeste de citron.'],
    astuce: "L'orgeat fait tout : un bon sirop d'amande, pas un sirop industriel trop sucré.",
    alcool: 'gin', humeur: ['tropical', 'chic'] });

  C({ id: 'pink-lady', nom: 'Pink Lady', cat: 'classique', ico: '🎀', vis: 'jus-rouge',
    desc: "L'élégante rose des années 1930 : gin, grenadine, citron et une mousse de blanc d'œuf.",
    verre: 'Coupe', tech: 'Shaker', abv: '≈ 18 %', temps: '4 min', tag: ['Rétro', 'Mousseux'],
    ing: [I('gin', 'Gin', '4,5 cl'), I('citron-jaune', 'Jus de citron jaune', '1,5 cl'), I('grenadine', 'Grenadine', '1,5 cl'), I('blanc-oeuf', "Blanc d'œuf", '1')],
    steps: ['Secouer sans glace 15 secondes.', 'Ajouter la glace et secouer encore.', 'Filtrer dans une coupe.'],
    astuce: "Un trait de calvados (1,5 cl) : c'est la recette d'origine, avec l'applejack.",
    alcool: 'gin', humeur: ['gourmand', 'chic'] });

  C({ id: 'oaxaca-old-fashioned', nom: 'Oaxaca Old Fashioned', cat: 'classique', ico: '🔥', vis: 'whisky-miel',
    desc: "Le moderne culte du Death & Co (2007) : tequila reposado, une touche de mezcal fumé, agave et bitters.",
    verre: 'Old fashioned', tech: 'Remué (stir)', abv: '≈ 32 %', temps: '3 min', tag: ['Moderne', 'Fumé'],
    ing: [I('tequila', 'Tequila reposado', '4,5 cl'), I('mezcal', 'Mezcal', '1,5 cl'), I('sirop-agave', "Sirop d'agave", '0,5 cl'), I('angostura', 'Angostura', '2 traits'), O("Zeste d'orange flambé", '1')],
    steps: ['Remuer tout sur un gros glaçon 30 secondes.', "Flamber le zeste d'orange au-dessus du verre."],
    astuce: 'Le mezcal reste en retrait : juste assez de fumée pour intriguer.',
    alcool: 'tequila', humeur: ['corse', 'chic'] });

  C({ id: 'white-bull', nom: 'White Bull', cat: 'digestif', ico: '🐂', vis: 'liqueur-creme',
    desc: 'Le Brave Bull adouci à la crème : tequila, liqueur de café et crème, le White Russian mexicain.',
    verre: 'Old fashioned', tech: 'Construit (build)', abv: '≈ 18 %', temps: '2 min', tag: ['Dessert', 'Café'],
    ing: [I('tequila', 'Tequila', '4 cl'), I('liqueur-cafe', 'Liqueur de café', '2 cl'), I('creme-liquide', 'Crème liquide', '3 cl')],
    steps: ['Tequila et liqueur de café sur glace.', 'Faire flotter la crème par-dessus, remuer au moment de boire.'],
    astuce: 'Crème à peine fouettée : elle flotte au lieu de couler.',
    alcool: 'tequila', humeur: ['gourmand'] });
})();
