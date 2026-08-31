# EVER

Une seule application pour décider : quoi boire, quoi manger, quoi faire,
quoi regarder, quoi offrir, quoi porter, et où en est ta forme.

Application web installable sur l'écran d'accueil iPhone. Aucun serveur
obligatoire : tout fonctionne en local, le compte et le partage sont
optionnels.

---

## Ce qu'il y a dedans

**Cinq onglets en bas** — ce qu'on ouvre tous les jours.

| Onglet | Contenu |
|---|---|
| **Café** | 103 boissons de la carte Starbucks décomposées en millilitres, ordre d'assemblage, réglages De'Longhi Eletta Explore |
| **Bar** | 21 cocktails aux dosages IBA, bar à cocher, liste de courses automatique |
| **Recettes** | 22 recettes de famille avec photos et quantités d'origine |
| **Alimentation** | Journal, macros, scan de repas par photo, analyse du jour, passerelle MyFitnessPal |
| **Santé** | Import Apple Santé, tableau de bord, tendances, lecture de la forme |

**Huit modules dans le hub** — le bouton en grille, en haut à gauche.

| Module | Question à laquelle il répond |
|---|---|
| Activités | Qu'est-ce qu'on fait ? |
| Aliments | Qu'est-ce qu'on mange ? |
| Cadeaux | Qu'est-ce que je lui offre ? |
| Cinéma & séries | Qu'est-ce qu'on regarde ? |
| Guide de ville | Que faut-il savoir et découvrir ici ? |
| Tenues | Comment je m'habille aujourd'hui ? |
| Profils | Avec qui je partage quoi ? |
| Progression | Où j'en suis ? |

---

## Ce qui marche, et ce qui ne peut pas marcher

Autant le dire clairement plutôt que de le découvrir à l'usage.

| Fonction demandée | État | Pourquoi |
|---|---|---|
| Lire et écrire sur **MyFitnessPal** | **Impossible en direct** | MyFitnessPal a fermé son API publique en 2020. L'accès est réservé aux partenaires sous contrat. Aucune bibliothèque ne contourne cela sans stocker ton mot de passe, ce qu'on ne fera pas. **À la place :** import du CSV exporté depuis MFP, export d'un CSV réimportable, et une couche `Food.Bridge` prête à recevoir une vraie API le jour où l'accès existe. |
| Connexion **Apple Santé** en direct | **Impossible depuis le web** | HealthKit est une API native iOS. Aucune page web, aucune PWA, aucun connecteur ne peut y accéder. Ce n'est pas une limite de l'app, c'est une limite d'iOS. **À la place :** un importeur complet de l'export Apple Santé (`export.zip` ou `export.xml`), qui lit pas, distance, énergie, fréquence cardiaque, variabilité, VO2 max, sommeil, poids, entraînements, et agrège tout par jour. |
| Recherche d'établissements réels | **Partiel** | Gemini connaît beaucoup d'adresses, mais peut se tromper. L'app lui interdit d'inventer et affiche moins de résultats plutôt que des faux. Vérifie avant de te déplacer. |
| Génération d'une photo de toi habillé | **Expérimental** | Le modèle image de Google refuse souvent de représenter une personne réelle. Le bouton existe, l'échec est expliqué proprement. |
| Google Calendar | **Optionnel** | Sans identifiant OAuth, les événements passent par un fichier `.ics` qui s'ouvre dans Calendrier iOS. C'est plus simple et ça marche partout. Avec un identifiant, l'app écrit directement dans l'agenda. |

---

## Installation

### 1. Mettre en ligne

Le dépôt est un site statique, sans build. Copie tous les fichiers à la
racine du dépôt GitHub, active GitHub Pages, c'est en ligne.

### 2. Sur iPhone

Ouvre le site dans Safari, bouton Partager, **Sur l'écran d'accueil**.
L'app apparaît sous le nom **EVER** avec l'icône fournie, en plein écran,
sans barre Safari.

