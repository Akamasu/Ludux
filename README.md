# Ludux

<p align="center">
  <img src="public/ludux-logo.png" alt="Ludux" width="420" />
</p>

<p align="center">
  <strong>Toute votre vie de joueur, au même endroit.</strong>
</p>

<p align="center">
  <a href="LICENSE">Licence GNU GPL v3</a> ·
  <a href="PRIVACY.md">Confidentialité</a> ·
  <a href="CODE_SIGNING_POLICY.md">Signature des versions</a> ·
  <a href="ASSETS.md">Actifs et marques</a>
</p>

Ludux est une application desktop qui rassemble votre bibliothèque de jeux, votre temps de jeu, vos succès, vos DLC, vos souvenirs et vos notes personnelles.

Version courante : `v0.33.0`

## Installation

1. Téléchargez l’installateur Windows depuis [la dernière version publiée](https://github.com/Akamasu/Ludux/releases/latest).
2. Lancez l'installateur.
3. À la première ouverture, laissez Ludux détecter les plateformes présentes.
4. Ajoutez seulement les connexions encore indiquées « À configurer ».

Ludux construit ensuite une mémoire vidéoludique locale : bibliothèque, fiches de jeux, chroniques, musée des jeux terminés, livre de vie et statistiques.

Les jeux et les logiciels clairement identifiés par Steam ou Epic sont séparés automatiquement. Le statut « Outil / application » reste également sélectionnable manuellement, et ces logiciels ne faussent pas les statistiques de jeu.

La bibliothèque s'ouvre comme un livre illustré, avec huit jeux par double page et une animation de feuilletage. Les vues grille et liste restent disponibles depuis la barre de filtres.

Les nouvelles versions sont téléchargées automatiquement en arrière-plan puis installées à la fermeture de Ludux.

## Synchronisation

Ludux Connect permet de relier Steam depuis le navigateur sans saisir de clé API dans
l'application. La clé Steam reste sur le serveur et Ludux conserve seulement un jeton
chiffré et limité dans le temps. Une configuration locale avancée reste disponible.

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

Ludux ne contient ni télémétrie, ni publicité. Les connexions nécessaires à Steam, RAWG, IGDB et aux mises à jour sont détaillées dans la [politique de confidentialité](PRIVACY.md).

## Développement

```bash
npm install
npm run prisma:migrate
npm run dev
```

Créez un fichier `.env` depuis `.env.example` pour activer les synchronisations pendant le développement local.

Le service de connexion Steam se trouve dans `connect/`. Consultez
`docs/providers/LUDUX_CONNECT.md` pour son fonctionnement et son déploiement.

## Vérification

```bash
npm run check
```

## Stack

Electron, React, TypeScript, Vite, Tailwind CSS, SQLite, Prisma et Vitest.

## Licence

Copyright © 2026 Akamasu.

Ludux est un logiciel libre distribué sous la licence **GNU General Public License version 3 uniquement** (`GPL-3.0-only`). Consultez le fichier [LICENSE](LICENSE) pour le texte complet.

Les actifs inclus et les marques tierces sont documentés dans [ASSETS.md](ASSETS.md).

La signature gratuite des futures releases est préparée avec SignPath. Consultez la [politique de signature de code](CODE_SIGNING_POLICY.md).
