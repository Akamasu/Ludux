# Configuration Steam

Steam est la premiere integration reseau active de Ludux.

Depuis `v0.23.1`, Steam combine deux sources :

- Steam Web API quand une cle est disponible ;
- fichiers locaux Steam quand Ludux trouve une installation Steam sur la machine.

## Fichiers

- `.env.example` : modele a copier en `.env` si tu veux stocker la cle hors interface.
- `.env` : fichier local ignore par Git.
- `src/providers/steam.ts` : adaptateur qui appelle Steam et normalise les jeux.
- `src/services/settings.service.ts` : import dans la base locale Ludux.
- `steamapps/libraryfolders.vdf` : liste des bibliotheques Steam locales.
- `steamapps/appmanifest_*.acf` : jeux installes, dossier, taille, dernier lancement et mise a jour.
- `userdata/<compte>/config/localconfig.vdf` : activite locale par AppID quand Steam l'a ecrite.

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

## Option C : Fichiers Locaux Steam

Si Steam est installe sur la machine, Ludux essaie de detecter automatiquement :

- `C:\Program Files (x86)\Steam`
- `C:\Program Files\Steam`
- les bibliotheques declarees dans `steamapps/libraryfolders.vdf`

Il est possible de forcer les chemins dans `.env` :

```env
LUDUX_STEAM_ROOT_PATH="C:\Program Files (x86)\Steam"
LUDUX_STEAM_LIBRARY_PATHS="E:\SteamLibrary;D:\SteamLibrary"
```

Le mode local permet de synchroniser les jeux installes meme sans cle API Steam.
Une cle reste utile pour recuperer toute la bibliotheque du compte, y compris les
jeux non installes.

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

La synchronisation manuelle peut utiliser les fichiers locaux Steam sans cle API.

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
- Dernier lancement local quand il est present dans les manifests ou `localconfig.vdf`.
- Jeux installes detectes depuis les manifests locaux.

## Limites Actuelles

- La synchronisation est automatique, mais peut aussi etre relancee manuellement.
- La correspondance automatique par titre peut se tromper si deux jeux ont un nom identique.
- Les succes Steam ne sont pas encore importes.
- Les jeux masques par la confidentialite Steam peuvent ne pas remonter.
- Les manifests locaux ne contiennent que les jeux installes.
- Le temps total local depend de `localconfig.vdf` ; si Steam ne l'a pas ecrit, l'API reste la meilleure source.

## Diagnostic

- `SteamID64 invalide` : verifier que l'identifiant contient 17 chiffres.
- `Verifiez la cle API Steam` : la cle est absente, incorrecte ou refusee.
- `bibliotheque Steam locale introuvable` : verifier `LUDUX_STEAM_ROOT_PATH` ou `LUDUX_STEAM_LIBRARY_PATHS`.
- `Steam limite temporairement les requetes` : attendre avant de relancer.
- `Aucun jeu Steam recu` : verifier le SteamID64 et la visibilite des details de jeux.
- `Providers disponibles dans la version Electron` : utiliser la fenetre Electron ouverte par `npm run dev`, pas l'URL Vite dans le navigateur. Si le message apparait dans Electron, lancer `npm run smoke:electron-preload`.
- `NODE_MODULE_VERSION` ou `better_sqlite3.node` : lancer `npm run rebuild:electron`, puis redemarrer Ludux.

## Liens

- Steam Web API key : https://steamcommunity.com/dev/apikey
- Steam IPlayerService : https://partner.steamgames.com/doc/webapi/iplayerservice
- Steam privacy settings : https://help.steampowered.com/en/faqs/view/588C-C67D-0251-C276
