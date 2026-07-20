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

Les autres providers restent au stade de preparation tant qu'un acces officiel exploitable n'est pas branche.

## Contraintes Plateformes

| Plateforme | Connexion utilisateur | Bibliotheque utilisateur | Position Ludux |
| --- | --- | --- | --- |
| Steam | Cle Web API + SteamID64 | Oui si les details de jeux sont visibles | Actif |
| Epic | OAuth/EOS selon projet | Pas de route publique simple pour toute la bibliotheque EGS | Attendre acces officiel |
| GOG | GOG Galaxy SDK / acces developpeur | SDK oriente jeu, pas import universel simple | Attendre acces officiel |
| Xbox | Microsoft/Xbox Services | Acces contraint par programme developpeur | Attendre acces officiel |
| PlayStation | PlayStation Partners | Acces partenaire | Attendre acces officiel |
| Nintendo | Nintendo Developer Portal | Acces partenaire | Attendre acces officiel |
| RAWG | Cle API | Metadonnees publiques, pas compte joueur | Bon candidat metadata |
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
3. Ajouter RAWG ou IGDB pour enrichir les jeux importes avec genres, studios et dates.
4. Creer un ecran de resolution des correspondances quand un jeu externe ressemble a un jeu local.
5. Brancher Epic, GOG, Xbox, PlayStation ou Nintendo uniquement lorsqu'un acces officiel exploitable est obtenu.
