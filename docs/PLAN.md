# Plan EVER (audit du 23/11/2026)

> **Décisions de Corentin du 23/11, qui remplacent la phase 2 ci-dessous partout où elles la contredisent :**
> - Barre du bas en icônes seules, sans libellés, en verre, sans couleur sur l'onglet actif.
> - On garde les boutons actuels.
> - « Moi » ne contient que Santé et Alimentation, et son nom est à repenser.
> - Paliers et Profils vont dans un espace de type Réglages.
> - « Tous les modules » est supprimé s'il fait doublon.
> - La structure finale sortira de la phase de conception, avec une maquette à valider avant de coder.


Chaque phase peut être livrée seule. Dans chaque phase, les éléments sont classés du plus rentable au moins rentable (Pareto).

## Règles pour toutes les phases

- **À chaque livraison :**
  - incrémenter `VERSION` dans `sw.js` ;
  - ajouter les nouveaux fichiers JS à `CORE` (`sw.js:18-32`) et à `index.html` ;
  - mettre à jour `README.md`.
- **Tests :** serveur statique `python3 -m http.server 8xxx`, puis Playwright en chromium 390x844. Les données sont injectées dans `localStorage` (`ever.v1.*`), et `Cloud.ready` / `putSettings` sont simulés quand c'est utile. Le réseau vers Supabase et Gemini est bloqué ici : les tests IA passent par un `AI.json` simulé.
- **Placement du CSS :** le nouveau CSS va dans `components.css`, jamais dans `finition.css`, et sans `!important`.

---

## PHASE 1 — Bugs confirmés (livrable 1, avant toute refonte)

### 1A. Données et sécurité (le plus urgent, petit volume de code)

