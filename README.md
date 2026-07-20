# Ludux

<p align="center">
  <img src="public/ludux-logo.png" alt="Ludux" width="420" />
</p>

<p align="center">
  <strong>Toute votre vie de joueur, au même endroit.</strong>
</p>

Ludux est une application desktop local-first pour conserver, organiser et relire
la mémoire d'une vie de joueur : bibliothèque, sessions, chroniques,
statistiques et jeux accomplis.

Le projet est construit comme une application personnelle, locale et durable :
les données utilisateur restent sur la machine, dans une base SQLite ignorée par
Git.

## Origine

Le nom Ludux vient de deux idées :

- `Ludus`, le jeu ;
- `Index`, le catalogue, le classement, la trace.

L'objectif est de créer une mémoire vidéoludique personnelle : un endroit unique
pour retrouver les jeux possédés, les aventures terminées, les heures jouées et
les souvenirs qui donnent du sens au parcours.

## État du projet

Version courante : `v0.16.0`

Ludux est en développement actif. Les fondations techniques et plusieurs écrans
utilisables sont déjà en place :

- Accueil avec résumé de la bibliothèque.
- Bibliothèque avec ajout de jeux, recherche, filtres, vues grille/liste et archivage.
- Fiche détail d'un jeu avec statut, note personnelle, évaluation, DLC, succès, captures, sessions et chroniques.
- Journal des chroniques avec recherche et filtres.
- Musée des jeux terminés et terminés à 100 %.
- Livre de Vie avec chronologie globale des sessions et chroniques.
- Tableau de bord statistique.
- Paramètres locaux avec sauvegarde SQLite, export JSON, préférences et providers externes préparés.
- Stockage local SQLite via Prisma.
- IPC Electron sécurisé entre le renderer et le main process.
- Identité visuelle Ludux avec palette sombre, violet et bleu électrique.

## Aperçu Fonctionnel

### Bibliothèque

Ajoutez les jeux qui composent votre parcours, filtrez-les par statut ou
plateforme, puis ouvrez chaque fiche pour enrichir son histoire.

### Fiches de jeux

Chaque jeu peut recevoir :

- un statut de progression ;
- une note personnelle ;
- une évaluation détaillée avec note, avis, points forts/faibles et souvenir principal ;
- des DLC avec possession et complétion ;
- des succès avec suivi du déverrouillage ;
- des captures et souvenirs visuels liés aux chroniques ;
- des sessions de jeu avec durée, plateforme et commentaire ;
- des chroniques avec émotion associée, édition et suppression.

### Chroniques

Le journal transversal regroupe les souvenirs écrits depuis les fiches de jeux.
Il permet de chercher dans les titres, contenus et noms de jeux, puis de filtrer
par jeu, émotion ou favori.

### Musée

Les jeux terminés deviennent des pièces exposées. Le musée propose une galerie,
des statistiques dédiées, une recherche, un filtre d'accomplissement et un tri.

### Livre de Vie

Le Livre de Vie rassemble les sessions de jeu et les chroniques dans une
chronologie globale, groupée par année et par mois, avec recherche et filtres par
type de moment ou par jeu.

### Statistiques

Le tableau de bord calcule localement :

- jeux possédés ;
- jeux terminés ;
- temps joué ;
- nombre de sessions ;
- nombre de chroniques ;
- répartitions par statut, plateforme, émotion et activité mensuelle.

### Paramètres

Les paramètres donnent accès aux chemins locaux, à une sauvegarde de la base
SQLite, à un export JSON complet, au choix de la page d'ouverture, aux providers
externes préparés et aux jeux archivés, restaurables ou supprimables
définitivement.

## Stack Technique

- Electron
- React
- TypeScript strict
- Vite / electron-vite
- Tailwind CSS
- SQLite
- Prisma 7
- Vitest
- oxlint

## Démarrage Local

### Prérequis

- Node.js et npm installés.
- Git pour cloner et versionner le projet.

### Installation

```bash
npm install
```

Copiez le fichier d'environnement si besoin :

```bash
cp .env.example .env
```

Sur Windows PowerShell :

```powershell
Copy-Item .env.example .env
```

Préparez la base locale :

```bash
npm run prisma:migrate
```

Lancez l'application :

```bash
npm run dev
```

Le mode développement lance l'application Electron avec son renderer Vite.

## Scripts Utiles

```bash
npm run dev              # Lance l'application en développement
npm run build            # Compile TypeScript et génère le build Electron/Vite
npm run preview          # Lance une preview du build
npm run typecheck        # Vérifie les types TypeScript
npm run lint             # Lance oxlint
npm test                 # Lance les tests Vitest
npm run prisma:generate  # Génère le client Prisma
npm run prisma:migrate   # Applique/crée les migrations SQLite
```

## Données Locales

Par défaut, la base SQLite utilise :

```text
userdata/database/ludux.db
```

Les données locales, exports, sauvegardes et fichiers générés ne sont pas
versionnés. Voir `.gitignore` pour le détail.

## Structure du Projet

```text
Ludux/
|-- public/                 # Assets publics, logo et favicon
|-- prisma/                 # Schéma Prisma et migrations SQLite
|-- src/
|   |-- database/           # Client Prisma
|   |-- main/               # Processus principal Electron, preload et IPC
|   |-- renderer/           # Interface React
|   |   |-- components/     # Composants UI et layout
|   |   |-- hooks/          # Hooks de chargement et mutations
|   |   |-- pages/          # Écrans principaux de l'application
|   |   `-- utils/          # Helpers renderer
|   |-- services/           # Logique métier locale
|   |-- types/              # Contrats partagés main/renderer
|   `-- utils/              # Helpers transverses
|-- tests/                  # Tests Vitest
`-- userdata/               # Données locales ignorées par Git
```

## Versioning

Le projet utilise des tags Git pour marquer les jalons utilisables.

Tags principaux :

- `v0.1.0` : fondation technique initiale.
- `v0.2.0` : socle Electron/React, base locale et bibliothèque.
- `v0.3.0` : fiches de jeux, sessions et chroniques.
- `v0.4.0` : tableau de bord statistique.
- `v0.5.0` : journal transversal des chroniques.
- `v0.6.0` : identité visuelle, palette et logo.
- `v0.7.0` : musée des jeux terminés.
- `v0.8.0` : livre de vie et chronologie globale.
- `v0.9.0` : paramètres, sauvegardes et exports locaux.
- `v0.10.0` : notes et évaluations détaillées.
- `v0.11.0` : archivage, restauration et suppression de jeux.
- `v0.12.0` : gestion locale des DLC.
- `v0.13.0` : gestion locale des succès.
- `v0.14.0` : captures d'écran et souvenirs visuels.
- `v0.15.0` : providers externes préparés sans synchronisation réseau.
- `v0.16.0` : édition et suppression des chroniques.

Plus de détails dans `docs/VERSIONING.md`, `CHANGELOG.md` et
`docs/PRODUCT_VISION.md`.

## Feuille de Route

Prochaines pistes naturelles :

- Sélecteur de fichiers pour copier automatiquement les captures locales.
- Intégrations réseau optionnelles avec des plateformes de jeu.

La vision produit détaillée est synthétisée dans `docs/PRODUCT_VISION.md`.

## Licence

Licence non définie pour le moment.
