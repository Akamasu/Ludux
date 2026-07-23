import { readdir, readFile, stat } from 'node:fs/promises'
import { homedir } from 'node:os'
import { dirname, join, normalize } from 'node:path'
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
}

export interface GogLocalLibraryResult {
  games: GogInstalledGame[]
  manifestCount: number
  manifestPaths: string[]
  libraryPaths: string[]
  configPaths: string[]
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
  externalId,
  installPath,
  manifestPath,
  title,
}: {
  externalId: string | null
  installPath: string | null
  manifestPath: string
  title: string | null
}): GogInstalledGame | null {
  if (!externalId || !title) {
    return null
  }

  return {
    externalId,
    title,
    installPath,
    manifestPath,
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
  return Array.from(
    new Map(games.map((game) => [game.externalId, game])).values(),
  ).sort((left, right) => left.title.localeCompare(right.title, 'fr-FR'))
}

export async function readGogLocalLibrary(): Promise<GogLocalLibraryResult> {
  const gameRoots = createGogCandidateLibraryPaths()
  const databasePaths = createGogCandidateDatabasePaths()
  const existingConfigPaths: string[] = []
  const { existingRoots, manifestPaths } = await findGogGameInfoFiles(gameRoots)
  const games: GogInstalledGame[] = []

  for (const databasePath of databasePaths) {
    if (await pathExists(databasePath)) {
      existingConfigPaths.push(databasePath)
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
      games.push(game)
    }
  }

  return {
    games: dedupeGogInstalledGames(games),
    manifestCount: manifestPaths.length,
    manifestPaths,
    libraryPaths: existingRoots,
    configPaths: existingConfigPaths,
  }
}

export async function detectGogLocalPlatform(): Promise<LocalPlatformDetection> {
  const localLibrary = await readGogLocalLibrary()

  return createDetection({
    provider: 'GOG',
    label: 'GOG',
    detected: localLibrary.manifestCount > 0,
    rootPaths: localLibrary.games.flatMap((game) =>
      game.installPath ? [game.installPath] : [],
    ),
    libraryPaths: localLibrary.libraryPaths,
    configPaths: localLibrary.configPaths,
    manifestCount: localLibrary.manifestCount,
    message:
      localLibrary.manifestCount > 0
        ? `${localLibrary.games.length} jeu(x) GOG détecté(s) depuis les fichiers locaux.`
        : localLibrary.configPaths.length > 0
          ? 'Base GOG Galaxy visible, mais aucun jeu local exploitable.'
          : 'Aucune installation GOG détectée.',
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
  ])

  cachedLocalPlatformOverview = {
    expiresAt: Date.now() + localPlatformCacheTtlMs,
    value,
  }

  return value
}
