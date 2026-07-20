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
  categories?: string[]
  description?: string | null
  developer?: string | null
  installed?: boolean
  installPath?: string | null
  lastUpdatedAt?: string | null
  publisher?: string | null
  releaseDate?: string | null
  sizeOnDiskBytes?: number | null
  website?: string | null
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
  description: string | null
  developer: string | null
  dlcAppIds: number[]
  publisher: string | null
  releaseDate: string | null
  website: string | null
}

export interface SteamAchievement {
  externalId: string
  name: string
  description: string | null
  iconUrl: string | null
  unlocked: boolean
  unlockDate: string | null
}

export interface SteamLocalAppActivity {
  appid: number
  playtimeForeverMinutes: number
  lastPlayedAt: string | null
}

export interface SteamLocalAppCategories {
  appid: number
  categories: string[]
}

export interface SteamLocalLibraryResult {
  games: SteamInstalledGame[]
  activities: SteamLocalAppActivity[]
  categories: SteamLocalAppCategories[]
  libraryPaths: string[]
  manifestCount: number
  cloudStoragePath: string | null
  localConfigPath: string | null
  sharedConfigPath: string | null
}

interface FetchSteamOwnedGamesInput {
  apiKey: string
  steamId: string
  fetchImpl?: typeof fetch
  timeoutMs?: number
}

interface FetchSteamAppDetailsInput {
  allowPartial?: boolean
  appids: number[]
  fetchImpl?: typeof fetch
  timeoutMs?: number
}

interface FetchSteamDlcCatalogInput {
  appid: number
  fetchImpl?: typeof fetch
  timeoutMs?: number
}

