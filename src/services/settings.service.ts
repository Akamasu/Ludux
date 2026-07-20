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
import { libraryService } from './library.service'
import { logger } from '../utils/logger'

const userDataDirectory = resolve('userdata')
const exportDirectory = join(userDataDirectory, 'exports')
const backupDirectory = join(userDataDirectory, 'backups')
const steamProvider: ExternalProvider = 'STEAM'
const steamPlatformName = 'Steam'
const steamTotalSessionNote = 'Temps total Steam synchronise.'
const rawgProvider: ExternalProvider = 'RAWG'
const rawgExternalId = 'catalogue'
const defaultAutoSyncIntervalMinutes = 120
const defaultSteamAchievementSyncLimit = 80
const legacySteamCoverPattern =
  /^https:\/\/cdn\.akamai\.steamstatic\.com\/steam\/apps\/\d+\/header\.jpg$/

interface SteamImportStats {
  importedGames: number
  linkedGames: number
  updatedGames: number
  syncedSessions: number
  syncedDlc: number
  syncedAchievements: number
  syncedAchievementGames: number
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
  notFoundGames: number
  fieldsUpdated: number
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
    (provider === rawgProvider && Boolean(readEnvValue('RAWG_API_KEY')))
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

  return input.externalId.trim()
}

function createProviderReadyMessage(provider: ExternalProvider) {
  if (provider === steamProvider) {
    return 'Compte Steam pret pour la synchronisation automatique.'
  }

  if (provider === rawgProvider) {
    return 'Catalogue RAWG pret pour enrichir les metadonnees.'
  }

  return 'Compte reference localement. Synchronisation reseau non active.'
}

function createSteamSyncMessage(stats: SteamImportStats, sources: SteamSyncSources) {
  if (sources.remoteGames === 0 && sources.localManifestGames === 0) {
    return 'Aucun jeu Steam recu. Verifiez le SteamID64, la cle API, les details de jeux et le dossier Steam local.'
  }

  const sourceParts = [
    sources.remoteGames > 0 ? `${sources.remoteGames} jeux lus depuis Steam Web` : null,
    sources.localManifestGames > 0
      ? `${sources.localManifestGames} manifests locaux`
      : null,
    sources.localActivityGames > 0
      ? `${sources.localActivityGames} activites locales`
      : null,
    sources.steamStoreCovers > 0 ? `${sources.steamStoreCovers} jaquettes Steam Store` : null,
    `${stats.importedGames} ajoutes`,
    `${stats.linkedGames} relies`,
    `${stats.updatedGames} deja connus`,
    `${stats.syncedSessions} temps de jeu synchronises`,
    `${stats.syncedDlc} DLC Steam detectes`,
    `${stats.syncedAchievements} succes Steam synchronises`,
    stats.syncedAchievementGames > 0
      ? `${stats.syncedAchievementGames} jeux avec succes`
      : null,
    sources.apiWarning ? `API Steam ignoree : ${sources.apiWarning}` : null,
  ]

  return sourceParts.filter((part): part is string => part !== null).join(' / ')
}

