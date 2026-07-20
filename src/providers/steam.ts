import { readdir, readFile, stat } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join } from 'node:path'

export interface SteamOwnedGame {
  appid: number
  title: string
  coverUrl: string
  iconUrl: string | null
  playtimeForeverMinutes: number
  lastPlayedAt: string | null
  installed?: boolean
  installPath?: string | null
  lastUpdatedAt?: string | null
  sizeOnDiskBytes?: number | null
}

export interface SteamInstalledGame extends SteamOwnedGame {
  installed: true
  installPath: string | null
  lastUpdatedAt: string | null
  ownerSteamId: string | null
  sizeOnDiskBytes: number | null
}

export interface SteamOwnedGamesResult {
  totalCount: number
  games: SteamOwnedGame[]
}

export interface SteamAppDetails {
  appid: number
  title: string | null
  coverUrl: string | null
}

export interface SteamLocalAppActivity {
  appid: number
  playtimeForeverMinutes: number
  lastPlayedAt: string | null
}

export interface SteamLocalLibraryResult {
  games: SteamInstalledGame[]
  activities: SteamLocalAppActivity[]
  libraryPaths: string[]
  manifestCount: number
  localConfigPath: string | null
}

interface FetchSteamOwnedGamesInput {
  apiKey: string
  steamId: string
  fetchImpl?: typeof fetch
  timeoutMs?: number
}

interface FetchSteamAppDetailsInput {
  appids: number[]
  fetchImpl?: typeof fetch
  timeoutMs?: number
}

interface ReadSteamLocalLibraryInput {
  ownerSteamId?: string
  steamRootPath?: string
  libraryPaths?: string[]
}

type SteamKeyValue = string | SteamKeyValueObject

interface SteamKeyValueObject {
  [key: string]: SteamKeyValue
}