interface FetchSteamAchievementsInput {
  apiKey: string
  appid: number
  steamId: string
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
const steamStoreHeaders = {
  Accept: 'application/json,text/plain,*/*',
  'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.5',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Ludux/0.24.4',
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

function readStringList(value: unknown) {
  if (!Array.isArray(value)) {
    return null
  }

  const items = value
    .map((item) => readString(item))
    .filter((item): item is string => item !== null)

  return items.length > 0 ? items.join(', ') : null
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

function decodeHtmlEntities(value: string) {
  const entities: Record<string, string> = {
    amp: '&',
    apos: "'",
    laquo: '«',
    nbsp: ' ',
    quot: '"',
    raquo: '»',
  }

  return value.replace(/&(#(\d+)|#x([\da-f]+)|[a-z]+);/gi, (match, entity, decimal, hex) => {
    if (decimal) {
      return String.fromCodePoint(Number(decimal))
    }

    if (hex) {
      return String.fromCodePoint(Number.parseInt(hex, 16))
    }

    return entities[String(entity).toLowerCase()] ?? match
  })
}

function stripHtml(value: string | null) {
  return decodeHtmlEntities(
    value
      ?.replace(/<\s*br\s*\/?>/gi, '\n')
      .replace(/<\/\s*(p|li|h[1-6]|div)\s*>/gi, '\n\n')
      .replace(/<[^>]*>/g, ' ')
      .replace(/[ \t]+/g, ' ')
      .replace(/\n[ \t]+/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim() ?? '',
  ).trim() || null
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
    throw new Error('Clé API Steam obligatoire pour synchroniser.')
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
    return 'Steam a refusé la synchronisation. Vérifiez la clé API Steam.'
  }

  if (status === 404) {
    return 'Steam ne trouve pas le service de bibliothèque.'
  }

  if (status === 429) {
    return 'Steam limite temporairement les requêtes. Réessayez plus tard.'
  }

  if (status >= 500) {
    return 'Steam est temporairement indisponible. Réessayez plus tard.'
  }

  return `Steam a refusé la synchronisation (${status}).`
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

function readSteamObjectValue(
  object: SteamKeyValueObject | null,
  key: string,
) {
  if (!object) {
    return undefined
  }

  const normalizedKey = key.toLocaleLowerCase('en-US')

  return Object.entries(object).find(
    ([entryKey]) => entryKey.toLocaleLowerCase('en-US') === normalizedKey,
  )?.[1]
}

function readSteamNestedObject(
  root: SteamKeyValueObject,
  keys: string[],
) {
  let current: SteamKeyValueObject | null = root

  for (const key of keys) {
    current = asSteamKeyValueObject(readSteamObjectValue(current, key))

    if (!current) {
      return null
    }
  }

  return current
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
    lastPlayedAt: null,
    lastUpdatedAt: unixTimestampToIso(appState['LastUpdated']),
    ownerSteamId: readString(appState['LastOwner']),
    playtimeForeverMinutes: 0,
    sizeOnDiskBytes: readNumberLike(appState['SizeOnDisk']),
  }
}

export function parseSteamLocalConfigApps(content: string): SteamLocalAppActivity[] {
  const root = parseSteamKeyValues(content)
  const apps = readSteamNestedObject(root, [
    'UserLocalConfigStore',
    'Software',
    'Valve',
    'Steam',
    'apps',
  ])

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

function readSteamAppMap(root: SteamKeyValueObject) {
  return [
    readSteamNestedObject(root, [
      'UserRoamingConfigStore',
      'Software',
      'Valve',
      'Steam',
      'apps',
    ]),
    readSteamNestedObject(root, [
      'UserLocalConfigStore',
      'Software',
      'Valve',
      'Steam',
      'apps',
    ]),
  ].filter((apps): apps is SteamKeyValueObject => apps !== null)
}

function readSteamAppCategories(app: SteamKeyValueObject) {
  const tags = asSteamKeyValueObject(
    readSteamObjectValue(app, 'tags') ?? readSteamObjectValue(app, 'categories'),
  )

  if (!tags) {
    return []
  }

  return Array.from(
    new Set(
      Object.values(tags)
        .map((value) => readString(value))
        .filter((category): category is string => category !== null),
    ),
  ).sort((left, right) => left.localeCompare(right, 'fr-FR'))
}

function readSteamCollectionAppIds(value: unknown) {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .map((appid) => Math.trunc(readNumberLike(appid) ?? 0))
    .filter((appid) => Number.isFinite(appid) && appid > 0)
}

function shouldSyncSteamCollection({
  id,
  key,
  name,
}: {
  id: string | null
  key: string
  name: string
}) {
  const normalizedId = id?.toLocaleLowerCase('en-US') ?? ''
  const normalizedKey = key.toLocaleLowerCase('en-US')
  const normalizedName = name
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLocaleLowerCase('fr-FR')

  return (
    normalizedId !== 'hidden' &&
    !normalizedKey.endsWith('.hidden') &&
    normalizedName !== 'masques' &&
    normalizedName !== 'hidden'
  )
}

export function parseSteamLocalAppCategories(
  content: string,
): SteamLocalAppCategories[] {
  const root = parseSteamKeyValues(content)
  const categoriesByAppId = new Map<number, Set<string>>()

  for (const apps of readSteamAppMap(root)) {
    for (const [appidValue, value] of Object.entries(apps)) {
      const appid = Math.trunc(readNumberLike(appidValue) ?? 0)
      const app = asSteamKeyValueObject(value)

      if (appid <= 0 || !app) {
        continue
      }

      const categories = readSteamAppCategories(app)

      if (categories.length === 0) {
        continue
      }

      const existingCategories = categoriesByAppId.get(appid) ?? new Set<string>()

      for (const category of categories) {
        existingCategories.add(category)
      }

      categoriesByAppId.set(appid, existingCategories)
    }
  }

  return [...categoriesByAppId.entries()]
    .map(([appid, categories]) => ({
      appid,
      categories: [...categories].sort((left, right) => left.localeCompare(right, 'fr-FR')),
    }))
    .sort((left, right) => left.appid - right.appid)
}

export function parseSteamCloudStorageCollections(
  content: string,
): SteamLocalAppCategories[] {
  const payload = JSON.parse(content) as unknown

  if (!Array.isArray(payload)) {
    return []
  }

  const categoriesByAppId = new Map<number, Set<string>>()

  for (const entry of payload) {
    const record = Array.isArray(entry) ? entry[1] : entry

    if (!isRecord(record) || record['is_deleted'] === true) {
      continue
    }

    const key = readString(record['key'])

    if (!key?.toLocaleLowerCase('en-US').startsWith('user-collections.')) {
      continue
    }

    const value = readString(record['value'])

    if (!value) {
      continue
    }

    let collectionPayload: unknown

    try {
      collectionPayload = JSON.parse(value)
    } catch {
      continue
    }

    if (!isRecord(collectionPayload)) {
      continue
    }

    const name = readString(collectionPayload['name'])

    if (!name) {
      continue
    }

    const id = readString(collectionPayload['id'])

    if (!shouldSyncSteamCollection({ id, key, name })) {
      continue
    }

    const removedAppIds = new Set(readSteamCollectionAppIds(collectionPayload['removed']))

    for (const appid of readSteamCollectionAppIds(collectionPayload['added'])) {
      if (removedAppIds.has(appid)) {
        continue
      }

      const categories = categoriesByAppId.get(appid) ?? new Set<string>()

      categories.add(name)
      categoriesByAppId.set(appid, categories)
    }
  }

  return [...categoriesByAppId.entries()]
    .map(([appid, categories]) => ({
      appid,
      categories: [...categories].sort((left, right) => left.localeCompare(right, 'fr-FR')),
    }))
    .sort((left, right) => left.appid - right.appid)
}

function mergeSteamLocalCategories(
  ...categoryLists: SteamLocalAppCategories[][]
) {
  const categoriesByAppId = new Map<number, Set<string>>()

  for (const categoryList of categoryLists) {
    for (const item of categoryList) {
      const categories = categoriesByAppId.get(item.appid) ?? new Set<string>()

      for (const category of item.categories) {
        categories.add(category)
      }

      categoriesByAppId.set(item.appid, categories)
    }
  }

  return [...categoriesByAppId.entries()].map(([appid, categories]) => ({
    appid,
    categories: [...categories].sort((left, right) => left.localeCompare(right, 'fr-FR')),
  }))
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

function tryParseSteamLocalAppCategories(content: string) {
  try {
    return parseSteamLocalAppCategories(content)
  } catch {
    return []
  }
}

function tryParseSteamCloudStorageCollections(content: string) {
  try {
    return parseSteamCloudStorageCollections(content)
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
    filters:
      'basic,short_description,about_the_game,detailed_description,developers,publishers,website,release_date,dlc',
    l: 'french',
  })

  return `https://store.steampowered.com/api/appdetails?appids=${normalizedAppId}&${params}`
}

export function createSteamDlcForAppUrl(appid: number) {
  const normalizedAppId = Math.trunc(appid)

  if (!Number.isFinite(normalizedAppId) || normalizedAppId <= 0) {
    throw new Error('Identifiant Steam invalide.')
  }

  const params = new URLSearchParams({
    appid: String(normalizedAppId),
    l: 'french',
    cc: 'FR',
  })

  return `https://store.steampowered.com/api/dlcforapp/?${params}`
}

export function createSteamAchievementSchemaUrl(apiKey: string, appid: number) {
  const normalizedAppId = Math.trunc(appid)

  if (!Number.isFinite(normalizedAppId) || normalizedAppId <= 0) {
    throw new Error('Identifiant Steam invalide.')
  }

  const params = new URLSearchParams({
    key: normalizeSteamApiKey(apiKey),
    appid: String(normalizedAppId),
    l: 'french',
    format: 'json',
  })

  return `https://api.steampowered.com/ISteamUserStats/GetSchemaForGame/v2/?${params}`
}

export function createSteamPlayerAchievementsUrl(
  apiKey: string,
  steamId: string,
  appid: number,
) {
  const normalizedAppId = Math.trunc(appid)

  if (!Number.isFinite(normalizedAppId) || normalizedAppId <= 0) {
    throw new Error('Identifiant Steam invalide.')
  }

  const params = new URLSearchParams({
    key: normalizeSteamApiKey(apiKey),
    steamid: normalizeSteamId(steamId),
    appid: String(normalizedAppId),
    l: 'french',
    format: 'json',
  })

  return `https://api.steampowered.com/ISteamUserStats/GetPlayerAchievements/v1/?${params}`
}

export function mergeSteamGames(
  ownedGames: SteamOwnedGame[],
  installedGames: SteamInstalledGame[],
  localActivities: SteamLocalAppActivity[] = [],
  localCategories: SteamLocalAppCategories[] = [],
) {
  const gamesByAppId = new Map<number, SteamOwnedGame>()
  const categoriesByAppId = new Map(
    localCategories.map((item) => [item.appid, item.categories]),
  )

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

  for (const [appid, categories] of categoriesByAppId) {
    const existingGame = gamesByAppId.get(appid)

    if (!existingGame) {
      continue
    }

    gamesByAppId.set(appid, {
      ...existingGame,
      categories,
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

function parseSteamStoreReleaseDate(value: unknown) {
  const releaseDate = readString(isRecord(value) ? value['date'] : value)

  if (!releaseDate) {
    return null
  }

  const parsedDate = new Date(`${releaseDate} UTC`)

  return Number.isNaN(parsedDate.getTime()) ? null : parsedDate.toISOString()
}

function readSteamDlcAppIds(value: unknown) {
  if (!Array.isArray(value)) {
    return []
  }

  return normalizeSteamAppIds(value.map((appid) => readNumberLike(appid) ?? 0))
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
    const description = stripHtml(
      readString(data['short_description']) ??
        readString(data['about_the_game']) ??
        readString(data['detailed_description']),
    )

    return [
      {
        appid,
        title: readString(data['name']),
        coverUrl,
        description,
        developer: readStringList(data['developers']),
        dlcAppIds: readSteamDlcAppIds(data['dlc']),
        publisher: readStringList(data['publishers']),
        releaseDate: parseSteamStoreReleaseDate(data['release_date']),
        website: readString(data['website']),
      },
    ]
  })
}

export function parseSteamDlcForApp(payload: unknown): SteamAppDetails[] {
  if (!isRecord(payload) || readNumberLike(payload['status']) !== 1) {
    return []
  }

  const dlcs = Array.isArray(payload['dlc']) ? payload['dlc'] : []

  return dlcs.flatMap((dlc): SteamAppDetails[] => {
    if (!isRecord(dlc)) {
      return []
    }

    const appid = Math.trunc(readNumberLike(dlc['id']) ?? 0)
    const title = readString(dlc['name'])

    if (appid <= 0 || !title) {
      return []
    }

    return [
      {
        appid,
        title,
        coverUrl: readString(dlc['header_image']) ?? readString(dlc['capsule_image']),
        description: stripHtml(readString(dlc['description'])),
        developer: null,
        dlcAppIds: [],
        publisher: null,
        releaseDate: parseSteamStoreReleaseDate(dlc['release_date']),
        website: null,
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
      description: detail.description ?? game.description,
      developer: detail.developer ?? game.developer,
      publisher: detail.publisher ?? game.publisher,
      releaseDate: detail.releaseDate ?? game.releaseDate,
      title: detail.title ?? game.title,
      website: detail.website ?? game.website,
    }
  })
}

export function parseSteamAchievementSchema(payload: unknown) {
  const achievements = isRecord(payload) &&
    isRecord(payload['game']) &&
    isRecord(payload['game']['availableGameStats']) &&
    Array.isArray(payload['game']['availableGameStats']['achievements'])
    ? payload['game']['availableGameStats']['achievements']
    : []

  return achievements.flatMap((achievement): Omit<SteamAchievement, 'unlocked' | 'unlockDate'>[] => {
    if (!isRecord(achievement)) {
      return []
    }

    const externalId = readString(achievement['name'])
    const name = readString(achievement['displayName']) ?? externalId

    if (!externalId || !name) {
      return []
    }

    return [
      {
        externalId,
        name,
        description: readString(achievement['description']),
        iconUrl: readString(achievement['icon']),
      },
    ]
  })
}

export function parseSteamPlayerAchievements(payload: unknown) {
  const achievements = isRecord(payload) &&
    isRecord(payload['playerstats']) &&
    payload['playerstats']['success'] !== false &&
    Array.isArray(payload['playerstats']['achievements'])
    ? payload['playerstats']['achievements']
    : []

  return achievements.flatMap((achievement): Pick<SteamAchievement, 'externalId' | 'unlocked' | 'unlockDate'>[] => {
    if (!isRecord(achievement)) {
      return []
    }

    const externalId = readString(achievement['apiname'])

    if (!externalId) {
      return []
    }

    return [
      {
        externalId,
        unlocked: readNumberLike(achievement['achieved']) === 1,
        unlockDate: unixTimestampToIso(achievement['unlocktime']),
      },
    ]
  })
}

export function mergeSteamAchievements(
  schemaAchievements: Omit<SteamAchievement, 'unlocked' | 'unlockDate'>[],
  playerAchievements: Pick<SteamAchievement, 'externalId' | 'unlocked' | 'unlockDate'>[],
) {
  const playerAchievementsById = new Map(
    playerAchievements.map((achievement) => [achievement.externalId, achievement]),
  )

  return schemaAchievements.map((achievement) => {
    const playerAchievement = playerAchievementsById.get(achievement.externalId)

    return {
      ...achievement,
      unlocked: playerAchievement?.unlocked ?? false,
      unlockDate: playerAchievement?.unlockDate ?? null,
    }
  })
}

export function hasDatedSteamPlaytime(
  game: Pick<SteamOwnedGame, 'lastPlayedAt' | 'playtimeForeverMinutes'>,
) {
  return game.playtimeForeverMinutes > 0 && Boolean(game.lastPlayedAt)
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
  allowPartial = false,
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
        headers: steamStoreHeaders,
        signal: controller.signal,
      })
      if (!response.ok) {
        throw new Error(`Steam Store a refusé les données (${response.status}).`)
      }

      details.push(...parseSteamAppDetails(await response.json()))
    } catch (error) {
      if (allowPartial) {
        continue
      }

      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new Error('Steam Store ne répond pas. Réessayez plus tard.')
      }

      if (error instanceof TypeError) {
        throw new Error('Impossible de joindre Steam Store. Vérifiez la connexion réseau.')
      }

      if (error instanceof Error) {
        throw error
      }

      throw new Error('Impossible de joindre Steam Store. Vérifiez la connexion réseau.')
    } finally {
      clearTimeout(timeout)
    }
  }

  return details
}

async function fetchSteamStoreJson({
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
      headers: steamStoreHeaders,
      signal: controller.signal,
    })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error('Steam Store ne répond pas. Réessayez plus tard.')
    }

