import { app, dialog, safeStorage, shell } from 'electron'
import { copyFile, mkdir, readdir, stat, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { getDatabaseFilePath, prisma } from '../database/client'
import {
  fetchSteamAppDetails,
  fetchSteamAchievements,
  fetchSteamOwnedGames,
  hasDatedSteamPlaytime,
  mergeSteamAppDetails,
  mergeSteamGames,
  normalizeSteamId,
  readSteamLocalLibrary,
  type SteamAchievement,
  type SteamAppDetails,
  type SteamOwnedGame,
} from '../providers/steam'
import {
  fetchRawgGameMetadata,
  type RawgGameMetadata,
} from '../providers/rawg'
import {
  fetchIgdbAccessToken,
  fetchIgdbGameMetadata,
  type IgdbGameMetadata,
} from '../providers/igdb'
import { EXTERNAL_PROVIDER_VALUES } from '../types/settings'
import type {
  DeleteProviderConnectionInput,
  ExternalProvider,
  ProviderOverview,
  SettingsActionResult,
  SettingsOverview,
  SyncProviderInput,
  UpsertProviderConnectionInput,
} from '../types/settings'
import { EXTERNAL_PROVIDER_DEFINITIONS } from '../providers/registry'
import {
  detectLocalPlatforms,
  readEpicLocalLibrary,
  readGogLocalLibrary,
  type EpicInstalledGame,
  type GogInstalledGame,
} from '../providers/local-platforms'
import { libraryService } from './library.service'
import { logger } from '../utils/logger'
import { shouldPreferFrenchText } from '../utils/frenchText'
import {
  buildProviderSyncActivity,
  sortProviderSyncRecords,
} from './provider-sync-activity'
import { sortConfiguredSyncProviders } from './provider-sync-order'
import {
  createSteamDlcDisplayName,
  filterSteamDlcCatalogDuplicates,
  findMergeableSteamDlc,
  hasResolvedSteamDlcName,
  shouldMergeSteamDlcCandidate,
} from './steam-dlc.service'
import {
  buildIgnoredExternalGameLinkKeySet,
  hasIgnoredExternalGameLink,
} from './provider-link-ignore'

const userDataDirectory = resolve('userdata')
const exportDirectory = join(userDataDirectory, 'exports')
const backupDirectory = join(userDataDirectory, 'backups')
const steamProvider: ExternalProvider = 'STEAM'
const steamPlatformName = 'Steam'
const steamCollectionDescription = 'Catégorie Steam synchronisée.'
const steamTotalSessionNote = 'Temps total Steam synchronisé.'
const epicProvider: ExternalProvider = 'EPIC'
const epicPlatformName = 'Epic Games'
const gogProvider: ExternalProvider = 'GOG'
const gogPlatformName = 'GOG'
const rawgProvider: ExternalProvider = 'RAWG'
const rawgExternalId = 'catalogue'
const igdbProvider: ExternalProvider = 'IGDB'
const igdbExternalId = 'catalogue'
const manualGenreSource = 'MANUAL'
const defaultAutoSyncIntervalMinutes = 120
const defaultSteamAchievementSyncLimit = 80
const legacySteamCoverPattern =
  /^https:\/\/cdn\.akamai\.steamstatic\.com\/steam\/apps\/\d+\/header\.jpg$/

interface SteamImportStats {
  importedGames: number
  linkedGames: number
  updatedGames: number
  ignoredLinks: number
  syncedSessions: number
  syncedDlc: number
  syncedAchievements: number
  syncedAchievementGames: number
  syncedCollections: number
}

interface SteamSyncSources {
  apiWarning: string | null
  localActivityGames: number
  localManifestGames: number
  remoteGames: number
  steamStoreCovers: number
}

interface RawgEnrichmentStats {
  scannedGames: number
  enrichedGames: number
  linkedGames: number
  ignoredLinks: number
  notFoundGames: number
  fieldsUpdated: number
  syncedGenres: number
}

interface IgdbEnrichmentStats {
  scannedGames: number
  enrichedGames: number
  linkedGames: number
  ignoredLinks: number
  notFoundGames: number
  fieldsUpdated: number
  syncedGenres: number
}

interface EpicImportStats {
  scannedManifests: number
  importedGames: number
  linkedGames: number
  updatedGames: number
  ignoredLinks: number
}

interface GogImportStats {
  scannedManifests: number
  importedGames: number
  linkedGames: number
  updatedGames: number
  ignoredLinks: number
}

interface LocalGameMetadata {
  id: string
  title: string
  description: string | null
  coverUrl: string | null
  releaseDate: Date | null
  developer: string | null
  publisher: string | null
  website: string | null
}

interface GameMetadataUpdateData {
  description?: string
  coverUrl?: string
  releaseDate?: Date
  developer?: string
  publisher?: string
  website?: string
}

function createTimestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-')
}

async function readFileSize(path: string | null) {
  if (!path) {
    return 0
  }

  try {
    return (await stat(path)).size
  } catch {
    return 0
  }
}

async function readLastBackupAt() {
  try {
    const files = await readdir(backupDirectory, { withFileTypes: true })
    const backupStats = await Promise.all(
      files
        .filter((file) => file.isFile() && file.name.endsWith('.db'))
        .map(async (file) => stat(join(backupDirectory, file.name))),
    )
    const lastBackup = backupStats.sort(
      (left, right) => right.mtime.getTime() - left.mtime.getTime(),
    )[0]

    return lastBackup?.mtime.toISOString() ?? null
  } catch {
    return null
  }
}

function trimOptional(value: string | undefined) {
  const trimmed = value?.trim()
  return trimmed ? trimmed : undefined
}

function readEnvValue(name: string) {
  return trimOptional(process.env[name])
}

function readAutoSyncIntervalMinutes() {
  const rawValue = Number(process.env['LUDUX_AUTO_SYNC_INTERVAL_MINUTES'])

  return Number.isFinite(rawValue) && rawValue >= 15
    ? rawValue
    : defaultAutoSyncIntervalMinutes
}

function readSteamAchievementSyncLimit() {
  const rawValue = Number(process.env['LUDUX_STEAM_ACHIEVEMENT_SYNC_LIMIT'])

  return Number.isFinite(rawValue) && rawValue > 0
    ? Math.trunc(rawValue)
    : defaultSteamAchievementSyncLimit
}

async function readIgnoredExternalGameLinkKeys(provider: ExternalProvider) {
  const ignoredLinks = await prisma.ignoredExternalGameLink.findMany({
    where: {
      provider,
    },
    select: {
      gameId: true,
      provider: true,
      externalId: true,
    },
  })

  return buildIgnoredExternalGameLinkKeySet(ignoredLinks)
}

function encryptSecret(value: string | undefined) {
  const secret = trimOptional(value)

  if (!secret) {
    return undefined
  }

  if (safeStorage.isEncryptionAvailable()) {
    return `safe:${safeStorage.encryptString(secret).toString('base64')}`
  }

  return `plain:${secret}`
}

function decryptSecret(value: string | null | undefined) {
  const storedValue = trimOptional(value ?? undefined)

  if (!storedValue) {
    return undefined
  }

  if (storedValue.startsWith('safe:')) {
    try {
      return safeStorage.decryptString(Buffer.from(storedValue.slice(5), 'base64'))
    } catch {
      return undefined
    }
  }

  if (storedValue.startsWith('plain:')) {
    return trimOptional(storedValue.slice(6))
  }

  return storedValue
}

function hasProviderToken(provider: ExternalProvider, tokenHint: string | null) {
  return (
    Boolean(trimOptional(tokenHint ?? undefined)) ||
    (provider === steamProvider && Boolean(readEnvValue('STEAM_WEB_API_KEY'))) ||
    (provider === rawgProvider && Boolean(readEnvValue('RAWG_API_KEY'))) ||
    (provider === igdbProvider &&
      Boolean(readEnvValue('IGDB_CLIENT_ID') && readEnvValue('IGDB_CLIENT_SECRET')))
  )
}

function isExternalProvider(value: string): value is ExternalProvider {
  return EXTERNAL_PROVIDER_VALUES.includes(value as ExternalProvider)
}

function normalizeTitle(value: string) {
  return value.trim().toLocaleLowerCase('fr-FR')
}

function isLegacySteamCoverUrl(value: string | null | undefined) {
  return Boolean(value && legacySteamCoverPattern.test(value))
}

function shouldUpdateSteamCover(
  currentCoverUrl: string | null,
  previousSourceCoverUrl: string | null | undefined,
) {
  return (
    !currentCoverUrl ||
    currentCoverUrl === previousSourceCoverUrl ||
    isLegacySteamCoverUrl(currentCoverUrl)
  )
}

