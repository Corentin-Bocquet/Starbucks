RAPPORT : la "newsletter" Claude de Corentin, et comment la reproduire dans EVER

## 1. Où se trouve la tâche planifiée (constat)

- **Ce n'est pas une tâche cloud.** list_triggers (include_completed=true, 3 pages, 9 tâches) ne contient aucune tâche "newsletter". On y trouve 8 tâches COCO/YouTube (Dashboard horaire, Commentaires, Brief du matin A9, Bilan hebdo A10, Réception et montage, Instagram 12h30/18h30, Programmation hebdo), "Agent Seven", "Agent Davy" et "Briefing" (agenda et mails). Toutes sont désactivées (`enabled:false`).
- **Le vrai nom est probablement `apprentissage-quotidien-corentin`.** Source : Notion, CERVEAU CLAUDE / Mémoire, page "Apprentissage quotidien automatique sur 5 domaines — tâche planifiée chaque matin" (3871d612-a9ca-81d4-bea3-ef185da2c3bc), datée du 2026-06-22.
  - Elle n'apparaît pas dans list_triggers. C'était donc sans doute une tâche locale Cowork / desktop, que l'outil ne liste pas (la doc de list_triggers le précise).
  - **Son prompt stocké n'a pas pu être lu.** Ce qui suit est reconstitué à partir de ce qu'elle écrivait dans Notion.
- **Gmail : aucun mail de newsletter envoyé par Corentin ou par Claude.**
  - Requêtes : `from:me`/`from:cbocquetpro` avec newsletter/brief/"du jour", `subject:newsletter` hors LinkedIn et Boursobank, from:anthropic/claude.ai, sur 60 à 180 jours.
  - Le compte connecté est cbocquetpro@gmail.com. Il ne reçoit que des newsletters externes (LinkedIn, Boursobank, PostHog…).
  - Conclusion : la newsletter n'était pas envoyée par mail. Elle était livrée en session Claude et enregistrée dans Notion.
- **Activité.** Dernières entrées des registres :
  - 2026-08-31 : session n°41.
  - 2026-09-02 : registre science.
  - La tâche semble à l'arrêt depuis début septembre 2026.

## 2. Ce que contient la newsletter (preuves Notion)

### A. Leçons dans 5 domaines
- Domaines : 🎬 YouTube, 💪 Musculation, 🤖 IA & Claude, 📊 AMF, 🏦 Gestion de patrimoine.
- **Format** "leçon par thème avec insight, erreur commune, action immédiate, question active" (source : page Mémoire 3871d612…81d4…).
- **Fréquence** : chaque matin, sessions numérotées. "10 sessions complétées", puis "Session #11 demain matin. Corentin doit répondre aux questions des sessions précédentes pour que Claude adapte le niveau" (source : CERVEAU CLAUDE / Projets, "Apprentissage quotidien (5 domaines)", 3871d612-a9ca-8198-b729-dfd814e06879). La session 41 date du 2026-08-31 (page MiFID II, 3cd1d612…).
- **Mémoire anti-répétition** : base Notion "📚 Registre Apprentissage Quotidien" (collection://37f15bfe-0677-4dd2-8acf-f91c5073faee), décrite comme "Historique de tous les sujets traités… pour ne jamais répéter".
  - Champs : Sujet, Date, Session (n°), Thème (5 valeurs), Type (Leçon / Question posée / Tip pratique / Astuce Apple), Insight clé (1 à 2 phrases).
  - Le type "Astuce Apple" montre qu'il existait aussi une rubrique "astuce Apple".

### B. Rubrique 🔬 "Le fait prouvé du jour"
- Source : page "Registre Science Newsletter — Études déjà publiées" (3881d612-a9ca-810c-8d42-fb5b6c43dd6f). Elle sert de registre : "Chaque entrée = une étude… utilisée dans la rubrique 🔬 Le fait prouvé du jour. Consulter avant chaque session pour éviter les répétitions."
- Environ 40 entrées du 2026-06-23 au 2026-09-02, à peu près une par jour.
- Chaque entrée : date, étude et chercheur avec l'année (Milgram, Asch, Kahneman, Dunning-Kruger…), puis le fait clé chiffré (pourcentages, méta-analyse, taille d'effet d), souvent avec une application (YouTube, gestion…).
- Thème dominant : psychologie et sciences cognitives.
- Ces faits sont aussi copiés dans le registre d'apprentissage sous le titre "Fait prouvé — …" (ex. 3c21d612…, Thaler, session 40).

