# Providers Ludux

Les integrations externes sont preparees ici sous forme de providers isoles.

Registre actuel :

- Steam
- Xbox
- PlayStation
- Nintendo
- GOG
- Epic Games
- IGDB
- RAWG

Un provider retourne des donnees normalisees pour Ludux et ne modifie jamais la base directement.

La v0.15.0 ajoute la couche locale : le registre, les comptes externes references dans `ExternalAccount` et l'etat prepare dans `SyncData`.

Les futures integrations reseau devront rester optionnelles et passer par un adaptateur dedie avant de proposer une importation dans la base locale.
