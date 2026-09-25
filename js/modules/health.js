/* ============================================================
   EVER — Sante

   Point d'honnetete, ecrit une fois pour toutes : HealthKit est
   une API native iOS. Aucune page web, aucune PWA, aucun
   connecteur ne peut lire Apple Santé en direct. Ce n'est pas une
   limite de cette application, c'est une limite d'iOS.

   Le seul chemin qui existe reellement :
     Sante > photo de profil > Exporter toutes les données
     -> export.zip -> on le depose ici.

   Ce module lit ce fichier, agrege tout par jour, et garde ensuite
   les données en local. On peut reimporter un nouvel export quand
   on veut : seules les journées plus recentes sont ajoutées.

   Une saisie manuelle rapide couvre les jours entre deux exports.
   ============================================================ */
(function (global) {
  'use strict';

  const FFLATE = 'https://cdn.jsdelivr.net/npm/fflate@0.8.2/umd/index.js';

  /* Types HealthKit retenus. Le reste est ignore volontairement :
     un export contient des centaines de types dont la plupart
     n'apportent rien a une lecture quotidienne. */
  const TYPES = {
    HKQuantityTypeIdentifierStepCount:              { k: 'steps',    agg: 'sum',  label: 'Pas',                icon: 'steps' },
    HKQuantityTypeIdentifierDistanceWalkingRunning: { k: 'distance', agg: 'sum',  label: 'Distance',           icon: 'map',    unit: 'km' },
    HKQuantityTypeIdentifierActiveEnergyBurned:     { k: 'active',   agg: 'sum',  label: 'Énergie active',     icon: 'flame',  unit: 'kcal' },
    HKQuantityTypeIdentifierBasalEnergyBurned:      { k: 'basal',    agg: 'sum',  label: 'Métabolisme de base', icon: 'flame', unit: 'kcal' },
    HKQuantityTypeIdentifierFlightsClimbed:         { k: 'floors',   agg: 'sum',  label: 'Étages',             icon: 'activity' },
    HKQuantityTypeIdentifierAppleExerciseTime:      { k: 'exercise', agg: 'sum',  label: 'Exercice',           icon: 'dumbbell', unit: 'min' },
    HKQuantityTypeIdentifierAppleStandTime:         { k: 'stand',    agg: 'sum',  label: 'Debout',             icon: 'clock',  unit: 'min' },
    HKQuantityTypeIdentifierHeartRate:              { k: 'hr',       agg: 'avg',  label: 'Fréquence cardiaque', icon: 'pulse', unit: 'bpm' },
    HKQuantityTypeIdentifierRestingHeartRate:       { k: 'hrRest',   agg: 'avg',  label: 'FC au repos',        icon: 'pulse',  unit: 'bpm' },
    HKQuantityTypeIdentifierWalkingHeartRateAverage:{ k: 'hrWalk',   agg: 'avg',  label: 'FC à la marche',     icon: 'pulse',  unit: 'bpm' },
    HKQuantityTypeIdentifierHeartRateVariabilitySDNN:{ k: 'hrv',     agg: 'avg',  label: 'Variabilite (VFC)',  icon: 'pulse',  unit: 'ms' },
    HKQuantityTypeIdentifierVO2Max:                 { k: 'vo2',      agg: 'last', label: 'VO2 max',            icon: 'activity', unit: 'ml/kg/min' },
    HKQuantityTypeIdentifierRespiratoryRate:        { k: 'resp',     agg: 'avg',  label: 'Respiration',        icon: 'water',  unit: '/min' },
    HKQuantityTypeIdentifierOxygenSaturation:       { k: 'spo2',     agg: 'avg',  label: 'Oxygene sanguin',    icon: 'water',  unit: '%' },
    HKQuantityTypeIdentifierBodyMass:               { k: 'weight',   agg: 'last', label: 'Poids',              icon: 'scale',  unit: 'kg' },
    HKQuantityTypeIdentifierBodyFatPercentage:      { k: 'fat',      agg: 'last', label: 'Masse grasse',       icon: 'scale',  unit: '%' },
    HKQuantityTypeIdentifierLeanBodyMass:           { k: 'lean',     agg: 'last', label: 'Masse maigre',       icon: 'scale',  unit: 'kg' },
    HKQuantityTypeIdentifierDietaryWater:           { k: 'hkWater',  agg: 'sum',  label: 'Eau',                icon: 'water',  unit: 'ml' },
    HKQuantityTypeIdentifierBloodPressureSystolic:  { k: 'bpSys',    agg: 'avg',  label: 'Tension systolique', icon: 'pulse' },
    HKQuantityTypeIdentifierBloodPressureDiastolic: { k: 'bpDia',    agg: 'avg',  label: 'Tension diastolique', icon: 'pulse' },
    HKCategoryTypeIdentifierSleepAnalysis:          { k: 'sleep',    agg: 'dur',  label: 'Sommeil',            icon: 'moon',   unit: 'min' },
    HKCategoryTypeIdentifierMindfulSession:         { k: 'mindful',  agg: 'dur',  label: 'Meditation',         icon: 'leaf',   unit: 'min' }
  };

  const WORKOUTS = {
    HKWorkoutActivityTypeRunning: 'Course', HKWorkoutActivityTypeWalking: 'Marche',
    HKWorkoutActivityTypeCycling: 'Velo', HKWorkoutActivityTypeSwimming: 'Natation',
    HKWorkoutActivityTypeTraditionalStrengthTraining: 'Musculation',
    HKWorkoutActivityTypeFunctionalStrengthTraining: 'Renforcement',
    HKWorkoutActivityTypeHighIntensityIntervalTraining: 'HIIT',
    HKWorkoutActivityTypeYoga: 'Yoga', HKWorkoutActivityTypeElliptical: 'Elliptique',
    HKWorkoutActivityTypeRowing: 'Rameur', HKWorkoutActivityTypeHiking: 'Randonnée',
    HKWorkoutActivityTypeTennis: 'Tennis', HKWorkoutActivityTypeSoccer: 'Football',
    HKWorkoutActivityTypeBasketball: 'Basket', HKWorkoutActivityTypeDownhillSkiing: 'Ski',
    HKWorkoutActivityTypeSnowboarding: 'Snowboard', HKWorkoutActivityTypeCoreTraining: 'Gainage',
    HKWorkoutActivityTypeOther: 'Autre'
  };

  let root = null;
  let range = 7;

  /* ============================================================
     Le catalogue des mesures

     Avant, six champs figes, tous affiches, tous vides pour la
     plupart : la page montrait surtout des trous. Le principe est
     inverse maintenant. On propose beaucoup de mesures, on n'en
     impose aucune, et l'application n'affiche QUE celles qui ont
     ete renseignees. Une mesure jamais remplie n'existe pas.

     `cle`      identifiant stocke dans la journee
     `nom`      ce qu'on lit a l'ecran
     `unite`    suffixe affiche sous le chiffre
     `art`      l'illustration de la tuile
     `fmt`      mise en forme du chiffre
     `bas`      vrai quand baisser est un progres (FC, poids, tour de taille)
     `pas`      le pas du champ numerique
     `groupe`   pour ranger le formulaire de saisie
     ============================================================ */
  const METRIQUES = [
    { cle: 'steps',    nom: 'Pas',            groupe: 'Activité', art: 'pas',      teinte: '#3FAE79', unite: '',     fmt: (v) => UI.fmt.n(v) },
    { cle: 'exercise', nom: 'Exercice',       groupe: 'Activité', art: 'eclair',   teinte: '#D98324', unite: 'min',  fmt: (v) => Math.round(v) },
    { cle: 'active',   nom: 'Énergie active', groupe: 'Activité', art: 'flamme',   teinte: '#E0653C', unite: 'kcal', fmt: (v) => UI.fmt.n(v) },
    { cle: 'standing', nom: 'Heures debout',  groupe: 'Activité', art: 'personne', teinte: '#4F9D8C', unite: 'h',    fmt: (v) => Math.round(v) },
    { cle: 'distance', nom: 'Distance',       groupe: 'Activité', art: 'lieu',     teinte: '#3D95D8', unite: 'km',   fmt: (v) => v.toFixed(1).replace('.', ','), pas: '0.1' },

    { cle: 'sleep',    nom: 'Sommeil',        groupe: 'Récupération', art: 'lune', teinte: '#8F76D0', unite: 'h',    fmt: (v) => (v / 60).toFixed(1).replace('.', ','), stockeEnMinutes: true },
    { cle: 'hrRest',   nom: 'FC au repos',    groupe: 'Récupération', art: 'coeur', teinte: '#C6402F', unite: 'bpm', fmt: (v) => Math.round(v), bas: true },
    { cle: 'hrv',      nom: 'Variabilité',    groupe: 'Récupération', art: 'eclair', teinte: '#3D95D8', unite: 'ms', fmt: (v) => Math.round(v) },
    { cle: 'spo2',     nom: 'Oxygène du sang', groupe: 'Récupération', art: 'goutte', teinte: '#4A9BE0', unite: '%', fmt: (v) => Math.round(v) },
    { cle: 'energie',  nom: 'Énergie ressentie', groupe: 'Récupération', art: 'etoile', teinte: '#C8A22C', unite: 'sur 10', fmt: (v) => Math.round(v), max: 10 },
    { cle: 'humeur',   nom: 'Moral',          groupe: 'Récupération', art: 'coeur',   teinte: '#B0264F', unite: 'sur 10', fmt: (v) => Math.round(v), max: 10 },
    { cle: 'stress',   nom: 'Stress',         groupe: 'Récupération', art: 'flamme',  teinte: '#8A5A2B', unite: 'sur 10', fmt: (v) => Math.round(v), max: 10, bas: true },

    { cle: 'weight',   nom: 'Poids',          groupe: 'Corps', art: 'balance',  teinte: '#43A86B', unite: 'kg', fmt: (v) => v.toFixed(1).replace('.', ','), pas: '0.1', bas: true },
    { cle: 'bodyFat',  nom: 'Masse grasse',   groupe: 'Corps', art: 'balance',  teinte: '#B37814', unite: '%',  fmt: (v) => v.toFixed(1).replace('.', ','), pas: '0.1', bas: true },
    { cle: 'muscle',   nom: 'Masse musculaire', groupe: 'Corps', art: 'haltere', teinte: '#1F4E79', unite: 'kg', fmt: (v) => v.toFixed(1).replace('.', ','), pas: '0.1' },
    { cle: 'taille',   nom: 'Tour de taille', groupe: 'Corps', art: 'balance',  teinte: '#6B5330', unite: 'cm', fmt: (v) => v.toFixed(1).replace('.', ','), pas: '0.5', bas: true },
    { cle: 'bras',     nom: 'Tour de bras',   groupe: 'Corps', art: 'haltere',  teinte: '#2F6B5A', unite: 'cm', fmt: (v) => v.toFixed(1).replace('.', ','), pas: '0.5' },
    { cle: 'cuisse',   nom: 'Tour de cuisse', groupe: 'Corps', art: 'velo',     teinte: '#4F5D8C', unite: 'cm', fmt: (v) => v.toFixed(1).replace('.', ','), pas: '0.5' },

    { cle: 'eau',      nom: 'Eau',            groupe: 'Autres', art: 'goutte',   teinte: '#3D95D8', unite: 'L',  fmt: (v) => v.toFixed(1).replace('.', ','), pas: '0.1' },
    { cle: 'cafe',     nom: 'Cafés',          groupe: 'Autres', art: 'tasse',    teinte: '#8A4B1E', unite: '',   fmt: (v) => Math.round(v), bas: true },
    { cle: 'alcool',   nom: 'Verres d\'alcool', groupe: 'Autres', art: 'verre',  teinte: '#6B2A4E', unite: '',   fmt: (v) => Math.round(v), bas: true },
    { cle: 'ecrans',   nom: 'Temps d\'écran', groupe: 'Autres', art: 'appareil', teinte: '#5A6371', unite: 'h',  fmt: (v) => v.toFixed(1).replace('.', ','), pas: '0.5', bas: true }
  ];

  const metrique = (k) => METRIQUES.find((m) => m.cle === k) || null;
  const GROUPES = ['Activité', 'Récupération', 'Corps', 'Autres'];

  /* La liste des mesures qui ont au moins une valeur enregistree.
     C'est elle qui decide de ce que la page affiche. */
  function metriquesRenseignees(jours) {
    return METRIQUES.filter((m) => jours.some((d) => d[m.cle] != null && d[m.cle] !== ''));
  }

  const daily = () => Store.all('healthDays');
  const dayOf = (k) => daily().find((d) => d.day === k) || null;
  const goals = () => Object.assign({ steps: 10000, exercise: 30, active: 500, sleep: 450 }, Store.get('healthGoals', {}));

  function lastDays(n) {
    const map = {}; daily().forEach((d) => map[d.day] = d);
    const out = [];
    for (let i = n - 1; i >= 0; i--) {
      const k = UI.day.add(UI.day.today(), -i);
      out.push(map[k] || { day: k });
    }
    return out;
  }

  /* ============================================================
     Rendu
     ============================================================ */
  function mount(el) {
    root = el; render();
    /* Les chiffres envoyés par l'iPhone arrivent tout seuls : on va
       les chercher à chaque ouverture, au plus toutes les 10 minutes. */
    const s = Store.get('healthSync', null);
    if (s && Date.now() - (s.pull || 0) > 10 * 60e3) tirer(true);
  }

  /* ============================================================
     Apple Santé en automatique

     iOS interdit à une page web de LIRE Santé, mais rien n'empêche
     l'iPhone d'ENVOYER ses chiffres. Un Raccourci programmé le soir,
     ou l'app Health Auto Export, les poste sur la fonction serveur
     `ever-sante` (sql/edge/ever-sante.ts). L'appli les récupère ici.

     Pas besoin de compte : l'appareil tire un jeton secret au
     hasard, qui sert d'adresse privée. Qui n'a pas le jeton ne
     voit rien.
     ============================================================ */
  const CLES_SANTE = ['steps', 'distance', 'active', 'basal', 'floors', 'exercise', 'stand', 'hr', 'hrRest', 'hrWalk',
    'hrv', 'vo2', 'resp', 'spo2', 'weight', 'fat', 'lean', 'hkWater', 'bpSys', 'bpDia', 'sleep', 'mindful'];

  function jeton() {
    let t = Store.get('healthToken', '');
    if (!t) {
      const a = new Uint8Array(24);
      crypto.getRandomValues(a);
      t = btoa(String.fromCharCode.apply(null, a)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
      Store.set('healthToken', t);
    }
    return t;
  }
  function adresseSync() {
    return ((global.EVER_CONFIG || {}).supabaseUrl || '') + '/functions/v1/ever-sante?t=' + jeton();
  }

  async function tirer(silencieux) {
    let r;
    try {
      r = await fetch(adresseSync() + '&since=' + UI.day.add(UI.day.today(), -120));
    } catch (e) {
      if (!silencieux) UI.toast('Pas de réseau pour le moment');
      return 0;
    }
    const j = await r.json().catch(() => null);
    if (!r.ok || !j || !j.ok) { if (!silencieux) UI.toast('Synchro impossible pour le moment'); return 0; }

    const existants = {};
    Store.all('healthDays').forEach((d) => existants[d.day] = d);
    let n = 0, dernier = null;
    (j.days || []).forEach((x) => {
      const row = { day: x.day };
      CLES_SANTE.forEach((k) => { if (x[k] != null) row[k] = x[k]; });
      if (Object.keys(row).length < 2) return;
      if (existants[x.day]) Store.put('healthDays', existants[x.day].id, row);
      else Store.add('healthDays', row);
      n++; dernier = x;
    });
    const avant = Store.get('healthSync', null) || {};
    Store.set('healthSync', {
      pull: Date.now(), jours: n || avant.jours || 0,
      recu: dernier ? dernier._at : avant.recu || null,
      src: dernier ? dernier._src : avant.src || null
    });
    if (n) Store.set('healthInsight', null);
    if (root && root.isConnected) render();
    if (!silencieux) UI.toast(n ? n + (n > 1 ? ' journées à jour' : ' journée à jour') : 'Rien de reçu pour l\'instant');
    return n;
  }

  function depuis(iso) {
    if (!iso) return 'jamais';
    const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
    if (m < 2) return "à l'instant";
    if (m < 60) return 'il y a ' + m + ' min';
    const h = Math.round(m / 60);
    if (h < 48) return 'il y a ' + h + ' h';
    return 'il y a ' + Math.round(h / 24) + ' jours';
  }

  /* Le bandeau du haut : une seule ligne, qui dit si ça marche. */
  function blocConnexion() {
    const s = Store.get('healthSync', null);
    if (s && s.recu) {
      return '<div class="section" style="padding-top:10px"><div class="panel santelien on">' +
        '<span class="pastille">' + Icon('heart', 18) + '</span>' +
        '<span class="tx"><b>Apple Santé connecté</b><small>Dernier envoi ' + UI.esc(depuis(s.recu)) + '</small></span>' +
        '<button class="iconbtn" data-act="tirer" aria-label="Actualiser">' + Icon('refresh', 18) + '</button>' +
        '</div></div>';
    }
    return '<div class="section" style="padding-top:10px"><button class="panel santelien" data-act="connecter">' +
      '<span class="pastille">' + Icon('heart', 18) + '</span>' +
      '<span class="tx"><b>Connecter Apple Santé</b><small>' +
        (s ? 'En attente du premier envoi de ton iPhone' : 'Tes pas, ton sommeil et ton cœur, chaque jour, tout seuls') +
      '</small></span>' + Icon('next', 17) + '</button></div>';
  }

  function etape(n, t, sous) {
    return '<div class="rowitem"><span class="ic">' + n + '</span><span class="tx"><b style="font-weight:600">' + t + '</b>' +
      (sous ? '<small>' + sous + '</small>' : '') + '</span></div>';
  }

  function connecter() {
    const url = adresseSync();
    Store.set('healthSync', Store.get('healthSync', null) || { pull: 0, jours: 0, recu: null });
    UI.openSheet(
      '<div class="mbody" style="padding-top:6px">' +
        '<h2 style="font-size:22px">Connecter Apple Santé</h2>' +
        '<p class="mdesc">Ton iPhone envoie ses chiffres à EVER chaque jour. Tu règles ça une fois, ensuite tu n\'y touches plus.</p>' +
        '<div class="panel" style="margin-top:14px">' +
          '<small class="muted" style="display:block;margin-bottom:6px">Ton adresse privée (ne la partage pas)</small>' +
          '<code style="display:block;font-size:11.5px;word-break:break-all;line-height:1.45">' + UI.esc(url) + '</code>' +
          '<button class="btn primary block" style="margin-top:10px" data-copier>' + Icon('link', 16) + 'Copier l\'adresse</button>' +
        '</div>' +

        '<div class="sechead" style="margin-top:18px"><h2 style="font-size:16px">Option 1 · La plus simple</h2><span>Health Auto Export</span></div>' +
        '<div class="list">' +
          etape(1, 'Installe <a href="https://apps.apple.com/app/health-auto-export-json-csv/id1115567069" target="_blank" rel="noopener">Health Auto Export</a>', 'L\'automatisation REST fait partie de l\'offre payante (quelques euros)') +
          etape(2, 'Automatisations, puis « Nouvelle », type « REST API »') +
          etape(3, 'Colle ton adresse dans URL, format JSON', 'Données : Health Metrics · Période : depuis la dernière synchro') +
          etape(4, 'Active-la, puis touche « Exporter maintenant »', 'Ensuite elle envoie toute seule') +
        '</div>' +

        '<div class="sechead" style="margin-top:18px"><h2 style="font-size:16px">Option 2 · Gratuite</h2><span>Raccourcis iPhone</span></div>' +
        '<div class="list">' +
          etape(1, 'Raccourcis, onglet Automatisation, « + »', '« Heure de la journée », 22:00, Quotidiennement, « Exécuter immédiatement »') +
          etape(2, 'Action « Rechercher des échantillons de santé »', 'Type : Nombre de pas · Date de début : aujourd\'hui') +
          etape(3, 'Action « Calculer des statistiques » : Somme', 'Refais 2 et 3 pour Énergie active (Somme) et FC au repos (Moyenne)') +
          etape(4, 'Action « Dictionnaire »', 'Clés : steps, active, hrRest (et weight, sleepH si tu veux), chacune reliée à son résultat') +
          etape(5, 'Action « Obtenir le contenu de l\'URL »', 'Colle l\'adresse · Méthode POST · Corps JSON · Fichier : le Dictionnaire') +
        '</div>' +

        '<button class="btn block lg" style="margin-top:16px" data-verifier>' + Icon('refresh', 17) + 'Vérifier la connexion</button>' +
        '<button class="btn ghost block" style="margin-top:8px" data-act-import>' + Icon('upload', 16) + 'Plutôt importer un export complet</button>' +
        '<p class="aide">Les chiffres arrivent sur ton adresse privée, puis dans l\'appli à chaque ouverture de Santé.</p>' +
      '</div>');
    const sh = document.getElementById('sheet');
    if (!sh) return;
    const c = sh.querySelector('[data-copier]'); if (c) c.onclick = () => UI.copy(url);
    const v = sh.querySelector('[data-verifier]'); if (v) v.onclick = async () => {
      v.disabled = true;
      const n = await tirer(true);
      v.disabled = false;
      if (n) { UI.closeSheet(); UI.toast('Apple Santé est connecté'); }
      else UI.toast('Rien reçu pour l\'instant. Lance l\'envoi sur l\'iPhone, puis réessaie.');
    };
    const im = sh.querySelector('[data-act-import]'); if (im) im.onclick = () => { UI.closeSheet(); importFlow(); };
  }

  /* Le jour affiche. Comme dans l'alimentation, on peut remonter :
     on oublie souvent de saisir le soir meme, et les donnees sont
     encore la le lendemain. */
  let jour = UI.day.today();

  function render() {
    const days = lastDays(range);
    const today = dayOf(jour) || { day: jour };
    const has = daily().length > 0;

    /* L'ordre suit ce qu'on vient chercher : le sport du jour parce
       qu'on le saisit tous les jours, l'analyse ensuite parce
       qu'elle repond a la question qu'on se pose en ouvrant la
       page. Les tendances et l'import viennent apres. Avant,
       l'analyse etait tout en bas. */
    /* L'ordre suit la frequence d'usage. Saisir sa journee et
       regler ses objectifs sont les deux gestes qu'on refait sans
       arret : ils passent tout en haut, avant meme le bilan.
       Les tendances et l'import, qu'on consulte, restent apres. */
    root.innerHTML = '<div class="wrap">' +
      blocConnexion() +
      barreJour() +
      formeBlock(today) +
      tuilesMesures(today) +
      tassesBlock() +
      actionsSante() +
      blocSport() +
      (has ? insightBlock(days) + rangeBar() + trendBlock(days) + workoutsBlock() : '') +
      (global.Sport ? Sport.carteDuCorps(7) : '') +
      sourcesBlock() +
      '</div>';
    bind();
  }

  /* ============================================================
     La barre de jour

     Le sport et la sante n'avaient aucun moyen de revenir en
     arriere : une journee oubliee etait perdue, alors que les
     donnees, elles, sont encore la le lendemain. On reprend la
     barre de l'alimentation, a l'identique, pour que le geste
     soit le meme partout.
     ============================================================ */
  function barreJour() {
    const demain = UI.day.add(jour, 1);
    const futur = demain > UI.day.today();
    return '<div class="barrejour">' +
      '<button data-jour="-1" aria-label="Jour précédent">' + Icon('back', 17) + '</button>' +
      '<span class="tx"><b>' + UI.esc(UI.day.label(jour)) + '</b>' +
        (dayOf(jour) ? '<small>Journée renseignée</small>' : '<small>Rien de noté</small>') + '</span>' +
      '<button data-jour="1" aria-label="Jour suivant"' + (futur ? ' disabled' : '') + '>' + Icon('next', 17) + '</button>' +
      '</div>';
  }

  /* ============================================================
     La page Santé de la maquette Aurora

     1. la forme du jour : un anneau et une phrase ;
     2. quatre mesures en tuiles : sommeil, pas, cœur, poids ;
     3. les six tasses sur sept jours, en barres ;
     4. deux boutons : saisir la journée, noter une séance.

     La forme n'est pas un chiffre magique : c'est la moyenne de ce
     qui est atteint par rapport à TES objectifs (pas, sommeil,
     exercice), sur les mesures qu'on a pour ce jour. Sans mesure,
     pas de chiffre inventé.
     ============================================================ */
  function forme(d) {
    const g = goals(), parts = [];
    if (d.steps != null) parts.push(Math.min(1, d.steps / g.steps));
    if (d.sleep != null) parts.push(Math.min(1, d.sleep / g.sleep));
    if (d.exercise != null) parts.push(Math.min(1, d.exercise / g.exercise));
    if (d.active != null) parts.push(Math.min(1, d.active / g.active));
    if (!parts.length) return null;
    return Math.round(100 * parts.reduce((a, b) => a + b, 0) / parts.length);
  }

  function formeBlock(d) {
    const f = forme(d);
    const R = 49, C = 2 * Math.PI * R, p = f == null ? 0 : f / 100;
    const seul = global.Mood ? Mood.joursSansLien() : null;
    const titre = f == null ? 'Pas encore de mesure'
      : f >= 80 ? 'Belle forme' : f >= 60 ? 'Bonne forme' : f >= 40 ? 'Journée moyenne' : 'À recharger';
    const bits = [];
    if (d.sleep != null) bits.push('nuit de ' + UI.fmt.dur(d.sleep));
    if (d.steps != null) bits.push(UI.fmt.n(d.steps) + ' pas');
    let texte = f == null ? 'Connecte Apple Santé ou saisis ta journée : la lecture se fait toute seule.'
      : (bits.length ? bits.join(', ').replace(/^./, (c) => c.toUpperCase()) + '.' : 'Selon tes objectifs du jour.');
    if (seul != null && seul >= 4) texte += ' Point faible : ' + seul + ' jours sans voir personne.';
    return '<div class="section" style="padding-top:12px"><div class="panel forme-jour">' +
      '<div class="fr"><svg viewBox="0 0 110 110" aria-hidden="true">' +
        '<circle cx="55" cy="55" r="' + R + '" fill="none" stroke="rgba(255,255,255,.1)" stroke-width="12"/>' +
        (p > 0 ? '<circle cx="55" cy="55" r="' + R + '" fill="none" stroke="#7FE0C0" stroke-width="12" stroke-linecap="round" stroke-dasharray="' +
          (C * p).toFixed(1) + ' ' + C.toFixed(1) + '" transform="rotate(-90 55 55)"/>' : '') +
        '</svg><div class="frc">' + (f == null ? TIRET : '<b>' + f + '</b>') + '<small>forme</small></div></div>' +
      '<div class="fd"><b>' + UI.esc(titre) + '</b><span>' + UI.esc(texte) + '</span></div>' +
    '</div></div>';
  }

  /* Pas de donnée : un trait dessiné, centré, plutôt qu'un caractère. */
  const TIRET = '<i class="tiret" role="img" aria-label="Pas de donnée"></i>';
  const valeur = (v) => v === '–' ? '<b class="tabnum vide">' + TIRET + '</b>' : '<b class="tabnum">' + UI.esc(v) + '</b>';

  function tuilesMesures(d) {
    const val = (k) => d[k] != null ? d[k] : null;
    const poids = val('weight') != null ? d.weight.toFixed(1).replace('.', ',') + ' kg' : lastKnown('weight');
    const T = [
      ['Sommeil', val('sleep') != null ? UI.fmt.dur(d.sleep) : '–', 'sommeil', 'sleep'],
      ['Pas', val('steps') != null ? UI.fmt.n(d.steps) : '–', 'pas', 'steps'],
      ['Cœur au repos', val('hrRest') != null ? Math.round(d.hrRest) + ' bpm' : '–', 'cardio', 'hrRest'],
      ['Poids', poids, 'poids', 'weight']
    ];
    return '<div class="section" style="padding-top:10px"><div class="mesures">' + T.map((t) =>
      '<button class="mesure avecvis" data-detail="' + t[3] + '">' + Vis.html(t[2], { classe: 'mvis3d' }) +
      '<span class="mtx"><small>' + t[0] + '</small>' + valeur(t[1]) + '</span></button>').join('') + '</div></div>';
  }

  function tassesBlock() {
    if (!global.Mood || !global.MOODS) return '';
    const b = Mood.balance(7);
    const ids = Object.keys(MOODS.MOLECULES);
    const max = Math.max(1, ...ids.map((m) => b[m] || 0));
    return '<div class="section" style="padding-top:10px"><a class="panel tasses-jour" href="#/m/stats">' +
      '<div class="row-between"><b>Les six tasses · 7 jours</b><span class="muted">Voir</span></div>' +
      '<div class="tbars">' + ids.map((m) => {
        const mol = MOODS.MOLECULES[m], v = b[m] || 0;
        return '<div class="tb"><div class="tt"><i style="height:' + Math.max(6, Math.round(100 * v / max)) + '%;--t:' + mol.teinte + ';opacity:' + (v ? 1 : .35) + '"></i></div>' +
          '<small>' + UI.esc(mol.court || mol.nom) + '</small></div>';
      }).join('') + '</div></a></div>';
  }

  function actionsSante() {
    const rempli = dayOf(jour);
    return '<div class="section" style="padding-top:12px"><div class="actsante">' +
      '<button class="btn primary lg" data-act="manual">' + Icon(rempli ? 'edit' : 'plus', 18) + '<span>' + (rempli ? 'Modifier ce jour' : 'Saisir ce jour') + '</span></button>' +
      '<button class="btn lg" data-act="muscu">' + Icon('dumbbell', 18) + '<span>Séance</span></button>' +
      '<button class="btn lg rond" data-act="goals" aria-label="Mes objectifs">' + Icon('target', 20) + '</button>' +
    '</div></div>';
  }

  /* Les deux gestes du quotidien, en grand, tout en haut. */
  function blocSaisie() {
    const rempli = dayOf(jour);
    return '<div class="section" style="padding-top:10px">' +
      Cartes.grille([
        { id: 'manual', titre: rempli ? 'Modifier ce jour' : 'Saisir ce jour',
          /* On compte les MESURES, pas les champs techniques que le
             stockage ajoute (identifiant, horodatage). */
          sous: rempli ? (function () {
            const n = METRIQUES.filter((m) => rempli[m.cle] != null && rempli[m.cle] !== '').length;
            return n + (n > 1 ? ' mesures notées' : ' mesure notée');
          }()) : 'Pas, sommeil, poids…',
          ph: 'ajouter', type: 'icone' },
        { id: 'goals', titre: 'Mes objectifs', sous: 'Ce que tu vises chaque jour',
          ph: 'objectifs', type: 'icone' }
      ]) + '</div>';
  }

  /* ============================================================
     Le sport du jour

     Apple Sante ne sait rien d'une seance de salle : elle n'est ni
     comptee en pas, ni en minutes d'exercice si la montre reste au
     vestiaire. C'est donc ici qu'on la saisit, et ces calories
     s'ajoutent a celles de la montre.
     ============================================================ */
  function blocSport() {
    if (!global.Sport) return '';
    const j = Sport.duJour();
    const s7 = Sport.semaine(7);

    return '<div class="section" style="padding-top:14px">' +
      '<div class="panel bloc-sport">' +
        '<div class="row" style="gap:14px;align-items:center">' +
          '<div class="illu">' + Anime.art('haltere', 54) + '</div>' +
          '<div class="grow">' +
            '<b style="font-size:16px;display:block">Mon sport</b>' +
            '<small class="muted" style="font-size:12.5px">' +
              (j.seances
                ? j.seances + ' séance' + (j.seances > 1 ? 's' : '') + " aujourd'hui · " + UI.fmt.n(j.kcal) + ' kcal'
                : (s7.seances ? s7.seances + ' séance' + (s7.seances > 1 ? 's' : '') + ' cette semaine' : 'Rien de consigné cette semaine')) +
            '</small>' +
          '</div>' +
        '</div>' +
        Portes.grille([
          { act: 'muscu',     nom: 'Musculation', sub: 'Séries et charges', ph: 'muscle' },
          { act: 'sportauto', nom: 'Un sport',    sub: 'Course, vélo, nage', ph: 'pas' }
        ], { classe: 'dansbloc' }) +
        (j.liste.length
          ? '<div class="list" style="margin-top:12px">' + j.liste.map((x) =>
              '<div class="rowitem"><span class="ic">' + Icon(x.type === 'muscu' ? 'dumbbell' : 'activity', 17) + '</span>' +
              '<span class="tx"><b>' + UI.esc(x.nom) + '</b><small>' + UI.fmt.dur(x.minutes) + '</small></span>' +
              '<span class="rt tabnum">' + UI.fmt.n(x.kcal) + ' kcal</span></div>').join('') + '</div>'
          : '') +
      '</div></div>';
  }

  function onboarding() {
    return '<div class="section">' +
      '<div class="panel" style="text-align:center;padding:26px 18px">' +
        '<div class="ei" style="width:56px;height:56px;margin:0 auto 14px;border-radius:18px;display:grid;place-items:center;background:var(--accent-soft);color:var(--accent)">' + Icon('heart', 28) + '</div>' +
        '<b style="font-size:18px;display:block;margin-bottom:8px">Tes données Apple Santé, ici</b>' +
        '<p class="muted" style="font-size:13.5px;line-height:1.55;max-width:380px;margin:0 auto 16px">' +
          'Le plus simple : connecter ton iPhone une fois, il envoie ses chiffres tout seul chaque jour. Sinon, un export complet.' +
        '</p>' +
        '<button class="btn primary block lg" style="margin-bottom:14px" data-act="connecter">' + Icon('heart', 18) + 'Connecter Apple Santé</button>' +
        '<div class="list" style="text-align:left;margin-bottom:16px">' +
          step(1, 'Ouvre l\'app Santé sur ton iPhone') +
          step(2, 'Touche ta photo de profil, en haut à droite') +
          step(3, 'Descends jusqu\'à « Exporter toutes les données »') +
          step(4, 'Enregistre le fichier, puis reviens ici') +
        '</div>' +
        '<button class="btn block lg" data-act="import">' + Icon('upload', 18) + 'Importer un export</button>' +
        '<button class="btn ghost block" style="margin-top:8px" data-act="manual">' + Icon('plus', 16) + 'Saisir une journée à la main</button>' +
        '<p class="muted" style="font-size:11.5px;margin-top:14px">Un export est lu sur l\'appareil, rien n\'est envoyé.</p>' +
      '</div></div>';
  }
  const step = (n, t) => '<div class="rowitem"><span class="ic">' + n + '</span><span class="tx"><b style="font-weight:600">' + UI.esc(t) + '</b></span></div>';

  function todayBlock(d) {
    const g = goals();
    /* La montre ne voit pas une seance de salle. On additionne donc
       ce qu'elle a mesure et ce qui a ete saisi a la main. */
    const enPlus = global.Sport ? Sport.duJour(d.day).kcal : 0;
    d = Object.assign({}, d, { active: (d.active || 0) + enPlus });
    return '<div class="section" style="padding-top:14px">' +
      /* Ne pas repeter « Aujourd'hui » a gauche et a droite : le
         libelle de droite ne sert que pour un jour plus ancien. */
      '<div class="sechead"><h2 style="font-size:17px">' + UI.esc(UI.day.label(d.day || UI.day.today())) + '</h2>' +
      (d.day === UI.day.today() ? '' : '<span>Dernier jour connu</span>') + '</div>' +
      '<div class="panel"><div class="rings">' +
        UI.ring(d.active || 0, g.active, UI.fmt.n(d.active || 0), 'kcal actives') +
        UI.ring(d.exercise || 0, g.exercise, UI.fmt.n(d.exercise || 0), 'min exercice') +
        UI.ring(d.steps || 0, g.steps, UI.fmt.n(d.steps || 0), 'pas') +
      '</div></div>' +
      '<div class="stats" style="margin-top:12px">' +
        stat('Sommeil', d.sleep != null ? UI.fmt.dur(d.sleep) : '–', 'moon') +
        stat('FC repos', d.hrRest != null ? Math.round(d.hrRest) + ' bpm' : '–', 'pulse') +
        stat('VFC', d.hrv != null ? Math.round(d.hrv) + ' ms' : '—', 'pulse') +
        stat('Distance', d.distance != null ? UI.fmt.km(d.distance) : '—', 'map') +
        stat('Étages', d.floors != null ? UI.fmt.n(d.floors) : '—', 'activity') +
        stat('Poids', d.weight != null ? d.weight.toFixed(1).replace('.', ',') + ' kg' : lastKnown('weight'), 'scale') +
      '</div></div>';
  }
  const stat = (k, v, ic) => '<div class="stat"><div class="k">' + Icon(ic, 13) + UI.esc(k) + '</div><div class="v" style="font-size:19px">' + (v === '–' ? TIRET : UI.esc(v)) + '</div></div>';
  function lastKnown(key) {
    const rows = daily().filter((d) => d[key] != null).sort((a, b) => a.day < b.day ? 1 : -1);
    if (!rows.length) return '–';
    const v = rows[0][key];
    return (typeof v === 'number' ? v.toFixed(1).replace('.', ',') : v) + (key === 'weight' ? ' kg' : '');
  }

  function rangeBar() {
    return '<div class="seg full" style="margin:6px 0 2px">' +
      [7, 30, 90, 365].map((n) => '<button data-range="' + n + '" class="' + (range === n ? 'on' : '') + '">' +
        (n === 365 ? '1 an' : n + ' j') + '</button>').join('') + '</div>';
  }

  /* ============================================================
     Les tendances

     Six panneaux empiles, chacun avec une ligne brisee dix fois
     plus large que haute : on ne comparait rien, on faisait
     defiler. Ce sont maintenant des tuiles, deux par ligne sur
     telephone, quatre sur grand ecran, avec la valeur du jour en
     gros et la courbe de la periode dessous.
     ============================================================ */
  function trendBlock(days) {
    /* On ne dessine que ce qui existe. Une mesure jamais saisie ne
       produit ni tuile vide, ni zero, ni « pas de donnees » : elle
       n'apparait pas du tout. Deux points sont le minimum pour
       qu'une tendance veuille dire quelque chose. */
    const tuiles = metriquesRenseignees(days).map((m) => {
      const vals = days.map((d) => d[m.cle]).filter((v) => v != null && v !== '');
      if (vals.length < 2) return '';
      const dernier = vals[vals.length - 1];
      const moitie = Math.floor(vals.length / 2);
      const a1 = vals.slice(0, moitie).reduce((a, b) => a + b, 0) / (moitie || 1);
      const a2 = vals.slice(moitie).reduce((a, b) => a + b, 0) / (vals.length - moitie || 1);
      const ecart = a1 ? ((a2 - a1) / a1) * 100 : 0;
      const sens = Math.abs(ecart) < 2 ? 'stable'
        : (ecart > 0 ? '+' : '') + ecart.toFixed(0) + ' %';

      /* Barres pour ce qui se compte par jour, courbe pour ce qui
         se suit dans le temps. Meme hauteur dans les deux cas. */
      const parJour = ['sleep', 'cafe', 'alcool', 'eau'].indexOf(m.cle) >= 0;
      const graph = parJour
        ? Graph.barres({ valeurs: vals.slice(-7), c2: m.teinte })
        : Graph.courbe({ valeurs: vals.slice(-14), c1: m.teinte });

      return Graph.tuile({
        nom: m.nom, art: m.art, teinte: m.teinte,
        valeur: m.fmt(dernier), unite: m.unite + (sens === 'stable' ? '' : ' · ' + sens),
        graph: graph, detail: m.cle
      });
    }).filter(Boolean);

    /* Une seule mesure suivie ne merite pas une grille de quatre
       colonnes a moitie vide : la grille s'adapte au nombre. */
    if (!tuiles.length) return '';
    const classe = tuiles.length === 1 ? 'gsolo' : (tuiles.length % 3 === 0 ? 'gtrois' : 'gquatre');
    return '<div class="section">' +
      '<div class="secbar"><h2>Tendances</h2>' +
      '<span class="muted" style="font-size:12px">' + tuiles.length +
      (tuiles.length > 1 ? ' mesures suivies' : ' mesure suivie') + '</span></div>' +
      '<div class="' + classe + '">' + tuiles.join('') + '</div>' +
      '<p class="aide">Seules les mesures que tu remplis apparaissent ici. ' +
      'Ajoute-en depuis « Saisir ce jour », elles s\'afficheront toutes seules.</p></div>';
  }


  function workoutsBlock() {
    const w = Store.all('workouts').sort((a, b) => b.start - a.start).slice(0, 12);
    if (!w.length) return '';
    return '<div class="section"><div class="sechead"><h2 style="font-size:16px">Entrainements</h2><span>' + Store.all('workouts').length + '</span></div>' +
      '<div class="list">' + w.map((x) =>
        '<div class="rowitem"><span class="ic">' + Icon('dumbbell', 17) + '</span>' +
        '<span class="tx"><b>' + UI.esc(x.nom) + '</b><small>' + UI.esc(UI.fmt.dateShort(x.start)) + ' · ' + UI.fmt.dur(x.minutes) +
        (x.km ? ' · ' + UI.fmt.km(x.km) : '') + '</small></span>' +
        '<span class="rt tabnum">' + (x.kcal ? UI.fmt.n(x.kcal) + ' kcal' : '') + '</span></div>').join('') + '</div></div>';
  }

  /* ============================================================
     Le bilan de forme

     Il etait construit differemment de celui de l'alimentation :
     un paragraphe, trois puces, et rien d'actionnable. Il suit
     desormais exactement la meme structure, parce que c'est celle
     qui marche : une note, un verdict, ce qui va, ce qui ne va
     pas, quoi faire, quoi manger.
     ============================================================ */
  /* ============================================================
     Le bilan chiffré

     Avant l'IA, des calculs simples et vérifiables. Chaque ligne
     répond à trois questions, dans des mots de tous les jours :
       ça va ou pas ?   parce que (le chiffre) ?   je fais quoi ?

     Les repères utilisés :
       - sommeil : 7 à 9 h par nuit chez l'adulte. La « dette » est
         la somme de ce qui manque sur 7 nuits par rapport à ton
         objectif ;
       - cœur au repos : on compare ta moyenne des 7 derniers jours
         à ta propre référence des 4 semaines. +3 battements ou plus
         signale souvent fatigue, stress, alcool ou début de rhume ;
       - récupération (variabilité cardiaque) : même principe, une
         baisse de 10 % ou plus sous ta référence = corps pas remis ;
       - activité : 150 minutes d'effort par semaine (repère OMS) et
         tes pas par rapport à ton objectif ;
       - charge d'entraînement : semaine en cours rapportée à la
         moyenne des 4 dernières (ratio aigu sur chronique). Au-delà
         de 1,5, le risque de blessure grimpe ; sous 0,8, on perd ;
       - poids : pente d'une droite de régression sur 4 semaines,
         en kilos par semaine ;
       - protéines : grammes par kilo de poids (1,6 g/kg pour
         entretenir le muscle quand on s'entraîne) ;
       - oxygène du sang : sous 95 % en moyenne, à surveiller ;
       - le lien : plusieurs jours sans voir personne pèse autant
         qu'une mauvaise nuit.
     ============================================================ */
  const moy = (l) => l.length ? l.reduce((a, b) => a + b, 0) / l.length : null;
  const vals = (jours, k) => jours.map((d) => d[k]).filter((v) => v != null && v !== '' && !isNaN(v)).map(Number);
  function pente(points) {
    const n = points.length;
    if (n < 4) return null;
    const mx = moy(points.map((p) => p[0])), my = moy(points.map((p) => p[1]));
    let num = 0, den = 0;
    points.forEach(([x, y]) => { num += (x - mx) * (y - my); den += (x - mx) * (x - mx); });
    return den ? num / den : null;
  }

  function bilanChiffre() {
    const j28 = lastDays(28), j7 = j28.slice(-7), avant = j28.slice(0, 21);
    const g = goals();
    const L = [];
    const ajoute = (id, titre, etat, constat, cause, solution) => L.push({ id, titre, etat, constat, cause, solution });

    /* Sommeil */
    const sl = vals(j7, 'sleep');
    if (sl.length >= 3) {
      const m = moy(sl), dette = sl.reduce((a, v) => a + Math.max(0, g.sleep - v), 0);
      const ecart = Math.sqrt(moy(sl.map((v) => (v - m) * (v - m))));
      const etat = m >= g.sleep - 20 && ecart < 75 ? 'ok' : m >= 360 ? 'moyen' : 'mauvais';
      ajoute('sommeil', 'Sommeil', etat,
        'Tu dors ' + UI.fmt.dur(m) + ' en moyenne par nuit.',
        etat === 'ok' ? 'C\'est ce qu\'il faut, et tes nuits sont régulières.'
          : 'Il te manque ' + UI.fmt.dur(dette) + ' de sommeil sur la semaine' + (ecart >= 75 ? ', et tes heures changent beaucoup d\'une nuit à l\'autre' : '') + '.',
        etat === 'ok' ? 'Garde les mêmes horaires, même le week-end.'
          : 'Couche-toi 30 minutes plus tôt ce soir, téléphone hors de la chambre.');
    }

    /* Cœur au repos */
    const hr7 = vals(j7, 'hrRest'), hrRef = vals(avant, 'hrRest');
    if (hr7.length >= 3 && hrRef.length >= 5) {
      const d = moy(hr7) - moy(hrRef);
      const etat = d <= 2 ? 'ok' : d <= 5 ? 'moyen' : 'mauvais';
      ajoute('coeur', 'Cœur au repos', etat,
        'Ton cœur bat ' + Math.round(moy(hr7)) + ' fois par minute au repos (ta normale : ' + Math.round(moy(hrRef)) + ').',
        etat === 'ok' ? 'Il est calme : ton corps récupère bien.'
          : 'Il bat ' + Math.round(d) + ' fois de plus que d\'habitude. Souvent : fatigue, stress, alcool ou un rhume qui arrive.',
        etat === 'ok' ? 'Rien à changer.' : 'Journée légère aujourd\'hui : pas d\'alcool, de l\'eau, et une vraie nuit.');
    }

    /* Récupération (variabilité) */
    const v7 = vals(j7, 'hrv'), vRef = vals(avant, 'hrv');
    if (v7.length >= 3 && vRef.length >= 5) {
      const pct = (moy(v7) - moy(vRef)) / moy(vRef) * 100;
      const etat = pct >= -5 ? 'ok' : pct >= -12 ? 'moyen' : 'mauvais';
      ajoute('recup', 'Récupération', etat,
        'Ta récupération est à ' + Math.round(moy(v7)) + ' ms (ta normale : ' + Math.round(moy(vRef)) + ').',
        etat === 'ok' ? 'Ton corps est bien reposé.' : 'Elle a baissé de ' + Math.abs(Math.round(pct)) + ' % : ton corps est encore fatigué.',
        etat === 'ok' ? 'Tu peux faire une grosse séance.' : 'Remplace la séance dure par de la marche ou des étirements.');
    }

    /* Activité */
    const st = vals(j7, 'steps');
    const ex = vals(j7, 'exercise').reduce((a, b) => a + b, 0) + (global.Sport ? Sport.semaine(7).minutes || 0 : 0);
    if (st.length >= 3) {
      const m = moy(st);
      const etat = m >= g.steps * 0.9 ? 'ok' : m >= g.steps * 0.6 ? 'moyen' : 'mauvais';
      ajoute('pas', 'Pas', etat,
        'Tu fais ' + UI.fmt.n(Math.round(m)) + ' pas par jour (objectif : ' + UI.fmt.n(g.steps) + ').',
        etat === 'ok' ? 'Tu bouges assez au quotidien.' : 'Il t\'en manque environ ' + UI.fmt.n(Math.round(g.steps - m)) + ' par jour.',
        etat === 'ok' ? 'Continue comme ça.' : 'Une marche de ' + Math.max(10, Math.round((g.steps - m) / 100)) + ' minutes après le repas suffit.');
    }
    if (ex > 0 || st.length >= 3) {
      const etat = ex >= 150 ? 'ok' : ex >= 75 ? 'moyen' : 'mauvais';
      ajoute('effort', 'Effort de la semaine', etat,
        Math.round(ex) + ' minutes d\'effort sur 7 jours.',
        etat === 'ok' ? 'Tu dépasses les 150 minutes conseillées.' : 'Le repère santé, c\'est 150 minutes par semaine : il en manque ' + Math.max(0, Math.round(150 - ex)) + '.',
        etat === 'ok' ? 'Garde ce rythme.' : 'Ajoute ' + Math.max(1, Math.ceil((150 - ex) / 30)) + ' séance(s) de 30 minutes cette semaine.');
    }

    /* Charge d'entraînement : aigu (7 j) sur chronique (28 j) */
    const charge = (jours) => jours.reduce((a, d) => a + (Number(d.active) || 0), 0);
    const a7 = charge(j7), c28 = charge(j28) / 4;
    if (c28 > 300 && vals(j28, 'active').length >= 14) {
      const r = a7 / c28;
      const etat = r <= 1.3 && r >= 0.8 ? 'ok' : r <= 1.5 && r >= 0.6 ? 'moyen' : 'mauvais';
      ajoute('charge', 'Charge d\'entraînement', etat,
        'Cette semaine : ' + Math.round(r * 100) + ' % de ta semaine habituelle.',
        r > 1.3 ? 'Tu en fais beaucoup plus que d\'habitude d\'un coup : c\'est là qu\'on se blesse.'
          : r < 0.8 ? 'Tu en fais nettement moins que d\'habitude : la forme redescend vite.' : 'Tu progresses sans à-coup.',
        r > 1.3 ? 'Lève le pied deux jours.' : r < 0.8 ? 'Remets une séance, même courte.' : 'Rien à changer.');
    }

    /* Poids */
    const pw = j28.map((d, i) => [i, d.weight]).filter((p) => p[1] != null).map((p) => [p[0], Number(p[1])]);
    const pt = pente(pw);
    if (pt != null) {
      const semaine = pt * 7;
      const etat = Math.abs(semaine) <= 0.5 ? 'ok' : Math.abs(semaine) <= 1 ? 'moyen' : 'mauvais';
      ajoute('poids', 'Poids', etat,
        'Ton poids ' + (Math.abs(semaine) < 0.1 ? 'est stable' : (semaine > 0 ? 'monte' : 'baisse') + ' de ' + Math.abs(semaine).toFixed(1).replace('.', ',') + ' kg par semaine') + '.',
        etat === 'ok' ? 'Un rythme sain.' : 'C\'est rapide : au-delà d\'un demi-kilo par semaine, on perd souvent du muscle ou on en reprend vite.',
        etat === 'ok' ? 'Rien à changer.' : (semaine > 0 ? 'Enlève un en-cas sucré par jour.' : 'Mange un peu plus, surtout des protéines.'));
    }

    /* Protéines */
    const food = global.Food ? Food.summary(7).filter((f) => f.kcal) : [];
    const poids = pw.length ? pw[pw.length - 1][1] : null;
    if (food.length >= 3 && poids) {
      const gk = moy(food.map((f) => f.prot)) / poids;
      const etat = gk >= 1.5 ? 'ok' : gk >= 1.1 ? 'moyen' : 'mauvais';
      ajoute('prot', 'Protéines', etat,
        'Tu manges ' + gk.toFixed(1).replace('.', ',') + ' g de protéines par kilo.',
        etat === 'ok' ? 'Assez pour garder et construire du muscle.' : 'Il en faut environ 1,6 g par kilo quand on fait du sport.',
        etat === 'ok' ? 'Continue.' : 'Ajoute ' + Math.round((1.6 - gk) * poids) + ' g par jour : deux œufs et un yaourt grec, par exemple.');
    }

    /* Oxygène */
    const o2 = vals(j7, 'spo2');
    if (o2.length >= 3) {
      const m = moy(o2);
      ajoute('o2', 'Oxygène du sang', m >= 95 ? 'ok' : m >= 93 ? 'moyen' : 'mauvais',
        'Oxygène moyen : ' + Math.round(m) + ' %.',
        m >= 95 ? 'Normal.' : 'Un peu bas. Ça peut venir de la montre mal serrée, ou de la respiration la nuit.',
        m >= 95 ? 'Rien à faire.' : 'Serre la montre la nuit ; si ça reste bas, parles-en à un médecin.');
    }

    /* Le lien */
    const seul = global.Mood ? Mood.joursSansLien() : null;
    if (seul != null) {
      const etat = seul <= 2 ? 'ok' : seul <= 4 ? 'moyen' : 'mauvais';
      ajoute('lien', 'Voir du monde', etat,
        seul === 0 ? 'Tu as vu quelqu\'un aujourd\'hui.' : seul + ' jour' + (seul > 1 ? 's' : '') + ' sans rien faire avec quelqu\'un.',
        etat === 'ok' ? 'Le lien est entretenu.' : 'Le moral et le sommeil en dépendent autant que du sport.',
        etat === 'ok' ? 'Continue.' : 'Propose un café ou un repas à quelqu\'un aujourd\'hui.');
    }
    return L;
  }

  function bilanHtml(L) {
    if (!L.length) return '';
    const ordre = { mauvais: 0, moyen: 1, ok: 2 };
    const tri = L.slice().sort((a, b) => ordre[a.etat] - ordre[b.etat]);
    const mauvais = L.filter((x) => x.etat === 'mauvais').length, moyens = L.filter((x) => x.etat === 'moyen').length;
    const phrase = !mauvais && !moyens ? 'Tout va bien. Tu peux continuer exactement comme ça.'
      : mauvais ? mauvais + ' point' + (mauvais > 1 ? 's' : '') + ' à corriger en priorité, ' + (L.length - mauvais - moyens) + ' qui vont bien.'
      : moyens + ' point' + (moyens > 1 ? 's' : '') + ' à surveiller, le reste va bien.';
    const IC = { ok: 'check', moyen: 'alert', mauvais: 'alert' };
    return '<div class="bilan">' +
      '<p class="bilanphrase">' + UI.esc(phrase) + '</p>' +
      tri.map((x) =>
        '<div class="bligne ' + x.etat + '">' +
          '<span class="bpt">' + Icon(IC[x.etat], 15) + '</span>' +
          '<div class="btx"><b>' + UI.esc(x.titre) + '</b>' +
            '<p>' + UI.esc(x.constat) + ' ' + UI.esc(x.cause) + '</p>' +
            (x.etat !== 'ok' ? '<p class="bfaire">' + Icon('next', 13) + UI.esc(x.solution) + '</p>' : '') +
          '</div>' +
        '</div>').join('') +
      '<p class="muted" style="font-size:11px;margin-top:10px">Calculé sur tes données des 28 derniers jours. Une lecture de tendance, pas un avis médical.</p>' +
    '</div>';
  }

  const TIER = (n) => n >= 8 ? 'or' : n >= 6 ? 'argent' : n >= 4 ? 'bronze' : 'lead';

  function insightBlock(days) {
    const cached = Store.get('healthInsight', null);
    const fresh = cached && Date.now() - cached.at < 20 * 3600e3 && !cached.ferme;
    const L = bilanChiffre();
    return '<div class="section"><div class="sechead"><h2 style="font-size:16px">Mon bilan</h2>' +
      (fresh ? '<div class="row" style="gap:6px"><button data-act="insight">Refaire</button>' +
        '<button class="fermebloc" data-act="fermerBilan" aria-label="Fermer">' + Icon('close', 15) + '</button></div>' : '') + '</div>' +
      (L.length ? '<div class="panel">' + bilanHtml(L) + '</div>' : '') +
      (fresh
        ? '<div style="margin-top:10px">' + insightHtml(cached.data) + '</div>'
        : '<div class="panel" style="text-align:center;margin-top:10px">' +
            '<p class="muted" style="font-size:13px;margin-bottom:12px">' +
              (L.length ? 'Tu veux l\'explication complète, et un plan pour la semaine ?' : 'Une note sur 10, ce qui va, ce qui ne va pas, et quoi faire dès aujourd\'hui.') + '</p>' +
            '<button class="btn primary" data-act="insight">' + Icon('sparkle', 17) + 'Analyser avec l\'IA</button></div>') +
      '</div>';
  }

  function insightHtml(a) {
    const bloc = (titre, items, cls, ic) => (items && items.length)
      ? '<div class="panel" style="margin-top:10px"><h4 style="display:flex;align-items:center;gap:7px;margin-bottom:8px;color:var(--' + cls + ')">' + Icon(ic, 16) + UI.esc(titre) + '</h4>' +
        '<ul style="padding-left:18px">' + items.map((x) => '<li style="margin-bottom:6px;font-size:13.5px">' + UI.esc(x) + '</li>').join('') + '</ul></div>'
      : '';

    const lignes = (titre, items, ic, a1, a2) => (items && items.length)
      ? '<div class="panel" style="margin-top:10px"><h4 style="margin-bottom:8px">' + UI.esc(titre) + '</h4>' +
        '<div class="list" style="box-shadow:none">' + items.map((x) =>
          '<div class="rowitem" style="border-bottom:1px solid var(--hairline)">' +
            '<span class="ic">' + Icon(ic, 16) + '</span>' +
            '<span class="tx"><b>' + UI.esc(x[a1] || '') + '</b><small>' + UI.esc(x[a2] || '') + '</small></span>' +
          '</div>').join('') + '</div></div>'
      : '';

    const note = a.note != null ? Math.max(0, Math.min(10, Number(a.note))) : null;

    return '<div class="panel" style="background:var(--accent-soft)">' +
        '<div class="rings" style="gap:14px">' +
          (note != null ? UI.ring(note, 10, note + '/10', 'ma forme') : '') +
          '<div style="flex:1;min-width:150px">' +
            '<b style="display:block;margin-bottom:4px">Verdict</b>' +
            '<p style="font-size:14px;line-height:1.5">' + UI.esc(a.verdict || '') + '</p>' +
            (note != null ? '<div class="tier" data-t="' + TIER(note) + '" style="margin-top:10px">' + Icon('trophy', 14) + niveau(note) + '</div>' : '') +
          '</div>' +
        '</div></div>' +
      bloc('Ce qui va', a.bien, 'ok', 'check') +
      bloc('Ce qui ne va pas', a.moins_bien, 'warn', 'alert') +
      lignes('Ce que je fais dès aujourd\'hui', a.actions, 'check', 'quoi', 'pourquoi') +
      lignes('Ce que je mets dans l\'assiette', a.manger, 'apple', 'aliment', 'pourquoi') +
      (a.objectif_semaine ? '<div class="panel" style="margin-top:10px"><h4 style="margin-bottom:6px">Mon objectif de la semaine</h4>' +
        '<p style="font-size:14px;line-height:1.5">' + UI.esc(a.objectif_semaine) + '</p></div>' : '') +
      '<p class="muted" style="font-size:11px;margin-top:10px;text-align:center">Estimation par IA' +
        UI.hint("Ces chiffres viennent de ton téléphone et l'analyse est faite par une IA. C'est une lecture de tendance, pas un avis médical.", 'Estimation') +
      '</p>';
  }

  const niveau = (n) => n >= 8 ? 'Très bonne forme' : n >= 6 ? 'Bonne forme' : n >= 4 ? 'Forme moyenne' : 'Forme basse';

  /* Les quatre entrees de gestion, en tuiles photo. Avant, quatre
     lignes grises identiques avec une petite icone de la meme
     couleur que son fond : rien n'attirait l'oeil, rien ne se
     distinguait. */
  function sourcesBlock() {
    const meta = Store.get('healthImport', null);
    return '<div class="section"><div class="secbar"><h2>Mes données</h2></div>' +
      '<div class="list">' +
        '<button class="rowitem" data-act="import">' + Vis.html('apple-sante', { classe: 'lic' }) +
          '<span class="tx"><b>Apple Santé</b><small>' + (meta ? UI.fmt.n(meta.records) + ' mesures importées' : 'Importer l\'export complet') + '</small></span>' +
          '<span class="rt">' + Icon('next', 15) + '</span></button>' +
      '</div>' +
      (daily().length ? '<div class="row" style="justify-content:flex-end;margin-top:10px">' +
        '<button class="btn sm ghost danger-txt" data-act="clear">' + Icon('trash', 14) + 'Tout effacer (' + daily().length + ' j)</button></div>' : '') +
      '<p class="muted" style="font-size:11.5px;line-height:1.5;margin-top:10px">' +
      'La connexion automatique envoie les chiffres de chaque jour. L\'export complet, lui, rattrape tout l\'historique d\'un coup.</p></div>';
  }

  function bind() {
    root.querySelectorAll('[data-kart]').forEach((b) => b.onclick = () => acts[b.dataset.kart] && acts[b.dataset.kart]());
    if (global.Stock) Stock.peupler(root);
    root.querySelectorAll('[data-range]').forEach((b) => b.onclick = () => { range = +b.dataset.range; render(); });
    root.querySelectorAll('[data-jour]').forEach((b) => b.onclick = () => {
      const suivant = UI.day.add(jour, +b.dataset.jour);
      if (suivant > UI.day.today()) return;
      jour = suivant; UI.haptic('tap'); render();
    });
    root.querySelectorAll('[data-act]').forEach((b) => b.onclick = () => acts[b.dataset.act] && acts[b.dataset.act]());
    root.querySelectorAll('[data-detail]').forEach((b) => {
      b.onclick = () => detailMetrique(b.dataset.detail);
      b.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); detailMetrique(b.dataset.detail); } };
    });
  }

  /* ============================================================
     Le detail d'une mesure

     La tuile donne la derniere valeur et une silhouette. Quand on
     la touche, on veut le reste : la courbe en grand, les reperes
     qui permettent de la lire (moyenne, mini, maxi, objectif) et
     les journees une par une. Meme grammaire visuelle que la
     tuile, juste la place en plus.

     Regle importante : une journee sans mesure n'est pas un zero.
     On ne garde que les jours renseignes, sinon la moyenne ment et
     la courbe plonge chaque fois qu'on oublie de saisir.
     ============================================================ */
  function detailMetrique(cle) {
    const m = metrique(cle);
    if (!m) return;
    const serie = lastDays(range)
      .map((d) => ({ jour: d.day, v: d[cle] }))
      .filter((x) => x.v != null && x.v !== '' && isFinite(Number(x.v)))
      .map((x) => ({ jour: x.jour, v: Number(x.v) }));
    if (!serie.length) return;

    const vals = serie.map((x) => x.v);
    const dernier = vals[vals.length - 1];
    const moy = vals.reduce((a, b) => a + b, 0) / vals.length;
    const mini = Math.min.apply(null, vals);
    const maxi = Math.max.apply(null, vals);
    const moitie = Math.floor(vals.length / 2);
    const a1 = vals.slice(0, moitie).reduce((a, b) => a + b, 0) / (moitie || 1);
    const a2 = vals.slice(moitie).reduce((a, b) => a + b, 0) / (vals.length - moitie || 1);
    const ecart = (vals.length > 1 && a1) ? ((a2 - a1) / a1) * 100 : 0;
    const sens = vals.length < 2 ? 'trop tôt pour dire'
      : (Math.abs(ecart) < 2 ? 'stable'
        : (ecart > 0 ? 'en hausse de ' : 'en baisse de ') + Math.abs(ecart).toFixed(0) + ' %');
    const mieux = Math.abs(ecart) < 2 ? null : ((ecart > 0) !== !!m.bas);

    const parJour = ['sleep', 'cafe', 'alcool', 'eau'].indexOf(cle) >= 0;
    const grand = parJour
      ? Graph.barres({ valeurs: vals.slice(-14), c2: m.teinte, classe: 'haute', L: 660, H: 260 })
      : Graph.courbe({ valeurs: vals.slice(-30), c1: m.teinte, classe: 'haute', L: 660, H: 260 });

    const obj = goals()[cle];
    const u = m.unite ? ' ' + m.unite : '';
    const chiffre = (nom, v) => '<div class="gstat"><small>' + nom + '</small><b>' + UI.esc(m.fmt(v)) + u + '</b></div>';

    const lignes = serie.slice().reverse().slice(0, 30).map((x) =>
      '<div class="rowitem"><span class="tx"><b>' + UI.esc(UI.day.label(x.jour)) + '</b></span>' +
      '<span class="rt tabnum">' + UI.esc(m.fmt(x.v)) + u + '</span></div>').join('');

    UI.openSheet(
      '<div class="mbody" style="padding-top:6px">' +
        '<h2 style="font-size:22px">' + UI.esc(m.nom) + '</h2>' +
        '<p class="mdesc">' + serie.length + (serie.length > 1 ? ' journées renseignées' : ' journée renseignée') +
          ' sur les ' + range + ' derniers jours · ' + sens +
          (mieux === null ? '' : (mieux ? ' (dans le bon sens)' : ' (dans le mauvais sens)')) + '</p>' +
        '<div class="gtuile pleine" style="--t:' + UI.attr(m.teinte) + ';margin-top:14px">' +
          '<div class="bas">' + grand + '</div>' +
        '</div>' +
        '<div class="gstats">' +
          chiffre('Dernier', dernier) + chiffre('Moyenne', moy) +
          chiffre('Mini', mini) + chiffre('Maxi', maxi) +
        '</div>' +
        (obj != null ? '<p class="aide">Objectif : ' + UI.esc(m.fmt(obj)) + u +
          ' · ' + (((dernier >= obj) !== !!m.bas) ? 'atteint sur la dernière journée' : 'pas encore atteint') + '</p>' : '') +
        '<div class="sechead" style="margin-top:18px"><h2 style="font-size:16px">Jour par jour</h2><span>' + serie.length + '</span></div>' +
        '<div class="list">' + lignes + '</div>' +
        '<p class="aide">Les journées sans saisie sont ignorées : elles ne comptent pas comme un zéro.</p>' +
      '</div>');
  }

  const acts = {
    muscu: () => { if (global.Sport) Sport.nouvelleSeance(); },
    sportauto: () => { if (global.Sport) Sport.choisirSport(); },
    import: () => importFlow(),
    connecter: () => connecter(),
    tirer: () => tirer(false),
    manual: () => manualDay(),
    goals: () => editGoals(),
    insight: () => insight(),
    fermerBilan: () => { const c = Store.get('healthInsight', null); if (c) Store.set('healthInsight', Object.assign(c, { ferme: true })); UI.haptic('light'); render(); },
    clear: async () => {
      if (!await UI.confirmSheet('Effacer les données santé', 'Les journées importées et les entrainements seront supprimes de cet appareil.', true)) return;
      Store.all('healthDays').forEach((d) => Store.del('healthDays', d.id));
      Store.all('workouts').forEach((d) => Store.del('workouts', d.id));
      Store.set('healthImport', null);
      render(); UI.toast('Effacé');
    }
  };

  /* ============================================================
     Import
     ============================================================ */
  function importFlow() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.zip,.xml,application/zip,text/xml';
    input.onchange = async () => {
      const f = input.files && input.files[0];
      if (!f) return;
      const box = UI.openSheet('<div class="mbody"><h2 style="font-size:20px;margin-bottom:14px">Import en cours</h2>' +
        '<div class="bar-track"><div class="bar-fill" data-prog style="width:2%"></div></div>' +
        '<p class="muted" style="font-size:13px;margin-top:10px" data-msg>Lecture du fichier…</p></div>');
      const msg = (t) => { const e = box.querySelector('[data-msg]'); if (e) e.textContent = t; };
      const prog = (p) => { const e = box.querySelector('[data-prog]'); if (e) e.style.width = Math.max(2, Math.min(100, p * 100)).toFixed(0) + '%'; };

      try {
        let stats;
        if (/\.zip$/i.test(f.name) || f.type === 'application/zip') {
          msg('Décompression…');
          const xml = await unzipExport(f);
          msg('Analyse des mesures…');
          stats = await parseXmlText(xml, prog, msg);
        } else {
          stats = await parseXmlFile(f, prog, msg);
        }
        commit(stats);
        UI.closeSheet();
        UI.toast(UI.fmt.n(stats.records) + ' mesures importées');
        if (global.Game) Game.award('import-sante', 40);
        render();
      } catch (e) {
        UI.closeSheet();
        console.error(e);
        UI.openSheet('<div class="mbody"><h2 style="font-size:20px">Import impossible</h2>' +
          '<p class="mdesc">' + UI.esc(String(e.message || e)) + '</p>' +
          '<div class="banner warn" style="margin-top:14px">' + Icon('info', 18) +
          '<span>Si le fichier dépassé quelques centaines de mega-octets, dezippe-le sur ton téléphone et choisis directement <b>export.xml</b> : la lecture se fait alors par morceaux et ne sature plus la memoire.</span></div></div>');
      }
    };
    input.click();
  }

  function loadFflate() {
    if (global.fflate) return Promise.resolve(global.fflate);
    return new Promise((res, rej) => {
      const s = document.createElement('script');
      s.src = FFLATE; s.onload = () => res(global.fflate); s.onerror = () => rej(new Error('Décompression indisponible hors ligne'));
      document.head.appendChild(s);
    });
  }

  async function unzipExport(file) {
    const fflate = await loadFflate();
    const buf = new Uint8Array(await file.arrayBuffer());
    const files = fflate.unzipSync(buf, {
      filter: (f) => /export\.xml$/i.test(f.name) || /экспорт|Exportar|Ausfuhr/i.test(f.name)
    });
    const name = Object.keys(files).find((n) => /export\.xml$/i.test(n)) || Object.keys(files)[0];
    if (!name) throw new Error("export.xml introuvable dans l'archive");
    return new TextDecoder('utf-8').decode(files[name]);
  }

  /* Lecture par tranches : on ne charge jamais tout le XML d'un
     coup, et on garde la fin de chaque tranche pour ne pas couper
     un enregistrement en deux. */
  function parseXmlFile(file, prog, msg) {
    return new Promise((resolve, reject) => {
      const CHUNK = 4 * 1024 * 1024;
      const acc = newAcc();
      let offset = 0, tail = '';
      const dec = new TextDecoder('utf-8');
      const reader = new FileReader();

      reader.onerror = () => reject(new Error('Lecture du fichier interrompue'));
      reader.onload = () => {
        const text = tail + dec.decode(new Uint8Array(reader.result), { stream: true });
        const cut = text.lastIndexOf('<');
        const usable = cut > 0 ? text.slice(0, cut) : text;
        tail = cut > 0 ? text.slice(cut) : '';
        scan(usable, acc);
        offset += CHUNK;
        prog(Math.min(0.98, offset / file.size));
        if (offset < file.size) next();
        else { scan(tail, acc); msg('Consolidation…'); resolve(finish(acc)); }
      };
      const next = () => reader.readAsArrayBuffer(file.slice(offset, offset + CHUNK));
      next();
    });
  }

  async function parseXmlText(text, prog, msg) {
    const acc = newAcc();
    const CH = 4 * 1024 * 1024;
    for (let i = 0; i < text.length; i += CH) {
      scan(text.slice(i, i + CH + 4096), acc);
      prog(i / text.length);
      await UI.sleep(0);
    }
    msg('Consolidation…');
    return finish(acc);
  }

  function newAcc() { return { days: {}, workouts: [], records: 0, seen: new Set() }; }

  const RE_RECORD = /<Record\s+type="([^"]+)"[^>]*?(?:unit="([^"]*)"\s*)?startDate="([^"]+)"[^>]*?endDate="([^"]+)"[^>]*?value="([^"]*)"/g;
  const RE_WORKOUT = /<Workout\s+workoutActivityType="([^"]+)"[^>]*?duration="([^"]*)"[^>]*?(?:duration[Uu]nit="([^"]*)")?[^>]*?startDate="([^"]+)"/g;
  const RE_WO_DIST = /totalDistance="([\d.]+)"/;
  const RE_WO_KCAL = /totalEnergyBurned="([\d.]+)"/;

  function scan(text, acc) {
    let m;
    RE_RECORD.lastIndex = 0;
    while ((m = RE_RECORD.exec(text))) {
      const type = m[1], unit = m[2] || '', start = m[3], end = m[4], value = m[5];
      const def = TYPES[type];
      if (!def) continue;
      const dayKey = start.slice(0, 10);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dayKey)) continue;

      /* Anti-doublon : un export contient les mêmes mesures venues
         du telephone et de la montre. */
      const sig = type + '|' + start + '|' + value;
      if (acc.seen.has(sig)) continue;
      acc.seen.add(sig);
      if (acc.seen.size > 900000) acc.seen.clear();

      const d = acc.days[dayKey] || (acc.days[dayKey] = {});
      const slot = d[def.k] || (d[def.k] = { sum: 0, n: 0, last: null, dur: 0 });
      acc.records++;

      if (def.agg === 'dur') {
        if (type === 'HKCategoryTypeIdentifierSleepAnalysis' && /Awake/i.test(value)) continue;
        slot.dur += minutesBetween(start, end);
      } else {
        let v = parseFloat(value);
        if (isNaN(v)) continue;
        if (def.unit === 'km' && /^mi$/i.test(unit)) v *= 1.60934;
        if (def.k === 'spo2' && v <= 1) v *= 100;
        slot.sum += v; slot.n++; slot.last = v;
      }
    }

    RE_WORKOUT.lastIndex = 0;
    while ((m = RE_WORKOUT.exec(text))) {
      const tag = text.slice(m.index, m.index + 700);
      const dist = RE_WO_DIST.exec(tag), kcal = RE_WO_KCAL.exec(tag);
      acc.workouts.push({
        nom: WORKOUTS[m[1]] || m[1].replace('HKWorkoutActivityType', ''),
        minutes: Math.round(parseFloat(m[2]) || 0),
        start: new Date(m[4]).getTime(),
        km: dist ? parseFloat(dist[1]) : null,
        kcal: kcal ? Math.round(parseFloat(kcal[1])) : null
      });
    }
  }

  function minutesBetween(a, b) {
    const t1 = new Date(a.replace(' ', 'T')).getTime(), t2 = new Date(b.replace(' ', 'T')).getTime();
    if (isNaN(t1) || isNaN(t2)) return 0;
    return Math.max(0, (t2 - t1) / 60000);
  }

  function finish(acc) {
    const out = { days: [], workouts: acc.workouts, records: acc.records };
    Object.keys(acc.days).forEach((k) => {
      const src = acc.days[k], row = { day: k };
      Object.keys(TYPES).forEach((t) => {
        const def = TYPES[t], s = src[def.k];
        if (!s) return;
        if (def.agg === 'sum') row[def.k] = round2(s.sum);
        else if (def.agg === 'avg') row[def.k] = s.n ? round2(s.sum / s.n) : null;
        else if (def.agg === 'last') row[def.k] = s.last;
        else if (def.agg === 'dur') row[def.k] = Math.round(s.dur);
      });
      out.days.push(row);
    });
    out.days.sort((a, b) => a.day < b.day ? -1 : 1);
    return out;
  }
  const round2 = (v) => Math.round(v * 100) / 100;

  function commit(stats) {
    const existing = {};
    Store.all('healthDays').forEach((d) => existing[d.day] = d);
    stats.days.forEach((row) => {
      if (existing[row.day]) Store.put('healthDays', existing[row.day].id, row);
      else Store.add('healthDays', row);
    });
    const known = new Set(Store.all('workouts').map((w) => w.start + '|' + w.nom));
    stats.workouts.forEach((w) => { if (!known.has(w.start + '|' + w.nom)) Store.add('workouts', w); });
    Store.set('healthImport', { at: Date.now(), records: stats.records, days: stats.days.length });
    Store.set('healthInsight', null);
  }

  /* ============================================================
     Saisie manuelle et objectifs
     ============================================================ */
  /* ============================================================
     Saisir une journee

     Vingt-deux mesures proposees, zero obligatoire. On laisse vide
     ce qu'on ne mesure pas, et rien de vide ne sera jamais affiche
     ailleurs. Les champs sont ranges par groupe pour qu'on trouve
     le sien sans lire les vingt autres.
     ============================================================ */
  async function manualDay() {
    const k = jour;
    const cur = dayOf(k) || {};
    const champs = [];
    GROUPES.forEach((g) => {
      const dedans = METRIQUES.filter((m) => m.groupe === g);
      if (!dedans.length) return;
      champs.push({ type: 'titre', label: g });
      dedans.forEach((m) => {
        /* Le sommeil est stocke en minutes, comme Apple Sante le
           fournit, mais personne ne pense « 465 minutes ». On
           saisit 7,75 et la conversion se fait au moment
           d'enregistrer. */
        let val = cur[m.cle];
        if (m.stockeEnMinutes && val != null) val = Math.round(val / 6) / 10;
        champs.push({
          name: m.cle,
          label: m.nom + (m.unite ? ' (' + m.unite + ')' : ''),
          type: 'number',
          step: m.stockeEnMinutes ? '0.25' : (m.pas || '1'),
          max: m.max,
          inputmode: (m.pas || m.stockeEnMinutes) ? 'decimal' : 'numeric',
          value: val != null ? val : ''
        });
      });
    });

    const res = await UI.promptSheet('Journée du ' + UI.day.label(k), champs, 'Enregistrer');
    if (!res) return;
    /* On repart de la journee existante : modifier le poids ne doit
       pas effacer les pas notes hier soir. Un champ vide efface
       explicitement la mesure, c'est le seul moyen de se corriger. */
    const row = { day: k };
    METRIQUES.forEach((m) => {
      const v = res[m.cle];
      if (v === undefined || v === '' || !isFinite(Number(v))) return;
      row[m.cle] = m.stockeEnMinutes ? Math.round(Number(v) * 60) : Number(v);
    });
    if (cur.id) Store.put('healthDays', cur.id, row); else Store.add('healthDays', row);
    Store.set('healthInsight', null);
    const n = Object.keys(row).length - 1;
    render();
    UI.toast(n ? n + (n > 1 ? ' mesures enregistrées' : ' mesure enregistrée') : 'Journée vidée');
    if (n && global.Anim) Anim.confettis(24);
  }

  async function editGoals() {
    const g = goals();
    const res = await UI.promptSheet('Mes objectifs', [
      { name: 'steps', label: 'Pas par jour', type: 'number', inputmode: 'numeric', value: g.steps },
      { name: 'exercise', label: 'Minutes d\'exercice', type: 'number', inputmode: 'numeric', value: g.exercise },
      { name: 'active', label: 'Calories actives', type: 'number', inputmode: 'numeric', value: g.active },
      { name: 'sleep', label: 'Sommeil (heures)', type: 'number', step: '0.25', inputmode: 'decimal', value: Math.round(g.sleep / 6) / 10 }
    ], 'Enregistrer');
    if (!res) return;
    Store.set('healthGoals', { steps: +res.steps || 10000, exercise: +res.exercise || 30, active: +res.active || 500, sleep: Math.round((+res.sleep || 7.5) * 60) });
    render();
  }

  /* ============================================================
     Lecture IA
     ============================================================ */
  /* Meme structure que l'analyse de l'alimentation : une note, un
     verdict, deux listes, puis du concret a faire et a manger. */
  const INSIGHT_SCHEMA = AI.T.obj({
    note: AI.T.int('Note de 0 a 10 de la forme generale, en croisant sommeil, activite, coeur et alimentation'),
    verdict: AI.T.str('Deux phrases maximum, en francais simple, sans jargon medical et sans flatterie'),
    bien: AI.T.arr(AI.T.str(''), 'Deux a quatre choses qui vont bien, avec le chiffre qui le montre'),
    moins_bien: AI.T.arr(AI.T.str(''), 'Deux a quatre choses qui ne vont pas, avec le chiffre qui le montre'),
    actions: AI.T.arr(AI.T.obj({
      quoi: AI.T.str('Une action precise et faisable aujourd hui, en une ligne'),
      pourquoi: AI.T.str('Le gain attendu, en une ligne simple')
    }), 'Deux a quatre actions concretes'),
    manger: AI.T.arr(AI.T.obj({
      aliment: AI.T.str('Un aliment courant en France'),
      pourquoi: AI.T.str('Ce que ca apporte a sa forme, en une ligne simple')
    }), 'Deux a quatre aliments a ajouter'),
    objectif_semaine: AI.T.str('Un seul objectif pour la semaine, mesurable')
  }, ['note', 'verdict', 'bien', 'moins_bien', 'actions', 'manger']);

  async function insight() {
    if (!AI.available()) return UI.echecIA('NO_KEY', { titre: "Le bilan de forme demande une clé IA" });
    const days = lastDays(Math.max(14, range));
    const food = global.Food ? Food.summary(7) : [];
    UI.toast('Analyse…');
    const table = days.filter((d) => d.steps != null || d.sleep != null).map((d) =>
      d.day + ' : ' + [
        d.steps != null ? d.steps + ' pas' : null,
        d.exercise != null ? d.exercise + ' min exercice' : null,
        d.active != null ? Math.round(d.active) + ' kcal actives' : null,
        d.sleep != null ? Math.round(d.sleep) + ' min de sommeil' : null,
        d.hrRest != null ? 'FC repos ' + Math.round(d.hrRest) : null,
        d.hrv != null ? 'VFC ' + Math.round(d.hrv) + ' ms' : null,
        d.weight != null ? d.weight + ' kg' : null,
        d.spo2 != null ? 'oxygène ' + Math.round(d.spo2) + ' %' : null,
        d.resp != null ? 'respiration ' + Math.round(d.resp) + '/min' : null,
        d.vo2 != null ? 'VO2max ' + d.vo2 : null,
        d.distance != null ? d.distance + ' km' : null,
        d.floors != null ? d.floors + ' étages' : null
      ].filter(Boolean).join(', ')).join('\n');

    const nutri = food.filter((f) => f.kcal).map((f) => f.day + ' : ' + Math.round(f.kcal) + ' kcal, ' + Math.round(f.prot) + ' g de protéines').join('\n');

    try {
      const res = await AI.json(
        "Tu lis des données Apple Santé. Sois factuel, direct, sans flatterie et sans alarmisme. Tu n'es pas medecin : aucune conclusion diagnostique.\n\n" +
        "DONNEES QUOTIDIENNES :\n" + table + "\n\n" +
        (nutri ? "ALIMENTATION :\n" + nutri + "\n\n" : "") +
        (global.Mood ? "VIE SOCIALE ET ÉQUILIBRE ÉMOTIONNEL :\n" + Mood.describe() + "\n\n" : "") +
        "CONSTATS DÉJÀ CALCULÉS (fiables, pars de là) :\n" + bilanChiffre().map((x) => '- ' + x.titre + ' [' + x.etat + '] : ' + x.constat + ' ' + x.cause).join('\n') + "\n\n" +
        (Store.all('workouts').length ? "ENTRAÎNEMENTS DE LA MONTRE (14 j) :\n" + Store.all('workouts').filter((w) => (w.start || 0) > Date.now() - 14 * 86400e3)
          .map((w) => UI.day.key(w.start) + ' ' + w.nom + ' ' + Math.round(w.minutes || 0) + ' min' + (w.kcal ? ', ' + Math.round(w.kcal) + ' kcal' : '')).join('\n') + "\n\n" : "") +
        "Objectifs : " + JSON.stringify(goals()) + "\n\n" +
        "Croise sommeil, frequence cardiaque au repos, variabilite et activite. Signale une tendance seulement si elle est visible dans les chiffres. " +
        "Si plusieurs jours ont passe sans aucune activite impliquant quelqu'un d'autre, dis-le franchement : c'est un facteur de forme au meme titre que le sommeil, " +
        "et aucune activite solo ne le compense.\n\n" +
        "Pour chaque problème, donne la CAUSE probable (avec le chiffre) et UNE solution simple qu'on peut appliquer aujourd'hui. " +
        "Un enfant de douze ans doit comprendre. " +
        "Ecris pour quelqu'un qui n'y connait rien : des phrases courtes, des mots de tous les jours, aucun terme technique sans traduction. " +
        "Dis « battements du coeur au repos » plutot que « FC de repos », « recuperation » plutot que « VFC ». " +
        "Chaque action doit etre faisable aujourd'hui, et chaque aliment doit s'acheter en supermarche. Reponds en francais.",
        INSIGHT_SCHEMA, { cache: false, temperature: 0.5 });
      Store.set('healthInsight', { at: Date.now(), data: res, ferme: false });
      render();
    } catch (e) { UI.echecIA(e, { titre: "Le bilan de forme n'a pas pu être fait", reessayer: () => insight() }); }
  }

  /* Expose pour les autres modules. */
  function today() { return dayOf(UI.day.today()) || {}; }
  function streakActive(goalSteps) {
    const g = goalSteps || goals().steps;
    let n = 0;
    for (let i = 0; i < 400; i++) {
      const d = dayOf(UI.day.add(UI.day.today(), -i));
      if (d && d.steps >= g) n++; else if (i > 0) break;
    }
    return n;
  }

  global.Health = { mount, today, lastDays, goals, streakActive, TYPES };
  App.register('health', { mount: mount });
})(window);
