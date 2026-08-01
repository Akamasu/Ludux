import { createHash, timingSafeEqual } from 'node:crypto'
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import { pathToFileURL } from 'node:url'
import { createAccessToken, verifyAccessToken } from './auth-token.js'
import { createSteamOpenIdUrl, verifySteamOpenIdAssertion } from './openid.js'
import { SteamAuthSessionStore } from './session-store.js'

const codeChallengePattern = /^[A-Za-z0-9_-]{43}$/
const codeVerifierPattern = /^[A-Za-z0-9._~-]{43,128}$/
const sessionIdPattern = /^[A-Za-z0-9_-]{40,64}$/
const defaultPort = 8787
const maxRequestBodyBytes = 32 * 1024

interface LuduxConnectConfig {
  accessTokenTtlSeconds?: number
  fetchImpl?: typeof fetch
  port?: number
  publicUrl: string
  steamApiKey: string
  tokenSecret: string
  trustProxy?: boolean
}

interface ApiErrorBody {
  error: {
    code: string
    message: string
  }
}

class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message)
  }
}

class FixedWindowRateLimiter {
  private readonly entries = new Map<string, { count: number; resetAt: number }>()
  private consumedRequests = 0

  constructor(
    private readonly limit: number,
    private readonly windowMs: number,
  ) {}

  consume(key: string, now = Date.now()) {
    this.consumedRequests += 1

    if (this.consumedRequests % 1_000 === 0) {
      for (const [entryKey, entry] of this.entries) {
        if (entry.resetAt <= now) {
          this.entries.delete(entryKey)
        }
      }
    }

    const current = this.entries.get(key)

    if (!current || current.resetAt <= now) {
      this.entries.set(key, { count: 1, resetAt: now + this.windowMs })
      return true
    }

    if (current.count >= this.limit) {
      return false
    }

    current.count += 1
    return true
  }
}

function normalizePublicUrl(value: string) {
  const url = new URL(value)
  const isLocal = url.hostname === 'localhost' || url.hostname === '127.0.0.1'

  if (url.protocol !== 'https:' && !(isLocal && url.protocol === 'http:')) {
    throw new Error('LUDUX_CONNECT_PUBLIC_URL doit utiliser HTTPS hors développement local.')
  }

  if (url.username || url.password || url.search || url.hash) {
    throw new Error('LUDUX_CONNECT_PUBLIC_URL est invalide.')
  }

  return `${url.origin}/`
}

function readRequiredEnvironmentValue(name: string) {
  const value = process.env[name]?.trim()

  if (!value) {
    throw new Error(`${name} est obligatoire.`)
  }

  return value
}

export function readLuduxConnectConfigFromEnvironment(): LuduxConnectConfig {
  const port = Number(process.env['PORT'] ?? defaultPort)

  return {
    port: Number.isInteger(port) && port > 0 ? port : defaultPort,
    publicUrl: readRequiredEnvironmentValue('LUDUX_CONNECT_PUBLIC_URL'),
    steamApiKey: readRequiredEnvironmentValue('LUDUX_CONNECT_STEAM_WEB_API_KEY'),
    tokenSecret: readRequiredEnvironmentValue('LUDUX_CONNECT_TOKEN_SECRET'),
    trustProxy: process.env['LUDUX_CONNECT_TRUST_PROXY'] === '1',
  }
}

