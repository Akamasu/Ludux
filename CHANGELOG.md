# Changelog

Toutes les versions notables de Ludux seront documentees ici.

Le projet suit des versions de developpement simples :

- `v0.1.x` : fondation technique.
- `v0.2.x` : bibliotheque personnelle.
- `v0.3.x` : chroniques, sessions et souvenirs.
- `v0.4.x` : statistiques et lecture du parcours.
- `v0.5.x` : journal transversal des chroniques.
- `v0.6.x` : identite visuelle et logo.
- `v0.7.x` : musee des jeux accomplis.
- `v0.8.x` : livre de vie et chronologie globale.

## v0.2.0 - 2026-07-16

- Initialisation de l'application Electron, React, TypeScript et Vite.
- Ajout du schema SQLite/Prisma initial.
- Ajout de l'IPC securise entre renderer et main process.
- Creation de l'accueil Ludux.
- Creation de la page Bibliotheque avec ajout de jeux, recherche, filtres et vues grille/liste.
- Ajout du fonctionnement local-first avec donnees utilisateur ignorees par Git.

## v0.3.0 - 2026-07-16

- Ajout d'une fiche detail pour chaque jeu.
- Ouverture d'un jeu depuis l'accueil ou la bibliotheque.
- Edition du titre, du statut et de la note personnelle.
- Ajout de chroniques personnelles avec emotion.
- Ajout de sessions de jeu avec duree, plateforme et commentaire.
- Affichage d'une timeline "Mon histoire" combinant souvenirs et sessions.

## v0.4.0 - 2026-07-17

- Ajout d'une vraie page Statistiques.
- Calcul local des jeux possedes, jeux termines, temps joue, sessions et chroniques.
- Ajout des repartitions par statut, plateforme, emotion et activite mensuelle.
- Exposition des statistiques via le service library, IPC Electron et preload securise.

## v0.5.0 - 2026-07-18

- Remplacement du placeholder Chroniques par un journal consultable.
- Ajout d'une liste transversale des souvenirs, triee par date.
- Ajout de filtres par jeu, emotion et favoris, avec recherche textuelle.
- Ajout d'un panneau de lecture et d'un raccourci vers la fiche du jeu associe.
- Exposition des chroniques via le service library, IPC Electron et preload securise.

## v0.6.0 - 2026-07-18

- Integration du logo Ludux fourni dans les assets publics.
- Application de la palette sombre #0F1117, cartes #181B23, violet #7C5CFF et bleu #4F7CFF.
- Remplacement des anciens accents verts par l'identite violet/bleu.
- Harmonisation des boutons, etats actifs, formulaires, tuiles et panneaux de contenu.
- Ajout du logo dans la sidebar et l'accueil.

## v0.7.0 - 2026-07-18

- Remplacement du placeholder Musee par une galerie des jeux termines.
- Ajout des statistiques de musee : jeux termines, 100 %, temps expose et piece majeure.
- Ajout de filtres par accomplissement, recherche et tri par recence, temps joue ou titre.
- Ajout d'une vitrine de cartes ouvrant directement la fiche du jeu associe.

## v0.8.0 - 2026-07-18

- Remplacement du placeholder Livre de Vie par une chronologie globale.
- Fusion des sessions de jeu et des chroniques dans une timeline annuelle et mensuelle.
- Ajout des compteurs, de la recherche, du filtre par type de moment et du filtre par jeu.
- Ajout d'un raccourci vers la fiche du jeu associe depuis chaque moment.
- Exposition des evenements via le service library, IPC Electron et preload securise.
