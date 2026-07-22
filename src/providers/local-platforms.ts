import { readdir, readFile, stat } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join, normalize } from 'node:path'
import type { ExternalProvider, LocalPlatformDetection } from '../types/settings'
import { readSteamLocalLibrary } from './steam'

export interface EpicInstalledGame {
  externalId: string
  title: string
  installPath: string | null
  manifestPath: string
}

export interface EpicLocalLibraryResult {
  games: EpicInstalledGame[]
  manifestCount: number
  manifestPaths: string[]
  libraryPaths: string[]
  configPaths: string[]
}

const localPlatformCacheTtlMs = 30_000

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
    const parsedValue = JSON.parse(value)

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

function countManifestsByExtension(names: string[], extension: string) {
  return names.filter((name) => name.toLocaleLowerCase('en-US').endsWith(extension)).length
}

function createDetection({
  configPaths = [],
  label,
  libraryPaths = [],
  manifestCount = 0,
  message,
  provider,
  rootPaths = [],
}: {
  configPaths?: string[]
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
    normalizedRootPaths.length > 0 ||
    normalizedLibraryPaths.length > 0 ||
    normalizedConfigPaths.length > 0 ||
    manifestCount > 0

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

export async function detectSteamLocalPlatform(): Promise<LocalPlatformDetection> {
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
        ? `${localLibrary.manifestCount} manifest(s) Epic détecté(s).`
        : 'Aucun manifest Epic détecté.',
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

  return {
    externalId,
    title,
    installPath: readOptionalText(payload['InstallLocation']),
    manifestPath,
  }
}

export async function readEpicLocalLibrary(): Promise<EpicLocalLibraryResult> {
  const programData = resolveEnvironmentPath(process.env['PROGRAMDATA'])
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
        await readFile(manifestPath, 'utf8').catch(() => ''),
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
    }
  }

  return {
    games,
    manifestCount,
    manifestPaths,
    libraryPaths: existingManifestDirectories,
    configPaths: existingConfigPaths,
  }
}

async function countGogGameInfoFiles(candidateRoots: string[]) {
  let manifestCount = 0
  const existingRoots: string[] = []

  for (const candidateRoot of candidateRoots) {
    if (!(await directoryExists(candidateRoot))) {
      continue
    }

    existingRoots.push(candidateRoot)
    const entries = await readDirectoryIfExists(candidateRoot)
    const directInfoFiles = countManifestsByExtension(
      entries.filter((entry) => entry.isFile()).map((entry) => entry.name),
      '.info',
    )
    manifestCount += directInfoFiles

    for (const entry of entries.filter((entry) => entry.isDirectory()).slice(0, 250)) {
      const gameEntries = await readDirectoryIfExists(join(candidateRoot, entry.name))
      manifestCount += gameEntries.filter(
        (gameEntry) =>
          gameEntry.isFile() &&
          /^goggame-\d+\.info$/i.test(gameEntry.name),
      ).length
    }
  }

  return {
    existingRoots,
    manifestCount,
  }
}

export async function detectGogLocalPlatform(): Promise<LocalPlatformDetection> {
  const programData = resolveEnvironmentPath(process.env['PROGRAMDATA'])
  const programFiles = resolveEnvironmentPath(process.env['ProgramFiles'])
  const programFilesX86 = resolveEnvironmentPath(process.env['ProgramFiles(x86)'])
  const configuredGameRoots = splitConfiguredPaths(process.env['LUDUX_GOG_LIBRARY_PATHS'])
  const gameRoots = uniqueTextValues([
    ...configuredGameRoots,
    programFiles ? join(programFiles, 'GOG Galaxy', 'Games') : null,
    programFilesX86 ? join(programFilesX86, 'GOG Galaxy', 'Games') : null,
    'C:\\GOG Games',
    'D:\\GOG Games',
    join(homedir(), 'GOG Games'),
  ])
  const databasePaths = uniqueTextValues([
    process.env['LUDUX_GOG_GALAXY_DB_PATH'],
    programData
      ? join(programData, 'GOG.com', 'Galaxy', 'storage', 'galaxy-2.0.db')
      : null,
  ])
  const existingConfigPaths: string[] = []
  const { existingRoots, manifestCount } = await countGogGameInfoFiles(gameRoots)

  for (const databasePath of databasePaths) {
    if (await pathExists(databasePath)) {
      existingConfigPaths.push(databasePath)
    }
  }

  return createDetection({
    provider: 'GOG',
    label: 'GOG',
    rootPaths: existingRoots,
    libraryPaths: existingRoots,
    configPaths: existingConfigPaths,
    manifestCount,
    message:
      manifestCount > 0
        ? `${manifestCount} fichier(s) GOG détecté(s).`
        : existingConfigPaths.length > 0
          ? 'Base GOG Galaxy détectée.'
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
