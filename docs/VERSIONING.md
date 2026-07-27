# Versioning Ludux

Ludux conserve son historique avec Git.

## Règles

- Chaque étape stable doit avoir un commit clair.
- Chaque jalon utilisable doit recevoir un tag Git.
- Les données locales utilisateur ne sont jamais versionnées.
- Les fichiers générés (`generated/`, `out/`) sont recréés par les commandes npm.

## Commandes utiles

```bash
git log --oneline --decorate
git tag
git checkout v0.1.0
git checkout v0.2.0
```

## Premier jalon

Le tag `v0.1.0` correspond au bootstrap initial de Ludux : socle Electron/React, base locale et première interface.

## Jalons actuels

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
- `v0.17.0` : import et copie locale des captures.
- `v0.18.0` : édition et suppression des sessions de jeu.
- `v0.19.0` : synchronisation Steam manuelle.
- `v0.20.0` : fichiers de configuration et guides plateformes.
- `v0.21.0` : synchronisation automatique et secrets masqués.
- `v0.22.0` : stabilisation du connecteur Steam.
- `v0.22.1` : retour visuel de validation Steam dans les paramètres.
- `v0.22.2` : rebuild Electron pour le module SQLite natif.
- `v0.22.3` : correction du chargement du preload Electron.
- `v0.22.4` : activation du preload ESM hors sandbox.
- `v0.22.5` : cleanup du preload, des données locales et de la stratégie Steam publique.
- `v0.22.6` : affichage de la vraie version applicative et simplification des paramètres.
- `v0.23.0` : enrichissement manuel des métadonnées via RAWG.
- `v0.23.1` : lecture locale des manifests Steam et fusion avec l'API.
- `v0.24.0` : expérience immersive et navigation inspirée d'une bibliothèque.
- `v0.25.0` : stockage Windows sécurisé et premier installateur public.
- `v0.25.1` : tri naturel de la bibliothèque et synchronisation locale GOG.
- `v0.26.0` : première ouverture séparée et paramètres simplifiés pour les joueurs.
- `v0.27.0` : enrichissement GOG, détection des lanceurs Windows et mises à jour automatiques.
- `v0.28.0` : import local EA App, Ubisoft Connect et Battle.net.
- `v0.29.0` : succès Ubisoft Connect locaux, français et datés.
