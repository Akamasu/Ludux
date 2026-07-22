export interface IgdbAccessToken {
  accessToken: string
  expiresIn: number
  tokenType: string
}

export interface IgdbGameMetadata {
  igdbId: number
  title: string
  description: string | null
  coverUrl: string | null
  releaseDate: string | null
  developer: string | null
  genres: string[]
  publisher: string | null
  website: string | null
}

interface FetchIgdbAccessTokenInput {
  clientId: string
  clientSecret: string
  fetchImpl?: typeof fetch
  timeoutMs?: number
}

interface FetchIgdbGameMetadataInput {
  accessToken: string
  clientId: string
  fetchImpl?: typeof fetch
  timeoutMs?: number
  title: string
}

const defaultIgdbTimeoutMs = 15_000
const twitchTokenUrl = 'https://id.twitch.tv/oauth2/token'
const igdbGamesUrl = 'https://api.igdb.com/v4/games'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function readNumber(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function readBoolean(value: unknown) {
  return typeof value === 'boolean' ? value : false
}

function readString(value: unknown) {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null
}

function readNameList(value: unknown) {
  if (!Array.isArray(value)) {
    return []
  }

  return Array.from(
    new Set(
      value
        .map((item) => (isRecord(item) ? readString(item['name']) : null))
        .filter((name): name is string => name !== null),
    ),
  )
}

function readCompanyNames(value: unknown, role: 'developer' | 'publisher') {
  if (!Array.isArray(value)) {
    return null
  }

  const names = Array.from(
    new Set(
      value
        .filter((item): item is Record<string, unknown> => isRecord(item))
        .filter((item) => readBoolean(item[role]))
        .map((item) =>
          isRecord(item['company']) ? readString(item['company']['name']) : null,
        )
        .filter((name): name is string => name !== null),
    ),
  )

  return names.length > 0 ? names.join(', ') : null
}

function readOfficialWebsite(value: unknown) {
  if (!Array.isArray(value)) {
    return null
  }

  const officialWebsite = value
    .filter((item): item is Record<string, unknown> => isRecord(item))
    .find((item) => readNumber(item['category']) === 1)

  return officialWebsite ? readString(officialWebsite['url']) : null
}

function normalizeIgdbCredential(value: string, label: string) {
  const credential = value.trim()

  if (credential.length === 0) {
    throw new Error(`${label} IGDB obligatoire.`)
  }

  return credential
}

function normalizeIgdbSearchTitle(value: string) {
  const title = value.trim()

  if (title.length === 0) {
    throw new Error('Titre de jeu obligatoire pour interroger IGDB.')
  }

  return title
}

function escapeApicalypseString(value: string) {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
}

function createIgdbErrorMessage(status: number) {
  if (status === 401 || status === 403) {
    return 'IGDB a refusé la synchronisation. Vérifiez le Client ID et le Client Secret.'
  }

  if (status === 404) {
    return 'IGDB ne trouve pas ce jeu.'
  }

  if (status === 429) {
    return 'IGDB limite temporairement les requêtes. Réessayez plus tard.'
  }

  if (status >= 500) {
    return 'IGDB est temporairement indisponible. Réessayez plus tard.'
  }

  return `IGDB a refusé la synchronisation (${status}).`
}

function isAbortError(error: unknown) {
  return isRecord(error) && error['name'] === 'AbortError'
}

function formatUnixDate(value: number | null) {
  if (!value) {
    return null
  }

  const date = new Date(value * 1000)

  return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10)
}

function createIgdbCoverUrl(imageId: string | null) {
  return imageId
    ? `https://images.igdb.com/igdb/image/upload/t_cover_big_2x/${imageId}.jpg`
    : null
}

export function createTwitchClientCredentialsBody(
  clientId: string,
  clientSecret: string,
) {
  const params = new URLSearchParams({
    client_id: normalizeIgdbCredential(clientId, 'Client ID'),
    client_secret: normalizeIgdbCredential(clientSecret, 'Client Secret'),
    grant_type: 'client_credentials',
  })

  return params.toString()
}

