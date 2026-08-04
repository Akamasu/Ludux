# Publier Ludux pour Windows

## Coût et signature

Le processus actuel utilise uniquement des outils gratuits ou open source. Aucune dépense ne doit être engagée sans accord explicite du propriétaire du projet.

L’objectif est d’utiliser le programme gratuit de SignPath Foundation pour les projets open source. Tant que la candidature n’est pas acceptée, les installateurs restent non signés et sont publiés avec leur empreinte SHA-256.

Les certificats commerciaux et services de signature payants constituent une solution de secours uniquement. Ils ne sont ni configurés ni requis dans le dépôt.

## Préparer SignPath

Avant la candidature :

1. conserver le dépôt et les workflows de build publics ;
2. activer la double authentification sur les comptes GitHub responsables ;
3. maintenir la licence GPL-3.0, la politique de confidentialité et la politique de signature ;
4. exécuter `npm run verify:open-source` et corriger tout actif ou toute licence non documentée ;
5. publier au moins une version construite automatiquement dans le format destiné à être signé ;
6. demander l’admission depuis [signpath.org](https://signpath.org/).

Après acceptation, l’action GitHub SignPath devra être ajoutée au workflow de release avec les identifiants fournis par SignPath. La publication devra utiliser uniquement l’artefact retourné et signé.

## Publier une version

1. Mettre à jour `version` dans `package.json` et `package-lock.json`.
2. Exécuter `npm run check`.
3. Créer et pousser un tag identique à la version, par exemple `v1.0.0`.
4. Le workflow `Publier Ludux pour Windows` construit et publie l’installateur, son blockmap, `latest.yml` et son empreinte SHA-256.

Le tag et la version du paquet doivent correspondre exactement. Les mises à jour automatiques utilisent ensuite les fichiers de la release GitHub.

## Vérifier localement

Après `npm run package:win` :

```powershell
npm run verify:release:win
npm run e2e:electron:packaged
```

Le contrôle indique explicitement si l’installateur est signé ou non. Après intégration de SignPath, le workflow devra refuser toute release dont la signature Authenticode n’est pas valide.
