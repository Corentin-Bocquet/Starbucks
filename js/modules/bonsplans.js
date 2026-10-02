/* ============================================================
   EVER · Bons plans et sorties, dans le guide de ville

   Ce qui manquait au guide : ce qui se passe CETTE semaine, et ce
   qui TE concerne. Le chocolatier qui fait une remise etudiante,
   le concert de piano gratuit a la cathedrale jeudi soir, la
   seance a 5 euros le mardi. Pas une liste d'office de tourisme.

   Trois idees tiennent le module :

   1. Le profil d'abord. Un bon plan etudiant ne sert a rien a un
      retraite, et l'inverse. Une question, un toucher : qui es-tu ?
      Les envies et le budget s'affinent ensuite, sans obligation.

   2. Deux voix dans chaque fiche. Le titre et l'accroche donnent
      envie, comme un ami qui te tire par la manche. « Le concret »
      dit les faits bruts : date, lieu, prix, condition, source.
      L'IA a le droit d'embellir l'experience, jamais les faits.
      La recherche Google est branchee pour que la semaine soit la
      vraie semaine.

   3. Les gouts s'apprennent. J'aime / Pas pour moi est stocke dans
      la collection `bpVotes`, synchronisee avec Supabase comme
      toutes les autres. Les votes servent deux fois : au classement
      immediat sur l'appareil, et dans la consigne de la generation
      suivante. Un « pas pour moi » disparait tout de suite.
   ============================================================ */