### C. La "newsletter parfaite" voulue par Corentin
- Source : note Notion "Newsletter parfaite" (3621d612-a9ca-81ac-8800-fcf95b3a9780, importée d'Apple Notes, créée le 2026-05-03).
- Sections demandées :
  1. Une exposition ou un événement au hasard dans Paris, de préférence le soir à partir de 19h.
  2. 5 idées de choses atypiques à faire aujourd'hui, 30 min à 1h maximum chacune.
  3. Un résumé géopolitique : France, US, monde.
  4. Un résumé financier en 5 points : CAC 40, S&P 500, BTC, Solana.
  5. La tenue du jour selon le temps, la météo, la saison, la ville et le calendrier. 6 propositions : 2 old money, 2 chill, 2 casual/élégant.
- Format : PDF, lecture en 3 à 4 min maximum, design ludique façon affiche, sections et couleurs.
- Note voisine "Agents GPT" (3621d612-a9ca-81d1-…) : "Newsletter : Cryptos, analyse quotidienne BTC/ETH/SOL, YT" (extrait vu dans les résultats de recherche).
- Note "ChatGPT n'est pas ton ami" (3621d612-a9ca-81e3-…), idées pour l'app dressing : météo auto, mood selon l'heure (chill le week-end, bureau en semaine), calendrier pour adapter la tenue, visualisation complète de la tenue avec accessoires.

### D. Briefs voisins (ne sont pas la newsletter, mais des fonctions proches)
- "Brief du matin COCO" A9, "Briefing" (agenda, mails importants, réponses à faire, actions) et "Agent Davy". Ils partagent la même règle : 3 points maximum, rien si rien d'utile (sources : prompts des tâches dans list_triggers).
- Cette règle colle exactement à la demande "ne pas surcharger, filtrer l'inutile".

## 3. Spécification de la fonction "Newsletter / Brief du jour" dans EVER (PWA statique + Gemini)

### Principe
Une seule carte "Ton brief du jour", lisible en 3 minutes, générée au premier lancement après 6h. Le résultat est mis en cache dans localStorage/IndexedDB avec la clé de la date. Un bouton "Régénérer" est disponible.

### Sections paramétrables (on/off, ordre) dans Réglages
1. **Météo et tenue du jour**
   - Choisie parmi les **tenues enregistrées** (pas parmi les pièces), filtrée par saison(s) et mood(s) de la tenue, puis par la météo.
   - Afficher 1 suggestion principale et 2 alternatives. Le "6 propositions" de la note est optionnel.
2. **Le fait prouvé du jour** : étude, chiffre clé, application concrète en 1 ligne.
3. **Leçon du jour** : un des 5 domaines en rotation. Contenu : insight, erreur commune, action immédiate, question active. Corentin répond à la question dans l'app pour adapter le niveau.
4. **Marchés en 5 points** : CAC 40, S&P 500, BTC, SOL (+ETH), variation sur 24h et 1 phrase de lecture.
5. **Monde** : géopolitique France / US / monde, 3 puces maximum.
6. **Ce soir à Paris** (1 événement à partir de 19h) et **5 idées atypiques** de 30 à 60 min.
7. **Santé et nutrition, version filtrée** : le bilan et les alertes seulement (signal anormal ou tendance à surveiller). Sinon une ligne "RAS". Pas de détail brut.

### Règles éditoriales (prompt Gemini)
- Français, ton de pote.
- 3 puces maximum par section ; section supprimée si rien d'utile.
- Aucun chiffre inventé : "non vérifié" sinon.
- Sortie en JSON strict : `{date, sections:[{id,titre,items:[{titre,texte,source?}]}]}`, rendu par l'app.

### Anti-répétition
- Garder en local l'historique des sujets : `newsletter_history` = {date, faits[], leçons[], thème}.
- Envoyer à Gemini la liste des 60 derniers titres avec la consigne "ne pas répéter".
- Possibilité d'importer la liste existante (~40 études du registre Notion) comme graine.

### Ce qui peut tourner côté client (PWA statique)
- **Météo** : Open-Meteo, sans clé, CORS OK, géolocalisation du navigateur.
- **Crypto** : CoinGecko simple/price, sans clé, CORS OK, pour BTC/ETH/SOL.
- **Gemini** : appel direct avec la clé que l'utilisateur saisit déjà dans l'app (déjà le modèle d'EVER), au moyen de google_search grounding (outil `google_search` de l'API Gemini).
  - Ça couvre l'actualité géopolitique, le CAC 40 / S&P 500 et les événements à Paris sans serveur.
  - Afficher les sources renvoyées par le grounding.
- **Tenue du jour, fait prouvé, leçon, filtre santé** : Gemini plus les données locales (tenues, mesures santé).
- **Génération à l'ouverture et cache du jour** : aucune tâche planifiée nécessaire.
- Le "PDF" de la note se remplace par une vue "affiche" imprimable (`window.print`) ou un partage d'image.

### Ce qui demande un serveur (optionnel)
- Génération à heure fixe et notification push le matin sans ouvrir l'app : Web Push avec clés VAPID et un cron, par exemple un Cloudflare Worker (le connecteur Cloudflare existe) ou une Edge Function Supabase.
- Les indices boursiers en données temps réel fiables sans passer par Gemini (APIs actions rarement CORS ou sans clé), ou cacher une clé API côté serveur.
- La synchro de l'historique et des réponses aux questions entre appareils (sinon tout reste en local).
- Un envoi par mail (non demandé : l'original n'était pas envoyé par mail).

## 4. Limites
- Le prompt exact de la tâche `apprentissage-quotidien-corentin` n'est pas lisible : ce n'est pas une tâche cloud, et aucun mail de résultat n'a été trouvé. La spec ci-dessus s'appuie sur ses traces Notion et sur la note "Newsletter parfaite".
- Si Corentin peut ouvrir Cowork desktop > Tâches planifiées, on pourra y lire le prompt d'origine pour confirmer.
- Rien n'a été modifié ni envoyé.