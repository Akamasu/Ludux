export interface RawgGameSearchResult {
  id: number
  title: string
}

export interface RawgGameMetadata {
  rawgId: number
  title: string
  description: string | null
  coverUrl: string | null
  releaseDate: string | null
  developer: string | null
  genres: string[]
  publisher: string | null
  website: string | null
}

interface FetchRawgGameMetadataInput {
  apiKey: string
  title: string
  fetchImpl?: typeof fetch
  timeoutMs?: number
}

const defaultRawgTimeoutMs = 15_000

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function readNumber(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
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

function readNames(value: unknown) {
  const names = readNameList(value)

  return names.length > 0 ? names.join(', ') : null
}

function stripHtml(value: string | null) {
  return value?.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim() || null
}

function normalizeRawgApiKey(value: string) {
  const apiKey = value.trim()

  if (apiKey.length === 0) {
    throw new Error('Clé API RAWG obligatoire pour enrichir les métadonnées.')
  }

  return apiKey
}

function normalizeRawgSearchTitle(value: string) {
  const title = value.trim()

  if (title.length === 0) {
    throw new Error('Titre de jeu obligatoire pour interroger RAWG.')
  }

  return title
}

function createRawgErrorMessage(status: number) {
  if (status === 401 || status === 403) {
    return 'RAWG a refusé la synchronisation. Vérifiez la clé API RAWG.'
  }

  if (status === 404) {
    return 'RAWG ne trouve pas ce jeu.'
  }

  if (status === 429) {
    return 'RAWG limite temporairement les requêtes. Réessayez plus tard.'
  }

  if (status >= 500) {
    return 'RAWG est temporairement indisponible. Réessayez plus tard.'
  }

  return `RAWG a refusé la synchronisation (${status}).`
}

function isAbortError(error: unknown) {
  return isRecord(error) && error['name'] === 'AbortError'
}

export function createRawgSearchUrl(apiKey: string, title: string) {
  const params = new URLSearchParams({
    key: normalizeRawgApiKey(apiKey),
    search: normalizeRawgSearchTitle(title),
    page_size: '1',
    search_precise: 'true',
  })

  return `https://api.rawg.io/api/games?${params}`
}

export function createRawgGameDetailsUrl(apiKey: string, rawgId: number) {
  const normalizedId = Math.trunc(rawgId)

  if (!Number.isFinite(normalizedId) || normalizedId <= 0) {
    throw new Error('Identifiant RAWG invalide.')
  }

  const params = new URLSearchParams({
    key: normalizeRawgApiKey(apiKey),
  })

  return `https://api.rawg.io/api/games/${normalizedId}?${params}`
}

export function parseRawgSearchResults(payload: unknown): RawgGameSearchResult | null {
  if (!isRecord(payload)) {
    throw new Error('Reponse RAWG invalide.')
  }

  const results = Array.isArray(payload['results']) ? payload['results'] : []
  const firstResult = results[0]

  if (!isRecord(firstResult)) {
    return null
  }

  const id = readNumber(firstResult['id'])
  const title = readString(firstResult['name'])

  return id && title
    ? {
        id,
        title,
      }
    : null
}

export function parseRawgGameMetadata(payload: unknown): RawgGameMetadata {
  if (!isRecord(payload)) {
    throw new Error('Reponse RAWG invalide.')
  }

  const rawgId = readNumber(payload['id'])
  const title = readString(payload['name'])

  if (!rawgId || !title) {
    throw new Error('Métadonnées RAWG invalides.')
  }

  return {
    rawgId,
    title,
    description:
      readString(payload['description_raw']) ?? stripHtml(readString(payload['description'])),
    coverUrl: readString(payload['background_image']),
    releaseDate: readString(payload['released']),
    developer: readNames(payload['developers']),
    genres: readNameList(payload['genres']),
    publisher: readNames(payload['publishers']),
    website: readString(payload['website']),
  }
}

async function fetchRawgJson({
  fetchImpl,
  timeoutMs,
  url,
}: {
  fetchImpl: typeof fetch
  timeoutMs: number
  url: string
}) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)

  let response: Response

  try {
    response = await fetchImpl(url, {
      signal: controller.signal,
    })
  } catch (error) {
    if (isAbortError(error)) {
      throw new Error('RAWG ne répond pas. Réessayez plus tard.')
    }

    throw new Error('Impossible de joindre RAWG. Vérifiez la connexion réseau.')
  } finally {
    clearTimeout(timeout)
  }

  if (!response.ok) {
    throw new Error(createRawgErrorMessage(response.status))
  }

  return response.json() as Promise<unknown>
}

export async function fetchRawgGameMetadata({
  apiKey,
  fetchImpl = fetch,
  timeoutMs = defaultRawgTimeoutMs,
  title,
}: FetchRawgGameMetadataInput): Promise<RawgGameMetadata | null> {
  const searchResult = parseRawgSearchResults(
    await fetchRawgJson({
      fetchImpl,
      timeoutMs,
      url: createRawgSearchUrl(apiKey, title),
    }),
  )

  if (!searchResult) {
    return null
  }

  return parseRawgGameMetadata(
    await fetchRawgJson({
      fetchImpl,
      timeoutMs,
      url: createRawgGameDetailsUrl(apiKey, searchResult.id),
    }),
  )
}
