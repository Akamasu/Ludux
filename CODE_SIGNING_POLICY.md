# Politique de signature de code

Ludux prépare son admission au programme gratuit de signature pour projets open source de SignPath Foundation.

> Free code signing provided by SignPath.io, certificate by SignPath Foundation.

Cette mention s’appliquera aux versions signées après acceptation du projet. En attendant, les releases officielles restent non signées et sont accompagnées d’une empreinte SHA-256 vérifiée par GitHub Actions.

## Sources et releases officielles

- Dépôt source : [github.com/Akamasu/Ludux](https://github.com/Akamasu/Ludux)
- Releases : [github.com/Akamasu/Ludux/releases](https://github.com/Akamasu/Ludux/releases)
- Branche de référence : `main`

Seuls les fichiers produits par le workflow GitHub Actions du dépôt officiel peuvent être proposés à la signature. Une release correspond à un tag `vX.Y.Z` identique à la version déclarée dans `package.json`.

## Responsabilités

- Committer et reviewer : [Akamasu](https://github.com/Akamasu)
- Approver des demandes de signature : [Akamasu](https://github.com/Akamasu)

Les contributions externes doivent être examinées avant intégration. Les changements apportés aux workflows de publication, aux politiques SignPath et aux scripts de build restent sous la responsabilité du propriétaire du dépôt. La double authentification est requise pour les comptes disposant d’un accès d’écriture ou d’approbation.

## Processus de publication

1. GitHub Actions installe les dépendances depuis le fichier de verrouillage avec `npm ci`.
2. Le projet exécute les tests TypeScript, Prisma, SQLite et Electron, ainsi que les tests E2E.
3. L’installateur Windows est construit par un runner GitHub hébergé.
4. La version, le blockmap, l’application empaquetée et l’empreinte SHA-256 sont vérifiés.
5. Après admission à SignPath, l’artefact GitHub sera soumis à la politique de signature avec vérification de son origine et approbation manuelle.
6. Seul l’artefact approuvé et signé sera publié comme release officielle.

Les secrets, certificats et clés privées ne doivent jamais être ajoutés au dépôt.

Les dépendances et actifs distribués sont contrôlés par `npm run verify:open-source`. Leur origine et les marques tierces sont précisées dans [ASSETS.md](ASSETS.md).

## Confidentialité

Le comportement réseau et le traitement des données sont décrits dans la [politique de confidentialité](PRIVACY.md).
