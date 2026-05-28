# Flash Dog Duke Silver présente

Cette version conserve le même fonctionnement public que la version précédente : page d’accueil, filtres par catégorie, recherche dynamique et chargement des articles.

## Structure

Le site public reste constitué de fichiers statiques :

```text
index.html
pages/
assets/
data/
```

La source éditoriale est maintenant isolée dans :

```text
content/
├── site.json
├── home.json
├── categories.json
└── articles/
```

Le dossier `content/` est la source à modifier à terme depuis l’outil d’administration. Les fichiers publics `pages/*.html`, `data/articles.json`, `data/categories.json` et `data/search-index.json` sont générés à partir de cette source.

## Génération

Un générateur est fourni dans :

```text
tools/build-site.js
```

Il reconstruit les pages publiques et les index de données à partir du dossier `content/`. Dans l’usage final, cette génération sera appelée par l’outil d’administration. Pour un usage manuel, la commande serait :

```bash
npm run build
```

## Édition future

L’objectif est que l’outil d’administration modifie uniquement :

```text
content/home.json
content/categories.json
content/articles/*.json
assets/images/
```

Puis qu’il régénère automatiquement le site public et publie les changements sur GitHub.
