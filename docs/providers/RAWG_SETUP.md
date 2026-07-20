# Configuration RAWG

RAWG sert à enrichir les fiches locales Ludux avec des métadonnées publiques :
description, jaquette, date de sortie, développeur, éditeur et site officiel.

La synchronisation RAWG est manuelle en `v0.23.0`. Elle ne synchronise pas un
compte joueur et ne remplace pas Steam : elle complète les jeux déjà présents
dans Ludux.

## Récupérer une clé API

1. Ouvrir https://rawg.io/apidocs.
2. Créer ou connecter un compte RAWG.
3. Générer une clé API.
4. Conserver cette clé uniquement dans `.env` ou dans l'application.

## Option 1 : clé dans `.env`

Copier `.env.example` vers `.env`, puis renseigner :

```env
RAWG_API_KEY="votre-cle-rawg"
```

Dans Ludux :

1. Ouvrir `Paramètres`.
2. Sélectionner `RAWG`.
3. Garder l'identifiant `catalogue`.
4. Laisser le champ de clé vide si `RAWG_API_KEY` est déjà défini.
5. Cliquer sur `Enregistrer`, puis `Synchroniser`.

## Option 2 : clé saisie dans Ludux

Dans Ludux :

1. Ouvrir `Paramètres`.
2. Sélectionner `RAWG`.
3. Garder l'identifiant `catalogue`.
4. Coller la clé API RAWG dans le champ de clé.
5. Cliquer sur `Enregistrer`, puis `Synchroniser`.

La clé est masquée côté interface. Electron chiffre le secret avec `safeStorage`
quand le chiffrement système est disponible.

## Données modifiées

RAWG enrichit uniquement les jeux actifs qui ont au moins un champ manquant :

- description ;
- jaquette ;
- date de sortie ;
- développeur ;
- éditeur ;
- site officiel.

Les champs déjà renseignés dans Ludux ne sont pas écrasés.

Chaque correspondance RAWG est enregistrée dans `ExternalGame` pour limiter les
doublons lors des prochaines synchronisations.

Quand une fiche est liée à RAWG, Ludux affiche une attribution `Source RAWG`
avec un lien vers RAWG sur la fiche du jeu.

## Limites de la v0.23.0

- La recherche se fait automatiquement par titre exact/près du titre.
- Il n'y a pas encore d'écran de résolution manuelle des correspondances.
- La synchronisation est volontairement manuelle pour préserver le quota API.
- Les genres, screenshots, boutiques et crédits détaillés seront branchés plus tard.
