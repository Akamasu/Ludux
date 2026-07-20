# Fichiers et Acces Plateformes

Ce document liste les fichiers, variables et acces a recuperer pour connecter les plateformes a Ludux.

Les secrets reels doivent rester dans `.env` ou etre saisis dans l'application. Ils ne doivent jamais etre commits.

## Fichiers Locaux

- `.env.example` : modele versionne des variables attendues.
- `.env` : fichier local ignore par Git pour les vraies cles et secrets.
- `src/providers/registry.ts` : registre visible dans l'interface.
- `src/providers/<provider>.ts` : adaptateur reseau isole par plateforme.
- `prisma/schema.prisma` : liens persistants entre jeux Ludux et jeux externes.

## Variables

| Variable | Plateforme | Usage | Statut |
| --- | --- | --- | --- |
| `STEAM_WEB_API_KEY` | Steam | Cle Web API pour lire la bibliotheque possedee | Actif |
| `STEAM_ID_64` | Steam | Identifiant du compte a connecter | Optionnel, saisie UI possible |
| `RAWG_API_KEY` | RAWG | Metadonnees publiques de jeux | A venir |
| `IGDB_CLIENT_ID` | IGDB | Authentification Twitch/IGDB | A venir |
| `IGDB_CLIENT_SECRET` | IGDB | Authentification Twitch/IGDB | A venir |
| `XBOX_CLIENT_ID` | Xbox | OAuth/acces Xbox Services si disponible | A etudier |
| `XBOX_CLIENT_SECRET` | Xbox | OAuth/acces Xbox Services si disponible | A etudier |
| `PLAYSTATION_CLIENT_ID` | PlayStation | Acces partenaire si obtenu | A etudier |
| `PLAYSTATION_CLIENT_SECRET` | PlayStation | Acces partenaire si obtenu | A etudier |
| `NINTENDO_CLIENT_ID` | Nintendo | Acces developpeur/partenaire si obtenu | A etudier |
| `NINTENDO_CLIENT_SECRET` | Nintendo | Acces developpeur/partenaire si obtenu | A etudier |
| `GOG_CLIENT_ID` | GOG | Acces GOG Galaxy si disponible | A etudier |
| `GOG_CLIENT_SECRET` | GOG | Acces GOG Galaxy si disponible | A etudier |
| `EPIC_CLIENT_ID` | Epic | Acces Epic/EOS si disponible | A etudier |
| `EPIC_CLIENT_SECRET` | Epic | Acces Epic/EOS si disponible | A etudier |

## Statut par Plateforme

| Plateforme | Donnees visees | Ce qu'il faut recuperer | Source officielle | Decision Ludux |
| --- | --- | --- | --- | --- |
| Steam | Bibliotheque, temps de jeu, jaquettes | Web API key, SteamID64, details de jeux visibles | Steam Web API, IPlayerService | Integration active en sync manuelle |
| RAWG | Metadonnees catalogue | Cle API RAWG | RAWG API docs | Bon candidat pour enrichir les fiches |
| IGDB | Metadonnees catalogue | Twitch Client ID, Client Secret, token OAuth app | IGDB API docs, Twitch OAuth | Bon candidat pour jaquettes/studios/genres |
| Xbox | Succes, activite, profil | Acces Microsoft/Xbox Services autorise | Microsoft Learn Xbox Services | A garder pour plus tard, acces plus contraint |
| PlayStation | Trophees, profil, activite | Acces PlayStation Partners si accepte | PlayStation Partners | A garder pour plus tard, pas de route publique simple |
| Nintendo | Catalogue/profil Switch | Acces Nintendo Developer Portal si accepte | Nintendo Developer Portal | A garder pour plus tard, pas de route publique simple |
| GOG | Succes/stats Galaxy | Acces GOG Galaxy SDK ou route officielle exploitable | GOG Developer Docs | A etudier apres Steam/metadonnees |
| Epic | Compte/services Epic | Client Epic/EOS selon cas autorise | Epic Online Services docs | A etudier apres Steam/metadonnees |

## Ordre Recommande

1. Stabiliser Steam avec une vraie cle utilisateur.
2. Ajouter un provider de metadonnees : RAWG ou IGDB.
3. Ajouter un ecran de correspondance manuelle lorsque plusieurs jeux ont le meme titre.
4. Etudier Xbox, PlayStation, Nintendo, GOG et Epic seulement si un acces officiel ou acceptable est disponible.

## Liens de Reference

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
