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

## Donnees Importees

- Jeux Steam manquants dans Ludux.
- Jaquette Steam `header.jpg`.
- Plateforme `Steam`.
- Lien `ExternalGame` entre AppID Steam et jeu Ludux.
- Temps total Steam dans une session dediee.

## Limites Actuelles

- La synchronisation est manuelle.
- La correspondance automatique par titre peut se tromper si deux jeux ont un nom identique.
- Les succes Steam ne sont pas encore importes.
- Les jeux masques par la confidentialite Steam peuvent ne pas remonter.

## Liens

- Steam Web API key : https://steamcommunity.com/dev/apikey
- Steam IPlayerService : https://partner.steamgames.com/doc/webapi/iplayerservice
- Steam privacy settings : https://help.steampowered.com/en/faqs/view/588C-C67D-0251-C276
