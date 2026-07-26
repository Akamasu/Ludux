import { execFile } from 'node:child_process'
import { readdir, readFile, stat } from 'node:fs/promises'
import { homedir } from 'node:os'
import { dirname, join, normalize } from 'node:path'
import { promisify } from 'node:util'
import type { ExternalProvider, LocalPlatformDetection } from '../types/settings'
import { readSteamLocalLibrary } from './steam'

type EpicLocalGameSource =
  | 'manifest'
  | 'launcher-installation'
  | 'managed-app'
  | 'launcher-cache'

export interface EpicInstalledGame {
  externalId: string
  title: string
  installPath: string | null
  manifestPath: string
  coverUrl: string | null
  source: EpicLocalGameSource
  acquiredAt: string | null
}

export interface EpicLocalLibraryResult {
  games: EpicInstalledGame[]
  manifestCount: number
  manifestPaths: string[]
  libraryPaths: string[]
  configPaths: string[]
}

export interface GogInstalledGame {
  externalId: string
  title: string
  installPath: string | null
  manifestPath: string
  coverUrl: string | null
  lastPlayedAt: string | null
  ownedAt: string | null
  playtimeMinutes: number
  dlcs?: GogDlc[]
  achievements?: GogAchievement[]
}

export interface GogDlc {
  externalId: string
  title: string
  owned: boolean
  ownedAt: string | null
}

export interface GogAchievement {
  externalId: string
  name: string
  description: string | null
  iconUrl: string | null
  unlocked: boolean
  unlockDate: string | null
}

export interface GogLocalLibraryResult {
  games: GogInstalledGame[]
  manifestCount: number
  manifestPaths: string[]
  libraryPaths: string[]
  configPaths: string[]
  galaxyGameCount: number
  registryGameCount: number
}

export interface UbisoftLocalInstall {
  externalId: string
  installPath: string
  registryPath: string
}

export interface BattleNetLocalConfig {
  clientPath: string | null
  defaultInstallPath: string | null
  productIds: string[]
}

const localPlatformCacheTtlMs = 30_000
const epicLauncherCacheMaxFileBytes = 32 * 1024 * 1024
const epicCacheRecordWindowBytes = 16_000
const epicIgnoredCacheNamespaces = new Set(['ue'])
const epicIgnoredCacheTitlePattern =
  /^(unreal engine|epic games launcher|game library|home|twinmotion|realitycapture)$/i
const epicIgnoredCacheContentPattern =
  /\b(dlc|add[- ]?on|texture pack|map pack|expansion map|dev kit|modkit|public testing)\b|beta$/i
const epicIgnoredCacheUrlPattern =
  /[\\/_-](dlc|addon|add-on|expansion|mappack|texturepack)[\\/_-]/i
const epicLocalGameSourcePriority: Record<EpicLocalGameSource, number> = {
  'managed-app': 4,
  'launcher-installation': 3,
  manifest: 2,
  'launcher-cache': 1,
}
const execFileAsync = promisify(execFile)

let cachedLocalPlatformOverview:
  | {
      expiresAt: number
      value: LocalPlatformDetection[]
    }
  | null = null

function splitConfiguredPaths(value: string | undefined) {
  return value
    ?.split(';')
    .map((path) => path.trim())
    .filter((path) => path.length > 0) ?? []
}

function uniqueTextValues(values: Array<string | null | undefined>) {
  return Array.from(
    new Set(
      values
        .map((value) => value?.trim())
        .filter((value): value is string => Boolean(value))
        .map((value) => normalize(value)),
    ),
  )
}

function createWindowsDriveLibraryCandidates(names: string[]) {
  if (process.platform !== 'win32') {
    return []
  }

  return 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').flatMap((driveLetter) => {
    const driveRoot = `${driveLetter}:\\`

    return names.flatMap((name) => [
      join(driveRoot, name),
      join(driveRoot, 'Games', name),
    ])
  })
}

function resolveEnvironmentPath(value: string | undefined) {
  return value?.trim() ? normalize(value.trim()) : null
}

async function pathExists(path: string) {
  try {
    await stat(path)
    return true
  } catch {
    return false
  }
}

async function directoryExists(path: string) {
  try {
    return (await stat(path)).isDirectory()
  } catch {
    return false
  }
}

async function fileExists(path: string) {
  try {
    return (await stat(path)).isFile()
  } catch {
    return false
  }
}

async function readDirectoryIfExists(path: string) {
  try {
    return await readdir(path, {
      withFileTypes: true,
    })
  } catch {
    return []
  }
}

function readJsonObject(value: string) {
  try {
    const normalizedValue = value.charCodeAt(0) === 0xfeff ? value.slice(1) : value
    const parsedValue = JSON.parse(normalizedValue)

    return typeof parsedValue === 'object' && parsedValue !== null
      ? (parsedValue as Record<string, unknown>)
      : null
  } catch {
    return null
  }
}

function readOptionalText(value: unknown) {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null
}

function readObject(value: unknown) {
  return isJsonObject(value) ? value : null
}

function decodeLocalTextFile(buffer: Buffer) {
  if (buffer.length >= 2 && buffer[0] === 0xff && buffer[1] === 0xfe) {
    return buffer.subarray(2).toString('utf16le')
  }

  if (buffer.length >= 2 && buffer[0] === 0xfe && buffer[1] === 0xff) {
    const swappedBuffer = Buffer.from(buffer.subarray(2))

    for (let index = 0; index + 1 < swappedBuffer.length; index += 2) {
      const left = swappedBuffer[index]
      swappedBuffer[index] = swappedBuffer[index + 1]
      swappedBuffer[index + 1] = left
    }

    return swappedBuffer.toString('utf16le')
  }

  const sample = buffer.subarray(0, Math.min(buffer.length, 200))
  const nullBytes = sample.filter((byte) => byte === 0).length

  if (sample.length > 0 && nullBytes / sample.length > 0.2) {
    return buffer.toString('utf16le')
  }

  return buffer.toString('utf8')
}

async function readLocalTextFile(path: string) {
  return decodeLocalTextFile(await readFile(path).catch(() => Buffer.alloc(0)))
}

function createEpicInstalledGame({
  acquiredAt = null,
  coverUrl = null,
  externalId,
  installPath = null,
  manifestPath,
  source,
  title,
}: {
  acquiredAt?: string | null
  coverUrl?: string | null
  externalId: string | null
  installPath?: string | null
  manifestPath: string
  source: EpicLocalGameSource
  title: string | null
}): EpicInstalledGame | null {
  if (!externalId || !title) {
    return null
  }

  return {
    externalId,
    title,
    installPath,
    manifestPath,
    coverUrl,
    source,
    acquiredAt,
  }
}

function isJsonObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function createDetection({
  configPaths = [],
  detected: detectedOverride,
  label,
  libraryPaths = [],
  manifestCount = 0,
  message,
  provider,
  rootPaths = [],
}: {
  configPaths?: string[]
  detected?: boolean
  label: string
  libraryPaths?: string[]
  manifestCount?: number
  message?: string
  provider: ExternalProvider
  rootPaths?: string[]
}): LocalPlatformDetection {
  const normalizedRootPaths = uniqueTextValues(rootPaths)
  const normalizedLibraryPaths = uniqueTextValues(libraryPaths)
  const normalizedConfigPaths = uniqueTextValues(configPaths)
  const detected =
    detectedOverride ??
    (normalizedRootPaths.length > 0 ||
      normalizedLibraryPaths.length > 0 ||
      normalizedConfigPaths.length > 0 ||
      manifestCount > 0)

  return {
    provider,
    label,
    detected,
    rootPaths: normalizedRootPaths,
    libraryPaths: normalizedLibraryPaths,
    configPaths: normalizedConfigPaths,
    manifestCount,
    message:
      message ??
      (detected
        ? 'Installation locale détectée.'
        : 'Aucun chemin local détecté pour le moment.'),
  }
}

