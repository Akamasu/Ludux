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

Les prochaines integrations reseau devront rester optionnelles et passer par un adaptateur dedie avant de proposer une importation dans la base locale.

Guides de preparation :

- `docs/providers/PLATFORM_REQUIREMENTS.md`
- `docs/providers/STEAM_SETUP.md`
