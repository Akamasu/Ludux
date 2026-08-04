# Politique de confidentialité de Ludux

Dernière mise à jour : 4 août 2026.

## Principes

Ludux est une application locale. Elle ne contient ni télémétrie, ni publicité, ni outil d’analyse comportementale. La bibliothèque, les notes, les chroniques, les sessions, les succès, les DLC, les captures référencées et les sauvegardes restent dans le profil Windows de l’utilisateur.

Ludux ne copie pas les fichiers des jeux. Il lit seulement les fichiers, manifests, bases locales et entrées de registre nécessaires pour identifier les plateformes et les jeux installés.

## Données conservées sur l’ordinateur

L’application peut enregistrer localement :

- les informations de bibliothèque et les identifiants de jeux ;
- les temps de jeu, succès, DLC et dates associés ;
- les notes, chroniques, évaluations et autres contenus saisis par l’utilisateur ;
- les chemins détectés pour Steam, Epic Games, GOG, EA App, Ubisoft Connect et Battle.net ;
- les jaquettes et métadonnées placées dans un cache local limité ;
- les jetons et clés configurés par l’utilisateur, chiffrés avec le mécanisme sécurisé disponible dans Electron et Windows ;
- les sauvegardes SQLite créées par Ludux.

Ces données peuvent être supprimées depuis Ludux ou en supprimant son dossier de données local. La désinstallation ne supprime pas automatiquement ce dossier afin d’éviter une perte accidentelle de la bibliothèque.

## Connexions externes

Les connexions suivantes sont utilisées uniquement pour les fonctions demandées ou configurées par l’utilisateur :

- **Steam et Ludux Connect** : SteamID64, nom public, bibliothèque, temps de jeu et succès publics. Ludux Connect conserve les sessions d’authentification en mémoire pendant dix minutes et émet un jeton valable trente jours. Il ne reçoit jamais le mot de passe Steam. Le jeton est ensuite conservé chiffré sur l’ordinateur.
- **RAWG et IGDB/Twitch** : titres ou identifiants de jeux envoyés pour rechercher des descriptions, dates, genres, studios et jaquettes.
- **Steam Store et les CDN d’images** : identifiants de jeux utilisés pour récupérer les métadonnées, DLC et images disponibles.
- **GitHub Releases** : vérification et téléchargement automatiques des nouvelles versions de Ludux.

Ludux Connect est actuellement hébergé par Render. Comme tout hébergeur HTTP, Render peut traiter l’adresse IP et des journaux techniques nécessaires au fonctionnement et à la sécurité du service. Ludux n’ajoute aucun suivi publicitaire à ces échanges.

Les services externes appliquent leurs propres politiques : [Steam](https://store.steampowered.com/privacy_agreement/), [RAWG](https://rawg.io/privacy_policy), [Twitch/IGDB](https://www.twitch.tv/p/fr-fr/legal/privacy-notice/), [GitHub](https://docs.github.com/fr/site-policy/privacy-policies/github-general-privacy-statement) et [Render](https://render.com/privacy).

## Partage et vente

Ludux ne vend aucune donnée personnelle et ne transmet pas la bibliothèque à son mainteneur. Les seules transmissions sont celles nécessaires aux synchronisations et téléchargements décrits ci-dessus.

## Contrôle de l’utilisateur

L’utilisateur peut déconnecter une plateforme, vider le cache, exporter sa bibliothèque, créer ou restaurer une sauvegarde et supprimer les données locales. La visibilité des données renvoyées par Steam dépend également des paramètres de confidentialité du compte Steam.

## Contact

Les questions ou demandes concernant cette politique peuvent être déposées dans les [issues du dépôt Ludux](https://github.com/Akamasu/Ludux/issues).