function setSecurityHeaders(response: ServerResponse) {
  response.setHeader('Cache-Control', 'no-store')
  response.setHeader('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'")
  response.setHeader('Referrer-Policy', 'no-referrer')
  response.setHeader('X-Content-Type-Options', 'nosniff')
  response.setHeader('X-Frame-Options', 'DENY')
}

function sendJson(response: ServerResponse, status: number, body: unknown) {
  setSecurityHeaders(response)
  response.statusCode = status
  response.setHeader('Content-Type', 'application/json; charset=utf-8')
  response.end(JSON.stringify(body))
}

function sendHtml(response: ServerResponse, status: number, title: string, message: string) {
  setSecurityHeaders(response)
  response.statusCode = status
  response.setHeader('Content-Type', 'text/html; charset=utf-8')
  response.end(`<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${title}</title>
    <style>
      :root { color-scheme: dark; font-family: system-ui, sans-serif; background: #0f1117; color: #f4f4f5; }
      body { min-height: 100vh; margin: 0; display: grid; place-items: center; padding: 24px; box-sizing: border-box; }
      main { width: min(560px, 100%); border: 1px solid #343846; background: #181b23; padding: 32px; border-radius: 8px; }
      h1 { margin: 0 0 12px; font-family: Georgia, serif; font-size: 28px; }
      p { margin: 0; color: #c4c7d0; line-height: 1.65; }
      strong { color: #a797ff; }
    </style>
  </head>
  <body><main><h1>${title}</h1><p>${message}</p></main></body>
</html>`)
}

async function readJsonBody(request: IncomingMessage) {
  const chunks: Buffer[] = []
  let size = 0

  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
    size += buffer.length

    if (size > maxRequestBodyBytes) {
      throw new HttpError(413, 'REQUEST_TOO_LARGE', 'La requête est trop volumineuse.')
    }

    chunks.push(buffer)
  }

  if (chunks.length === 0) {
    return {}
  }

  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown
  } catch {
    throw new HttpError(400, 'INVALID_JSON', 'La requête est invalide.')
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function readClientIp(request: IncomingMessage, trustProxy: boolean) {
  if (trustProxy) {
    const forwardedFor = request.headers['x-forwarded-for']
    const firstAddress = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor

    if (firstAddress) {
      return firstAddress.split(',')[0]?.trim() || 'unknown'
    }
  }

  return request.socket.remoteAddress ?? 'unknown'
}

function bearerToken(request: IncomingMessage) {
  const authorization = request.headers.authorization

  if (!authorization?.startsWith('Bearer ')) {
    throw new HttpError(401, 'AUTH_REQUIRED', 'Connexion Ludux expirée ou absente.')
  }

  return authorization.slice(7).trim()
}

function constantTimeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left)
  const rightBuffer = Buffer.from(right)

  return (
    leftBuffer.length === rightBuffer.length &&
    timingSafeEqual(leftBuffer, rightBuffer)
  )
}

function verifyCodeChallenge(verifier: string, challenge: string) {
  const computed = createHash('sha256').update(verifier).digest('base64url')
  return constantTimeEqual(computed, challenge)
}

function upstreamError(status: number) {
  if (status === 401 || status === 403) {
    return new HttpError(502, 'STEAM_REFUSED', 'Steam a refusé la synchronisation.')
  }

  if (status === 429) {
    return new HttpError(
      503,
      'STEAM_RATE_LIMITED',
      'Steam limite temporairement les requêtes. Réessayez plus tard.',
    )
  }

  return new HttpError(502, 'STEAM_UNAVAILABLE', 'Steam est temporairement indisponible.')
}

async function fetchSteamJson(
  url: URL,
  fetchImpl: typeof fetch,
  { allowFailure = false }: { allowFailure?: boolean } = {},
) {
  let response: Response

  try {
    response = await fetchImpl(url, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(15_000),
    })
  } catch {
    throw new HttpError(502, 'STEAM_UNAVAILABLE', 'Steam ne répond pas pour le moment.')
  }

  if (!response.ok) {
    if (allowFailure) {
      return null
    }

    throw upstreamError(response.status)
  }

  return response.json() as Promise<unknown>
}

async function fetchSteamPersonaName({
  fetchImpl,
  steamApiKey,
  steamId,
}: {
  fetchImpl: typeof fetch
  steamApiKey: string
  steamId: string
}) {
  const url = new URL('https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/')
  url.searchParams.set('key', steamApiKey)
  url.searchParams.set('steamids', steamId)
  url.searchParams.set('format', 'json')
  const payload = await fetchSteamJson(url, fetchImpl, { allowFailure: true })

  if (!isRecord(payload) || !isRecord(payload['response'])) {
    return null
  }

  const players = payload['response']['players']
  const firstPlayer = Array.isArray(players) ? players[0] : null

  return isRecord(firstPlayer) && typeof firstPlayer['personaname'] === 'string'
    ? firstPlayer['personaname'].trim().slice(0, 80) || null
    : null
}

