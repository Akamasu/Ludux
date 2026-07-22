# Providers Ludux

Les intégrations externes sont préparées ici sous forme de providers isolés.

Registre actuel :

- Steam
- Xbox
- PlayStation
- Nintendo
- GOG
- Epic Games
- IGDB
- RAWG

Un provider retourne des données normalisées pour Ludux et ne modifie jamais la base directement.

La v0.15.0 ajoute la couche locale : le registre, les comptes externes référencés dans `ExternalAccount` et l'état préparé dans `SyncData`.

La v0.19.0 ajoute la première intégration réseau réelle avec Steam :

- appel manuel à `IPlayerService/GetOwnedGames` ;
- clé API Steam et SteamID64 lus depuis la connexion locale ;
- retour normalisé par `src/providers/steam.ts` ;
- import contrôlé par `SettingsService` dans la base Ludux ;
- liens persistants dans `ExternalGame` pour éviter les doublons.

La v0.21.0 ajoute la synchronisation automatique pour les providers disponibles :

- lancement automatique au démarrage de l'application ;
- relance périodique configurable ;
- secrets masqués côté renderer ;
- chiffrement via Electron `safeStorage` quand disponible.

La v0.22.0 stabilise Steam avant l'ajout de providers de métadonnées :

- validation SteamID64 ;
- timeout réseau ;
- erreurs Steam lisibles ;
- tests unitaires du parsing et des refus API.

La v0.23.1 ajoute une source locale Steam pour compléter l'API :

- détection de `libraryfolders.vdf` ;
- lecture des `appmanifest_*.acf` ;
- lecture de `localconfig.vdf` pour l'activité locale quand disponible ;
- fusion API + fichiers locaux avant import en base.

La v0.23.0 ajoute le premier provider de métadonnées actif avec RAWG :

- recherche d'un jeu par titre via `src/providers/rawg.ts` ;
- lecture des détails RAWG pour description, jaquette, date, développeur, éditeur et site officiel ;
- enrichissement manuel depuis les paramètres ;
- préservation des champs déjà renseignés dans Ludux ;
- liens persistants dans `ExternalGame` pour mémoriser les correspondances RAWG.

La v0.24.23 ajoute IGDB comme second provider de métadonnées :

- authentification Twitch OAuth client credentials ;
- recherche de jeux via l'API IGDB v4 ;
- lecture des jaquettes, dates, studios, éditeurs et genres ;
- enrichissement uniquement des champs manquants dans Ludux ;
- liens persistants dans `ExternalGame` pour mémoriser les correspondances IGDB.

Les prochaines intégrations réseau devront rester optionnelles et passer par un adaptateur dédié avant de proposer une importation dans la base locale.

Guides de préparation :

- `docs/providers/PLATFORM_REQUIREMENTS.md`
- `docs/providers/STEAM_SETUP.md`
- `docs/providers/RAWG_SETUP.md`
- `docs/providers/IGDB_SETUP.md`
