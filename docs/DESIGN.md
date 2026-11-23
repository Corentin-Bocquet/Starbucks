# EVER : spec de design finale (navigation v2)

> Base retenue : **« Rituel »**, la mieux notée par les trois juges (116 points, contre 112 pour « Premier pas », 95 pour « 5 univers » et 87 pour « Décide pour moi »).
> Greffes principales :
> - de « Premier pas » : les cartes « premier pas », la règle « 1 bouton principal + 1 menu ⋯ », les objectifs réglés là où on les voit, le point de synchro plein ou creux ;
> - de « 5 univers » : les routes symétriques, la barre d'outils d'univers, Moi rangé comme les Réglages iOS, « Mes adresses » ;
> - de « Décide pour moi » : « Mes goûts » et la part d'IA par univers.
>
> J'ai vérifié chaque point contre les règles du propriétaire. Les écarts que les juges ont relevés dans les propositions (couleur dans la nav, libellés sous les icônes, tenue du jour en double, fonctions perdues) sont corrigés ici.

---

## 0. Règles appliquées, une à une

| Règle du propriétaire | Comment la spec la tient |
|---|---|
| Liquid glass partout | Barres, segments, cartes, feuilles et bulles sont tous en verre (`aurora.css`, à étendre au thème clair). |
| Couleur seulement dans un univers, jamais dans la nav | La barre du bas, la barre du haut, la sous-navigation, la bulle avatar et le point de synchro sont tous neutres. `body[data-accent]` reste neutre sur Aujourd'hui, sur la sous-nav et dans Moi. La couleur (vert café, prune bar, orange délices, or de Paliers) n'apparaît que dans le héros et les cartes de contenu. |
| Barre du bas : icônes seules, l'actif ne change pas de couleur, reste en verre | L'onglet actif est un **glyphe plein posé sur une lentille de verre plus dense** ; les inactifs sont en contour. C'est la même teinte partout. Le nom n'existe que dans `aria-label`, et en bulle temporaire à l'appui long. |
| Garder le style actuel des boutons | Aucun nouveau style de bouton. Les gestes, puces, « + » et ⋯ réutilisent les boutons ronds et les pilules de verre existants. |
| Aucun écran en double | Le hub « Tous les modules » est supprimé. Il n'y a **qu'un seul écran « tenue du jour »** (Style > Tenues, section « Pour aujourd'hui »), et la carte de l'accueil n'est qu'un aperçu. Les cartes d'Aujourd'hui ouvrent toujours l'écran propriétaire. Il n'y a ni liste de modules ni raccourcis vers les univers. |
| La partie santé ne contient que Santé et Alimentation | Forme = **Alimentation · Santé**. Sport y est une page de niveau 2 sous Santé, pas un 3e segment. |
| Paliers et Profils dans un espace de réglages | L'espace **Moi** (bulle avatar) contient Progression (ex-Paliers) et Partage (ex-Profils). |
| « Manger » et « Sortir » | Les deux noms sont gardés. |
| Simple pour un nouveau venu, beaucoup de personnalisation, rien de perdu | Voir le §2 (table complète) et le §3 (parcours du nouveau venu). La personnalisation réordonne et masque des cartes, jamais des fonctions. |

---

## 1. Structure finale

### 1.1 Barre du bas (5 icônes, sans texte, en verre)

| Ordre | Icône (style SF Symbols) | Nom (aria-label seulement) | Route racine |
|---|---|---|---|
| 1 | `sun.max` | Aujourd'hui | `#/today` |
| 2 | `fork.knife` | Manger | `#/manger/<segment>` |
| 3 | `safari` (boussole) | Sortir | `#/sortir/<segment>` |
| 4 | `tshirt` | Style | `#/style/<segment>` |
| 5 | `heart` | Forme *(nom à valider, voir Q1)* | `#/forme/<segment>` |

Comportement de la barre :
- **Mémoire** : un toucher sur un onglet rouvre le dernier segment vu (`dernier.<univers>`, local, non synchronisé).
- **Retoucher l'onglet actif** : un premier toucher remonte en haut, un second revient au segment par défaut.
- **Appui long** : une bulle de verre affiche le nom de l'onglet (« Sortir ») pendant 1,5 s.
- Pas de badge de couleur. Un éventuel rappel prend la forme d'un **point de verre creux**, jamais d'une pastille rouge.

### 1.2 Contenu de chaque onglet

**Aujourd'hui** (`sun.max`), sans sous-navigation. C'est l'accueil transversal : il ne possède aucune donnée, il résume et renvoie vers l'écran propriétaire. Détail au §1.6.

**Manger** (`fork.knife`). Segments : **Recettes · Café · Bar · Délices**.
- Recettes (Codex mm) : pastilles de moment, recette à la une, grille, recettes de famille, fiche, mode cuisine pas à pas (phase 5), « Tout voir » en lien texte sous la grille.
- Café (Codex sb) : assistant en carrousel de 3 étapes, résultats avec « proches », tailles Tall/Grande/Venti **dans la fiche**, favoris.
- Bar (Codex ck) : assistant en 2 étapes, interrupteur « Avec ce que j'ai », Les plus faits, 134 cocktails, fiche.
- Délices (foodroulette) : 6 familles, roue « Qu'est-ce qu'on mange ? », Trois idées, Choisis pour moi (IA, selon les macros), Ajouter, Favoris, Partager la liste.
- Éléments communs : la barre d'outils d'univers (recherche locale, bouton **Ma cuisine / Mon bar** avec libellé, c'est-à-dire l'ancien tiroir Mon stock, et l'aide « ? ») ; **une seule** carte « Inventer avec l'IA » par segment Codex, dont les résultats vont dans « Mes créations » ; la liste de courses ouverte depuis Ma cuisine ; un bouton **« J'ai bu / mangé ça »** sur chaque fiche, qui consigne dans Forme > Alimentation sans changer d'onglet (toast « Ajouté au journal · Voir »).
- Ouverture par défaut : **Recettes**, ou le dernier segment vu. *Principe : Manger sert à choisir, Forme sert à suivre.*

**Sortir** (`safari`). Segments : **Idées · Ville · Films · Cadeaux** (4 au maximum, libellés courts, tient à 390 px).
- **Une seule pastille Lieu + rayon** en en-tête de Sortir, partagée par Idées, Ville et la météo d'Aujourd'hui. Elle fusionne `prefs.city` et Store `place` en une seule source.
- Idées (ex-Activités) : **un bouton principal « Trouve-moi une idée »**. Roue, Trois idées et Surprends-moi deviennent des modes de la pop-up de tirage, où le geste « glisser pour lancer » est conservé. Viennent ensuite les humeurs en rangée défilante, le budget en puce compacte et les filtres actifs en puces avec ✕. Le menu **⋯** donne accès à Ajouter (activité ou adresse), **Mes adresses**, Historique et Réglages du tirage. La carte résultat garde toutes ses actions (carte Leaflet, Favori, Garder, Planifier, Avec qui ?, Bon choix / Pas envie, On y va).
- Ville (ex-Ville + Bons plans) : puces de contexte, **Pour toi cette semaine** (bons plans et votes) en tête, Cinq choses à savoir, À ne pas manquer, les 14 sections, Tourner ici, Actualiser, et une section **Mes adresses** (ex-Mes établissements, aujourd'hui caché). Une autre ville que la ville courante s'ouvre en niveau 2.
- Films : Tout / Films / Séries, À voir / Vus / Favoris, TOURNER (« On regarde quoi ? »), Ma liste, Pour toi, ajout TMDB ou IA, fiche (saisons, plateformes, Vu, Favori, Planifier .ics, Retirer), Mes plateformes (phase 5).
- Cadeaux : la grille **« Pour qui ? »**, qui devient la seule liste des proches (collection `people`, fusion avec « Mes proches » de Profils). La fiche personne s'ouvre en niveau 2 et garde la roulette, Sa liste, Ce qu'elle aime, les indices, les idées IA, Où l'acheter, Planifier l'achat, « déjà offert » et le partage.
- Ouverture par défaut : **Idées**.

**Style** (`tshirt`). Segments : **Tenues · Penderie**, exactement le regroupement du propriétaire.
- Tenues : en tête, la section **« Pour aujourd'hui »**, qui est le seul écran « tenue du jour » de l'app.
  - Une tenue héros tirée des **tenues enregistrées** selon la saison, le mood, la météo heure par heure et l'agenda, plus 2 alternatives et des puces de mood.
  - Actions : **Je la porte** / **Une autre**. Le menu ⋯ « Autre source » propose *Mes tenues* (par défaut), *Avec ma penderie* (`buildOutfit`, sans IA) et *Inventer (IA)*.
  - Repli : la tenue de base par règles météo quand il y a moins de 3 vêtements.
  - En dessous viennent **Mes tenues** : 5 moods (moods et saisons multiples), carrousels, fiche tenue (photo portée, historique « portée le… », Me voir avec), **un seul éditeur** (fusion de Composer et Éditer), et **un seul bouton « Idées de tenues (IA) »** avec aperçu avant ajout (fusion d'Inventer et Générer). Le menu ⋯ contient Planifier la semaine, Valise (réserve) et Trous dans la garde-robe.
- Penderie : une carte par catégorie, carrousels, Tout voir, ajout par photo avec reconnaissance IA, fiche vêtement (nom, catégorie, couleur et saisons visibles ; repli « Détails » pour la matière, la marque, la pluie et la chaleur ; pipette, roue chromatique, relance IA). Le bandeau de synchro des photos n'apparaît que s'il y a une action à faire.
- Ouverture par défaut : **Tenues**, avec « Pour aujourd'hui » visible au-dessus de la ligne de flottaison.

**Forme** (`heart`). Segments : **Alimentation · Santé**.
- Alimentation : jour avec flèches et balayage, anneau kcal, **un bouton « + Ajouter »** qui ouvre les 5 façons d'ajouter (photo IA, code-barres, recherche dans la table et Open Food Facts, manuel, depuis Café/Bar/Recettes/Délices) plus « Récents » et « Comme d'habitude ». Puis les macros, l'eau (**une seule mesure d'eau** ; `hkWater` sert de source d'import) et le journal en 4 moments. « Quoi manger ? » et « Analyser » sont rangés dans un repli « Conseils ».
- Santé, réordonnée :
  1. barre de jour ;
  2. **carte Bilan** (feu tricolore, 3 lignes vérifiables `bilanChiffre`, mention « pas un avis médical »), avec en repli « Détail » le score du jour 0-100 renommé (voir le §4) et l'analyse IA en 6 panneaux ;
  3. 4 tuiles datées (sommeil, pas, FC repos, poids) ;
  4. une ligne **« Mon sport · N séances › »** ;
  5. les boutons « Saisir ma journée » et **« + Séance »** (un seul bouton à la place de Séance et Musculation) ;
  6. les replis Tendances (7/30/90/365 j), Entraînements de la montre, Carte du corps, Signaux à montrer à un médecin, et une ligne compacte « Six tasses › » vers Progression.
  
  Le bandeau Apple Santé n'apparaît que si la source n'est pas connectée ou si la synchro date de plus de 48 h.
- Sport : page de niveau 2 `#/forme/sante/sport`, ouverte par « Mon sport », « + Séance », le geste Séance et la quête Paliers.
- **Objectifs** : une feuille unique ouverte en touchant l'anneau kcal ou une tuile. C'est le seul endroit où on les règle, et la recherche « objectifs » y mène.
- Ouverture par défaut : **Alimentation** (le journal se remplit plusieurs fois par jour, et le bilan est déjà visible sur Aujourd'hui).

### 1.3 Sous-navigation

- **Contrôle segmenté en verre**, collant sous la barre du haut (`#sousnav`), avec 2 à 4 segments à libellé texte court. La règle « icônes seules » ne vise que la barre du bas.
- Le segment actif est marqué par un verre plus dense et du texte en gras, **jamais par une couleur**. Hauteur et composant sont identiques partout, et la barre reste au-dessus de `#viewCodex` comme de la vue générique.
- **Pas de balayage horizontal** entre segments, pour ne pas entrer en conflit avec les carrousels, les lanceurs et le balayage de jour d'Alimentation.
- **Profondeur maximale** : onglet → segment → page de niveau 2 **ou** feuille. Les pages de niveau 2 (Sport, fiche personne, autre ville, pages de Moi) masquent la sous-nav et affichent la flèche retour. Le retour système fait la même chose que la flèche, et une feuille ouverte se ferme avant qu'on quitte la page.
- **Divulgation progressive** : chaque écran a au plus 1 bouton principal et 1 menu ⋯ ; le reste va dans des replis (« Détails », « Conseils », « Réglages du tirage »).
- **Barre d'outils d'univers** au même emplacement dans chaque segment qui en a besoin : recherche locale à gauche, puis les actions de l'univers (Ma cuisine, roue dentée du tirage, +). *Ce qui règle un univers vit dans l'univers ; ce qui règle l'app vit dans Moi.*
- **Routes symétriques** : `#/<univers>/<segment>[/<détail>]`, par exemple `#/manger/bar`, `#/sortir/ville/le-touquet`, `#/sortir/cadeaux/<personne>`, `#/style/penderie`, `#/forme/sante/sport`, `#/moi/reglages/ia`. **Toutes les anciennes routes restent des alias** : `#/activities`, `#/outfits[/penderie|/tenues]`, `#/recettes`, `#/food`, `#/food/scan`, `#/health`, `#/m/<id>`, `#/m/city/<slug>`, `#/m/gifts/<p>`, `#/m/sport`, `#/m/stats`, `#/m/profiles`, `#/m/settings[/<section>]`, `#/settings`, `#/hub/<id>`, l'id `foods` vers `delices`, et les raccourcis du manifeste.

### 1.4 Barre du haut (verre, 3 zones, sans couleur)

- **Gauche** : une loupe (`magnifyingglass`) sur un écran de niveau 1, qui ouvre la recherche globale ; une flèche retour (`chevron.left`) sur un écran de niveau 2. Le bouton grille et le hub disparaissent.
- **Centre** : le nom de l'univers (« Manger », « Forme »…) ou le titre de la page de niveau 2. Sur Aujourd'hui, le titre « Aujourd'hui » s'affiche sur une ligne, avec la date en sous-titre (« Lundi 23 novembre »), pour que le nouveau venu lise le nom de l'onglet.
- **Droite** : la bulle avatar (photo ou initiale), qui ouvre **Moi**. Un petit **point de synchro en verre, plein (synchronisé) ou creux (en attente ou erreur)**, sans couleur. C'est le seul accès au compte.
- **Recherche globale** : une feuille plein écran en verre avec un champ. Les résultats sont groupés par univers, avec l'icône de l'univers, sans accents et triés par score. Elle couvre :
  - les pages et segments, avec des synonymes (« muscu », « séance », « bons plans », « proches », « objectifs ») ;
  - le contenu : boissons, cocktails, recettes, plats, activités, adresses, films, tenues, vêtements, proches, aliments ;
  - les rubriques de Moi.
  
  Un résultat ouvre toujours l'écran propriétaire, jamais une copie.

### 1.5 Espace « Moi » (réglages, Paliers, Profils)

On y entre par la bulle avatar. C'est une page de niveau 2 `#/moi`, avec retour vers l'écran d'origine et aucun onglet allumé en bas. Elle est en verre neutre, rangée comme les Réglages iOS, avec un champ « Rechercher dans Moi » en tête. Chaque ligne affiche **une ligne de résumé** pour éviter l'effet fourre-tout.

1. **En-tête** : avatar, pseudo, dernière synchro, bouton Synchroniser, ou « Se connecter » s'il n'y a pas de compte. La bannière de confidentialité est juste en dessous.
2. **Groupe « Toi »**
   - **Progression** (ex-Paliers, `#/moi/paliers`, page entière inchangée) : rang, médaillier de 18 paliers, ligue entre amis, 4 compteurs, « Ce qui a rempli ta semaine », quêtes (la quête « 3 séances » ouvre Sport), courbes sur 14 j, historique, **six tasses**. L'or de Paliers n'apparaît qu'à l'intérieur de cette page.
   - **Partage et listes** (ex-Profils, sans le doublon du compte) : toutes les listes partagées (`Cloud.myLists`, `Lists.open` sans filtre), rejoindre avec un code, et un lien « Mes proches › » vers Sortir > Cadeaux.
   - **Mes goûts** (greffe de « Décide pour moi » et de l'idée « Ce qu'EVER sait de moi ») : puces de goûts apprises (👍/👎, alcools, moods portés, cuisines, budget, allergies), corrigeables d'un toucher ; ville et rayon par défaut ; plateformes de streaming ; moods de tenue par jour de semaine ; **part d'IA par univers** (Jamais / Si vide / Toujours).
3. **Groupe « Réglages »**
   - **Accueil et gestes** : choix et ordre des gestes, café habituel et taille d'eau, cartes de l'accueil (afficher, masquer, épingler), ouverture de l'app (Aujourd'hui ou dernier écran).
   - **Brief du jour** : sections on/off et ordre, heure de génération, domaines de la leçon, villes et marchés suivis, import de la graine Notion, réinitialisation de l'anti-répétition.
   - **Univers** : segment d'ouverture de chaque univers. *On ne peut pas masquer de segment* (pour que rien ne paraisse perdu).
   - **Apparence** : thème, cartes, vibrations, sons, unités météo.
   - **Agenda** : Google Agenda OAuth, .ics.
   - **Mes données** : exporter ou importer tout ; import Apple Santé (export.xml/zip, jeton ever-sante) ; passerelle MyFitnessPal ; export JSON/TXT et effacement du stock Codex (sortis du tiroir) ; effacements par module ; tout effacer.
   - **Avancé** (replié, sans jargon en surface) : « IA active (serveur EVER) », clé Gemini perso, TMDB, icônes 3D, images générées, **« Portrait pour Me voir avec »** (ex-Ma photo, gardé distinct de l'avatar), tester l'IA, file d'attente IA, journal des 25 appels, vider le cache.
4. **Groupe « Aide »** : Découvrir EVER (rejoue la visite), aide des univers, version.

Alias : `#/settings`, `#/m/settings[/sec]`, `#/m/stats`, `#/m/profiles`.

### 1.6 Écran d'accueil « Aujourd'hui » (dans l'ordre, au plus 1,5 écran)

1. **En-tête** : sous la barre du haut, une pastille « Le Touquet · 9° pluie » qui ouvre la même feuille Lieu que Sortir.
2. **Mes gestes** : une rangée de 4 boutons ronds en verre (5 à 6 au maximum si l'utilisateur en ajoute). Par défaut : **Repas** (feuille des 5 méthodes, Récents, Comme d'habitude), **Eau +250 ml**, **Mon café** (seulement si un café habituel a été choisi à l'accueil), **Humeur et sommeil**. Gestes optionnels : Séance, Je la porte.
   - Un toucher consigne, avec un **toast Annuler de 5 s** et un retour haptique.
   - Un appui long ouvre le choix complet.
3. **Tenue du jour** (aperçu) : photo portée ou pièces d'une tenue enregistrée, puis une ligne « pourquoi » (« 13° → 6° ce soir, pluie vers 17 h, dîner à 20 h »), puis **Je la porte / Une autre**. Un toucher sur la carte ouvre Style > Tenues > Pour aujourd'hui. Avec moins de 3 tenues, la carte devient « premier pas ».
4. **Bilan** : feu tricolore, une phrase, kcal et eau restantes, et 1 alerte au maximum « à surveiller · pas un avis médical ». Un toucher ouvre Forme > Santé.
5. **Brief du jour** : titre et 3 puces d'aperçu. Un toucher ouvre la **feuille** du brief complet (une feuille, pas un écran).
6. **Cartes de moment (0 à 2 au maximum)**, selon l'heure et les données : midi « On mange quoi ? » (Délices), soir « Ce soir » (film de Ma liste filtré par plateformes, cocktail faisable le vendredi, bon plan), anniversaire à J-14, nouvelle saison, quête presque finie, bilan du dimanche.
7. Un lien discret « Personnaliser l'accueil » vers Moi > Accueil et gestes.

**Cartes « premier pas »** : pendant les premiers jours, chaque carte vide est remplacée par une carte à une seule action (« Enregistre 3 tenues », « Note ton premier repas », « Choisis ta ville », « Importe Apple Santé ou saisis ta journée »). Elle disparaît une fois l'action faite.

**Test Playwright** : Aujourd'hui doit tenir en 1,5 hauteur d'écran au plus à 390×844.

---

## 2. Ancien écran ou sous-fonction → nouvelle place (rien n'est perdu)

| Ancien | Nouvelle place |
|---|---|
| **Activités** `#/activities` (onglet du bas) | Sortir > Idées `#/sortir/idees` (alias) |
| Lanceurs Roue / Trois idées / Surprends-moi, glisser pour lancer | Modes de la pop-up de tirage, ouverte par « Trouve-moi une idée » ; le geste de glissement est gardé dans la pop-up |
| Humeurs, budget | En-tête d'Idées (rangée défilante, puce budget) |
| Choix de ville et rayon (pop-up) | Pastille Lieu + rayon de Sortir, partagée avec Ville et Aujourd'hui |
| Roue dentée des réglages du tirage | Idées ⋯ > Réglages du tirage (filtres actifs en puces ✕) ; valeurs par défaut dans Moi > Mes goûts |
| Ajouter une activité / une adresse | Idées ⋯ > Ajouter |
| Mes établissements (caché) | **Mes adresses** : section de Sortir > Ville et Idées ⋯ |
| Historique des activités | Idées ⋯ > Historique (le journal « On y va » s'y ajoute) |
| Carte résultat et ses actions | Inchangée dans Idées |
| Bouton « Le guide » | Remplacé par le segment Ville |
| Six tasses dans Activités | Les humeurs gardent leur usage ; les six tasses vivent dans Moi > Progression |
| **Tenues** `#/outfits` (onglet du bas) | Style `#/style/tenues` (alias) |
| Tenues > Aujourd'hui (5 moods, Ma penderie / Inventer, tenue de base) | Style > Tenues > section « Pour aujourd'hui » (seul écran tenue du jour) ; les modes deviennent les sources du menu ⋯ « Autre source » ; aperçu sur Aujourd'hui |
| Tenues > Mes tenues | Style > Tenues, sous « Pour aujourd'hui » |
| Composer + Éditer (composeOutfit, editerTenue) | Un seul éditeur de tenue |
| Inventer + Générer + « Des idées avec l'IA » | Un seul bouton « Idées de tenues (IA) », avec aperçu |
| Tenues > Penderie, fiche vêtement | Style > Penderie `#/style/penderie` (alias `#/outfits/penderie`) ; fiche avec repli Détails |
| Bandeau de synchro des photos | Penderie, seulement s'il y a une action à faire |
| Me voir avec | Action dans la fiche tenue ; portrait dans Moi > Avancé |
| **Recettes** `#/recettes` (onglet du bas) | Manger > Recettes `#/manger/recettes` |
| **Café** `#/m/cafe` (hub) | Manger > Café ; tailles dans la fiche ; café habituel aussi en geste |
| **Bar** `#/m/bar` (hub) | Manger > Bar |
| **Délices** `#/m/foods` (hub) | Manger > Délices `#/manger/delices` (alias foods) ; carte de midi sur Aujourd'hui |
| Icône et carte « Créer avec l'IA » du Codex | Une seule carte « Inventer avec l'IA » par segment ; résultats dans Mes créations |
| Icône « Voir tout » du Codex | Lien texte « Tout voir » sous la grille |
| Tiroir Mon stock | Bouton « Ma cuisine / Mon bar » (stock + liste de courses) ; export et effacement dans Moi > Mes données |
| « Peu importe » / « Passer cette étape » (assistant) | Un seul « Peu importe » |
| **Alimentation** `#/food`, `#/food/scan` | Forme > Alimentation `#/forme/alimentation` (alias, raccourci du manifeste conservé) ; ajouts rapides aussi dans les gestes Repas et Eau |
| 3 réserves d'eau | Une seule mesure (Alimentation), `hkWater` comme source d'import |
| Quoi manger ? / Analyser | Repli « Conseils » d'Alimentation |
| **Santé** `#/health` | Forme > Santé `#/forme/sante`, réordonnée (bilan en premier) |
| Anneau forme 0-100, note IA /10, note nutrition /10 | Résumé : un feu tricolore. Le détail est conservé : score du jour 0-100 renommé dans le repli « Détail » du bilan, note IA dans l'analyse, note nutrition dans Analyser |
| Bilan et analyse IA (6 panneaux) | Carte Bilan + repli ; résumé sur Aujourd'hui |
| Boutons Séance + Musculation | Un seul « + Séance » |
| Saisir le jour | Bouton « Saisir ma journée » de Santé + geste Humeur |
| Objectifs (Réglages et Santé) | Feuille unique ouverte depuis l'anneau ou les tuiles de Forme |
| Six tasses dans Santé | Ligne compacte « Six tasses › » vers Moi > Progression |
| Bloc « Mes données » de Santé (import Apple Santé, tout effacer) | Moi > Réglages > Mes données |
| Bandeau Apple Santé | Santé, seulement si non connecté ou synchro de plus de 48 h |
| **Sport** `#/m/sport` (orphelin) | Forme > Santé > Mon sport `#/forme/sante/sport` (niveau 2, alias) |
| **Films** `#/m/media` | Sortir > Films ; film du soir en carte de moment |
| **Cadeaux** `#/m/gifts[/p]` | Sortir > Cadeaux `#/sortir/cadeaux[/p]` ; fiche personne en niveau 2 ; J-14 sur Aujourd'hui |
| **Ville** `#/m/city[/v]` + **Bons plans** | Sortir > Ville `#/sortir/ville[/v]` ; Pour toi cette semaine en tête ; meilleur bon plan en carte de moment |
| **Profils** `#/m/profiles` | Compte → en-tête de Moi ; listes partagées → Moi > Partage et listes ; Mes proches → Sortir > Cadeaux « Pour qui ? » ; confidentialité → en-tête de Moi |
| **Paliers** `#/m/stats` | Moi > Progression `#/moi/paliers` |
| **Réglages** `#/m/settings[/sec]`, `#/settings` | Moi > Réglages (alias par section) |
| Réglages > Compte | En-tête de Moi |
| Réglages > IA (9 lignes) | Moi > Réglages > Avancé (3 lignes visibles + repli) |
| Ma photo | « Portrait pour Me voir avec » dans Avancé (non fusionné avec l'avatar) |
| Réglages > MyFitnessPal | Moi > Réglages > Mes données |
| Images générées, `banques.js` | **Conservés** tels quels (dans Avancé, et le code reste en place) ; aucun retrait dans cette refonte |
| Hub (bouton grille, « Tous les modules », recherche) | Supprimé ; la recherche devient la loupe ; alias `#/hub/<id>` |
| Bulle de compte | Même place, ouvre Moi |
| Bulle d'aide « ? », feuilles, toasts, MapPick, Cal, Lists.open | Inchangés, dans leur page ; Aide centralisée dans Moi |
| Nouveaux : brief, tenue du jour, bilan, gestes | Aujourd'hui (réglages dans Moi) |

---

## 3. Notes de maquette, écran par écran (390×844)

Repères verticaux communs :
- zone de statut : 0 à 47 ;
- barre du haut : 47 à 91 (44 px) ;
- sous-nav : 99 à 135 (36 px, marge de 8) ;
- contenu à partir de 143 (ou 99 sans sous-nav) ;
- barre du bas flottante : pilule de verre de 358×64 centrée, à y ≈ 746-810, puis zone de l'indicateur d'accueil (34 px).

Marges latérales de 16 px, rayon des cartes de 22, espacement de 12 entre les cartes. Le texte suit la typo actuelle de l'app.

1. **Aujourd'hui**
   - Barre du haut : loupe | « Aujourd'hui » avec en dessous, en petit, « Lundi 23 novembre » | avatar et point plein.
   - y≈99 : pastille Lieu/météo (pilule de 32 px).
   - y≈143 : rangée de 4 gestes (boutons ronds de 56 px, espacés régulièrement, petite légende sous chacun en contenu, ce qui est permis hors de la barre du bas).
   - y≈225 : carte Tenue (hauteur 220 : photo à gauche sur 45 %, à droite le titre, le « pourquoi » sur 2 lignes, 2 vignettes alternatives, puis les boutons Je la porte / Une autre).
   - y≈457 : carte Bilan (88 px : pastille ronde du feu en verre, la teinte n'étant que dans le disque de contenu, plus une phrase et « 1 240 kcal · 0,8 L restants »).
   - y≈557 : carte Brief (130 px : titre, 3 puces, chevron).
   - Au défilement : 0 à 2 cartes de moment, puis le lien « Personnaliser l'accueil ».
2. **Manger > Recettes (défaut)**
   - Titre « Manger ».
   - Sous-nav Recettes · Café · Bar · Délices.
   - Barre d'outils (recherche sur 70 %, puis Ma cuisine et ?).
   - Pastilles de moment, héros « À la une » (couleur de l'univers dans le visuel seulement), grille sur 2 colonnes, carte « Inventer avec l'IA », lien « Tout voir ».
3. **Sous-écran Manger : fiche cocktail (Bar)**
   - Feuille montante à 92 % de hauteur : photo, nom, degré, kcal.
   - Section « Il te manque : citron vert » avec la ligne « Remplacer par » (feature 6).
   - Ingrédients cochés depuis le stock, puis les étapes.
   - Bouton principal **J'ai bu ça**, menu ⋯ (Favori, Je l'ai fait + photo, Liste de courses, Partager).
4. **Sortir > Idées (défaut)**
   - Titre « Sortir », sous-nav à 4 segments, pastille Lieu + rayon à droite de la barre d'outils.
   - Rangée d'humeurs, puce budget, puces de filtres ✕.
   - Grand bouton « Trouve-moi une idée » centré à y≈330.
   - En dessous : dernières idées gardées. Le menu ⋯ est en haut à droite du contenu.
5. **Sous-écran Sortir : Cadeaux > fiche personne (niveau 2)**
   - Flèche retour, titre « Léa », sans sous-nav.
   - En-tête avatar + date importante (J-14), bouton principal « Trouver une idée » (roulette).
   - Sections Sa liste, Ce qu'elle aime, Idées IA, Où l'acheter ; menu ⋯ (Planifier l'achat, Partager, Déjà offert).
6. **Style > Tenues (défaut)**
   - Titre « Style », sous-nav Tenues · Penderie.
   - Section « Pour aujourd'hui » (héros de 300 px, photo portée ou pièces en collage), puces de mood, Je la porte / Une autre, ⋯ Autre source.
   - Puis « Mes tenues » : 5 carrousels par mood avec compteur, bouton « Idées de tenues (IA) ».
7. **Sous-écran Style : Penderie > fiche vêtement**
   - Feuille : photo (pipette au toucher), nom, catégorie, couleur et saisons visibles, repli Détails.
   - État lessive (feature 4), action ⋯ « Relancer la reconnaissance ».
8. **Forme > Alimentation (défaut)**
   - Titre « Forme », sous-nav Alimentation · Santé.
   - Barre de jour ‹ Lun. 23 ›, anneau kcal de 160 px (toucher = Objectifs), macros sur une ligne, eau.
   - Bouton « + Ajouter », puce « Comme d'habitude » par moment, journal en 4 moments, repli Conseils.
9. **Sous-écran Forme : Santé > Mon sport (niveau 2)**
   - Retour, titre « Mon sport », aucune couleur dans la barre.
   - Bouton principal « + Séance » (choix Musculation / À la durée), carte du corps face et dos, historique des séances.
10. **Espace Moi**
    - Retour | « Moi ».
    - Recherche dans Moi, carte d'en-tête de compte (avatar de 64 px).
    - Groupes Toi / Réglages / Aide en listes de verre, chaque ligne avec son icône neutre, son titre, son résumé gris et un chevron.
11. **Carte Bilan santé (détail)** : dans Forme > Santé, la carte de tête se déplie. Elle montre le feu, une phrase (« Bonne semaine, sommeil un peu court »), 3 lignes vérifiables avec leur valeur, leur seuil et un lien vers la source, puis les replis « Détail du score » et « Analyse IA ». La mention « pas un avis médical » figure en pied de carte.
12. **Brief du jour (feuille)**
    - Feuille plein écran : poignée, titre « Ton brief · lundi 23 », bouton secondaire Régénérer.
    - Sections en cartes, chacune avec un titre, 3 puces au maximum et ses sources : météo et tenue, fait prouvé, leçon (avec un champ réponse dans la carte), marchés, monde, ce soir + 5 idées (bouton « Je prends » vers Planifier).
    - Une section vide est masquée ; une section IA en panne affiche « revient demain » ou sa version de la veille datée.
13. **Tenue du jour** : aperçu sur Aujourd'hui (point 1) et écran complet dans Style (point 6). Après « Je la porte », la carte se replie en une ligne « Portée aujourd'hui ✓ · Changer ».

**Parcours du nouveau venu** :
- **3 écrans de verre passables** :
  1. Ta ville : géolocalisation ou recherche.
  2. Ce qui t'intéresse : puces qui **réordonnent seulement** le brief et les segments d'ouverture, plus le café habituel optionnel.
  3. Ta barre : **bulles successives** au-dessus de chaque icône, une seule fois, avec l'astuce « appui long = nom ».
- Compte et thème sont proposés à la fin avec un « Plus tard » visible, ou après la première action gardée. Aucune clé IA n'est demandée.
- Ensuite : Aujourd'hui avec ses cartes « premier pas », et une seule bulle « ? » sur le bouton principal de chaque univers à la première visite.

---

## 4. Nouvelles fonctions retenues (top 12, par valeur/complexité)

| # | Fonction | Univers | Avec IA | Sans IA (repli) | Effort |
|---|---|---|---|---|---|
| 1 | **Tenue du jour + « Je la porte » + photo miroir + mood par l'agenda** | Style / Aujourd'hui | Vision : reconnaît mes pièces sur une photo miroir ; IA pour les titres d'agenda ambigus | Score local parmi les tenues enregistrées (saison, mood, météo, récence) ; mots-clés d'agenda (dîner → Soirée, entretien → Classe) ; feuille « Ce que je porte » à 3 touchers | M |
| 2 | **Penderie en rafale** depuis une photo en pied | Style | Vision : boîtes englobantes, découpe canvas, fiches pré-remplies, tenue créée | Rectangles tracés au doigt, catégorie en un toucher, couleur prise par la pipette | M |
| 3 | **Météo heure par heure** : tenue qui tient la journée, bon créneau de sortie, plan B pluie | Style / Sortir / brief | Formulation d'une phrase | Open-Meteo `hourly` (sans clé) : règles d'écart de température, pluie, vent ; `Reco.rank` en intérieur pour le plan B | S |
| 4 | **Au sale / laverie** | Style | — | État de la pièce, seuil de ports par catégorie, bouton « Lessive faite » | S |
| 5 | **Ma cuisine par photo** (placard, bar, frigo) | Manger | Vision limitée aux clés STOCKDEF, puis « +23 cocktails faisables » | Préréglages (Bar de base, Bar complet, Placard standard), puis liste groupée avec recherche | M |
| 6 | **Il me manque… / Meilleur achat** | Manger | Remplacement sur mesure | Table locale de 60 à 80 substitutions + classement des ingrédients qui débloquent le plus | S |
| 7 | **« J'ai bu / mangé ça » + « Je l'ai fait » (photo, note, variante) + caféine du jour** | Manger → Forme | Vision : estime la portion réelle | kcal de la fiche × taille ou portion ; somme de caféine locale, repère doux après 14 h | M |
| 8 | **Comme d'habitude** (repas récurrents en un toucher) | Forme | — | Signatures de repas répétées au moins 3 fois sur 14 j, en local | S |
| 9 | **Scan de l'étiquette nutritionnelle** (quand Open Food Facts ne connaît pas le produit) | Forme | Vision : valeurs pour 100 g, mémorisées sous le code | Formulaire « pour 100 g » à molettes, cache `produitsPerso` | S |
| 10 | **Adresses réelles OpenStreetMap** (Overpass, horaires, vraies distances) | Sortir | Pitch et classement | Overpass + `Reco.rank` ; cache par ville et rayon (7 j) ; sinon Mes adresses | M |
| 11 | **Scanner une affiche ou un flyer** → fiche, Planifier, carte | Sortir | Vision : nom, dates, lieu, prix | QR lu par ZXing, photo gardée, formulaire pré-rempli, extraction relançable plus tard | M |
| 12 | **Vu en magasin, pour qui ?** | Sortir > Cadeaux | Vision : objet, marque, prix | Photo + magasin géolocalisé + date ; personne choisie d'un toucher | S |

Déjà intégré à la structure (donc hors top 12) : Mes gestes, cartes de moment, cartes « premier pas », Mes goûts, recherche globale.

**Réserve, à faire après les 12** :
- Ce qui te fait bien dormir (corrélations ; après correction du bug du sommeil gonflé)
- Séance du jour adaptée
- Minuteur de repos
- Dicter son repas
- Scanner l'écran d'un appareil de mesure
- Fiche produit Open Food Facts enrichie
- Soirée cocktails
- Lire la carte d'un bar
- Importer une recette par photo
- Recrée ce look
- Annonce Vinted
- Étiquette d'entretien
- Valise de voyage (déjà en réserve dans le PLAN)
- Scanner une affiche de film
- Cartes à partager en image
- Bouton photo unique
- Barre de recherche qui comprend les phrases (la loupe simple d'abord)
- Sondage « On fait quoi ? » (touche la RLS Supabase)
- Raccourci iPhone et brief lu à voix haute
- Passer à un nouvel appareil par QR

**Rejetées** :
| Idée | Raison |
|---|---|
| Feuille « Décide » unique (fusion des roulettes et assistants) | Grosse réécriture (risque 3/10), perd la finesse des assistants Café et Bar, et ajoute un second modèle mental |
| Secouer pour relancer | Aucune capacité nouvelle, permission iOS, déclenchements involontaires |
| Scan du code-barres de vêtement | Aucune base ouverte de codes de vêtements ; un champ prix manuel suffit |
| Fournisseur IA de secours (OpenRouter/Groq) | Gain faible face à la file d'attente et aux replis locaux, une clé de plus à gérer, pas de vision |
| Photo du menu au restaurant | Usage rare, estimations très incertaines, doublon avec le scan d'assiette, repli sans IA inutile |
| Anti-gaspi avec dates (DLC) | Discipline de saisie trop lourde (coût 3) pour un usage d'assidus |
| Mode cuisine vocal | Reconnaissance vocale instable en PWA iOS ; le mode pas à pas avec gros boutons suffit |
| Indice dicté (Cadeaux) | La dictée du clavier iOS fait déjà le travail |
| « Ça va ensemble ? » | Recoupe la tenue du jour et les règles existantes |
| Liste de courses des manques nutritionnels | Recoupe « Quoi manger ? » et la liste de courses du Codex |
| Masquer des segments (Moi > Univers) | Donne l'impression qu'une fonction a disparu ; seuls l'ordre et le segment d'ouverture sont réglables |
| Libellés texte sous les icônes, même temporaires ; point de synchro vert/gris ; « accent Forme » sur Sport | Contraires aux règles du propriétaire |

---

## 5. Stratégie « IA en panne » pour toute l'app

1. **Principe** : l'IA est un bonus, jamais un passage obligé. Chaque bouton IA a un **résultat local** marqué honnêtement « Suggestion hors IA ». `UI.echecIA` reçoit **toujours** `opts.repli` et n'affiche jamais un simple « Réessayer ».
2. **Cascade** : clé perso → serveur EVER → **cache, même périmé, avec sa date** (« mis à jour il y a 41 j ») → moteur local → **file d'attente**.
3. **File d'attente IA (`aiQueue`)** : la donnée brute (photo d'assiette, vêtement, analyse, tenue à inventer) est enregistrée tout de suite en IndexedDB et reste utilisable. La file est relancée au retour en ligne, à l'ouverture de l'app et après un appel réussi, puis un toast « 3 éléments complétés » confirme. Son état est visible dans Moi > Avancé.
4. **Jamais de 0 silencieux** : un repas non estimé est cherché dans la table ALIMENTS, puis dans Open Food Facts par nom ; sinon la ligne porte le badge « à estimer » au lieu de 0 kcal (corrige Délices et la saisie manuelle). Un vêtement non reconnu reçoit une couleur extraite en local et une mini-fiche « Quelle catégorie ? », au lieu de « Pièce N, haut gris ». Une photo de code-barres passe par ZXing avant l'IA. `scanFlow` garde la photo même sans clé.
5. **Replis par fonction** :
   - Tenues (Inventer, Générer) : tenue de base par règles météo et `buildOutfit`, plus une règle d'harmonie des couleurs.
   - Choisis pour moi, Quoi manger ? : score local sur les macros restantes, la famille et la récence.
   - Inventer (Codex) : recettes faisables, gabarits, « Il ne manque qu'un ingrédient ».
   - Guide de ville : Wikipédia REST + Overpass + cache.
   - Bons plans : ceux de la veille, marqués « d'hier ».
   - Lieux d'activités : Overpass.
   - Films « Pour toi » : TMDB `/recommendations`, sinon tirage dans la liste.
   - Idées cadeaux : idées en cache + banque locale par centre d'intérêt.
   - Bilan santé : `bilanChiffre` local (déjà vérifiable).
   - `aiSearch` de Films : dit « recherche indisponible » au lieu de renvoyer `[]`.
6. **Brief en couches** :
   - Couche 1, sans IA, affichée en moins d'une seconde : météo, tenue, bilan, kcal et eau, crypto via CoinGecko, « Il y a X ans » via Wikimedia, anniversaires, saisons de séries.
   - Couche 2, avec IA : fait prouvé, leçon, monde, indices, ce soir. Elle est mise en cache `brief.<date>`, générée à la première ouverture après 6 h, avec un état par section (`Promise.allSettled`).
   - **Pas de couche 2 en production avant la sécurisation du proxy ever-ai** (PLAN 1A-4).
7. **Quota** : caches par univers (actLoc 7 j, findVenues 3 j, guide 30 j, brief 1 j, Overpass 7 j) et réglage « part d'IA par univers » dans Mes goûts.
8. **Messages** : on ne dit plus « Active-la dans Réglages » quand l'IA passe par le serveur. L'état de l'IA s'affiche en verre neutre, jamais en rouge.
9. **Tests** : une batterie Playwright avec l'IA simulée en panne (BAD_KEY, QUOTA, hors ligne) sur les 15 anciennes routes et les nouveaux écrans, qui vérifie « jamais d'écran vide, jamais de 0 kcal ».

---

## 6. Questions ouvertes pour le propriétaire (4)

1. **Nom de la partie santé** : « Forme » (proposé, court et non médical), « Corps » ou « Équilibre » ? Dans le cas de « Forme », le score 0-100 actuel serait renommé « score du jour ».
2. **Nom de l'espace réglages** : « Moi » te convient-il pour l'espace ouvert par l'avatar (Progression, Partage, Mes goûts, Réglages), ou préfères-tu « Mon espace » ?
3. **Cadeaux** : le garder dans Sortir (décision tournée vers les autres, fiche personne unique), ou le ranger avec les proches dans Moi ? Il ne sera jamais aux deux endroits.
4. **Mes gestes sur l'accueil** : d'accord pour 4 gestes par défaut (Repas, Eau, Café habituel, Humeur), avec un toucher qui consigne directement (toast Annuler de 5 s) ? Et l'app doit-elle s'ouvrir toujours sur Aujourd'hui, ou seulement au premier lancement de la journée ?

*Note* : cette structure s'écarte de `docs/PLAN.md` phase 2 (libellés visibles, onglet « Moi » santé). Il faudra mettre le PLAN à jour une fois les réponses du propriétaire connues. Aucun fichier n'a été modifié.