# Ludux

<p align="center">
  <img src="public/ludux-logo.png" alt="Ludux" width="420" />
</p>

<p align="center">
  <strong>Toute votre vie de joueur, au même endroit.</strong>
</p>

Ludux est une application desktop qui rassemble votre bibliothèque de jeux, votre temps de jeu, vos succès, vos DLC, vos souvenirs et vos notes personnelles.

Version courante : `v0.24.35`

## Pour les joueurs

1. Lancez Ludux.
2. Ouvrez `Paramètres`.
3. Connectez vos plateformes.
4. Lancez une synchronisation.

Ludux construit ensuite une mémoire vidéoludique locale : bibliothèque, fiches de jeux, chroniques, musée des jeux terminés, livre de vie et statistiques.

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

GOG importe les jeux installés détectés localement depuis les fichiers `goggame-*.info`.

Les fiches privilégient les textes français quand les plateformes les fournissent.

## Données

Ludux est pensé local-first : les données restent sur votre machine dans une base SQLite locale.

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