function resolveProviderExternalId(input: UpsertProviderConnectionInput) {
  if (input.provider === steamProvider) {
    return normalizeSteamId(input.externalId)
  }

  if (input.provider === rawgProvider) {
    return trimOptional(input.externalId) ?? rawgExternalId
  }

  if (input.provider === igdbProvider) {
    return trimOptional(input.externalId) ?? igdbExternalId
  }

  return input.externalId.trim()
}

function createProviderReadyMessage(provider: ExternalProvider) {
  if (provider === steamProvider) {
    return 'Compte Steam prêt pour la synchronisation automatique.'
  }

  if (provider === rawgProvider) {
    return 'Catalogue RAWG prêt pour enrichir les métadonnées.'
  }

  if (provider === igdbProvider) {
    return 'Catalogue IGDB prêt pour enrichir les métadonnées.'
  }

  return 'Compte référencé localement. Synchronisation réseau non active.'
}

function createSteamSyncMessage(stats: SteamImportStats, sources: SteamSyncSources) {
  if (sources.remoteGames === 0 && sources.localManifestGames === 0) {
    return 'Aucun jeu Steam reçu. Vérifiez le SteamID64, la clé API, les détails de jeux et le dossier Steam local.'
  }

  const sourceParts = [
    sources.remoteGames > 0 ? `${sources.remoteGames} jeux lus depuis Steam Web` : null,
    sources.localManifestGames > 0
      ? `${sources.localManifestGames} manifests locaux`
      : null,
    sources.localActivityGames > 0
      ? `${sources.localActivityGames} activités locales`
      : null,
    sources.steamStoreCovers > 0 ? `${sources.steamStoreCovers} jaquettes Steam Store` : null,
    `${stats.importedGames} ajoutés`,
    `${stats.linkedGames} reliés`,
    `${stats.updatedGames} déjà connus`,
    stats.ignoredLinks > 0 ? `${stats.ignoredLinks} lien(s) ignoré(s)` : null,
    `${stats.syncedCollections} catégories Steam liées`,
    `${stats.syncedSessions} temps de jeu synchronisés`,
    `${stats.syncedDlc} DLC Steam détectés`,
    `${stats.syncedAchievements} succès Steam synchronisés`,
    stats.syncedAchievementGames > 0
      ? `${stats.syncedAchievementGames} jeux avec succès`
      : null,
    sources.apiWarning ? `API Steam ignorée : ${sources.apiWarning}` : null,
  ]

  return sourceParts.filter((part): part is string => part !== null).join(' / ')
}

function createRawgSyncMessage(stats: RawgEnrichmentStats) {
  if (stats.scannedGames === 0) {
    return 'Aucun jeu actif à enrichir avec RAWG.'
  }

  return [
    `${stats.scannedGames} jeux analysés`,
    `${stats.enrichedGames} enrichis`,
    `${stats.linkedGames} reliés à RAWG`,
    stats.ignoredLinks > 0 ? `${stats.ignoredLinks} lien(s) ignoré(s)` : null,
    `${stats.notFoundGames} introuvables`,
    `${stats.fieldsUpdated} champs ajoutés`,
    `${stats.syncedGenres} genres`,
  ].join(' / ')
}

function createIgdbSyncMessage(stats: IgdbEnrichmentStats) {
  if (stats.scannedGames === 0) {
    return 'Aucun jeu actif à enrichir avec IGDB.'
  }

  return [
    `${stats.scannedGames} jeux analysés`,
    `${stats.enrichedGames} enrichis`,
    `${stats.linkedGames} reliés à IGDB`,
    stats.ignoredLinks > 0 ? `${stats.ignoredLinks} lien(s) ignoré(s)` : null,
    `${stats.notFoundGames} introuvables`,
    `${stats.fieldsUpdated} champs ajoutés`,
    `${stats.syncedGenres} genres`,
  ].join(' / ')
}

function createEpicSyncMessage(stats: EpicImportStats) {
  if (stats.scannedManifests === 0) {
    return 'Aucun fichier Epic local exploitable détecté.'
  }

  return [
    `${stats.scannedManifests} entrée(s) Epic locale(s) analysée(s)`,
    `${stats.importedGames} ajouté(s)`,
    `${stats.linkedGames} relié(s)`,
    `${stats.updatedGames} déjà connu(s)`,
    stats.ignoredLinks > 0 ? `${stats.ignoredLinks} lien(s) ignoré(s)` : null,
  ].join(' / ')
}

function createGogSyncMessage(stats: GogImportStats) {
  if (stats.scannedManifests === 0) {
    return 'Aucun fichier GOG local exploitable détecté.'
  }

  return [
    `${stats.scannedManifests} fichier(s) GOG analysé(s)`,
    `${stats.importedGames} ajouté(s)`,
    `${stats.linkedGames} relié(s)`,
    `${stats.updatedGames} déjà connu(s)`,
    stats.ignoredLinks > 0 ? `${stats.ignoredLinks} lien(s) ignoré(s)` : null,
  ].join(' / ')
}

function parseRawgReleaseDate(value: string | null) {
  if (!value) {
    return undefined
  }

  const date = new Date(`${value}T00:00:00.000Z`)

  return Number.isNaN(date.getTime()) ? undefined : date
}

function parseSteamReleaseDate(value: string | null) {
  if (!value) {
    return null
  }

  const date = new Date(value)

  return Number.isNaN(date.getTime()) ? null : date
}

function buildRawgUpdateData(
  game: LocalGameMetadata,
  metadata: RawgGameMetadata,
): GameMetadataUpdateData {
  const releaseDate = parseRawgReleaseDate(metadata.releaseDate)
  const data: GameMetadataUpdateData = {}

  if (!game.description && metadata.description) {
    data.description = metadata.description
  }

  if (!game.coverUrl && metadata.coverUrl) {
    data.coverUrl = metadata.coverUrl
  }

  if (!game.releaseDate && releaseDate) {
    data.releaseDate = releaseDate
  }

  if (!game.developer && metadata.developer) {
    data.developer = metadata.developer
  }

  if (!game.publisher && metadata.publisher) {
    data.publisher = metadata.publisher
  }

  if (!game.website && metadata.website) {
    data.website = metadata.website
  }

  return data
}

function buildIgdbUpdateData(
  game: LocalGameMetadata,
  metadata: IgdbGameMetadata,
): GameMetadataUpdateData {
  const releaseDate = parseRawgReleaseDate(metadata.releaseDate)
  const data: GameMetadataUpdateData = {}

  if (!game.description && metadata.description) {
    data.description = metadata.description
  }

  if (!game.coverUrl && metadata.coverUrl) {
    data.coverUrl = metadata.coverUrl
  }

  if (!game.releaseDate && releaseDate) {
    data.releaseDate = releaseDate
  }

  if (!game.developer && metadata.developer) {
    data.developer = metadata.developer
  }

  if (!game.publisher && metadata.publisher) {
    data.publisher = metadata.publisher
  }

  if (!game.website && metadata.website) {
    data.website = metadata.website
  }

  return data
}

function buildSteamUpdateData(
  game: LocalGameMetadata,
  steamGame: SteamOwnedGame,
): GameMetadataUpdateData {
  const releaseDate = parseSteamReleaseDate(steamGame.releaseDate ?? null)
  const data: GameMetadataUpdateData = {}

  if (shouldPreferFrenchText(game.description, steamGame.description)) {
    data.description = steamGame.description?.trim()
  }

  if (!game.releaseDate && releaseDate) {
    data.releaseDate = releaseDate
  }

  if (!game.developer && steamGame.developer) {
    data.developer = steamGame.developer
  }

  if (!game.publisher && steamGame.publisher) {
    data.publisher = steamGame.publisher
  }

  if (!game.website && steamGame.website) {
    data.website = steamGame.website
  }

  return data
}

