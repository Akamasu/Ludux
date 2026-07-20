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

La v0.19.0 ajoute la premiere integration reseau reelle avec Steam :

- appel manuel a `IPlayerService/GetOwnedGames` ;
- cle API Steam et SteamID64 lus depuis la connexion locale ;
- retour normalise par `src/providers/steam.ts` ;
- import controle par `SettingsService` dans la base Ludux ;
- liens persistants dans `ExternalGame` pour eviter les doublons.

La v0.21.0 ajoute la synchronisation automatique pour les providers disponibles :

- lancement automatique au demarrage de l'application ;
- relance periodique configurable ;
- secrets masques cote renderer ;
- chiffrement via Electron `safeStorage` quand disponible.

La v0.22.0 stabilise Steam avant l'ajout de providers de metadonnees :

- validation SteamID64 ;
- timeout reseau ;
- erreurs Steam lisibles ;
- tests unitaires du parsing et des refus API.

Les prochaines integrations reseau devront rester optionnelles et passer par un adaptateur dedie avant de proposer une importation dans la base locale.

Guides de preparation :

- `docs/providers/PLATFORM_REQUIREMENTS.md`
- `docs/providers/STEAM_SETUP.md`
