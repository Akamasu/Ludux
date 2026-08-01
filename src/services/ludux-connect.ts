import { createHash, randomBytes } from 'node:crypto'
import {
  mergeSteamAchievements,
  parseSteamAchievementSchema,
  parseSteamOwnedGames,
  parseSteamPlayerAchievements,
  type SteamAchievement,
  type SteamOwnedGamesResult,
} from '../providers/steam'

const credentialPrefix = 'ludux-connect:v1:'
const defaultTimeoutMs = 15_000
const minimumPollIntervalMs = 1_000

export interface LuduxConnectCredential {
  accessToken: string
  baseUrl: string
}

interface SteamConnectSession {
  expiresAt: string
  pollIntervalMs: number
  sessionId: string
  verificationUrl: string
}

interface SteamConnectResult {
  credential: LuduxConnectCredential
  expiresAt: string | null
  personaName: string | null
  steamId: string
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

export function normalizeLuduxConnectUrl(value: string) {
  const url = new URL(value.trim())
  const isLocal = url.hostname === 'localhost' || url.hostname === '127.0.0.1'

  if (url.protocol !== 'https:' && !(isLocal && url.protocol === 'http:')) {
    throw new Error('Ludux Connect doit utiliser une adresse HTTPS.')
  }

  if (url.username || url.password || url.search || url.hash) {
    throw new Error('Adresse Ludux Connect invalide.')
  }

  return `${url.origin}/`
}

export function readConfiguredLuduxConnectUrl() {
  const builtUrl =
    typeof __LUDUX_CONNECT_URL__ === 'string' ? __LUDUX_CONNECT_URL__.trim() : ''
  const configuredUrl = process.env['LUDUX_CONNECT_URL']?.trim() || builtUrl

  if (!configuredUrl) {
    return null
  }

  try {
    return normalizeLuduxConnectUrl(configuredUrl)
  } catch {
    return null
  }
}

export function serializeLuduxConnectCredential(credential: LuduxConnectCredential) {
  const payload = Buffer.from(
    JSON.stringify({
      accessToken: credential.accessToken,
      baseUrl: normalizeLuduxConnectUrl(credential.baseUrl),
    }),
  ).toString('base64url')

  return `${credentialPrefix}${payload}`
}

export function parseLuduxConnectCredential(
  value: string | null | undefined,
): LuduxConnectCredential | null {
  if (!value?.startsWith(credentialPrefix)) {
    return null
  }

  try {
    const parsed = JSON.parse(
      Buffer.from(value.slice(credentialPrefix.length), 'base64url').toString('utf8'),
    ) as unknown

    if (
      !isRecord(parsed) ||
      typeof parsed['accessToken'] !== 'string' ||
      parsed['accessToken'].length < 32 ||
      typeof parsed['baseUrl'] !== 'string'
    ) {
      return null
    }

    return {
      accessToken: parsed['accessToken'],
      baseUrl: normalizeLuduxConnectUrl(parsed['baseUrl']),
    }
  } catch {
    return null
  }
}

export function isSerializedLuduxConnectCredential(value: string | null | undefined) {
  return Boolean(value?.startsWith(credentialPrefix))
}

function createRequestError(status: number, payload: unknown) {
  if (
    isRecord(payload) &&
    isRecord(payload['error']) &&
    typeof payload['error']['message'] === 'string'
  ) {
    return new Error(payload['error']['message'])
  }

  if (status === 401) {
    return new Error('Connexion Steam expirée. Reconnectez votre compte.')
  }

  if (status === 429) {
    return new Error('Ludux Connect limite temporairement les requêtes.')
  }

  return new Error(`Ludux Connect est indisponible (${status}).`)
}

async function requestJson({
  body,
  credential,
  fetchImpl,
  method = 'GET',
  path,
  timeoutMs = defaultTimeoutMs,
}: {
  body?: unknown
  credential?: LuduxConnectCredential
  fetchImpl: typeof fetch
  method?: 'GET' | 'POST'
  path: string
  timeoutMs?: number
}) {
  const baseUrl = credential?.baseUrl ?? readConfiguredLuduxConnectUrl()

  if (!baseUrl) {
    throw new Error('Ludux Connect n’est pas encore configuré pour cette version.')
  }

  let response: Response

  try {
    response = await fetchImpl(new URL(path, baseUrl), {
      method,
      headers: {
        Accept: 'application/json',
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
        ...(credential
          ? { Authorization: `Bearer ${credential.accessToken}` }
          : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
    })
  } catch {
    throw new Error('Impossible de joindre Ludux Connect. Vérifiez votre connexion.')
  }

  let payload: unknown = null

  try {
    payload = await response.json()
  } catch {
    // The status-specific message below remains more useful than a JSON error.
  }

  if (!response.ok) {
    throw createRequestError(response.status, payload)
  }

  return payload
}

function readSteamConnectSession(payload: unknown): SteamConnectSession {
  if (
    !isRecord(payload) ||
    typeof payload['expiresAt'] !== 'string' ||
    typeof payload['pollIntervalMs'] !== 'number' ||
    typeof payload['sessionId'] !== 'string' ||
    typeof payload['verificationUrl'] !== 'string'
  ) {
    throw new Error('Réponse de connexion Ludux invalide.')
  }

  return {
    expiresAt: payload['expiresAt'],
    pollIntervalMs: Math.max(payload['pollIntervalMs'], minimumPollIntervalMs),
    sessionId: payload['sessionId'],
    verificationUrl: payload['verificationUrl'],
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function connectSteamThroughLuduxConnect({
  fetchImpl = fetch,
  openExternal,
  sleepImpl = sleep,
}: {
  fetchImpl?: typeof fetch
  openExternal: (url: string) => Promise<unknown>
  sleepImpl?: (ms: number) => Promise<unknown>
}): Promise<SteamConnectResult> {
  const baseUrl = readConfiguredLuduxConnectUrl()

  if (!baseUrl) {
    throw new Error('Ludux Connect n’est pas encore configuré pour cette version.')
  }

  const codeVerifier = randomBytes(48).toString('base64url')
  const codeChallenge = createHash('sha256').update(codeVerifier).digest('base64url')
  const session = readSteamConnectSession(
    await requestJson({
      body: {
        codeChallenge,
        deviceName: 'Ludux pour Windows',
      },
      fetchImpl,
      method: 'POST',
      path: '/v1/auth/steam/sessions',
    }),
  )

  await openExternal(session.verificationUrl)

  const expiresAt = Date.parse(session.expiresAt)
  let exchangeCode: string | null = null

  while (Date.now() < expiresAt) {
    await sleepImpl(session.pollIntervalMs)
    const status = await requestJson({
      fetchImpl,
      path: `/v1/auth/steam/sessions/${encodeURIComponent(session.sessionId)}`,
    })

    if (!isRecord(status) || typeof status['status'] !== 'string') {
      throw new Error('État de connexion Ludux invalide.')
    }

    if (status['status'] === 'approved' && typeof status['exchangeCode'] === 'string') {
      exchangeCode = status['exchangeCode']
      break
    }

    if (status['status'] === 'expired') {
      break
    }
  }

  if (!exchangeCode) {
    throw new Error('La connexion Steam a expiré. Relancez-la depuis Ludux.')
  }

  const tokenPayload = await requestJson({
    body: { codeVerifier, exchangeCode },
    fetchImpl,
    method: 'POST',
    path: `/v1/auth/steam/sessions/${encodeURIComponent(session.sessionId)}/token`,
  })

  if (
    !isRecord(tokenPayload) ||
    typeof tokenPayload['accessToken'] !== 'string' ||
    typeof tokenPayload['steamId'] !== 'string' ||
    !/^\d{17}$/.test(tokenPayload['steamId'])
  ) {
    throw new Error('Jeton Ludux Connect invalide.')
  }

  return {
    credential: {
      accessToken: tokenPayload['accessToken'],
      baseUrl,
    },
    expiresAt:
      typeof tokenPayload['expiresAt'] === 'string' ? tokenPayload['expiresAt'] : null,
    personaName:
      typeof tokenPayload['personaName'] === 'string'
        ? tokenPayload['personaName']
        : null,
    steamId: tokenPayload['steamId'],
  }
}

export async function fetchSteamOwnedGamesThroughLuduxConnect({
  credential,
  fetchImpl = fetch,
}: {
  credential: LuduxConnectCredential
  fetchImpl?: typeof fetch
}): Promise<SteamOwnedGamesResult> {
  return parseSteamOwnedGames(
    await requestJson({
      credential,
      fetchImpl,
      path: '/v1/steam/library',
    }),
  )
}

export async function fetchSteamAchievementsThroughLuduxConnect({
  appid,
  credential,
  fetchImpl = fetch,
}: {
  appid: number
  credential: LuduxConnectCredential
  fetchImpl?: typeof fetch
}): Promise<SteamAchievement[]> {
  const payload = await requestJson({
    credential,
    fetchImpl,
    path: `/v1/steam/games/${appid}/achievements`,
  })

  if (!isRecord(payload)) {
    throw new Error('Réponse de succès Ludux Connect invalide.')
  }

  return mergeSteamAchievements(
    parseSteamAchievementSchema(payload['schema']),
    parseSteamPlayerAchievements(payload['player']),
  )
}
