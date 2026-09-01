/* ============================================================
   EVER — Table d'aliments courants

   Open Food Facts ne connait que des produits emballes avec un
   code-barres. Un kebab, une part de lasagnes, une assiette de
   riz : rien de tout ca n'y figure, et c'etait le trou noir de la
   recherche.

   Cette table comble exactement ce trou. Elle couvre ce qu'on
   mange vraiment : plats du midi, street food, viandes, legumes,
   fruits, laitages, desserts, boissons, sauces.

   Toutes les valeurs sont pour 100 g ou 100 ml TELS QUE SERVIS
   (donc cuits pour ce qui se cuit). Ce sont des ordres de grandeur
   solides, pas des mesures de laboratoire : ils viennent des
   moyennes publiques du type CIQUAL et des tables de composition
   usuelles.

   Champs :
     n  nom affiche          a  autres facons de le chercher
     c  categorie            p  portion proposee par defaut (g/ml)
     u  unite                k  kcal / 100
     pr proteines (g)        gl glucides (g)     li lipides (g)
     fi fibres (g)           su sucres (g)       so sodium (mg)
   ============================================================ */
(function (global) {
  'use strict';

  const CATS = {
    plat:      'Plats',
    sandwich:  'Sandwichs et street food',
    viande:    'Viandes et œufs',
    poisson:   'Poissons et fruits de mer',
    feculent:  'Féculents et pains',
    legume:    'Légumes',
    fruit:     'Fruits et fruits secs',
    laitier:   'Produits laitiers',
    petitdej:  'Petit déjeuner',
    entree:    'Entrées et accompagnements',
    dessert:   'Desserts et sucré',
    snack:     'Snacks',
    boisson:   'Boissons',
    sauce:     'Sauces et matières grasses'
  };

  /* n, a, c, p, u, k, pr, gl, li, fi, su, so */
  const L = [
    /* ---------- Sandwichs et street food ---------- */
    ['Kebab', 'grec durum sandwich turc', 'sandwich', 350, 'g', 215, 12, 20, 10, 1.5, 2, 520],
    ['Assiette kebab', 'grec assiette', 'sandwich', 450, 'g', 185, 13, 16, 9, 1.5, 2, 480],
    ['Tacos français', 'french tacos', 'sandwich', 400, 'g', 250, 11, 24, 12, 1.6, 2, 560],
    ['Burger classique', 'hamburger', 'sandwich', 220, 'g', 250, 13, 22, 12, 1.4, 4, 480],
    ['Cheeseburger', '', 'sandwich', 200, 'g', 265, 14, 22, 13, 1.3, 5, 560],
    ['Burger double viande', 'double cheese', 'sandwich', 280, 'g', 285, 17, 19, 16, 1.2, 5, 590],
    ['Hot-dog', '', 'sandwich', 150, 'g', 250, 10, 24, 13, 1.2, 4, 700],
    ['Sandwich jambon-beurre', 'parisien', 'sandwich', 200, 'g', 240, 11, 32, 8, 2, 2, 700],
    ['Sandwich poulet crudités', '', 'sandwich', 220, 'g', 200, 12, 24, 6, 2, 3, 520],
    ['Sandwich thon mayonnaise', '', 'sandwich', 220, 'g', 235, 11, 25, 10, 1.8, 3, 560],
    ['Panini fromage', '', 'sandwich', 200, 'g', 280, 12, 30, 12, 1.8, 3, 620],
    ['Croque-monsieur', '', 'sandwich', 180, 'g', 280, 15, 24, 14, 1.5, 3, 720],
    ['Wrap poulet', 'galette poulet', 'sandwich', 250, 'g', 220, 12, 24, 8, 2, 3, 500],
    ['Pizza margherita', '', 'sandwich', 300, 'g', 265, 11, 31, 10, 2, 3, 620],
    ['Pizza reine', 'jambon champignons', 'sandwich', 300, 'g', 250, 12, 29, 9, 2, 3, 640],
    ['Pizza quatre fromages', '', 'sandwich', 300, 'g', 300, 14, 28, 15, 1.8, 3, 700],
    ['Pizza pepperoni', 'chorizo', 'sandwich', 300, 'g', 290, 13, 29, 13, 1.8, 3, 720],
    ['Frites', 'pommes frites', 'sandwich', 150, 'g', 310, 4, 39, 15, 3.5, 0.5, 220],
    ['Nuggets de poulet', '', 'sandwich', 100, 'g', 300, 15, 17, 19, 1, 0.6, 540],
    ['Tenders panés', 'poulet pane', 'sandwich', 130, 'g', 260, 19, 15, 14, 1, 0.6, 520],
    ['Falafels', '', 'sandwich', 120, 'g', 330, 13, 32, 17, 5, 2, 380],
    ['Samoussa', 'samosa', 'sandwich', 60, 'g', 300, 8, 30, 16, 2.5, 2, 420],
    ['Nems', 'rouleau de printemps frit', 'sandwich', 100, 'g', 240, 9, 26, 11, 1.5, 3, 450],
    ['Empanada', '', 'sandwich', 120, 'g', 270, 9, 28, 13, 1.8, 2, 430],

    /* ---------- Plats ---------- */
    ['Lasagnes bolognaise', '', 'plat', 350, 'g', 145, 8, 13, 6.5, 1.2, 3, 340],
    ['Spaghetti bolognaise', 'pates a la sauce tomate viande', 'plat', 350, 'g', 130, 7, 16, 4, 1.5, 3, 300],
    ['Pâtes carbonara', '', 'plat', 300, 'g', 180, 8, 20, 7.5, 1.2, 2, 380],
    ['Pâtes au pesto', '', 'plat', 300, 'g', 200, 7, 24, 8.5, 1.5, 2, 300],
    ['Pâtes au beurre', 'nouilles nature', 'plat', 300, 'g', 165, 5, 26, 4.5, 1.4, 1, 180],
    ['Risotto', '', 'plat', 300, 'g', 150, 4.5, 21, 5, 0.8, 1, 380],
    ['Riz cantonais', '', 'plat', 300, 'g', 160, 6, 22, 5, 1, 1.5, 400],
    ['Poulet curry riz', 'curry de poulet', 'plat', 350, 'g', 145, 10, 15, 4.5, 1, 2, 360],
    ['Pad thaï', '', 'plat', 350, 'g', 180, 8, 24, 6, 1.5, 5, 480],
    ['Bo bun', '', 'plat', 400, 'g', 130, 7, 17, 3.5, 1.5, 4, 380],
    ['Ramen', 'nouilles japonaises bouillon', 'plat', 500, 'g', 110, 6, 13, 3.5, 1, 1, 520],
    ['Sushis assortis', 'sushi', 'plat', 250, 'g', 145, 7, 24, 2, 0.8, 4, 380],
    ['Makis saumon', 'maki', 'plat', 200, 'g', 150, 6, 27, 1.8, 0.8, 4, 350],
    ['California rolls', '', 'plat', 200, 'g', 160, 5.5, 27, 3.2, 1, 5, 340],
    ['Poke bowl saumon', 'poke', 'plat', 400, 'g', 150, 9, 18, 4.5, 1.5, 3, 320],
    ['Couscous royal', 'couscous', 'plat', 400, 'g', 150, 9, 17, 5, 2, 2, 380],
    ['Tajine de poulet', 'tajine', 'plat', 350, 'g', 120, 11, 9, 4, 1.6, 4, 350],
    ['Chili con carne', '', 'plat', 300, 'g', 130, 9, 12, 5, 3.5, 3, 380],
    ['Hachis parmentier', '', 'plat', 350, 'g', 130, 8, 13, 5, 1.4, 2, 340],
    ['Gratin dauphinois', '', 'plat', 250, 'g', 160, 4, 15, 9, 1.4, 2, 260],
    ['Quiche lorraine', 'quiche', 'plat', 200, 'g', 280, 10, 21, 17, 1, 2, 560],
    ['Blanquette de veau', '', 'plat', 350, 'g', 130, 12, 5, 7, 0.6, 1, 330],
    ['Bœuf bourguignon', '', 'plat', 300, 'g', 140, 14, 5, 7, 0.8, 2, 350],
    ['Cassoulet', '', 'plat', 350, 'g', 160, 10, 13, 7.5, 4, 1, 480],
    ['Choucroute garnie', '', 'plat', 400, 'g', 140, 9, 5, 9, 2.5, 1.5, 620],
    ['Raclette', '', 'plat', 300, 'g', 250, 16, 6, 18, 1, 1, 620],
    ['Tartiflette', '', 'plat', 350, 'g', 180, 8, 12, 11, 1.4, 1.5, 420],
    ['Paella', '', 'plat', 350, 'g', 145, 9, 18, 4, 1, 1.5, 450],
    ['Moussaka', '', 'plat', 320, 'g', 135, 8, 8, 8, 1.8, 3, 340],
    ['Poulet rôti et frites', '', 'plat', 400, 'g', 230, 14, 22, 10, 2, 1, 360],
    ['Steak frites', '', 'plat', 350, 'g', 235, 16, 20, 11, 2, 1, 340],
    ['Poisson pané et riz', '', 'plat', 320, 'g', 155, 11, 18, 4.5, 0.8, 1, 380],
    ['Omelette', 'omelette nature', 'plat', 130, 'g', 155, 11, 1, 12, 0, 1, 320],
    ['Croque-madame', '', 'plat', 220, 'g', 265, 15, 21, 14, 1.4, 3, 700],
    ['Salade César', 'cesar', 'plat', 300, 'g', 150, 9, 6, 10, 1.4, 2, 380],
    ['Salade composée', 'salade repas', 'plat', 300, 'g', 110, 6, 8, 6, 2, 3, 300],
    ['Soupe de légumes', 'soupe potage', 'plat', 300, 'ml', 40, 1.4, 6, 1, 1.6, 2.5, 280],
    ['Velouté de légumes', 'veloute', 'plat', 300, 'ml', 55, 1.8, 7, 2.2, 1.6, 3, 300],

    /* ---------- Viandes et oeufs ---------- */
    ['Escalope de poulet', 'blanc de poulet', 'viande', 150, 'g', 165, 31, 0, 4, 0, 0, 80],
    ['Cuisse de poulet', '', 'viande', 180, 'g', 200, 25, 0, 11, 0, 0, 90],
    ['Poulet rôti', '', 'viande', 200, 'g', 200, 27, 0, 10, 0, 0, 95],
    ['Steak haché 5 %', '', 'viande', 130, 'g', 140, 22, 0, 5.5, 0, 0, 75],
    ['Steak haché 15 %', '', 'viande', 130, 'g', 220, 20, 0, 15, 0, 0, 75],
    ['Entrecôte grillée', 'steak boeuf', 'viande', 200, 'g', 250, 26, 0, 16, 0, 0, 70],
    ['Côte de porc', '', 'viande', 180, 'g', 215, 26, 0, 12, 0, 0, 80],
    ['Escalope de dinde', '', 'viande', 150, 'g', 135, 29, 0, 2, 0, 0, 70],
    ['Merguez', '', 'viande', 120, 'g', 300, 15, 2, 26, 0, 0.5, 780],
    ['Saucisse de Toulouse', 'saucisse', 'viande', 120, 'g', 290, 15, 1, 25, 0, 0.5, 760],
    ['Jambon blanc', 'jambon', 'viande', 50, 'g', 110, 20, 1, 3, 0, 0.8, 900],
    ['Bacon', '', 'viande', 30, 'g', 400, 25, 1, 33, 0, 0.5, 1500],
    ['Saucisson sec', 'charcuterie', 'viande', 40, 'g', 450, 25, 2, 38, 0, 1, 1700],
    ['Chorizo', '', 'viande', 40, 'g', 450, 24, 2, 38, 0, 1, 1600],
    ['Pâté de campagne', 'pate terrine', 'viande', 50, 'g', 320, 14, 3, 28, 0, 1, 900],
    ['Foie gras', '', 'viande', 40, 'g', 460, 11, 4, 45, 0, 3, 700],
    ['Œuf', 'oeuf dur oeuf au plat', 'viande', 60, 'g', 145, 13, 0.5, 10, 0, 0.4, 130],
    ["Blanc d'œuf", '', 'viande', 60, 'g', 50, 11, 0.7, 0.2, 0, 0.7, 165],
    ['Tofu nature', 'tofu', 'viande', 120, 'g', 120, 12, 2, 7, 1, 0.5, 15],
    ['Steak végétal', 'galette vegetale', 'viande', 120, 'g', 190, 17, 8, 9, 4, 1, 480],

    /* ---------- Poissons et fruits de mer ---------- */
    ['Saumon cuit', 'pave de saumon', 'poisson', 150, 'g', 200, 22, 0, 12, 0, 0, 65],
    ['Saumon fumé', '', 'poisson', 60, 'g', 180, 22, 0.5, 10, 0, 0.5, 1200],
    ['Cabillaud', 'colin lieu poisson blanc', 'poisson', 150, 'g', 85, 19, 0, 0.8, 0, 0, 90],
    ['Thon au naturel', 'thon en boite', 'poisson', 100, 'g', 115, 26, 0, 1, 0, 0, 340],
    ["Sardines à l'huile", 'sardines', 'poisson', 80, 'g', 220, 24, 0, 14, 0, 0, 500],
    ['Crevettes', 'gambas', 'poisson', 120, 'g', 100, 21, 0.5, 1.5, 0, 0, 400],
    ['Moules marinières', 'moules', 'poisson', 300, 'g', 90, 12, 4, 2.5, 0, 0.5, 380],
    ['Huîtres', '', 'poisson', 100, 'g', 70, 9, 3, 2, 0, 0, 380],
    ['Truite', '', 'poisson', 150, 'g', 145, 21, 0, 6.5, 0, 0, 60],
    ['Poisson pané', 'batonnet de poisson', 'poisson', 130, 'g', 210, 14, 17, 10, 1, 1, 450],

    /* ---------- Feculents et pains ---------- */
    ['Riz blanc cuit', 'riz', 'feculent', 200, 'g', 130, 2.7, 28, 0.3, 0.4, 0.1, 2],
    ['Riz complet cuit', '', 'feculent', 200, 'g', 120, 2.6, 25, 1, 1.8, 0.4, 3],
    ['Pâtes cuites', 'spaghetti penne nature', 'feculent', 200, 'g', 135, 5, 26, 0.9, 1.8, 0.8, 3],
    ['Quinoa cuit', 'quinoa', 'feculent', 180, 'g', 120, 4.4, 21, 1.9, 2.8, 0.9, 7],
    ['Semoule cuite', 'boulgour', 'feculent', 180, 'g', 115, 3.8, 24, 0.4, 1.4, 0.2, 5],
    ['Pommes de terre vapeur', 'pomme de terre', 'feculent', 200, 'g', 85, 2, 18, 0.2, 1.8, 0.9, 8],
    ['Purée de pommes de terre', 'puree', 'feculent', 200, 'g', 90, 2, 13, 3, 1.4, 1.2, 250],
    ['Patate douce', '', 'feculent', 200, 'g', 90, 1.6, 20, 0.1, 3, 6, 55],
    ['Lentilles cuites', 'lentilles', 'feculent', 200, 'g', 115, 9, 17, 0.4, 7.9, 0.6, 5],
    ['Pois chiches cuits', 'pois chiches', 'feculent', 150, 'g', 140, 8, 20, 2.6, 7.6, 1, 8],
    ['Haricots rouges cuits', 'haricots rouges', 'feculent', 150, 'g', 120, 8, 18, 0.5, 7, 0.6, 6],
    ['Baguette', 'pain', 'feculent', 60, 'g', 270, 9, 55, 1.3, 2.7, 2, 600],
    ['Pain complet', '', 'feculent', 60, 'g', 240, 9.5, 42, 3, 6, 3, 480],
    ['Pain de mie', '', 'feculent', 60, 'g', 265, 8, 47, 4.5, 3, 5, 500],
    ['Biscottes', 'biscotte', 'feculent', 30, 'g', 390, 11, 72, 6, 4, 5, 620],
    ['Tortilla de blé', 'wrap galette', 'feculent', 60, 'g', 300, 8, 50, 7, 3, 2, 600],
    ['Pain pita', 'pita', 'feculent', 70, 'g', 275, 9, 55, 1.2, 2.5, 2, 530],
    ['Galette de riz soufflée', 'galette de riz', 'feculent', 10, 'g', 380, 8, 81, 3, 2, 0.5, 10],

    /* ---------- Legumes ---------- */
    ['Tomate', 'tomates', 'legume', 120, 'g', 18, 0.9, 3, 0.2, 1.2, 2.6, 5],
    ['Concombre', '', 'legume', 120, 'g', 15, 0.6, 2, 0.1, 0.7, 1.7, 3],
    ['Salade verte', 'laitue salade', 'legume', 60, 'g', 15, 1.3, 1.4, 0.2, 1.3, 0.8, 10],
    ['Carotte', 'carottes', 'legume', 120, 'g', 35, 0.8, 6.5, 0.2, 2.8, 5, 60],
    ['Courgette', 'courgettes', 'legume', 150, 'g', 17, 1.3, 2, 0.3, 1.1, 2, 8],
    ['Aubergine', '', 'legume', 150, 'g', 25, 1, 3.5, 0.2, 3, 2.4, 3],
    ['Poivron', 'poivrons', 'legume', 120, 'g', 26, 1, 4.6, 0.3, 1.7, 3.5, 4],
    ['Brocoli', 'brocolis', 'legume', 150, 'g', 34, 2.8, 3, 0.4, 3.3, 1.5, 33],
    ['Chou-fleur', '', 'legume', 150, 'g', 25, 2, 2.5, 0.3, 2.4, 1.9, 30],
    ['Haricots verts', '', 'legume', 150, 'g', 31, 1.8, 4, 0.2, 3.4, 1.5, 6],
    ['Épinards', 'epinard', 'legume', 150, 'g', 23, 2.9, 1.4, 0.4, 2.2, 0.4, 79],
    ['Petits pois', '', 'legume', 150, 'g', 80, 5.4, 10, 0.4, 5, 4, 5],
    ['Maïs', 'mais doux', 'legume', 100, 'g', 90, 3.3, 16, 1.2, 2.5, 4.5, 15],
    ['Champignons de Paris', 'champignons', 'legume', 120, 'g', 22, 3.1, 1, 0.3, 1.5, 1, 5],
    ['Oignon', 'oignons', 'legume', 60, 'g', 40, 1.1, 7.6, 0.1, 1.7, 4.2, 4],
    ['Poireau', 'poireaux', 'legume', 150, 'g', 30, 1.5, 4.5, 0.3, 2.5, 2.5, 20],
    ['Betterave', '', 'legume', 120, 'g', 43, 1.6, 8, 0.2, 2.8, 6.8, 78],
    ['Avocat', '', 'legume', 100, 'g', 160, 2, 2, 15, 6.7, 0.7, 7],
    ['Ratatouille', '', 'legume', 250, 'g', 60, 1.3, 5, 3.6, 2.2, 4, 250],
    ['Poêlée de légumes', 'legumes cuits', 'legume', 250, 'g', 55, 2, 6, 2, 2.5, 3, 200],

    /* ---------- Fruits et fruits secs ---------- */
    ['Pomme', 'pommes', 'fruit', 150, 'g', 52, 0.3, 12, 0.2, 2.4, 10, 1],
    ['Banane', 'bananes', 'fruit', 120, 'g', 90, 1.1, 20, 0.3, 2.6, 12, 1],
    ['Orange', 'oranges', 'fruit', 180, 'g', 47, 0.9, 9, 0.1, 2.4, 9, 0],
    ['Clémentine', 'mandarine', 'fruit', 80, 'g', 47, 0.8, 10, 0.2, 1.7, 9, 1],
    ['Fraises', 'fraise', 'fruit', 150, 'g', 33, 0.7, 6, 0.3, 2, 4.9, 1],
    ['Framboises', 'framboise', 'fruit', 125, 'g', 52, 1.2, 5.4, 0.7, 6.5, 4.4, 1],
    ['Myrtilles', 'myrtille', 'fruit', 125, 'g', 57, 0.7, 12, 0.3, 2.4, 10, 1],
    ['Raisin', 'raisins', 'fruit', 150, 'g', 70, 0.7, 16, 0.2, 0.9, 16, 2],
    ['Poire', 'poires', 'fruit', 160, 'g', 57, 0.4, 12, 0.1, 3.1, 10, 1],
    ['Pêche', 'nectarine', 'fruit', 150, 'g', 39, 0.9, 8, 0.3, 1.5, 8, 0],
    ['Abricot', 'abricots', 'fruit', 100, 'g', 48, 1.4, 9, 0.4, 2, 9, 1],
    ['Kiwi', '', 'fruit', 100, 'g', 61, 1.1, 12, 0.5, 3, 9, 3],
    ['Ananas', '', 'fruit', 150, 'g', 50, 0.5, 12, 0.1, 1.4, 10, 1],
    ['Mangue', '', 'fruit', 150, 'g', 60, 0.8, 14, 0.4, 1.6, 14, 1],
    ['Melon', '', 'fruit', 200, 'g', 34, 0.8, 8, 0.2, 0.9, 8, 16],
    ['Pastèque', '', 'fruit', 250, 'g', 30, 0.6, 7, 0.2, 0.4, 6, 1],
    ['Citron', '', 'fruit', 60, 'g', 29, 1.1, 3, 0.3, 2.8, 2.5, 2],
    ['Dattes', 'datte', 'fruit', 40, 'g', 280, 2.5, 66, 0.4, 7, 63, 2],
    ['Pruneaux', 'pruneau', 'fruit', 40, 'g', 240, 2.2, 57, 0.4, 7, 38, 2],
    ['Amandes', 'amande', 'fruit', 30, 'g', 600, 21, 9, 51, 12, 4, 1],
    ['Noix', '', 'fruit', 30, 'g', 650, 15, 7, 63, 6.7, 2.6, 2],
    ['Noisettes', 'noisette', 'fruit', 30, 'g', 630, 15, 9, 61, 10, 4, 0],
    ['Cacahuètes', 'arachides', 'fruit', 30, 'g', 570, 26, 8, 47, 8.5, 4, 6],
    ['Pistaches', 'pistache', 'fruit', 30, 'g', 560, 20, 17, 45, 10, 8, 5],
    ['Noix de cajou', 'cajou', 'fruit', 30, 'g', 550, 18, 27, 44, 3.3, 6, 12],

    /* ---------- Produits laitiers ---------- */
    ['Lait entier', 'lait', 'laitier', 250, 'ml', 65, 3.2, 4.8, 3.6, 0, 4.8, 45],
    ['Lait demi-écrémé', '', 'laitier', 250, 'ml', 47, 3.3, 4.8, 1.6, 0, 4.8, 45],
    ['Yaourt nature', 'yaourt', 'laitier', 125, 'g', 60, 4, 5, 3.2, 0, 5, 50],
    ['Yaourt grec', '', 'laitier', 150, 'g', 100, 6, 4, 7, 0, 4, 40],
    ['Skyr', 'yaourt proteine', 'laitier', 150, 'g', 60, 11, 4, 0.2, 0, 4, 45],
    ['Fromage blanc 3 %', 'fromage blanc', 'laitier', 150, 'g', 75, 8, 4, 3, 0, 4, 45],
    ['Petit-suisse', '', 'laitier', 60, 'g', 145, 9, 3, 11, 0, 3, 40],
    ['Emmental', 'gruyere rape', 'laitier', 30, 'g', 370, 28, 0.5, 29, 0, 0.5, 350],
    ['Comté', '', 'laitier', 30, 'g', 410, 27, 0.5, 34, 0, 0.5, 480],
    ['Camembert', '', 'laitier', 40, 'g', 300, 20, 0.5, 24, 0, 0.5, 700],
    ['Mozzarella', '', 'laitier', 60, 'g', 250, 18, 1, 19, 0, 1, 400],
    ['Fromage de chèvre', 'chevre', 'laitier', 30, 'g', 300, 19, 2, 24, 0, 2, 500],
    ['Parmesan', '', 'laitier', 20, 'g', 400, 33, 0.5, 29, 0, 0.5, 650],
    ['Crème fraîche 30 %', 'creme fraiche', 'laitier', 30, 'g', 300, 2.5, 3, 30, 0, 3, 40],
    ['Crème légère 15 %', '', 'laitier', 30, 'g', 165, 3, 4, 15, 0, 4, 45],

    /* ---------- Petit dejeuner ---------- */
    ['Croissant', '', 'petitdej', 60, 'g', 400, 8, 44, 21, 2, 8, 480],
    ['Pain au chocolat', 'chocolatine', 'petitdej', 70, 'g', 420, 7, 45, 23, 2.4, 13, 420],
    ['Céréales chocolatées', 'cereales', 'petitdej', 40, 'g', 400, 7, 78, 5, 5, 25, 350],
    ['Muesli', '', 'petitdej', 50, 'g', 380, 10, 60, 9, 8, 15, 20],
    ["Flocons d'avoine", 'avoine porridge', 'petitdej', 50, 'g', 375, 13, 59, 7, 10, 1, 5],
    ['Granola', '', 'petitdej', 45, 'g', 450, 9, 60, 18, 7, 18, 30],
    ['Confiture', '', 'petitdej', 20, 'g', 260, 0.4, 63, 0.1, 1, 60, 10],
    ["Pâte à tartiner chocolat", 'nutella', 'petitdej', 20, 'g', 540, 6, 57, 31, 3.5, 56, 40],
    ['Beurre', '', 'petitdej', 10, 'g', 750, 0.8, 0.6, 83, 0, 0.6, 10],
    ['Miel', '', 'petitdej', 20, 'g', 320, 0.3, 80, 0, 0.2, 79, 4],

    /* ---------- Entrees et accompagnements ---------- */
    ['Taboulé', '', 'entree', 150, 'g', 150, 3.5, 24, 4, 2, 3, 380],
    ['Houmous', 'hummus', 'entree', 50, 'g', 300, 8, 15, 22, 6, 1, 400],
    ['Guacamole', '', 'entree', 50, 'g', 160, 2, 4, 15, 5, 1, 300],
    ['Tzatziki', '', 'entree', 50, 'g', 100, 3, 4, 8, 0.5, 3, 350],
    ['Coleslaw', 'salade de chou', 'entree', 100, 'g', 180, 1.4, 8, 15, 2, 6, 300],
    ['Salade de tomates', '', 'entree', 150, 'g', 45, 1, 4, 3, 1.4, 3, 200],
    ['Carottes râpées', '', 'entree', 120, 'g', 90, 0.8, 8, 6, 2.8, 6, 250],
    ["Œufs mimosa", '', 'entree', 100, 'g', 230, 10, 2, 20, 0, 1, 350],
    ['Bruschetta', '', 'entree', 100, 'g', 220, 6, 26, 10, 2, 3, 480],
    ['Chips', 'chips de pommes de terre', 'entree', 30, 'g', 540, 6, 50, 34, 4, 0.6, 500],
    ['Olives', '', 'entree', 40, 'g', 145, 1, 1, 15, 3, 0.5, 1500],

    /* ---------- Desserts et sucre ---------- */
    ['Chocolat noir', 'chocolat', 'dessert', 25, 'g', 550, 7, 45, 35, 10, 30, 15],
    ['Chocolat au lait', '', 'dessert', 25, 'g', 540, 7, 55, 31, 3, 52, 80],
    ['Barre chocolatee', 'snickers mars twix', 'dessert', 45, 'g', 480, 5, 60, 23, 2, 50, 180],
    ['Cookie', '', 'dessert', 40, 'g', 480, 6, 62, 23, 2.5, 35, 350],
    ['Biscuits secs', 'petit beurre biscuit', 'dessert', 30, 'g', 460, 7, 70, 17, 2.5, 25, 400],
    ['Bonbons', 'bonbon', 'dessert', 30, 'g', 350, 3, 82, 0.5, 0, 60, 40],
    ['Glace vanille', 'glace', 'dessert', 100, 'g', 200, 3.5, 24, 10, 0.5, 22, 80],
    ['Sorbet fruits', 'sorbet', 'dessert', 100, 'g', 130, 0.4, 32, 0.2, 0.5, 28, 15],
    ['Crêpe sucrée', 'crepe', 'dessert', 80, 'g', 220, 6, 33, 7, 1.2, 12, 250],
    ['Gaufre', '', 'dessert', 80, 'g', 300, 6, 40, 13, 1.5, 15, 350],
    ['Muffin', '', 'dessert', 80, 'g', 400, 6, 50, 20, 1.5, 30, 350],
    ['Brownie', '', 'dessert', 70, 'g', 450, 6, 52, 24, 3, 40, 250],
    ['Tarte aux pommes', 'tarte', 'dessert', 120, 'g', 240, 3, 33, 11, 2, 18, 180],
    ['Éclair au chocolat', 'eclair', 'dessert', 90, 'g', 280, 5, 32, 15, 1, 20, 180],
    ['Tiramisu', '', 'dessert', 120, 'g', 250, 5, 26, 14, 0.6, 20, 90],
    ['Mousse au chocolat', '', 'dessert', 100, 'g', 220, 5, 25, 11, 2, 22, 70],
    ['Riz au lait', '', 'dessert', 130, 'g', 130, 3.5, 20, 3.5, 0.3, 14, 60],
    ['Compote de pommes', 'compote', 'dessert', 100, 'g', 65, 0.3, 15, 0.2, 1.4, 14, 3],
    ['Crème dessert chocolat', 'danette', 'dessert', 100, 'g', 130, 3, 20, 4, 0.8, 17, 90],
    ["Pain d'épices", '', 'dessert', 40, 'g', 350, 4, 72, 4, 3, 40, 400],

    /* ---------- Snacks ---------- */
    ['Barre protéinée', 'barre proteine', 'snack', 60, 'g', 380, 30, 35, 12, 6, 8, 300],
    ['Poudre de protéine', 'whey shaker proteine', 'snack', 30, 'g', 380, 78, 6, 5, 1, 4, 300],
    ['Popcorn', '', 'snack', 30, 'g', 480, 7, 55, 25, 8, 1, 700],
    ['Crackers', 'tuc biscuit apero', 'snack', 30, 'g', 490, 8, 62, 22, 3, 5, 1100],
    ['Barre de céréales', '', 'snack', 25, 'g', 400, 5, 68, 11, 4, 28, 200],

    /* ---------- Boissons ---------- */
    ['Eau', '', 'boisson', 500, 'ml', 0, 0, 0, 0, 0, 0, 2],
    ['Café noir', 'cafe expresso', 'boisson', 100, 'ml', 2, 0.2, 0, 0, 0, 0, 2],
    ['Café au lait', 'latte cappuccino', 'boisson', 200, 'ml', 40, 2.4, 3.6, 1.8, 0, 3.6, 35],
    ['Thé', 'infusion', 'boisson', 250, 'ml', 1, 0, 0.2, 0, 0, 0, 2],
    ['Coca-Cola', 'soda cola', 'boisson', 330, 'ml', 42, 0, 10.6, 0, 0, 10.6, 5],
    ['Soda zero', 'coca zero light', 'boisson', 330, 'ml', 0.3, 0, 0, 0, 0, 0, 8],
    ["Jus d'orange", 'jus de fruit', 'boisson', 200, 'ml', 45, 0.7, 10, 0.2, 0.2, 9, 2],
    ['Limonade', '', 'boisson', 250, 'ml', 40, 0, 10, 0, 0, 10, 8],
    ['Sirop dilué', 'sirop grenadine menthe', 'boisson', 250, 'ml', 35, 0, 9, 0, 0, 9, 4],
    ['Boisson énergisante', 'red bull energy', 'boisson', 250, 'ml', 45, 0, 11, 0, 0, 11, 100],
    ['Smoothie', '', 'boisson', 250, 'ml', 55, 0.7, 12, 0.3, 1.2, 11, 5],
    ["Lait d'amande", 'lait vegetal', 'boisson', 250, 'ml', 25, 0.5, 3, 1.1, 0.4, 3, 60],
    ["Lait d'avoine", '', 'boisson', 250, 'ml', 45, 0.9, 7, 1.5, 0.8, 4, 60],
    ['Bière blonde', 'biere', 'boisson', 250, 'ml', 43, 0.5, 3.5, 0, 0, 0.2, 4],
    ['Vin rouge', 'vin', 'boisson', 125, 'ml', 85, 0.1, 2.6, 0, 0, 0.6, 4],
    ['Vin blanc', '', 'boisson', 125, 'ml', 80, 0.1, 2.6, 0, 0, 1, 5],
    ['Champagne', 'cremant', 'boisson', 125, 'ml', 80, 0.3, 1.4, 0, 0, 1.4, 5],
    ['Whisky', 'rhum vodka gin alcool fort', 'boisson', 40, 'ml', 245, 0, 0.1, 0, 0, 0, 1],
    ['Cocktail sucré', 'mojito pina colada', 'boisson', 250, 'ml', 120, 0.2, 15, 0.5, 0, 14, 10],

    /* ---------- Sauces et matieres grasses ---------- */
    ["Huile d'olive", 'huile', 'sauce', 10, 'ml', 900, 0, 0, 100, 0, 0, 0],
    ['Mayonnaise', '', 'sauce', 15, 'g', 700, 1, 2, 75, 0, 2, 700],
    ['Ketchup', '', 'sauce', 15, 'g', 100, 1.2, 23, 0.2, 1, 22, 900],
    ['Moutarde', '', 'sauce', 10, 'g', 150, 7, 5, 10, 3, 3, 2200],
    ['Sauce blanche kebab', 'sauce blanche samourai algerienne', 'sauce', 30, 'g', 350, 1.5, 6, 35, 0, 5, 800],
    ['Vinaigrette', '', 'sauce', 15, 'g', 450, 0.5, 5, 47, 0, 4, 900],
    ['Sauce tomate', 'coulis de tomate', 'sauce', 100, 'g', 40, 1.5, 6, 0.8, 1.5, 5, 400],
    ['Béchamel', 'sauce blanche', 'sauce', 60, 'g', 130, 3.5, 8, 9, 0.3, 4, 350],
    ['Sauce soja', '', 'sauce', 10, 'ml', 60, 6, 5, 0, 0.5, 1.5, 6000],
    ['Crème de balsamique', 'vinaigre balsamique', 'sauce', 10, 'ml', 200, 0.5, 45, 0, 0, 43, 30]
  ];

const sansAccent = (s) => String(s || '').toLowerCase()
    /* Les ligatures francaises d'abord : sans ca, « boeuf » ne
       trouve jamais « bœuf ». */
    .replace(/\u0153/g, 'oe').replace(/\u00e6/g, 'ae')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();

  const TABLE = L.map((r, i) => ({
    id: 'al-' + i,
    nom: r[0],
    cat: r[2],
    catNom: CATS[r[2]] || 'Divers',
    base: r[4] === 'ml' ? 'ml' : 'g',
    defaultQty: r[3],
    kcal100: r[5],
    per100: { prot: r[6], carb: r[7], fat: r[8], fiber: r[9], sugar: r[10], sodium: r[11] },
    src: 'table',
    _s: sansAccent(r[0] + ' ' + r[1] + ' ' + (CATS[r[2]] || ''))
  }));

  /* Recherche tolerante : sans accents, mot a mot, et on remonte
     d'abord ce qui commence par ce qui a ete tape. */
  function chercher(q, limite) {
    const mots = sansAccent(q).split(' ').filter(Boolean);
    if (!mots.length) return [];
    const hits = [];
    TABLE.forEach((a) => {
      if (!mots.every((m) => a._s.indexOf(m) >= 0)) return;
      const nom = sansAccent(a.nom);
      let score = 0;
      if (nom === sansAccent(q)) score = 100;
      else if (nom.indexOf(mots[0]) === 0) score = 60;
      else if (nom.indexOf(mots[0]) > 0) score = 40;
      else score = 20;
      score -= Math.min(15, nom.length / 6);
      hits.push({ a: a, s: score });
    });
    hits.sort((x, y) => y.s - x.s);
    return hits.slice(0, limite || 12).map((h) => h.a);
  }

  function parCategorie() {
    const out = [];
    Object.keys(CATS).forEach((c) => {
      const l = TABLE.filter((a) => a.cat === c);
      if (l.length) out.push({ id: c, nom: CATS[c], items: l });
    });
    return out;
  }

  global.ALIMENTS = { TABLE: TABLE, CATS: CATS, chercher: chercher, parCategorie: parCategorie, norm: sansAccent };
})(window);
