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
}

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

function parseSteamOwnedGames(payload: unknown): SteamOwnedGamesResult {
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
  steamId,
}: FetchSteamOwnedGamesInput): Promise<SteamOwnedGamesResult> {
  const params = new URLSearchParams({
    key: apiKey,
    steamid: steamId,
    include_appinfo: '1',
    include_played_free_games: '1',
    format: 'json',
  })
  const response = await fetch(
    `https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/?${params}`,
  )

  if (!response.ok) {
    throw new Error(`Steam a refuse la synchronisation (${response.status}).`)
  }

  return parseSteamOwnedGames(await response.json())
}