    throw new Error('Impossible de joindre Steam Store. Vérifiez la connexion réseau.')
  } finally {
    clearTimeout(timeout)
  }

  if (!response.ok) {
    throw new Error(`Steam Store a refusé les données (${response.status}).`)
  }

  return response.json() as Promise<unknown>
}

async function fetchSteamDlcForApp({
  appid,
  fetchImpl,
  timeoutMs,
}: {
  appid: number
  fetchImpl: typeof fetch
  timeoutMs: number
}) {
  return parseSteamDlcForApp(
    await fetchSteamStoreJson({
      fetchImpl,
      timeoutMs,
      url: createSteamDlcForAppUrl(appid),
    }),
  )
}

export async function fetchSteamDlcCatalog({
  appid,
  fetchImpl = fetch,
  timeoutMs = defaultSteamTimeoutMs,
}: FetchSteamDlcCatalogInput): Promise<SteamAppDetails[]> {
  try {
    const directDlcCatalog = await fetchSteamDlcForApp({
      appid,
      fetchImpl,
      timeoutMs,
    })

    if (directDlcCatalog.length > 0) {
      return directDlcCatalog
    }
  } catch {
    // Steam Store can reject one public endpoint while another still works.
  }

  const [gameDetails] = await fetchSteamAppDetails({
    appids: [appid],
    fetchImpl,
    timeoutMs,
  })

  if (!gameDetails || gameDetails.dlcAppIds.length === 0) {
    return []
  }

  const dlcDetails = await fetchSteamAppDetails({
    allowPartial: true,
    appids: gameDetails.dlcAppIds,
    fetchImpl,
    timeoutMs,
  })
  const dlcDetailsByAppId = new Map(dlcDetails.map((detail) => [detail.appid, detail]))

  return gameDetails.dlcAppIds.map(
    (dlcAppId) =>
      dlcDetailsByAppId.get(dlcAppId) ?? {
        appid: dlcAppId,
        title: `Steam DLC ${dlcAppId}`,
        coverUrl: null,
        description: null,
        developer: null,
        dlcAppIds: [],
        publisher: null,
        releaseDate: null,
        website: null,
      },
  )
}