(function (global) {
  'use strict';

  const TTL = 12 * 3600e3;
  const VOTES = 'bpVotes';

  const STATUTS = [
    { id: 'etudiant',  nom: 'Étudiant' },
    { id: 'lyceen',    nom: 'Lycéen' },
    { id: 'actif',     nom: 'Salarié' },
    { id: 'recherche', nom: 'En recherche' },
    { id: 'retraite',  nom: 'Retraité' },
    { id: 'parent',    nom: 'Parent' }
  ];
  const AGES = ['Moins de 18', '18-25', '26-35', '36-50', '50 et plus'];
  const ENVIES = [
    { id: 'musique',      nom: 'Musique' },
    { id: 'spectacle',    nom: 'Spectacles' },
    { id: 'expo',         nom: 'Expos et musées' },
    { id: 'gastronomie',  nom: 'Bonne bouffe' },
    { id: 'sucre',        nom: 'Sucré' },
    { id: 'soiree',       nom: 'Soirées' },
    { id: 'sport',        nom: 'Sport' },
    { id: 'nature',       nom: 'Nature' },
    { id: 'cinema',       nom: 'Cinéma' },
    { id: 'atelier',      nom: 'Ateliers' },
    { id: 'shopping',     nom: 'Shopping' },
    { id: 'marche',       nom: 'Marchés' }
  ];
  const BUDGETS = [
    { id: 'serre',  nom: 'Serré' },
    { id: 'normal', nom: 'Normal' },
    { id: 'large',  nom: 'Large' }
  ];

  /* Chaque categorie a sa teinte et son visuel de repli. */
  const CATS = {
    musique:     { nom: 'Musique',      t: ['#3B1F6B', '#8E5BD6'], vis: 'musique' },
    spectacle:   { nom: 'Spectacle',    t: ['#6B1F3A', '#D04D7A'], vis: 'cat-culture' },
    expo:        { nom: 'Expo',         t: ['#1F4A6B', '#4E93CE'], vis: 'exposition' },
    gastronomie: { nom: 'Gourmand',     t: ['#6B3A1F', '#D9894E'], vis: 'restaurant' },
    sucre:       { nom: 'Sucré',        t: ['#5A2A1A', '#C9784F'], vis: 'mini-chocolats' },
    soiree:      { nom: 'Soirée',       t: ['#1F1F5A', '#5B5BD6'], vis: 'bar' },
    sport:       { nom: 'Sport',        t: ['#1F5A3A', '#4EBF7F'], vis: 'sport' },
    nature:      { nom: 'Dehors',       t: ['#2F5A1F', '#7FBF4E'], vis: 'randonnee' },
    cinema:      { nom: 'Cinéma',       t: ['#3A1F1F', '#B5524E'], vis: 'cinema' },
    atelier:     { nom: 'Atelier',      t: ['#5A4A1F', '#C9A84E'], vis: 'apprendre' },
    shopping:    { nom: 'Shopping',     t: ['#5A1F5A', '#BF4EBF'], vis: 'ic-shopping' },
    marche:      { nom: 'Marché',       t: ['#4A5A1F', '#A8BF4E'], vis: 'marche' },
    autre:       { nom: 'Bon plan',     t: ['#7A2E54', '#BE5F8C'], vis: 'bons-plans' }
  };

  /* Les visuels que l'IA a le droit de choisir. Une liste fermee :
     un nom invente donnerait un rectangle vide. */
  const VISUELS = ['musique', 'cinema', 'exposition', 'musee', 'galerie', 'cat-culture', 'histoire', 'visite',
    'marche', 'restaurant', 'brunch', 'cafe-lieu', 'deux-cafes', 'bar', 'apero', 'cocktails', 'biere', 'vin-rouge',
    'mini-chocolats', 'chocolat-noir', 'truffes-chocolat', 'cookies', 'glace', 'crepe', 'gaufre', 'pizza', 'sushi', 'burger',
    'sport', 'foot', 'course', 'velo', 'randonnee', 'patinoire', 'bowling', 'escape', 'karting', 'escalade', 'jeux-societe',
    'lecture', 'spa', 'massage', 'coiffeur', 'cadeau', 'bons-plans', 'rire', 'coucher-soleil', 'ami', 'couple', 'famille',
    'apprendre', 'ic-shopping', 'parfum', 'jeu-video', 'cat-insolite', 'surprise', 'popcorn'].filter((v) => !global.Vis || Vis.SET.has(v));

  const slug = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48);
  const profil = () => Store.get('bpProfil', null);
  const nomDe = (liste, id) => (liste.find((x) => x.id === id) || {}).nom || id;

  /* ============================================================
     Les gouts

     Un vote recent pese plus qu'un vote ancien : on change. Le
     score d'une categorie est la somme ponderee des votes, borne
     pour qu'un seul « j'aime » ne monopolise pas tout l'ecran.
     ============================================================ */
  function votes() { return Store.all(VOTES); }
  function voteDe(cle) { const v = Store.find(VOTES, 'v-' + cle); return v ? v.vote : 0; }

  function gouts() {
    const now = Date.now();
    const parCat = {};
    const aime = [], deteste = [];
    votes().slice().sort((a, b) => (b._up || 0) - (a._up || 0)).forEach((v) => {
      const age = (now - (v._up || now)) / 86400e3;
      const poids = age < 14 ? 1 : age < 60 ? 0.6 : 0.3;
      parCat[v.categorie] = (parCat[v.categorie] || 0) + v.vote * poids;
      if (v.vote > 0 && aime.length < 12) aime.push(v);
      if (v.vote < 0 && deteste.length < 12) deteste.push(v);
    });
    return { parCat, aime, deteste, total: votes().length };
  }

  function decrireGouts(g) {
    const lignes = [];
    const cats = Object.keys(g.parCat).sort((a, b) => g.parCat[b] - g.parCat[a]);
    const plus = cats.filter((c) => g.parCat[c] > 0.4).map((c) => (CATS[c] || CATS.autre).nom);
    const moins = cats.filter((c) => g.parCat[c] < -0.4).map((c) => (CATS[c] || CATS.autre).nom);
    if (plus.length) lignes.push('Catégories qu il apprécie : ' + plus.join(', '));
    if (moins.length) lignes.push('Catégories qu il rejette : ' + moins.join(', '));
    if (g.aime.length) lignes.push('Il a aimé : ' + g.aime.map((v) => '« ' + v.titre + ' »' + (v.lieu ? ' (' + v.lieu + ')' : '')).join(' ; '));
    if (g.deteste.length) lignes.push("Il n'a pas aimé : " + g.deteste.map((v) => '« ' + v.titre + ' »').join(' ; '));
    return lignes.length ? lignes.join('\n') : "Aucun vote encore : varie les catégories pour apprendre ses goûts.";
  }

  function decrireProfil(p) {
    if (!p) return 'Profil inconnu.';
    const b = [];
    b.push('Situation : ' + nomDe(STATUTS, p.statut));
    if (p.age) b.push('Âge : ' + p.age + ' ans');
    if (p.envies && p.envies.length) b.push('Envies déclarées : ' + p.envies.map((e) => nomDe(ENVIES, e)).join(', '));
    if (p.budget) b.push('Budget sorties : ' + nomDe(BUDGETS, p.budget));
    if (p.note) b.push('Il précise : ' + p.note);
    return b.join('\n');
  }

  /* ============================================================
     La generation
     ============================================================ */
  const SCHEMA = AI.T.obj({
    plans: AI.T.arr(AI.T.obj({
      type: AI.T.enu(['bon_plan', 'evenement'], 'bon_plan : une offre, une reduction, un tarif reduit, un truc gratuit permanent. evenement : quelque chose qui a lieu a une date'),
      categorie: AI.T.enu(Object.keys(CATS), ''),
      titre: AI.T.str('Titre vendeur, 6 a 9 mots, qui donne envie, sans point final'),
      accroche: AI.T.str('Deux phrases sensorielles et emotionnelles, au tutoiement, qui font vivre le moment. Embellit l experience, jamais les faits'),
      quoi: AI.T.str('Les faits bruts en une phrase neutre : ce que c est exactement'),
      lieu: AI.T.str('Nom de l etablissement ou du lieu'),
      adresse: AI.T.str('Adresse precise si connue, sinon vide'),
      debut: AI.T.str('Pour un evenement : AAAA-MM-JJ. Pour un bon plan permanent : vide'),
      fin: AI.T.str('AAAA-MM-JJ, identique au debut si un seul jour. Vide si permanent'),
      horaire: AI.T.str('Ex : 20h30, ou « du mardi au samedi, 10h-19h ». Vide si inconnu'),
      prix: AI.T.str('Prix payé avec le bon plan, ex : « 1 € », « Gratuit », « 5 € au lieu de 9 € ». Vide si inconnu'),
      prix_normal: AI.T.str('Prix habituel sans le bon plan, ex : « 4,50 € ». Vide si sans objet'),
      condition: AI.T.str('Condition pour en profiter, ex : « sur présentation de la carte étudiante ». Vide si aucune'),
      pourquoi_toi: AI.T.str('Une phrase courte : pourquoi ca colle a CE profil et a ses gouts'),
      visuel: AI.T.enu(VISUELS, 'Le visuel le plus parlant'),
      pertinence: AI.T.int('De 1 a 10 : a quel point ca le concerne lui'),
      fiable: AI.T.bool('Vrai seulement si tu as trouvé l information dans une source datée et récente, ou si c est un rendez-vous établi de longue date'),
      source: AI.T.str('Nom du site ou de la page source'),
      lien: AI.T.str('URL de la source si tu l as, sinon vide')
    }), 'Entre 8 et 12 entrées, mélange des deux types'),
    villes_voisines: AI.T.arr(AI.T.str('Nom de commune'), 'Quatre à six villes à moins de 40 km, de la plus intéressante à la moins intéressante pour sortir')
  }, ['plans', 'villes_voisines']);

  function cle(city) {
    const p = profil() || {};
    return 'bp:' + slug(city) + ':' + UI.day.today() + ':' + slug([p.statut, p.age, (p.envies || []).join('.'), p.budget, p.note].join('|'));
  }

  /* Le guide se redessine quand il finit de s'ecrire : sans ce
     registre, la zone remontee relancerait une seconde recherche
     identique pendant que la premiere tourne encore. */
  const enCours = new Map();

  function generer(city, place, force) {
    const k = cle(city);
    if (!force) {
      const c = Store.get(k, null);
      if (c && Date.now() - c.at < TTL) return Promise.resolve(c);
    }
    if (enCours.has(k)) return enCours.get(k);
    const pr = produire(city, place, k).finally(() => enCours.delete(k));
    enCours.set(k, pr);
    return pr;
  }

  async function produire(city, place, k) {
    const from = UI.day.today(), to = UI.day.add(from, 14);
    const g = gouts();
    const lieu = city + (place && place.admin ? ' (' + place.admin + (place.country ? ', ' + place.country : '') + ')' : '');
    const quand = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

    const prompt =
      "Tu es l'ami du coin qui connaît TOUS les bons plans de " + lieu + " et qui sait raconter.\n" +
      "Nous sommes le " + quand + ". Fenêtre : du " + from + " au " + to + ".\n\n" +
      "PROFIL :\n" + decrireProfil(profil()) + "\n\n" +
      "GOÛTS APPRIS (ses votes passés, à respecter) :\n" + decrireGouts(g) + "\n\n" +
      "CE QUE JE VEUX :\n" +
      "1. Des BONS PLANS qui le concernent vraiment : réductions et tarifs liés à sa situation (étudiant, jeune, demandeur d'emploi, etc.), " +
      "offres d'artisans et commerces locaux, entrées gratuites (premier dimanche du mois, nocturnes), happy hours, cartes et pass de la ville, " +
      "menus à petit prix, applications anti-gaspi actives dans la ville. Exemple du niveau attendu : un chocolatier local qui fait une remise étudiante.\n" +
      "2. Des ÉVÉNEMENTS réels dans la fenêtre : concerts (y compris classique, piano, orgue, jazz), spectacles, expos, festivals, marchés, " +
      "animations de la ville, soirées étudiantes, rencontres, ateliers. Les villes en organisent sans arrêt : cherche l'agenda de la mairie, " +
      "de l'office de tourisme, des salles, de l'université, des médiathèques.\n\n" +
      "RÈGLES DE VÉRITÉ (non négociables) :\n" +
      "- Utilise la recherche web. N'invente JAMAIS un établissement, une date, un prix ou une réduction.\n" +
      "- Si tu n'es pas sûr qu'une offre existe encore, mets fiable à faux. Si tu n'as aucune trace, ne la mets pas.\n" +
      "- Aucune date passée. Dates au format AAAA-MM-JJ.\n" +
      "- Classe en tenant compte des goûts appris : plus de ce qu'il a aimé, rien qui ressemble à ce qu'il a rejeté, " +
      "et une ou deux découvertes hors de ses habitudes pour qu'il ne tourne pas en rond.\n\n" +
      "RÈGLES DE TON :\n" +
      "- titre et accroche : donne ENVIE. Fais vivre le moment avec les sens et l'émotion (la lumière, le son, le goût, " +
      "avec qui il y sera, ce qu'il ressentira en sortant). Tutoiement, phrases vivantes, pas de superlatifs creux, pas de ton publicitaire.\n" +
      "  Exemple pour un concert de piano : « Sous les voûtes, les premières notes tombent et le temps s'arrête. Tu ressors léger, avec l'impression d'avoir volé une heure au monde. »\n" +
      "- quoi, prix, condition : faits bruts, neutres, vérifiables.\n" +
      "- N'utilise jamais le tiret cadratin.\n" +
      "- Réponds en français.";

    const res = await AI.jsonCherche(prompt, SCHEMA, { cache: false, temperature: 0.75, maxTokens: 12000 });
    const plans = (res.plans || []).map((x) => normaliser(x, city)).filter(Boolean);
    const out = {
      at: Date.now(),
      plans: plans,
      voisines: (res.villes_voisines || []).filter((v) => v && slug(v) !== slug(city)).slice(0, 6),
      sources: (res._sources || []).slice(0, 8),
      cherche: !!res._cherche,
      votesA: g.total
    };
    Store.set(k, out);
    return out;
  }

  function date(d) { const m = /(\d{4})-(\d{2})-(\d{2})/.exec(String(d || '')); return m ? m[0] : ''; }

  function normaliser(x, city) {
    if (!x || !x.titre) return null;
    const debut = date(x.debut), fin = date(x.fin) || debut;
    if (fin && fin < UI.day.today()) return null;
    const cat = CATS[x.categorie] ? x.categorie : 'autre';
    return {
      cle: slug(city) + '-' + slug(x.titre),
      type: x.type === 'evenement' && debut ? 'evenement' : 'bon_plan',
      categorie: cat,
      titre: String(x.titre).replace(/\s*\u2014\s*/g, ', '),
      accroche: String(x.accroche || '').replace(/\s*\u2014\s*/g, ', '),
      quoi: x.quoi || '', lieu: x.lieu || '', adresse: x.adresse || '',
      debut: debut, fin: fin, horaire: x.horaire || '',
      prix: x.prix || '', prix_normal: x.prix_normal || '', condition: x.condition || '',
      pourquoi: x.pourquoi_toi || '',
      visuel: global.Vis && Vis.SET.has(x.visuel) ? x.visuel : CATS[cat].vis,
      pertinence: Math.max(1, Math.min(10, Number(x.pertinence) || 5)),
      fiable: !!x.fiable,
      source: x.source || '',
      lien: /^https?:\/\//.test(x.lien || '') ? x.lien : ''
    };
  }

  /* Le classement local : la pertinence donnee par l'IA, corrigee
     tout de suite par les votes, sans attendre une regeneration. */
  function classer(plans) {
    const g = gouts();
    return plans
      .filter((p) => voteDe(p.cle) >= 0)
      .map((p) => {
        let s = p.pertinence + Math.max(-4, Math.min(4, (g.parCat[p.categorie] || 0) * 1.5));
        if (voteDe(p.cle) > 0) s += 3;
        if (p.type === 'evenement' && quand(p).proche) s += 1.5;
        if (!p.fiable) s -= 1;
        return { p, s };
      })
      .sort((a, b) => b.s - a.s)
      .map((x) => x.p);
  }

  /* ---------- Libelles de temps et de prix ---------- */
  function quand(p) {
    if (p.type !== 'evenement' || !p.debut) return { txt: p.horaire ? p.horaire : 'En ce moment', proche: false };
    const today = UI.day.today();
    if (p.debut <= today && p.fin >= today) return { txt: p.debut === p.fin ? "Aujourd'hui" : "En ce moment", proche: true };
    if (p.debut === UI.day.add(today, 1)) return { txt: 'Demain', proche: true };
    const [y, m, d] = p.debut.split('-').map(Number);
    const j = new Date(y, m - 1, d);
    const dans = Math.round((j - new Date(new Date().toDateString())) / 86400e3);
    return {
      txt: j.toLocaleDateString('fr-FR', dans < 7 ? { weekday: 'long' } : { weekday: 'short', day: 'numeric', month: 'short' }),
      proche: dans <= 3
    };
  }

  function euros(s) { const m = /(\d+(?:[.,]\d+)?)/.exec(String(s || '')); return m ? parseFloat(m[1].replace(',', '.')) : null; }

  function badge(p) {
    if (/gratuit/i.test(p.prix)) return 'Gratuit';
    const a = euros(p.prix), b = euros(p.prix_normal);
    if (a != null && b && b > a) return '-' + Math.round((1 - a / b) * 100) + ' %';
    if (p.type === 'evenement') { const q = quand(p); if (q.proche) return q.txt; }
    return p.prix || (p.type === 'evenement' ? quand(p).txt : 'Bon plan');
  }

  /* ============================================================
     L'affichage
     ============================================================ */
  const POUCE = (bas) => '<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"' +
    (bas ? ' style="transform:rotate(180deg)"' : '') + '><path d="M7 10v11H4a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1h3Z"/><path d="M7 10l4-7a2.5 2.5 0 0 1 3 2.6L13.5 9H19a2 2 0 0 1 2 2.3l-1.3 7.6A2.5 2.5 0 0 1 17.2 21H7"/></svg>';

  let etat = { el: null, city: '', place: null, data: null, filtre: 'tout', onVille: null };

  function monter(el, city, place, onVille) {
    etat = { el: el, city: city, place: place, data: null, filtre: Store.get('bpFiltre', 'tout'), onVille: onVille };
    if (!profil()) { dessinerAccueil(); return; }
    const c = Store.get(cle(city), null);
    if (c && Date.now() - c.at < TTL) { etat.data = c; dessiner(); return; }
    lancer(false);
  }

  async function lancer(force) {
    const el = etat.el;
    if (!AI.available()) {
      el.innerHTML = cadre('<div class="bp-vide">' + Icon('key', 22) +
        '<p>Les bons plans sont trouvés par l\'IA. Active-la dans Réglages.</p></div>');
      return;
    }
    el.innerHTML = cadre('<div class="bp-attente">' +
      '<div class="bp-squel"></div><div class="bp-squel"></div>' +
      '<p>' + Icon('sparkle', 16) + 'Je fouille l\'agenda et les bons plans ' + UI.esc(prepDe(etat.city)) + ' pour toi…</p></div>');
    const moi = etat;
    try {
      const d = await generer(etat.city, etat.place, force);
      if (etat !== moi) return;
      etat.data = d;
      if (global.Game) Game.award('guide', 6);
      dessiner();
    } catch (e) {
      if (etat !== moi) return;
      el.innerHTML = cadre('<div class="bp-vide">' + Icon('alert', 22) + '<p>' + UI.esc(AI.humanError(e)) + '</p>' +
        '<button class="btn sm" data-bp="retry">' + Icon('refresh', 15) + 'Réessayer</button></div>');
      lier();
    }
  }

  function prepDe(n) {
    if (/^Le /i.test(n)) return 'du ' + n.slice(3);
    if (/^Les /i.test(n)) return 'des ' + n.slice(4);
    if (/^La /i.test(n)) return 'de la ' + n.slice(3);
    if (/^L'/i.test(n)) return "de l'" + n.slice(2);
    return (/^[aeiouyàâéèêh]/i.test(n) ? "d'" : 'de ') + n;
  }

  function cadre(corps, outils) {
    return '<div class="section bp">' +
      '<div class="secbar"><h2>' + Icon('sparkle', 18) + ' Pour toi cette semaine</h2>' + (outils || '') + '</div>' +
      corps + '</div>';
  }

  function dessinerAccueil() {
    etat.el.innerHTML = cadre(
      '<div class="bp-accueil">' +
        '<div class="bp-accueil-vis">' + Vis.html('bons-plans') + '</div>' +
        '<h3>Les bons plans qui te concernent vraiment</h3>' +
        '<p>Les remises auxquelles tu as droit, les concerts et les sorties de la semaine, triés pour toi. ' +
        'Dis-moi juste qui tu es :</p>' +
        '<div class="chips">' + STATUTS.map((s) => '<button class="chip" data-statut="' + s.id + '">' + UI.esc(s.nom) + '</button>').join('') + '</div>' +
        '<button class="lien" data-bp="profil">Affiner : âge, envies, budget</button>' +
      '</div>');
    etat.el.querySelectorAll('[data-statut]').forEach((b) => b.onclick = () => {
      Store.set('bpProfil', { statut: b.dataset.statut, envies: [], at: Date.now() });
      UI.haptic('success');
      lancer(false);
    });
    lier();
  }

  function dessiner() {
    const d = etat.data;
    const tous = classer(d.plans || []);
    const liste = tous.filter((p) => etat.filtre === 'tout' || p.type === etat.filtre);
    const g = gouts();
    const appris = g.total - (d.votesA || 0);

    const outils = '<button class="tbtn" data-bp="profil" aria-label="Mon profil">' + Icon('user', 17) + '</button>';
    const filtres = '<div class="chips bp-filtres">' + [['tout', 'Tout'], ['bon_plan', 'Bons plans'], ['evenement', 'Sorties']].map((f) =>
      '<button class="chip ' + (etat.filtre === f[0] ? 'on' : '') + '" data-filtre="' + f[0] + '">' + f[1] +
      ' <small>' + (f[0] === 'tout' ? tous.length : tous.filter((p) => p.type === f[0]).length) + '</small></button>').join('') + '</div>';

    const cartes = liste.length
      ? '<div class="bp-rail">' + liste.map(carte).join('') + '</div>'
      : '<div class="bp-vide"><p>Rien dans cette catégorie pour l\'instant.</p></div>';

    const apprend = appris >= 3
      ? '<button class="bp-apprend" data-bp="refresh">' + Icon('sparkle', 16) +
        '<span><b>J\'ai appris de tes ' + appris + ' derniers votes</b><small>Touche pour une sélection qui en tient compte</small></span>' + Icon('next', 15) + '</button>'
      : '';

    const voisines = (d.voisines || []).length
      ? '<div class="bp-voisines"><small>Juste à côté</small><div class="chips">' +
        d.voisines.map((v) => '<button class="chip" data-ville="' + UI.attr(v) + '">' + Icon('pin', 13) + UI.esc(v) + '</button>').join('') +
        '</div></div>'
      : '';

    const pied = '<p class="bp-pied">' +
      (d.cherche ? 'Trouvé sur le web par l\'IA le ' : 'Écrit par l\'IA le ') + UI.esc(UI.fmt.date(d.at)) +
      '. Vérifie la source avant d\'y aller. ' +
      '<button class="lien" data-bp="refresh">Actualiser</button></p>';

    etat.el.innerHTML = cadre(filtres + cartes + apprend + voisines + pied, outils);
    lier();
  }

  function carte(p) {
    const c = CATS[p.categorie] || CATS.autre;
    const q = quand(p);
    const v = voteDe(p.cle);
    return '<article class="bp-carte" data-plan="' + UI.attr(p.cle) + '" style="--k1:' + c.t[0] + ';--k2:' + c.t[1] + '">' +
      '<div class="bp-vis">' + Vis.html(p.visuel) + '</div>' +
      '<div class="bp-voile"></div>' +
      '<div class="bp-haut">' +
        '<span class="bp-badge' + (/gratuit|%/i.test(badge(p)) ? ' chaud' : '') + '">' + UI.esc(badge(p)) + '</span>' +
        '<span class="bp-cat">' + UI.esc(p.type === 'evenement' ? q.txt : c.nom) + '</span>' +
      '</div>' +
      '<div class="bp-tx">' +
        '<h3>' + UI.esc(p.titre) + '</h3>' +
        '<p>' + UI.esc(p.accroche) + '</p>' +
        '<div class="bp-meta">' +
          (p.lieu ? '<span>' + Icon('pin', 12) + UI.esc(p.lieu) + '</span>' : '') +
          (p.prix ? '<span>' + (p.prix_normal ? '<s>' + UI.esc(p.prix_normal) + '</s> ' : '') + UI.esc(p.prix) + '</span>' : '') +
        '</div>' +
      '</div>' +
      '<div class="bp-votes">' +
        '<button class="bp-pouce' + (v > 0 ? ' on' : '') + '" data-vote="1" aria-label="J\'aime">' + POUCE(false) + '</button>' +
        '<button class="bp-pouce non" data-vote="-1" aria-label="Pas pour moi">' + POUCE(true) + '</button>' +
      '</div>' +
    '</article>';
  }

  function trouverPlan(k) { return ((etat.data && etat.data.plans) || []).find((p) => p.cle === k); }

  function lier() {
    const el = etat.el;
    el.querySelectorAll('[data-bp]').forEach((b) => b.onclick = () => {
      const a = b.dataset.bp;
      if (a === 'retry') lancer(true);
      if (a === 'refresh') lancer(true);
      if (a === 'profil') editerProfil();
    });
    el.querySelectorAll('[data-filtre]').forEach((b) => b.onclick = () => {
      etat.filtre = b.dataset.filtre; Store.set('bpFiltre', etat.filtre); UI.haptic('select'); dessiner();
    });
    el.querySelectorAll('[data-ville]').forEach((b) => b.onclick = () => changerVille(b.dataset.ville));
    el.querySelectorAll('[data-plan]').forEach((card) => {
      card.onclick = (e) => {
        const vb = e.target.closest('[data-vote]');
        const p = trouverPlan(card.dataset.plan);
        if (!p) return;
        if (vb) { e.stopPropagation(); voter(p, Number(vb.dataset.vote), card); return; }
        ouvrir(p);
      };
    });
  }

  /* ---------- Voter ---------- */
  function voter(p, v, card) {
    const id = 'v-' + p.cle;
    const avant = voteDe(p.cle);
    if (avant === v) {
      Store.del(VOTES, id);
      UI.haptic('light');
      if (card) card.querySelector('[data-vote="1"]').classList.remove('on');
      return;
    }
    const row = {
      id: id, cle: p.cle, vote: v, titre: p.titre, categorie: p.categorie, type: p.type,
      lieu: p.lieu, ville: etat.city, quoi: p.quoi
    };
    const exist = Store.all(VOTES, true).find((x) => x.id === id);
    if (exist) Store.put(VOTES, id, Object.assign(row, { _del: false })); else Store.add(VOTES, row);
    Store.log('bonplan-vote', { label: p.titre, vote: v, categorie: p.categorie });

    if (v > 0) {
      UI.haptic('success');
      UI.toast('Noté : je t\'en trouverai d\'autres comme ça');
      if (card) card.querySelector('[data-vote="1"]').classList.add('on');
    } else {
      UI.haptic('light');
      UI.toast('Compris, je t\'en proposerai moins comme ça');
      if (card) {
        card.classList.add('sort');
        setTimeout(dessiner, 320);
      }
    }
  }

  /* ---------- La fiche ---------- */
  function ouvrir(p) {
    const c = CATS[p.categorie] || CATS.autre;
    const q = quand(p);
    const ligne = (ic, lab, val) => val ? '<div class="bp-fait"><span class="ic">' + Icon(ic, 16) + '</span><span><small>' + lab + '</small><b>' + val + '</b></span></div>' : '';
    const dates = p.type === 'evenement'
      ? UI.esc(q.txt.charAt(0).toUpperCase() + q.txt.slice(1)) + (p.fin && p.fin !== p.debut ? ' au ' + UI.esc(fmtJour(p.fin)) : '') + (p.horaire ? ', ' + UI.esc(p.horaire) : '')
      : UI.esc(p.horaire || '');
    const prix = p.prix ? (p.prix_normal ? '<s>' + UI.esc(p.prix_normal) + '</s> ' : '') + UI.esc(p.prix) : '';
    const v = voteDe(p.cle);

    Cartes.ouvrir({
      tete: Cartes.tete(p.titre, c.nom + (p.lieu ? ' · ' + p.lieu : ''), c.t, null),
      corps:
        '<article class="lecture bp-fiche">' +
          '<div class="lecvis bp-fvis" style="--k1:' + c.t[0] + ';--k2:' + c.t[1] + '">' + Vis.html(p.visuel) +
            '<span class="bp-badge' + (/gratuit|%/i.test(badge(p)) ? ' chaud' : '') + '">' + UI.esc(badge(p)) + '</span></div>' +
          '<p class="lead">' + UI.esc(p.accroche) + '</p>' +
          (p.pourquoi ? '<p class="bp-pourquoi">' + Icon('target', 15) + UI.esc(p.pourquoi) + '</p>' : '') +
          '<div class="bp-concret"><h4>Le concret</h4>' +
            (p.quoi ? '<p>' + UI.esc(p.quoi) + '</p>' : '') +
            ligne('calendar', 'Quand', dates) +
            ligne('pin', 'Où', UI.esc([p.lieu, p.adresse].filter(Boolean).join(', '))) +
            ligne('wallet', 'Prix', prix) +
            ligne('key', 'Condition', UI.esc(p.condition)) +
            (p.lien || p.source ? ligne('link', 'Source', p.lien
              ? '<a href="' + UI.attr(p.lien) + '" target="_blank" rel="noopener">' + UI.esc(p.source || hote(p.lien)) + '</a>'
              : UI.esc(p.source)) : '') +
          '</div>' +
          (!p.fiable ? '<div class="banner" style="margin-top:12px;font-size:12.5px">' + Icon('alert', 16) +
            '<span>Info à vérifier : l\'IA n\'a pas trouvé de source récente qui le confirme.</span></div>' : '') +
        '</article>' +
        '<div class="btnrow" style="margin-top:16px">' +
          (p.type === 'evenement'
            ? '<button class="btn primary grow lg" data-f="agenda">' + Icon('calendar', 17) + 'J\'y vais</button>'
            : '<button class="btn primary grow lg" data-f="plan">' + Icon('map', 17) + 'J\'y vais</button>') +
          '<button class="btn lg' + (v > 0 ? ' primary' : '') + '" data-f="aime" aria-label="J\'aime">' + POUCE(false) + '</button>' +
          '<button class="btn lg" data-f="non" aria-label="Pas pour moi">' + POUCE(true) + '</button>' +
        '</div>' +
        (p.type === 'evenement' && p.lieu ? '<button class="btn block" style="margin-top:8px" data-f="plan">' + Icon('map', 16) + 'Voir le plan</button>' : ''),
      onMount: (sh) => {
        sh.querySelectorAll('[data-f]').forEach((b) => b.onclick = () => {
          const f = b.dataset.f;
          if (f === 'aime') { voter(p, 1); UI.closeSheet(); dessiner(); }
          if (f === 'non') { voter(p, -1); UI.closeSheet(); dessiner(); }
          if (f === 'plan') MapPick.fiche({ nom: p.lieu || p.titre, adresse: p.adresse, ville: etat.city, categorie: c.nom, pitch: p.quoi });
          if (f === 'agenda') {
            if (voteDe(p.cle) <= 0) voter(p, 1);
            Cal.add({
              title: p.titre, date: p.debut, time: heure(p.horaire),
              location: [p.lieu, p.adresse, etat.city].filter(Boolean).join(', '),
              description: [p.quoi, p.prix, p.condition, p.lien].filter(Boolean).join('\n')
            });
          }
        });
      }
    });
    Store.log('bonplan-vu', { label: p.titre, categorie: p.categorie });
  }

  const hote = (u) => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch (e) { return 'Source'; } };
  function heure(h) { const m = /(\d{1,2})\s*[h:]\s*(\d{2})?/.exec(String(h || '')); return m ? String(m[1]).padStart(2, '0') + ':' + (m[2] || '00') : undefined; }
  function fmtJour(d) { const [y, m, j] = d.split('-').map(Number); return new Date(y, m - 1, j).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' }); }

  /* ---------- Changer de ville en un toucher ---------- */
  async function changerVille(nom) {
    UI.haptic('select');
    const r = await Ctx.searchCity(nom);
    const pays = (etat.place && etat.place.country) || '';
    const c = r.find((x) => x.country === pays) || r[0];
    if (!c) { UI.toast('Ville introuvable'); return; }
    Ctx.setPlace(c);
    if (etat.onVille) etat.onVille(c);
  }

  /* ---------- Le profil ---------- */
  function editerProfil() {
    const p = Object.assign({ statut: '', age: '', envies: [], budget: 'normal', note: '' }, profil() || {});
    const grp = (titre, attr, liste, multi) => '<div class="bp-grp"><h4>' + titre + '</h4><div class="chips">' +
      liste.map((x) => {
        const id = x.id || x, nom = x.nom || x;
        const on = multi ? (p[attr] || []).indexOf(id) >= 0 : p[attr] === id;
        return '<button class="chip ' + (on ? 'on' : '') + '" data-g="' + attr + '" data-v="' + UI.attr(id) + '"' + (multi ? ' data-multi' : '') + '>' + UI.esc(nom) + '</button>';
      }).join('') + '</div></div>';

    UI.openSheet('<div class="mbody" style="padding-top:6px">' +
      '<h2 style="font-size:22px;margin-bottom:4px">Qui es-tu ?</h2>' +
      '<p class="secdesc">Pour ne te montrer que ce qui te concerne. Reste sur ton compte.</p>' +
      grp('Situation', 'statut', STATUTS) +
      grp('Âge', 'age', AGES) +
      grp('Tes envies', 'envies', ENVIES, true) +
      grp('Budget sorties', 'budget', BUDGETS) +
      '<div class="bp-grp field"><h4>Autre chose ?</h4><textarea data-note rows="2" placeholder="J\'adore le jazz, pas de voiture, végétarien…">' + UI.esc(p.note || '') + '</textarea></div>' +
      (gouts().total ? '<button class="lien" data-raz style="margin-top:4px">Oublier mes ' + gouts().total + ' votes</button>' : '') +
      '<button class="btn primary block lg" data-ok style="margin-top:16px">Voir mes bons plans</button>' +
      '</div>', {
      onMount: (sh) => {
        sh.querySelectorAll('[data-g]').forEach((b) => b.onclick = () => {
          const a = b.dataset.g, v = b.dataset.v;
          if (b.hasAttribute('data-multi')) {
            const l = p[a] || [];
            const i = l.indexOf(v); i >= 0 ? l.splice(i, 1) : l.push(v);
            p[a] = l; b.classList.toggle('on');
          } else {
            p[a] = v;
            sh.querySelectorAll('[data-g="' + a + '"]').forEach((x) => x.classList.toggle('on', x === b));
          }
          UI.haptic('select');
        });
        const raz = sh.querySelector('[data-raz]');
        if (raz) raz.onclick = async () => {
          if (!(await UI.confirmSheet('Oublier tes votes ?', 'L\'IA repartira de zéro sur tes goûts.', true))) return;
          votes().forEach((v) => Store.del(VOTES, v.id));
          UI.toast('Votes oubliés');
          editerProfil();
        };
        sh.querySelector('[data-ok]').onclick = () => {
          if (!p.statut) { UI.toast('Choisis au moins ta situation'); return; }
          p.note = sh.querySelector('[data-note]').value.trim().slice(0, 240);
          p.at = Date.now();
          Store.set('bpProfil', p);
          UI.closeSheet();
          if (etat.el && document.body.contains(etat.el)) lancer(false);
        };
      }
    });
  }

  global.BonsPlans = { monter, gouts, profil, editerProfil };
})(window);
