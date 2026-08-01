# Ludux Connect

Ludux Connect est la passerelle sécurisée entre l'application de bureau et Steam.
La clé Web API Steam reste sur le serveur et n'est jamais envoyée à l'application.

## Fonctionnement

1. Ludux crée une session courte avec un challenge PKCE.
2. Le navigateur ouvre la page officielle de connexion Steam.
3. Ludux Connect vérifie directement l'assertion OpenID auprès de Steam.
4. L'application échange un code à usage unique contre un jeton limité dans le temps.
5. Le jeton autorise uniquement la lecture de la bibliothèque et des succès du SteamID authentifié.

Steam OpenID confirme l'identité du joueur, mais ne rend pas privée une bibliothèque
publique. Les détails de jeux Steam doivent rester visibles pour que la Web API puisse
les retourner.

## Développement local

Créez `connect/.env` depuis `connect/.env.example`, avec une nouvelle clé Steam et un
secret aléatoire d'au moins 32 caractères. N'utilisez jamais une clé déjà publiée.

```bash
npm run connect:dev
```

Dans le `.env` de l'application :

```dotenv
LUDUX_CONNECT_URL="http://localhost:8787"
```

Lancez ensuite Ludux avec `npm run dev`.

## Production

Le service doit être exposé derrière HTTPS. Les variables obligatoires sont :

- `LUDUX_CONNECT_PUBLIC_URL` : origine publique HTTPS du service ;
- `LUDUX_CONNECT_STEAM_WEB_API_KEY` : clé Steam réservée au serveur ;
- `LUDUX_CONNECT_TOKEN_SECRET` : secret aléatoire d'au moins 32 caractères ;
- `PORT` : port HTTP interne, `8787` par défaut.

`LUDUX_CONNECT_TRUST_PROXY=1` ne doit être activé que derrière un proxy contrôlé qui
remplace l'en-tête `X-Forwarded-For`.

Le `Dockerfile` se construit depuis la racine du dépôt :

```bash
docker build -f connect/Dockerfile -t ludux-connect .
docker run --env-file connect/.env -p 8787:8787 ludux-connect
```

Le service ne stocke pas de mot de passe Steam. Les sessions de connexion et les codes
d'échange restent en mémoire pendant dix minutes. Les jetons signés expirent après
trente jours.

## Routes

- `GET /health` : état minimal du service ;
- `POST /v1/auth/steam/sessions` : création d'une connexion PKCE ;
- `GET /v1/auth/steam` : redirection vers Steam OpenID ;
- `GET /v1/auth/steam/callback` : vérification de l'identité ;
- `GET /v1/steam/library` : bibliothèque du compte authentifié ;
- `GET /v1/steam/games/:appid/achievements` : succès du compte authentifié.

Les routes de données exigent un jeton `Bearer`. La clé Steam n'apparaît jamais dans
leurs réponses.
