# EVER

**En ligne : [corentin-bocquet.github.io/Starbucks](https://corentin-bocquet.github.io/Starbucks/)**

Une seule application pour décider : quoi boire, quoi manger, quoi faire,
quoi regarder, quoi offrir, quoi porter, et où en est ta forme.

PWA installable sur l'écran d'accueil iPhone, sous le nom **EVER**.
Base de données et comptes déjà branchés. L'IA se débloque avec une clé.

---

## Démarrer en deux minutes

| # | Étape | Détail |
|---|---|---|
| 1 | **Ouvrir le site sur iPhone** | Safari → Partager → *Sur l'écran d'accueil* → **EVER** |
| 2 | **Coller la clé Gemini** | Hub (bouton grille) → Réglages → *Clé Gemini*. À créer sur [aistudio.google.com](https://aistudio.google.com/apikey) |
| 3 | **Créer son compte** | Réglages → *Créer un compte*. Facultatif : tout marche sans, mais rien ne se synchronise ni ne se partage |

C'est tout. Rien d'autre à configurer.

**La clé Gemini n'est pas dans le dépôt, et c'est délibéré.** Une clé Google
en clair dans un dépôt public est lisible par tout le monde et le quota se
vide en quelques heures. Ici elle reste sur ton téléphone. Pour une vraie
mise en production, déploie `sql/edge/gemini-proxy.ts` : la clé passe alors
côté serveur et l'app n'appelle plus Google directement.

---

## Ce qu'il y a dedans

**Cinq onglets en bas** — ce qu'on ouvre tous les jours.

| Onglet | Contenu |
|---|---|
| **Café** | 103 boissons Starbucks décomposées en millilitres, ordre d'assemblage, réglages De'Longhi Eletta Explore |
| **Bar** | 21 cocktails aux dosages IBA, bar à cocher, liste de courses automatique |
| **Recettes** | 22 recettes de famille, photos et quantités d'origine |
| **Alimentation** | Journal, macros, scan de repas par photo, analyse du jour, passerelle MyFitnessPal |
| **Santé** | Import Apple Santé, tableau de bord, tendances, lecture de la forme |

**Huit modules dans le hub** — le bouton en grille, en haut à gauche.

| Module | Question |
|---|---|
| Activités | Qu'est-ce qu'on fait ? |
| Aliments | Qu'est-ce qu'on mange ? |
| Cadeaux | Qu'est-ce que je lui offre ? |
| Cinéma & séries | Qu'est-ce qu'on regarde ? |
| Guide de ville | Que faut-il savoir et découvrir ici ? |
| Tenues | Comment je m'habille aujourd'hui ? |
| Profils | Avec qui je partage quoi ? |
| Progression | Où j'en suis ? |

**Trois façons de décider**, dans Activités comme dans Aliments :

- **TOURNER** — le hasard pondéré par le contexte
- **SURPRENDS-MOI** — l'app règle tout elle-même et lance
- **3 IDÉES** — trois propositions, et la roue tranche si on hésite

---

## Ce qui est déjà branché

| Service | État | Détail |
|---|---|---|
| **Supabase** | ✅ opérationnel | Projet `qjxeimsinxqvlodsusww`, schéma `ever`, RLS partout, compartiments de stockage créés, inscription et synchronisation testées de bout en bout |
| **Open-Meteo** | ✅ | Météo et géocodage, sans clé, sans compte |
| **Open Food Facts** | ✅ | 900 000 produits, code-barres compris, sans clé |
| **OpenStreetMap** | ✅ | Carte intégrée pour choisir un lieu au doigt |
| **Gemini** | ⚙️ clé à coller | Scan de repas, analyses, guides, événements, cadeaux, tenues. **Le modèle n'est pas écrit en dur** : l'app interroge Google, classe ce qui existe, et bascule toute seule si un modèle est retiré ou saturé |
| **TMDB** | ⚙️ facultatif | Affiches de films, clé gratuite |
| **Google Calendar** | ⚠️ voir plus bas | Les événements passent par `.ics`, qui marche partout |
| **MyFitnessPal** | ⛔ impossible | Voir plus bas |
| **Apple Santé** | ⛔ pas d'API web | Voir plus bas |

### Pourquoi le schéma `ever` et pas un projet dédié

Le plan gratuit Supabase plafonne à **deux projets actifs**, et les deux
places étaient prises (`learno` et `WALLET`). Plutôt que de mettre un de tes
projets en pause sans te demander, EVER vit dans son propre **schéma
Postgres** à l'intérieur du projet WALLET.

Ce n'est pas un bricolage : un schéma est une frontière réelle. Aucune table
partagée, aucune collision de noms possible — WALLET a lui aussi des tables
`profiles` et `user_settings` —, des policies RLS indépendantes, et le client
configuré avec `db: { schema: 'ever' }` ne voit rien d'autre. Seul
`auth.users` est commun, ce qui est plutôt confortable : un seul compte pour
les deux applications.

Si tu veux un projet dédié : mets `learno` en pause, crée le projet, colle
`sql/schema.sql` en remplaçant `ever.` par `public.`, et change trois lignes
dans `js/config.js`. Dix minutes.

---

## Les trois murs, et ce qu'il y a à la place

Ce sont des limites de plateforme, pas des raccourcis.

### MyFitnessPal

L'API publique est **fermée depuis 2020**. L'accès est réservé aux
partenaires sous contrat commercial. Aucune bibliothèque ne contourne cela
sans stocker ton mot de passe MyFitnessPal, ce qu'on ne fera pas.

**À la place** : import du CSV exporté depuis MFP, export d'un CSV
réimportable, et une couche `Food.Bridge` dont l'interface est déjà celle
d'une vraie API — le jour où l'accès existe, on ajoute un adaptateur sans
toucher au reste.

### Apple Santé

HealthKit est une **API native iOS**. Aucune page web, aucune PWA, aucun
connecteur ne peut y accéder. Ce n'est pas une limite de l'app, c'est une
limite d'iOS.

**À la place** : un importeur complet de l'export Apple Santé
(`export.zip` ou `export.xml`), lu **par tranches de 4 Mo dans le
navigateur** — un export fait souvent 300 Mo. Il couvre 22 types HealthKit
et les entraînements, déduplique les mesures iPhone/Watch, agrège par jour.
Santé → photo de profil → *Exporter toutes les données*.

### Google Calendar

Créer un identifiant OAuth Google demande de passer par la console Google
Cloud : créer un projet, configurer l'écran de consentement, déclarer le
domaine autorisé. **Il n'existe aucune API pour faire ça à ta place** — c'est
précisément le but d'un écran de consentement.

**À la place** : chaque événement génère un fichier `.ics`. Sur iPhone il
s'ouvre directement dans Calendrier, et si ton calendrier par défaut est un
compte Google, l'événement atterrit dans Google Calendar. Zéro configuration,
zéro autorisation à accorder.

Si tu veux quand même l'API : console Google Cloud → *Identifiants* →
*ID client OAuth* → type « Application Web » → origine autorisée
`https://corentin-bocquet.github.io` → colle l'identifiant dans Réglages.
Le code est déjà là et l'utilisera automatiquement.

**Et le calendrier intelligent fonctionne sans tout ça** : l'app connaît son
propre agenda, prévient avant de poser deux choses au même moment, propose
un créneau libre, calcule le temps restant dans la journée et écarte de la
roue ce qui n'y rentre pas.

---

## L'audit des 138 points

| Section | Points | État |
|---|---|---|
| 0 – 5 · Règles, inspection, DA, icônes, icône d'app | 1-5 | ✅ |
| 6 · Hub des fonctionnalités | 6 | ✅ bouton grille en haut à gauche |
| 7 · Architecture par moteurs | 7 | ✅ Roulette, Reco, AI, Ctx, Lists, Cal, Nutrition, Events |
| 8 – 15 · Activités, roulette, types, établissements, pondération, score, distance | 8-15 | ✅ |
| 16 – 18 · Localisation, carte, Maps/Plans | 16-18 | ✅ carte Leaflet + OpenStreetMap intégrée |
| 19 – 21 · Météo, date et heure, saison | 19-21 | ✅ |
| 22 · Événements | 22 | ✅ recherche Gemini, dates vérifiées, rien de périmé, source affichée |
| 23 – 27 · Budget, favoris, historique, apprentissage, activités perso | 23-27 | ✅ 👍👎 partout |
| 28 – 29 · Le Touquet, Méribel | 28-29 | ✅ listes exactes, adaptation saisonnière |
| 30 – 38 · Aliments, listes, catégories, partage, groupes | 30-38 | ✅ listes reprises telles quelles |
| 39 – 45 · Cadeaux, roue, partage, IA, indices privés, lieux d'achat | 39-45 | ✅ |
| 46 – 48 · Cadeaux + calendrier, Google Calendar, planification | 46-48 | ✅ / ⚠️ OAuth à créer par toi / ✅ |
| 49 – 58 · Cinéma et séries | 49-58 | ✅ |
| 59 – 74 · Guide de ville | 59-74 | ✅ contexte solo/couple/amis/famille, roue depuis le guide, sources et date |
| 75 – 83 · Nutrition, MyFitnessPal | 75-83 | ⛔ API fermée · pont par fichiers |
| 84 – 88 · Calendrier partout | 84-88 | ✅ |
| 89 – 90 · Recommandation unifiée, « Pourquoi ? » | 89-90 | ✅ |
| 91 – 92 · Surprends-moi, 3 idées | 91-92 | ✅ |
| 93 – 99 · Design, principe Apple, performance, erreurs, hors ligne, ajout rapide | 93-99 | ✅ |
| 100 – 103 · Historique, favoris, personnalisation, généricité | 100-103 | ✅ |
| 104 – 108 · Supabase, RLS, partage, profils | 104-108 | ✅ déployé et testé |
| 109 – 110 · Intégrations externes | 109-110 | ✅ celles qui existent réellement |
| 111 – 115 · UX des résultats, mobile, responsive, animations, accessibilité | 111-115 | ✅ |
| 116 – 123 · Tests | 116-123 | ✅ tests navigateur automatisés, zéro erreur console |
| 124 – 138 · Phases et philosophie | 124-138 | ✅ |

Trois points restent partiellement bloqués, toujours les mêmes : 47 (OAuth
Google), 75-83 (MyFitnessPal), et la connexion directe à Apple Santé. Les
trois sont des murs de plateforme, pas des raccourcis.

---

## Ce qui a été corrigé

**Le texte des héros par-dessus les images.** Le bug le plus visible, sur les
trois onglets et sur tout iPhone. La cause : le bloc de texte était ancré
**en bas** de la carte, en superposition, alors que les photos sont des plans
produits en 16:9 dont le sujet occupe la moitié basse. Sur un écran étroit,
la carte devient presque carrée, le texte s'étire et retombe pile sur les
tasses, les verres et les plats.

La correction ne déplace pas le texte, elle **sépare les deux zones** : le
texte a sa propre bande, au-dessus, sur la couleur profonde de l'onglet, et
l'image occupe la bande du dessous avec un dégradé qui fond son haut dans
cette couleur. Aucune superposition n'est plus possible, quelle que soit la
longueur du titre ou la largeur de l'écran. Sur écran large, les deux zones
passent côte à côte.

**Au passage** : barre de recherche écrasée par le sélecteur de taille sur
iPhone, écrans qui attendaient la météo avant de s'afficher, emoji
d'interface remplacés par un jeu d'icônes cohérent, zones tactiles à 44 px,
safe areas et Dynamic Island partout, contractions françaises correctes
(« au Touquet », pas « à Le Touquet »).

---

## Ce qui vient de WALLET

Le projet WALLET a servi de référence, comme demandé :

- **Retour sonore et haptique** — même principe : les sons sont décodés une
  fois puis rejoués via WebAudio, parce qu'un `<audio>` par clic sature et
  retarde sur iOS. Contexte créé au premier geste, comme l'exige Safari.
  Onze sons repris, convertis en MP3 (116 Ko au lieu de 644 Ko). Coupés par
  défaut, activables dans Réglages.
- **La densité et le calme** — beaucoup d'air vertical, peu d'éléments par
  écran, rayons généreux, boutons complètement arrondis, chiffres gros et
  serrés, libellés gris moyen.
- **La séparation tokens / base / composants**, et le découpage
  `lib` + `components` + `engine` + `data`, qu'EVER suit à l'identique.
- **« Je regarde → je comprends. Je clique → j'apprends. »** — c'est
  exactement ce que fait le bouton *Pourquoi ?* sur chaque résultat.

Ce qui n'a **pas** été repris : le fond noir absolu et l'accent lime. EVER
garde la direction artistique du Codex — vert pour le café, prune pour le
bar, terre cuite pour les recettes — parce qu'elle est bonne et qu'elle
porte l'identité du projet.

---

## Architecture

Pas de build, pas de framework, pas de dépendance obligatoire. Du JavaScript
qui tourne tel quel.

```
index.html              coque : barre haute, cinq vues, barre d'onglets
manifest.webmanifest    PWA, nom EVER, icônes
sw.js                   service worker (réseau d'abord, médias en cache)
css/
  tokens.css            couleurs, espaces, rayons, ombres, clair et sombre
  base.css              remise à zéro, gabarit, chrome
  components.css        cartes, feuilles, roulette, anneaux, listes
sounds/                 onze retours sonores, coupés par défaut
js/
  config.js             valeurs publiques uniquement
  core/
    icons.js            bibliothèque d'icônes, aucune dépendance
    feedback.js         son et vibration
    ui.js               feuilles modales, toasts, formatage
    store.js            stockage local d'abord, synchronisation ensuite
    photos.js           images en IndexedDB
    ai.js               Gemini : texte, JSON structuré, vision, cache
    cloud.js            Supabase : comptes, sync, listes partagées
    calendar.js         .ics, Google Calendar, calendrier intelligent
    map.js              choix d'un lieu sur carte
  engines/
    roulette.js         tirage pondéré et animation
    reco.js             scoring : note, distance, météo, saison, horaire
    context.js          lieu, météo, saison, moment
    events.js           événements du moment, jamais périmés
  data/
    codex.data.js       les 146 recettes, extraites telles quelles
    codex.config.js     assistant en trois étapes, palettes, héros
    seed.js             activités, aliments, moods, paliers
  modules/              un fichier par module
sql/
  schema.sql            ce qui tourne réellement sur Supabase
  edge/gemini-proxy.ts  fonction edge pour cacher la clé Gemini
```

### Pourquoi le modèle Gemini n'est écrit nulle part

La première version nommait `gemini-2.0-flash` dans le code. Google l'a
retiré, et toute l'IA de l'app est tombée d'un coup, avec pour seul indice
un « impossible de récupérer les suggestions ». Le nom d'un modèle est une
donnée périssable : le figer dans du code, c'est programmer une panne.

`js/core/ai.js` demande donc à Google la liste de ce qui existe, la classe
selon des intentions plutôt que des numéros — le plus récent, rapide plutôt
que lourd, pas une variante expérimentale, ni un modèle d'embedding ou de
transcription — et garde les cinq meilleurs en cache une semaine.

Trois replis sont branchés dessus :

- **modèle retiré** (404) : le cache est vidé, la liste redécouverte, l'appel
  rejoué sur le suivant ;
- **modèle saturé** (503, fréquent sur le tout dernier sorti) : on descend
  d'un cran dans la liste, et celui qui a répondu remonte en tête ;
- **réponse vide** : les Gemini 3 réfléchissent avant d'écrire et consomment
  le budget de sortie en raisonnement. Une réponse vide avec `MAX_TOKENS`
  n'est pas une panne, c'est un budget trop court : l'appel est rejoué avec
  trois fois plus de marge.

Réglages → **Tester l'IA** affiche le modèle réellement utilisé, le modèle
d'images, et le nombre de modèles disponibles. En cas d'échec, il dit
laquelle des cinq causes possibles s'applique, au lieu du message générique.

### Où vivent les photos

Deux endroits, et c'est voulu. **IndexedDB** sur l'appareil, pour un
affichage instantané et hors ligne. Le **compartiment Supabase** quand un
compte est connecté, parce qu'un identifiant IndexedDB d'ordinateur ne veut
rien dire sur un téléphone.

Chaque photo porte donc deux références : `photo` (local) et `photoUrl`
(en ligne). L'affichage prend l'URL en secours quand le local est absent.
La penderie dit franchement où elle en est — « 3 photos seulement sur cet
appareil » — et propose de rattraper en un geste. À la connexion, ce qui
manque en local est retéléchargé en tâche de fond.

Sans cela, on ajoute ses vêtements sur l'ordinateur et on trouve des carrés
vides sur le téléphone.

### Les moteurs

**Roulette.** `pick(items, {weight})` fait un tirage aléatoire pondéré : le
meilleur score gagne souvent, jamais toujours. Un seul moteur pour les
activités, les aliments, les cadeaux, les films, les séries et le guide.

**Reco.** Un score unique combinant note, nombre d'avis, distance, budget,
météo, saison, horaire, préférences apprises et historique. Jamais montré
brut : il pondère le tirage et écrit la phrase *Pourquoi ?*. Un 4,9 avec sept
avis à quarante kilomètres ne bat pas un 4,4 avec neuf cents avis à six cents
mètres.

**Cal.** Le calendrier intelligent : conflits, créneaux libres, temps
restant, et filtrage des propositions qui ne rentrent pas dans la journée.

**AI.** Trois entrées : `ask` pour du texte, `json` pour une réponse
structurée garantie par schéma, `vision` pour les images. Cache par empreinte
du prompt, messages d'erreur humains, aucune erreur technique à l'écran.

---

## Vie privée

- Tout est local par défaut. Sans compte, aucune donnée ne quitte l'appareil.
- L'export Apple Santé est lu **dans le navigateur**, par tranches. Le
  fichier n'est envoyé nulle part.
- Les photos de vêtements vivent dans IndexedDB, sur l'appareil.
- Les indices privés des fiches cadeaux ne sont **jamais** partagés, même
  quand la liste de cadeaux correspondante l'est.
- Avec un compte, chaque utilisateur n'accède qu'à ses propres données et à
  celles qui lui sont explicitement partagées (RLS vérifié par test).
- Réglages → *Tout exporter* rend l'intégralité des données en JSON, et
  *Tout effacer* les supprime pour de bon.

---

## Limites à connaître

Starbucks ne publie **aucun barème officiel de pumps** : les quantités
viennent de témoignages de baristas et de recettes copycat concordantes.
Valeurs indicatives.

Les dosages cocktails suivent l'IBA quand il existe. Le Coco est une création
maison. L'abus d'alcool est dangereux pour la santé.

Deux recettes de Mamie (gratin de courgettes, tarte jambon asperge) n'ont pas
de texte dans Notion : le détail y est en capture d'écran. Leurs quantités
renvoient à la page d'origine.

Les analyses nutritionnelles, les lectures de forme, les guides de ville, les
événements et les recherches d'établissements sont **générés par IA**, à
titre indicatif. Ce ne sont pas des conseils médicaux, et les horaires et
adresses se vérifient avant de se déplacer.

## Crédits visuels

Les 124 visuels de boissons et cocktails sont générés par IA, sans logo ni
élément de marque. Les 24 photos de recettes viennent du carnet Notion
familial. Les onze sons viennent du projet WALLET. Projet personnel non
affilié à Starbucks Corporation.
