# Ludux Connect

Ludux Connect permet aux joueurs de relier Steam sans saisir de SteamID64 ni de clé API
dans l'application.

## Côté joueur

Le bouton **Se connecter avec Steam** ouvre le navigateur sur Steam. Après validation,
le joueur revient dans Ludux et peut lancer la synchronisation. Ludux ne reçoit jamais
le mot de passe Steam.

La bibliothèque Steam et les détails de jeux doivent être visibles dans les paramètres
de confidentialité Steam. Les fichiers locaux restent utilisés pour les jeux installés,
les catégories et les activités disponibles sur l'ordinateur.

## Côté application

L'application conserve uniquement un jeton Ludux Connect dans `ExternalAccount`. Le
jeton est chiffré avec `safeStorage` quand Windows rend ce service disponible. La clé
Steam reste dans l'environnement du serveur.

Une configuration locale avancée reste disponible pour le développement ou pour les
utilisateurs qui préfèrent leur propre clé Web API.

## Avant la mise en production

- révoquer toute clé Steam déjà partagée ;
- créer une nouvelle clé associée au domaine public du service ;
- déployer Ludux Connect derrière HTTPS ;
- définir `LUDUX_CONNECT_URL` dans la construction de l'application ;
- tester une connexion, une expiration et une synchronisation avec un profil privé ;
- surveiller les réponses `429` sans enregistrer les URL contenant la clé serveur.

Les détails techniques de déploiement se trouvent dans `connect/README.md`.
