# Configuration IGDB

IGDB sert à enrichir les fiches locales Ludux avec des métadonnées publiques :
description, jaquette, date de sortie, développeur, éditeur et genres.

La synchronisation IGDB ne connecte pas un compte joueur. Elle complète les jeux
déjà présents dans Ludux, comme RAWG.

## Récupérer les accès

1. Créer ou ouvrir un compte Twitch Developer.
2. Créer une application dans le portail Twitch Developer.
3. Choisir le type `Confidential` pour pouvoir générer un secret.
4. Conserver le `Client ID` et le `Client Secret`.

## Option 1 : identifiants dans `.env`

Copier `.env.example` vers `.env`, puis renseigner :

```env
IGDB_CLIENT_ID="votre-client-id"
IGDB_CLIENT_SECRET="votre-client-secret"
```

Dans Ludux, `Synchroniser tout` pourra utiliser IGDB automatiquement.

## Option 2 : identifiants saisis dans Ludux

Dans Ludux :

1. Ouvrir `Paramètres`.
2. Sélectionner `IGDB`.
3. Saisir le `Client ID` dans le champ identifiant.
4. Coller le `Client Secret` dans le champ de clé.
5. Cliquer sur `Enregistrer`, puis `Synchroniser`.

Le secret est masqué côté interface. Electron chiffre le secret avec
`safeStorage` quand le chiffrement système est disponible.

## Données modifiées

IGDB enrichit uniquement les jeux actifs qui ont au moins un champ manquant :

- description ;
- jaquette ;
- date de sortie ;
- développeur ;
- éditeur ;
- site officiel, quand IGDB en fournit un ;
- genres.

Les champs déjà renseignés dans Ludux ne sont pas écrasés.

Chaque correspondance IGDB est enregistrée dans `ExternalGame` pour limiter les
doublons lors des prochaines synchronisations.

## Limites

- La recherche se fait automatiquement par titre.
- La fiche du jeu permet de confirmer ou de retirer une correspondance douteuse.
- La recherche et la réaffectation manuelles vers une autre fiche ne sont pas encore disponibles.
- Les requêtes IGDB sont limitées ; la synchronisation reste donc volontairement
  contrôlée depuis les paramètres.