1. **Boucle de synchronisation infinie**
   - Fichiers : `js/core/store.js:133`, `:42`, `:118-122`.
   - Correctif : écrire `_lastSync` avec `write()` sans `markDirty`, et ignorer les clés qui commencent par `_` dans `markDirty` et `exportSettings`. Arrêter aussi de synchroniser `lastTab` (`app.js:186`).
   - Risque : faible.
   - Test : Playwright avec `Cloud.ready=true` et `putSettings` compté. Après un `Store.set`, on attend exactement 1 appel en 8 s (5 aujourd'hui).

2. **Secrets et caches envoyés sur Supabase**
   - Fichiers : `store.js:175` (`exportSettings`), `pull()` `store.js:146-151`.
   - Correctif : une liste `LOCAL_ONLY`, jamais poussée et ignorée au pull : `geminiKey`, `geminiProxyUrl`, `tmdbKey`, `googleClientId`, `aiCache`, `aiJournal`, `aiModels`, `imgQuota`, `googleDayCache`, `lastTab`, `portraitPhoto`, `bq.*`, `img.*`, `dernier.*`. L'export manuel « Tout exporter » reste complet.
   - Risque : faible. Un appareil déjà synchronisé garde des clés obsolètes sur le serveur ; on les nettoie au premier push en envoyant un objet filtré.
   - Test : après `Store.set('geminiKey','X')`, le contenu passé à `putSettings` ne contient pas `geminiKey`.

3. **Activités et aliments de départ doublés sur un 2e appareil ou après « Tout effacer »**
   - Fichiers : `js/data/seed.js` et `js/app.js:72-85`.
   - Correctif :
     - ids déterministes : `'seed:'+ville+':'+slug` pour les activités, `'seed:food:'+slug` pour les aliments ;
     - migration unique qui dédoublonne : `source:'seed'` + même nom → garder le plus récent et marquer les autres `_del`.
   - Risque : moyen, car on touche aux données. La migration est protégée par un drapeau `seedSchema=2`.
   - Test : deux contextes Playwright, `Store.pull()` simulé avec le jeu de l'autre. On attend 62 activités et 70 aliments, pas 124 et 140.

4. **Proxy IA ouvert à tous** (préalable à la newsletter, qui multipliera les appels)
   - Fichiers : `sql/edge/ever-ai.ts:108`, `:138` ; `js/core/ai.js:285-288`.
   - Correctif :
     - refuser les requêtes sans en-tête Origin ;
     - accepter seulement une liste blanche de modèles ;
     - envoyer le JWT de session quand il existe, et passer à `verify_jwt` dès que tous les clients l'envoient.
   - Risque : moyen, l'IA peut casser. On déploie d'abord côté client (le JWT envoyé), puis côté serveur.
   - Test : `curl` sans Origin → 403. Dans l'app, `AI.selfTest` reste OK.

5. **La clé personnelle refusée bloque toute l'IA**
   - Fichier : `ai.js:380` (et `:150`, `:213`).
   - Correctif : avec `BAD_KEY`, si un proxy existe, passer au relais `ai.js:393`.
   - Test : `fetch` Gemini simulé en 400 API_KEY_INVALID et proxy simulé en 200 → la réponse arrive bien.

6. **Clé Gemini dans l'URL**
   - Fichier : `ai.js:148`.
   - Correctif : passer par l'en-tête `x-goog-api-key`. Supprimer `sql/edge/gemini-proxy.ts` et ses mentions (`settings.js:309`, `config.js:14-15`).

7. **SQL : listes partagées**
   - Fichier : `sql/schema.sql`.
   - Correctifs :
     - RPC `ever.join_list(code)` en security definer (`schema.sql:211`) et appel dans `cloud.js:183` ;
     - retirer l'insert direct `ever_members_join` (`:229`), qui permet de s'attribuer le droit `edit` ;
     - ajouter les compartiments `ever-people` et `ever-illustrations` ;
     - ajouter `drop policy if exists` pour les policies `ligue_*` (`:365`) ;
     - ajouter `health_inbox`.
   - Risque : il faut le rejouer sur la base de production. C'est au propriétaire de le faire. Je ne peux pas vérifier ce qui tourne en ligne.
   - Test : rejouer le script deux fois sur une base vide (sans erreur), puis joindre une liste par code avec un 2e utilisateur.

8. **`pull()` écrase des réglages pas encore poussés**
   - Fichiers : `store.js:146`, `cloud.js:70`.
   - Correctif minimal : si `settings` est dirty, faire `push()` avant `pull()`. Garder aussi `dirty` dans localStorage (`store.js:21`) et, après `Cloud.init`, pousser les collections dont `_up > _lastSync`.
   - La fusion objet par objet côté serveur est reportée (voir « Ce qu'il ne faut pas faire »).
   - Test : modifier un réglage hors ligne, recharger, se connecter → la valeur locale survit.

9. **Double pull/push au démarrage**
   - Fichiers : `cloud.js:67` et `settings.js:556-557`.
   - Correctif : ne réagir qu'à `SIGNED_IN`. Ajouter aussi `Store.on('pulled', () => { applyTheme(); route(); })` dans `app.js` (`store.js:155`).

### 1B. Coque (prérequis de la phase 2)

1. **Barre du haut non collante**
   - Fichier : `css/components.css:2667`.
   - Correctif : `overflow-x: clip` sur html et body.
   - Test : `#/bar`, `scrollTo(0,900)` → `#topbar.getBoundingClientRect().top === 0`.

2. **Bouton retour du téléphone : il ferme la pop-up ET change de page**
   - Fichier : `js/core/ui.js:56-91`, `:656`.
   - Correctif : `pushState({sheet:1})` à la première feuille ouverte, garde dans `route()`, `history.back()` à la fermeture depuis l'interface.
   - Corriger aussi la pile `onClose` (`ui.js:85`, `:126-152`).
   - Ajouter `openSheet({remplacer:true})` pour les feuilles d'attente IA (`settings.js:400`, `gifts.js:249/260`).
   - Risque : moyen, car toutes les feuilles sont concernées.
   - Test : hub ou feuille ouverte, `goBack()` → la feuille se ferme et l'URL ne change pas. Le diagnostic IA puis la flèche Retour ne doivent plus afficher de sablier.

3. **`unmount()` pour les modules**
   - Fichiers : `app.js:178-219`, `gestes.js:255-260` et `:401`, `food.js:394-399`, `sport.js:677`.
   - Correctif : `route()` appelle `registry[prev].unmount?.()`. Food et Sport y détachent les gestes et les flèches clavier.
   - Test : ArrowLeft x3 sur Réglages → le journal reste sur aujourd'hui.

4. **Thème Système en mode sombre** (texte blanc sur blanc)
   - Fichiers : `app.js:62-68`, `css/finition.css:742` (et 615, 642, 689).
   - Correctif : en mode auto, `applyTheme` pose `data-theme` selon `matchMedia` et écoute son changement. Remplacer `:not([data-theme=dark])` par `[data-theme=light]`.
   - Test : colorScheme dark, theme auto → `.monbar` a un fond sombre.

5. **Petites corrections de la coque**
   - Raccourcis du manifeste (`manifest.webmanifest:21`) et alias `hub` dans `parse` (`app.js:172`). `Food.mount` doit gérer `rest[0]==='scan'` (`food.js:81`).
   - `stats.js:361-362` : `#/m/foods` → `#/food`.
   - `sw.js:76` : index.html en secours seulement pour `req.mode==='navigate'`, ajout de zxing dans CORE, cache média au nom fixe `ever-media-v1` (`sw.js:16`, `:45`).
   - `base.css:39` : `::selection`.
   - `#topbar` → `.topbar` (`components.css:1706`).
   - Sons : choisir un seul défaut. Je propose `false`, dans `feedback.js:38` et dans `settings.js:148-158` et `:506`, pour que le texte « coupés par défaut » devienne vrai.

### 1C. Bugs fonctionnels par module (du plus visible au moins visible)

**Tenues** (`js/modules/outfits.js`)
- La météo arrive après le calcul (`l.23-34`) : `await Ctx.snapshot()` avec un délai max de 3 s avant `composerLeJour`, et une empreinte météo stockée dans `tenuesJour`.
- Pluie et neige (`l.1326`) : `['pluie','orage','neige'].includes(kind) || rainProb>=60`.
- Sablier infini du mode Inventer (`l.94`, `296`, `330`) : afficher un état d'erreur avec un bouton Réessayer.
- Carrousel vide (`l.88`, `262`).
- Doublons Garder/Générer/Composer (`l.369`, `1390`, `1418`).
- Suppression d'un vêtement (`l.1012-1014`) : nettoyer les tenues qui l'utilisent.
- Photos des tenues non synchronisées (`l.679-688`, `app.js:264`).
- Relance d'une seule tenue qui duplique un mood (`l.323`).
- Les gros changements de Tenues sont en phase 3.
- Test : Open-Meteo simulé à 2° avec pluie, penderie avec manteau → chaque tenue a une veste.

**Santé** (`js/modules/health.js`)
- Sommeil importé gonflé (`l.1119-1120`, `1104`) : ne garder que les valeurs Asleep*, fusionner les intervalles, rattacher la nuit au jour du réveil.
- Alias de clés (`l.103`, `104`, `91`, `109`) : fat→bodyFat, lean→muscle, stand→standing, hkWater→eau, appliqués à la lecture.
- Tension, respiration et VO2 absentes de METRIQUES (`l.87`) : ajout simple ici, règles de bilan en phase 3.
- Fausse alerte « Effort 0 min » (`l.716`).
- Un champ vidé n'efface pas la mesure (`l.1226-1231`) : mettre `null`.
- Poids sans date et toucher sans effet (`l.396`, `914`).
- Unité non capturée à l'import (`l.1092`).
- Séance datée du mauvais jour (`sport.js:687`, `health.js:459`, `969`) : `nouvelleSeance(day)`.
- Test : injecter des nuits InBed et Asleep qui se chevauchent → environ 7 h, pas 15 h.

**Alimentation et Sport** (`js/modules/food.js` sauf mention)
- Analyse périmée après balayage (`l.44-63`).
- Récents de type portion absurdes (`l.799`).
- 3 aliments courants introuvables (`l.786`) : comparer avec `ALIMENTS.norm`.
- Doublons à l'import CSV (`l.1323`).
- `delt-m` jamais coloré (`sport.js:252`).
- Coquilles (`l.654`, `455`, `health.js:1024`, `979`).

**Manger** (`js/modules/codex.js` sauf mention)
- **Prioritaire :** `STOCKNAME` indexé par onglet (`codex.config.js:65` et ses usages `codex.js:651`, `719`, `841`, `965`, `970`).
- Compteur du tiroir Bar à 0 (`l.912`) : utiliser `besoins()`.
- `sk` des recettes faux et œufs non reliés (`codex.data.js:2-3`) : calculer `sk` depuis les ingrédients et étendre `tools/verif-bar.js`.
- Recherche sans accents ni tri (`l.137`) : `Vis.norm` et un score.
- Résultats au-delà de 8 inaccessibles (`l.438`).
- Créations IA sans clés d'assistant (`l.742-765`, schéma `l.573`).
- Case « Seulement avec ce que j'ai » perdue (`l.715`).
- Lien Notion vide (`l.897`).
- kcal selon la taille (`l.796`).
- steamed-milk et nitro-cold-brew sans `sk`.
- Tag « Ma création » (`l.745`).
- Test : Bar, décocher Lait entier, ouvrir le Bushwacker → « Lait entier ».

**Sortir** (`js/modules/activities.js` sauf mention)
- Lieu affiché ≠ lieu réel (`l.24`, `562` ; `context.js:17` ; `city.js:446` ; `bonsplans.js:566`) : une seule source de vérité, `Ctx.place`, dont on dérive `prefs.city`. Par défaut, Le Touquet partout.
- Établissements IA placés au centre-ville (`l.1074`) : ne pas mettre de lat/lon et laisser `MapPick.fiche` géocoder.
- Humeur fantôme (`l.386`) : la remettre à `null` à la fermeture de la roue.
- Événements jamais branchés (`l.514`, `601-616`, `245`).
- Chaque tirage logué comme une sortie (`l.667`, `713`) : séparer « tiré » et « fait » ; le bouton « On y va » arrive en phase 5.
- Café marqué « seul ça ne sert à rien » (`mood.js:75`).
- Budget sans `render()` (`l.1082`).
- Famille de l'historique (`l.1495`).
- Libellé 10 jours au lieu de 45 (`l.508`).
- Fautes de `reco.js` (`l.105`, `114`, `139`, `144`).
- Guide : doublons de « Garder » (`city.js:211`, `381`, `417`), aucune action en erreur (`l.323`), accords (`l.105`, `235`).
- Test : profil neuf → `Ctx.place().name === 'Le Touquet'`, et la pastille l'affiche aussi.

**Films, Cadeaux, Profils, Réglages**
- Films :
  - « Pas encore vu » ne se rafraîchit pas (`media.js:357-364`) ;
  - le favori est retiré à la fusion de doublons (`media.js:69`) ;
  - fermer la question compte comme « je n'ai pas aimé » (`media.js:368`) : Oui / Non / Plus tard.
- Import de listes partagées selon le type (`lists.js:125-131`).
- Cadeaux :
  - pas de suppression de personne ni de changement de photo (`gifts.js:316-377`) ;
  - pas de try/catch sur la photo (`gifts.js:306`).
- Objectifs santé : un champ vide enregistre 0 (`settings.js:474`).
- Profils : lignes de listes sans action (`profiles.js:41-44`).
- Coquilles et genre (`calendar.js:55`, `89` ; `gifts.js:103`, `118`, `139`, `206`, `218`, `367`).
- Texte « ne quitte pas ton appareil » faux (`gifts.js:65`, `301`) : le corriger.

---

## PHASE 2 — Navigation regroupée : 5 onglets, plus de menu caché, toutes les pages gardées

Dépend de la phase 1B (sticky, retour, `unmount`).

**Fichiers touchés :**
- `js/app.js` (DEST, GROUPES, renderTabbar, route, parse) ;
- `index.html` (`#sousnav` sous `#topbar`, retrait de `#btnHub`) ;
- `css/base.css:136` (libellés visibles) ;
- `components.css` (`.sousnav`, page Moi) ;
- `js/modules/moi.js` à créer ;
- `js/modules/today.js` à créer, en squelette ;
- `outfits.js` (`mount(rest)`) ;
- `sw.js` et README.

### 1. Structure des onglets

| Onglet | Contenu | Page par défaut |
|---|---|---|
| **Aujourd'hui** | `today` : squelette en phase 2, rempli en phase 3 | — |
| **Manger** | sous-onglets Recettes · Café · Bar · Délices. Recettes, Café et Bar passent par `#viewCodex` ; Délices monte `foodroulette` dans la vue générique, et la barre `#sousnav` reste au-dessus des deux vues. Libellé « Délices » maintenu ; l'id `foods` est renommé `delices` plus tard, avec un alias. | Recettes |
| **Sortir** | sous-onglets Idées (activities) · Ville (city, avec les bons plans) · Films · Cadeaux | Idées |
| **Style** | sous-onglets Aujourd'hui · Penderie · Mes tenues, à partir des modes internes de `outfits.js:46-52`, routés `#/outfits/penderie` et `#/outfits/tenues` | Aujourd'hui |
| **Moi** | page d'accueil en cartes, voir ci-dessous | — |

- **Page Moi :**
  - en tête : avatar, pseudo et état de synchronisation ;
  - puis des cartes Santé, Alimentation, Sport (ajouté à DEST), Paliers, Proches (= Profils), Réglages (ajouté à DEST) ;
  - chaque page de niveau 2 affiche un bouton retour dans la barre du haut.
- **Libellés** visibles sous les icônes. `aria-current="page"` sur l'onglet actif.
- **Mémoire de l'onglet :** un toucher ouvre `dernier.<groupe>` (écrit sans synchronisation) ou la page par défaut.

### 2. Retirer le hub

- Supprimer `#btnHub` et `openHub` (`app.js:96`, `103`, `125-156`).
- À gauche de la barre du haut : bouton retour sur les pages de niveau 2, sinon une loupe. En phase 2, la loupe réutilise la recherche par noms de pages de l'ancien hub ; la recherche globale vient en phase 5.
- La bulle d'avatar ouvre Moi.

### 3. Compatibilité

- `parse` garde `#/<id>`, `#/m/<id>` et ajoute `#/hub/<id>`.
- Tous les `App.go('#/m/…')` existants continuent de marcher, puisque DEST garde les mêmes ids.
- Corriger les raccourcis du manifeste.

### 4. Compte à un seul endroit

- Moi (en-tête) + Réglages > Compte.
- Profils devient « Proches » : listes partagées et proches, sans le doublon du compte (`profiles.js:22-36`).

**Risque :** moyen. C'est surtout du routage et du CSS, sans réécriture de module. Le point délicat est la barre sous la vue Codex.

**Tests (Playwright) :**
- chaque ancienne route mène à la bonne page, avec le bon onglet allumé et la bonne sous-navigation : les 15 routes et `#/hub/foods` ;
- aucun élément `#btnHub` ;
- les libellés sont visibles à 390 px ;
- la sous-navigation reste collée après un défilement ;
- le bouton retour d'une page de niveau 2 ramène à Moi ;
- l'onglet mémorise la dernière page.

---

## PHASE 3 — Demandes du propriétaire

### 3A. Tenues : moods multiples, saisons, tenue du jour choisie parmi MES tenues

Fichier : `js/modules/outfits.js`. Aucune migration SQL : c'est du JSON dans `user_collections`.

1. **Modèle de données**
   - Ajout de `moods[]` et `saisons[]`. `mood` est gardé égal à `moods[0]`, pour les appareils restés sur l'ancienne version.
   - Ajout de `porteLe`, `nbPorte` et `favori`.
   - Fonctions de lecture tolérantes `moodsDe(o)` et `saisonsDe(o)`.
   - Migration une seule fois, protégée par `outfitsSchema` : 2 ; les saisons sont suggérées à partir des pièces (intersection des saisons, sinon chaleur moyenne).
   - `tenuesJour` reçoit `v:2`, ce qui invalide l'ancien cache.

2. **Un seul éditeur** (fusion de `editerTenue` `l.696` et `composeOutfit` `l.1365`)
   - nom ;
   - puces de moods à choix multiple, au moins une ;
   - puces de saisons, plus « Toutes » ;
   - pièces.
   - Mise à jour sur place, sans fermer et rouvrir la feuille (`l.739`).
   - Les pièces en texte des tenues IA restent visibles (`l.699`).

3. **Listes**
   - Filtre `moodsDe(o).includes(id)` aux lignes `l.587`, `614` et `635` : une même tenue apparaît dans chacun de ses moods.
   - Filtre « De saison ».
   - Surtitre de la carte « Old money · Soirée ».

4. **Tenue du jour** (remplace `composerLeJour` `l.256-276`)
   - Exécutée APRÈS la météo.
   - Pré-score local :
     - saison : +40, ou −60 (exclue s'il reste un autre candidat) ;
     - chaleur des pièces comparée au ressenti ;
     - pluie ;
     - mood : +55 ;
     - récence : ×0,4 si portée dans les 7 derniers jours ;
     - favori : +10.
   - Puis un seul `AI.json` sur les 8 meilleurs, avec un enum strict des ids, validé contre l'ensemble connu, et repli sur le pré-score.
   - Affichage : UNE tenue héros, une rangée de puces de mood, « Une autre » (le candidat suivant), et « Pourquoi » en une ligne.
   - État vide : « Enregistre ta première tenue ». La composition depuis la penderie (`buildOutfit`) devient une action secondaire, « Proposer une combinaison ».
   - « Inventer » est renommé « Idées (IA) » et dit clairement que ce sont des pièces qu'on n'a pas.

5. **« Je la porte »**
   - `Store.log('tenue')` et `porteLe` ;
   - cela active l'anti-répétition déjà branchée (`l.1341`, à calculer une seule fois) et la famille « Tenues » de `stats.js:453`.

- Risque : moyen, car c'est le cœur du module. Les lectures tolérantes protègent la compatibilité.
- Tests :
  - 3 tenues injectées (hiver, été, toutes saisons) et une date en novembre à 2° → la tenue d'été n'est jamais choisie ;
  - l'IA simulée renvoie un id inconnu → repli ;
  - une tenue avec moods [oldmoney, soiree] apparaît dans les 2 cartes ;
  - un ancien objet `{mood:'chill'}` est migré.

### 3B. Santé et nutrition : un bilan simple d'abord, la détection mise en avant

Fichiers : `health.js` (render `l.310-321`, bilanChiffre `l.662-804`, prompt `l.1278-1292`, insight `l.825-860`), `food.js` (`l.33-38`, `362-373`) et `js/engines/bilan.js` à créer (fonction pure, testable avec node).

1. **`Bilan.calculer({healthDays, meals, mood, goals})`**
   - Renvoie `{niveau, titre, lignes[], ok[], nJours}`.
   - Règles a à j de l'audit :
     - tension ≥ 140/90 → alerte ;
     - FC repos > 100 ou < 40 ;
     - trio FC/VFC/respiration ;
     - SpO2 < 92 ;
     - perte de poids > 5 % en 30 j ;
     - sommeil < 6 h ;
     - effort seulement si les données existent ;
     - nutrition sur 7 j : protéines par kg, sodium, fibres, sucres, kcal < 60 % ;
     - alcool > 10 ;
     - humeur ou stress ;
     - lien social seulement s'il y a eu une saisie dans les 7 derniers jours (corrige `mood.js:158`).
   - Toute règle qui manque de données est masquée.

2. **Page Santé réordonnée**
   - Ordre : barre de jour → CARTE BILAN → 4 tuiles avec leur date de fraîcheur → ligne « Mon sport › » → Saisir.
   - Puis des replis « Tendances » et « Explique-moi (IA) ».
   - Feu tricolore, 3 lignes maximum, « N autres points vont bien », et le pied de carte « pas un avis médical ».
   - Supprimer l'anneau de forme 0-100 et le badge /10 de l'IA.
   - Ce qui part ailleurs :
     - tasses → Paliers ;
     - carte du corps et entraînements → Sport ;
     - Mes données → Réglages > Données ;
     - bloc de connexion visible seulement s'il n'y a pas de connexion ou pas de synchro depuis plus de 48 h.
   - `onboarding()` (`l.488`) affiché si la page est vide.
   - Supprimer le bouton Séance en double (`l.426`/`476`).

3. **IA réduite**
   - Schéma `{verdict, actions[3]}`, le reste replié.
   - Tension, respiration et VO2 ajoutées au prompt.

4. **Alimentation**
   - Mini-bilan nutrition du jour et de la semaine en haut, à partir de la même fonction.
   - Macros sur une ligne repliable, sucres et sodium dans le détail.
   - Analyse IA = verdict + 2 remplacements.

- Risque : faible à moyen, surtout un réordonnancement. Les seuils médicaux sont formulés « à surveiller ».
- Tests :
  - tests node de `bilan.js` sur des cas types : tension 150/95 → alerte ; seulement des pas → pas de ligne d'effort ; pas d'humeur saisie → pas de ligne sociale ;
  - Playwright : la carte bilan est le 2e bloc et la page fait moins de 1,5 écran sans replis ouverts.

### 3C. Newsletter dans l'app : « Ton brief du jour » sur Aujourd'hui

Fichiers : `js/modules/today.js`, `js/engines/brief.js` à créer, `settings.js` (sections activables), `ai.js` (on réutilise `jsonCherche` avec `google_search`, `ai.js:510-546`).

Prérequis : phase 1A-4, la sécurité du proxy, car le brief appelle l'IA chaque jour.

1. **Page Aujourd'hui**, dans cet ordre :
   - météo + tenue héros (3A) ;
   - carte bilan santé (3B, une ligne si tout va bien : « RAS ») ;
   - calories et eau restantes ;
   - brief du jour.

2. **Sections du brief** (activables et réordonnables dans Réglages > Brief) :
   1. Fait prouvé du jour : étude, chiffre, application.
   2. Leçon du jour, avec rotation sur 5 domaines (YouTube, Musculation, IA & Claude, AMF, Patrimoine) : insight, erreur commune, action, question ; la réponse est saisie dans l'app et sert à ajuster le niveau.
   3. Marchés : BTC, ETH et SOL via CoinGecko côté client (sans clé) ; CAC 40 et S&P 500 via Gemini avec grounding, marqués « non vérifié » sans source.
   4. Monde : 3 puces.
   5. Ce soir et 5 idées atypiques de 30 à 60 min, avec la ville tirée de `Ctx.place` plutôt que Paris en dur. On réutilise BonsPlans s'il est en cache.

3. **Règles éditoriales**
   - 3 puces maximum par section, section supprimée si elle est vide.
   - JSON strict `{date, sections:[{id,titre,items:[{titre,texte,source?}]}]}`.
   - Sources affichées.

4. **Cache et coût**
   - Généré à la première ouverture après 6 h, clé `brief.<date>` en local (`LOCAL_ONLY`, non synchronisé).
   - Un seul appel groupé par jour, plus un bouton « Régénérer ».

5. **Anti-répétition**
   - `briefHistory` (synchronisé) : les 60 derniers titres sont envoyés au prompt.
   - Import facultatif des quelque 40 études du registre Notion, en JSON collé à la main.

6. **Partage** : une vue « affiche » imprimable (`window.print` et CSS print), à la place du PDF.

- Risque : moyen, à cause du coût IA et de la qualité des données de marché.
- Tests :
  - `AI.jsonCherche` simulé → rendu de toutes les sections, section vide masquée, cache utilisé au 2e chargement (0 appel), titres de l'historique présents dans le prompt ;
  - hors ligne → la carte affiche « Brief indisponible · Réessayer » sans bloquer le reste de la page.

---

## PHASE 4 — Finition du design (après la stabilisation de la structure)

1. **CSS**
   - Fusionner `aurora.css` dans `tokens.css` comme thème sombre unique.
   - Rapatrier les blocs propres aux modules de `finition.css` vers `components.css`.
   - Objectif : 0 `!important` et un seul endroit par composant (`.tabbar`, `.sheet`, `.ov`, `.porte`).
   - Supprimer le CSS mort : `.hubgrid`, `.hubtile`, `.brandmark`, `footer#foot`, `.tbtn .dot`, et les icônes non utilisées à la racine.
   - Risque : élevé de régression visuelle. Test : captures Playwright avant/après sur les 15 routes × 3 thèmes, à comparer.

2. **Accessibilité et confort tactile**
   - Cibles d'au moins 44 px (`components.css:289`, `505`, `616`, `2286`, `2955` ; `finition.css:408`).
   - Contraste de `--muted` et `--faint` en clair (`tokens.css:27-28`).
   - Icônes blanches sur cyan (`components.css:150`).
   - Variantes claires des pastilles en verre (`finition.css:260`, `303`, `408`, `441`, `547`, `765`).
   - Retirer `user-scalable=no` (`index.html:5`).
   - `role=dialog` et gestion du focus dans `openSheet`.
   - Cartes du Codex en `<button>` (`codex.js:149`, `157`, `164`, `280`).

3. **Simplification des écrans**
   - **Activités :** un bouton principal « Trouve-moi une idée », les humeurs en rangée, Roue / 3 idées / Surprise comme modes dans la pop-up, un vrai bouton à la place du « glisser », le budget compact (`seg` et non `seg full`, `activities.js:282`), des puces de filtres actifs retirables, et la roue dentée déplacée.
   - **Codex :** la barre devient recherche + « Ma cuisine » avec libellé ; `#codexCreate` et `#codexAll` sont retirés ; les tailles passent dans la fiche ; le tiroir est épuré, avec l'export et l'effacement déplacés dans Réglages.
   - **Films :** la liste d'abord, puis TOURNER en bouton.
   - **Tenues :** la fiche vêtement a un repli « Détails » ; le bandeau de synchro des photos n'apparaît que s'il y a une action à faire.
   - **Résultat de la roue :** condensé (titre, méta, Pourquoi, 2 actions).

4. **Réglages en 4 blocs + Avancé replié**
   - Blocs : Moi, Objectifs, Apparence, Données.
   - Avancé : clé Gemini, TMDB, Google Agenda, diagnostic, cache, icônes 3D, MyFitnessPal.
   - Supprimer « Images générées » (`imagerie.js:35`).
   - Afficher « IA active (serveur EVER) ».
   - Fusionner l'avatar et « Ma photo ».

5. **Démarrage cohérent**
   - Manifeste et status bar sombres (`manifest.webmanifest:11-12`, `index.html:16`).
   - Version affichée = `VERSION` du service worker (`config.js:48`).

6. **Nettoyage du code mort**
   - `banques.js` (`index.html:100`) et les fonctions de génération de `stock.js`/`imagerie.js` ;
   - code mort d'`outfits.js` (`l.417`, `172`, `1462-1483`) ;
   - code mort d'`health.js` (`blocSaisie`, `todayBlock`, `stat`) ;
   - `city.js:253` (`section()`) ;
   - `food.js:813` (`recentSuggestions`) ;
   - `stats.js:433`, `489`.

---

## PHASE 5 — Nouvelles fonctionnalités

### Retenues (par ordre de valeur / effort)

| # | Fonctionnalité | Effort | Fichiers |
|---|---|---|---|
| 1 | « On y va » + journal des sorties réelles. Dépendance du bug 1C Sortir, rend l'historique et les humeurs justes. | S | `activities.js`, `mood.js` |
| 2 | Annuler une suppression (toast 5 s, s'appuie sur `_del`) | S | `ui.js`, `food.js:401`, `sport.js:679` |
| 3 | Indicateur de synchronisation dans l'en-tête de Moi | S | `cloud.js`, `moi.js` |
| 4 | Recherche globale (remplace la loupe de phase 2) : Codex, activités, films, tenues, aliments, sans accents, triée par score | M | `js/core/recherche.js` |
| 5 | Anniversaires récurrents → carte J-14 sur Aujourd'hui avec 3 idées | M | `gifts.js`, `today.js` |
| 6 | Mes plateformes de streaming (filtre de la roulette Films ; les données existent déjà, `media.js:564`) | S | `media.js` |
| 7 | Liste de courses cochable (« Ajouter ce qui manque » depuis une fiche) | M | `codex.js`, `lists.js` |
| 8 | Mode cuisine pas-à-pas (Wake Lock, minuteurs) | M | `codex.js` |
| 9 | Premier lancement guidé en 3 écrans (ville, objectifs, thème, présentation des 5 onglets) | S | `today.js` |
| 10 | Bilan hebdo du dimanche (même moteur que `bilan.js` + `Food.summary(7)`) | S | `today.js`, `bilan.js` |
| 11 | Historique « déjà offert » pour les cadeaux | S | `gifts.js` |
| 12 | Favoris transversaux, en section dans Moi | S | `moi.js` |
| 13 | Suivi des nouvelles saisons → carte sur Aujourd'hui | M | `media.js` |

### Rejetées, avec la raison

- **Barre du bas personnalisable :** cela contredit l'objectif de simplicité. La mémoire de la dernière page par groupe suffit.
- **Mode simple / mode complet :** c'est remplacé par Avancé replié dans Réglages et par les replis Santé. Un interrupteur global doublerait les états à tester.
- **Notification push du brief à heure fixe** (VAPID + cron) : il faut un serveur, et la génération à l'ouverture couvre le besoin. À revoir plus tard.
- **Ajouter une bouteille par code-barres :** faible valeur, puisque 80 cases à cocher suffisent.
- **Mode « Je suis en voyage » :** faible valeur ; la sélection de ville unifiée suffit.
- **Planificateur de tenues sur la semaine et valise de voyage :** à garder en réserve après 3A. Seulement 3 jours de prévisions sont disponibles, et il faut d'abord assez de tenues enregistrées.
- **Plan de soirée en 2 étapes, carte de mes lieux, watchlist partagée à deux :** valeur moyenne pour un effort M ; à revoir après la phase 5.
- **Corrélation alcool / sommeil, objectifs nutritionnels automatiques :** à revoir quand le bilan aura assez de données.
- **Importer des recettes par URL ou photo :** valeur moyenne, coût IA. Pas prioritaire.

---

## Ce qu'il ne faut PAS faire

- **Ne pas réécrire la synchronisation en « une ligne par objet » maintenant.** C'est un gros chantier SQL et client. Les correctifs de la phase 1A (boucle, secrets, dirty persisté, push avant pull) suppriment l'essentiel des dégâts.
- **Ne pas fusionner les modules en un seul fichier ni réécrire les modules pour la navigation.** Le regroupement se fait dans DEST, GROUPES et la sous-navigation ; les modules restent montés par id.
- **Ne pas casser les anciennes routes** (`#/m/<id>`, ids `food`/`foods`). Renommer seulement avec un alias.
- **Ne pas supprimer `outfit.mood`** tant que des appareils anciens peuvent lire la donnée : garder `mood = moods[0]`.
- **Ne pas appeler Gemini directement avec une clé dans le navigateur pour le brief,** et ne pas lancer le brief avant d'avoir sécurisé le proxy : c'est un risque pour le quota.
- **Ne pas afficher de diagnostic médical :** seulement « à surveiller / à montrer à un médecin », avec des seuils grand public et la mention « pas un avis médical ».
- **Ne pas inventer de chiffres de marché :** pas de source → « non vérifié ».
- **Ne pas commencer la phase 4 (CSS) avant la phase 2 :** le DOM de la navigation va changer, et le travail serait fait deux fois.
- **Ne pas mettre de nouveau CSS dans `finition.css` ni ajouter de `!important`.**
- **Ne pas laisser l'IA recomposer la tenue du jour à partir des pièces quand des tenues sont enregistrées :** c'est la plainte n°1 du propriétaire.

## Questions à trancher avec le propriétaire (non bloquantes)

1. Style en onglet séparé (proposé par défaut) ou fusionné dans Moi ?
2. Cadeaux dans Sortir (proposé par défaut) ou dans Moi > Proches ?
3. Tenue du jour : une tenue héros avec des puces de mood (recommandé), ou une par mood comme aujourd'hui ?
4. « Me voir avec » / portrait (`outfits.js:1431`, `settings.js:222-226`) : à supprimer ou à garder ?
5. Le prompt d'origine de la tâche `apprentissage-quotidien-corentin` : à lire dans Cowork desktop > Tâches planifiées pour caler les sections Leçon et Fait prouvé.
6. Le SQL de la phase 1A-7 doit être rejoué sur la base de production par le propriétaire.