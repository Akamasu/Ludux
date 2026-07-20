# Configuration Steam

Steam est la premiere integration reseau active de Ludux.

## Fichiers

- `.env.example` : modele a copier en `.env` si tu veux stocker la cle hors interface.
- `.env` : fichier local ignore par Git.
- `src/providers/steam.ts` : adaptateur qui appelle Steam et normalise les jeux.
- `src/services/settings.service.ts` : import dans la base locale Ludux.

## Informations a Recuperer

1. Une cle Steam Web API utilisateur.
2. Le SteamID64 du compte a synchroniser.
3. Un profil Steam dont les details de jeux sont visibles pour que la bibliotheque puisse etre lue.

Le SteamID64 est valide par Ludux avant enregistrement. Il doit contenir 17 chiffres.

## Option A : Cle dans l'Interface

Dans Ludux :

1. Ouvrir `Parametres`.
2. Choisir `Steam`.
3. Renseigner le `SteamID64`.
4. Renseigner la cle API Steam dans `Cle API Steam ou variable .env`.
5. Enregistrer.
6. Cliquer sur `Synchroniser`.

## Option B : Cle dans `.env`

Copier `.env.example` vers `.env`, puis renseigner :

```env
STEAM_WEB_API_KEY="votre-cle"
STEAM_ID_64="7656119..."
```

Dans Ludux, il faut quand meme enregistrer une connexion Steam avec le SteamID64.
La cle peut rester vide dans l'interface si `STEAM_WEB_API_KEY` est defini.

## Cle API et Version Publique

En developpement local, chaque testeur peut saisir sa propre cle Steam Web API.

Pour une version publique de Ludux, l'objectif n'est pas de demander une cle API a chaque utilisateur. Il faudra passer par une passerelle backend Ludux Connect :

- l'utilisateur connecte son compte Steam ;
- la cle applicative reste cote serveur ;
- l'application desktop ne contient jamais de cle commune recuperable ;
- le mode local avance peut rester disponible pour les utilisateurs qui veulent garder leur propre cle.

## Synchronisation Automatique

Depuis `v0.21.0`, Ludux synchronise Steam automatiquement :

- une premiere fois apres le demarrage de l'application ;
- puis periodiquement toutes les 120 minutes par defaut ;
- uniquement si une connexion Steam et une cle API sont disponibles.

L'intervalle peut etre ajuste dans `.env` :

```env
LUDUX_AUTO_SYNC_INTERVAL_MINUTES="120"
```

La valeur minimale acceptee est 15 minutes.

## Donnees Importees

- Jeux Steam manquants dans Ludux.
- Jaquette Steam `header.jpg`.
- Plateforme `Steam`.
- Lien `ExternalGame` entre AppID Steam et jeu Ludux.
- Temps total Steam dans une session dediee.

## Limites Actuelles

- La synchronisation est automatique, mais peut aussi etre relancee manuellement.
- La correspondance automatique par titre peut se tromper si deux jeux ont un nom identique.
- Les succes Steam ne sont pas encore importes.
- Les jeux masques par la confidentialite Steam peuvent ne pas remonter.

## Diagnostic

- `SteamID64 invalide` : verifier que l'identifiant contient 17 chiffres.
- `Verifiez la cle API Steam` : la cle est absente, incorrecte ou refusee.
- `Steam limite temporairement les requetes` : attendre avant de relancer.
- `Aucun jeu Steam recu` : verifier le SteamID64 et la visibilite des details de jeux.
- `Providers disponibles dans la version Electron` : utiliser la fenetre Electron ouverte par `npm run dev`, pas l'URL Vite dans le navigateur. Si le message apparait dans Electron, lancer `npm run smoke:electron-preload`.
- `NODE_MODULE_VERSION` ou `better_sqlite3.node` : lancer `npm run rebuild:electron`, puis redemarrer Ludux.

## Liens

- Steam Web API key : https://steamcommunity.com/dev/apikey
- Steam IPlayerService : https://partner.steamgames.com/doc/webapi/iplayerservice
- Steam privacy settings : https://help.steampowered.com/en/faqs/view/588C-C67D-0251-C276
