/* EVER : cocktails supplémentaires.

   Chargé après codex.data.js et avant codex.config.js : on complète
   la liste des cocktails, le bar et les familles avant que la
   configuration ne calcule les noms et les compteurs.

   Des recettes réelles, aux doses de référence des barmans (IBA
   quand elle existe). Chaque ingrédient du bar sert au moins une
   recette : le test se trouve dans tools/verif-bar.js. */
(function () {
  'use strict';

  /* ---------- Nouveaux ingrédients du bar ---------- */
  BAR.push(
    { k: 'cognac', n: 'Cognac', fam: 'Alcools' },
    { k: 'cachaca', n: 'Cachaça', fam: 'Alcools' },
    { k: 'pisco', n: 'Pisco', fam: 'Alcools' },
    { k: 'prosecco', n: 'Prosecco', fam: 'Alcools' },
    { k: 'champagne', n: 'Champagne', fam: 'Alcools' },
    { k: 'aperol', n: 'Aperol', fam: 'Vermouths & amers' },
    { k: 'amaretto', n: 'Amaretto', fam: 'Liqueurs' },
    { k: 'liqueur-creme', n: 'Liqueur de crème (Baileys)', fam: 'Liqueurs' },
    { k: 'creme-cassis', n: 'Crème de cassis', fam: 'Liqueurs' },
    { k: 'liqueur-peche', n: 'Liqueur de pêche', fam: 'Liqueurs' },
    { k: 'maraschino', n: 'Marasquin', fam: 'Liqueurs' },
    { k: 'sureau', n: 'Liqueur de sureau (St-Germain)', fam: 'Liqueurs' },
    { k: 'chartreuse-verte', n: 'Chartreuse verte', fam: 'Liqueurs' },
    { k: 'blue-curacao', n: 'Curaçao bleu', fam: 'Liqueurs' },
    { k: 'sirop-orgeat', n: "Sirop d'orgeat", fam: 'Sirops' },
    { k: 'sirop-miel', n: 'Sirop de miel', fam: 'Sirops' },
    { k: 'sirop-agave', n: "Sirop d'agave", fam: 'Sirops' },
    { k: 'sirop-framboise', n: 'Sirop de framboise', fam: 'Sirops' },
    { k: 'sirop-vanille', n: 'Sirop de vanille', fam: 'Sirops' },
    { k: 'sucre', n: 'Sucre en poudre', fam: 'Sirops' },
    { k: 'jus-tomate', n: 'Jus de tomate', fam: 'Fruits & jus' },
    { k: 'puree-peche', n: 'Purée de pêche blanche', fam: 'Fruits & jus' },
    { k: 'ginger-beer', n: 'Ginger beer', fam: 'Frais & divers' },
    { k: 'tonic', n: 'Tonic', fam: 'Frais & divers' },
    { k: 'cola', n: 'Cola', fam: 'Frais & divers' },
    { k: 'limonade', n: 'Limonade', fam: 'Frais & divers' },
    { k: 'creme-liquide', n: 'Crème liquide', fam: 'Frais & divers' },
    { k: 'gingembre', n: 'Gingembre frais', fam: 'Frais & divers' }
  );

  /* ---------- Deux familles de plus ---------- */
  CKCATS.push(
    { id: 'petillant', nom: 'Les pétillants', ico: '🥂', desc: 'Bulles, spritz et coupes : l\'apéro qui se boit debout.' },
    { id: 'digestif', nom: 'Crémeux & digestifs', ico: '🍫', desc: 'Café, crème, amande : la fin de soirée.' }
  );

  const I = (k, n, q, opt) => (opt ? { k: k, n: n, q: q, opt: true } : { k: k, n: n, q: q });
  const O = (n, q) => ({ k: null, n: n, q: q, opt: true });
  const C = (o) => COCKTAILS.push(o);

  /* ================= Les pétillants ================= */
  C({ id: 'aperol-spritz', nom: 'Aperol Spritz', cat: 'petillant', ico: '🍊', vis: 'cocktails',
    desc: "L'apéritif vénitien devenu un réflexe d'été. Amer doux, orange, bulles : la règle 3, 2, 1.",
    verre: 'Verre à vin', tech: 'Construit (build)', abv: '≈ 8 %', temps: '2 min', tag: ['Apéro', 'Facile'],
    ing: [I('prosecco', 'Prosecco', '9 cl'), I('aperol', 'Aperol', '6 cl'), I('eau-gazeuse', 'Eau gazeuse', '3 cl'), O('Tranche d\'orange', '1')],
    steps: ['Remplir un grand verre à vin de glaçons.', 'Verser le prosecco, puis l\'Aperol.', 'Compléter d\'un trait d\'eau gazeuse.', 'Remuer une fois et ajouter la tranche d\'orange.'],
    astuce: "Le prosecco d'abord, l'Aperol ensuite : il coule au fond et se mélange tout seul, sans casser les bulles.",
    alcool: 'autre', humeur: 'frais' });

  C({ id: 'hugo', nom: 'Hugo', cat: 'petillant', ico: '🌿', vis: 'mojito',
    desc: 'Le cousin tyrolien du spritz : fleur de sureau, menthe et bulles. Léger et très floral.',
    verre: 'Verre à vin', tech: 'Construit (build)', abv: '≈ 7 %', temps: '3 min', tag: ['Léger', 'Floral'],
    ing: [I('prosecco', 'Prosecco', '10 cl'), I('sureau', 'Liqueur de sureau', '2 cl'), I('eau-gazeuse', 'Eau gazeuse', '3 cl'), I('menthe', 'Feuilles de menthe', '6'), I('citron-vert', 'Quartier de citron vert', '1', true)],
    steps: ['Froisser la menthe entre les mains et la mettre dans le verre.', 'Ajouter la liqueur de sureau et les glaçons.', 'Verser le prosecco puis l\'eau gazeuse.', 'Remuer doucement, finir avec le citron vert.'],
    astuce: 'On froisse la menthe, on ne la pile pas : pilée, elle devient amère.',
    alcool: 'autre', humeur: 'frais' });

  C({ id: 'kir-royal', nom: 'Kir royal', cat: 'petillant', ico: '🍇', vis: 'cocktails',
    desc: 'Le classique bourguignon version fête : un fond de cassis sous le champagne.',
    verre: 'Flûte', tech: 'Construit (build)', abv: '≈ 12 %', temps: '1 min', tag: ['Festif', 'Deux ingrédients'],
    ing: [I('creme-cassis', 'Crème de cassis', '1 cl'), I('champagne', 'Champagne', '12 cl')],
    steps: ['Verser la crème de cassis au fond d\'une flûte bien froide.', 'Compléter doucement au champagne.'],
    astuce: 'Un centimètre de cassis, pas plus : au-delà, on ne sent plus le champagne.',
    alcool: 'autre', humeur: 'chic' });

  C({ id: 'mimosa', nom: 'Mimosa', cat: 'petillant', ico: '🥂', vis: 'cocktails',
    desc: 'Le cocktail du brunch : moitié jus d\'orange, moitié champagne.',
    verre: 'Flûte', tech: 'Construit (build)', abv: '≈ 6 %', temps: '1 min', tag: ['Brunch', 'Facile'],
    ing: [I('champagne', 'Champagne', '7,5 cl'), I('jus-orange', "Jus d'orange frais", '7,5 cl')],
    steps: ['Verser le champagne dans une flûte froide.', "Compléter au jus d'orange, sans remuer."],
    astuce: "Un jus pressé et bien froid fait toute la différence avec un jus en brique.",
    alcool: 'autre', humeur: 'chic' });

  C({ id: 'french-75', nom: 'French 75', cat: 'petillant', ico: '🥂', vis: 'cocktails',
    desc: 'Gin, citron et champagne : un Tom Collins habillé pour sortir. Né à Paris en 1915.',
    verre: 'Flûte', tech: 'Shaké puis allongé', abv: '≈ 15 %', temps: '3 min', tag: ['Chic', 'Citronné'],
    ing: [I('gin', 'Gin', '3 cl'), I('citron-jaune', 'Jus de citron jaune', '1,5 cl'), I('sirop-sucre', 'Sirop de sucre', '1,5 cl'), I('champagne', 'Champagne', '6 cl')],
    steps: ['Secouer le gin, le citron et le sirop avec des glaçons.', 'Filtrer dans une flûte.', 'Compléter au champagne.'],
    astuce: 'Le champagne en dernier et doucement, le long du verre : on garde toutes les bulles.',
    alcool: 'gin', humeur: 'chic' });

  C({ id: 'bellini', nom: 'Bellini', cat: 'petillant', ico: '🍑', vis: 'cocktails',
    desc: "Le cocktail du Harry's Bar de Venise : purée de pêche blanche et prosecco.",
    verre: 'Flûte', tech: 'Construit (build)', abv: '≈ 8 %', temps: '2 min', tag: ['Fruité', 'Doux'],
    ing: [I('puree-peche', 'Purée de pêche blanche', '5 cl'), I('prosecco', 'Prosecco', '10 cl')],
    steps: ['Verser la purée de pêche au fond de la flûte.', 'Ajouter le prosecco doucement en remuant à peine.'],
    astuce: 'Pas de pêche blanche ? Mixe une pêche jaune bien mûre avec un filet de citron.',
    alcool: 'autre', humeur: 'chic' });

  C({ id: 'negroni-sbagliato', nom: 'Negroni sbagliato', cat: 'petillant', ico: '🍷', vis: 'cocktails',
    desc: 'Le Negroni « raté » : du prosecco à la place du gin. Plus léger, tout aussi amer.',
    verre: 'Old fashioned', tech: 'Construit (build)', abv: '≈ 12 %', temps: '2 min', tag: ['Amer', 'Apéro'],
    ing: [I('campari', 'Campari', '3 cl'), I('vermouth-rouge', 'Vermouth rouge', '3 cl'), I('prosecco', 'Prosecco', '3 cl'), O("Zeste d'orange", '1')],
    steps: ['Remplir le verre de glaçons.', 'Verser le Campari et le vermouth, remuer.', 'Compléter au prosecco.'],
    astuce: 'Né d\'une erreur de barman à Milan : la meilleure excuse pour boire un Negroni en semaine.',
    alcool: 'autre', humeur: 'corse' });

  /* ================= Gin ================= */
  C({ id: 'gin-tonic', nom: 'Gin tonic', cat: 'classique', ico: '🧊', vis: 'citronnade',
    desc: 'Deux ingrédients, zéro excuse. Le plus simple et le plus bu des cocktails.',
    verre: 'Highball', tech: 'Construit (build)', abv: '≈ 10 %', temps: '1 min', tag: ['Facile', 'Frais'],
    ing: [I('gin', 'Gin', '5 cl'), I('tonic', 'Tonic', '15 cl'), I('citron-vert', 'Quartier de citron vert', '1', true)],
    steps: ['Remplir le verre à ras de glaçons.', 'Verser le gin.', 'Compléter au tonic le long d\'une cuillère.', 'Ajouter le citron vert.'],
    astuce: 'Beaucoup de glace, pas un peu : plus il y en a, moins elle fond vite.',
    alcool: 'gin', humeur: 'frais' });

  C({ id: 'tom-collins', nom: 'Tom Collins', cat: 'classique', ico: '🍋', vis: 'citronnade',
    desc: 'Une limonade pour adultes : gin, citron, sucre et bulles.',
    verre: 'Highball', tech: 'Shaké puis allongé', abv: '≈ 10 %', temps: '3 min', tag: ['Frais', 'Citronné'],
    ing: [I('gin', 'Gin', '4,5 cl'), I('citron-jaune', 'Jus de citron jaune', '3 cl'), I('sirop-sucre', 'Sirop de sucre', '1,5 cl'), I('eau-gazeuse', 'Eau gazeuse', '6 cl')],
    steps: ['Secouer le gin, le citron et le sirop avec des glaçons.', 'Filtrer dans un highball plein de glace.', "Compléter à l'eau gazeuse."],
    astuce: 'Remplace le gin par du bourbon et tu obtiens un John Collins.',
    alcool: 'gin', humeur: 'frais' });

  C({ id: 'gimlet', nom: 'Gimlet', cat: 'classique', ico: '🍈', vis: 'cocktails',
    desc: 'Gin et citron vert, point. Vif, net, rafraîchissant.',
    verre: 'Coupe', tech: 'Shaké', abv: '≈ 25 %', temps: '2 min', tag: ['Court', 'Acidulé'],
    ing: [I('gin', 'Gin', '6 cl'), I('citron-vert', 'Jus de citron vert', '2 cl'), I('sirop-sucre', 'Sirop de sucre', '2 cl')],
    steps: ['Secouer fort avec des glaçons.', 'Filtrer dans une coupe froide.'],
    astuce: 'Mets la coupe au congélateur dix minutes avant : un Gimlet se boit glacé.',
    alcool: 'gin', humeur: 'frais' });

  C({ id: 'bramble', nom: 'Bramble', cat: 'classique', ico: '🫐', vis: 'jus-rouge',
    desc: 'Un gin sour sur glace pilée, avec un filet de mûre qui descend en nuage. Londres, 1984.',
    verre: 'Old fashioned', tech: 'Shaké', abv: '≈ 15 %', temps: '3 min', tag: ['Fruité', 'Acidulé'],
    ing: [I('gin', 'Gin', '5 cl'), I('citron-jaune', 'Jus de citron jaune', '2,5 cl'), I('sirop-sucre', 'Sirop de sucre', '1,25 cl'), I('brandy-mure', 'Crème de mûre', '1,5 cl')],
    steps: ['Secouer le gin, le citron et le sirop avec des glaçons.', 'Filtrer sur de la glace pilée.', 'Verser la crème de mûre en filet par-dessus.'],
    astuce: 'La mûre en dernier, sans remuer : c\'est le dégradé qui fait le Bramble.',
    alcool: 'gin', humeur: 'frais' });

  C({ id: 'last-word', nom: 'Last Word', cat: 'classique', ico: '🟢', vis: 'cocktails',
    desc: 'Quatre ingrédients à parts égales. Herbacé, puissant, un classique de la Prohibition.',
    verre: 'Coupe', tech: 'Shaké', abv: '≈ 25 %', temps: '2 min', tag: ['Herbacé', 'Parts égales'],
    ing: [I('gin', 'Gin', '2,25 cl'), I('chartreuse-verte', 'Chartreuse verte', '2,25 cl'), I('maraschino', 'Marasquin', '2,25 cl'), I('citron-vert', 'Jus de citron vert', '2,25 cl')],
    steps: ['Secouer les quatre ingrédients avec des glaçons.', 'Filtrer dans une coupe froide.'],
    astuce: 'La Chartreuse domine vite : mesure au doseur, pas à l\'œil.',
    alcool: 'gin', humeur: 'corse' });

  C({ id: 'aviation', nom: 'Aviation', cat: 'classique', ico: '✈️', vis: 'cocktails',
    desc: 'Gin, marasquin et violette : une couleur de ciel et un goût de bonbon ancien.',
    verre: 'Coupe', tech: 'Shaké', abv: '≈ 22 %', temps: '2 min', tag: ['Floral', 'Élégant'],
    ing: [I('gin', 'Gin', '4,5 cl'), I('maraschino', 'Marasquin', '1,5 cl'), I('sirop-violette', 'Crème ou sirop de violette', '0,5 cl'), I('citron-jaune', 'Jus de citron jaune', '1,5 cl')],
    steps: ['Secouer avec des glaçons.', 'Filtrer dans une coupe.'],
    astuce: 'Une demi-cuillère de violette suffit : plus, et ça sent le savon.',
    alcool: 'gin', humeur: 'chic' });

  C({ id: 'white-lady', nom: 'White Lady', cat: 'classique', ico: '🤍', vis: 'cocktails',
    desc: 'Gin, triple sec et citron : un Sidecar au gin, soyeux avec le blanc d\'œuf.',
    verre: 'Coupe', tech: 'Shaké', abv: '≈ 22 %', temps: '3 min', tag: ['Soyeux', 'Citronné'],
    ing: [I('gin', 'Gin', '4 cl'), I('triple-sec', 'Triple sec', '3 cl'), I('citron-jaune', 'Jus de citron jaune', '2 cl'), I('blanc-oeuf', "Blanc d'œuf", '1', true)],
    steps: ["Secouer d'abord sans glace (avec le blanc d'œuf) 10 secondes.", 'Ajouter les glaçons et secouer encore.', 'Filtrer dans une coupe.'],
    astuce: 'Le premier shake sans glace fait monter la mousse : c\'est le « dry shake ».',
    alcool: 'gin', humeur: 'chic' });

  C({ id: 'clover-club', nom: 'Clover Club', cat: 'fruite', ico: '🍓', vis: 'jus-rouge',
    desc: 'Gin, framboise et citron, couronné de mousse rose. Philadelphie, avant la Prohibition.',
    verre: 'Coupe', tech: 'Shaké', abv: '≈ 18 %', temps: '3 min', tag: ['Fruité', 'Mousseux'],
    ing: [I('gin', 'Gin', '4,5 cl'), I('citron-jaune', 'Jus de citron jaune', '1,5 cl'), I('sirop-framboise', 'Sirop de framboise', '1,5 cl'), I('blanc-oeuf', "Blanc d'œuf", '1')],
    steps: ['Secouer sans glace pour monter le blanc.', 'Ajouter la glace, secouer de nouveau.', 'Filtrer dans une coupe.'],
    astuce: 'Trois framboises fraîches écrasées dans le shaker remplacent très bien le sirop.',
    alcool: 'gin', humeur: 'chic' });

  /* ================= Vodka ================= */
  C({ id: 'moscow-mule', nom: 'Moscow Mule', cat: 'fruite', ico: '🫚', vis: 'citronnade',
    desc: 'Vodka, ginger beer et citron vert dans une tasse en cuivre. Piquant et désaltérant.',
    verre: 'Tasse en cuivre ou highball', tech: 'Construit (build)', abv: '≈ 9 %', temps: '2 min', tag: ['Gingembre', 'Facile'],
    ing: [I('vodka', 'Vodka', '4,5 cl'), I('ginger-beer', 'Ginger beer', '12 cl'), I('citron-vert', 'Jus de citron vert', '1 cl')],
    steps: ['Remplir la tasse de glaçons.', 'Verser la vodka et le citron vert.', 'Compléter à la ginger beer.'],
    astuce: 'Ginger beer, pas ginger ale : il faut le piquant du vrai gingembre.',
    alcool: 'vodka', humeur: 'frais' });

  C({ id: 'bloody-mary', nom: 'Bloody Mary', cat: 'classique', ico: '🍅', vis: 'jus-rouge',
    desc: 'Le cocktail du lendemain : tomate, vodka, citron et épices.',
    verre: 'Highball', tech: 'Roulé (throwing)', abv: '≈ 10 %', temps: '4 min', tag: ['Salé', 'Épicé'],
    ing: [I('vodka', 'Vodka', '4,5 cl'), I('jus-tomate', 'Jus de tomate', '9 cl'), I('citron-jaune', 'Jus de citron jaune', '1,5 cl'), O('Sauce Worcestershire', '2 traits'), O('Tabasco, sel et poivre', 'au goût'), O('Branche de céleri', '1')],
    steps: ['Mettre tous les ingrédients dans un shaker avec des glaçons.', 'Faire passer le mélange d\'un shaker à l\'autre quelques fois, sans secouer.', 'Verser dans un highball plein de glace.', 'Planter la branche de céleri.'],
    astuce: 'On ne secoue pas la tomate : elle mousse et devient farineuse. On la fait couler d\'un verre à l\'autre.',
    alcool: 'vodka', humeur: 'corse' });

  C({ id: 'black-russian', nom: 'Black Russian', cat: 'digestif', ico: '☕', vis: 'cocktails',
    desc: 'Vodka et liqueur de café sur glace. Deux ingrédients, un digestif sérieux.',
    verre: 'Old fashioned', tech: 'Construit (build)', abv: '≈ 30 %', temps: '1 min', tag: ['Café', 'Court'],
    ing: [I('vodka', 'Vodka', '5 cl'), I('liqueur-cafe', 'Liqueur de café', '2 cl')],
    steps: ['Remplir le verre de glaçons.', 'Verser la vodka puis la liqueur de café.', 'Remuer 10 secondes.'],
    astuce: 'Ajoute 3 cl de crème liquide et tu passes au White Russian.',
    alcool: 'vodka', humeur: 'corse' });

  C({ id: 'white-russian', nom: 'White Russian', cat: 'digestif', ico: '🥛', vis: 'liqueur-creme',
    desc: 'Le Black Russian adouci à la crème. Le cocktail du Big Lebowski.',
    verre: 'Old fashioned', tech: 'Construit (build)', abv: '≈ 20 %', temps: '2 min', tag: ['Crémeux', 'Café'],
    ing: [I('vodka', 'Vodka', '5 cl'), I('liqueur-cafe', 'Liqueur de café', '2 cl'), I('creme-liquide', 'Crème liquide', '3 cl')],
    steps: ['Verser la vodka et la liqueur de café sur glace.', 'Faire flotter la crème par-dessus, sur le dos d\'une cuillère.', 'Remuer au moment de boire.'],
    astuce: 'Fouette la crème deux secondes avant : elle flotte mieux et reste en couche.',
    alcool: 'vodka', humeur: 'gourmand' });

  C({ id: 'sex-on-the-beach', nom: 'Sex on the Beach', cat: 'fruite', ico: '🏖️', vis: 'sex-on-the-beach',
    desc: 'Vodka, pêche, orange et canneberge : le cocktail de vacances par excellence.',
    verre: 'Highball', tech: 'Construit (build)', abv: '≈ 10 %', temps: '2 min', tag: ['Fruité', 'Sucré'],
    ing: [I('vodka', 'Vodka', '4 cl'), I('liqueur-peche', 'Liqueur de pêche', '2 cl'), I('jus-orange', "Jus d'orange", '4 cl'), I('jus-canneberge', 'Jus de canneberge', '4 cl')],
    steps: ['Remplir le verre de glaçons.', 'Verser la vodka, la pêche et le jus d\'orange.', 'Finir par la canneberge pour le dégradé.'],
    astuce: 'La canneberge en dernier, doucement : elle descend et dessine le coucher de soleil.',
    alcool: 'vodka', humeur: 'tropical' });

  C({ id: 'blue-lagoon', nom: 'Blue Lagoon', cat: 'fruite', ico: '💙', vis: 'cocktail-exotique',
    desc: 'Vodka, curaçao bleu et limonade. Bleu lagon, goût d\'agrumes, zéro prise de tête.',
    verre: 'Highball', tech: 'Construit (build)', abv: '≈ 9 %', temps: '2 min', tag: ['Coloré', 'Facile'],
    ing: [I('vodka', 'Vodka', '4 cl'), I('blue-curacao', 'Curaçao bleu', '2 cl'), I('limonade', 'Limonade', '12 cl'), O('Tranche de citron', '1')],
    steps: ['Remplir le verre de glaçons.', 'Verser la vodka et le curaçao.', 'Compléter à la limonade et remuer.'],
    astuce: 'Une limonade artisanale peu sucrée rend le cocktail bien moins écœurant.',
    alcool: 'vodka', humeur: 'tropical' });

  C({ id: 'lemon-drop', nom: 'Lemon Drop', cat: 'fruite', ico: '🍋', vis: 'citronnade',
    desc: 'Un bonbon au citron en verre à cocktail, bord sucré compris.',
    verre: 'Coupe', tech: 'Shaké', abv: '≈ 20 %', temps: '3 min', tag: ['Acidulé', 'Sucré'],
    ing: [I('vodka', 'Vodka', '4 cl'), I('triple-sec', 'Triple sec', '2 cl'), I('citron-jaune', 'Jus de citron jaune', '1,5 cl'), I('sirop-sucre', 'Sirop de sucre', '1 cl'), O('Sucre pour le bord', '1 assiette')],
    steps: ['Givrer le bord de la coupe au sucre.', 'Secouer tous les ingrédients avec des glaçons.', 'Filtrer dans la coupe.'],
    astuce: 'Frotte le bord avec un quartier de citron avant de le tremper dans le sucre : ça tient.',
    alcool: 'vodka', humeur: 'frais' });

  C({ id: 'porn-star-martini', nom: 'Porn Star Martini', cat: 'fruite', ico: '💛', vis: 'cocktail-exotique',
    desc: 'Vanille, passion et citron vert, servi avec un shot de bulles à côté. Londres, années 2000.',
    verre: 'Coupe', tech: 'Shaké', abv: '≈ 15 %', temps: '4 min', tag: ['Passion', 'Festif'],
    ing: [I('vodka', 'Vodka', '4,5 cl'), I('fruit-passion', 'Fruit de la passion', '1'), I('sirop-vanille', 'Sirop de vanille', '1,5 cl'), I('citron-vert', 'Jus de citron vert', '1,5 cl'), I('prosecco', 'Prosecco (à côté)', '6 cl', true)],
    steps: ['Vider la moitié du fruit de la passion dans le shaker.', 'Ajouter vodka, vanille, citron vert et glaçons, secouer.', 'Filtrer dans une coupe, poser l\'autre demi-fruit dessus.', 'Servir le prosecco à part, dans un petit verre.'],
    astuce: 'Le shot de bulles se boit entre deux gorgées, pas dedans.',
    alcool: 'vodka', humeur: 'tropical' });

  C({ id: 'mudslide', nom: 'Mudslide', cat: 'digestif', ico: '🍫', vis: 'liqueur-creme',
    desc: 'Vodka, café et crème irlandaise : un dessert glacé en verre.',
    verre: 'Old fashioned', tech: 'Shaké', abv: '≈ 18 %', temps: '2 min', tag: ['Dessert', 'Crémeux'],
    ing: [I('vodka', 'Vodka', '3 cl'), I('liqueur-cafe', 'Liqueur de café', '3 cl'), I('liqueur-creme', 'Liqueur de crème', '3 cl'), I('creme-liquide', 'Crème liquide', '3 cl', true)],
    steps: ['Secouer avec des glaçons.', 'Verser sur glace.', 'Râper un peu de chocolat par-dessus si tu en as.'],
    astuce: 'Mixé avec une boule de glace vanille, ça devient un milkshake pour grands.',
    alcool: 'vodka', humeur: 'gourmand' });

  C({ id: 'long-island', nom: 'Long Island Iced Tea', cat: 'fruite', ico: '🥤', vis: 'cocktails',
    desc: 'Cinq alcools, pas une goutte de thé. Le goût d\'un thé glacé, la force d\'un double.',
    verre: 'Highball', tech: 'Construit (build)', abv: '≈ 22 %', temps: '3 min', tag: ['Fort', 'Soirée'],
    ing: [I('vodka', 'Vodka', '1,5 cl'), I('gin', 'Gin', '1,5 cl'), I('rhum-blanc', 'Rhum blanc', '1,5 cl'), I('tequila', 'Tequila', '1,5 cl'), I('triple-sec', 'Triple sec', '1,5 cl'), I('citron-jaune', 'Jus de citron jaune', '2,5 cl'), I('sirop-sucre', 'Sirop de sucre', '3 cl'), I('cola', 'Cola', 'pour compléter')],
    steps: ['Verser tous les alcools, le citron et le sirop sur glace.', 'Compléter d\'un trait de cola, juste pour la couleur.', 'Remuer.'],
    astuce: 'Il se boit comme un soda et tape comme un whisky : un seul suffit.',
    alcool: 'vodka', humeur: 'frais' });

  /* ================= Rhum et cachaça ================= */
  C({ id: 'caipirinha', nom: 'Caipirinha', cat: 'classique', ico: '🇧🇷', vis: 'caipirinha',
    desc: 'Le cocktail national brésilien : cachaça, citron vert pilé et sucre.',
    verre: 'Old fashioned', tech: 'Pilé', abv: '≈ 20 %', temps: '3 min', tag: ['Frais', 'Citron vert'],
    ing: [I('cachaca', 'Cachaça', '6 cl'), I('citron-vert', 'Citron vert en quartiers', '1'), I('sucre', 'Sucre en poudre', '4 cuillères à café')],
    steps: ['Couper le citron vert en 8 et le mettre dans le verre avec le sucre.', 'Piler fermement pour extraire le jus.', 'Remplir de glace pilée, verser la cachaça et remuer.'],
    astuce: 'Retire la partie blanche au centre du citron : c\'est elle qui rend le cocktail amer.',
    alcool: 'autre', humeur: 'frais' });

  C({ id: 'mai-tai', nom: 'Mai Tai', cat: 'fruite', ico: '🌺', vis: 'cocktail-exotique',
    desc: 'La star du tiki : deux rhums, amande et citron vert. Californie, 1944.',
    verre: 'Old fashioned', tech: 'Shaké', abv: '≈ 20 %', temps: '3 min', tag: ['Tiki', 'Amande'],
    ing: [I('rhum-blanc', 'Rhum blanc', '4 cl'), I('rhum-ambre', 'Rhum ambré', '2 cl'), I('triple-sec', 'Triple sec (curaçao orange)', '1,5 cl'), I('sirop-orgeat', "Sirop d'orgeat", '1,5 cl'), I('citron-vert', 'Jus de citron vert', '1 cl'), O('Menthe', '1 brin')],
    steps: ['Secouer le rhum blanc, le triple sec, l\'orgeat et le citron vert.', 'Verser sur glace pilée.', 'Faire flotter le rhum ambré par-dessus.', 'Décorer de menthe.'],
    astuce: "L'orgeat, c'est le goût d'amande : sans lui, ce n'est pas un Mai Tai.",
    alcool: 'rhum', humeur: 'tropical' });

  C({ id: 'dark-n-stormy', nom: "Dark 'n' Stormy", cat: 'fruite', ico: '⛈️', vis: 'cocktails',
    desc: 'Rhum ambré sur ginger beer : un nuage d\'orage dans le verre. Bermudes.',
    verre: 'Highball', tech: 'Construit (build)', abv: '≈ 10 %', temps: '2 min', tag: ['Gingembre', 'Facile'],
    ing: [I('rhum-ambre', 'Rhum ambré', '6 cl'), I('ginger-beer', 'Ginger beer', '10 cl'), I('citron-vert', 'Quartier de citron vert', '1', true)],
    steps: ['Remplir le verre de glaçons et de ginger beer.', 'Verser le rhum doucement pour qu\'il flotte.'],
    astuce: 'Le rhum versé en dernier sur le dos d\'une cuillère fait le nuage noir.',
    alcool: 'rhum', humeur: 'frais' });

  C({ id: 'cuba-libre', nom: 'Cuba Libre', cat: 'classique', ico: '🥃', vis: 'cocktails',
    desc: 'Rhum, cola et citron vert. Plus qu\'un rhum-coca, grâce au citron.',
    verre: 'Highball', tech: 'Construit (build)', abv: '≈ 10 %', temps: '1 min', tag: ['Facile', 'Soirée'],
    ing: [I('rhum-blanc', 'Rhum blanc', '5 cl'), I('cola', 'Cola', '12 cl'), I('citron-vert', 'Jus de citron vert', '1 cl')],
    steps: ['Presser le citron vert dans le verre.', 'Remplir de glaçons, verser le rhum.', 'Compléter au cola.'],
    astuce: 'Laisse tomber le quartier pressé dans le verre : l\'écorce parfume tout.',
    alcool: 'rhum', humeur: 'frais' });

  C({ id: 'planters-punch', nom: "Planter's Punch", cat: 'fruite', ico: '🍹', vis: 'cocktail-exotique',
    desc: 'Le punch jamaïcain : rhum ambré, agrumes, ananas et grenadine.',
    verre: 'Highball', tech: 'Shaké', abv: '≈ 12 %', temps: '3 min', tag: ['Tropical', 'Long'],
    ing: [I('rhum-ambre', 'Rhum ambré', '4,5 cl'), I('jus-orange', "Jus d'orange", '3,5 cl'), I('jus-ananas', "Jus d'ananas", '3,5 cl'), I('citron-jaune', 'Jus de citron jaune', '2 cl'), I('grenadine', 'Grenadine', '1 cl'), I('sirop-sucre', 'Sirop de sucre', '1 cl'), I('angostura', 'Angostura', '2 traits', true)],
    steps: ['Secouer tous les ingrédients avec des glaçons.', 'Verser dans un grand verre plein de glace.'],
    astuce: 'La vieille règle jamaïcaine : un acide, deux sucres, trois forts, quatre faibles.',
    alcool: 'rhum', humeur: 'tropical' });

  C({ id: 'ti-punch', nom: "Ti' punch", cat: 'classique', ico: '🏝️', vis: 'rhum-arrange',
    desc: 'Le rituel antillais : rhum, citron vert et sucre de canne. Chacun le fait comme il veut.',
    verre: 'Petit verre', tech: 'Construit (build)', abv: '≈ 40 %', temps: '1 min', tag: ['Court', 'Antilles'],
    ing: [I('rhum-blanc', 'Rhum blanc agricole', '5 cl'), I('citron-vert', 'Rondelle de citron vert', '1'), I('sirop-canne', 'Sirop de canne', '1 cuillère')],
    steps: ['Presser la rondelle de citron vert dans le verre.', 'Ajouter le sirop de canne et remuer.', 'Verser le rhum, sans glace.'],
    astuce: '« Chacun prépare sa propre mort » : on sert les ingrédients, chacun dose.',
    alcool: 'rhum', humeur: 'corse' });

  C({ id: 'blue-hawaiian', nom: 'Blue Hawaiian', cat: 'fruite', ico: '🌊', vis: 'cocktail-exotique',
    desc: 'Une piña colada bleue : rhum, ananas, coco et curaçao.',
    verre: 'Hurricane', tech: 'Shaké', abv: '≈ 10 %', temps: '3 min', tag: ['Tropical', 'Crémeux'],
    ing: [I('rhum-blanc', 'Rhum blanc', '3 cl'), I('blue-curacao', 'Curaçao bleu', '1,5 cl'), I('jus-ananas', "Jus d'ananas", '6 cl'), I('creme-coco', 'Crème de coco', '3 cl')],
    steps: ['Secouer fort avec des glaçons.', 'Verser dans un grand verre plein de glace.'],
    astuce: 'Secoue longtemps : la coco doit être parfaitement émulsionnée.',
    alcool: 'rhum', humeur: 'tropical' });

  /* ================= Tequila ================= */
  C({ id: 'tommys-margarita', nom: "Tommy's Margarita", cat: 'classique', ico: '🌵', vis: 'cocktails',
    desc: "La Margarita sans triple sec, au sirop d'agave. Plus nette, plus tequila.",
    verre: 'Old fashioned', tech: 'Shaké', abv: '≈ 20 %', temps: '2 min', tag: ['Agave', 'Acidulé'],
    ing: [I('tequila', 'Tequila', '6 cl'), I('citron-vert', 'Jus de citron vert', '3 cl'), I('sirop-agave', "Sirop d'agave", '1,5 cl')],
    steps: ['Secouer avec des glaçons.', 'Filtrer sur glace, bord salé si tu veux.'],
    astuce: "L'agave vient de la même plante que la tequila : ils se répondent au lieu de se couvrir.",
    alcool: 'tequila', humeur: 'frais' });

  C({ id: 'el-diablo', nom: 'El Diablo', cat: 'fruite', ico: '😈', vis: 'jus-rouge',
    desc: 'Tequila, cassis, citron vert et ginger beer. Rouge, piquant, étonnant.',
    verre: 'Highball', tech: 'Construit (build)', abv: '≈ 10 %', temps: '2 min', tag: ['Fruité', 'Gingembre'],
    ing: [I('tequila', 'Tequila', '4,5 cl'), I('creme-cassis', 'Crème de cassis', '1,5 cl'), I('citron-vert', 'Jus de citron vert', '1,5 cl'), I('ginger-beer', 'Ginger beer', '10 cl')],
    steps: ['Verser la tequila et le citron vert sur glace.', 'Compléter à la ginger beer.', 'Faire couler le cassis par-dessus.'],
    astuce: 'Le cassis en dernier dessine un voile rouge : on remue à table.',
    alcool: 'tequila', humeur: 'tropical' });

  /* ================= Whisky ================= */
  C({ id: 'boulevardier', nom: 'Boulevardier', cat: 'classique', ico: '🎩', vis: 'whisky-miel',
    desc: 'Le Negroni au bourbon : plus rond, plus chaud. Paris, années 20.',
    verre: 'Old fashioned', tech: 'Remué', abv: '≈ 26 %', temps: '2 min', tag: ['Amer', 'Hiver'],
    ing: [I('bourbon', 'Bourbon', '4,5 cl'), I('campari', 'Campari', '3 cl'), I('vermouth-rouge', 'Vermouth rouge', '3 cl'), O("Zeste d'orange", '1')],
    steps: ['Remuer les trois ingrédients avec des glaçons.', 'Filtrer sur un gros glaçon.', "Exprimer le zeste d'orange au-dessus."],
    astuce: 'Un peu plus de bourbon que de Campari : c\'est ce qui l\'arrondit.',
    alcool: 'whisky', humeur: 'corse' });

  C({ id: 'mint-julep', nom: 'Mint Julep', cat: 'classique', ico: '🌱', vis: 'mojito',
    desc: 'Bourbon, menthe et sucre sur glace pilée. Le cocktail du Kentucky Derby.',
    verre: 'Timbale ou old fashioned', tech: 'Pilé', abv: '≈ 25 %', temps: '3 min', tag: ['Menthe', 'Été'],
    ing: [I('bourbon', 'Bourbon', '6 cl'), I('menthe', 'Feuilles de menthe', '8'), I('sirop-sucre', 'Sirop de sucre', '1,5 cl')],
    steps: ['Presser doucement la menthe avec le sirop au fond du verre.', 'Remplir de glace pilée, verser le bourbon.', 'Remuer jusqu\'à ce que le verre givre.'],
    astuce: 'Tape le brin de menthe du décor sur ta main avant de le poser : il libère son parfum.',
    alcool: 'whisky', humeur: 'frais' });

  C({ id: 'irish-coffee', nom: 'Irish coffee', cat: 'digestif', ico: '☕', vis: 'cold-brew',
    desc: 'Café chaud, whisky et sucre sous une couche de crème fraîche. Irlande, 1943.',
    verre: 'Verre à pied chaud', tech: 'Construit (build)', abv: '≈ 10 %', temps: '4 min', tag: ['Chaud', 'Café'],
    ing: [I('whisky', 'Whisky irlandais', '4 cl'), I('espresso', 'Café chaud', '9 cl'), I('sucre', 'Sucre roux', '2 cuillères à café'), I('creme-liquide', 'Crème liquide', '3 cl')],
    steps: ['Ébouillanter le verre puis le vider.', 'Dissoudre le sucre dans le café chaud, ajouter le whisky.', 'Faire flotter la crème à peine fouettée sur le dos d\'une cuillère.'],
    astuce: 'Le sucre est indispensable : sans lui, la crème coule au fond.',
    alcool: 'whisky', humeur: 'gourmand' });

  C({ id: 'godfather', nom: 'Godfather', cat: 'digestif', ico: '🎬', vis: 'whisky-miel',
    desc: 'Whisky et amaretto sur glace. Le digestif du Parrain.',
    verre: 'Old fashioned', tech: 'Construit (build)', abv: '≈ 32 %', temps: '1 min', tag: ['Amande', 'Court'],
    ing: [I('whisky', 'Whisky', '3,5 cl'), I('amaretto', 'Amaretto', '3,5 cl')],
    steps: ['Verser sur un gros glaçon.', 'Remuer 10 secondes.'],
    astuce: 'Remplace le whisky par de la vodka et tu as un Godmother, plus doux.',
    alcool: 'whisky', humeur: 'corse' });

  C({ id: 'penicillin', nom: 'Penicillin', cat: 'signature', ico: '🍯', vis: 'whisky-miel',
    desc: 'Whisky, citron, miel et gingembre : un grog glacé. New York, 2005.',
    verre: 'Old fashioned', tech: 'Shaké', abv: '≈ 20 %', temps: '3 min', tag: ['Miel', 'Gingembre'],
    ing: [I('whisky', 'Whisky', '6 cl'), I('citron-jaune', 'Jus de citron jaune', '2,25 cl'), I('sirop-miel', 'Sirop de miel', '2,25 cl'), I('gingembre', 'Gingembre frais', '3 rondelles')],
    steps: ['Écraser le gingembre dans le shaker.', 'Ajouter whisky, citron, miel et glaçons, secouer.', 'Filtrer sur un gros glaçon.'],
    astuce: 'Sirop de miel : moitié miel, moitié eau chaude, mélangé. Le miel pur ne se dissout pas à froid.',
    alcool: 'whisky', humeur: 'frais' });

  /* ================= Autres bases ================= */
  C({ id: 'sidecar', nom: 'Sidecar', cat: 'classique', ico: '🏍️', vis: 'cocktails',
    desc: 'Cognac, triple sec et citron. Le grand classique français, né à Paris après 1918.',
    verre: 'Coupe', tech: 'Shaké', abv: '≈ 25 %', temps: '3 min', tag: ['Chic', 'Citronné'],
    ing: [I('cognac', 'Cognac', '5 cl'), I('triple-sec', 'Triple sec', '2 cl'), I('citron-jaune', 'Jus de citron jaune', '2 cl'), O('Sucre pour le bord', '1 assiette')],
    steps: ['Givrer le bord de la coupe au sucre, si tu veux.', 'Secouer avec des glaçons.', 'Filtrer dans la coupe.'],
    astuce: 'Un cognac VS suffit : les notes fines d\'un XO se perdent dans le citron.',
    alcool: 'autre', humeur: 'chic' });

  C({ id: 'pisco-sour', nom: 'Pisco sour', cat: 'classique', ico: '🇵🇪', vis: 'citronnade',
    desc: 'Pisco, citron vert, sucre et blanc d\'œuf. Mousseux, acidulé, péruvien.',
    verre: 'Coupe', tech: 'Shaké', abv: '≈ 18 %', temps: '3 min', tag: ['Mousseux', 'Acidulé'],
    ing: [I('pisco', 'Pisco', '6 cl'), I('citron-vert', 'Jus de citron vert', '3 cl'), I('sirop-sucre', 'Sirop de sucre', '2 cl'), I('blanc-oeuf', "Blanc d'œuf", '1'), I('angostura', 'Angostura', '3 gouttes', true)],
    steps: ['Secouer sans glace pour monter la mousse.', 'Ajouter la glace et secouer encore.', 'Filtrer dans une coupe, déposer trois gouttes d\'Angostura sur la mousse.'],
    astuce: 'Les gouttes d\'Angostura parfument chaque gorgée par le nez.',
    alcool: 'autre', humeur: 'frais' });

  C({ id: 'amaretto-sour', nom: 'Amaretto sour', cat: 'digestif', ico: '🍒', vis: 'liqueur-creme',
    desc: 'Amande, citron et mousse : doux sans être écœurant, grâce à l\'acidité.',
    verre: 'Old fashioned', tech: 'Shaké', abv: '≈ 14 %', temps: '3 min', tag: ['Amande', 'Mousseux'],
    ing: [I('amaretto', 'Amaretto', '4 cl'), I('citron-jaune', 'Jus de citron jaune', '3 cl'), I('sirop-sucre', 'Sirop de sucre', '1 cl'), I('blanc-oeuf', "Blanc d'œuf", '1', true)],
    steps: ['Secouer sans glace, puis avec glace.', 'Filtrer sur glace.', 'Décorer d\'une cerise.'],
    astuce: 'Ajoute 1,5 cl de bourbon : l\'amaretto devient moins sucré et plus profond.',
    alcool: 'autre', humeur: 'gourmand' });

  C({ id: 'b52', nom: 'B-52', cat: 'digestif', ico: '🎯', vis: 'liqueur-creme',
    desc: 'Trois couches parfaites dans un verre à shot : café, crème, orange.',
    verre: 'Verre à shot', tech: 'Superposé', abv: '≈ 25 %', temps: '3 min', tag: ['Shot', 'Dessert'],
    ing: [I('liqueur-cafe', 'Liqueur de café', '2 cl'), I('liqueur-creme', 'Liqueur de crème', '2 cl'), I('triple-sec', 'Triple sec (Grand Marnier)', '2 cl')],
    steps: ['Verser la liqueur de café au fond.', 'Faire couler la crème très doucement sur le dos d\'une cuillère.', 'Terminer par le triple sec de la même façon.'],
    astuce: 'La cuillère touche la paroi, juste au-dessus du liquide : les couches ne se mélangent pas.',
    alcool: 'autre', humeur: 'gourmand' });

  C({ id: 'americano', nom: 'Americano', cat: 'classique', ico: '🇮🇹', vis: 'cocktails',
    desc: "L'ancêtre du Negroni : Campari, vermouth et eau gazeuse. Léger, amer, milanais.",
    verre: 'Old fashioned', tech: 'Construit (build)', abv: '≈ 10 %', temps: '1 min', tag: ['Amer', 'Léger'],
    ing: [I('campari', 'Campari', '3 cl'), I('vermouth-rouge', 'Vermouth rouge', '3 cl'), I('eau-gazeuse', 'Eau gazeuse', '6 cl'), O("Demi-tranche d'orange", '1')],
    steps: ['Verser le Campari et le vermouth sur glace.', "Compléter à l'eau gazeuse.", "Ajouter l'orange."],
    astuce: 'Le premier cocktail commandé par James Bond, dans Casino Royale.',
    alcool: 'autre', humeur: 'corse' });

  C({ id: 'garibaldi', nom: 'Garibaldi', cat: 'fruite', ico: '🍊', vis: 'jus-rouge',
    desc: 'Campari et jus d\'orange fouetté, mousseux comme un nuage.',
    verre: 'Highball', tech: 'Construit (build)', abv: '≈ 8 %', temps: '2 min', tag: ['Amer', 'Brunch'],
    ing: [I('campari', 'Campari', '4 cl'), I('jus-orange', "Jus d'orange frais", '12 cl')],
    steps: ['Verser le Campari sur glace.', "Mixer ou secouer le jus d'orange pour le rendre mousseux.", 'Le verser par-dessus.'],
    astuce: "Le secret, c'est le jus fouetté : il devient aérien et adoucit l'amertume.",
    alcool: 'autre', humeur: 'frais' });
})();
