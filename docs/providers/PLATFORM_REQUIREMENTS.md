# Fichiers et Accès Plateformes

Ce document liste les fichiers, variables et accès à récupérer pour connecter les plateformes à Ludux.

Les secrets réels doivent rester dans `.env` ou être saisis dans l'application. Ils ne doivent jamais être commités.

Pour la v1 publique, Ludux devra éviter toute clé API commune dans le client desktop. Les clés partagées ou applicatives devront rester côté backend.

## Fichiers Locaux

- `.env.example` : modèle versionné des variables attendues.
- `.env` : fichier local ignoré par Git pour les vraies clés et secrets.
- `docs/providers/AUTO_SYNC_STRATEGY.md` : stratégie de synchronisation automatique.
- `src/providers/registry.ts` : registre visible dans l'interface.
- `src/providers/<provider>.ts` : adaptateur reseau isole par plateforme.
- `prisma/schema.prisma` : liens persistants entre jeux Ludux et jeux externes.

## Variables

| Variable | Plateforme | Usage | Statut |
| --- | --- | --- | --- |
| `STEAM_WEB_API_KEY` | Steam | Clé Web API pour lire la bibliothèque possédée | Actif |
| `STEAM_ID_64` | Steam | Identifiant du compte à connecter | Optionnel, saisie UI possible |
| `LUDUX_STEAM_ROOT_PATH` | Steam | Chemin racine Steam local si la détection automatique échoue | Optionnel |
| `LUDUX_STEAM_LIBRARY_PATHS` | Steam | Bibliothèques Steam locales séparées par `;` | Optionnel |
| `LUDUX_AUTO_SYNC_INTERVAL_MINUTES` | Ludux | Intervalle de synchronisation automatique | Actif |
| `LUDUX_EPIC_MANIFEST_PATHS` | Epic | Dossiers de manifests `.item` Epic séparés par `;` si la détection automatique échoue | Optionnel |
| `LUDUX_EPIC_MANAGED_APP_PATHS` | Epic | Dossiers d'apps gérées Epic séparés par `;` si la détection automatique échoue | Optionnel |
| `LUDUX_EPIC_WEBCACHE_PATHS` | Epic | Dossiers `webcache*` Epic Launcher séparés par `;` si la détection automatique échoue | Optionnel |
| `RAWG_API_KEY` | RAWG | Métadonnées publiques de jeux | Actif manuel |
| `IGDB_CLIENT_ID` | IGDB | Authentification Twitch/IGDB | A venir |
| `IGDB_CLIENT_SECRET` | IGDB | Authentification Twitch/IGDB | A venir |
| `XBOX_CLIENT_ID` | Xbox | OAuth/accès Xbox Services si disponible | À étudier |
| `XBOX_CLIENT_SECRET` | Xbox | OAuth/accès Xbox Services si disponible | À étudier |
| `PLAYSTATION_CLIENT_ID` | PlayStation | Accès partenaire si obtenu | À étudier |
| `PLAYSTATION_CLIENT_SECRET` | PlayStation | Accès partenaire si obtenu | À étudier |
| `NINTENDO_CLIENT_ID` | Nintendo | Accès développeur/partenaire si obtenu | À étudier |
| `NINTENDO_CLIENT_SECRET` | Nintendo | Accès développeur/partenaire si obtenu | À étudier |
| `GOG_CLIENT_ID` | GOG | Accès GOG Galaxy si disponible | À étudier |
| `GOG_CLIENT_SECRET` | GOG | Accès GOG Galaxy si disponible | À étudier |
| `EPIC_CLIENT_ID` | Epic | Accès Epic/EOS OAuth si disponible | À venir |
| `EPIC_CLIENT_SECRET` | Epic | Accès Epic/EOS OAuth si disponible | À venir |

## Statut par Plateforme

| Plateforme | Données visées | Ce qu'il faut récupérer | Source officielle | Décision Ludux |
| --- | --- | --- | --- | --- |
| Steam | Bibliothèque, temps de jeu, jaquettes, jeux installés | Web API key, SteamID64, détails de jeux visibles, dossier Steam local | Steam Web API, IPlayerService, fichiers Steam locaux | Intégration active avec fallback local |
| RAWG | Métadonnées catalogue | Clé API RAWG | RAWG API docs | Intégration active en enrichissement manuel |
| IGDB | Métadonnées catalogue | Twitch Client ID, Client Secret, token OAuth app | IGDB API docs, Twitch OAuth | Bon candidat pour jaquettes/studios/genres |
| Xbox | Succès, activité, profil | Accès Microsoft/Xbox Services autorisé | Microsoft Learn Xbox Services | À garder pour plus tard, accès plus contraint |
| PlayStation | Trophées, profil, activité | Accès PlayStation Partners si accepté | PlayStation Partners | À garder pour plus tard, pas de route publique simple |
| Nintendo | Catalogue/profil Switch | Accès Nintendo Developer Portal si accepté | Nintendo Developer Portal | À garder pour plus tard, pas de route publique simple |
| GOG | Succès/stats Galaxy | Accès GOG Galaxy SDK ou route officielle exploitable | GOG Developer Docs | À étudier après Steam/métadonnées |
| Epic | Jeux possédés/installés, future connexion compte | Manifests `.item`, `LauncherInstalled.dat`, apps gérées, cache local du launcher, puis client Epic/EOS OAuth avec consentement | Epic Online Services docs | Import local actif avec fallback cache, OAuth/EOS à étudier pour la connexion publique |

## Ordre Recommandé

1. Stabiliser Steam avec une vraie clé utilisateur.
2. Préparer une passerelle Ludux Connect pour les secrets de production.
3. Ajouter un écran de correspondance manuelle lorsque plusieurs jeux ont le même titre.
4. Étendre RAWG avec genres, screenshots et boutiques, puis comparer avec IGDB.
5. Étudier Xbox, PlayStation, Nintendo, GOG et Epic seulement si un accès officiel ou acceptable est disponible.

## Liens de Référence

- Steam Web API key : https://steamcommunity.com/dev/apikey
- Steam IPlayerService : https://partner.steamgames.com/doc/webapi/iplayerservice
- Steam privacy settings : https://help.steampowered.com/en/faqs/view/588C-C67D-0251-C276
- RAWG API : https://rawg.io/apidocs
- IGDB API : https://api-docs.igdb.com/
- Twitch OAuth : https://dev.twitch.tv/docs/authentication/getting-tokens-oauth/
- Microsoft Xbox Services : https://learn.microsoft.com/en-us/gaming/gdk/docs/services/player-data/achievements/achievements-manager/live-achievements-manager-overview
- PlayStation Partners : https://partners.playstation.net/
- Nintendo Developer Portal : https://developer.nintendo.com/
- GOG Developer Docs : https://docs.gog.com/sdk/
- Epic Online Services Web API : https://dev.epicgames.com/docs/web-api-ref/web-api-introduction
- Référence non officielle Epic Store API : https://github.com/SD4RK/epicstore_api
