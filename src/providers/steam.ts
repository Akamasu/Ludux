export interface SteamOwnedGame {
  appid: number
  title: string
  coverUrl: string
  iconUrl: string | null
  playtimeForeverMinutes: number
  lastPlayedAt: string | null
}

export interface SteamOwnedGamesResult {
  totalCount: number
  games: SteamOwnedGame[]
}

interface FetchSteamOwnedGamesInput {
  apiKey: string
  steamId: string
  fetchImpl?: typeof fetch
  timeoutMs?: number
}

const defaultSteamTimeoutMs = 15_000
const steamId64Pattern = /^\d{17}$/

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function readNumber(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function readString(value: unknown) {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null
}

function steamCoverUrl(appid: number) {
  return `https://cdn.akamai.steamstatic.com/steam/apps/${appid}/header.jpg`
}

function steamIconUrl(appid: number, hash: string | null) {
  return hash
    ? `https://media.steampowered.com/steamcommunity/public/images/apps/${appid}/${hash}.jpg`
    : null
}

export function normalizeSteamId(value: string) {
  const steamId = value.trim()

  if (!steamId64Pattern.test(steamId)) {
    throw new Error('SteamID64 invalide. Il doit contenir 17 chiffres.')
  }

  return steamId
}

function normalizeSteamApiKey(value: string) {
  const apiKey = value.trim()

  if (apiKey.length === 0) {
    throw new Error('Cle API Steam obligatoire pour synchroniser.')
  }

  return apiKey
}

function createSteamErrorMessage(status: number) {
  if (status === 401 || status === 403) {
    return 'Steam a refuse la synchronisation. Verifiez la cle API Steam.'
  }

  if (status === 404) {
    return 'Steam ne trouve pas le service de bibliotheque.'
  }

  if (status === 429) {
    return 'Steam limite temporairement les requetes. Reessayez plus tard.'
  }

  if (status >= 500) {
    return 'Steam est temporairement indisponible. Reessayez plus tard.'
  }

  return `Steam a refuse la synchronisation (${status}).`
}

export function createSteamOwnedGamesUrl(apiKey: string, steamId: string) {
  const params = new URLSearchParams({
    key: normalizeSteamApiKey(apiKey),
    steamid: normalizeSteamId(steamId),
    include_appinfo: '1',
    include_played_free_games: '1',
    format: 'json',
  })

  return `https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/?${params}`
}

export function parseSteamOwnedGames(payload: unknown): SteamOwnedGamesResult {
  if (!isRecord(payload) || !isRecord(payload['response'])) {
    throw new Error('Reponse Steam invalide.')
  }

  const response = payload['response']
  const rawGames = Array.isArray(response['games']) ? response['games'] : []

  const games = rawGames.flatMap((rawGame): SteamOwnedGame[] => {
    if (!isRecord(rawGame)) {
      return []
    }

    const appid = readNumber(rawGame['appid'])
    const title = readString(rawGame['name'])

    if (!appid || !title) {
      return []
    }

    const playtimeForeverMinutes = Math.max(
      0,
      Math.round(readNumber(rawGame['playtime_forever']) ?? 0),
    )
    const lastPlayedTimestamp = readNumber(rawGame['rtime_last_played'])
    const iconHash = readString(rawGame['img_icon_url'])

    return [
      {
        appid,
        title,
        coverUrl: steamCoverUrl(appid),
        iconUrl: steamIconUrl(appid, iconHash),
        playtimeForeverMinutes,
        lastPlayedAt:
          lastPlayedTimestamp && lastPlayedTimestamp > 0
            ? new Date(lastPlayedTimestamp * 1000).toISOString()
            : null,
      },
    ]
  })

  return {
    totalCount: readNumber(response['game_count']) ?? games.length,
    games,
  }
}

export async function fetchSteamOwnedGames({
  apiKey,
  fetchImpl = fetch,
  steamId,
  timeoutMs = defaultSteamTimeoutMs,
}: FetchSteamOwnedGamesInput): Promise<SteamOwnedGamesResult> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)

  let response: Response

  try {
    response = await fetchImpl(createSteamOwnedGamesUrl(apiKey, steamId), {
      signal: controller.signal,
    })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error('Steam ne repond pas. Reessayez plus tard.')
    }

    throw new Error('Impossible de joindre Steam. Verifiez la connexion reseau.')
  } finally {
    clearTimeout(timeout)
  }

  if (!response.ok) {
    throw new Error(createSteamErrorMessage(response.status))
  }

  return parseSteamOwnedGames(await response.json())
}