async function detectSteamLocalPlatform(): Promise<LocalPlatformDetection> {
  const localLibrary = await readSteamLocalLibrary()

  return createDetection({
    provider: 'STEAM',
    label: 'Steam',
    rootPaths: localLibrary.libraryPaths.filter((path) =>
      path.toLocaleLowerCase('en-US').endsWith('steam'),
    ),
    libraryPaths: localLibrary.libraryPaths,
    configPaths: [
      localLibrary.localConfigPath,
      localLibrary.sharedConfigPath,
      localLibrary.cloudStoragePath,
    ].filter((path): path is string => Boolean(path)),
    manifestCount: localLibrary.manifestCount,
    message:
      localLibrary.manifestCount > 0
        ? `${localLibrary.manifestCount} manifest(s) Steam détecté(s).`
        : 'Steam détecté sans manifest de jeu installé.',
  })
}

export async function detectEpicLocalPlatform(): Promise<LocalPlatformDetection> {
  const localLibrary = await readEpicLocalLibrary()

  return createDetection({
    provider: 'EPIC',
    label: 'Epic Games',
    rootPaths: localLibrary.games.flatMap((game) =>
      game.installPath ? [game.installPath] : [],
    ),
    libraryPaths: localLibrary.libraryPaths,
    configPaths: localLibrary.configPaths,
    manifestCount: localLibrary.manifestCount,
    message:
      localLibrary.manifestCount > 0
        ? `${localLibrary.games.length} jeu(x) Epic détecté(s) depuis les fichiers locaux.`
        : localLibrary.libraryPaths.length > 0
          ? 'Dossier Epic repéré, en attente de fichiers de bibliothèque exploitables.'
        : localLibrary.configPaths.length > 0
          ? 'Epic détecté, mais aucune bibliothèque locale exploitable.'
          : 'Aucun fichier Epic local détecté.',
  })
}

export function parseEpicManifest(
  content: string,
  manifestPath: string,
): EpicInstalledGame | null {
  const payload = readJsonObject(content)

  if (!payload) {
    return null
  }

  const title =
    readOptionalText(payload['DisplayName']) ??
    readOptionalText(payload['Title']) ??
    readOptionalText(payload['AppName'])
  const externalId =
    readOptionalText(payload['MainGameCatalogItemId']) ??
    readOptionalText(payload['CatalogItemId']) ??
    readOptionalText(payload['AppName']) ??
    readOptionalText(payload['InstallLocation']) ??
    title

  if (!title || !externalId) {
    return null
  }

  return createEpicInstalledGame({
    externalId,
    title,
    installPath: readOptionalText(payload['InstallLocation']),
    manifestPath,
    source: 'manifest',
  })
}

export function parseEpicLauncherInstalledDatabase(
  content: string,
  manifestPath: string,
): EpicInstalledGame[] {
  const payload = readJsonObject(content)
  const installationList = Array.isArray(payload?.['InstallationList'])
    ? payload['InstallationList']
    : []

  return installationList
    .filter(isJsonObject)
    .map((installation) => {
      const title =
        readOptionalText(installation['DisplayName']) ??
        readOptionalText(installation['Title']) ??
        readOptionalText(installation['AppName']) ??
        readOptionalText(installation['ArtifactId'])
      const externalId =
        readOptionalText(installation['CatalogItemId']) ??
        readOptionalText(installation['CatalogID']) ??
        readOptionalText(installation['MainGameCatalogItemId']) ??
        readOptionalText(installation['AppName']) ??
        readOptionalText(installation['ArtifactId']) ??
        readOptionalText(installation['InstallLocation']) ??
        title

      return createEpicInstalledGame({
        externalId,
        title,
        installPath: readOptionalText(installation['InstallLocation']),
        manifestPath,
        source: 'launcher-installation',
      })
    })
    .filter((game): game is EpicInstalledGame => game !== null)
}

export function parseEpicManagedApp(
  content: string,
  manifestPath: string,
): EpicInstalledGame | null {
  const payload = readJsonObject(content)

  if (!payload) {
    return null
  }

  const title =
    readOptionalText(payload['Title']) ??
    readOptionalText(payload['DisplayName']) ??
    readOptionalText(payload['AppName'])
  const externalId =
    readOptionalText(payload['CatalogID']) ??
    readOptionalText(payload['CatalogItemId']) ??
    readOptionalText(payload['MainGameCatalogItemId']) ??
    readOptionalText(payload['AppName']) ??
    title

  return createEpicInstalledGame({
    externalId,
    title,
    manifestPath,
    source: 'managed-app',
  })
}

function createEpicCacheFieldMarker(field: string) {
  return Buffer.concat([Buffer.from([0x22, Buffer.byteLength(field)]), Buffer.from(field)])
}

function readEpicCacheVarint(buffer: Buffer, cursor: number, end: number) {
  let value = 0
  let shift = 0

  while (cursor < end && shift <= 28) {
    const byte = buffer[cursor]
    value += (byte & 0x7f) * 2 ** shift
    cursor += 1

    if ((byte & 0x80) === 0) {
      return {
        cursor,
        value,
      }
    }

    shift += 7
  }

  return null
}

function hasDisallowedControlCharacters(value: string) {
  return Array.from(value).some((character) => {
    const code = character.charCodeAt(0)

    return (code >= 1 && code <= 31) || code === 127
  })
}

function removeNullCharacters(value: string) {
  return Array.from(value)
    .filter((character) => character.charCodeAt(0) !== 0)
    .join('')
}

function readEpicCacheTextValue(buffer: Buffer, cursor: number, end: number) {
  if (cursor >= end) {
    return null
  }

  let valueCursor = cursor
  let encoding: BufferEncoding = 'utf8'

  if (buffer[valueCursor] === 0x22) {
    valueCursor += 1
  }

  if (buffer[valueCursor] === 0x00 && buffer[valueCursor + 1] === 0x63) {
    encoding = 'utf16le'
    valueCursor += 2
  } else if (buffer[valueCursor] === 0x63) {
    encoding = 'utf16le'
    valueCursor += 1
  }

  const lengthData = readEpicCacheVarint(buffer, valueCursor, end)

  if (!lengthData || lengthData.value <= 0 || lengthData.value > 5_000) {
    return null
  }

  const textStart = lengthData.cursor
  const textEnd = textStart + lengthData.value

  if (textEnd > end) {
    return null
  }

  const rawText = buffer.subarray(textStart, textEnd).toString(encoding)

  if (hasDisallowedControlCharacters(rawText) || rawText.includes('\ufffd')) {
    return null
  }

  const value = removeNullCharacters(rawText).trim()

  if (!value) {
    return null
  }

  return {
    cursor: textEnd,
    value,
  }
}

function readEpicCacheField(
  buffer: Buffer,
  field: string,
  start: number,
  end: number,
) {
  const marker = createEpicCacheFieldMarker(field)
  const markerIndex = buffer.indexOf(marker, start)

  if (markerIndex < 0 || markerIndex >= end) {
    return null
  }

  return readEpicCacheTextValue(buffer, markerIndex + marker.length, end)?.value ?? null
}

function readEpicCacheFields(
  buffer: Buffer,
  field: string,
  start: number,
  end: number,
) {
  const values: string[] = []
  const marker = createEpicCacheFieldMarker(field)
  let cursor = start

  while (cursor < end) {
    const markerIndex = buffer.indexOf(marker, cursor)

    if (markerIndex < 0 || markerIndex >= end) {
      break
    }

    const result = readEpicCacheTextValue(buffer, markerIndex + marker.length, end)

    if (result) {
      values.push(result.value)
      cursor = result.cursor
    } else {
      cursor = markerIndex + marker.length
    }
  }

  return Array.from(new Set(values))
}

