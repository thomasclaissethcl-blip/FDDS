# Flash Dog Duke Silver présente — site statique

Cette version utilise `index.html` comme page principale unique. La sidebar, les cartes de catégories et les cartes d’articles sont générées à partir des fichiers de données placés dans `data/`.

## Fichiers de données

- `data/articles.json` contient les articles exposés par le site, leurs chemins, leurs catégories, leur image de carte et leur résumé.
- `data/categories.json` contient les catégories disponibles, leur image éventuelle et leur description.
- `data/pages.json` reste conservé comme index de compatibilité, mais la source principale pour l’affichage est `articles.json`.

## Ajouter un article

1. Ajouter la page HTML dans `pages/`.
2. Ajouter une entrée dans `data/articles.json` avec au minimum `slug`, `title`, `path` et `categories`.
3. Si la catégorie est nouvelle, ajouter une entrée dans `data/categories.json` pour définir son libellé, sa description et éventuellement son image.

Le filtre de la page d’accueil et la sidebar prendront automatiquement en compte l’article au chargement du site.

## Routes

- Accueil : `index.html`
- Catégorie : `#/categorie/personnage`
- Article : `#/vega`

## Test local

Utiliser Live Server dans VS Code, ou lancer :

```bash
python3 -m http.server 8000
```

Puis ouvrir `http://localhost:8000`.


## Version 3.5

Cette version supprime la sidebar permanente. L’accès aux contenus passe désormais par la page d’accueil, les cartes de catégories et la recherche globale.

Le champ de recherche placé dans l’en-tête filtre les articles en temps réel. La recherche porte sur le titre, le résumé, les catégories et le texte complet indexé dans `data/search-index.json`.

Le filtrage combine deux critères : la catégorie sélectionnée et l’expression saisie. Si aucun critère n’est actif, tous les articles sont affichés.

Pour ajouter un article, créer le fichier HTML dans `pages/`, puis ajouter l’entrée correspondante dans `data/articles.json`. La catégorie doit être ajoutée dans `data/categories.json` uniquement si elle n’existe pas encore. Il faut ensuite régénérer `data/search-index.json` pour que la recherche prenne le nouveau contenu en compte.


## Version 3.6

Cette version supprime la recherche de l’en-tête et la place au-dessus de la liste des articles. La zone de présentation de la page d’accueil est ouverte par défaut et peut être repliée. Les catégories restent affichées sous forme de cartes en desktop et deviennent une liste déroulante en affichage smartphone. Les articles restent générés depuis `data/articles.json`, les catégories depuis `data/categories.json`, et la recherche s’appuie sur `data/search-index.json`.
