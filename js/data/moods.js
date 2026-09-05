/* ============================================================
   EVER — Les six tasses

   Toutes les émotions positives passent par six neurotransmetteurs.
   Les drogues les remplissent vite et cassent la capacité à les
   remplir seul. Ce fichier fait l'inverse : il liste ce qui les
   remplit sans chimie, et ce que chaque manque révèle.

   LA RÈGLE QUI COMPTE
   Trois de ces six molécules ne se sécrètent pas seul devant un
   écran : cannabinoïdes, opioïdes, ocytocine. Aucune activité solo
   ne les remplit, quel que soit le niveau de confort.

   L'application applique cette règle telle quelle. Si l'état
   choisi relève d'une de ces trois molécules, elle ne propose que
   des choses qui impliquent quelqu'un d'autre. Proposer un film
   tout seul à quelqu'un qui se sent seul, c'est exactement ce que
   font les réseaux sociaux : livrer de la dopamine à la place du
   lien, et laisser la vraie tasse vide.

   Source : entretien du chercheur Axel Bouchon repris par Max
   Joseph. Vulgarisation, pas médecine.
   ============================================================ */
(function (global) {
  'use strict';

  /* ---------- Les six sources ----------
     Chacune porte deux noms. `court` est celui qu'on affiche :
     un mot de tous les jours, qui se comprend sans rien savoir.
     `nom` est le nom scientifique, gardé pour la fiche détaillée,
     parce qu'il est juste et qu'il permet d'aller lire ailleurs.

     Six cartes intitulées « Cannabinoïdes » et « Opioïdes », c'est
     exactement le problème des anciennes « tasses » : un vocabulaire
     interne servi comme titre. On lit maintenant « Le rire » et
     « Le réconfort », et la chimie attend derrière. */
  const MOLECULES = {
    dopamine: {
      court: "L'élan", nom: 'Dopamine', role: 'Motivation, concentration, envie de faire',
      manque: 'Manque de direction, plus de moteur',
      solo: true, icon: 'flame', teinte: '#C2410C'
    },
    serotonine: {
      court: 'La fierté', nom: 'Sérotonine', role: 'Fierté, statut, sentiment de compter',
      manque: 'Le sentiment de ne pas être vu, de ne rien accomplir',
      solo: true, icon: 'trophy', teinte: '#A2801F'
    },
    cannabinoides: {
      court: 'Le rire', nom: 'Cannabinoïdes', role: 'Détente profonde, connexion, rire',
      manque: 'Manque de potes, de liens simples et légers',
      solo: false, icon: 'users', teinte: '#2F6B5A'
    },
    opioides: {
      court: 'Le réconfort', nom: 'Opioïdes', role: 'Apaisement, réconfort, la douleur qui baisse',
      manque: 'Une douleur, physique ou mentale, qu\'on cherche à taire',
      solo: false, icon: 'heart', teinte: '#7B2D56'
    },
    testosterone: {
      court: 'Le cran', nom: 'Testostérone', role: 'Confiance, cran, envie d\'aller chercher',
      manque: 'Plus d\'audace, on n\'ose plus rien tenter',
      solo: true, icon: 'dumbbell', teinte: '#1F4E79'
    },
    ocytocine: {
      court: 'La tendresse', nom: 'Ocytocine', role: 'Attachement, tendresse, sécurité',
      manque: 'Manque de chaleur humaine intime',
      solo: false, icon: 'heart', teinte: '#B0264F'
    }
  };

  /* ---------- Les six états ----------
     Nommés par ce qu'on ressent, pas par la chimie. Six et pas
     davantage : au-delà, on ne choisit plus, on hésite. */
  const ETATS = [
    {
      id: 'aplat', nom: 'Pas d\'énergie', sub: 'Rien ne me donne envie',
      molecule: 'dopamine', icon: 'flame',
      phrase: 'La dopamine, ça se relance par l\'action, pas par l\'attente. Le plus court chemin est physique.'
    },
    {
      id: 'invisible', nom: 'Besoin de réussir un truc', sub: 'J\'ai l\'impression de ne rien accomplir',
      molecule: 'serotonine', icon: 'trophy',
      phrase: 'La sérotonine vient de ce qu\'on termine et de ce qui se voit. Finis un truc, montre-le.'
    },
    {
      id: 'seul', nom: 'Envie de voir du monde', sub: 'Envie de rire avec des gens',
      molecule: 'cannabinoides', icon: 'users',
      phrase: 'Celle-là, tu ne peux pas la remplir seul. Aucune activité en solo ne la déclenche.'
    },
    {
      id: 'avif', nom: 'Stressé', sub: 'Tendu, sur les nerfs',
      molecule: 'opioides', icon: 'heart',
      phrase: 'Le réconfort profond passe par le contact et le soin. Seul, on anesthésie, on n\'apaise pas.'
    },
    {
      id: 'mou', nom: 'Manque de confiance', sub: 'Je n\'ose plus rien tenter',
      molecule: 'testosterone', icon: 'dumbbell',
      phrase: 'La confiance revient en gagnant quelque chose de petit, physiquement ou face à quelqu\'un.'
    },
    {
      id: 'tendresse', nom: 'Envie d\'un moment calme', sub: 'De la chaleur, pas du bruit',
      molecule: 'ocytocine', icon: 'heart',
      phrase: 'L\'ocytocine ne se fabrique qu\'à deux, dans le calme et le contact. Une seule personne suffit.'
    }
  ];

  /* ---------- Les sources ----------
     m       molécules remplies, la première est la principale
     social  solo | duo | groupe   (duo et groupe = quelqu'un d'autre)
     min     durée réaliste en minutes
     cost    0 gratuit → 3 cher
     kind    réutilise les types du moteur de reco (distance, météo)
     Rien ici n'est une substance. C'est le principe de la liste.
     ============================================================ */
  const S = (nom, m, social, min, cost, kind, extra) =>
    Object.assign({ nom: nom, m: m, social: social, min: min, cost: cost, kind: kind || 'autre' }, extra || {});

  const SOURCES = [

    /* ---- Dopamine : relancer le moteur ---- */
    S('Séance de muscu', ['dopamine', 'testosterone'], 'solo', 75, 1, 'sport', { note: 'Le plus fiable des trois leviers du matin.' }),
    S('Sortie course à pied', ['dopamine', 'testosterone'], 'solo', 40, 0, 'trail', { outdoor: true }),
    S('Douche froide', ['dopamine'], 'solo', 5, 0, 'autre', { note: 'Effet net sur deux à trois heures.' }),
    S('Vingt pompes maintenant', ['dopamine'], 'solo', 3, 0, 'sport'),
    S('Un vrai café, assis, sans téléphone', ['dopamine'], 'solo', 20, 1, 'cafe'),
    S('Marcher dehors sans écouteurs', ['dopamine'], 'solo', 25, 0, 'promenade', { outdoor: true }),
    S('Ranger une seule pièce à fond', ['dopamine', 'serotonine'], 'solo', 30, 0, 'autre'),
    S('Apprendre un truc précis pendant une heure', ['dopamine'], 'solo', 60, 0, 'autre'),
    S('Avancer le montage d\'une vidéo', ['dopamine', 'serotonine'], 'solo', 90, 0, 'autre'),
    S('Écrire, même mal, vingt minutes', ['dopamine', 'serotonine'], 'solo', 20, 0, 'autre'),
    S('Cuisiner un plat qu\'on n\'a jamais fait', ['dopamine'], 'solo', 60, 1, 'autre'),
    S('Session de jeu, minuteur réglé', ['dopamine'], 'solo', 45, 0, 'autre', { note: 'Sans minuteur, ça devient le problème plutôt que la solution.' }),
    S('Nouvelle route à vélo', ['dopamine'], 'solo', 60, 0, 'velo', { outdoor: true }),
    S('Chercher un morceau qu\'on ne connaît pas', ['dopamine'], 'solo', 15, 0, 'autre'),
    S('Un chapitre de plus', ['dopamine', 'serotonine'], 'solo', 30, 0, 'autre'),

    /* ---- Sérotonine : être vu, avoir fini ---- */
    S('Finir la tâche qui traîne depuis trois jours', ['serotonine'], 'solo', 45, 0, 'autre'),
    S('Publier ce qui est prêt', ['serotonine'], 'solo', 30, 0, 'autre', { note: 'Publier bat peaufiner, à chaque fois.' }),
    S('Vider la boîte mail', ['serotonine'], 'solo', 40, 0, 'autre'),
    S('Se remettre au propre : coiffeur, barbe, ongles', ['serotonine', 'ocytocine'], 'solo', 45, 2, 'autre'),
    S('S\'habiller bien sans occasion', ['serotonine', 'testosterone'], 'solo', 15, 0, 'autre'),
    S('Relire ce qu\'on a construit ces six mois', ['serotonine'], 'solo', 20, 0, 'autre'),
    S('Aider quelqu\'un sur un truc qu\'on maîtrise', ['serotonine', 'cannabinoides'], 'duo', 45, 0, 'autre'),
    S('Battre son record, même de peu', ['serotonine', 'testosterone'], 'solo', 60, 1, 'sport'),
    S('Mettre ses comptes à jour', ['serotonine'], 'solo', 30, 0, 'autre'),
    S('Répondre au message qu\'on repousse', ['serotonine'], 'solo', 10, 0, 'autre'),

    /* ---- Cannabinoïdes : le lien léger, jamais seul ---- */
    S('Un vrai repas avec des potes', ['cannabinoides', 'dopamine', 'opioides'], 'groupe', 150, 2, 'restaurant',
      { note: 'Le 20/80 du bonheur selon la vidéo : bien manger, rire, être écouté. Trois tasses d\'un coup.' }),
    S('Bateau de sushis à plusieurs', ['cannabinoides', 'dopamine'], 'groupe', 120, 3, 'restaurant'),
    S('Barbecue', ['cannabinoides', 'dopamine'], 'groupe', 180, 2, 'restaurant', { outdoor: true, seasons: ['printemps', 'ete'] }),
    S('Apéro sans occasion particulière', ['cannabinoides'], 'groupe', 120, 2, 'apero'),
    S('Regarder l\'UFC à plusieurs', ['cannabinoides', 'dopamine'], 'groupe', 180, 1, 'autre'),
    S('Match du PSG avec des potes', ['cannabinoides', 'dopamine'], 'groupe', 150, 1, 'autre'),
    S('Appeler un ami perdu de vue', ['cannabinoides'], 'duo', 30, 0, 'autre', { note: 'Appeler, pas écrire. La voix compte.' }),
    S('Soirée jeux de société', ['cannabinoides', 'dopamine'], 'groupe', 150, 0, 'autre'),
    S('Sport collectif : foot, padel, basket', ['cannabinoides', 'testosterone', 'dopamine'], 'groupe', 90, 1, 'sport'),
    S('Pétanque ou mölkky', ['cannabinoides'], 'groupe', 90, 0, 'petanque', { outdoor: true }),
    S('Cuisiner à plusieurs', ['cannabinoides', 'ocytocine'], 'groupe', 120, 1, 'autre'),
    S('Prendre un café avec quelqu\'un', ['cannabinoides'], 'duo', 60, 1, 'cafe'),
    S('Aller au marché ensemble', ['cannabinoides'], 'duo', 75, 1, 'marche', { outdoor: true }),
    S('Randonnée à plusieurs', ['cannabinoides', 'dopamine'], 'groupe', 180, 0, 'randonnee', { outdoor: true }),
    S('Escape game ou bowling', ['cannabinoides', 'dopamine'], 'groupe', 90, 2, 'escape'),
    S('Dormir chez des amis, sans programme', ['cannabinoides', 'ocytocine'], 'groupe', 600, 1, 'autre'),

    /* ---- Opioïdes : apaiser, jamais anesthésier ---- */
    S('Se faire masser', ['opioides', 'ocytocine'], 'duo', 60, 3, 'spa',
      { note: 'Le contact humain prolongé, c\'est précisément ce qui déclenche cette tasse.' }),
    S('Sauna ou hammam', ['opioides'], 'duo', 60, 2, 'spa'),
    S('Bain chaud, lumière basse, sans téléphone', ['opioides'], 'solo', 40, 0, 'autre',
      { note: 'Apaise, mais ne remplace pas le contact. À faire en plus, pas à la place.' }),
    S('Parler du vrai sujet à quelqu\'un de confiance', ['opioides', 'ocytocine'], 'duo', 60, 0, 'autre'),
    S('Étirements longs, respiration lente', ['opioides'], 'solo', 25, 0, 'autre'),
    S('Se faire soigner : kiné, ostéo', ['opioides'], 'duo', 45, 2, 'autre'),
    S('Un plat de son enfance', ['opioides', 'ocytocine'], 'solo', 60, 1, 'autre'),
    S('Voir un professionnel quand ça dure', ['opioides'], 'duo', 50, 2, 'autre',
      { note: 'Quand la douleur s\'installe, ce n\'est plus une case à cocher. C\'est le bon réflexe.' }),

    /* ---- Testostérone : reprendre du cran ---- */
    S('Séance lourde, gros mouvements', ['testosterone', 'dopamine'], 'solo', 75, 1, 'sport'),
    S('Sport de combat', ['testosterone', 'dopamine'], 'duo', 90, 2, 'sport'),
    S('Se remettre au propre avant un rendez-vous', ['testosterone', 'serotonine'], 'solo', 30, 1, 'autre'),
    S('Demander ce qu\'on n\'ose pas demander', ['testosterone', 'serotonine'], 'duo', 15, 0, 'autre'),
    S('Karting, escalade, via ferrata', ['testosterone', 'dopamine'], 'groupe', 120, 3, 'karting'),
    S('Dormir huit heures', ['testosterone'], 'solo', 480, 0, 'autre',
      { note: 'Le levier le plus sous-estimé sur cette tasse-là.' }),
    S('Se remettre au froid : bain glacé, mer', ['testosterone', 'dopamine'], 'solo', 15, 0, 'plage', { outdoor: true }),

    /* ---- Ocytocine : la chaleur, à deux ---- */
    S('Une soirée à deux, téléphones ailleurs', ['ocytocine', 'cannabinoides'], 'duo', 180, 1, 'autre'),
    S('Un vrai câlin, sans raison', ['ocytocine'], 'duo', 5, 0, 'autre',
      { note: 'Vingt secondes suffisent. C\'est mesuré.' }),
    S('Dîner en tête-à-tête', ['ocytocine', 'cannabinoides'], 'duo', 120, 3, 'restaurant'),
    S('Appeler ses parents', ['ocytocine'], 'duo', 30, 0, 'autre'),
    S('Marcher à deux, sans destination', ['ocytocine', 'cannabinoides'], 'duo', 60, 0, 'promenade', { outdoor: true }),
    S('S\'occuper d\'un animal', ['ocytocine'], 'solo', 30, 0, 'autre'),
    S('Cuisiner pour quelqu\'un', ['ocytocine'], 'duo', 90, 1, 'autre'),
    S('Regarder un film blotti', ['ocytocine', 'opioides'], 'duo', 120, 0, 'autre')
  ];

  /* ---------- Ce que le raccourci révèle ----------
     La partie la plus utile de la vidéo : vers quoi on penche dit
     ce qui est vide. On l'affiche comme un miroir, jamais comme un
     jugement, et sans jamais nommer de substance comme une option. */
  const MIROIR = {
    dopamine:      'Quand on tourne en rond sur le téléphone, c\'est en général cette tasse-là qui est vide.',
    serotonine:    'Quand on rafraîchit ses vues et ses likes, c\'est celle-là.',
    cannabinoides: 'Quand on scrolle en cherchant de la chaleur humaine, c\'est celle-là — et le scroll ne la remplit jamais.',
    opioides:      'Quand on cherche à s\'anesthésier plutôt qu\'à se sentir mieux, c\'est celle-là.',
    testosterone:  'Quand on n\'ose plus rien, c\'est celle-là.',
    ocytocine:     'Quand rien ne remplace une présence, c\'est celle-là.'
  };

  /* Les trois qui ne se remplissent pas seul. */
  const SOCIALES = ['cannabinoides', 'opioides', 'ocytocine'];

  global.MOODS = { MOLECULES, ETATS, SOURCES, MIROIR, SOCIALES };
})(window);