### 3. Activer l'IA (2 minutes)

Le scan de repas, les analyses, le guide de ville, les idées cadeaux et
les recommandations passent par Gemini.

1. Crée une clé sur [aistudio.google.com](https://aistudio.google.com/apikey)
2. Dans EVER : hub → Réglages → **Clé Gemini**
3. Colle la clé

**La clé n'est pas dans le code, et c'est volontaire.** Une clé Google
posée en clair dans un dépôt public est lisible par tout le monde et le
quota se vide en quelques heures. Ici elle reste sur ton téléphone.

Pour une vraie mise en production, déploie la fonction edge
`sql/edge/gemini-proxy.ts` : la clé reste alors côté serveur et l'app
n'appelle plus Google directement.

### 4. Activer le compte et le partage (optionnel)

Sans compte, tout fonctionne, mais les données restent sur l'appareil et
rien ne se partage.

1. Crée un projet sur [supabase.com](https://supabase.com) (gratuit)
2. Éditeur SQL → colle tout `sql/schema.sql` → Run
3. Dans EVER : Réglages → **Renseigner un projet Supabase** → colle l'URL
   et la clé publique (`anon`)

L'URL et la clé `anon` sont faites pour être publiques : ce sont les
policies RLS du schéma qui protègent les données, pas le secret de la clé.
Tu peux donc aussi les écrire directement dans `js/config.js`.

### 5. Affiches de films (optionnel)

Une clé gratuite sur [themoviedb.org](https://www.themoviedb.org/settings/api),
collée dans Réglages → **Clé TMDB**, ajoute les affiches et les fiches de
films. Sans elle, le module marche avec des vignettes sobres.

---

## Les bugs corrigés

**Le texte des héros par-dessus les images.** C'était le plus visible, sur
les trois onglets et sur tout iPhone. La cause : le bloc de texte était
ancré en bas de la carte, en superposition, alors que les photos sont des
plans produits en 16:9 dont le sujet occupe la moitié basse. Sur un écran
étroit, la carte devient presque carrée, le texte s'étire et retombe
pile sur les tasses, les verres et les plats.

La correction ne déplace pas le texte, elle sépare les deux zones : le
texte a désormais sa propre bande, au-dessus, sur la couleur profonde de
l'onglet, et l'image occupe la bande du dessous avec un dégradé qui fond
son haut dans cette couleur. Aucune superposition n'est plus possible,
quelle que soit la longueur du titre ou la largeur de l'écran. Sur écran
large, les deux zones passent côte à côte.

**Autres corrections au passage :** barre de recherche écrasée par le
sélecteur de taille sur iPhone, écrans qui attendaient la météo avant de
s'afficher, emoji d'interface remplacés par un jeu d'icônes cohérent,
zones tactiles remontées à 44 px, safe areas et Dynamic Island prises en
compte partout.

---

## Architecture

Pas de build, pas de framework, pas de dépendance obligatoire. Du
JavaScript qui tourne tel quel, ouvrable et modifiable directement.

```
index.html              coque : barre haute, cinq vues, barre d'onglets
manifest.webmanifest    PWA, nom EVER, icônes
sw.js                   service worker (réseau d'abord, images en cache)
css/
  tokens.css            couleurs, espaces, rayons, ombres, clair et sombre
  base.css              remise à zéro, gabarit, chrome
  components.css        cartes, feuilles, roulette, anneaux, listes
js/
  config.js             valeurs publiques uniquement
  core/
    icons.js            bibliothèque d'icônes, aucune dépendance
    ui.js               feuilles modales, toasts, formatage, haptique
    store.js            stockage local d'abord, synchronisation ensuite
    photos.js           images en IndexedDB
    ai.js               Gemini : texte, JSON structuré, vision, cache
    cloud.js            Supabase : comptes, sync, listes partagées
    calendar.js         .ics et Google Calendar
  engines/
    roulette.js         tirage pondéré et animation
    reco.js             scoring : note, distance, météo, saison, horaire
    context.js          lieu, météo, saison, moment
  data/
    codex.data.js       les 146 recettes, extraites telles quelles
    codex.config.js     assistant en trois étapes, palettes, héros
    seed.js             activités, aliments, moods, paliers
  modules/              un fichier par module
sql/
  schema.sql            tables, RLS, buckets, vues
  edge/gemini-proxy.ts  fonction edge pour cacher la clé Gemini
```

### Trois moteurs, réutilisés partout

**Roulette.** `pick(items, {weight})` fait un tirage aléatoire pondéré :
le meilleur score gagne souvent, jamais toujours. `mount(el, options)`
ajoute la fenêtre animée. Un seul moteur pour les activités, les aliments,
les cadeaux, les films et les séries.

**Reco.** Un score unique qui combine note, nombre d'avis, distance,
budget, météo, saison, horaire, préférences apprises et historique. Il
n'est jamais montré brut : il sert à pondérer le tirage et à écrire la
phrase « Pourquoi ? ». Un 4,9 avec sept avis à quarante kilomètres ne bat
pas automatiquement un 4,4 avec neuf cents avis à six cents mètres.

**AI.** Trois entrées seulement : `ask` pour du texte, `json` pour une
réponse structurée garantie par schéma, `vision` pour les images. Cache
par empreinte du prompt, messages d'erreur humains, aucune erreur
technique à l'écran.

### Pourquoi pas quarante tables

Le cahier des charges listait une quarantaine de tables Supabase, une par
type d'objet. Pour une application personnelle dont la quasi-totalité des
données n'est jamais interrogée en relationnel, cela aurait donné quarante
policies RLS à maintenir et quarante chemins de synchronisation, sans
aucun gain.

Le schéma garde donc des tables réelles là où la structure sert vraiment,
c'est-à-dire dès que plusieurs personnes touchent la même donnée
(`shared_lists`, `list_members`, `list_items`), et une table générique
`user_collections` pour les collections personnelles. Les vues
`ever_meals` et `ever_health` montrent comment déplier le JSON en SQL, et
comment sortir une collection vers sa propre table le jour où c'est utile.

---

## Vie privée

- Tout est local par défaut. Sans compte, aucune donnée ne quitte
  l'appareil.
- L'export Apple Santé est lu **dans le navigateur**, par tranches. Le
  fichier n'est envoyé nulle part.
- Les photos de vêtements vivent dans IndexedDB, sur l'appareil.
- Les indices privés des fiches cadeaux ne sont jamais partagés, même
  quand la liste de cadeaux correspondante l'est.
- Avec un compte, chaque utilisateur n'accède qu'à ses propres données et
  à celles qui lui sont explicitement partagées (RLS).
- Réglages → **Tout exporter** rend l'intégralité des données en JSON, et
  **Tout effacer** les supprime pour de bon.

---

## Limites à connaître

Starbucks ne publie **aucun barème officiel de pumps** : les quantités
viennent de témoignages de baristas et de recettes copycat concordantes.
Valeurs indicatives.

Les dosages cocktails suivent les standards IBA quand ils existent. Le
Coco est une création maison. L'abus d'alcool est dangereux pour la santé.

Deux recettes de Mamie (gratin de courgettes, tarte jambon asperge) n'ont
pas de texte dans Notion : le détail y est stocké en capture d'écran
inaccessible. Leurs quantités renvoient à la page d'origine.

Les analyses nutritionnelles et les lectures de forme sont générées par
IA à titre indicatif. Ce ne sont pas des conseils médicaux.

Les guides de ville et les recherches d'établissements sont générés à
partir de connaissances générales : vérifie horaires et adresses avant de
te déplacer.

## Crédits visuels

Les 124 visuels de boissons et cocktails sont générés par IA, sans logo ni
élément de marque. Les 24 photos de recettes viennent du carnet Notion
familial. Projet personnel non affilié à Starbucks Corporation.