export function createLuduxConnectServer(input: LuduxConnectConfig) {
  const publicUrl = normalizePublicUrl(input.publicUrl)
  const steamApiKey = input.steamApiKey.trim()
  const tokenSecret = input.tokenSecret
  const fetchImpl = input.fetchImpl ?? fetch

  if (!steamApiKey) {
    throw new Error('La clé Steam de Ludux Connect est obligatoire.')
  }

  if (tokenSecret.length < 32) {
    throw new Error('Le secret de jeton Ludux Connect doit contenir au moins 32 caractères.')
  }

  const sessions = new SteamAuthSessionStore()
  const publicLimiter = new FixedWindowRateLimiter(120, 60_000)
  const authLimiter = new FixedWindowRateLimiter(10, 10 * 60_000)
  const apiLimiter = new FixedWindowRateLimiter(360, 15 * 60_000)

  return createServer(async (request, response) => {
    try {
      const method = request.method ?? 'GET'
      const requestUrl = new URL(request.url ?? '/', publicUrl)
      const clientIp = readClientIp(request, input.trustProxy ?? false)

      if (!publicLimiter.consume(clientIp)) {
        throw new HttpError(429, 'RATE_LIMITED', 'Trop de requêtes. Réessayez plus tard.')
      }

      if (method === 'GET' && requestUrl.pathname === '/health') {
        sendJson(response, 200, { service: 'ludux-connect', status: 'ok' })
        return
      }

      if (method === 'POST' && requestUrl.pathname === '/v1/auth/steam/sessions') {
        if (!authLimiter.consume(clientIp)) {
          throw new HttpError(429, 'RATE_LIMITED', 'Trop de tentatives de connexion.')
        }

        const body = await readJsonBody(request)

        if (!isRecord(body) || !codeChallengePattern.test(String(body['codeChallenge'] ?? ''))) {
          throw new HttpError(400, 'INVALID_CHALLENGE', 'Demande de connexion invalide.')
        }

        const deviceName =
          typeof body['deviceName'] === 'string'
            ? body['deviceName'].trim().slice(0, 80) || 'Ludux'
            : 'Ludux'
        const session = sessions.create({
          codeChallenge: String(body['codeChallenge']),
          deviceName,
        })

        sendJson(response, 201, {
          expiresAt: new Date(session.expiresAt).toISOString(),
          pollIntervalMs: 2_000,
          sessionId: session.id,
          verificationUrl: new URL(
            `/v1/auth/steam?session=${encodeURIComponent(session.id)}`,
            publicUrl,
          ).toString(),
        })
        return
      }

      if (method === 'GET' && requestUrl.pathname === '/v1/auth/steam') {
        const sessionId = requestUrl.searchParams.get('session') ?? ''

        if (!sessionIdPattern.test(sessionId) || !sessions.get(sessionId)) {
          sendHtml(
            response,
            410,
            'Connexion expirée',
            'Revenez dans Ludux et relancez la connexion Steam.',
          )
          return
        }

        response.statusCode = 302
        response.setHeader('Location', createSteamOpenIdUrl({ publicUrl, sessionId }))
        response.end()
        return
      }

      if (method === 'GET' && requestUrl.pathname === '/v1/auth/steam/callback') {
        const sessionId = requestUrl.searchParams.get('session') ?? ''
        const session = sessions.get(sessionId)

        if (!session || session.status !== 'PENDING') {
          sendHtml(
            response,
            410,
            'Connexion expirée',
            'Cette tentative n’est plus valide. Revenez dans Ludux pour recommencer.',
          )
          return
        }

        const expectedReturnTo = new URL('/v1/auth/steam/callback', publicUrl)
        expectedReturnTo.searchParams.set('session', sessionId)
        const steamId = await verifySteamOpenIdAssertion({
          expectedReturnTo: expectedReturnTo.toString(),
          fetchImpl,
          isNonceUsed: (nonce) => sessions.isNonceUsed(nonce),
          markNonceUsed: (nonce) => sessions.markNonceUsed(nonce),
          parameters: requestUrl.searchParams,
        })
        let personaName: string | null = null

        try {
          personaName = await fetchSteamPersonaName({
            fetchImpl,
            steamApiKey,
            steamId,
          })
        } catch {
          // The display name is optional; a valid Steam identity remains usable.
        }

        const approvedSession = sessions.approve({ id: sessionId, personaName, steamId })

        if (!approvedSession) {
          throw new HttpError(410, 'AUTH_EXPIRED', 'La connexion Steam a expiré.')
        }
        sendHtml(
          response,
          200,
          'Steam est connecté',
          '<strong>La connexion est terminée.</strong> Vous pouvez fermer cette page et revenir dans Ludux.',
        )
        return
      }

      const sessionStatusMatch = requestUrl.pathname.match(
        /^\/v1\/auth\/steam\/sessions\/([A-Za-z0-9_-]+)$/,
      )

      if (method === 'GET' && sessionStatusMatch) {
        const session = sessions.get(sessionStatusMatch[1] ?? '')

        if (!session) {
          sendJson(response, 200, { status: 'expired' })
          return
        }

        if (session.status === 'APPROVED') {
          sendJson(response, 200, {
            exchangeCode: session.exchangeCode,
            status: 'approved',
          })
          return
        }

        sendJson(response, 200, {
          status: session.status === 'PENDING' ? 'pending' : 'expired',
        })
        return
      }

      const sessionTokenMatch = requestUrl.pathname.match(
        /^\/v1\/auth\/steam\/sessions\/([A-Za-z0-9_-]+)\/token$/,
      )

      if (method === 'POST' && sessionTokenMatch) {
        const body = await readJsonBody(request)

        if (
          !isRecord(body) ||
          typeof body['exchangeCode'] !== 'string' ||
          typeof body['codeVerifier'] !== 'string' ||
          !codeVerifierPattern.test(body['codeVerifier'])
        ) {
          throw new HttpError(400, 'INVALID_EXCHANGE', 'Échange de connexion invalide.')
        }

        const session = sessions.get(sessionTokenMatch[1] ?? '')

        if (
          !session ||
          !verifyCodeChallenge(body['codeVerifier'], session.codeChallenge)
        ) {
          throw new HttpError(401, 'INVALID_EXCHANGE', 'Échange de connexion refusé.')
        }

        const exchanged = sessions.exchange(session.id, body['exchangeCode'])

        if (!exchanged?.steamId) {
          throw new HttpError(401, 'INVALID_EXCHANGE', 'Échange de connexion refusé.')
        }

        const accessToken = createAccessToken({
          secret: tokenSecret,
          steamId: exchanged.steamId,
          ttlSeconds: input.accessTokenTtlSeconds,
        })
        const tokenPayload = verifyAccessToken({ secret: tokenSecret, token: accessToken })

        sendJson(response, 200, {
          accessToken,
          expiresAt: tokenPayload
            ? new Date(tokenPayload.exp * 1000).toISOString()
            : null,
          personaName: exchanged.personaName,
          steamId: exchanged.steamId,
        })
        return
      }

      const token = bearerToken(request)
      const tokenPayload = verifyAccessToken({ secret: tokenSecret, token })

      if (!tokenPayload) {
        throw new HttpError(401, 'AUTH_EXPIRED', 'Connexion Steam expirée. Reconnectez le compte.')
      }

      if (!apiLimiter.consume(tokenPayload.jti)) {
        throw new HttpError(429, 'RATE_LIMITED', 'Trop de synchronisations rapprochées.')
      }

      if (method === 'GET' && requestUrl.pathname === '/v1/me') {
        sendJson(response, 200, { steamId: tokenPayload.sub })
        return
      }

      if (method === 'GET' && requestUrl.pathname === '/v1/steam/library') {
        const url = new URL(
          'https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/',
        )
        url.searchParams.set('key', steamApiKey)
        url.searchParams.set('steamid', tokenPayload.sub)
        url.searchParams.set('include_appinfo', '1')
        url.searchParams.set('include_played_free_games', '1')
        url.searchParams.set('format', 'json')

        sendJson(response, 200, await fetchSteamJson(url, fetchImpl))
        return
      }

      const achievementMatch = requestUrl.pathname.match(
        /^\/v1\/steam\/games\/(\d+)\/achievements$/,
      )

      if (method === 'GET' && achievementMatch) {
        const appid = Number(achievementMatch[1])

        if (!Number.isInteger(appid) || appid <= 0) {
          throw new HttpError(400, 'INVALID_APP', 'Jeu Steam invalide.')
        }

        const schemaUrl = new URL(
          'https://api.steampowered.com/ISteamUserStats/GetSchemaForGame/v2/',
        )
        schemaUrl.searchParams.set('key', steamApiKey)
        schemaUrl.searchParams.set('appid', String(appid))
        schemaUrl.searchParams.set('l', 'french')
        schemaUrl.searchParams.set('format', 'json')
        const playerUrl = new URL(
          'https://api.steampowered.com/ISteamUserStats/GetPlayerAchievements/v1/',
        )
        playerUrl.searchParams.set('key', steamApiKey)
        playerUrl.searchParams.set('steamid', tokenPayload.sub)
        playerUrl.searchParams.set('appid', String(appid))
        playerUrl.searchParams.set('l', 'french')
        playerUrl.searchParams.set('format', 'json')
        const [schema, player] = await Promise.all([
          fetchSteamJson(schemaUrl, fetchImpl),
          fetchSteamJson(playerUrl, fetchImpl, { allowFailure: true }),
        ])

        sendJson(response, 200, { player, schema })
        return
      }

      throw new HttpError(404, 'NOT_FOUND', 'Route introuvable.')
    } catch (error) {
      const status = error instanceof HttpError ? error.status : 500
      const body: ApiErrorBody = {
        error: {
          code: error instanceof HttpError ? error.code : 'INTERNAL_ERROR',
          message:
            error instanceof HttpError
              ? error.message
              : 'Ludux Connect rencontre une erreur inattendue.',
        },
      }

      if (status >= 500) {
        console.error('[LuduxConnect]', error)
      }

      sendJson(response, status, body)
    }
  })
}

const entryPoint = process.argv[1] ? pathToFileURL(process.argv[1]).href : null

if (entryPoint === import.meta.url) {
  const config = readLuduxConnectConfigFromEnvironment()
  const server = createLuduxConnectServer(config)
  const port = config.port ?? defaultPort

  server.listen(port, () => {
    console.info(`[LuduxConnect] Service prêt sur le port ${port}.`)
  })
}

export type { LuduxConnectConfig }
