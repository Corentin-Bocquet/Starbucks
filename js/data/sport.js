/* ============================================================
   EVER — Sport : exercices, muscles et calories

   Trois choses vivent ici :

   1. LES MUSCLES. Vingt-quatre zones, celles que la carte du
      corps sait colorer. Chaque exercice dit lesquelles il
      travaille en premier et lesquelles il travaille en second.

   2. LES EXERCICES DE MUSCULATION. Cent trente-sept mouvements,
      classes par groupe, avec leur materiel, leur amplitude en
      metres et leur mode de charge.

   3. LES SPORTS. Ceux d'Apple Sante, avec leur cout energetique.

   ------------------------------------------------------------
   COMMENT LES CALORIES SONT CALCULEES

   Pour les sports, la formule de reference, celle de l'American
   College of Sports Medicine :

       kcal = MET x 3,5 x poids(kg) / 200 x minutes

   Les valeurs de MET viennent du Compendium of Physical
   Activities (Ainsworth et coll.), qui est la table publique sur
   laquelle s'appuient les montres et les applications de sport.
   Un MET vaut le metabolisme au repos ; courir a 10 km/h en vaut
   environ 10, donc dix fois plus.

   Pour la musculation, cette formule seule ne suffit pas : une
   heure de salle avec trois minutes de repos entre les series ne
   coute pas la meme chose qu'une heure en circuit. On calcule
   donc deux choses.

   a) LE TRAVAIL MECANIQUE reellement produit :

          W(joules) = masse(kg) x 9,81 x amplitude(m) x repetitions

      La phase de descente coute environ un tiers de plus, d'ou un
      facteur 1,33. Le rendement musculaire humain tourne autour
      de 22 %, donc l'energie depensee vaut le travail divise par
      0,22. Un joule vaut 1/4184 kilocalorie.

   b) LA DENSITE DE TRAVAIL, c'est-a-dire ce travail rapporte a la
      duree de la seance. Elle sert a choisir le MET : peu dense
      donne 3,5 (l'effort modere du Compendium), tres dense donne
      6,0 (l'effort vigoureux).

   Le total retenu est le maximum des deux, jamais leur somme :
   les additionner reviendrait a compter deux fois le meme effort.
   C'est la methode la plus honnete a partir de donnees saisies a
   la main ; sans capteur cardiaque, personne ne fait mieux.

   Les valeurs restent des estimations. Elles sont justes a
   quelques pourcents pres pour un effort regulier, moins pour un
   effort tres irregulier.
   ============================================================ */
