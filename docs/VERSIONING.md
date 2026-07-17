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
git checkout v0.2.0
```

## Premier jalon

Le tag `v0.2.0` correspond au premier socle Ludux utilisable avec une bibliotheque locale.

## Jalons actuels

- `v0.2.0` : socle Electron/React, base locale et bibliotheque.
- `v0.3.0` : fiches de jeux, sessions et chroniques.
- `v0.4.0` : tableau de bord statistique.
