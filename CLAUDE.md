# EVER (dépôt Starbucks) : règles du projet

PWA perso tout-en-un, en HTML, CSS et JS sans framework, avec Supabase et Gemini. Elle est en ligne via GitHub Pages. Le fonctionnement est décrit dans `README.md`, le plan de travail en cours dans `docs/PLAN.md`.

## Règles de design (décidées par Corentin le 23/11/2026)

- **Liquid glass partout.** Les couleurs ne sont permises qu'à l'intérieur d'un univers (Bar, Café…), jamais dans la navigation.
- **Barre du bas : icônes seules**, sans texte. L'onglet actif ne change pas de couleur et reste en verre.
- **On garde les boutons actuels** de l'app, pas ceux des maquettes.
- **Simple pour un nouveau venu**, tout en gardant chaque fonction et beaucoup de personnalisation.
- **Aucun écran en double.** Si un module est déjà rangé ailleurs, on ne le répète pas dans une liste « Tous les modules ».
- La partie santé ne contient que **Santé et Alimentation**. Paliers et Profils vont dans un espace de type Réglages.

## Règles de code

- À chaque livraison :
  - incrémenter `VERSION` dans `sw.js` ;
  - ajouter tout nouveau JS à `CORE` dans `sw.js` et à `index.html` ;
  - mettre à jour `README.md`.
- Le nouveau CSS va dans `css/components.css`. Jamais dans `finition.css`, jamais de `!important`.
- Ne jamais casser les anciennes routes (`#/<id>`, `#/m/<id>`) : on renomme avec un alias.
- Les clés (Gemini, TMDB…) restent sur l'appareil : elles ne sont jamais envoyées par la synchro.
- Tests :
  - lancer `python3 -m http.server` ;
  - piloter l'app avec Playwright en 390x844 ;
  - simuler `AI.json` et `Cloud`, car Supabase et Gemini sont injoignables depuis les sessions cloud.
- Aucun diagnostic médical : seulement « à surveiller », avec la mention « pas un avis médical ».