function createRawgSyncMessage(stats: RawgEnrichmentStats) {
  if (stats.scannedGames === 0) {
    return 'Aucun jeu actif a enrichir avec RAWG.'
  }

  return [
    `${stats.scannedGames} jeux analyses`,
    `${stats.enrichedGames} enrichis`,
    `${stats.linkedGames} relies a RAWG`,
    `${stats.notFoundGames} introuvables`,
    `${stats.fieldsUpdated} champs ajoutes`,
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

async function recordProviderSync(
  provider: ExternalProvider,
  status: string,
  message: string,
  lastSync?: Date,
) {
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

  const providers = EXTERNAL_PROVIDER_DEFINITIONS.map((definition) => {
    const account = accounts.find((item) => item.provider === definition.provider) ?? null
    const sync = syncRecords.find((item) => item.provider === definition.provider) ?? null

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
  }
}

async function buildExportSnapshot() {
  const [games, platforms, collections, tags, statistics] = await Promise.all([
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
    prisma.tag.findMany({
      orderBy: {
        name: 'asc',
      },
    }),
    libraryService.getStatistics(),
  ])

  return {
    exportedAt: new Date().toISOString(),
    formatVersion: 1,
    app: {
      name: 'Ludux',
      version: app.getVersion(),
    },
    statistics,
    games,
    platforms,
    collections,
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
  const existingSyncedDlc = await prisma.dlc.findFirst({
    where: {
      gameId,
      provider: steamProvider,
      externalId,
    },
    select: {
      id: true,
    },
  })

  if (existingSyncedDlc) {
    await prisma.dlc.update({
      where: {
        id: existingSyncedDlc.id,
      },
      data: {
        name: detail.title ?? `Steam DLC ${externalId}`,
        releaseDate,
      },
    })
    return
  }

  const existingManualDlc = detail.title
    ? await prisma.dlc.findFirst({
        where: {
          gameId,
          name: detail.title,
          provider: null,
          externalId: null,
        },
        select: {
          id: true,
        },
      })
    : null

  if (existingManualDlc) {
    await prisma.dlc.update({
      where: {
        id: existingManualDlc.id,
      },
      data: {
        provider: steamProvider,
        externalId,
        releaseDate,
      },
    })
    return
  }

  await prisma.dlc.create({
    data: {
      gameId,
      name: detail.title ?? `Steam DLC ${externalId}`,
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

    for (const dlcAppId of detail.dlcAppIds) {
      await upsertSteamDlc({
        gameId,
        detail: dlcDetailsByAppId.get(dlcAppId) ?? {
          appid: dlcAppId,
          title: `Steam DLC ${dlcAppId}`,
          coverUrl: null,
          dlcAppIds: [],
          releaseDate: null,
        },
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
    syncedSessions: 0,
    syncedDlc: 0,
    syncedAchievements: 0,
    syncedAchievementGames: 0,
  }
  const steamPlatform = await ensureSteamPlatform()
  const localGames = await prisma.game.findMany({
    where: {
      archived: false,
    },
    select: {
      id: true,
      title: true,
      coverUrl: true,
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
            coverUrl: true,
          },
        })
      : (gamesByTitle.get(normalizeTitle(steamGame.title)) ?? null)
    const hasSteamPlayActivity =
      steamGame.playtimeForeverMinutes > 0 || steamGame.lastPlayedAt !== null
    const localGame =
      matchedGame ??
      (await prisma.game.create({
        data: {
          title: steamGame.title,
          coverUrl: steamGame.coverUrl,
          status: hasSteamPlayActivity ? 'PLAYING' : 'BACKLOG',
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
          coverUrl: true,
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

async function enrichLocalGamesWithRawg(apiKey: string): Promise<RawgEnrichmentStats> {
  const stats: RawgEnrichmentStats = {
    scannedGames: 0,
    enrichedGames: 0,
    linkedGames: 0,
    notFoundGames: 0,
    fieldsUpdated: 0,
  }
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

class SettingsService {
  private autoSyncTimer: NodeJS.Timeout | null = null
  private isAutoSyncRunning = false

  startAutoSync() {
    if (this.autoSyncTimer) {
      return
    }

    const intervalMs = readAutoSyncIntervalMinutes() * 60_000
    const runSync = () => {
      void this.syncConfiguredProvidersAutomatically()
    }

    this.autoSyncTimer = setInterval(runSync, intervalMs)
    setTimeout(runSync, 15_000)
  }

  stopAutoSync() {
    if (!this.autoSyncTimer) {
      return
    }

    clearInterval(this.autoSyncTimer)
    this.autoSyncTimer = null
  }

  async syncConfiguredProvidersAutomatically() {
    if (this.isAutoSyncRunning) {
      return
    }

    this.isAutoSyncRunning = true

    try {
      const steamAccount = await prisma.externalAccount.findFirst({
        where: {
          provider: steamProvider,
        },
        orderBy: {
          updatedAt: 'desc',
        },
      })
      const steamApiKey =
        decryptSecret(steamAccount?.tokenHint) ?? readEnvValue('STEAM_WEB_API_KEY')

      if (steamAccount && steamApiKey) {
        await this.syncProvider({
          provider: steamProvider,
        })
      }
    } catch (error) {
      logger.error('[SettingsAutoSync]', error)
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
        message: 'Connexion locale retiree.',
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
          'Cle API Steam obligatoire ou bibliotheque Steam locale introuvable.',
        )
      }

      const mergedGames = mergeSteamGames(
        remoteGames,
        localLibrary.games,
        localLibrary.activities,
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
      throw new Error('Cle API RAWG obligatoire pour enrichir les metadonnees.')
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

    throw new Error(
      'Seules les synchronisations Steam et RAWG sont disponibles pour le moment.',
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
        message: 'Export annule.',
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
      throw new Error('La base en memoire ne peut pas etre sauvegardee.')
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
