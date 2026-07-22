# Configuration Steam

Steam est la première intégration réseau active de Ludux.

Depuis `v0.23.1`, Steam combine deux sources :

- Steam Web API quand une clé est disponible ;
- fichiers locaux Steam quand Ludux trouve une installation Steam sur la machine.

## Fichiers

- `.env.example` : modèle à copier en `.env` si tu veux stocker la clé hors interface.
- `.env` : fichier local ignoré par Git.
- `src/providers/steam.ts` : adaptateur qui appelle Steam et normalise les jeux.
- `src/services/settings.service.ts` : import dans la base locale Ludux.
- `steamapps/libraryfolders.vdf` : liste des bibliothèques Steam locales.
- `steamapps/appmanifest_*.acf` : jeux installés, dossier, taille, dernier lancement et mise à jour.
- `userdata/<compte>/config/localconfig.vdf` : activité locale par AppID quand Steam l'a écrite.

## Informations à Récupérer

1. Une clé Steam Web API utilisateur.
2. Le SteamID64 du compte à synchroniser.
3. Un profil Steam dont les détails de jeux sont visibles pour que la bibliothèque puisse être lue.

Le SteamID64 est valide par Ludux avant enregistrement. Il doit contenir 17 chiffres.

## Option A : Clé dans l'Interface

Dans Ludux :

1. Ouvrir `Paramètres`.
2. Choisir `Steam`.
3. Renseigner le `SteamID64`.
4. Renseigner la clé API Steam dans `Clé API Steam ou variable .env`.
5. Enregistrer.
6. Cliquer sur `Synchroniser`.

## Option B : Clé dans `.env`

Copier `.env.example` vers `.env`, puis renseigner :

```env
STEAM_WEB_API_KEY="votre-cle"
STEAM_ID_64="7656119..."
```

Dans Ludux, il faut quand même enregistrer une connexion Steam avec le SteamID64.
La clé peut rester vide dans l'interface si `STEAM_WEB_API_KEY` est défini.

## Option C : Fichiers Locaux Steam

Si Steam est installé sur la machine, Ludux essaie de détecter automatiquement :

- `C:\Program Files (x86)\Steam`
- `C:\Program Files\Steam`
- les bibliothèques déclarées dans `steamapps/libraryfolders.vdf`

Il est possible de forcer les chemins dans `.env` :

```env
LUDUX_STEAM_ROOT_PATH="C:\Program Files (x86)\Steam"
LUDUX_STEAM_LIBRARY_PATHS="E:\SteamLibrary;D:\SteamLibrary"
```

Le mode local permet de synchroniser les jeux installés même sans clé API Steam.
Une clé reste utile pour récupérer toute la bibliothèque du compte, y compris les
jeux non installés.

## Clé API et Version Publique

En développement local, chaque testeur peut saisir sa propre clé Steam Web API.

Pour une version publique de Ludux, l'objectif n'est pas de demander une clé API à chaque utilisateur. Il faudra passer par une passerelle backend Ludux Connect :

- l'utilisateur connecte son compte Steam ;
- la clé applicative reste côté serveur ;
- l'application desktop ne contient jamais de clé commune récupérable ;
- le mode local avancé peut rester disponible pour les utilisateurs qui veulent garder leur propre clé.

## Synchronisation Automatique

Depuis `v0.21.0`, Ludux synchronise Steam automatiquement :

- une première fois après le démarrage de l'application ;
- puis périodiquement toutes les 120 minutes par défaut ;
- uniquement si une connexion Steam et une clé API sont disponibles.

La synchronisation manuelle peut utiliser les fichiers locaux Steam sans clé API.

L'intervalle peut être ajusté dans `.env` :

```env
LUDUX_AUTO_SYNC_INTERVAL_MINUTES="120"
```

La valeur minimale acceptée est 15 minutes.

## Données Importées

- Jeux Steam manquants dans Ludux.
- Jaquette Steam `header.jpg`.
- Plateforme `Steam`.
- Lien `ExternalGame` entre AppID Steam et jeu Ludux.
- Temps total Steam dans une session dédiée.
- Dernier lancement local quand il est present dans les manifests ou `localconfig.vdf`.
- Jeux installés détectés depuis les manifests locaux.
- Succès publics disponibles via l'API Steam.

## Limites Actuelles

- La synchronisation est automatique, mais peut aussi être relancée manuellement.
- La correspondance automatique par titre peut se tromper si deux jeux ont un nom identique.
- Les succès Steam dépendent de la visibilité publique et de la disponibilité des schémas Steam.
- Les jeux masqués par la confidentialité Steam peuvent ne pas remonter.
- Les manifests locaux ne contiennent que les jeux installés.
- Le temps total local dépend de `localconfig.vdf` ; si Steam ne l'a pas écrit, l'API reste la meilleure source.

## Diagnostic

- `SteamID64 invalide` : vérifier que l'identifiant contient 17 chiffres.
- `Vérifiez la clé API Steam` : la clé est absente, incorrecte ou refusée.
- `bibliothèque Steam locale introuvable` : vérifier `LUDUX_STEAM_ROOT_PATH` ou `LUDUX_STEAM_LIBRARY_PATHS`.
- `Steam limite temporairement les requêtes` : attendre avant de relancer.
- `Aucun jeu Steam reçu` : vérifier le SteamID64 et la visibilité des détails de jeux.
- `Providers disponibles dans la version Electron` : utiliser la fenêtre Electron ouverte par `npm run dev`, pas l'URL Vite dans le navigateur. Si le message apparaît dans Electron, lancer `npm run smoke:electron-preload`.
- `NODE_MODULE_VERSION` ou `better_sqlite3.node` : lancer `npm run rebuild:electron`, puis redémarrer Ludux.

## Liens

- Steam Web API key : https://steamcommunity.com/dev/apikey
- Steam IPlayerService : https://partner.steamgames.com/doc/webapi/iplayerservice
- Steam privacy settings : https://help.steampowered.com/en/faqs/view/588C-C67D-0251-C276
