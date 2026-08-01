# Publier Ludux pour Windows

## Préparer GitHub

La variable de dépôt `LUDUX_CONNECT_URL` doit contenir l’adresse HTTPS publique de Ludux Connect.

Pour signer les installateurs, ajoutez ces secrets dans les paramètres GitHub Actions du dépôt :

- `WINDOWS_CERTIFICATE` : certificat de signature de code au format PFX, encodé en Base64 ;
- `WINDOWS_CERTIFICATE_PASSWORD` : mot de passe du certificat.

Sans ces secrets, une préversion peut encore être construite mais elle restera non signée. Dès que le certificat est configuré, le workflow refuse automatiquement une release dont la signature Authenticode n’est pas valide.

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

Pour imposer une signature valide lors d’un contrôle local :

```powershell
$env:LUDUX_REQUIRE_SIGNED_RELEASE = '1'
npm run verify:release:win
```
