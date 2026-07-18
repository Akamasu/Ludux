# Ludux

<p align="center">
  <img src="public/ludux-logo.png" alt="Ludux" width="420" />
</p>

<p align="center">
  <strong>Toute votre vie de joueur, au meme endroit.</strong>
</p>

Ludux est une application desktop local-first pour conserver, organiser et relire
la memoire d'une vie de joueur : bibliotheque, sessions, chroniques,
statistiques et jeux accomplis.

Le projet est construit comme une application personnelle, locale et durable :
les donnees utilisateur restent sur la machine, dans une base SQLite ignoree par
Git.

## Etat du projet

Version courante : `v0.7.0`

Ludux est en developpement actif. Les fondations techniques et plusieurs ecrans
utilisables sont deja en place :

- Accueil avec resume de la bibliotheque.
- Bibliotheque avec ajout de jeux, recherche, filtres et vues grille/liste.
- Fiche detail d'un jeu avec statut, note personnelle, sessions et chroniques.
- Journal des chroniques avec recherche et filtres.
- Musee des jeux termines et termines a 100 %.
- Tableau de bord statistique.
- Stockage local SQLite via Prisma.
- IPC Electron securise entre le renderer et le main process.
- Identite visuelle Ludux avec palette sombre, violet et bleu electrique.

## Apercu fonctionnel

### Bibliotheque

Ajoutez les jeux qui composent votre parcours, filtrez-les par statut ou
plateforme, puis ouvrez chaque fiche pour enrichir son histoire.

### Fiches de jeux

Chaque jeu peut recevoir :

- un statut de progression ;
- une note personnelle ;
- des sessions de jeu avec duree, plateforme et commentaire ;
- des chroniques avec emotion associee.

### Chroniques

Le journal transversal regroupe les souvenirs ecrits depuis les fiches de jeux.
Il permet de chercher dans les titres, contenus et noms de jeux, puis de filtrer
par jeu, emotion ou favori.

### Musee

Les jeux termines deviennent des pieces exposees. Le musee propose une galerie,
des statistiques dediees, une recherche, un filtre d'accomplissement et un tri.

### Statistiques

Le tableau de bord calcule localement :

- jeux possedes ;
- jeux termines ;
- temps joue ;
- nombre de sessions ;
- nombre de chroniques ;
- repartitions par statut, plateforme, emotion et activite mensuelle.

## Stack technique

- Electron
- React
- TypeScript strict
- Vite / electron-vite
- Tailwind CSS
- SQLite
- Prisma 7
- Vitest
- oxlint

## Demarrage local

### Prerequis

- Node.js et npm installes.
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

Preparez la base locale :

```bash
npm run prisma:migrate
```

Lancez l'application :

```bash
npm run dev
```

Le mode developpement lance l'application Electron avec son renderer Vite.

## Scripts utiles

```bash
npm run dev              # Lance l'application en developpement
npm run build            # Compile TypeScript et genere le build Electron/Vite
npm run preview          # Lance une preview du build
npm run typecheck        # Verifie les types TypeScript
npm run lint             # Lance oxlint
npm test                 # Lance les tests Vitest
npm run prisma:generate  # Genere le client Prisma
npm run prisma:migrate   # Applique/cree les migrations SQLite
```

## Donnees locales

Par defaut, la base SQLite utilise :

```text
userdata/database/ludux.db
```

Les donnees locales, exports, sauvegardes et fichiers generes ne sont pas
versionnes. Voir `.gitignore` pour le detail.

## Structure du projet

```text
Ludux/
|-- public/                 # Assets publics, logo et favicon
|-- prisma/                 # Schema Prisma et migrations SQLite
|-- src/
|   |-- database/           # Client Prisma
|   |-- main/               # Processus principal Electron, preload et IPC
|   |-- renderer/           # Interface React
|   |   |-- components/     # Composants UI et layout
|   |   |-- hooks/          # Hooks de chargement et mutations
|   |   |-- pages/          # Ecrans principaux de l'application
|   |   `-- utils/          # Helpers renderer
|   |-- services/           # Logique metier locale
|   |-- types/              # Contrats partages main/renderer
|   `-- utils/              # Helpers transverses
|-- tests/                  # Tests Vitest
`-- userdata/               # Donnees locales ignorees par Git
```

## Versioning

Le projet utilise des tags Git pour marquer les jalons utilisables.

Tags principaux :

- `v0.2.0` : socle Electron/React, base locale et bibliotheque.
- `v0.3.0` : fiches de jeux, sessions et chroniques.
- `v0.4.0` : tableau de bord statistique.
- `v0.5.0` : journal transversal des chroniques.
- `v0.6.0` : identite visuelle, palette et logo.
- `v0.7.0` : musee des jeux termines.

Plus de details dans `docs/VERSIONING.md` et `CHANGELOG.md`.

## Feuille de route

Prochaines pistes naturelles :

- Livre de Vie : chronologie globale du parcours.
- Parametres : sauvegardes, exports et preferences locales.
- Edition avancee des chroniques.
- Gestion des captures d'ecran et souvenirs visuels.
- Import/export de donnees.
- Integrations optionnelles avec des plateformes de jeu.

## Licence

Licence non definie pour le moment.
