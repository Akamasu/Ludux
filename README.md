# Ludux

<p align="center">
  <img src="public/ludux-logo.png" alt="Ludux" width="420" />
</p>

<p align="center">
  <strong>Toute votre vie de joueur, au même endroit.</strong>
</p>

Ludux est une application desktop qui rassemble votre bibliothèque de jeux, votre temps de jeu, vos succès, vos DLC, vos souvenirs et vos notes personnelles.

Version courante : `v0.24.5`

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

RAWG complète les fiches avec les descriptions, dates, studios, éditeurs et sites officiels quand les données manquent.

Les fiches privilégient les textes français quand les plateformes les fournissent.

## Données

Ludux est pensé local-first : les données restent sur votre machine dans une base SQLite locale.

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