const defaultSteamTimeoutMs = 15_000
const steamId64Pattern = /^\d{17}$/
const steamId64AccountIdOffset = 76_561_197_960_265_728n

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function readNumber(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function readString(value: unknown) {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null
}

function readNumberLike(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }

  if (typeof value !== 'string') {
    return null
  }

  const numberValue = Number(value.trim())

  return Number.isFinite(numberValue) ? numberValue : null
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

function unixTimestampToIso(value: unknown) {
  const timestamp = readNumberLike(value)

  return timestamp && timestamp > 0 ? new Date(timestamp * 1000).toISOString() : null
}

function latestIsoDate(left: string | null, right: string | null) {
  if (!left) {
    return right
  }

  if (!right) {
    return left
  }

  return new Date(left).getTime() >= new Date(right).getTime() ? left : right
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

function tokenizeSteamKeyValues(content: string) {
  const tokens: string[] = []
  let index = 0

  while (index < content.length) {
    const character = content[index]

    if (/\s/.test(character)) {
      index += 1
      continue
    }

    if (character === '/' && content[index + 1] === '/') {
      index += 2

      while (index < content.length && content[index] !== '\n') {
        index += 1
      }

      continue
    }

    if (character === '{' || character === '}') {
      tokens.push(character)
      index += 1
      continue
    }

    if (character === '"') {
      let value = ''
      index += 1

      while (index < content.length) {
        const current = content[index]

        if (current === '\\' && index + 1 < content.length) {
          const next = content[index + 1]

          if (next === '\\' || next === '"') {
            value += next
            index += 2
            continue
          }
        }

        if (current === '"') {
          index += 1
          break
        }

        value += current
        index += 1
      }

      tokens.push(value)
      continue
    }

    let value = ''

    while (
      index < content.length &&
      !/\s/.test(content[index]) &&
      content[index] !== '{' &&
      content[index] !== '}'
    ) {
      value += content[index]
      index += 1
    }

    if (value.length > 0) {
      tokens.push(value)
    }
  }

  return tokens
}

function readSteamKeyValueObject(tokens: string[], cursor: { index: number }) {
  const object: SteamKeyValueObject = {}

  while (cursor.index < tokens.length && tokens[cursor.index] !== '}') {
    const key = tokens[cursor.index]
    const next = tokens[cursor.index + 1]

    if (key === undefined || next === undefined || key === '{') {
      throw new Error('Fichier Steam invalide.')
    }

    cursor.index += 2

    if (next === '{') {
      object[key] = readSteamKeyValueObject(tokens, cursor)
      continue
    }

    object[key] = next
  }

  if (tokens[cursor.index] === '}') {
    cursor.index += 1
  }

  return object
}

function asSteamKeyValueObject(value: SteamKeyValue | undefined) {
  return typeof value === 'object' && value !== null ? value : null
}

function accountIdFromSteamId64(steamId: string) {
  const normalizedSteamId = normalizeSteamId(steamId)
  const accountId = BigInt(normalizedSteamId) - steamId64AccountIdOffset

  return accountId >= 0n ? accountId.toString() : null
}

function splitConfiguredPaths(value: string | undefined) {
  return value
    ?.split(';')
    .map((path) => path.trim())
    .filter((path) => path.length > 0) ?? []
}

function createCandidateSteamRootPaths(steamRootPath?: string) {
  const homeDirectory = homedir()
  const rootPaths = [
    steamRootPath,
    process.env['LUDUX_STEAM_ROOT_PATH'],
    process.env['STEAM_PATH'],
    'C:\\Program Files (x86)\\Steam',
    'C:\\Program Files\\Steam',
    join(homeDirectory, 'Library', 'Application Support', 'Steam'),
    join(homeDirectory, '.steam', 'steam'),
    join(homeDirectory, '.local', 'share', 'Steam'),
  ]

  return Array.from(
    new Set(rootPaths.filter((path): path is string => Boolean(path?.trim()))),
  )
}

async function pathExists(path: string) {
  try {
    await stat(path)
    return true
  } catch {
    return false
  }
}

async function readTextFileIfExists(path: string) {
  try {
    return await readFile(path, 'utf8')
  } catch {
    return null
  }
}

export function parseSteamKeyValues(content: string): SteamKeyValueObject {
  const cursor = {
    index: 0,
  }

  return readSteamKeyValueObject(tokenizeSteamKeyValues(content), cursor)
}

export function parseSteamLibraryFolders(content: string) {
  const root = parseSteamKeyValues(content)
  const libraryFolders = asSteamKeyValueObject(root['libraryfolders'])

  if (!libraryFolders) {
    return []
  }

  return Object.values(libraryFolders)
    .map((value) => readString(asSteamKeyValueObject(value)?.['path']))
    .filter((path): path is string => path !== null)
}

export function parseSteamAppManifest(
  content: string,
  libraryPath: string | null = null,
): SteamInstalledGame | null {
  const root = parseSteamKeyValues(content)
  const appState = asSteamKeyValueObject(root['AppState'])

  if (!appState) {
    return null
  }

  const appid = Math.trunc(readNumberLike(appState['appid']) ?? 0)
  const title = readString(appState['name'])

  if (appid <= 0 || !title) {
    return null
  }

  const installDir = readString(appState['installdir'])
  const lastPlayedAt = unixTimestampToIso(appState['LastPlayed'])
  const installPath =
    libraryPath && installDir
      ? join(libraryPath, 'steamapps', 'common', installDir)
      : null

  return {
    appid,
    title,
    coverUrl: steamCoverUrl(appid),
    iconUrl: null,
    installed: true,
    installPath,
    lastPlayedAt,
    lastUpdatedAt: unixTimestampToIso(appState['LastUpdated']),
    ownerSteamId: readString(appState['LastOwner']),
    playtimeForeverMinutes: 0,
    sizeOnDiskBytes: readNumberLike(appState['SizeOnDisk']),
  }
}

export function parseSteamLocalConfigApps(content: string): SteamLocalAppActivity[] {
  const root = parseSteamKeyValues(content)
  const apps = asSteamKeyValueObject(
    asSteamKeyValueObject(
      asSteamKeyValueObject(
        asSteamKeyValueObject(
          asSteamKeyValueObject(root['UserLocalConfigStore'])?.['Software'],
        )?.['Valve'],
      )?.['Steam'],
    )?.['apps'],
  )

  if (!apps) {
    return []
  }

  return Object.entries(apps).flatMap(([appidValue, value]): SteamLocalAppActivity[] => {
    const appid = Math.trunc(readNumberLike(appidValue) ?? 0)
    const app = asSteamKeyValueObject(value)

    if (appid <= 0 || !app) {
      return []
    }

    return [
      {
        appid,
        lastPlayedAt: unixTimestampToIso(app['LastPlayed']),
        playtimeForeverMinutes: Math.max(
          0,
          Math.round(readNumberLike(app['Playtime']) ?? 0),
        ),
      },
    ]
  })
}

function tryParseSteamLibraryFolders(content: string) {
  try {
    return parseSteamLibraryFolders(content)
  } catch {
    return []
  }
}

function tryParseSteamAppManifest(
  content: string,
  libraryPath: string | null,
): SteamInstalledGame | null {
  try {
    return parseSteamAppManifest(content, libraryPath)
  } catch {
    return null
  }
}

function tryParseSteamLocalConfigApps(content: string) {
  try {
    return parseSteamLocalConfigApps(content)
  } catch {
    return []
  }
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

export function createSteamAppDetailsUrl(appid: number) {
  const normalizedAppId = Math.trunc(appid)

  if (!Number.isFinite(normalizedAppId) || normalizedAppId <= 0) {
    throw new Error('Identifiant Steam invalide.')
  }

  const params = new URLSearchParams({
    filters: 'basic',
  })

  return `https://store.steampowered.com/api/appdetails?appids=${normalizedAppId}&${params}`
}

export function mergeSteamGames(
  ownedGames: SteamOwnedGame[],
  installedGames: SteamInstalledGame[],
  localActivities: SteamLocalAppActivity[] = [],
) {
  const gamesByAppId = new Map<number, SteamOwnedGame>()

  for (const game of ownedGames) {
    gamesByAppId.set(game.appid, {
      ...game,
    })
  }

  for (const game of installedGames) {
    const existingGame = gamesByAppId.get(game.appid)

    gamesByAppId.set(game.appid, {
      ...existingGame,
      ...game,
      coverUrl: existingGame?.coverUrl ?? game.coverUrl,
      iconUrl: existingGame?.iconUrl ?? game.iconUrl,
      lastPlayedAt: latestIsoDate(existingGame?.lastPlayedAt ?? null, game.lastPlayedAt),
      playtimeForeverMinutes: Math.max(
        existingGame?.playtimeForeverMinutes ?? 0,
        game.playtimeForeverMinutes,
      ),
      title: game.title || existingGame?.title || String(game.appid),
    })
  }

  for (const activity of localActivities) {
    const existingGame = gamesByAppId.get(activity.appid)

    if (!existingGame) {
      continue
    }

    gamesByAppId.set(activity.appid, {
      ...existingGame,
      lastPlayedAt: latestIsoDate(existingGame.lastPlayedAt, activity.lastPlayedAt),
      playtimeForeverMinutes: Math.max(
        existingGame.playtimeForeverMinutes,
        activity.playtimeForeverMinutes,
      ),
    })
  }

  return [...gamesByAppId.values()].sort((left, right) =>
    left.title.localeCompare(right.title, 'fr-FR'),
  )
}

function normalizeSteamAppIds(appids: number[]) {
  return [
    ...new Set(
      appids
        .map((appid) => Math.trunc(appid))
        .filter((appid) => Number.isFinite(appid) && appid > 0),
    ),
  ]
}

export function parseSteamAppDetails(payload: unknown): SteamAppDetails[] {
  if (!isRecord(payload)) {
    return []
  }

  return Object.entries(payload).flatMap(([appidValue, value]): SteamAppDetails[] => {
    const appid = Math.trunc(readNumberLike(appidValue) ?? 0)

    if (appid <= 0 || !isRecord(value) || value['success'] !== true) {
      return []
    }

    const data = isRecord(value['data']) ? value['data'] : null

    if (!data) {
      return []
    }

    const coverUrl = readString(data['header_image']) ?? readString(data['capsule_image'])

    return [
      {
        appid,
        title: readString(data['name']),
        coverUrl,
      },
    ]
  })
}

export function mergeSteamAppDetails(
  games: SteamOwnedGame[],
  details: SteamAppDetails[],
) {
  const detailsByAppId = new Map(details.map((detail) => [detail.appid, detail]))

  return games.map((game) => {
    const detail = detailsByAppId.get(game.appid)

    if (!detail) {
      return game
    }

    return {
      ...game,
      coverUrl: detail.coverUrl ?? game.coverUrl,
      title: detail.title ?? game.title,
    }
  })
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

export async function fetchSteamAppDetails({
  appids,
  fetchImpl = fetch,
  timeoutMs = defaultSteamTimeoutMs,
}: FetchSteamAppDetailsInput): Promise<SteamAppDetails[]> {
  const details: SteamAppDetails[] = []

  for (const appid of normalizeSteamAppIds(appids)) {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), timeoutMs)

    let response: Response

    try {
      response = await fetchImpl(createSteamAppDetailsUrl(appid), {
        signal: controller.signal,
      })
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new Error('Steam Store ne repond pas. Reessayez plus tard.')
      }

      throw new Error('Impossible de joindre Steam Store. Verifiez la connexion reseau.')
    } finally {
      clearTimeout(timeout)
    }

    if (!response.ok) {
      throw new Error(`Steam Store a refuse les jaquettes (${response.status}).`)
    }

    details.push(...parseSteamAppDetails(await response.json()))
  }

  return details
}

export async function readSteamLocalLibrary({
  libraryPaths = splitConfiguredPaths(process.env['LUDUX_STEAM_LIBRARY_PATHS']),
  ownerSteamId,
  steamRootPath,
}: ReadSteamLocalLibraryInput = {}): Promise<SteamLocalLibraryResult> {
  const steamRootPaths = createCandidateSteamRootPaths(steamRootPath)
  const discoveredLibraryPaths = new Set<string>(libraryPaths)
  const existingSteamRootPaths: string[] = []

  for (const rootPath of steamRootPaths) {
    if (!(await pathExists(rootPath))) {
      continue
    }

    existingSteamRootPaths.push(rootPath)
    discoveredLibraryPaths.add(rootPath)

    const libraryFoldersContent = await readTextFileIfExists(
      join(rootPath, 'steamapps', 'libraryfolders.vdf'),
    )

    if (libraryFoldersContent) {
      for (const libraryPath of tryParseSteamLibraryFolders(libraryFoldersContent)) {
        discoveredLibraryPaths.add(libraryPath)
      }
    }
  }

  const normalizedOwnerSteamId = ownerSteamId ? normalizeSteamId(ownerSteamId) : null
  const localGamesByAppId = new Map<number, SteamInstalledGame>()
  let manifestCount = 0

  for (const libraryPath of discoveredLibraryPaths) {
    const steamAppsPath = join(libraryPath, 'steamapps')

    let files: string[]

    try {
      files = await readdir(steamAppsPath)
    } catch {
      continue
    }

    for (const file of files) {
      if (!/^appmanifest_\d+\.acf$/i.test(file)) {
        continue
      }

      const content = await readTextFileIfExists(join(steamAppsPath, file))
      const game = content ? tryParseSteamAppManifest(content, libraryPath) : null

      if (!game) {
        continue
      }

      manifestCount += 1

      if (
        normalizedOwnerSteamId &&
        game.ownerSteamId &&
        game.ownerSteamId !== normalizedOwnerSteamId
      ) {
        continue
      }

      localGamesByAppId.set(game.appid, game)
    }
  }

  const accountId = ownerSteamId ? accountIdFromSteamId64(ownerSteamId) : null
  let activities: SteamLocalAppActivity[] = []
  let localConfigPath: string | null = null

  if (accountId) {
    for (const rootPath of existingSteamRootPaths) {
      const candidatePath = join(rootPath, 'userdata', accountId, 'config', 'localconfig.vdf')
      const content = await readTextFileIfExists(candidatePath)

      if (!content) {
        continue
      }

      activities = tryParseSteamLocalConfigApps(content)
      localConfigPath = candidatePath
      break
    }
  }

  return {
    games: mergeSteamGames([], [...localGamesByAppId.values()], activities) as SteamInstalledGame[],
    activities,
    libraryPaths: [...discoveredLibraryPaths],
    localConfigPath,
    manifestCount,
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
