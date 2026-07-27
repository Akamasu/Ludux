# Ludux

<p align="center">
  <img src="public/ludux-logo.png" alt="Ludux" width="420" />
</p>

<p align="center">
  <strong>Toute votre vie de joueur, au même endroit.</strong>
</p>

Ludux est une application desktop qui rassemble votre bibliothèque de jeux, votre temps de jeu, vos succès, vos DLC, vos souvenirs et vos notes personnelles.

Version courante : `v0.29.0`

## Installation

1. Téléchargez `Ludux-Setup-0.29.0-x64.exe` depuis [la dernière version publiée](https://github.com/Akamasu/Ludux/releases/latest).
2. Lancez l'installateur.
3. À la première ouverture, laissez Ludux détecter les plateformes présentes.
4. Ajoutez seulement les connexions encore indiquées « À configurer ».

Ludux construit ensuite une mémoire vidéoludique locale : bibliothèque, fiches de jeux, chroniques, musée des jeux terminés, livre de vie et statistiques.

Les nouvelles versions sont téléchargées automatiquement en arrière-plan puis installées à la fermeture de Ludux.

## Synchronisation

Steam synchronise actuellement :

- bibliothèque PC ;
- jaquettes et métadonnées disponibles ;
- temps de jeu ;
- dernier lancement fiable quand Steam le fournit ;
- succès publics ;
- DLC détectés depuis Steam Store, avec ajout manuel depuis la fiche du jeu.

RAWG et IGDB complètent les fiches avec les descriptions, jaquettes, dates, studios, éditeurs et genres quand les données manquent.

Epic Games importe les jeux détectés localement depuis le launcher, même quand les manifests `.item` ne sont pas présents.

GOG importe la bibliothèque possédée, les temps de jeu, les DLC et les succès depuis Galaxy, le registre Windows et les fichiers `goggame-*.info`.

EA App, Ubisoft Connect et Battle.net importent les jeux réellement installés sur l'ordinateur. Ubisoft Connect synchronise aussi les succès disponibles, leurs textes français et leurs dates de déblocage. Les anciennes traces laissées par un jeu désinstallé sont ignorées.

Les fiches privilégient les textes français quand les plateformes les fournissent.

## Données

Ludux est pensé local-first : les données restent sur votre machine dans une base SQLite locale, stockée dans votre profil Windows.

Les jaquettes et métadonnées utiles à l'affichage peuvent être gardées dans un cache local léger et limité en taille. Ludux ne copie jamais les dossiers de jeux.

## Développement

```bash
npm install
npm run prisma:migrate
npm run dev
```

Créez un fichier `.env` depuis `.env.example` pour activer les synchronisations pendant le développement local.

## Vérification

```bash
npm run check
```

## Stack

Electron, React, TypeScript, Vite, Tailwind CSS, SQLite, Prisma et Vitest.

## Licence

Licence non définie pour le moment.