async function recordProviderSync(
  provider: ExternalProvider,
  status: string,
  message: string,
  lastSync?: Date,
) {
  if (status !== 'SYNCING') {
    const runningSync = await prisma.syncData.findFirst({
      where: {
        provider,
        status: 'SYNCING',
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    if (runningSync) {
      await prisma.syncData.update({
        where: {
          id: runningSync.id,
        },
        data: {
          status,
          message,
          lastSync,
        },
      })
      return
    }
  }

  await prisma.syncData.create({
    data: {
      provider,
      status,
      message,
      lastSync,
    },
  })
}

async function buildProviderOverview(): Promise<ProviderOverview> {
  const [accounts, syncRecords] = await Promise.all([
    prisma.externalAccount.findMany({
      orderBy: {
        updatedAt: 'desc',
      },
    }),
    prisma.syncData.findMany({
      orderBy: {
        updatedAt: 'desc',
      },
    }),
  ])

  const sortedSyncRecords = sortProviderSyncRecords(syncRecords)
  const providers = EXTERNAL_PROVIDER_DEFINITIONS.map((definition) => {
    const account = accounts.find((item) => item.provider === definition.provider) ?? null
    const sync =
      sortedSyncRecords.find((item) => item.provider === definition.provider) ?? null

    return {
      ...definition,
      configured: account !== null,
      account: account
        ? {
            id: account.id,
            provider: account.provider as ExternalProvider,
            externalId: account.externalId,
            username: account.username,
            hasToken: hasProviderToken(account.provider as ExternalProvider, account.tokenHint),
            createdAt: account.createdAt.toISOString(),
            updatedAt: account.updatedAt.toISOString(),
          }
        : null,
      sync: sync
        ? {
            status: sync.status,
            message: sync.message,
            lastSync: sync.lastSync?.toISOString() ?? null,
            updatedAt: sync.updatedAt.toISOString(),
          }
        : null,
    }
  })

  const syncDates = providers
    .map((provider) => provider.sync?.lastSync)
    .filter((value): value is string => value !== null && value !== undefined)
    .sort((left, right) => new Date(right).getTime() - new Date(left).getTime())

  return {
    providers,
    configuredCount: providers.filter((provider) => provider.configured).length,
    totalProviders: providers.length,
    lastSyncAt: syncDates[0] ?? null,
    activity: buildProviderSyncActivity(syncRecords, EXTERNAL_PROVIDER_DEFINITIONS),
  }
}

async function buildLocalPlatformOverview() {
  const platforms = await detectLocalPlatforms()

  return {
    platforms,
    detectedCount: platforms.filter((platform) => platform.detected).length,
    scannedAt: new Date().toISOString(),
  }
}

async function buildExportSnapshot() {
  const [games, platforms, collections, genres, tags, statistics] = await Promise.all([
    prisma.game.findMany({
      include: {
        achievements: true,
        chronicles: {
          include: {
            screenshots: true,
            tags: {
              include: {
                tag: true,
              },
            },
          },
          orderBy: {
            date: 'desc',
          },
        },
        collectionGames: {
          include: {
            collection: true,
          },
        },
        gameGenres: {
          include: {
            genre: true,
          },
        },
        dlcs: true,
        platforms: {
          include: {
            platform: true,
          },
        },
        review: true,
        screenshots: true,
        sessions: {
          include: {
            platform: true,
          },
          orderBy: {
            start: 'desc',
          },
        },
        versions: true,
      },
      orderBy: {
        updatedAt: 'desc',
      },
    }),
    prisma.platform.findMany({
      orderBy: {
        name: 'asc',
      },
    }),
    prisma.collection.findMany({
      orderBy: {
        name: 'asc',
      },
    }),
    prisma.genre.findMany({
      orderBy: {
        name: 'asc',
      },
    }),
    prisma.tag.findMany({
      orderBy: {
        name: 'asc',
      },
    }),
    libraryService.getStatistics(),
  ])

  return {
    exportedAt: new Date().toISOString(),
    formatVersion: 2,
    app: {
      name: 'Ludux',
      version: app.getVersion(),
    },
    statistics,
    games,
    platforms,
    collections,
    genres,
    tags,
  }
}

async function ensureSteamPlatform() {
  return prisma.platform.upsert({
    where: {
      name: steamPlatformName,
    },
    update: {},
    create: {
      name: steamPlatformName,
      manufacturer: 'Valve',
    },
  })
}

async function ensureSteamPlatformForGame(gameId: string, platformId: string) {
  const existingPlatform = await prisma.gamePlatform.findFirst({
    where: {
      gameId,
      platformId,
      version: null,
    },
    select: {
      id: true,
    },
  })

  if (existingPlatform) {
    return
  }

  await prisma.gamePlatform.create({
    data: {
      gameId,
      platformId,
      owned: true,
      played: true,
    },
  })
}

async function ensureEpicPlatform() {
  return prisma.platform.upsert({
    where: {
      name: epicPlatformName,
    },
    update: {},
    create: {
      name: epicPlatformName,
      manufacturer: 'Epic Games',
    },
  })
}

async function ensureEpicPlatformForGame(gameId: string, platformId: string) {
  const existingPlatform = await prisma.gamePlatform.findFirst({
    where: {
      gameId,
      platformId,
      version: null,
    },
    select: {
      id: true,
    },
  })

  if (existingPlatform) {
    return
  }

  await prisma.gamePlatform.create({
    data: {
      gameId,
      platformId,
      owned: true,
      played: false,
    },
  })
}

async function ensureGogPlatform() {
  return prisma.platform.upsert({
    where: {
      name: gogPlatformName,
    },
    update: {},
    create: {
      name: gogPlatformName,
      manufacturer: 'GOG',
    },
  })
}

async function ensureGogPlatformForGame(gameId: string, platformId: string) {
  const existingPlatform = await prisma.gamePlatform.findFirst({
    where: {
      gameId,
      platformId,
      version: null,
    },
    select: {
      id: true,
    },
  })

  if (existingPlatform) {
    return
  }

  await prisma.gamePlatform.create({
    data: {
      gameId,
      platformId,
      owned: true,
      played: false,
    },
  })
}

function normalizeSteamCategories(value: string[] | undefined) {
  return Array.from(
    new Set(
      value
        ?.map((category) => category.trim())
        .filter((category) => category.length > 0) ?? [],
    ),
  ).sort((left, right) => left.localeCompare(right, 'fr-FR'))
}

function normalizeGameGenres(value: string[] | undefined) {
  return Array.from(
    new Set(
      value
        ?.map((genre) => genre.trim().replace(/\s+/g, ' '))
        .filter((genre) => genre.length > 0) ?? [],
    ),
  ).sort((left, right) => left.localeCompare(right, 'fr-FR'))
}

async function ensureCollection(name: string) {
  const existingCollection = await prisma.collection.findFirst({
    where: {
      name,
    },
    select: {
      id: true,
    },
  })

  if (existingCollection) {
    return existingCollection
  }

  return prisma.collection.create({
    data: {
      description: steamCollectionDescription,
      name,
    },
    select: {
      id: true,
    },
  })
}

async function ensureGenre(name: string) {
  return prisma.genre.upsert({
    where: {
      name,
    },
    update: {},
    create: {
      name,
    },
    select: {
      id: true,
    },
  })
}

async function syncSteamGameCollections(gameId: string, steamGame: SteamOwnedGame) {
  if (!steamGame.categories) {
    return 0
  }

  const categories = normalizeSteamCategories(steamGame.categories)

  for (const category of categories) {
    const collection = await ensureCollection(category)

    await prisma.collectionGame.upsert({
      where: {
        collectionId_gameId: {
          collectionId: collection.id,
          gameId,
        },
      },
      update: {},
      create: {
        collectionId: collection.id,
        gameId,
      },
    })
  }

  await prisma.collectionGame.deleteMany({
    where: {
      gameId,
      collection: {
        description: steamCollectionDescription,
        name: {
          notIn: categories,
        },
      },
    },
  })

  return categories.length
}

async function syncGameGenres(gameId: string, genreNames: string[], source: ExternalProvider) {
  const manualGenreCount = await prisma.gameGenre.count({
    where: {
      gameId,
      source: manualGenreSource,
    },
  })

  if (manualGenreCount > 0) {
    return 0
  }

  const genres = normalizeGameGenres(genreNames)

  if (genres.length === 0) {
    await prisma.gameGenre.deleteMany({
      where: {
        gameId,
        source,
      },
    })

    return 0
  }

  for (const genreName of genres) {
    const genre = await ensureGenre(genreName)

    await prisma.gameGenre.upsert({
      where: {
        gameId_genreId: {
          gameId,
          genreId: genre.id,
        },
      },
      update: {
        source,
      },
      create: {
        gameId,
        genreId: genre.id,
        source,
      },
    })
  }

  await prisma.gameGenre.deleteMany({
    where: {
      gameId,
      source,
      genre: {
        name: {
          notIn: genres,
        },
      },
    },
  })

  return genres.length
}

async function upsertSteamPlaySession({
  gameId,
  platformId,
  playSessionId,
  steamGame,
}: {
  gameId: string
  platformId: string
  playSessionId: string | null
  steamGame: SteamOwnedGame
}) {
  const lastPlayedAt = steamGame.lastPlayedAt

  if (!hasDatedSteamPlaytime(steamGame) || !lastPlayedAt) {
    if (playSessionId) {
      await prisma.playSession.deleteMany({
        where: {
          id: playSessionId,
          gameId,
          note: steamTotalSessionNote,
        },
      })
    }

    return null
  }

  const sessionData = {
    start: new Date(lastPlayedAt),
    durationMinutes: steamGame.playtimeForeverMinutes,
    note: steamTotalSessionNote,
    platformId,
  }

  if (playSessionId) {
    const result = await prisma.playSession.updateMany({
      where: {
        id: playSessionId,
        gameId,
      },
      data: sessionData,
    })

    if (result.count > 0) {
      return playSessionId
    }
  }

  const session = await prisma.playSession.create({
    data: {
      ...sessionData,
      gameId,
    },
    select: {
      id: true,
    },
  })

  return session.id
}

async function findSteamLinkedGames(games: SteamOwnedGame[]) {
  const externalIds = games.map((game) => String(game.appid))
  const links = await prisma.externalGame.findMany({
    where: {
      provider: steamProvider,
      externalId: {
        in: externalIds,
      },
    },
    select: {
      externalId: true,
      gameId: true,
    },
  })

  return new Map(links.map((link) => [link.externalId, link.gameId]))
}

async function upsertSteamDlc({
  detail,
  gameId,
}: {
  detail: SteamAppDetails
  gameId: string
}) {
  const externalId = String(detail.appid)
  const releaseDate = parseSteamReleaseDate(detail.releaseDate)
  const existingDlcs = await prisma.dlc.findMany({
    where: {
      gameId,
    },
    select: {
      id: true,
      name: true,
      provider: true,
      externalId: true,
      owned: true,
      ownedAt: true,
      completed: true,
      completedAt: true,
    },
  })
  const existingSyncedDlc = existingDlcs.find(
    (dlc) => dlc.provider === steamProvider && dlc.externalId === externalId,
  )
  const mergeableDlc = existingSyncedDlc ?? findMergeableSteamDlc(existingDlcs, detail)

  if (mergeableDlc) {
    const duplicateDlcs = existingDlcs.filter(
      (dlc) => dlc.id !== mergeableDlc.id && shouldMergeSteamDlcCandidate(dlc, detail),
    )
    const mergedDlcs = [mergeableDlc, ...duplicateDlcs]
    const name = hasResolvedSteamDlcName(detail)
      ? createSteamDlcDisplayName(detail)
      : mergeableDlc.name

    await prisma.dlc.update({
      where: {
        id: mergeableDlc.id,
      },
      data: {
        name,
        releaseDate,
        provider: steamProvider,
        externalId,
        owned: mergedDlcs.some((dlc) => dlc.owned),
        ownedAt: mergedDlcs.find((dlc) => dlc.ownedAt)?.ownedAt ?? null,
        completed: mergedDlcs.some((dlc) => dlc.completed),
        completedAt: mergedDlcs.find((dlc) => dlc.completedAt)?.completedAt ?? null,
      },
    })

    if (duplicateDlcs.length > 0) {
      await prisma.dlc.deleteMany({
        where: {
          gameId,
          id: {
            in: duplicateDlcs.map((dlc) => dlc.id),
          },
        },
      })
    }

    return
  }

  if (!hasResolvedSteamDlcName(detail)) {
    return
  }

  await prisma.dlc.create({
    data: {
      gameId,
      name: createSteamDlcDisplayName(detail),
      releaseDate,
      provider: steamProvider,
      externalId,
    },
  })
}

async function syncSteamDlcCatalog(
  games: SteamOwnedGame[],
  appDetails: SteamAppDetails[],
) {
  const detailsByAppId = new Map(appDetails.map((detail) => [detail.appid, detail]))
  const gameIdsBySteamAppId = await findSteamLinkedGames(games)
  const dlcAppIds = appDetails.flatMap((detail) => detail.dlcAppIds)

  if (dlcAppIds.length === 0) {
    return 0
  }

  const dlcDetails = await fetchSteamAppDetails({
    allowPartial: true,
    appids: dlcAppIds,
  })
  const dlcDetailsByAppId = new Map(dlcDetails.map((detail) => [detail.appid, detail]))
  let syncedDlc = 0

  for (const game of games) {
    const gameId = gameIdsBySteamAppId.get(String(game.appid))
    const detail = detailsByAppId.get(game.appid)

    if (!gameId || !detail || detail.dlcAppIds.length === 0) {
      continue
    }

    const steamDlcCatalog = detail.dlcAppIds.map(
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
    const visibleSteamDlcCatalog = filterSteamDlcCatalogDuplicates(steamDlcCatalog)
    const hiddenSteamDlcAppIds = new Set(
      steamDlcCatalog
        .filter(
          (dlcDetail) =>
            !visibleSteamDlcCatalog.some((visibleDlc) => visibleDlc.appid === dlcDetail.appid),
        )
        .map((dlcDetail) => dlcDetail.appid),
    )
    const catalogDetailsByAppId = new Map(
      visibleSteamDlcCatalog.map((dlcDetail) => [dlcDetail.appid, dlcDetail]),
    )
    const dlcAppIds = [
      ...new Set([
        ...detail.dlcAppIds.filter((dlcAppId) => !hiddenSteamDlcAppIds.has(dlcAppId)),
        ...visibleSteamDlcCatalog.map((dlcDetail) => dlcDetail.appid),
      ]),
    ]

    for (const dlcAppId of dlcAppIds) {
      const dlcDetail =
        catalogDetailsByAppId.get(dlcAppId) ?? dlcDetailsByAppId.get(dlcAppId)

      if (!dlcDetail) {
        continue
      }

      await upsertSteamDlc({
        gameId,
        detail: dlcDetail,
      })
      syncedDlc += 1
    }
  }

  return syncedDlc
}

async function upsertSteamAchievement({
  achievement,
  gameId,
}: {
  achievement: SteamAchievement
  gameId: string
}) {
  const existingSyncedAchievement = await prisma.achievement.findFirst({
    where: {
      gameId,
      provider: steamProvider,
      externalId: achievement.externalId,
    },
    select: {
      id: true,
    },
  })
  const data = {
    name: achievement.name,
    description: achievement.description,
    iconUrl: achievement.iconUrl,
    unlocked: achievement.unlocked,
    unlockDate: parseSteamReleaseDate(achievement.unlockDate),
    provider: steamProvider,
    externalId: achievement.externalId,
  }

  if (existingSyncedAchievement) {
    await prisma.achievement.update({
      where: {
        id: existingSyncedAchievement.id,
      },
      data,
    })
    return
  }

  const existingManualAchievement = await prisma.achievement.findFirst({
    where: {
      gameId,
      name: achievement.name,
      provider: null,
      externalId: null,
    },
    select: {
      id: true,
    },
  })

  if (existingManualAchievement) {
    await prisma.achievement.update({
      where: {
        id: existingManualAchievement.id,
      },
      data,
    })
    return
  }

  await prisma.achievement.create({
    data: {
      gameId,
      ...data,
    },
  })
}

function shouldSyncSteamAchievements(game: SteamOwnedGame) {
  return Boolean(game.installed) || game.playtimeForeverMinutes > 0
}

function sortSteamAchievementCandidates(left: SteamOwnedGame, right: SteamOwnedGame) {
  const leftInstalled = left.installed ? 1 : 0
  const rightInstalled = right.installed ? 1 : 0

  if (leftInstalled !== rightInstalled) {
    return rightInstalled - leftInstalled
  }

  return right.playtimeForeverMinutes - left.playtimeForeverMinutes
}

async function syncSteamAchievements({
  apiKey,
  games,
  steamId,
}: {
  apiKey: string
  games: SteamOwnedGame[]
  steamId: string
}) {
  const gameIdsBySteamAppId = await findSteamLinkedGames(games)
  const candidates = games
    .filter(shouldSyncSteamAchievements)
    .sort(sortSteamAchievementCandidates)
    .slice(0, readSteamAchievementSyncLimit())
  let syncedAchievements = 0
  let syncedAchievementGames = 0

  for (const game of candidates) {
    const gameId = gameIdsBySteamAppId.get(String(game.appid))

    if (!gameId) {
      continue
    }

    try {
      const achievements = await fetchSteamAchievements({
        apiKey,
        appid: game.appid,
        steamId,
      })

      if (achievements.length === 0) {
        continue
      }

      for (const achievement of achievements) {
        await upsertSteamAchievement({
          achievement,
          gameId,
        })
      }

      syncedAchievements += achievements.length
      syncedAchievementGames += 1
    } catch (caughtError) {
      logger.error('[SteamAchievements]', caughtError)
    }
  }

  return {
    syncedAchievements,
    syncedAchievementGames,
  }
}

async function importSteamOwnedGames(games: SteamOwnedGame[]): Promise<SteamImportStats> {
  const stats: SteamImportStats = {
    importedGames: 0,
    linkedGames: 0,
    updatedGames: 0,
    ignoredLinks: 0,
    syncedSessions: 0,
    syncedDlc: 0,
    syncedAchievements: 0,
    syncedAchievementGames: 0,
    syncedCollections: 0,
  }
  const ignoredLinks = await readIgnoredExternalGameLinkKeys(steamProvider)
  const steamPlatform = await ensureSteamPlatform()
  const localGames = await prisma.game.findMany({
    where: {
      archived: false,
    },
    select: {
      id: true,
      title: true,
      description: true,
      coverUrl: true,
      releaseDate: true,
      developer: true,
      publisher: true,
      website: true,
    },
  })
  const gamesByTitle = new Map(
    localGames.map((game) => [normalizeTitle(game.title), game]),
  )

  for (const steamGame of games) {
    const externalId = String(steamGame.appid)
    const existingLink = await prisma.externalGame.findUnique({
      where: {
        provider_externalId: {
          provider: steamProvider,
          externalId,
        },
      },
    })
    const matchedGame = existingLink
      ? await prisma.game.findUnique({
          where: {
            id: existingLink.gameId,
          },
          select: {
            id: true,
            title: true,
            description: true,
            coverUrl: true,
            releaseDate: true,
            developer: true,
            publisher: true,
            website: true,
          },
        })
      : (gamesByTitle.get(normalizeTitle(steamGame.title)) ?? null)

    if (
      !existingLink &&
      matchedGame &&
      hasIgnoredExternalGameLink(ignoredLinks, {
        gameId: matchedGame.id,
        provider: steamProvider,
        externalId,
      })
    ) {
      stats.ignoredLinks += 1
      continue
    }

    const hasSteamPlayActivity =
      steamGame.playtimeForeverMinutes > 0 || steamGame.lastPlayedAt !== null
    const localGame =
      matchedGame ??
      (await prisma.game.create({
        data: {
          title: steamGame.title,
          description: steamGame.description,
          coverUrl: steamGame.coverUrl,
          releaseDate: parseSteamReleaseDate(steamGame.releaseDate ?? null),
          developer: steamGame.developer,
          publisher: steamGame.publisher,
          status: hasSteamPlayActivity ? 'PLAYING' : 'BACKLOG',
          website: steamGame.website,
          platforms: {
            create: {
              platform: {
                connect: {
                  id: steamPlatform.id,
                },
              },
              owned: true,
              played: hasSteamPlayActivity,
            },
          },
        },
        select: {
          id: true,
          title: true,
          description: true,
          coverUrl: true,
          releaseDate: true,
          developer: true,
          publisher: true,
          website: true,
        },
      }))

    if (existingLink) {
      stats.updatedGames += 1
    } else if (matchedGame) {
      stats.linkedGames += 1
    } else {
      stats.importedGames += 1
      gamesByTitle.set(normalizeTitle(localGame.title), localGame)
    }

    if (matchedGame) {
      await ensureSteamPlatformForGame(localGame.id, steamPlatform.id)
    }

    stats.syncedCollections += await syncSteamGameCollections(localGame.id, steamGame)

    if (
      steamGame.coverUrl &&
      shouldUpdateSteamCover(localGame.coverUrl, existingLink?.sourceCoverUrl)
    ) {
      await prisma.game.update({
        where: {
          id: localGame.id,
        },
        data: {
          coverUrl: steamGame.coverUrl,
        },
      })
    }

    const steamUpdateData = buildSteamUpdateData(localGame, steamGame)

    if (Object.keys(steamUpdateData).length > 0) {
      await prisma.game.update({
        where: {
          id: localGame.id,
        },
        data: steamUpdateData,
      })
    }

    const playSessionId = await upsertSteamPlaySession({
      gameId: localGame.id,
      platformId: steamPlatform.id,
      playSessionId: existingLink?.playSessionId ?? null,
      steamGame,
    })

    if (playSessionId) {
      stats.syncedSessions += 1
    }

    await prisma.externalGame.upsert({
      where: {
        provider_externalId: {
          provider: steamProvider,
          externalId,
        },
      },
      update: {
        gameId: localGame.id,
        playSessionId,
        sourceTitle: steamGame.title,
        sourceCoverUrl: steamGame.coverUrl,
        lastPlaytimeMinutes: steamGame.playtimeForeverMinutes,
        lastSyncedAt: new Date(),
      },
      create: {
        gameId: localGame.id,
        playSessionId,
        provider: steamProvider,
        externalId,
        sourceTitle: steamGame.title,
        sourceCoverUrl: steamGame.coverUrl,
        lastPlaytimeMinutes: steamGame.playtimeForeverMinutes,
        lastSyncedAt: new Date(),
      },
    })
  }

  return stats
}

async function importEpicInstalledGames(
  games: EpicInstalledGame[],
  manifestCount: number,
): Promise<EpicImportStats> {
  const stats: EpicImportStats = {
    scannedManifests: manifestCount,
    importedGames: 0,
    linkedGames: 0,
    updatedGames: 0,
    ignoredLinks: 0,
  }
  const ignoredLinks = await readIgnoredExternalGameLinkKeys(epicProvider)
  const epicPlatform = await ensureEpicPlatform()
  const localGames = await prisma.game.findMany({
    where: {
      archived: false,
    },
    select: {
      coverUrl: true,
      id: true,
      title: true,
    },
  })
  const gamesByTitle = new Map(
    localGames.map((game) => [normalizeTitle(game.title), game]),
  )
  const uniqueGames = Array.from(
    new Map(games.map((game) => [game.externalId, game])).values(),
  ).sort((left, right) => left.title.localeCompare(right.title, 'fr-FR'))

  for (const epicGame of uniqueGames) {
    const externalId = epicGame.externalId
    const existingLink = await prisma.externalGame.findUnique({
      where: {
        provider_externalId: {
          provider: epicProvider,
          externalId,
        },
      },
    })
    const matchedGame = existingLink
      ? await prisma.game.findUnique({
          where: {
            id: existingLink.gameId,
          },
          select: {
            coverUrl: true,
            id: true,
            title: true,
          },
        })
      : (gamesByTitle.get(normalizeTitle(epicGame.title)) ?? null)

    if (
      !existingLink &&
      matchedGame &&
      hasIgnoredExternalGameLink(ignoredLinks, {
        gameId: matchedGame.id,
        provider: epicProvider,
        externalId,
      })
    ) {
      stats.ignoredLinks += 1
      continue
    }

    const localGame =
      matchedGame ??
      (await prisma.game.create({
        data: {
          coverUrl: epicGame.coverUrl,
          title: epicGame.title,
          status: 'BACKLOG',
          platforms: {
            create: {
              platform: {
                connect: {
                  id: epicPlatform.id,
                },
              },
              owned: true,
              played: false,
            },
          },
        },
        select: {
          coverUrl: true,
          id: true,
          title: true,
        },
      }))

    if (existingLink) {
      stats.updatedGames += 1
    } else if (matchedGame) {
      stats.linkedGames += 1
    } else {
      stats.importedGames += 1
      gamesByTitle.set(normalizeTitle(localGame.title), localGame)
    }

    if (matchedGame) {
      await ensureEpicPlatformForGame(localGame.id, epicPlatform.id)
    }

    if (epicGame.coverUrl && !localGame.coverUrl) {
      await prisma.game.update({
        where: {
          id: localGame.id,
        },
        data: {
          coverUrl: epicGame.coverUrl,
        },
      })
    }

    await prisma.externalGame.upsert({
      where: {
        provider_externalId: {
          provider: epicProvider,
          externalId,
        },
      },
      update: {
        gameId: localGame.id,
        playSessionId: null,
        sourceTitle: epicGame.title,
        sourceCoverUrl: epicGame.coverUrl,
        lastPlaytimeMinutes: 0,
        lastSyncedAt: new Date(),
      },
      create: {
        gameId: localGame.id,
        provider: epicProvider,
        externalId,
        sourceTitle: epicGame.title,
        sourceCoverUrl: epicGame.coverUrl,
        lastPlaytimeMinutes: 0,
        lastSyncedAt: new Date(),
      },
    })
  }

  return stats
}

async function importGogInstalledGames(
  games: GogInstalledGame[],
  manifestCount: number,
): Promise<GogImportStats> {
  const stats: GogImportStats = {
    scannedManifests: manifestCount,
    importedGames: 0,
    linkedGames: 0,
    updatedGames: 0,
    ignoredLinks: 0,
  }
  const ignoredLinks = await readIgnoredExternalGameLinkKeys(gogProvider)
  const gogPlatform = await ensureGogPlatform()
  const localGames = await prisma.game.findMany({
    where: {
      archived: false,
    },
    select: {
      id: true,
      title: true,
    },
  })
  const gamesByTitle = new Map(
    localGames.map((game) => [normalizeTitle(game.title), game]),
  )
  const uniqueGames = Array.from(
    new Map(games.map((game) => [game.externalId, game])).values(),
  ).sort((left, right) => left.title.localeCompare(right.title, 'fr-FR'))

  for (const gogGame of uniqueGames) {
    const externalId = gogGame.externalId
    const existingLink = await prisma.externalGame.findUnique({
      where: {
        provider_externalId: {
          provider: gogProvider,
          externalId,
        },
      },
    })
    const matchedGame = existingLink
      ? await prisma.game.findUnique({
          where: {
            id: existingLink.gameId,
          },
          select: {
            id: true,
            title: true,
          },
        })
      : (gamesByTitle.get(normalizeTitle(gogGame.title)) ?? null)

    if (
      !existingLink &&
      matchedGame &&
      hasIgnoredExternalGameLink(ignoredLinks, {
        gameId: matchedGame.id,
        provider: gogProvider,
        externalId,
      })
    ) {
      stats.ignoredLinks += 1
      continue
    }

    const localGame =
      matchedGame ??
      (await prisma.game.create({
        data: {
          title: gogGame.title,
          status: 'BACKLOG',
          platforms: {
            create: {
              platform: {
                connect: {
                  id: gogPlatform.id,
                },
              },
              owned: true,
              played: false,
            },
          },
        },
        select: {
          id: true,
          title: true,
        },
      }))

    if (existingLink) {
      stats.updatedGames += 1
    } else if (matchedGame) {
      stats.linkedGames += 1
    } else {
      stats.importedGames += 1
      gamesByTitle.set(normalizeTitle(localGame.title), localGame)
    }

    if (matchedGame) {
      await ensureGogPlatformForGame(localGame.id, gogPlatform.id)
    }

    await prisma.externalGame.upsert({
      where: {
        provider_externalId: {
          provider: gogProvider,
          externalId,
        },
      },
      update: {
        gameId: localGame.id,
        playSessionId: null,
        sourceTitle: gogGame.title,
        sourceCoverUrl: null,
        lastPlaytimeMinutes: 0,
        lastSyncedAt: new Date(),
      },
      create: {
        gameId: localGame.id,
        provider: gogProvider,
        externalId,
        sourceTitle: gogGame.title,
        sourceCoverUrl: null,
        lastPlaytimeMinutes: 0,
        lastSyncedAt: new Date(),
      },
    })
  }

  return stats
}

async function enrichLocalGamesWithRawg(apiKey: string): Promise<RawgEnrichmentStats> {
  const stats: RawgEnrichmentStats = {
    scannedGames: 0,
    enrichedGames: 0,
    linkedGames: 0,
    ignoredLinks: 0,
    notFoundGames: 0,
    fieldsUpdated: 0,
    syncedGenres: 0,
  }
  const ignoredLinks = await readIgnoredExternalGameLinkKeys(rawgProvider)
  const games = await prisma.game.findMany({
    where: {
      archived: false,
      OR: [
        {
          description: null,
        },
        {
          coverUrl: null,
        },
        {
          releaseDate: null,
        },
        {
          developer: null,
        },
        {
          publisher: null,
        },
        {
          website: null,
        },
        {
          gameGenres: {
            none: {},
          },
        },
      ],
    },
    select: {
      id: true,
      title: true,
      description: true,
      coverUrl: true,
      releaseDate: true,
      developer: true,
      publisher: true,
      website: true,
    },
    orderBy: {
      title: 'asc',
    },
  })

  stats.scannedGames = games.length

  for (const game of games) {
    const metadata = await fetchRawgGameMetadata({
      apiKey,
      title: game.title,
    })

    if (!metadata) {
      stats.notFoundGames += 1
      continue
    }

    const externalId = String(metadata.rawgId)
    const existingLink = await prisma.externalGame.findUnique({
      where: {
        provider_externalId: {
          provider: rawgProvider,
          externalId,
        },
      },
    })
    const rawgGameData = {
      sourceTitle: metadata.title,
      sourceCoverUrl: metadata.coverUrl,
      lastSyncedAt: new Date(),
    }

    if (
      !existingLink &&
      hasIgnoredExternalGameLink(ignoredLinks, {
        gameId: game.id,
        provider: rawgProvider,
        externalId,
      })
    ) {
      stats.ignoredLinks += 1
      continue
    }

    if (!existingLink) {
      await prisma.externalGame.create({
        data: {
          gameId: game.id,
          provider: rawgProvider,
          externalId,
          ...rawgGameData,
        },
      })
      stats.linkedGames += 1
    } else if (existingLink.gameId === game.id) {
      await prisma.externalGame.update({
        where: {
          id: existingLink.id,
        },
        data: rawgGameData,
      })
    }

    stats.syncedGenres += await syncGameGenres(game.id, metadata.genres, rawgProvider)

    const data = buildRawgUpdateData(game, metadata)
    const updatedFieldCount = Object.keys(data).length

    if (updatedFieldCount > 0) {
      await prisma.game.update({
        where: {
          id: game.id,
        },
        data,
      })
      stats.enrichedGames += 1
      stats.fieldsUpdated += updatedFieldCount
    }
  }

  return stats
}

async function enrichLocalGamesWithIgdb({
  accessToken,
  clientId,
}: {
  accessToken: string
  clientId: string
}): Promise<IgdbEnrichmentStats> {
  const stats: IgdbEnrichmentStats = {
    scannedGames: 0,
    enrichedGames: 0,
    linkedGames: 0,
    ignoredLinks: 0,
    notFoundGames: 0,
    fieldsUpdated: 0,
    syncedGenres: 0,
  }
  const ignoredLinks = await readIgnoredExternalGameLinkKeys(igdbProvider)
  const games = await prisma.game.findMany({
    where: {
      archived: false,
      OR: [
        {
          description: null,
        },
        {
          coverUrl: null,
        },
        {
          releaseDate: null,
        },
        {
          developer: null,
        },
        {
          publisher: null,
        },
        {
          website: null,
        },
        {
          gameGenres: {
            none: {},
          },
        },
      ],
    },
    select: {
      id: true,
      title: true,
      description: true,
      coverUrl: true,
      releaseDate: true,
      developer: true,
      publisher: true,
      website: true,
    },
    orderBy: {
      title: 'asc',
    },
  })

  stats.scannedGames = games.length

  for (const game of games) {
    const metadata = await fetchIgdbGameMetadata({
      accessToken,
      clientId,
      title: game.title,
    })

    if (!metadata) {
      stats.notFoundGames += 1
      continue
    }

    const externalId = String(metadata.igdbId)
    const existingLink = await prisma.externalGame.findUnique({
      where: {
        provider_externalId: {
          provider: igdbProvider,
          externalId,
        },
      },
    })
    const igdbGameData = {
      sourceTitle: metadata.title,
      sourceCoverUrl: metadata.coverUrl,
      lastSyncedAt: new Date(),
    }

    if (
      !existingLink &&
      hasIgnoredExternalGameLink(ignoredLinks, {
        gameId: game.id,
        provider: igdbProvider,
        externalId,
      })
    ) {
      stats.ignoredLinks += 1
      continue
    }

    if (!existingLink) {
      await prisma.externalGame.create({
        data: {
          gameId: game.id,
          provider: igdbProvider,
          externalId,
          ...igdbGameData,
        },
      })
      stats.linkedGames += 1
    } else if (existingLink.gameId === game.id) {
      await prisma.externalGame.update({
        where: {
          id: existingLink.id,
        },
        data: igdbGameData,
      })
    }

    stats.syncedGenres += await syncGameGenres(game.id, metadata.genres, igdbProvider)

    const data = buildIgdbUpdateData(game, metadata)
    const updatedFieldCount = Object.keys(data).length

    if (updatedFieldCount > 0) {
      await prisma.game.update({
        where: {
          id: game.id,
        },
        data,
      })
      stats.enrichedGames += 1
      stats.fieldsUpdated += updatedFieldCount
    }
  }

  return stats
}

const AUTO_SYNC_STARTUP_DELAY_MS = 15_000

class SettingsService {
  private autoSyncTimer: NodeJS.Timeout | null = null
  private autoSyncStartupTimer: NodeJS.Timeout | null = null
  private isAutoSyncRunning = false

  startAutoSync() {
    if (this.autoSyncTimer || this.autoSyncStartupTimer) {
      return
    }

    const intervalMs = readAutoSyncIntervalMinutes() * 60_000
    const runSync = () => {
      void this.syncConfiguredProvidersAutomatically()
    }
    const runStartupSync = () => {
      this.autoSyncStartupTimer = null
      runSync()
    }

    this.autoSyncTimer = setInterval(runSync, intervalMs)
    this.autoSyncStartupTimer = setTimeout(runStartupSync, AUTO_SYNC_STARTUP_DELAY_MS)
  }

  stopAutoSync() {
    if (this.autoSyncTimer) {
      clearInterval(this.autoSyncTimer)
      this.autoSyncTimer = null
    }

    if (this.autoSyncStartupTimer) {
      clearTimeout(this.autoSyncStartupTimer)
      this.autoSyncStartupTimer = null
    }
  }

  async syncConfiguredProvidersAutomatically() {
    if (this.isAutoSyncRunning) {
      return
    }

    this.isAutoSyncRunning = true

    try {
      await this.runConfiguredProviderSyncs()
    } catch (error) {
      logger.error('[SettingsAutoSync]', error)
    } finally {
      this.isAutoSyncRunning = false
    }
  }

  private async getConfiguredSyncProviders() {
    const [accounts, localPlatforms] = await Promise.all([
      prisma.externalAccount.findMany({
        orderBy: {
          updatedAt: 'desc',
        },
      }),
      detectLocalPlatforms().catch(() => []),
    ])
    const providers: ExternalProvider[] = []
    const hasAccount = (provider: ExternalProvider) =>
      accounts.some((account) => account.provider === provider)
    const hasLocalPlatform = (provider: ExternalProvider) =>
      localPlatforms.some((platform) => platform.provider === provider && platform.detected)

    if (hasAccount(steamProvider)) {
      providers.push(steamProvider)
    }

    if (hasAccount(rawgProvider) || readEnvValue('RAWG_API_KEY')) {
      providers.push(rawgProvider)
    }

    if (
      hasAccount(igdbProvider) ||
      (readEnvValue('IGDB_CLIENT_ID') && readEnvValue('IGDB_CLIENT_SECRET'))
    ) {
      providers.push(igdbProvider)
    }

    if (hasAccount(epicProvider) || hasLocalPlatform(epicProvider)) {
      providers.push(epicProvider)
    }

    if (hasAccount(gogProvider) || hasLocalPlatform(gogProvider)) {
      providers.push(gogProvider)
    }

    return sortConfiguredSyncProviders(providers)
  }

  private async runConfiguredProviderSyncs() {
    const providers = await this.getConfiguredSyncProviders()
    const results: string[] = []
    const errors: string[] = []

    for (const provider of providers) {
      try {
        const result = await this.syncProvider({
          provider,
        })
        results.push(`${provider} : ${result.message}`)
      } catch (caughtError) {
        const message =
          caughtError instanceof Error ? caughtError.message : 'Erreur inconnue.'
        errors.push(`${provider} : ${message}`)
      }
    }

    return {
      providers,
      results,
      errors,
    }
  }

  async syncAllProviders(): Promise<SettingsActionResult> {
    if (this.isAutoSyncRunning) {
      return {
        canceled: true,
        path: null,
        message: 'Une synchronisation est déjà en cours.',
      }
    }

    this.isAutoSyncRunning = true

    try {
      const syncedAt = new Date()
      const summary = await this.runConfiguredProviderSyncs()

      if (summary.providers.length === 0) {
        return {
          canceled: true,
          path: null,
          message: 'Aucun provider configuré à synchroniser.',
          createdAt: syncedAt.toISOString(),
        }
      }

      const successCount = summary.results.length
      const errorCount = summary.errors.length
      const messageParts = [
        `${successCount} provider(s) synchronisé(s)`,
        errorCount > 0 ? `${errorCount} erreur(s)` : null,
        ...summary.results,
        ...summary.errors,
      ].filter((part): part is string => part !== null)

      return {
        canceled: false,
        path: null,
        message: messageParts.join(' / '),
        createdAt: syncedAt.toISOString(),
      }
    } finally {
      this.isAutoSyncRunning = false
    }
  }

  async getOverview(): Promise<SettingsOverview> {
    const databasePath = getDatabaseFilePath()

    return {
      appVersion: app.getVersion(),
      databasePath,
      databaseSizeBytes: await readFileSize(databasePath),
      exportDirectory,
      backupDirectory,
      lastBackupAt: await readLastBackupAt(),
      providerOverview: await buildProviderOverview(),
      localPlatformOverview: await buildLocalPlatformOverview(),
    }
  }

  async upsertProviderConnection(
    input: UpsertProviderConnectionInput,
  ): Promise<SettingsOverview> {
    if (!isExternalProvider(input.provider)) {
      throw new Error('Provider invalide.')
    }

    const externalId = resolveProviderExternalId(input)

    if (externalId.length === 0) {
      throw new Error('Identifiant externe obligatoire.')
    }

    const currentAccount = await prisma.externalAccount.findFirst({
      where: {
        provider: input.provider,
      },
      orderBy: {
        updatedAt: 'desc',
      },
    })
    const tokenHint =
      encryptSecret(input.tokenHint) ?? currentAccount?.tokenHint ?? undefined

    await prisma.$transaction([
      prisma.externalAccount.deleteMany({
        where: {
          provider: input.provider,
        },
      }),
      prisma.externalAccount.create({
        data: {
          provider: input.provider,
          externalId,
          username: trimOptional(input.username),
          tokenHint,
        },
      }),
      prisma.syncData.create({
        data: {
          provider: input.provider,
          status: 'READY',
          message: createProviderReadyMessage(input.provider),
        },
      }),
    ])

    return this.getOverview()
  }

  async deleteProviderConnection(
    input: DeleteProviderConnectionInput,
  ): Promise<SettingsOverview> {
    if (!isExternalProvider(input.provider)) {
      throw new Error('Provider invalide.')
    }

    const result = await prisma.externalAccount.deleteMany({
      where: {
        id: input.accountId,
        provider: input.provider,
      },
    })

    if (result.count === 0) {
      throw new Error('Connexion introuvable.')
    }

    await prisma.syncData.create({
      data: {
        provider: input.provider,
        status: 'NOT_CONFIGURED',
          message: 'Connexion locale retirée.',
      },
    })

    return this.getOverview()
  }

  private async syncSteamProvider(): Promise<SettingsActionResult> {
    const account = await prisma.externalAccount.findFirst({
      where: {
        provider: steamProvider,
      },
      orderBy: {
        updatedAt: 'desc',
      },
    })

    if (!account) {
      throw new Error('Connexion Steam introuvable.')
    }

    const apiKey =
      decryptSecret(account.tokenHint) ?? readEnvValue('STEAM_WEB_API_KEY')

    await recordProviderSync(
      steamProvider,
      'SYNCING',
      'Synchronisation Steam en cours.',
    )

    try {
      const localLibrary = await readSteamLocalLibrary({
        ownerSteamId: account.externalId,
      })
      let remoteGames: SteamOwnedGame[] = []
      let remoteTotalCount = 0
      let apiWarning: string | null = null

      if (apiKey) {
        try {
          const ownedGames = await fetchSteamOwnedGames({
            apiKey,
            steamId: account.externalId,
          })

          remoteGames = ownedGames.games
          remoteTotalCount = ownedGames.totalCount
        } catch (caughtError) {
          if (localLibrary.games.length === 0) {
            throw caughtError
          }

          apiWarning =
            caughtError instanceof Error ? caughtError.message : 'Erreur Steam inconnue.'
        }
      } else if (localLibrary.games.length === 0) {
        throw new Error(
          'Clé API Steam obligatoire ou bibliothèque Steam locale introuvable.',
        )
      }

      const mergedGames = mergeSteamGames(
        remoteGames,
        localLibrary.games,
        localLibrary.activities,
        localLibrary.categories,
      )
      let gamesToImport = mergedGames
      let steamAppDetails: SteamAppDetails[] = []
      let steamStoreCovers = 0

      try {
        steamAppDetails = await fetchSteamAppDetails({
          allowPartial: true,
          appids: mergedGames.map((game) => game.appid),
        })

        gamesToImport = mergeSteamAppDetails(mergedGames, steamAppDetails)
        steamStoreCovers = steamAppDetails.filter((detail) => detail.coverUrl).length
      } catch (caughtError) {
        logger.error('[SteamStoreDetails]', caughtError)
      }

      const stats = await importSteamOwnedGames(gamesToImport)

      if (steamAppDetails.length > 0) {
        try {
          stats.syncedDlc = await syncSteamDlcCatalog(gamesToImport, steamAppDetails)
        } catch (caughtError) {
          logger.error('[SteamDlcCatalog]', caughtError)
        }
      }

      if (apiKey) {
        const achievementStats = await syncSteamAchievements({
          apiKey,
          games: gamesToImport,
          steamId: account.externalId,
        })

        stats.syncedAchievements = achievementStats.syncedAchievements
        stats.syncedAchievementGames = achievementStats.syncedAchievementGames
      }

      const syncedAt = new Date()
      const message = createSteamSyncMessage(stats, {
        apiWarning,
        localActivityGames: localLibrary.activities.length,
        localManifestGames: localLibrary.games.length,
        remoteGames: remoteTotalCount,
        steamStoreCovers,
      })

      await recordProviderSync(steamProvider, 'SYNCED', message, syncedAt)

      return {
        canceled: false,
        path: null,
        message,
        createdAt: syncedAt.toISOString(),
      }
    } catch (caughtError) {
      const message =
        caughtError instanceof Error ? caughtError.message : 'Erreur Steam inconnue.'

      await recordProviderSync(steamProvider, 'ERROR', message)
      throw caughtError
    }
  }

  private async syncEpicProvider(): Promise<SettingsActionResult> {
    await recordProviderSync(
      epicProvider,
      'SYNCING',
      'Synchronisation Epic locale en cours.',
    )

    try {
      const localLibrary = await readEpicLocalLibrary()
      const stats = await importEpicInstalledGames(
        localLibrary.games,
        localLibrary.manifestCount,
      )
      const syncedAt = new Date()
      const message = createEpicSyncMessage(stats)

      await recordProviderSync(epicProvider, 'SYNCED', message, syncedAt)

      return {
        canceled: false,
        path: localLibrary.libraryPaths[0] ?? null,
        message,
        createdAt: syncedAt.toISOString(),
      }
    } catch (caughtError) {
      const message =
        caughtError instanceof Error ? caughtError.message : 'Erreur Epic inconnue.'

      await recordProviderSync(epicProvider, 'ERROR', message)
      throw caughtError
    }
  }

  private async syncGogProvider(): Promise<SettingsActionResult> {
    await recordProviderSync(
      gogProvider,
      'SYNCING',
      'Synchronisation GOG locale en cours.',
    )

    try {
      const localLibrary = await readGogLocalLibrary()
      const stats = await importGogInstalledGames(
        localLibrary.games,
        localLibrary.manifestCount,
      )
      const syncedAt = new Date()
      const message = createGogSyncMessage(stats)

      await recordProviderSync(gogProvider, 'SYNCED', message, syncedAt)

      return {
        canceled: false,
        path: localLibrary.libraryPaths[0] ?? null,
        message,
        createdAt: syncedAt.toISOString(),
      }
    } catch (caughtError) {
      const message =
        caughtError instanceof Error ? caughtError.message : 'Erreur GOG inconnue.'

      await recordProviderSync(gogProvider, 'ERROR', message)
      throw caughtError
    }
  }

  private async syncIgdbProvider(): Promise<SettingsActionResult> {
    const account = await prisma.externalAccount.findFirst({
      where: {
        provider: igdbProvider,
      },
      orderBy: {
        updatedAt: 'desc',
      },
    })
    const clientId =
      account?.externalId && account.externalId !== igdbExternalId
        ? account.externalId
        : readEnvValue('IGDB_CLIENT_ID')
    const clientSecret =
      decryptSecret(account?.tokenHint) ?? readEnvValue('IGDB_CLIENT_SECRET')

    if (!account && (!clientId || !clientSecret)) {
      throw new Error('Connexion IGDB introuvable.')
    }

    if (!clientId || !clientSecret) {
      throw new Error('Client ID et Client Secret IGDB obligatoires.')
    }

    await recordProviderSync(
      igdbProvider,
      'SYNCING',
      'Enrichissement IGDB en cours.',
    )

    try {
      const token = await fetchIgdbAccessToken({
        clientId,
        clientSecret,
      })
      const stats = await enrichLocalGamesWithIgdb({
        accessToken: token.accessToken,
        clientId,
      })
      const syncedAt = new Date()
      const message = createIgdbSyncMessage(stats)

      await recordProviderSync(igdbProvider, 'SYNCED', message, syncedAt)

      return {
        canceled: false,
        path: null,
        message,
        createdAt: syncedAt.toISOString(),
      }
    } catch (caughtError) {
      const message =
        caughtError instanceof Error ? caughtError.message : 'Erreur IGDB inconnue.'

      await recordProviderSync(igdbProvider, 'ERROR', message)
      throw caughtError
    }
  }

  private async syncRawgProvider(): Promise<SettingsActionResult> {
    const account = await prisma.externalAccount.findFirst({
      where: {
        provider: rawgProvider,
      },
      orderBy: {
        updatedAt: 'desc',
      },
    })
    const apiKey = decryptSecret(account?.tokenHint) ?? readEnvValue('RAWG_API_KEY')

    if (!account && !apiKey) {
      throw new Error('Connexion RAWG introuvable.')
    }

    if (!apiKey) {
      throw new Error('Clé API RAWG obligatoire pour enrichir les métadonnées.')
    }

    await recordProviderSync(
      rawgProvider,
      'SYNCING',
      'Enrichissement RAWG en cours.',
    )

    try {
      const stats = await enrichLocalGamesWithRawg(apiKey)
      const syncedAt = new Date()
      const message = createRawgSyncMessage(stats)

      await recordProviderSync(rawgProvider, 'SYNCED', message, syncedAt)

      return {
        canceled: false,
        path: null,
        message,
        createdAt: syncedAt.toISOString(),
      }
    } catch (caughtError) {
      const message =
        caughtError instanceof Error ? caughtError.message : 'Erreur RAWG inconnue.'

      await recordProviderSync(rawgProvider, 'ERROR', message)
      throw caughtError
    }
  }

  async syncProvider(input: SyncProviderInput): Promise<SettingsActionResult> {
    if (!isExternalProvider(input.provider)) {
      throw new Error('Provider invalide.')
    }

    if (input.provider === steamProvider) {
      return this.syncSteamProvider()
    }

    if (input.provider === rawgProvider) {
      return this.syncRawgProvider()
    }

    if (input.provider === igdbProvider) {
      return this.syncIgdbProvider()
    }

    if (input.provider === epicProvider) {
      return this.syncEpicProvider()
    }

    if (input.provider === gogProvider) {
      return this.syncGogProvider()
    }

    throw new Error(
      'Seules les synchronisations Steam, Epic locale, GOG locale, RAWG et IGDB sont disponibles pour le moment.',
    )
  }

  async exportLibrary(): Promise<SettingsActionResult> {
    await mkdir(exportDirectory, { recursive: true })

    const result = await dialog.showSaveDialog({
      title: 'Exporter Ludux',
      defaultPath: join(exportDirectory, `ludux-export-${createTimestamp()}.json`),
      filters: [
        {
          name: 'JSON',
          extensions: ['json'],
        },
      ],
    })

    if (result.canceled || !result.filePath) {
      return {
        canceled: true,
        path: null,
        message: 'Export annulé.',
      }
    }

    const snapshot = await buildExportSnapshot()
    const content = `${JSON.stringify(snapshot, null, 2)}\n`

    await mkdir(dirname(result.filePath), { recursive: true })
    await writeFile(result.filePath, content, 'utf8')

    return {
      canceled: false,
      path: result.filePath,
      message: 'Export JSON cree.',
      bytes: Buffer.byteLength(content, 'utf8'),
      createdAt: snapshot.exportedAt,
    }
  }

  async createBackup(): Promise<SettingsActionResult> {
    const databasePath = getDatabaseFilePath()

    if (!databasePath) {
      throw new Error('La base en mémoire ne peut pas être sauvegardée.')
    }

    await mkdir(backupDirectory, { recursive: true })
    await prisma.$executeRawUnsafe('PRAGMA wal_checkpoint(FULL)')

    const backupPath = join(backupDirectory, `ludux-backup-${createTimestamp()}.db`)
    await copyFile(databasePath, backupPath)

    return {
      canceled: false,
      path: backupPath,
      message: 'Sauvegarde creee.',
      bytes: await readFileSize(backupPath),
      createdAt: new Date().toISOString(),
    }
  }

  async openDataFolder() {
    await mkdir(userDataDirectory, { recursive: true })

    const error = await shell.openPath(userDataDirectory)

    if (error) {
      throw new Error(error)
    }

    return true
  }
}

export const settingsService = new SettingsService()
