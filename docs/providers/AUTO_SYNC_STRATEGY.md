# Stratégie de Synchronisation Automatique

L'objectif produit est que les utilisateurs connectent leurs comptes de jeu et que Ludux synchronise automatiquement leur parcours.

## Principes

- La synchronisation doit rester optionnelle.
- Les données locales restent utilisables sans compte externe.
- Les secrets ne doivent jamais être renvoyés au renderer.
- Chaque plateforme doit passer par un adaptateur isolé dans `src/providers`.
- Ludux ne doit pas simuler une intégration non officielle par scraping fragile.
- Les erreurs réseau doivent être historisées dans `SyncData` sans bloquer l'application.

## État Actuel

Steam est le premier provider actif :

- connexion locale avec SteamID64 ;
- clé API stockée chiffrée quand Electron le permet, ou lue depuis `.env` ;
- synchronisation manuelle depuis les paramètres ;
- synchronisation automatique au démarrage et à intervalle régulier ;
- import des jeux, jaquettes, plateforme Steam, temps total, catégories, DLC et succès publics ;
- validation SteamID64 et erreurs réseau explicites ;
- fallback local via `libraryfolders.vdf`, `appmanifest_*.acf` et `localconfig.vdf`.

Epic et GOG importent les jeux installés détectés localement avant les enrichissements catalogue.

RAWG et IGDB sont les providers de métadonnées actifs :

- connexion locale avec une clé API RAWG ou fallback `RAWG_API_KEY` ;
- connexion locale avec Client ID et Client Secret IGDB ou fallback `.env` ;
- enrichissement manuel depuis les paramètres ;
- enrichissement automatique dans `Synchroniser tout`, après Steam/Epic/GOG ;
- ajout des champs manquants : description, jaquette, date, développeur, éditeur, site officiel et genres ;
- préservation des données déjà saisies dans Ludux.

Les autres providers restent au stade de préparation tant qu'un accès officiel exploitable n'est pas branché.

## Stratégie Publique

La clé Steam saisie dans l'interface est acceptable pour le développement local et les tests personnels.

Pour une v1 publique, Ludux ne doit pas embarquer une clé Steam commune dans l'application desktop. Une clé incluse côté client serait récupérable. La cible est donc :

- une connexion utilisateur Steam via un service contrôlé par Ludux ;
- une clé Steam conservée côté backend, jamais dans le bundle desktop ;
- une synchronisation locale qui passe par ce service lorsque le mode public est activé ;
- un mode local avancé qui reste possible pour les utilisateurs souhaitant saisir leur propre clé.

## Contraintes Plateformes

| Plateforme | Connexion utilisateur | Bibliothèque utilisateur | Position Ludux |
| --- | --- | --- | --- |
| Steam | Clé Web API + SteamID64 + fichiers locaux | Oui si les détails de jeux sont visibles, avec fallback jeux installés | Actif |
| Epic | OAuth/EOS selon projet | Pas de route publique simple pour toute la bibliothèque EGS | Import local actif, officiel à préparer |
| GOG | GOG Galaxy SDK / accès développeur | SDK orienté jeu, pas import universel simple | Import local actif, officiel à préparer |
| Xbox | Microsoft/Xbox Services | Accès contraint par programme développeur | Attendre accès officiel |
| PlayStation | PlayStation Partners | Accès partenaire | Attendre accès officiel |
| Nintendo | Nintendo Developer Portal | Accès partenaire | Attendre accès officiel |
| RAWG | Clé API | Métadonnées publiques, pas compte joueur | Actif |
| IGDB | Twitch OAuth app token | Métadonnées publiques, pas compte joueur | Actif |

## Architecture Cible

```text
Compte utilisateur
  -> Paramètres Ludux
  -> ProviderConnection
  -> Adaptateur provider
  -> Données normalisées
  -> Import local
  -> ExternalGame / SyncData
```

## Prochaines Étapes

1. Préparer Ludux Connect pour éviter les clés Steam utilisateur dans la v1 publique.
2. Ajouter une file de synchronisation plus visible dans l'interface.
3. Créer un écran de résolution des correspondances quand un jeu externe ressemble à un jeu local.
4. Étendre RAWG/IGDB avec screenshots, boutiques et attribution visible si nécessaire.
5. Brancher Epic, GOG, Xbox, PlayStation ou Nintendo en mode compte lorsqu'un accès officiel exploitable est obtenu.
