# Strategie de Synchronisation Automatique

L'objectif produit est que les utilisateurs connectent leurs comptes de jeu et que Ludux synchronise automatiquement leur parcours.

## Principes

- La synchronisation doit rester optionnelle.
- Les donnees locales restent utilisables sans compte externe.
- Les secrets ne doivent jamais etre renvoyes au renderer.
- Chaque plateforme doit passer par un adaptateur isole dans `src/providers`.
- Ludux ne doit pas simuler une integration non officielle par scraping fragile.
- Les erreurs reseau doivent etre historisees dans `SyncData` sans bloquer l'application.

## Etat Actuel

Steam est le premier provider actif :

- connexion locale avec SteamID64 ;
- cle API stockee chiffree quand Electron le permet, ou lue depuis `.env` ;
- synchronisation manuelle depuis les parametres ;
- synchronisation automatique au demarrage et a intervalle regulier ;
- import des jeux, jaquettes, plateforme Steam et temps total.
- validation SteamID64 et erreurs reseau explicites.

RAWG est le premier provider de metadonnees actif :

- connexion locale avec une cle API RAWG ou fallback `RAWG_API_KEY` ;
- enrichissement manuel depuis les parametres ;
- ajout des champs manquants : description, jaquette, date, developpeur, editeur et site officiel ;
- preservation des donnees deja saisies dans Ludux ;
- pas d'auto-sync en v0.23.0 pour eviter de consommer le quota API sans action explicite.

Les autres providers restent au stade de preparation tant qu'un acces officiel exploitable n'est pas branche.

## Strategie Publique

La cle Steam saisie dans l'interface est acceptable pour le developpement local et les tests personnels.

Pour une v1 publique, Ludux ne doit pas embarquer une cle Steam commune dans l'application desktop. Une cle incluse cote client serait recuperable. La cible est donc :

- une connexion utilisateur Steam via un service controle par Ludux ;
- une cle Steam conservee cote backend, jamais dans le bundle desktop ;
- une synchronisation locale qui passe par ce service lorsque le mode public est active ;
- un mode local avance qui reste possible pour les utilisateurs souhaitant saisir leur propre cle.

## Contraintes Plateformes

| Plateforme | Connexion utilisateur | Bibliotheque utilisateur | Position Ludux |
| --- | --- | --- | --- |
| Steam | Cle Web API + SteamID64 | Oui si les details de jeux sont visibles | Actif |
| Epic | OAuth/EOS selon projet | Pas de route publique simple pour toute la bibliotheque EGS | Attendre acces officiel |
| GOG | GOG Galaxy SDK / acces developpeur | SDK oriente jeu, pas import universel simple | Attendre acces officiel |
| Xbox | Microsoft/Xbox Services | Acces contraint par programme developpeur | Attendre acces officiel |
| PlayStation | PlayStation Partners | Acces partenaire | Attendre acces officiel |
| Nintendo | Nintendo Developer Portal | Acces partenaire | Attendre acces officiel |
| RAWG | Cle API | Metadonnees publiques, pas compte joueur | Actif manuel |
| IGDB | Twitch OAuth app token | Metadonnees publiques, pas compte joueur | Bon candidat metadata |

## Architecture Cible

```text
Compte utilisateur
  -> Parametres Ludux
  -> ProviderConnection
  -> Adaptateur provider
  -> Donnees normalisees
  -> Import local
  -> ExternalGame / SyncData
```

## Prochaines Etapes

1. Tester Steam avec une vraie cle utilisateur et un vrai profil visible.
2. Ajouter une file de synchronisation plus visible dans l'interface.
3. Preparer Ludux Connect pour eviter les cles Steam utilisateur dans la v1 publique.
4. Creer un ecran de resolution des correspondances quand un jeu externe ressemble a un jeu local.
5. Etendre RAWG avec genres, screenshots, boutiques et attribution visible si necessaire.
6. Comparer IGDB pour les jaquettes/studios/genres avant de le brancher.
7. Brancher Epic, GOG, Xbox, PlayStation ou Nintendo uniquement lorsqu'un acces officiel exploitable est obtenu.