(function (global) {
  'use strict';

  /* ============================================================
     1. Les muscles

     `face` dit sur quelle silhouette la zone se colore, `nom` est
     ce qui s'affiche. Les identifiants courts servent aux
     exercices et a la carte du corps.
     ============================================================ */
  const MUSCLES = {
    'pect':    { nom: 'Pectoraux',            face: 'avant' },
    'delt-a':  { nom: 'Epaules (avant)',      face: 'avant' },
    'delt-m':  { nom: 'Epaules (cote)',       face: 'avant' },
    'delt-p':  { nom: 'Epaules (arriere)',    face: 'arriere' },
    'bi':      { nom: 'Biceps',               face: 'avant' },
    'brach':   { nom: 'Brachial',             face: 'avant' },
    'avb':     { nom: 'Avant-bras',           face: 'avant' },
    'tri':     { nom: 'Triceps',              face: 'arriere' },
    'dors':    { nom: 'Grand dorsal',         face: 'arriere' },
    'rond':    { nom: 'Grand rond',           face: 'arriere' },
    'trap':    { nom: 'Trapezes',             face: 'arriere' },
    'rhom':    { nom: 'Rhomboides',           face: 'arriere' },
    'lomb':    { nom: 'Lombaires',            face: 'arriere' },
    'abdo':    { nom: 'Abdominaux',           face: 'avant' },
    'obl':     { nom: 'Obliques',             face: 'avant' },
    'transv':  { nom: 'Gainage profond',      face: 'avant' },
    'flechh':  { nom: 'Flechisseurs de hanche', face: 'avant' },
    'quad':    { nom: 'Quadriceps',           face: 'avant' },
    'add':     { nom: 'Adducteurs',           face: 'avant' },
    'fess':    { nom: 'Fessiers',             face: 'arriere' },
    'fess-m':  { nom: 'Moyen fessier',        face: 'arriere' },
    'isch':    { nom: 'Ischio-jambiers',      face: 'arriere' },
    'mol':     { nom: 'Mollets',              face: 'arriere' },
    'sol':     { nom: 'Soleaire',             face: 'arriere' },
    'coiffe':  { nom: 'Coiffe des rotateurs', face: 'arriere' },
    'supra':   { nom: 'Supra-epineux',        face: 'arriere' }
  };

  const GROUPES = [
    { id: 'pectoraux',   nom: 'Pectoraux',            icon: 'muscle' },
    { id: 'dos',         nom: 'Dos',                  icon: 'muscle' },
    { id: 'epaules',     nom: 'Epaules',              icon: 'muscle' },
    { id: 'biceps',      nom: 'Biceps',               icon: 'muscle' },
    { id: 'triceps',     nom: 'Triceps',              icon: 'muscle' },
    { id: 'quadriceps',  nom: 'Quadriceps',           icon: 'muscle' },
    { id: 'fessiers',    nom: 'Fessiers',             icon: 'muscle' },
    { id: 'ischios',     nom: 'Ischio-jambiers',      icon: 'muscle' },
    { id: 'mollets',     nom: 'Mollets',              icon: 'muscle' },
    { id: 'abdominaux',  nom: 'Abdominaux',           icon: 'muscle' },
    { id: 'trapezes',    nom: 'Trapezes',             icon: 'muscle' },
    { id: 'avantbras',   nom: 'Avant-bras et poigne', icon: 'muscle' },
    { id: 'calisthenie', nom: 'Calisthenie',          icon: 'muscle' }
  ];

  const MATERIEL = {
    barre:    'Barre',
    halteres: 'Halteres',
    poulie:   'Poulie',
    machine:  'Machine',
    corps:    'Poids du corps'
  };

  /* [nom, groupe, materiel, amplitude(m), mode, principaux, secondaires, fraction du poids du corps] */
  const BRUT = [

    /* --- Pectoraux --- */
    ["Developpe couche", 'pectoraux', 'barre', 0.4, 'charge', ['pect'], ['tri', 'delt-a'], 0],
    ["Developpe incline", 'pectoraux', 'barre', 0.4, 'charge', ['pect'], ['delt-a', 'tri'], 0],
    ["Developpe decline", 'pectoraux', 'barre', 0.38, 'charge', ['pect'], ['tri', 'delt-a'], 0],
    ["Developpe couche prise serree", 'pectoraux', 'barre', 0.42, 'charge', ['pect', 'tri'], ['delt-a'], 0],
    ["Developpe couche prise large", 'pectoraux', 'barre', 0.34, 'charge', ['pect'], ['delt-a', 'tri'], 0],
    ["Developpe couche halteres", 'pectoraux', 'halteres', 0.44, 'charge', ['pect'], ['tri', 'delt-a'], 0],
    ["Developpe incline halteres", 'pectoraux', 'halteres', 0.44, 'charge', ['pect'], ['delt-a', 'tri'], 0],
    ["Developpe decline halteres", 'pectoraux', 'halteres', 0.42, 'charge', ['pect'], ['tri', 'delt-a'], 0],
    ["Developpe halteres prise neutre", 'pectoraux', 'halteres', 0.44, 'charge', ['pect'], ['tri', 'delt-a'], 0],
    ["Developpe haltere unilateral", 'pectoraux', 'halteres', 0.44, 'charge', ['pect'], ['tri', 'delt-a', 'transv'], 0],
    ["Ecartes halteres couche", 'pectoraux', 'halteres', 0.55, 'charge', ['pect'], ['delt-a'], 0],
    ["Ecartes halteres inclines", 'pectoraux', 'halteres', 0.55, 'charge', ['pect'], ['delt-a'], 0],
    ["Ecartes halteres declines", 'pectoraux', 'halteres', 0.52, 'charge', ['pect'], ['delt-a'], 0],
    ["Ecartes a la poulie", 'pectoraux', 'poulie', 0.6, 'charge', ['pect'], ['delt-a'], 0],
    ["Pec-deck", 'pectoraux', 'machine', 0.55, 'charge', ['pect'], ['delt-a'], 0],
    ["Pompes classiques", 'pectoraux', 'corps', 0.35, 'corps', ['pect'], ['tri', 'delt-a', 'transv'], 0.64],
    ["Pompes larges", 'pectoraux', 'corps', 0.32, 'corps', ['pect'], ['delt-a', 'tri'], 0.64],
    ["Pompes serrees", 'pectoraux', 'corps', 0.38, 'corps', ['tri', 'pect'], ['delt-a'], 0.66],
    ["Pompes declinees", 'pectoraux', 'corps', 0.35, 'corps', ['pect'], ['delt-a', 'tri'], 0.72],
    ["Pompes lestees", 'pectoraux', 'corps', 0.35, 'corpsplus', ['pect'], ['tri', 'delt-a', 'transv'], 0.64],

    /* --- Dos --- */
    ["Tractions pronation", 'dos', 'corps', 0.55, 'corpsplus', ['dors'], ['bi', 'rond', 'trap'], 1.0],
    ["Tractions supination", 'dos', 'corps', 0.55, 'corpsplus', ['dors'], ['bi', 'rond'], 1.0],
    ["Tractions prise neutre", 'dos', 'corps', 0.55, 'corpsplus', ['dors'], ['bi', 'brach', 'rond'], 1.0],
    ["Tractions larges", 'dos', 'corps', 0.5, 'corpsplus', ['dors'], ['rond', 'trap'], 1.0],
    ["Tractions lestees", 'dos', 'corps', 0.55, 'corpsplus', ['dors'], ['bi', 'rond', 'trap'], 1.0],
    ["Tirage vertical pronation large", 'dos', 'machine', 0.55, 'charge', ['dors'], ['rond', 'bi', 'trap'], 0],
    ["Tirage vertical pronation serree", 'dos', 'machine', 0.58, 'charge', ['dors'], ['bi', 'rond'], 0],
    ["Tirage vertical supination", 'dos', 'machine', 0.58, 'charge', ['dors'], ['bi', 'rond'], 0],
    ["Tirage vertical prise neutre", 'dos', 'machine', 0.58, 'charge', ['dors'], ['bi', 'brach', 'rond'], 0],
    ["Tirage vertical unilateral", 'dos', 'machine', 0.58, 'charge', ['dors'], ['bi', 'rond', 'transv'], 0],
    ["Rowing barre pronation", 'dos', 'barre', 0.4, 'charge', ['dors', 'trap'], ['rhom', 'bi', 'delt-p'], 0],
    ["Rowing barre supination", 'dos', 'barre', 0.42, 'charge', ['dors'], ['bi', 'trap', 'rhom'], 0],
    ["Rowing barre prise large", 'dos', 'barre', 0.38, 'charge', ['trap', 'rhom'], ['delt-p', 'dors'], 0],
    ["Rowing Pendlay", 'dos', 'barre', 0.45, 'charge', ['trap', 'dors'], ['rhom', 'delt-p', 'bi'], 0],
    ["Rowing Yates", 'dos', 'barre', 0.38, 'charge', ['dors'], ['bi', 'trap', 'rhom'], 0],
    ["Rowing haltere unilateral", 'dos', 'halteres', 0.45, 'charge', ['dors'], ['bi', 'trap', 'rhom'], 0],
    ["Rowing halteres bilateral", 'dos', 'halteres', 0.42, 'charge', ['dors'], ['trap', 'rhom', 'bi'], 0],
    ["Rowing halteres buste sur banc", 'dos', 'halteres', 0.42, 'charge', ['trap', 'rhom'], ['dors', 'delt-p'], 0],
    ["Rowing halteres prise neutre", 'dos', 'halteres', 0.42, 'charge', ['dors'], ['bi', 'trap'], 0],
    ["Rowing halteres coudes ouverts", 'dos', 'halteres', 0.4, 'charge', ['delt-p', 'trap'], ['rhom', 'dors'], 0],
    ["Tirage horizontal prise neutre", 'dos', 'machine', 0.45, 'charge', ['dors', 'trap'], ['rhom', 'bi'], 0],
    ["Tirage horizontal prise large", 'dos', 'machine', 0.42, 'charge', ['trap', 'rhom'], ['dors', 'delt-p'], 0],
    ["Tirage horizontal supination", 'dos', 'machine', 0.45, 'charge', ['dors'], ['bi', 'trap'], 0],
    ["Tirage horizontal a la corde", 'dos', 'poulie', 0.45, 'charge', ['dors', 'trap'], ['rhom', 'delt-p'], 0],
    ["Tirage horizontal unilateral", 'dos', 'poulie', 0.48, 'charge', ['dors'], ['bi', 'trap', 'transv'], 0],
    ["Souleve de terre", 'dos', 'barre', 0.5, 'charge', ['lomb', 'fess'], ['isch', 'trap', 'dors', 'quad'], 0],

    /* --- Epaules --- */
    ["Developpe militaire barre", 'epaules', 'barre', 0.5, 'charge', ['delt-a'], ['delt-m', 'tri'], 0],
    ["Developpe halteres epaules", 'epaules', 'halteres', 0.52, 'charge', ['delt-a', 'delt-m'], ['tri'], 0],
    ["Developpe Arnold", 'epaules', 'halteres', 0.55, 'charge', ['delt-a', 'delt-m'], ['tri'], 0],
    ["Developpe epaules machine", 'epaules', 'machine', 0.5, 'charge', ['delt-a', 'delt-m'], ['tri'], 0],
    ["Developpe unilateral haltere", 'epaules', 'halteres', 0.52, 'charge', ['delt-a', 'delt-m'], ['tri', 'transv'], 0],
    ["Elevations laterales halteres", 'epaules', 'halteres', 0.45, 'charge', ['delt-m'], ['supra'], 0],
    ["Elevations laterales poulie", 'epaules', 'poulie', 0.48, 'charge', ['delt-m'], ['supra'], 0],
    ["Elevation laterale unilaterale poulie", 'epaules', 'poulie', 0.5, 'charge', ['delt-m'], ['supra'], 0],
    ["Elevations laterales machine", 'epaules', 'machine', 0.45, 'charge', ['delt-m'], ['supra'], 0],
    ["Elevations laterales inclinees", 'epaules', 'halteres', 0.48, 'charge', ['delt-m'], ['supra'], 0],
    ["Oiseau halteres", 'epaules', 'halteres', 0.45, 'charge', ['delt-p'], ['trap', 'rhom'], 0],
    ["Oiseau sur banc incline", 'epaules', 'halteres', 0.45, 'charge', ['delt-p'], ['rhom', 'trap'], 0],
    ["Oiseau a la poulie", 'epaules', 'poulie', 0.5, 'charge', ['delt-p'], ['rhom', 'trap'], 0],
    ["Pec-deck inverse", 'epaules', 'machine', 0.45, 'charge', ['delt-p'], ['trap', 'rhom'], 0],
    ["Tirage visage", 'epaules', 'poulie', 0.4, 'charge', ['delt-p'], ['trap', 'rhom', 'coiffe'], 0],

    /* --- Biceps --- */
    ["Curl alterne", 'biceps', 'halteres', 0.38, 'charge', ['bi'], ['brach', 'avb'], 0],
    ["Curl marteau", 'biceps', 'halteres', 0.38, 'charge', ['brach'], ['bi', 'avb'], 0],
    ["Curl incline", 'biceps', 'halteres', 0.42, 'charge', ['bi'], ['brach'], 0],
    ["Curl concentre", 'biceps', 'halteres', 0.36, 'charge', ['bi'], ['brach'], 0],
    ["Curl Zottman", 'biceps', 'halteres', 0.38, 'charge', ['bi', 'brach'], ['avb'], 0],
    ["Curl barre droite", 'biceps', 'barre', 0.38, 'charge', ['bi'], ['brach', 'avb'], 0],
    ["Curl barre EZ", 'biceps', 'barre', 0.38, 'charge', ['bi'], ['brach', 'avb'], 0],
    ["Curl barre prise large", 'biceps', 'barre', 0.36, 'charge', ['bi'], ['brach'], 0],
    ["Curl barre prise serree", 'biceps', 'barre', 0.38, 'charge', ['bi'], ['brach'], 0],
    ["Curl inverse", 'biceps', 'barre', 0.36, 'charge', ['brach'], ['bi', 'avb'], 0],
    ["Curl poulie basse", 'biceps', 'poulie', 0.38, 'charge', ['bi'], ['brach', 'avb'], 0],
    ["Curl poulie a la corde", 'biceps', 'poulie', 0.38, 'charge', ['brach'], ['bi'], 0],
    ["Curl poulie unilateral", 'biceps', 'poulie', 0.38, 'charge', ['bi'], ['brach'], 0],
    ["Curl Bayesian", 'biceps', 'poulie', 0.42, 'charge', ['bi'], ['brach'], 0],
    ["Curl poulie haute", 'biceps', 'poulie', 0.4, 'charge', ['bi'], ['brach', 'avb'], 0],

    /* --- Triceps --- */
    ["Extension triceps a la corde", 'triceps', 'poulie', 0.35, 'charge', ['tri'], [], 0],
    ["Extension triceps a la barre", 'triceps', 'poulie', 0.33, 'charge', ['tri'], [], 0],
    ["Extension au-dessus de la tete", 'triceps', 'poulie', 0.45, 'charge', ['tri'], [], 0],
    ["Barre au front", 'triceps', 'barre', 0.4, 'charge', ['tri'], ['delt-a'], 0],
    ["Kick-back", 'triceps', 'halteres', 0.33, 'charge', ['tri'], [], 0],
    ["Dips", 'triceps', 'corps', 0.4, 'corpsplus', ['tri', 'pect'], ['delt-a'], 0.95],
    ["Dips lestes", 'triceps', 'corps', 0.4, 'corpsplus', ['tri', 'pect'], ['delt-a'], 0.95],
    ["Dips aux anneaux", 'triceps', 'corps', 0.42, 'corpsplus', ['tri', 'pect'], ['delt-a', 'transv'], 0.95],
    ["Pompes diamant", 'triceps', 'corps', 0.38, 'corps', ['tri'], ['pect', 'delt-a'], 0.66],

    /* --- Quadriceps --- */
    ["Squat barre", 'quadriceps', 'barre', 0.55, 'charge', ['quad', 'fess'], ['isch', 'add'], 0],
    ["Squat avant", 'quadriceps', 'barre', 0.55, 'charge', ['quad'], ['fess', 'transv'], 0],
    ["Squat barre haute", 'quadriceps', 'barre', 0.55, 'charge', ['quad'], ['fess', 'add'], 0],
    ["Squat cycliste", 'quadriceps', 'barre', 0.58, 'charge', ['quad'], ['fess'], 0],
    ["Squat gobelet", 'quadriceps', 'halteres', 0.55, 'charge', ['quad'], ['fess', 'transv'], 0],
    ["Presse a cuisses", 'quadriceps', 'machine', 0.45, 'charge', ['quad', 'fess'], ['isch'], 0],
    ["Hack squat", 'quadriceps', 'machine', 0.5, 'charge', ['quad'], ['fess', 'add'], 0],
    ["Squat pendulaire", 'quadriceps', 'machine', 0.5, 'charge', ['quad'], ['fess'], 0],
    ["Squat a la Smith", 'quadriceps', 'machine', 0.52, 'charge', ['quad', 'fess'], ['isch'], 0],
    ["Extension de jambes", 'quadriceps', 'machine', 0.4, 'charge', ['quad'], [], 0],
    ["Squat au poids du corps", 'quadriceps', 'corps', 0.5, 'corps', ['quad', 'fess'], ['isch'], 0.65],

    /* --- Fessiers --- */
    ["Hip thrust", 'fessiers', 'barre', 0.3, 'charge', ['fess'], ['isch', 'add'], 0],
    ["Hip thrust machine", 'fessiers', 'machine', 0.3, 'charge', ['fess'], ['isch'], 0],
    ["Hip thrust unilateral", 'fessiers', 'barre', 0.3, 'charge', ['fess'], ['isch', 'fess-m'], 0],
    ["Fente bulgare", 'fessiers', 'halteres', 0.45, 'charge', ['fess', 'quad'], ['isch'], 0],
    ["Step-up", 'fessiers', 'halteres', 0.45, 'charge', ['fess', 'quad'], ['isch', 'fess-m'], 0],
    ["Fentes marchees", 'fessiers', 'halteres', 0.45, 'charge', ['fess', 'quad'], ['isch', 'transv'], 0],

    /* --- Ischio-jambiers --- */
    ["Souleve de terre roumain", 'ischios', 'barre', 0.45, 'charge', ['isch', 'fess'], ['lomb'], 0],
    ["Souleve de terre jambes tendues", 'ischios', 'barre', 0.48, 'charge', ['isch'], ['fess', 'lomb'], 0],
    ["Leg curl allonge", 'ischios', 'machine', 0.35, 'charge', ['isch'], ['mol'], 0],
    ["Leg curl assis", 'ischios', 'machine', 0.35, 'charge', ['isch'], ['mol'], 0],
    ["Nordic curl", 'ischios', 'corps', 0.6, 'corps', ['isch'], ['fess', 'mol'], 0.55],

    /* --- Mollets --- */
    ["Mollets debout", 'mollets', 'machine', 0.15, 'charge', ['mol'], ['sol'], 0],
    ["Mollets assis", 'mollets', 'machine', 0.15, 'charge', ['sol'], ['mol'], 0],
    ["Mollets a la presse", 'mollets', 'machine', 0.15, 'charge', ['mol', 'sol'], [], 0],
    ["Mollets a la machine", 'mollets', 'machine', 0.15, 'charge', ['mol'], ['sol'], 0],
    ["Mollets unilateraux", 'mollets', 'corps', 0.16, 'corpsplus', ['mol', 'sol'], [], 0.9],

    /* --- Abdominaux --- */
    ["Crunch", 'abdominaux', 'corps', 0.25, 'corps', ['abdo'], ['obl'], 0.3],
    ["Crunch a la poulie", 'abdominaux', 'poulie', 0.3, 'charge', ['abdo'], ['obl'], 0],
    ["Releve de jambes suspendu", 'abdominaux', 'corps', 0.5, 'corps', ['abdo', 'flechh'], ['obl'], 0.35],
    ["Releve de genoux", 'abdominaux', 'corps', 0.4, 'corps', ['abdo'], ['flechh'], 0.3],
    ["Roue abdominale", 'abdominaux', 'corps', 0.6, 'corps', ['abdo'], ['obl', 'dors', 'lomb'], 0.45],
    ["Planche", 'abdominaux', 'corps', 0, 'iso', ['transv', 'abdo'], ['obl', 'lomb'], 0.6],
    ["Planche laterale", 'abdominaux', 'corps', 0, 'iso', ['obl'], ['transv', 'lomb'], 0.55],
    ["Planche lestee", 'abdominaux', 'corps', 0, 'iso', ['abdo', 'transv'], ['obl'], 0.6],
    ["Planche commando", 'abdominaux', 'corps', 0.25, 'corps', ['abdo'], ['delt-a', 'tri'], 0.6],
    ["Planche avec elevation de jambe", 'abdominaux', 'corps', 0, 'iso', ['abdo', 'transv'], ['fess', 'obl'], 0.6],

    /* --- Trapezes --- */
    ["Haussements d'epaules barre", 'trapezes', 'barre', 0.15, 'charge', ['trap'], [], 0],
    ["Haussements d'epaules halteres", 'trapezes', 'halteres', 0.15, 'charge', ['trap'], ['avb'], 0],
    ["Haussements d'epaules machine", 'trapezes', 'machine', 0.15, 'charge', ['trap'], [], 0],
    ["Marche du fermier", 'trapezes', 'halteres', 0, 'iso', ['trap'], ['avb', 'transv'], 0],
    ["Tirage menton", 'trapezes', 'barre', 0.4, 'charge', ['trap', 'delt-m'], ['bi'], 0],

    /* --- Avant-bras et poigne --- */
    ["Curl poignets", 'avantbras', 'barre', 0.12, 'charge', ['avb'], [], 0],
    ["Extension poignets", 'avantbras', 'barre', 0.12, 'charge', ['avb'], [], 0],
    ["Curl inverse poignets", 'avantbras', 'barre', 0.36, 'charge', ['brach'], ['avb'], 0],
    ["Suspension a la barre", 'avantbras', 'corps', 0, 'iso', ['avb'], ['dors'], 1.0],

    /* --- Calisthenie --- */
    ["Muscle-up", 'calisthenie', 'corps', 0.8, 'corpsplus', ['dors', 'pect', 'tri'], ['bi', 'delt-a'], 1.0],
    ["Front lever", 'calisthenie', 'corps', 0, 'iso', ['dors'], ['rond', 'abdo'], 1.0],
    ["Planche (gainage bras tendus)", 'calisthenie', 'corps', 0, 'iso', ['delt-a', 'pect'], ['tri', 'abdo'], 1.0],
    ["L-sit", 'calisthenie', 'corps', 0, 'iso', ['abdo', 'flechh'], ['tri', 'quad'], 0.85],
    ["Drapeau humain", 'calisthenie', 'corps', 0, 'iso', ['obl', 'dors'], ['delt-a', 'tri'], 1.0],
    ["Equilibre sur les mains", 'calisthenie', 'corps', 0, 'iso', ['delt-a'], ['tri', 'transv'], 1.0],
  ];

  const EXOS = BRUT.map((e, i) => ({
    id: 'ex' + i,
    nom: e[0], groupe: e[1], materiel: e[2],
    rom: e[3], mode: e[4],
    principaux: e[5], secondaires: e[6],
    fraction: e[7] || 0
  }));

  /* ============================================================
     3. Les sports

     La liste des types d'entrainement d'Apple Sante, avec la
     valeur de MET du Compendium. Quand une activite couvre une
     large plage d'intensite (la course, le velo), on retient la
     valeur d'un effort soutenu mais pas maximal, et l'intensite
     choisie a la saisie l'ajuste ensuite.
     ============================================================ */
  const SPORTS = [
    /* --- Course et marche --- */
    { id: 'course',        nom: 'Course a pied',        met: 9.8,  fam: 'Course et marche' },
    { id: 'course-tapis',  nom: 'Course sur tapis',     met: 9.0,  fam: 'Course et marche' },
    { id: 'trail',         nom: 'Trail',                met: 11.0, fam: 'Course et marche' },
    { id: 'marche',        nom: 'Marche',               met: 3.5,  fam: 'Course et marche' },
    { id: 'marche-rapide', nom: 'Marche rapide',        met: 5.0,  fam: 'Course et marche' },
    { id: 'randonnee',     nom: 'Randonnee',            met: 6.0,  fam: 'Course et marche' },
    { id: 'escaliers',     nom: 'Montee d escaliers',   met: 8.8,  fam: 'Course et marche' },
    { id: 'stepper',       nom: 'Stepper',              met: 7.5,  fam: 'Course et marche' },

    /* --- Velo --- */
    { id: 'velo',          nom: 'Velo',                 met: 8.0,  fam: 'Velo' },
    { id: 'velo-appart',   nom: 'Velo d appartement',   met: 7.0,  fam: 'Velo' },
    { id: 'vtt',           nom: 'VTT',                  met: 8.5,  fam: 'Velo' },
    { id: 'spinning',      nom: 'Spinning',             met: 8.5,  fam: 'Velo' },
    { id: 'handbike',      nom: 'Handbike',             met: 6.5,  fam: 'Velo' },

    /* --- Salle et renforcement --- */
    { id: 'muscu',         nom: 'Musculation',          met: 5.0,  fam: 'Salle' },
    { id: 'muscu-legere',  nom: 'Musculation legere',   met: 3.5,  fam: 'Salle' },
    { id: 'crossfit',      nom: 'Cross-training',       met: 8.0,  fam: 'Salle' },
    { id: 'hiit',          nom: 'Fractionne (HIIT)',    met: 10.0, fam: 'Salle' },
    { id: 'circuit',       nom: 'Circuit training',     met: 7.5,  fam: 'Salle' },
    { id: 'calisthenie',   nom: 'Calisthenie',          met: 6.0,  fam: 'Salle' },
    { id: 'rameur',        nom: 'Rameur',               met: 8.5,  fam: 'Salle' },
    { id: 'elliptique',    nom: 'Elliptique',           met: 6.5,  fam: 'Salle' },
    { id: 'corde',         nom: 'Corde a sauter',       met: 11.0, fam: 'Salle' },
    { id: 'core',          nom: 'Gainage et abdos',     met: 4.0,  fam: 'Salle' },
    { id: 'fonctionnel',   nom: 'Entrainement fonctionnel', met: 5.5, fam: 'Salle' },
    { id: 'souplesse',     nom: 'Etirements',           met: 2.3,  fam: 'Salle' },
    { id: 'yoga',          nom: 'Yoga',                 met: 3.0,  fam: 'Salle' },
    { id: 'pilates',       nom: 'Pilates',              met: 3.8,  fam: 'Salle' },
    { id: 'barre',         nom: 'Barre au sol',         met: 4.0,  fam: 'Salle' },
    { id: 'taichi',        nom: 'Tai-chi',              met: 3.0,  fam: 'Salle' },
    { id: 'mobilite',      nom: 'Mobilite',             met: 2.8,  fam: 'Salle' },

    /* --- Ballon --- */
    { id: 'football',      nom: 'Football',             met: 8.0,  fam: 'Sports de ballon' },
    { id: 'basket',        nom: 'Basket-ball',          met: 7.5,  fam: 'Sports de ballon' },
    { id: 'volley',        nom: 'Volley-ball',          met: 5.0,  fam: 'Sports de ballon' },
    { id: 'beach-volley',  nom: 'Beach-volley',         met: 8.0,  fam: 'Sports de ballon' },
    { id: 'handball',      nom: 'Handball',             met: 8.0,  fam: 'Sports de ballon' },
    { id: 'rugby',         nom: 'Rugby',                met: 8.3,  fam: 'Sports de ballon' },
    { id: 'football-us',   nom: 'Football americain',   met: 8.0,  fam: 'Sports de ballon' },
    { id: 'hockey',        nom: 'Hockey',               met: 8.0,  fam: 'Sports de ballon' },
    { id: 'lacrosse',      nom: 'Crosse',               met: 8.0,  fam: 'Sports de ballon' },
    { id: 'softball',      nom: 'Softball et baseball', met: 5.0,  fam: 'Sports de ballon' },
    { id: 'cricket',       nom: 'Cricket',              met: 4.8,  fam: 'Sports de ballon' },

    /* --- Raquette --- */
    { id: 'tennis',        nom: 'Tennis',               met: 7.3,  fam: 'Raquettes' },
    { id: 'padel',         nom: 'Padel',                met: 6.5,  fam: 'Raquettes' },
    { id: 'badminton',     nom: 'Badminton',            met: 5.5,  fam: 'Raquettes' },
    { id: 'squash',        nom: 'Squash',               met: 12.0, fam: 'Raquettes' },
    { id: 'tennis-table',  nom: 'Tennis de table',      met: 4.0,  fam: 'Raquettes' },
    { id: 'racketball',    nom: 'Racquetball',          met: 7.0,  fam: 'Raquettes' },
    { id: 'pickleball',    nom: 'Pickleball',           met: 5.5,  fam: 'Raquettes' },

    /* --- Eau --- */
    { id: 'natation',      nom: 'Natation',             met: 7.0,  fam: 'Sports d eau' },
    { id: 'natation-eau-libre', nom: 'Nage en eau libre', met: 8.3, fam: 'Sports d eau' },
    { id: 'aquagym',       nom: 'Aquagym',              met: 5.3,  fam: 'Sports d eau' },
    { id: 'water-polo',    nom: 'Water-polo',           met: 10.0, fam: 'Sports d eau' },
    { id: 'surf',          nom: 'Surf',                 met: 5.0,  fam: 'Sports d eau' },
    { id: 'paddle',        nom: 'Paddle',               met: 6.0,  fam: 'Sports d eau' },
    { id: 'kayak',         nom: 'Kayak et canoe',       met: 5.0,  fam: 'Sports d eau' },
    { id: 'aviron',        nom: 'Aviron',               met: 7.0,  fam: 'Sports d eau' },
    { id: 'voile',         nom: 'Voile',                met: 3.3,  fam: 'Sports d eau' },
    { id: 'kitesurf',      nom: 'Kitesurf',             met: 7.0,  fam: 'Sports d eau' },
    { id: 'plongee',       nom: 'Plongee',              met: 7.0,  fam: 'Sports d eau' },
    { id: 'snorkeling',    nom: 'Randonnee palmee',     met: 5.0,  fam: 'Sports d eau' },

    /* --- Neige et glace --- */
    { id: 'ski',           nom: 'Ski alpin',            met: 6.8,  fam: 'Neige et glace' },
    { id: 'ski-fond',      nom: 'Ski de fond',          met: 9.0,  fam: 'Neige et glace' },
    { id: 'snowboard',     nom: 'Snowboard',            met: 5.3,  fam: 'Neige et glace' },
    { id: 'patinage',      nom: 'Patinage',             met: 7.0,  fam: 'Neige et glace' },
    { id: 'raquettes-neige', nom: 'Raquettes a neige',  met: 7.5,  fam: 'Neige et glace' },
    { id: 'curling',       nom: 'Curling',              met: 4.0,  fam: 'Neige et glace' },

    /* --- Combat --- */
    { id: 'boxe',          nom: 'Boxe',                 met: 9.0,  fam: 'Sports de combat' },
    { id: 'kickboxing',    nom: 'Kickboxing',           met: 10.0, fam: 'Sports de combat' },
    { id: 'mma',           nom: 'Arts martiaux mixtes', met: 10.3, fam: 'Sports de combat' },
    { id: 'judo',          nom: 'Judo et lutte',        met: 10.3, fam: 'Sports de combat' },
    { id: 'karate',        nom: 'Karate et taekwondo',  met: 10.3, fam: 'Sports de combat' },
    { id: 'escrime',       nom: 'Escrime',              met: 6.0,  fam: 'Sports de combat' },

    /* --- Autres --- */
    { id: 'danse',         nom: 'Danse',                met: 5.5,  fam: 'Autres' },
    { id: 'danse-cardio',  nom: 'Danse cardio',         met: 7.3,  fam: 'Autres' },
    { id: 'escalade',      nom: 'Escalade',             met: 8.0,  fam: 'Autres' },
    { id: 'equitation',    nom: 'Equitation',           met: 5.5,  fam: 'Autres' },
    { id: 'golf',          nom: 'Golf',                 met: 4.8,  fam: 'Autres' },
    { id: 'bowling',       nom: 'Bowling',              met: 3.8,  fam: 'Autres' },
    { id: 'petanque',      nom: 'Petanque',             met: 2.5,  fam: 'Autres' },
    { id: 'skate',         nom: 'Skateboard',           met: 5.0,  fam: 'Autres' },
    { id: 'roller',        nom: 'Roller',               met: 7.5,  fam: 'Autres' },
    { id: 'tir-arc',       nom: 'Tir a l arc',          met: 4.3,  fam: 'Autres' },
    { id: 'chasse',        nom: 'Chasse',               met: 5.0,  fam: 'Autres' },
    { id: 'peche',         nom: 'Peche',                met: 3.5,  fam: 'Autres' },
    { id: 'jardinage',     nom: 'Jardinage',            met: 3.8,  fam: 'Autres' },
    { id: 'menage',        nom: 'Menage energique',     met: 3.3,  fam: 'Autres' },
    { id: 'fauteuil',      nom: 'Fauteuil roulant',     met: 4.8,  fam: 'Autres' },
    { id: 'autre',         nom: 'Autre activite',       met: 5.0,  fam: 'Autres' }
  ];

  /* Trois intensites, qui multiplient le MET de reference. Elles
     couvrent la plage donnee par le Compendium pour une meme
     activite : marcher tranquillement ou marcher vite, ce n'est
     pas le meme cout. */
  const INTENSITES = [
    { id: 'douce',    nom: 'Tranquille', k: 0.75 },
    { id: 'normale',  nom: 'Normale',    k: 1.00 },
    { id: 'forte',    nom: 'Intense',    k: 1.28 }
  ];

  /* ============================================================
     4. Le calcul

     Tout passe par ici, pour qu'il n'existe qu'une seule verite
     sur les calories dans l'application.
     ============================================================ */
  const G = 9.81;              /* pesanteur */
  const EXCENTRIQUE = 1.33;    /* la descente coute un tiers de plus */
  const RENDEMENT = 0.22;      /* rendement musculaire humain */
  const JOULES_PAR_KCAL = 4184;

  /* Calories d'un sport : formule ACSM. */
  function caloriesSport(metBase, minutes, poids, intensite) {
    const k = (INTENSITES.find((i) => i.id === intensite) || INTENSITES[1]).k;
    const met = Math.max(1, metBase * k);
    return met * 3.5 * poids / 200 * Math.max(0, minutes);
  }

  /* Masse reellement soulevee sur une repetition. */
  function masseSoulevee(exo, charge, poids) {
    if (!exo) return Number(charge) || 0;
    if (exo.mode === 'charge') return Number(charge) || 0;
    /* Poids du corps, plus le lest eventuel. */
    return (exo.fraction || 0) * poids + (Number(charge) || 0);
  }

  /* Travail mecanique d'une serie, en joules. */
  function travailSerie(exo, charge, reps, poids) {
    if (!exo || exo.mode === 'iso') return 0;
    const m = masseSoulevee(exo, charge, poids);
    return m * G * (exo.rom || 0) * (Number(reps) || 0) * EXCENTRIQUE;
  }

  /* Volume souleve, en kilos. C'est le chiffre que suivent les
     pratiquants, et il ne depend d'aucune hypothese. */
  function tonnage(exo, charge, reps, poids) {
    const m = masseSoulevee(exo, charge, poids);
    return m * (Number(reps) || 0);
  }

  /* Calories d'une seance de musculation.
     `series` : [{ exoId, charge, reps }], `minutes` : duree totale. */
  function caloriesSeance(series, minutes, poids) {
    minutes = Math.max(1, Number(minutes) || 0);
    poids = Number(poids) || 75;

    /* Une seance vide ne coute rien. Sans ce garde-fou, la borne
       basse du MET faisait apparaitre des calories pour une seance
       qu'on vient d'ouvrir et ou rien n'est encore saisi. */
    if (!series || !series.length) return { kcal: 0, tonnage: 0, met: 0, series: 0, reps: 0 };

    let joules = 0, kilos = 0;
    (series || []).forEach((s) => {
      const exo = trouver(s.exoId);
      joules += travailSerie(exo, s.charge, s.reps, poids);
      kilos += tonnage(exo, s.charge, s.reps, poids);
    });

    /* a) Depense issue du travail mecanique. */
    const parTravail = joules / RENDEMENT / JOULES_PAR_KCAL;

    /* b) Depense issue de la densite de travail, via le MET.

       La densite est rapportee au poids du corps, sinon un gabarit
       lourd qui souleve lourd paraitrait toujours en circuit alors
       qu'il prend simplement des pauses plus longues.

       Calage : sous 4 joules par kilo et par minute, on est sur
       l'effort modere du Compendium (3,5 MET, une seance tranquille
       avec de longues pauses) ; au-dessus de 20, sur du circuit
       enchaine (6,0 MET). Entre les deux, on interpole.

       Verification : une seance de quatorze series lourdes en une
       heure tombe autour de 5 MET, soit sept kilocalories par
       minute. C'est ce que mesurent les etudes de calorimetrie sur
       des seances d'hypertrophie. */
    const densite = joules / minutes / poids;
    const met = densite <= 4 ? 3.5
              : densite >= 20 ? 6.0
              : 3.5 + (densite - 4) / 16 * 2.5;
    const parMet = met * 3.5 * poids / 200 * minutes;

    /* On garde le plus grand des deux, jamais la somme : ce serait
       compter le meme effort deux fois. */
    return {
      kcal: Math.round(Math.max(parTravail, parMet)),
      tonnage: Math.round(kilos),
      met: Math.round(met * 10) / 10,
      series: (series || []).length,
      reps: (series || []).reduce((a, s) => a + (Number(s.reps) || 0), 0)
    };
  }

  /* Muscles travailles par une liste de series, avec un score.
     Un muscle principal compte pour un, un secondaire pour un
     tiers : c'est ce qui donne les nuances de la carte du corps. */
  function musclesTravailles(series) {
    const score = {};
    (series || []).forEach((s) => {
      const exo = trouver(s.exoId);
      if (!exo) return;
      const poidsSerie = Math.max(1, Number(s.reps) || 1) / 10;
      exo.principaux.forEach((m) => { score[m] = (score[m] || 0) + poidsSerie; });
      exo.secondaires.forEach((m) => { score[m] = (score[m] || 0) + poidsSerie / 3; });
    });
    return score;
  }

  /* ---------- Recherche ---------- */
  const norm = (s) => String(s || '').toLowerCase()
    .replace(/œ/g, 'oe').normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();

  const INDEX = {};
  EXOS.forEach((e) => { INDEX[e.id] = e; e._s = norm(e.nom + ' ' + e.groupe + ' ' + MATERIEL[e.materiel]); });
  SPORTS.forEach((s) => { s._s = norm(s.nom + ' ' + s.fam); });

  const trouver = (id) => INDEX[id] || null;
  const sport = (id) => SPORTS.find((s) => s.id === id) || null;

  function chercherExo(q, limite) {
    const mots = norm(q).split(' ').filter(Boolean);
    if (!mots.length) return EXOS.slice(0, limite || 20);
    return EXOS.filter((e) => mots.every((m) => e._s.indexOf(m) >= 0)).slice(0, limite || 20);
  }
  function chercherSport(q, limite) {
    const mots = norm(q).split(' ').filter(Boolean);
    if (!mots.length) return SPORTS.slice(0, limite || 20);
    return SPORTS.filter((s) => mots.every((m) => s._s.indexOf(m) >= 0)).slice(0, limite || 20);
  }
  const parGroupe = (g) => EXOS.filter((e) => e.groupe === g);
  const familles = () => Array.from(new Set(SPORTS.map((s) => s.fam)));

  global.SPORT = {
    MUSCLES, GROUPES, MATERIEL, EXOS, SPORTS, INTENSITES,
    trouver, sport, chercherExo, chercherSport, parGroupe, familles, norm,
    caloriesSport, caloriesSeance, travailSerie, tonnage, masseSoulevee, musclesTravailles
  };
})(window);