async function fetchSteamJson({
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
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error('Steam ne répond pas. Réessayez plus tard.')
    }

    throw new Error('Impossible de joindre Steam. Vérifiez la connexion réseau.')
  } finally {
    clearTimeout(timeout)
  }

  if (!response.ok) {
    throw new Error(createSteamErrorMessage(response.status))
  }

  return response.json()
}

export async function fetchSteamAchievements({
  apiKey,
  appid,
  fetchImpl = fetch,
  steamId,
  timeoutMs = defaultSteamTimeoutMs,
}: FetchSteamAchievementsInput) {
  const schemaPayload = await fetchSteamJson({
    fetchImpl,
    timeoutMs,
    url: createSteamAchievementSchemaUrl(apiKey, appid),
  })
  const schemaAchievements = parseSteamAchievementSchema(schemaPayload)

  try {
    const playerPayload = await fetchSteamJson({
      fetchImpl,
      timeoutMs,
      url: createSteamPlayerAchievementsUrl(apiKey, steamId, appid),
    })

    return mergeSteamAchievements(
      schemaAchievements,
      parseSteamPlayerAchievements(playerPayload),
    )
  } catch {
    return mergeSteamAchievements(schemaAchievements, [])
  }
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
  let categories: SteamLocalAppCategories[] = []
  let cloudStoragePath: string | null = null
  let localConfigPath: string | null = null
  let sharedConfigPath: string | null = null

  if (accountId) {
    for (const rootPath of existingSteamRootPaths) {
      const candidatePath = join(rootPath, 'userdata', accountId, 'config', 'localconfig.vdf')
      const content = await readTextFileIfExists(candidatePath)

      if (!content) {
        continue
      }

      activities = tryParseSteamLocalConfigApps(content)
      categories = mergeSteamLocalCategories(
        categories,
        tryParseSteamLocalAppCategories(content),
      )
      localConfigPath = candidatePath
      break
    }

    for (const rootPath of existingSteamRootPaths) {
      const candidatePaths = [
        join(rootPath, 'userdata', accountId, '7', 'remote', 'sharedconfig.vdf'),
        join(rootPath, 'userdata', accountId, 'config', 'sharedconfig.vdf'),
      ]

      for (const candidatePath of candidatePaths) {
        const content = await readTextFileIfExists(candidatePath)

        if (!content) {
          continue
        }

        categories = mergeSteamLocalCategories(
          categories,
          tryParseSteamLocalAppCategories(content),
        )
        sharedConfigPath = candidatePath
        break
      }

      if (sharedConfigPath) {
        break
      }
    }

    for (const rootPath of existingSteamRootPaths) {
      const candidatePath = join(
        rootPath,
        'userdata',
        accountId,
        'config',
        'cloudstorage',
        'cloud-storage-namespace-1.json',
      )
      const content = await readTextFileIfExists(candidatePath)

      if (!content) {
        continue
      }

      categories = mergeSteamLocalCategories(
        categories,
        tryParseSteamCloudStorageCollections(content),
      )
      cloudStoragePath = candidatePath
      break
    }
  }

  const games = mergeSteamGames(
    [],
    [...localGamesByAppId.values()],
    activities,
    categories,
  ) as SteamInstalledGame[]

  return {
    games,
    activities,
    categories,
    cloudStoragePath,
    libraryPaths: [...discoveredLibraryPaths],
    localConfigPath,
    manifestCount,
    sharedConfigPath,
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
      throw new Error('Steam ne répond pas. Réessayez plus tard.')
    }

    throw new Error('Impossible de joindre Steam. Vérifiez la connexion réseau.')
  } finally {
    clearTimeout(timeout)
  }

  if (!response.ok) {
    throw new Error(createSteamErrorMessage(response.status))
  }

  return parseSteamOwnedGames(await response.json())
}
