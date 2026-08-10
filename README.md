# Le Codex

Trois carnets de recettes dans une seule application web, utilisable hors ligne et installable sur l'écran d'accueil.

👉 **[Ouvrir le site](https://corentin-bocquet.github.io/codex-starbucks/)**

| Onglet | Contenu |
|---|---|
| ☕ **Starbucks** | 103 boissons de la carte décomposées en millilitres, ordre d'assemblage, réglages De'Longhi Eletta Explore |
| 🍸 **Cocktails** | 21 cocktails aux dosages IBA, avec un bar à cocher et une liste de courses automatique |
| 🧓 **Mamie** | 22 recettes de famille importées depuis Notion, photos d'origine comprises |

## Ce que fait l'app

**Mon bar.** Dans les paramètres, tu coches les bouteilles et les jus que tu as chez toi. L'application calcule en direct combien de cocktails tu peux préparer, lesquels sont à un seul ingrédient près, et affiche sur chaque fiche ce qui te manque.

**Recherche par ingrédient.** Sur l'onglet cocktails, tu sélectionnes un alcool ou un fruit et seules les recettes qui contiennent tous tes choix restent affichées.

**Favoris et export.** Les favoris et le bar sont stockés en local storage, uniquement sur ton appareil. Tu peux les copier, les télécharger en JSON, ou générer une liste de courses des ingrédients manquants pour tes cocktails favoris. Suppression sélective ou totale depuis les paramètres.

**Sélecteur de taille** sur l'onglet Starbucks : Tall, Grande, Venti. Toutes les quantités se recalculent.

## Fichiers

- `index.html` — le site, images séparées dans `assets/`
- `codex-hors-ligne.html` — version autonome en un seul fichier, images en base64

## Limites à connaître

Starbucks ne publie **aucun barème officiel de pumps** : les quantités viennent de témoignages de baristas et de recettes copycat concordantes. Valeurs indicatives.

Les dosages cocktails suivent les standards IBA quand ils existent. **Le Coco** est une création maison. L'abus d'alcool est dangereux pour la santé.

Deux recettes de Mamie (gratin de courgettes, tarte jambon asperge) n'ont pas de texte dans Notion : le détail y est stocké en capture d'écran inaccessible. Leurs quantités renvoient à la page d'origine.

## Crédits visuels

Les 124 visuels de boissons et cocktails sont générés par IA (Google Gemini via Composio), sans logo ni élément de marque. Les 24 photos de recettes viennent du carnet Notion familial. Projet personnel non affilié à Starbucks Corporation.