function selectEpicCoverUrl(urls: string[]) {
  const imageUrls = urls.filter((url) => /^https?:\/\//i.test(url))

  return (
    imageUrls.find((url) => /1200x1600|portrait|tall|dieselstorefront/i.test(url)) ??
    imageUrls.find((url) => /image|jpg|jpeg|png|webp/i.test(url)) ??
    imageUrls[0] ??
    null
  )
}

function isLikelyEpicCacheGame({
  appName,
  namespace,
  paths,
  title,
  urls,
}: {
  appName: string | null
  namespace: string | null
  paths: string[]
  title: string
  urls: string[]
}) {
  const normalizedNamespace = namespace?.toLocaleLowerCase('en-US') ?? ''
  const normalizedPaths = paths.map((path) => path.toLocaleLowerCase('en-US'))
  const content = [title, appName, namespace, ...urls].filter(Boolean).join(' ')

  if (!normalizedPaths.includes('games') || normalizedPaths.includes('addons')) {
    return false
  }

  if (
    epicIgnoredCacheNamespaces.has(normalizedNamespace) ||
    /^ue[_-]/i.test(appName ?? '') ||
    epicIgnoredCacheTitlePattern.test(title) ||
    epicIgnoredCacheContentPattern.test(content) ||
    epicIgnoredCacheUrlPattern.test(content)
  ) {
    return false
  }

  return true
}

export function parseEpicLauncherCacheFile(
  buffer: Buffer,
  manifestPath: string,
): EpicInstalledGame[] {
  const games: EpicInstalledGame[] = []
  const ownedMarker = createEpicCacheFieldMarker('owned')
  let cursor = 0

  while (cursor < buffer.length) {
    const ownedIndex = buffer.indexOf(ownedMarker, cursor)

    if (ownedIndex < 0) {
      break
    }

    const ownedValueIndex = ownedIndex + ownedMarker.length

    cursor = ownedValueIndex + 1

    if (buffer[ownedValueIndex] !== 0x54) {
      continue
    }

    const nextOwnedIndex = buffer.indexOf(ownedMarker, ownedValueIndex + 1)
    const recordStart = Math.max(0, ownedIndex - 4_000)
    const recordEnd =
      nextOwnedIndex > ownedIndex
        ? Math.min(buffer.length, nextOwnedIndex)
        : Math.min(buffer.length, ownedIndex + epicCacheRecordWindowBytes)
    const title = readEpicCacheField(buffer, 'title', recordStart, recordEnd)
    const catalogItemId =
      readEpicCacheField(buffer, 'catalogItemId', recordStart, recordEnd) ??
      readEpicCacheField(buffer, 'catalogId', recordStart, recordEnd)
    const namespace = readEpicCacheField(buffer, 'namespace', recordStart, recordEnd)
    const appName = readEpicCacheField(buffer, 'appName', recordStart, recordEnd)
    const acquiredAt = readEpicCacheField(
      buffer,
      'acquisitionDate',
      recordStart,
      recordEnd,
    )
    const paths = readEpicCacheFields(buffer, 'path', recordStart, recordEnd)
    const urls = readEpicCacheFields(buffer, 'url', recordStart, recordEnd)

    if (!title || !catalogItemId) {
      continue
    }

    if (
      !isLikelyEpicCacheGame({
        appName,
        namespace,
        paths,
        title,
        urls,
      })
    ) {
      continue
    }

    const game = createEpicInstalledGame({
      acquiredAt,
      coverUrl: selectEpicCoverUrl(urls),
      externalId: catalogItemId,
      manifestPath,
      source: 'launcher-cache',
      title,
    })

    if (game) {
      games.push(game)
    }
  }

  return games
}

async function collectFilesRecursively(
  root: string,
  maxDepth = 6,
  depth = 0,
  files: string[] = [],
) {
  if (depth > maxDepth || files.length >= 2_000) {
    return files
  }

  const entries = await readDirectoryIfExists(root)

  for (const entry of entries) {
    const childPath = join(root, entry.name)

    if (entry.isDirectory()) {
      await collectFilesRecursively(childPath, maxDepth, depth + 1, files)
    } else if (entry.isFile()) {
      files.push(childPath)
    }

    if (files.length >= 2_000) {
      break
    }
  }

  return files
}

async function findEpicLauncherCacheFiles(candidateRoots: string[]) {
  const cacheFiles: string[] = []

  for (const candidateRoot of candidateRoots) {
    if (!(await directoryExists(candidateRoot))) {
      continue
    }

    const lowerRoot = candidateRoot.toLocaleLowerCase('en-US')
    const entries = await readDirectoryIfExists(candidateRoot)
    const webcacheDirectories = lowerRoot.includes('webcache')
      ? [candidateRoot]
      : entries
          .filter(
            (entry) =>
              entry.isDirectory() &&
              entry.name.toLocaleLowerCase('en-US').startsWith('webcache'),
          )
          .map((entry) => join(candidateRoot, entry.name))
    const candidateCacheRoots = webcacheDirectories.flatMap((webcacheDirectory) => [
      join(webcacheDirectory, 'IndexedDB'),
      join(webcacheDirectory, 'Local Storage', 'leveldb'),
    ])

    for (const cacheRoot of candidateCacheRoots) {
      if (!(await directoryExists(cacheRoot))) {
        continue
      }

      const files = await collectFilesRecursively(cacheRoot)

      for (const file of files) {
        const name = file.split(/[\\/]/).pop()?.toLocaleLowerCase('en-US') ?? ''
        const isCacheCandidate =
          !name.includes('.') ||
          name.endsWith('.ldb') ||
          name.endsWith('.log') ||
          name.endsWith('.blob')

        if (!isCacheCandidate) {
          continue
        }

        const fileStat = await stat(file).catch(() => null)

        if (
          fileStat?.isFile() &&
          fileStat.size > 0 &&
          fileStat.size <= epicLauncherCacheMaxFileBytes
        ) {
          cacheFiles.push(file)
        }
      }
    }
  }

  return uniqueTextValues(cacheFiles)
}

export function createEpicCandidateLibraryPaths() {
  const programFiles = resolveEnvironmentPath(process.env['ProgramFiles'])
  const programFilesX86 = resolveEnvironmentPath(process.env['ProgramFiles(x86)'])

  return uniqueTextValues([
    ...splitConfiguredPaths(process.env['LUDUX_EPIC_LIBRARY_PATHS']),
    programFiles ? join(programFiles, 'Epic Games') : null,
    programFilesX86 ? join(programFilesX86, 'Epic Games') : null,
    'C:\\Epic Games',
    ...createWindowsDriveLibraryCandidates(['Epic Games', 'Epic']),
  ])
}

async function findExistingDirectories(candidatePaths: string[]) {
  const existingPaths: string[] = []

  for (const candidatePath of candidatePaths) {
    if (await directoryExists(candidatePath)) {
      existingPaths.push(candidatePath)
    }
  }

  return uniqueTextValues(existingPaths)
}

function dedupeEpicInstalledGames(games: EpicInstalledGame[]) {
  const gamesByExternalId = new Map<string, EpicInstalledGame>()

  for (const game of games) {
    const currentGame = gamesByExternalId.get(game.externalId)

    if (!currentGame) {
      gamesByExternalId.set(game.externalId, game)
      continue
    }

    const shouldReplace =
      epicLocalGameSourcePriority[game.source] >
      epicLocalGameSourcePriority[currentGame.source]

    if (shouldReplace) {
      gamesByExternalId.set(game.externalId, {
        ...game,
        acquiredAt: game.acquiredAt ?? currentGame.acquiredAt,
        coverUrl: game.coverUrl ?? currentGame.coverUrl,
        installPath: game.installPath ?? currentGame.installPath,
      })
      continue
    }

    if (!currentGame.coverUrl || !currentGame.installPath || !currentGame.acquiredAt) {
      gamesByExternalId.set(game.externalId, {
        ...currentGame,
        acquiredAt: currentGame.acquiredAt ?? game.acquiredAt,
        coverUrl: currentGame.coverUrl ?? game.coverUrl,
        installPath: currentGame.installPath ?? game.installPath,
      })
    }
  }

  return Array.from(gamesByExternalId.values()).sort((left, right) =>
    left.title.localeCompare(right.title, 'fr-FR'),
  )
}

export async function readEpicLocalLibrary(): Promise<EpicLocalLibraryResult> {
  const programData = resolveEnvironmentPath(process.env['PROGRAMDATA'])
  const localAppData = resolveEnvironmentPath(process.env['LOCALAPPDATA'])
  const existingGameLibraryRoots = await findExistingDirectories(
    createEpicCandidateLibraryPaths(),
  )
  const manifestDirectories = uniqueTextValues([
    ...splitConfiguredPaths(process.env['LUDUX_EPIC_MANIFEST_PATHS']),
    programData
      ? join(programData, 'Epic', 'EpicGamesLauncher', 'Data', 'Manifests')
      : null,
  ])
  const launcherInstallDatabasePaths = uniqueTextValues([
    programData
      ? join(programData, 'Epic', 'UnrealEngineLauncher', 'LauncherInstalled.dat')
      : null,
  ])
  const managedAppDirectories = uniqueTextValues([
    ...splitConfiguredPaths(process.env['LUDUX_EPIC_MANAGED_APP_PATHS']),
    programData
      ? join(programData, 'Epic', 'EpicGamesLauncher', 'Data', 'ThirPartyManagedApps')
      : null,
    programData
      ? join(programData, 'Epic', 'EpicGamesLauncher', 'Data', 'ThirdPartyManagedApps')
      : null,
  ])
  const launcherCacheRoots = uniqueTextValues([
    ...splitConfiguredPaths(process.env['LUDUX_EPIC_WEBCACHE_PATHS']),
    localAppData ? join(localAppData, 'EpicGamesLauncher', 'Saved') : null,
  ])
  const existingManifestDirectories: string[] = []
  const existingConfigPaths: string[] = []
  const manifestPaths: string[] = []
  const games: EpicInstalledGame[] = []
  let manifestCount = 0

  for (const manifestDirectory of manifestDirectories) {
    if (!(await directoryExists(manifestDirectory))) {
      continue
    }

    existingManifestDirectories.push(manifestDirectory)
    const entries = await readDirectoryIfExists(manifestDirectory)
    const manifestEntries = entries.filter(
      (entry) => entry.isFile() && entry.name.toLocaleLowerCase('en-US').endsWith('.item'),
    )
    manifestCount += manifestEntries.length

    for (const entry of manifestEntries) {
      const manifestPath = join(manifestDirectory, entry.name)
      manifestPaths.push(manifestPath)
      const game = parseEpicManifest(
        await readLocalTextFile(manifestPath),
        manifestPath,
      )

      if (game) {
        games.push(game)
      }
    }
  }

  for (const configPath of launcherInstallDatabasePaths) {
    if (await fileExists(configPath)) {
      existingConfigPaths.push(configPath)
      const launcherGames = parseEpicLauncherInstalledDatabase(
        await readLocalTextFile(configPath),
        configPath,
      )

      manifestCount += launcherGames.length
      games.push(...launcherGames)
    }
  }

  for (const managedAppDirectory of managedAppDirectories) {
    if (!(await directoryExists(managedAppDirectory))) {
      continue
    }

    existingConfigPaths.push(managedAppDirectory)
    const entries = await readDirectoryIfExists(managedAppDirectory)
    const managedAppEntries = entries.filter(
      (entry) => entry.isFile() && entry.name.toLocaleLowerCase('en-US').endsWith('.json'),
    )

    for (const entry of managedAppEntries) {
      const managedAppPath = join(managedAppDirectory, entry.name)
      const game = parseEpicManagedApp(
        await readLocalTextFile(managedAppPath),
        managedAppPath,
      )

      if (game) {
        manifestCount += 1
        manifestPaths.push(managedAppPath)
        games.push(game)
      }
    }
  }

  const launcherCacheFiles = await findEpicLauncherCacheFiles(launcherCacheRoots)

  for (const cachePath of launcherCacheFiles) {
    const cacheGames = parseEpicLauncherCacheFile(
      await readFile(cachePath).catch(() => Buffer.alloc(0)),
      cachePath,
    )

    if (cacheGames.length > 0) {
      manifestCount += cacheGames.length
      manifestPaths.push(cachePath)
      existingConfigPaths.push(cachePath)
      games.push(...cacheGames)
    }
  }

  return {
    games: dedupeEpicInstalledGames(games),
    manifestCount,
    manifestPaths,
    libraryPaths: uniqueTextValues([
      ...existingGameLibraryRoots,
      ...existingManifestDirectories,
      ...managedAppDirectories.filter((directory) =>
        existingConfigPaths.includes(directory),
      ),
    ]),
    configPaths: existingConfigPaths,
  }
}

function readGogGameIdFromPath(path: string) {
  return path.match(/goggame-(\d+)\.info$/i)?.[1] ?? null
}

function readFolderName(path: string | null | undefined) {
  if (!path) {
    return null
  }

  return path.split(/[\\/]/).filter(Boolean).pop() ?? null
}

function createGogInstalledGame({
  coverUrl = null,
  externalId,
  installPath,
  lastPlayedAt = null,
  manifestPath,
  ownedAt = null,
  playtimeMinutes = 0,
  title,
}: {
  coverUrl?: string | null
  externalId: string | null
  installPath: string | null
  lastPlayedAt?: string | null
  manifestPath: string
  ownedAt?: string | null
  playtimeMinutes?: number
  title: string | null
}): GogInstalledGame | null {
  if (!externalId || !/^\d+$/.test(externalId) || !title) {
    return null
  }

  return {
    externalId,
    title,
    installPath,
    manifestPath,
    coverUrl,
    lastPlayedAt,
    ownedAt,
    playtimeMinutes: Math.max(0, Math.round(playtimeMinutes)),
  }
}

export function parseGogGameInfo(
  content: string,
  manifestPath: string,
  installPath: string | null = null,
): GogInstalledGame | null {
  const payload = readJsonObject(content)
  const fallbackGameId = readGogGameIdFromPath(manifestPath)
  const title =
    readOptionalText(payload?.['name']) ??
    readOptionalText(payload?.['title']) ??
    readOptionalText(payload?.['gameName']) ??
    readFolderName(installPath)
  const externalId =
    readOptionalText(payload?.['gameId']) ??
    readOptionalText(payload?.['rootGameId']) ??
    readOptionalText(payload?.['clientId']) ??
    fallbackGameId

  return createGogInstalledGame({
    externalId,
    installPath,
    manifestPath,
    title,
  })
}

function parseGogLocalDate(value: unknown) {
  const text = readOptionalText(value)

  if (!text) {
    return null
  }

  const normalizedText = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(text)
    ? `${text.replace(' ', 'T')}Z`
    : text
  const date = new Date(normalizedText)

  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

function readGogCoverUrl(value: unknown) {
  const images = typeof value === 'string' ? readJsonObject(value) : null

  return (
    readOptionalText(images?.['verticalCover']) ??
    readOptionalText(images?.['horizontalCover']) ??
    readOptionalText(images?.['background'])
  )
}

export interface GogGalaxyLibraryRow {
  releaseKey: unknown
  titleJson: unknown
  imagesJson: unknown
  dlcKeysJson?: unknown
  installationPath: unknown
  minutesInGame: unknown
  lastPlayedDate: unknown
  purchaseDate: unknown
  addedDate: unknown
  isDlc: unknown
}

export interface GogGalaxyDlcRow {
  releaseKey: unknown
  titleJson: unknown
  purchaseDate: unknown
  addedDate: unknown
  isOwned: unknown
}

export interface GogGalaxyAchievementRow {
  gameReleaseKey: unknown
  apikey: unknown
  name: unknown
  description: unknown
  iconUrl: unknown
  isUnlocked: unknown
  unlockTime: unknown
}

function readGogExternalId(value: unknown) {
  return readOptionalText(value)?.match(/^gog_(\d+)$/i)?.[1] ?? null
}

function readGogReleaseKeys(value: unknown) {
  if (typeof value !== 'string') {
    return []
  }

  try {
    const parsedValue = JSON.parse(value)
    const releaseKeys = Array.isArray(parsedValue)
      ? parsedValue
      : isJsonObject(parsedValue) && Array.isArray(parsedValue['dlcs'])
        ? parsedValue['dlcs']
        : []

    return releaseKeys
      .map((item) => readOptionalText(item))
      .filter((item): item is string => Boolean(item))
  } catch {
    return []
  }
}

export function parseGogGalaxyDlcRows(rows: GogGalaxyDlcRow[]) {
  return rows.flatMap((row) => {
    const externalId = readGogExternalId(row.releaseKey)
    const titlePayload =
      typeof row.titleJson === 'string' ? readJsonObject(row.titleJson) : null
    const title = readOptionalText(titlePayload?.['title'])

    if (!externalId || !title) {
      return []
    }

    const owned = Number(row.isOwned) === 1

    return [
      {
        externalId,
        title,
        owned,
        ownedAt: owned
          ? parseGogLocalDate(row.purchaseDate) ??
            parseGogLocalDate(row.addedDate)
          : null,
      },
    ]
  })
}

export function parseGogGalaxyAchievementRows(
  rows: GogGalaxyAchievementRow[],
) {
  return rows.flatMap((row) => {
    const externalId = readOptionalText(row.apikey)
    const name = readOptionalText(row.name)

    if (!externalId || !name) {
      return []
    }

    const unlocked = Number(row.isUnlocked) === 1

    return [
      {
        externalId,
        name,
        description: readOptionalText(row.description),
        iconUrl: readOptionalText(row.iconUrl),
        unlocked,
        unlockDate: unlocked ? parseGogLocalDate(row.unlockTime) : null,
        gameReleaseKey: readOptionalText(row.gameReleaseKey),
      },
    ]
  })
}

export function parseGogGalaxyLibraryRows(
  rows: GogGalaxyLibraryRow[],
  databasePath: string,
) {
  return rows.flatMap((row) => {
    if (Number(row.isDlc) === 1) {
      return []
    }

    const releaseKey = readOptionalText(row.releaseKey)
    const externalId = releaseKey?.match(/^gog_(\d+)$/i)?.[1] ?? null
    const titlePayload =
      typeof row.titleJson === 'string' ? readJsonObject(row.titleJson) : null
    const game = createGogInstalledGame({
      coverUrl: readGogCoverUrl(row.imagesJson),
      externalId,
      installPath: readOptionalText(row.installationPath),
      lastPlayedAt: parseGogLocalDate(row.lastPlayedDate),
      manifestPath: `${databasePath}#${releaseKey ?? 'gog'}`,
      ownedAt:
        parseGogLocalDate(row.purchaseDate) ?? parseGogLocalDate(row.addedDate),
      playtimeMinutes:
        typeof row.minutesInGame === 'number' ? row.minutesInGame : 0,
      title: readOptionalText(titlePayload?.['title']),
    })

    return game ? [game] : []
  })
}

function readGogRegistryValue(
  values: Map<string, string>,
  names: string[],
) {
  for (const name of names) {
    const value = values.get(name.toLocaleLowerCase())

    if (value) {
      return value
    }
  }

  return null
}

export function parseGogRegistryGames(output: string) {
  const games: GogInstalledGame[] = []
  let registryPath: string | null = null
  let values = new Map<string, string>()

  function appendCurrentGame() {
    if (!registryPath) {
      return
    }

    const externalId =
      readGogRegistryValue(values, ['gameID', 'productID']) ??
      registryPath.split('\\').filter(Boolean).pop() ??
      null
    const game = createGogInstalledGame({
      externalId,
      installPath: readGogRegistryValue(values, ['path', 'workingDir']),
      manifestPath: registryPath,
      ownedAt: parseGogLocalDate(
        readGogRegistryValue(values, ['installDate']),
      ),
      title: readGogRegistryValue(values, ['gameName', 'startMenu']),
    })

    if (game) {
      games.push(game)
    }
  }

  for (const line of output.split(/\r?\n/)) {
    const trimmedLine = line.trim()

    if (/^HKEY_/i.test(trimmedLine)) {
      appendCurrentGame()
      registryPath = trimmedLine
      values = new Map()
      continue
    }

    const valueMatch = line.match(
      /^\s+(.+?)\s+REG_(?:SZ|EXPAND_SZ)\s*(.*)$/i,
    )

    if (valueMatch?.[1]) {
      values.set(
        valueMatch[1].trim().toLocaleLowerCase(),
        valueMatch[2]?.trim() ?? '',
      )
    }
  }

  appendCurrentGame()
  return games
}

export function createGogCandidateLibraryPaths() {
  const programFiles = resolveEnvironmentPath(process.env['ProgramFiles'])
  const programFilesX86 = resolveEnvironmentPath(process.env['ProgramFiles(x86)'])
  const configuredGameRoots = splitConfiguredPaths(process.env['LUDUX_GOG_LIBRARY_PATHS'])

  return uniqueTextValues([
    ...configuredGameRoots,
    programFiles ? join(programFiles, 'GOG Galaxy', 'Games') : null,
    programFilesX86 ? join(programFilesX86, 'GOG Galaxy', 'Games') : null,
    'C:\\GOG Games',
    'D:\\GOG Games',
    ...createWindowsDriveLibraryCandidates(['GOG Games', 'GOG', 'GOG Galaxy']),
    join(homedir(), 'GOG Games'),
  ])
}

function createGogCandidateDatabasePaths() {
  const programData = resolveEnvironmentPath(process.env['PROGRAMDATA'])

  return uniqueTextValues([
    process.env['LUDUX_GOG_GALAXY_DB_PATH'],
    programData
      ? join(programData, 'GOG.com', 'Galaxy', 'storage', 'galaxy-2.0.db')
      : null,
  ])
}

export function createGogCandidateRegistryPaths() {
  const configuredRegistryPaths = process.env['LUDUX_GOG_REGISTRY_PATHS']

  if (configuredRegistryPaths !== undefined) {
    return splitConfiguredPaths(configuredRegistryPaths)
  }

  return [
    'HKLM\\SOFTWARE\\WOW6432Node\\GOG.com\\Games',
    'HKLM\\SOFTWARE\\GOG.com\\Games',
    'HKCU\\SOFTWARE\\GOG.com\\Games',
  ]
}

async function readGogRegistryLibrary() {
  if (process.platform !== 'win32') {
    return {
      games: [] as GogInstalledGame[],
      registryPaths: [] as string[],
    }
  }

  const games: GogInstalledGame[] = []
  const registryPaths: string[] = []

  for (const registryPath of createGogCandidateRegistryPaths()) {
    try {
      const { stdout } = await execFileAsync(
        'reg',
        ['query', registryPath, '/s'],
        {
          encoding: 'utf8',
          maxBuffer: 4 * 1024 * 1024,
          timeout: 5_000,
          windowsHide: true,
        },
      )
      const parsedGames = parseGogRegistryGames(stdout)

      if (parsedGames.length > 0) {
        registryPaths.push(registryPath)
        games.push(...parsedGames)
      }
    } catch {
      // Missing registry roots are expected when GOG is not installed.
    }
  }

  return {
    games,
    registryPaths,
  }
}

async function readGogGalaxyGames(
  databasePath: string,
  includeDetails: boolean,
) {
  try {
    const { default: Database } = await import('better-sqlite3')
    const database = new Database(databasePath, {
      fileMustExist: true,
      readonly: true,
    })

    try {
      database.pragma('query_only = ON')
      const requiredTables = new Set([
        'GamePieces',
        'GamePieceTypes',
        'GameTimes',
        'InstalledBaseProducts',
        'LastPlayedDates',
        'LibraryReleases',
        'ProductPurchaseDates',
        'ReleaseProperties',
      ])
      const availableTables = new Set(
        (
          database
            .prepare("SELECT name FROM sqlite_master WHERE type = 'table'")
            .all() as Array<{ name: string }>
        ).map((row) => row.name),
      )

      if (
        Array.from(requiredTables).some(
          (tableName) => !availableTables.has(tableName),
        )
      ) {
        return []
      }

      const rows = database
        .prepare(
          `SELECT
             library.releaseKey AS releaseKey,
             (
               SELECT titlePiece.value
               FROM GamePieces titlePiece
               JOIN GamePieceTypes titleType
                 ON titleType.id = titlePiece.gamePieceTypeId
               WHERE titlePiece.releaseKey = library.releaseKey
                 AND titleType.type = 'title'
               LIMIT 1
             ) AS titleJson,
             (
               SELECT imagePiece.value
               FROM GamePieces imagePiece
               JOIN GamePieceTypes imageType
                 ON imageType.id = imagePiece.gamePieceTypeId
               WHERE imagePiece.releaseKey = library.releaseKey
                 AND imageType.type = 'originalImages'
               LIMIT 1
             ) AS imagesJson,
             (
               SELECT dlcPiece.value
               FROM GamePieces dlcPiece
               JOIN GamePieceTypes dlcType
                 ON dlcType.id = dlcPiece.gamePieceTypeId
               WHERE dlcPiece.releaseKey = library.releaseKey
                 AND dlcType.type = 'dlcs'
               LIMIT 1
             ) AS dlcKeysJson,
             installed.installationPath AS installationPath,
             COALESCE(gameTime.minutesInGame, 0) AS minutesInGame,
             lastPlayed.lastPlayedDate AS lastPlayedDate,
             purchase.purchaseDate AS purchaseDate,
             purchase.addedDate AS addedDate,
             COALESCE(properties.isDlc, 0) AS isDlc
           FROM LibraryReleases library
           LEFT JOIN ReleaseProperties properties
             ON properties.releaseKey = library.releaseKey
           LEFT JOIN InstalledBaseProducts installed
             ON installed.productId = CAST(SUBSTR(library.releaseKey, 5) AS INTEGER)
           LEFT JOIN GameTimes gameTime
             ON gameTime.releaseKey = library.releaseKey
            AND gameTime.userId = library.userId
           LEFT JOIN LastPlayedDates lastPlayed
             ON lastPlayed.gameReleaseKey = library.releaseKey
            AND lastPlayed.userId = library.userId
           LEFT JOIN ProductPurchaseDates purchase
             ON purchase.gameReleaseKey = library.releaseKey
            AND purchase.userId = library.userId
           WHERE library.releaseKey LIKE 'gog_%'`,
        )
        .all() as GogGalaxyLibraryRow[]

      const games = parseGogGalaxyLibraryRows(rows, databasePath)
      const dlcsByReleaseKey = new Map<string, GogDlc>()
      const achievementsByReleaseKey = new Map<string, GogAchievement[]>()

      if (includeDetails && availableTables.has('LicensedReleases')) {
        const dlcRows = database
          .prepare(
            `SELECT
               properties.releaseKey AS releaseKey,
               (
                 SELECT titlePiece.value
                 FROM GamePieces titlePiece
                 JOIN GamePieceTypes titleType
                   ON titleType.id = titlePiece.gamePieceTypeId
                 WHERE titlePiece.releaseKey = properties.releaseKey
                   AND titleType.type = 'title'
                 LIMIT 1
               ) AS titleJson,
               purchase.purchaseDate AS purchaseDate,
               purchase.addedDate AS addedDate,
               COALESCE(licensed.isOwned, 0) AS isOwned
             FROM ReleaseProperties properties
             LEFT JOIN LibraryReleases library
               ON library.releaseKey = properties.releaseKey
             LEFT JOIN LicensedReleases licensed
               ON licensed.libraryId = library.id
             LEFT JOIN ProductPurchaseDates purchase
               ON purchase.gameReleaseKey = properties.releaseKey
              AND purchase.userId = library.userId
             WHERE properties.releaseKey LIKE 'gog_%'
               AND properties.isDlc = 1`,
          )
          .all() as GogGalaxyDlcRow[]

        for (const dlc of parseGogGalaxyDlcRows(dlcRows)) {
          dlcsByReleaseKey.set(`gog_${dlc.externalId}`, dlc)
        }
      }

      const achievementTables = [
        'Achievements',
        'LocalizedAchievements',
        'UserAchievements',
      ]

      if (
        includeDetails &&
        achievementTables.every((tableName) =>
          availableTables.has(tableName),
        )
      ) {
        const preferredLanguageId = availableTables.has(
          'UserRecentClientLanguages',
        )
          ? (
              database
                .prepare(
                  `SELECT languageId
                   FROM UserRecentClientLanguages
                   ORDER BY lastUsed DESC
                   LIMIT 1`,
                )
                .get() as { languageId?: number } | undefined
            )?.languageId ?? 24
          : 24
        const achievementRows = database
          .prepare(
            `SELECT
               achievement.gameReleaseKey AS gameReleaseKey,
               achievement.apikey AS apikey,
               COALESCE(
                 (
                   SELECT localized.name
                   FROM LocalizedAchievements localized
                   WHERE localized.gameReleaseKey = achievement.gameReleaseKey
                     AND localized.apikey = achievement.apikey
                     AND localized.languageId = @preferredLanguageId
                   ORDER BY localized.isLocalized DESC
                   LIMIT 1
                 ),
                 (
                   SELECT english.name
                   FROM LocalizedAchievements english
                   WHERE english.gameReleaseKey = achievement.gameReleaseKey
                     AND english.apikey = achievement.apikey
                     AND english.languageId = 16
                   ORDER BY english.isLocalized DESC
                   LIMIT 1
                 )
               ) AS name,
               COALESCE(
                 (
                   SELECT localized.description
                   FROM LocalizedAchievements localized
                   WHERE localized.gameReleaseKey = achievement.gameReleaseKey
                     AND localized.apikey = achievement.apikey
                     AND localized.languageId = @preferredLanguageId
                   ORDER BY localized.isLocalized DESC
                   LIMIT 1
                 ),
                 (
                   SELECT english.description
                   FROM LocalizedAchievements english
                   WHERE english.gameReleaseKey = achievement.gameReleaseKey
                     AND english.apikey = achievement.apikey
                     AND english.languageId = 16
                   ORDER BY english.isLocalized DESC
                   LIMIT 1
                 )
               ) AS description,
               COALESCE(
                 achievement.imageUnlockedUrl,
                 achievement.imageLockedUrl
               ) AS iconUrl,
               COALESCE(userAchievement.isUnlocked, 0) AS isUnlocked,
               userAchievement.unlockTime AS unlockTime
             FROM Achievements achievement
             LEFT JOIN UserAchievements userAchievement
               ON userAchievement.gameReleaseKey = achievement.gameReleaseKey
              AND userAchievement.apikey = achievement.apikey
              AND userAchievement.userId = (
                SELECT library.userId
                FROM LibraryReleases library
                WHERE library.releaseKey = achievement.gameReleaseKey
                LIMIT 1
              )
             WHERE achievement.gameReleaseKey IN (
               SELECT library.releaseKey
               FROM LibraryReleases library
               LEFT JOIN ReleaseProperties properties
                 ON properties.releaseKey = library.releaseKey
               WHERE library.releaseKey LIKE 'gog_%'
                 AND COALESCE(properties.isDlc, 0) = 0
             )
               AND COALESCE(achievement.isVisible, 1) = 1`,
          )
          .all({ preferredLanguageId }) as GogGalaxyAchievementRow[]

        for (const achievement of parseGogGalaxyAchievementRows(
          achievementRows,
        )) {
          if (!achievement.gameReleaseKey) {
            continue
          }

          const releaseAchievements =
            achievementsByReleaseKey.get(achievement.gameReleaseKey) ?? []
          releaseAchievements.push({
            externalId: achievement.externalId,
            name: achievement.name,
            description: achievement.description,
            iconUrl: achievement.iconUrl,
            unlocked: achievement.unlocked,
            unlockDate: achievement.unlockDate,
          })
          achievementsByReleaseKey.set(
            achievement.gameReleaseKey,
            releaseAchievements,
          )
        }
      }

      const rowsByReleaseKey = new Map(
        rows.flatMap((row) => {
          const releaseKey = readOptionalText(row.releaseKey)
          return releaseKey ? [[releaseKey, row] as const] : []
        }),
      )

      if (!includeDetails) {
        return games
      }

      return games.map((game) => {
        const releaseKey = `gog_${game.externalId}`
        const dlcKeys = readGogReleaseKeys(
          rowsByReleaseKey.get(releaseKey)?.dlcKeysJson,
        )

        return {
          ...game,
          dlcs: dlcKeys.flatMap((dlcKey) => {
            const dlc = dlcsByReleaseKey.get(dlcKey)
            return dlc ? [dlc] : []
          }),
          achievements: achievementsByReleaseKey.get(releaseKey) ?? [],
        }
      })
    } finally {
      database.close()
    }
  } catch {
    return []
  }
}

async function findGogGameInfoFiles(candidateRoots: string[]) {
  const existingRoots: string[] = []
  const manifestPaths: string[] = []

  for (const candidateRoot of candidateRoots) {
    if (!(await directoryExists(candidateRoot))) {
      continue
    }

    existingRoots.push(candidateRoot)
    const entries = await readDirectoryIfExists(candidateRoot)

    manifestPaths.push(
      ...entries
        .filter((entry) => entry.isFile() && /^goggame-\d+\.info$/i.test(entry.name))
        .map((entry) => join(candidateRoot, entry.name)),
    )

    for (const entry of entries.filter((entry) => entry.isDirectory()).slice(0, 500)) {
      const gameEntries = await readDirectoryIfExists(join(candidateRoot, entry.name))

      manifestPaths.push(
        ...gameEntries
          .filter(
            (gameEntry) =>
              gameEntry.isFile() &&
              /^goggame-\d+\.info$/i.test(gameEntry.name),
          )
          .map((gameEntry) => join(candidateRoot, entry.name, gameEntry.name)),
      )
    }
  }

  return {
    existingRoots,
    manifestPaths: uniqueTextValues(manifestPaths),
  }
}

function dedupeGogInstalledGames(games: GogInstalledGame[]) {
  const gamesByExternalId = new Map<string, GogInstalledGame>()

  for (const game of games) {
    const existingGame = gamesByExternalId.get(game.externalId)

    if (!existingGame) {
      gamesByExternalId.set(game.externalId, game)
      continue
    }

    const lastPlayedAt =
      [existingGame.lastPlayedAt, game.lastPlayedAt]
        .filter((value): value is string => Boolean(value))
        .sort()
        .at(-1) ?? null

    gamesByExternalId.set(game.externalId, {
      ...existingGame,
      installPath: game.installPath ?? existingGame.installPath,
      manifestPath: game.manifestPath || existingGame.manifestPath,
      coverUrl: game.coverUrl ?? existingGame.coverUrl,
      lastPlayedAt,
      ownedAt: existingGame.ownedAt ?? game.ownedAt,
      playtimeMinutes: Math.max(
        existingGame.playtimeMinutes,
        game.playtimeMinutes,
      ),
      dlcs: dedupeGogDlcs([
        ...(existingGame.dlcs ?? []),
        ...(game.dlcs ?? []),
      ]),
      achievements: dedupeGogAchievements([
        ...(existingGame.achievements ?? []),
        ...(game.achievements ?? []),
      ]),
    })
  }

  return Array.from(gamesByExternalId.values()).sort((left, right) =>
    left.title.localeCompare(right.title, 'fr-FR', {
      numeric: true,
      sensitivity: 'base',
    }),
  )
}

function dedupeGogDlcs(dlcs: GogDlc[]) {
  return Array.from(
    new Map(dlcs.map((dlc) => [dlc.externalId, dlc])).values(),
  )
}

function dedupeGogAchievements(achievements: GogAchievement[]) {
  return Array.from(
    new Map(
      achievements.map((achievement) => [
        achievement.externalId,
        achievement,
      ]),
    ).values(),
  )
}

export async function readGogLocalLibrary(
  options: {
    includeDetails?: boolean
  } = {},
): Promise<GogLocalLibraryResult> {
  const includeDetails = options.includeDetails ?? true
  const gameRoots = createGogCandidateLibraryPaths()
  const databasePaths = createGogCandidateDatabasePaths()
  const existingConfigPaths: string[] = []
  const { existingRoots, manifestPaths } = await findGogGameInfoFiles(gameRoots)
  const registryLibrary = await readGogRegistryLibrary()
  const galaxyGames: GogInstalledGame[] = []
  const manifestGames: GogInstalledGame[] = []

  for (const databasePath of databasePaths) {
    if (await pathExists(databasePath)) {
      existingConfigPaths.push(databasePath)
      galaxyGames.push(
        ...(await readGogGalaxyGames(databasePath, includeDetails)),
      )
    }
  }

  for (const manifestPath of manifestPaths) {
    const installPath = dirname(manifestPath)
    const game = parseGogGameInfo(
      await readLocalTextFile(manifestPath),
      manifestPath,
      installPath,
    )

    if (game) {
      manifestGames.push(game)
    }
  }

  const games = dedupeGogInstalledGames([
    ...galaxyGames,
    ...registryLibrary.games,
    ...manifestGames,
  ])

  return {
    games,
    manifestCount:
      galaxyGames.length + registryLibrary.games.length + manifestPaths.length,
    manifestPaths,
    libraryPaths: existingRoots,
    configPaths: uniqueTextValues([
      ...existingConfigPaths,
      ...registryLibrary.registryPaths,
    ]),
    galaxyGameCount: galaxyGames.length,
    registryGameCount: registryLibrary.games.length,
  }
}

export async function detectGogLocalPlatform(): Promise<LocalPlatformDetection> {
  const localLibrary = await readGogLocalLibrary({
    includeDetails: false,
  })
  const detectedSources = [
    localLibrary.galaxyGameCount > 0
      ? `${localLibrary.galaxyGameCount} dans Galaxy`
      : null,
    localLibrary.registryGameCount > 0
      ? `${localLibrary.registryGameCount} dans le registre`
      : null,
    localLibrary.manifestPaths.length > 0
      ? `${localLibrary.manifestPaths.length} manifeste(s)`
      : null,
  ].filter((value): value is string => Boolean(value))

  return createDetection({
    provider: 'GOG',
    label: 'GOG',
    detected: localLibrary.games.length > 0,
    rootPaths: localLibrary.games.flatMap((game) =>
      game.installPath ? [game.installPath] : [],
    ),
    libraryPaths: localLibrary.libraryPaths,
    configPaths: localLibrary.configPaths,
    manifestCount: localLibrary.manifestCount,
    message:
      localLibrary.games.length > 0
        ? `${localLibrary.games.length} jeu(x) GOG détecté(s) : ${detectedSources.join(', ')}.`
        : localLibrary.configPaths.length > 0
          ? 'Base GOG Galaxy visible, mais aucun jeu local exploitable.'
          : 'Aucune installation GOG détectée.',
  })
}

export function createEaAppCandidatePaths() {
  const programData = resolveEnvironmentPath(process.env['PROGRAMDATA'])
  const programFiles = resolveEnvironmentPath(process.env['ProgramFiles'])
  const programFilesX86 = resolveEnvironmentPath(process.env['ProgramFiles(x86)'])

  return uniqueTextValues([
    ...splitConfiguredPaths(process.env['LUDUX_EA_APP_PATHS']),
    programFiles
      ? join(programFiles, 'Electronic Arts', 'EA Desktop', 'EA Desktop')
      : null,
    programFilesX86
      ? join(programFilesX86, 'Electronic Arts', 'EA Desktop', 'EA Desktop')
      : null,
    programData ? join(programData, 'EA Desktop') : null,
  ])
}

export async function detectEaAppLocalPlatform(): Promise<LocalPlatformDetection> {
  const programData = resolveEnvironmentPath(process.env['PROGRAMDATA'])
  const installDataPath = programData
    ? join(programData, 'EA Desktop', 'InstallData')
    : null
  const rootPaths = await findExistingDirectories(
    createEaAppCandidatePaths(),
  )
  const gameEntries = installDataPath
    ? (await readDirectoryIfExists(installDataPath)).filter((entry) =>
        entry.isDirectory(),
      )
    : []
  const configPaths = await findExistingDirectories(
    installDataPath ? [installDataPath] : [],
  )

  if (programData) {
    for (const fileName of ['machine.ini', 'backgroundservice.ini']) {
      const configPath = join(programData, 'EA Desktop', fileName)

      if (await fileExists(configPath)) {
        configPaths.push(configPath)
      }
    }
  }

  return createDetection({
    provider: 'EA_APP',
    label: 'EA App',
    rootPaths,
    configPaths,
    manifestCount: gameEntries.length,
    message:
      gameEntries.length > 0
        ? `${gameEntries.length} jeu(x) repéré(s) dans les données locales EA.`
        : rootPaths.length > 0 || configPaths.length > 0
          ? 'EA App détectée. La lecture de sa bibliothèque sera ajoutée progressivement.'
          : 'EA App n’a pas été détectée.',
  })
}

export function createUbisoftCandidatePaths() {
  const programFiles = resolveEnvironmentPath(process.env['ProgramFiles'])
  const programFilesX86 = resolveEnvironmentPath(process.env['ProgramFiles(x86)'])

  return uniqueTextValues([
    ...splitConfiguredPaths(process.env['LUDUX_UBISOFT_CONNECT_PATHS']),
    programFiles
      ? join(programFiles, 'Ubisoft', 'Ubisoft Game Launcher')
      : null,
    programFilesX86
      ? join(programFilesX86, 'Ubisoft', 'Ubisoft Game Launcher')
      : null,
  ])
}

function createUbisoftRegistryPaths() {
  const configuredPaths = process.env['LUDUX_UBISOFT_REGISTRY_PATHS']

  if (configuredPaths !== undefined) {
    return splitConfiguredPaths(configuredPaths)
  }

  return [
    'HKLM\\SOFTWARE\\WOW6432Node\\Ubisoft\\Launcher\\Installs',
    'HKLM\\SOFTWARE\\Ubisoft\\Launcher\\Installs',
    'HKCU\\SOFTWARE\\Ubisoft\\Launcher\\Installs',
  ]
}

export function parseUbisoftInstallRegistry(output: string) {
  const installs: UbisoftLocalInstall[] = []
  let registryPath: string | null = null
  let installPath: string | null = null

  function appendInstall() {
    const externalId = registryPath?.split('\\').filter(Boolean).pop()

    if (registryPath && externalId && installPath) {
      installs.push({
        externalId,
        installPath: normalize(installPath.replace(/\//g, '\\')),
        registryPath,
      })
    }
  }

  for (const line of output.split(/\r?\n/)) {
    const trimmedLine = line.trim()

    if (/^HKEY_/i.test(trimmedLine)) {
      appendInstall()
      registryPath = trimmedLine
      installPath = null
      continue
    }

    const installPathMatch = line.match(
      /^\s+InstallDir\s+REG_(?:SZ|EXPAND_SZ)\s*(.*)$/i,
    )

    if (installPathMatch) {
      installPath = readOptionalText(installPathMatch[1])
    }
  }

  appendInstall()
  return installs
}

async function readUbisoftRegistryInstalls() {
  if (process.platform !== 'win32') {
    return {
      installs: [] as UbisoftLocalInstall[],
      registryPaths: [] as string[],
    }
  }

  const installs: UbisoftLocalInstall[] = []
  const registryPaths: string[] = []

  for (const registryPath of createUbisoftRegistryPaths()) {
    try {
      const { stdout } = await execFileAsync(
        'reg',
        ['query', registryPath, '/s'],
        {
          encoding: 'utf8',
          maxBuffer: 2 * 1024 * 1024,
          timeout: 5_000,
          windowsHide: true,
        },
      )
      const parsedInstalls = parseUbisoftInstallRegistry(stdout)

      if (parsedInstalls.length > 0) {
        registryPaths.push(registryPath)
        installs.push(...parsedInstalls)
      }
    } catch {
      // Missing registry roots are expected when Ubisoft Connect is absent.
    }
  }

  return {
    installs,
    registryPaths,
  }
}

export async function detectUbisoftConnectLocalPlatform(): Promise<LocalPlatformDetection> {
  const [rootPaths, registryLibrary] = await Promise.all([
    findExistingDirectories(createUbisoftCandidatePaths()),
    readUbisoftRegistryInstalls(),
  ])

  return createDetection({
    provider: 'UBISOFT',
    label: 'Ubisoft Connect',
    rootPaths,
    libraryPaths: registryLibrary.installs.map(
      (install) => install.installPath,
    ),
    configPaths: registryLibrary.registryPaths,
    manifestCount: registryLibrary.installs.length,
    message:
      registryLibrary.installs.length > 0
        ? `${registryLibrary.installs.length} installation(s) Ubisoft repérée(s).`
        : rootPaths.length > 0
          ? 'Ubisoft Connect détecté. La bibliothèque locale sera enrichie progressivement.'
          : 'Ubisoft Connect n’a pas été détecté.',
  })
}

export function parseBattleNetConfig(content: string): BattleNetLocalConfig {
  const payload = readJsonObject(content)
  const client = readObject(payload?.['Client'])
  const install = readObject(client?.['Install'])
  const games = readObject(payload?.['Games'])
  const clientPath =
    Object.entries(payload ?? {})
      .filter(([key]) => key !== 'Client' && key !== 'Games')
      .map(([, value]) => readOptionalText(readObject(value)?.['Path']))
      .find((value): value is string => Boolean(value)) ?? null

  return {
    clientPath,
    defaultInstallPath: readOptionalText(install?.['DefaultInstallPath']),
    productIds: Object.keys(games ?? {}).filter(
      (productId) => productId !== 'battle_net',
    ),
  }
}

export function createBattleNetCandidatePaths() {
  const programFiles = resolveEnvironmentPath(process.env['ProgramFiles'])
  const programFilesX86 = resolveEnvironmentPath(process.env['ProgramFiles(x86)'])

  return uniqueTextValues([
    ...splitConfiguredPaths(process.env['LUDUX_BATTLENET_PATHS']),
    programFiles ? join(programFiles, 'Battle.net') : null,
    programFilesX86 ? join(programFilesX86, 'Battle.net') : null,
  ])
}

export async function detectBattleNetLocalPlatform(): Promise<LocalPlatformDetection> {
  const appData = resolveEnvironmentPath(process.env['APPDATA'])
  const localAppData = resolveEnvironmentPath(process.env['LOCALAPPDATA'])
  const configCandidates = uniqueTextValues([
    appData ? join(appData, 'Battle.net', 'Battle.net.config') : null,
    localAppData ? join(localAppData, 'Battle.net', 'CachedData.db') : null,
  ])
  const configPaths: string[] = []
  let config: BattleNetLocalConfig = {
    clientPath: null,
    defaultInstallPath: null,
    productIds: [],
  }

  for (const configPath of configCandidates) {
    if (!(await fileExists(configPath))) {
      continue
    }

    configPaths.push(configPath)

    if (configPath.toLocaleLowerCase('en-US').endsWith('.config')) {
      config = parseBattleNetConfig(await readLocalTextFile(configPath))
    }
  }

  const rootPaths = await findExistingDirectories([
    ...createBattleNetCandidatePaths(),
    ...(config.clientPath ? [config.clientPath] : []),
  ])
  return createDetection({
    provider: 'BATTLENET',
    label: 'Battle.net',
    rootPaths,
    configPaths,
    manifestCount: config.productIds.length,
    message:
      config.productIds.length > 0
        ? `${config.productIds.length} produit(s) Battle.net repéré(s) dans la configuration locale.`
        : rootPaths.length > 0 || configPaths.length > 0
          ? 'Battle.net détecté. La bibliothèque locale sera enrichie progressivement.'
          : 'Battle.net n’a pas été détecté.',
  })
}

export async function detectLocalPlatforms() {
  if (
    cachedLocalPlatformOverview &&
    cachedLocalPlatformOverview.expiresAt > Date.now()
  ) {
    return cachedLocalPlatformOverview.value
  }

  const value = await Promise.all([
    detectSteamLocalPlatform().catch(() =>
      createDetection({
        provider: 'STEAM',
        label: 'Steam',
        message: 'Diagnostic Steam local indisponible.',
      }),
    ),
    detectEpicLocalPlatform(),
    detectGogLocalPlatform(),
    detectEaAppLocalPlatform(),
    detectUbisoftConnectLocalPlatform(),
    detectBattleNetLocalPlatform(),
  ])

  cachedLocalPlatformOverview = {
    expiresAt: Date.now() + localPlatformCacheTtlMs,
    value,
  }

  return value
}
