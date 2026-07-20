# Versioning Ludux

Ludux conserve son historique avec Git.

## Regles

- Chaque etape stable doit avoir un commit clair.
- Chaque jalon utilisable doit recevoir un tag Git.
- Les donnees locales utilisateur ne sont jamais versionnees.
- Les fichiers generes (`generated/`, `out/`) sont recrees par les commandes npm.

## Commandes utiles

```bash
git log --oneline --decorate
git tag
git checkout v0.1.0
git checkout v0.2.0
```

## Premier jalon

Le tag `v0.1.0` correspond au bootstrap initial de Ludux : socle Electron/React, base locale et premiere interface.

## Jalons actuels

- `v0.1.0` : fondation technique initiale.
- `v0.2.0` : socle Electron/React, base locale et bibliotheque.
- `v0.3.0` : fiches de jeux, sessions et chroniques.
- `v0.4.0` : tableau de bord statistique.
- `v0.5.0` : journal transversal des chroniques.
- `v0.6.0` : identite visuelle, palette et logo.
- `v0.7.0` : musee des jeux termines.
- `v0.8.0` : livre de vie et chronologie globale.
- `v0.9.0` : parametres, sauvegardes et exports locaux.
- `v0.10.0` : notes et evaluations detaillees.
- `v0.11.0` : archivage, restauration et suppression de jeux.
- `v0.12.0` : gestion locale des DLC.
- `v0.13.0` : gestion locale des succes.
- `v0.14.0` : captures d'ecran et souvenirs visuels.
- `v0.15.0` : providers externes prepares sans synchronisation reseau.
- `v0.16.0` : edition et suppression des chroniques.
- `v0.17.0` : import et copie locale des captures.
- `v0.18.0` : edition et suppression des sessions de jeu.
- `v0.19.0` : synchronisation Steam manuelle.
- `v0.20.0` : fichiers de configuration et guides plateformes.
- `v0.21.0` : synchronisation automatique et secrets masques.
- `v0.22.0` : stabilisation du connecteur Steam.
- `v0.22.1` : retour visuel de validation Steam dans les parametres.
- `v0.22.2` : rebuild Electron pour le module SQLite natif.
- `v0.22.3` : correction du chargement du preload Electron.
- `v0.22.4` : activation du preload ESM hors sandbox.
- `v0.22.5` : cleanup du preload, des donnees locales et de la strategie Steam publique.
- `v0.22.6` : affichage de la vraie version applicative et simplification des parametres.
- `v0.23.0` : enrichissement manuel des metadonnees via RAWG.
