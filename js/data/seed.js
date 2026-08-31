/* ============================================================
   EVER — Données de depart
   Listes fournies par l'utilisateur. Elles sont copiees dans le
   stockage a la première ouverture, puis lui appartiennent : il
   peut tout ajouter, modifier, supprimer sans que la mise a jour
   du code les ecrase.
   ============================================================ */
(function (global) {
  'use strict';

  /* ---------- Activités ----------
     kind sert àu moteur : tolerance de distance, météo, horaire.
     seasons vide = toute l'année. */
  const A = (nom, kind, category, opts) => Object.assign({ nom: nom, kind: kind, category: category }, opts || {});

  const ACTIVITIES = {
    'le-touquet': [
      A('Plage et baignade', 'plage', 'Plage et nature', { seasons: ['printemps', 'ete'], outdoor: true, price: 0 }),
      A('Promenade dans les dunes', 'promenade', 'Plage et nature', { outdoor: true, price: 0 }),
      A('Jeux de plage', 'plage', 'Plage et nature', { seasons: ['printemps', 'ete'], outdoor: true, price: 0 }),
      A('Raquettes de plage', 'plage', 'Plage et nature', { seasons: ['printemps', 'ete'], outdoor: true, price: 0 }),
      A('Cerf-volant', 'cerf-volant', 'Plage et nature', { outdoor: true, price: 1 }),
      A('Boomerang', 'plage', 'Plage et nature', { outdoor: true, price: 1 }),
      A('Coucher de soleil', 'promenade', 'Plage et nature', { outdoor: true, price: 0 }),
      A('Pique-nique', 'pique-nique', 'Plage et nature', { outdoor: true, price: 1 }),

      A('Tennis', 'tennis', 'Sport', { outdoor: true, price: 2 }),
      A('Beach-volley', 'beach-volley', 'Sport', { seasons: ['printemps', 'ete'], outdoor: true, price: 0 }),
      A('Velo', 'velo', 'Sport', { outdoor: true, price: 1 }),
      A('Rosalie', 'velo', 'Sport', { outdoor: true, price: 2 }),
      A('Char à voile', 'charavoile', 'Sport', { outdoor: true, price: 3 }),
      A('Équitation', 'equitation', 'Sport', { outdoor: true, price: 3 }),
      A('Golf', 'golf', 'Sport', { outdoor: true, price: 3 }),
      A('Randonnée', 'randonnee', 'Sport', { outdoor: true, price: 0 }),
      A('Kitesurf', 'kitesurf', 'Sport', { outdoor: true, price: 3 }),

      A('Karting', 'karting', 'Fun', { price: 3 }),
      A('Mini-golf', 'golf', 'Fun', { outdoor: true, price: 1 }),
      A('Escape game', 'escape', 'Fun', { outdoor: false, price: 3 }),
      A('Bowling', 'bowling', 'Fun', { outdoor: false, price: 2 }),
      A('Pétanque', 'petanque', 'Fun', { outdoor: true, price: 0 }),
      A('Mölkky', 'petanque', 'Fun', { outdoor: true, price: 0 }),

      A('Glace', 'glacier', 'Food', { price: 1 }),
      A('Crepe', 'restaurant', 'Food', { price: 1 }),
      A('Gaufre', 'restaurant', 'Food', { price: 1 }),
      A('Cafe', 'cafe', 'Food', { price: 1 }),
      A('Restaurant', 'restaurant', 'Food', { price: 3 }),
      A('Brunch', 'brunch', 'Food', { price: 2 }),
      A('Apero', 'apero', 'Food', { price: 2 }),
      A('Bar', 'bar', 'Food', { price: 2 }),

      A("Galerie d'art", 'galerie', 'Culture', { outdoor: false, price: 1 }),
      A('Musée', 'musee', 'Culture', { outdoor: false, price: 2 }),
      A('Exposition', 'exposition', 'Culture', { outdoor: false, price: 2 }),
      A('Visite guidée', 'monument', 'Culture', { price: 2 }),
      A('Architecture et villas', 'monument', 'Culture', { outdoor: true, price: 0 }),

      A('Baptême de l\'air', 'parapente', 'Insolite', { outdoor: true, price: 4 }),
      A('Sortie en mer', 'plage', 'Insolite', { seasons: ['printemps', 'ete'], outdoor: true, price: 3 })
    ],

    'meribel': [
      A('Ski alpin', 'ski', 'Hiver', { seasons: ['hiver'], outdoor: true, price: 4 }),
      A('Snowboard', 'snowboard', 'Hiver', { seasons: ['hiver'], outdoor: true, price: 4 }),
      A('Ski de fond', 'ski-fond', 'Hiver', { seasons: ['hiver'], outdoor: true, price: 2 }),
      A('Raquettes', 'raquettes', 'Hiver', { seasons: ['hiver'], outdoor: true, price: 2 }),
      A('Luge', 'luge', 'Hiver', { seasons: ['hiver'], outdoor: true, price: 1 }),
      A('Patinoire', 'patinoire', 'Hiver', { seasons: ['hiver'], outdoor: false, price: 2 }),
      A('Spa', 'spa', 'Hiver', { outdoor: false, price: 3 }),
      A('Fondue', 'restaurant', 'Hiver', { seasons: ['hiver', 'automne'], price: 3 }),
      A('Après-ski', 'bar', 'Hiver', { seasons: ['hiver'], price: 3 }),
      A('Restaurant', 'restaurant', 'Hiver', { price: 3 }),
      A('Bowling', 'bowling', 'Hiver', { outdoor: false, price: 2 }),
      A('Cinéma', 'cinema', 'Hiver', { outdoor: false, price: 2 }),
      A('Parapente', 'parapente', 'Hiver', { outdoor: true, price: 4 }),

      A('VTT', 'vtt', 'Ete', { seasons: ['printemps', 'ete', 'automne'], outdoor: true, price: 2 }),
      A('VTT de descente', 'vtt', 'Ete', { seasons: ['ete'], outdoor: true, price: 3 }),
      A('Randonnée', 'randonnee', 'Ete', { seasons: ['printemps', 'ete', 'automne'], outdoor: true, price: 0 }),
      A('Trail', 'trail', 'Ete', { seasons: ['printemps', 'ete', 'automne'], outdoor: true, price: 0 }),
      A('Via ferrata', 'via-ferrata', 'Ete', { seasons: ['ete'], outdoor: true, price: 3 }),
      A('Escalade', 'escalade', 'Ete', { seasons: ['printemps', 'ete', 'automne'], outdoor: true, price: 2 }),
      A('Luge sur rail', 'luge', 'Ete', { seasons: ['printemps', 'ete', 'automne'], outdoor: true, price: 2 }),
      A('Rafting', 'rafting', 'Ete', { seasons: ['printemps', 'ete'], outdoor: true, price: 4 }),
      A('Canyoning', 'canyoning', 'Ete', { seasons: ['ete'], outdoor: true, price: 4 }),
      A('Golf', 'golf', 'Ete', { seasons: ['printemps', 'ete', 'automne'], outdoor: true, price: 3 }),
      A('Tennis', 'tennis', 'Ete', { outdoor: true, price: 2 })
    ]
  };

  /* ---------- Aliments ----------
     cat : salé | commander | sucré | boisson | alcool
     Les intitules sont ceux fournis, sans reformulation. */
  const F = (nom, cat, note) => ({ nom: nom, cat: cat, note: note || '' });

  const FOODS = [
    /* Salé */
    F('Sushi', 'sale'),
    F('Terrine de porc à la ciboulette', 'sale'),
    F('Rillettes', 'sale'),
    F('Porc au caramel', 'sale'),
    F('Fondue bourguignonne', 'sale'),
    F('Viande séchée / Beef Jerky', 'sale'),
    F('La Belle-Iloise', 'sale'),
    F('Charcuterie, plateau de fromage et bon vin', 'sale'),
    F('Dahl de lentilles', 'sale'),
    F('Pancakes lardons et fromage', 'sale'),
    F('Tomates farcies', 'sale'),
    F('Tomates séchées', 'sale'),
    F('Cacahuètes 3D', 'sale'),
    F('Brunch', 'sale'),
    F('Asperge verte', 'sale', 'À ne pas proposer a la personne concernée.'),
    F('Ribs BBQ miel', 'sale'),
    F('T-Bones', 'sale'),
    F('Barbecue', 'sale'),
    F('Munster', 'sale'),
    F('Saucisson au poivre', 'sale'),
    F('Fuet', 'sale'),
    F('Bœuf de Kobe', 'sale'),

    /* À commander */
    F('Sushi', 'commander'),
    F('Hot Dog', 'commander'),
    F('Pizza', 'commander'),
    F('Poke Bowl', 'commander'),

    /* Sucré */
    F('Pâte à cookies crue', 'sucre'),
    F('Pop corn au beurre', 'sucre'),
    F('Suchard chocolat', 'sucre'),
    F("Reese's", 'sucre'),
    F('Lindor', 'sucre'),
    F('Chouchou', 'sucre'),
    F('Beignets au chocolat', 'sucre'),
    F('Cookies', 'sucre'),
    F('Muffins', 'sucre'),
    F('Mi-cuit', 'sucre'),
    F('Crème Mont Blanc', 'sucre'),
    F('Glaces Nuii', 'sucre'),
    F('Snickers glaces', 'sucre'),
    F('Pastel de Nata', 'sucre'),
    F('Bonbons', 'sucre'),
    F('Suchard', 'sucre'),
    F('Snickers Peanut Butter', 'sucre'),
    F('Häagen-Dazs Cookie Dough', 'sucre'),
    F('Milka Mini Suprême', 'sucre'),
    F('Mochi Royal', 'sucre'),

    /* Boissons non alcoolisees */
    F('Orangina Rouge', 'boisson'),
    F('Tourtel Twist', 'boisson'),
    F('Limonade', 'boisson'),
    F('Citronnade', 'boisson'),
    F('Aller dans un café', 'boisson'),
    F('Jus Ruby-Breakfast', 'boisson'),

    /* Boissons alcoolisees */
    F('Cocktails', 'alcool'),
    F('Sex on the Beach', 'alcool'),
    F('Caipirinha', 'alcool'),
    F('Mojito', 'alcool'),
    F('Cocktails exotiques', 'alcool'),
    F('Paix Dieu', 'alcool'),
    F('Desperados', 'alcool'),
    F('Bière La Bagarre', 'alcool'),
    F('Gin Roku', 'alcool'),
    F('Mastiha', 'alcool'),
    F('Bumbu', 'alcool'),
    F('Baileys Chocolat', 'alcool'),
    F('Jack Daniel Honey', 'alcool'),
    F('Absolut Vodka Raspberri', 'alcool'),
    F('Absolut Vodka Pêche', 'alcool'),
    F('Vodka Black', 'alcool'),
    F('Vodka Red', 'alcool'),
    F('Vodka Pink', 'alcool')
  ];

  const FOOD_CATS = [
    { id: 'all',       nom: 'Tous',           icon: 'plate' },
    { id: 'sale',      nom: 'Salé',           icon: 'fork' },
    { id: 'sucre',     nom: 'Sucré',          icon: 'apple' },
    { id: 'boisson',   nom: 'Non alcoolisé',  icon: 'water' },
    { id: 'alcool',    nom: 'Alcoolisé',      icon: 'glass' },
    { id: 'commander', nom: 'À commander',    icon: 'bag' }
  ];

  const GIFT_CATS = [
    { id: 'vetements',   nom: 'Vêtements',   icon: 'shirt' },
    { id: 'parfums',     nom: 'Parfums',     icon: 'sparkle' },
    { id: 'livres',      nom: 'Livres',      icon: 'book' },
    { id: 'jeux',        nom: 'Jeux',        icon: 'dice' },
    { id: 'objets',      nom: 'Objets',      icon: 'bag' },
    { id: 'experiences', nom: 'Expériences', icon: 'sparkle' },
    { id: 'restaurants', nom: 'Restaurants', icon: 'fork' },
    { id: 'voyages',     nom: 'Voyages',     icon: 'map' },
    { id: 'deco',        nom: 'Déco',        icon: 'home' },
    { id: 'autre',       nom: 'Autre',       icon: 'gift' }
  ];

  const MOODS = [
    { id: 'chill',     nom: 'Chill',      icon: 'leaf',    desc: 'Confort, coupe droite, rien qui serre' },
    { id: 'soiree',    nom: 'Soirée',     icon: 'sparkle', desc: 'Sombre, net, une pièce forte' },
    { id: 'classe',    nom: 'Classe',     icon: 'shirt',   desc: 'Structure, matières nobles, sobre' },
    { id: 'oldmoney',  nom: 'Old money',  icon: 'trophy',  desc: 'Neutres, maille fine, discret et cher' },
    { id: 'sport',     nom: 'Sport',      icon: 'dumbbell', desc: 'Technique, respirant, libre' }
  ];

  const GARMENT_SLOTS = [
    { id: 'haut',        nom: 'Haut',        icon: 'shirt',    required: true },
    { id: 'bas',         nom: 'Bas',         icon: 'shirt',    required: true },
    { id: 'chaussures',  nom: 'Chaussures',  icon: 'bag',      required: true },
    { id: 'veste',       nom: 'Veste',       icon: 'shirt',    required: false },
    { id: 'sousvetement', nom: 'Sous-vêtement', icon: 'shirt', required: false },
    { id: 'chaussettes', nom: 'Chaussettes', icon: 'shirt',    required: false },
    { id: 'accessoire',  nom: 'Accessoires', icon: 'sparkle',  required: false, multiple: true }
  ];

  /* Objectifs nutritionnels par défaut, ajustables dans Réglages. */
  const NUTRI_DEFAULTS = {
    kcal: 2400, prot: 150, carb: 260, fat: 75, fiber: 30, sugar: 60, sodium: 2300, water: 2500
  };

  /* Paliers de gamification. */
  const TIERS = [
    { id: 'lead',    nom: 'Plomb',   min: 0 },
    { id: 'bronze',  nom: 'Bronze',  min: 250 },
    { id: 'argent',  nom: 'Argent',  min: 900 },
    { id: 'or',      nom: 'Or',      min: 2200 },
    { id: 'platine', nom: 'Platine', min: 5000 }
  ];

  global.SEED = { ACTIVITIES, FOODS, FOOD_CATS, GIFT_CATS, MOODS, GARMENT_SLOTS, NUTRI_DEFAULTS, TIERS };
})(window);