export function createIgdbGameSearchBody(title: string) {
  const searchTitle = escapeApicalypseString(normalizeIgdbSearchTitle(title))

  return [
    `search "${searchTitle}";`,
    'fields name,summary,storyline,first_release_date,cover.image_id,genres.name,involved_companies.company.name,involved_companies.developer,involved_companies.publisher,websites.category,websites.url,url;',
    'where version_parent = null;',
    'limit 1;',
  ].join(' ')
}

export function parseIgdbAccessToken(payload: unknown): IgdbAccessToken {
  if (!isRecord(payload)) {
    throw new Error('Réponse Twitch OAuth invalide.')
  }

  const accessToken = readString(payload['access_token'])
  const expiresIn = readNumber(payload['expires_in'])
  const tokenType = readString(payload['token_type']) ?? 'bearer'

  if (!accessToken || !expiresIn) {
    throw new Error('Token IGDB invalide.')
  }

  return {
    accessToken,
    expiresIn,
    tokenType,
  }
}

export function parseIgdbGameMetadata(payload: unknown): IgdbGameMetadata | null {
  if (!Array.isArray(payload)) {
    throw new Error('Réponse IGDB invalide.')
  }

  const game = payload.find((item): item is Record<string, unknown> => isRecord(item))

  if (!game) {
    return null
  }

  const igdbId = readNumber(game['id'])
  const title = readString(game['name'])

  if (!igdbId || !title) {
    throw new Error('Métadonnées IGDB invalides.')
  }

  const cover = isRecord(game['cover']) ? game['cover'] : null

  return {
    igdbId,
    title,
    description: readString(game['summary']) ?? readString(game['storyline']),
    coverUrl: createIgdbCoverUrl(cover ? readString(cover['image_id']) : null),
    releaseDate: formatUnixDate(readNumber(game['first_release_date'])),
    developer: readCompanyNames(game['involved_companies'], 'developer'),
    genres: readNameList(game['genres']),
    publisher: readCompanyNames(game['involved_companies'], 'publisher'),
    website: readOfficialWebsite(game['websites']),
  }
}

async function fetchJson({
  body,
  fetchImpl,
  headers,
  timeoutMs,
  url,
}: {
  body: string
  fetchImpl: typeof fetch
  headers: Record<string, string>
  timeoutMs: number
  url: string
}) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)

  let response: Response

  try {
    response = await fetchImpl(url, {
      body,
      headers,
      method: 'POST',
      signal: controller.signal,
    })
  } catch (error) {
    if (isAbortError(error)) {
      throw new Error('IGDB ne répond pas. Réessayez plus tard.')
    }

    throw new Error('Impossible de joindre IGDB. Vérifiez la connexion réseau.')
  } finally {
    clearTimeout(timeout)
  }

  if (!response.ok) {
    throw new Error(createIgdbErrorMessage(response.status))
  }

  return response.json() as Promise<unknown>
}

export async function fetchIgdbAccessToken({
  clientId,
  clientSecret,
  fetchImpl = fetch,
  timeoutMs = defaultIgdbTimeoutMs,
}: FetchIgdbAccessTokenInput): Promise<IgdbAccessToken> {
  return parseIgdbAccessToken(
    await fetchJson({
      body: createTwitchClientCredentialsBody(clientId, clientSecret),
      fetchImpl,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      timeoutMs,
      url: twitchTokenUrl,
    }),
  )
}

export async function fetchIgdbGameMetadata({
  accessToken,
  clientId,
  fetchImpl = fetch,
  timeoutMs = defaultIgdbTimeoutMs,
  title,
}: FetchIgdbGameMetadataInput): Promise<IgdbGameMetadata | null> {
  return parseIgdbGameMetadata(
    await fetchJson({
      body: createIgdbGameSearchBody(title),
      fetchImpl,
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${normalizeIgdbCredential(accessToken, 'Token')}`,
        'Client-ID': normalizeIgdbCredential(clientId, 'Client ID'),
      },
      timeoutMs,
      url: igdbGamesUrl,
    }),
  )
}
