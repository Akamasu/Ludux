import { copyFile, mkdir } from 'node:fs/promises'
import { basename, extname, join, parse, resolve } from 'node:path'
import { prisma } from '../database/client'
import { fetchSteamDlcCatalog, type SteamAppDetails } from '../providers/steam'
import type {
  AddAvailableDlcInput,
  AvailableDlcListItem,
  CreateAchievementInput,
  CreateChronicleInput,
  CreateDlcInput,
  CreateGameInput,
  CreatePlaySessionInput,
  CreateScreenshotInput,
  DeleteAchievementInput,
  DeleteChronicleInput,
  DeleteDlcInput,
  DeletePlaySessionInput,
  DeleteScreenshotInput,
  Emotion,
  GameDetail,
  GameListItem,
  GameStatus,
  ImportScreenshotFileInput,
  UpdateAchievementInput,
  UpdateChronicleInput,
  UpdateDlcInput,
  UpdateGameInput,
  UpdatePlaySessionInput,
  UpdateReviewInput,
  UpdateScreenshotInput,
} from '../types/game'

const screenshotMediaDirectory = resolve('userdata', 'media', 'screenshots')
const steamProvider = 'STEAM'
const manualGenreSource = 'MANUAL'

interface ImportScreenshotFileData extends ImportScreenshotFileInput {
  sourcePath: string
}

async function fetchGames(archived = false) {
  return prisma.game.findMany({
    where: {
      archived,
    },
    include: {
      platforms: {
        include: {
          platform: true,
        },
      },
      sessions: true,
      review: true,
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
      chronicles: {
        orderBy: {
          date: 'desc',
        },
        take: 1,
      },
    },
    orderBy: {
      updatedAt: 'desc',
    },
  })
}

type GameWithRelations = Awaited<ReturnType<typeof fetchGames>>[number]

async function fetchGameDetail(id: string) {
  return prisma.game.findFirst({
    where: {
      id,
      archived: false,
    },
    include: {
      platforms: {
        include: {
          platform: true,
        },
      },
      dlcs: {
        orderBy: {
          name: 'asc',
        },
      },
      achievements: {
        orderBy: {
          name: 'asc',
        },
      },
      screenshots: {
        include: {
          chronicle: {
            select: {
              id: true,
              title: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      },
      sessions: {
        include: {
          platform: true,
        },
        orderBy: {
          start: 'desc',
        },
      },
      review: true,
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
      externalGames: {
        select: {
          provider: true,
          externalId: true,
          lastSyncedAt: true,
        },
        orderBy: {
          provider: 'asc',
        },
      },
      chronicles: {
        orderBy: {
          date: 'desc',
        },
      },
    },
  })
}

type GameDetailWithRelations = NonNullable<Awaited<ReturnType<typeof fetchGameDetail>>>

function toGameListItem(game: GameWithRelations): GameListItem {
  return {
    id: game.id,
    title: game.title,
    status: game.status as GameStatus,
    coverUrl: game.coverUrl,
    platforms: game.platforms.map((gamePlatform) => gamePlatform.platform.name),
    collections: game.collectionGames
      .map((collectionGame) => collectionGame.collection.name)
      .sort((left, right) => left.localeCompare(right, 'fr-FR')),
    genres: game.gameGenres
      .map((gameGenre) => gameGenre.genre.name)
      .sort((left, right) => left.localeCompare(right, 'fr-FR')),
    totalMinutes: game.sessions.reduce(
      (total, session) => total + session.durationMinutes,
      0,
    ),
    rating: game.review?.rating ?? null,
    lastChronicleTitle: game.chronicles[0]?.title ?? null,
    updatedAt: game.updatedAt.toISOString(),
  }
}

function toGameDetail(game: GameDetailWithRelations): GameDetail {
  return {
    ...toGameListItem(game),
    description: game.description,
    personalNote: game.personalNote,
    developer: game.developer,
    publisher: game.publisher,
    releaseDate: game.releaseDate?.toISOString() ?? null,
    website: game.website,
    metadataSources: game.externalGames
      .filter((externalGame) => externalGame.provider === 'RAWG')
      .map((externalGame) => ({
        provider: externalGame.provider,
        label: 'RAWG',
        url: 'https://rawg.io/',
        lastSyncedAt: externalGame.lastSyncedAt?.toISOString() ?? null,
      })),
    review: game.review
      ? {
          id: game.review.id,
          rating: game.review.rating,
          content: game.review.content,
          strengths: game.review.strengths,
          weaknesses: game.review.weaknesses,
          mainMemory: game.review.mainMemory,
          favorite: game.review.favorite,
          createdAt: game.review.createdAt.toISOString(),
          updatedAt: game.review.updatedAt.toISOString(),
        }
      : null,
    dlcs: game.dlcs.map((dlc) => ({
      id: dlc.id,
      name: dlc.name,
      releaseDate: dlc.releaseDate?.toISOString() ?? null,
      owned: dlc.owned,
      completed: dlc.completed,
    })),
    achievements: game.achievements.map((achievement) => ({
      id: achievement.id,
      name: achievement.name,
      description: achievement.description,
      iconUrl: achievement.iconUrl,
      unlocked: achievement.unlocked,
      unlockDate: achievement.unlockDate?.toISOString() ?? null,
      provider: achievement.provider,
    })),
    screenshots: game.screenshots.map((screenshot) => ({
      id: screenshot.id,
      path: screenshot.path,
      description: screenshot.description,
      createdAt: screenshot.createdAt.toISOString(),
      chronicleId: screenshot.chronicle?.id ?? null,
      chronicleTitle: screenshot.chronicle?.title ?? null,
    })),
    chronicles: game.chronicles.map((chronicle) => ({
      id: chronicle.id,
      title: chronicle.title,
      content: chronicle.content,
      date: chronicle.date.toISOString(),
      emotion: chronicle.emotion as Emotion | null,
      favorite: chronicle.favorite,
    })),
    sessions: game.sessions.map((session) => ({
      id: session.id,
      start: session.start.toISOString(),
      end: session.end?.toISOString() ?? null,
      durationMinutes: session.durationMinutes,
      note: session.note,
      platformName: session.platform?.name ?? null,
    })),
  }
}

function trimOptional(value: string | undefined) {
  const trimmed = value?.trim()
  return trimmed ? trimmed : undefined
}

function trimNullable(value: string | null | undefined) {
  if (value === undefined) {
    return undefined
  }

  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

function normalizeLookupText(value: string) {
  return value.trim().toLocaleLowerCase('fr-FR')
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

function parseNullableDate(value: string | null | undefined) {
  if (value === undefined) {
    return undefined
  }

  if (value === null || value.trim().length === 0) {
    return null
  }

  return new Date(value)
}

function createImportedScreenshotName(sourcePath: string) {
  const parsed = parse(sourcePath)
  const baseName = parsed.name
    .trim()
    .replace(/[^a-zA-Z0-9-_]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
  const extension = extname(sourcePath) || '.png'
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')

  return `${timestamp}-${baseName || 'capture'}${extension.toLowerCase()}`
}

function readSteamAppId(value: string | null | undefined) {
  const appid = Number(value)

  return Number.isInteger(appid) && appid > 0 ? appid : null
}

function createSteamDlcName(detail: SteamAppDetails) {
  return detail.title ?? `Steam DLC ${detail.appid}`
}

async function requireGameDetail(id: string) {
  const game = await fetchGameDetail(id)

  if (!game) {
    throw new Error('Jeu introuvable.')
  }

  return game
}

async function replaceGameGenres(gameId: string, genreNames: string[]) {
  const genres = normalizeGameGenres(genreNames)

  await prisma.$transaction(async (transaction) => {
    await transaction.gameGenre.deleteMany({
      where: {
        gameId,
      },
    })

    for (const genreName of genres) {
      const genre = await transaction.genre.upsert({
        where: {
          name: genreName,
        },
        update: {},
        create: {
          name: genreName,
        },
        select: {
          id: true,
        },
      })

      await transaction.gameGenre.create({
        data: {
          gameId,
          genreId: genre.id,
          source: manualGenreSource,
        },
      })
    }
  })
}

async function requireChronicleForGame(gameId: string, chronicleId: string) {
  const count = await prisma.chronicle.count({
    where: {
      id: chronicleId,
      gameId,
    },
  })

  if (count === 0) {
    throw new Error('Chronique introuvable pour ce jeu.')
  }
}

function toAvailableDlcListItem(
  detail: SteamAppDetails,
  existingSteamExternalIds: Set<string>,
  existingDlcNames: Set<string>,
): AvailableDlcListItem {
  const name = createSteamDlcName(detail)
  const externalId = String(detail.appid)

  return {
    appid: detail.appid,
    name,
    coverUrl: detail.coverUrl,
    releaseDate: detail.releaseDate,
    provider: steamProvider,
    externalId,
    added:
      existingSteamExternalIds.has(externalId) ||
      existingDlcNames.has(normalizeLookupText(name)),
  }
}

class GameService {
  async listGames(): Promise<GameListItem[]> {
    const games = await fetchGames()
    return games.map(toGameListItem)
  }

  async listArchivedGames(): Promise<GameListItem[]> {
    const games = await fetchGames(true)
    return games.map(toGameListItem)
  }

  async createGame(input: CreateGameInput): Promise<GameListItem> {
    const title = input.title.trim()

    if (title.length === 0) {
      throw new Error('Le titre du jeu est obligatoire.')
    }

    const platformName = input.platformName?.trim()

    const game = await prisma.game.create({
      data: {
        title,
        description: input.description?.trim(),
        personalNote: input.personalNote?.trim(),
        coverUrl: input.coverUrl?.trim(),
        status: input.status ?? 'BACKLOG',
        platforms: platformName
          ? {
              create: {
                owned: true,
                platform: {
                  connectOrCreate: {
                    where: {
                      name: platformName,
                    },
                    create: {
                      name: platformName,
                    },
                  },
                },
              },
            }
          : undefined,
      },
      include: {
        platforms: {
          include: {
            platform: true,
          },
        },
        sessions: true,
        review: true,
        chronicles: {
          orderBy: {
            date: 'desc',
          },
          take: 1,
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
      },
    })

    return toGameListItem(game)
  }

  async getGameById(id: string): Promise<GameDetail | null> {
    const game = await fetchGameDetail(id)
    return game ? toGameDetail(game) : null
  }

  async listAvailableDlc(gameId: string): Promise<AvailableDlcListItem[]> {
    const game = await prisma.game.findFirst({
      where: {
        id: gameId,
        archived: false,
      },
      include: {
        dlcs: true,
        externalGames: {
          where: {
            provider: steamProvider,
          },
          take: 1,
        },
      },
    })

    if (!game) {
      throw new Error('Jeu introuvable.')
    }

    const steamAppId = readSteamAppId(game.externalGames[0]?.externalId)

    if (!steamAppId) {
      return []
    }

    const catalog = await fetchSteamDlcCatalog({
      appid: steamAppId,
    })
    const existingSteamExternalIds = new Set(
      game.dlcs.flatMap((dlc) =>
        dlc.provider === steamProvider && dlc.externalId ? [dlc.externalId] : [],
      ),
    )
    const existingDlcNames = new Set(
      game.dlcs.map((dlc) => normalizeLookupText(dlc.name)),
    )

    return catalog
      .map((detail) =>
        toAvailableDlcListItem(detail, existingSteamExternalIds, existingDlcNames),
      )
      .sort((left, right) => {
        if (left.added !== right.added) {
          return left.added ? 1 : -1
        }

        return left.name.localeCompare(right.name, 'fr-FR')
      })
  }

  async updateGame(input: UpdateGameInput): Promise<GameDetail> {
    const title = trimOptional(input.title)

    await prisma.game.update({
      where: {
        id: input.id,
      },
      data: {
        title,
        status: input.status,
        description: trimOptional(input.description),
        personalNote: trimNullable(input.personalNote),
        coverUrl: trimOptional(input.coverUrl),
        developer: trimOptional(input.developer),
        publisher: trimOptional(input.publisher),
        website: trimOptional(input.website),
      },
    })

    if (input.genres !== undefined) {
      await replaceGameGenres(input.id, input.genres)
    }

    return toGameDetail(await requireGameDetail(input.id))
  }

  async updateReview(input: UpdateReviewInput): Promise<GameDetail> {
    if (!Number.isInteger(input.rating) || input.rating < 1 || input.rating > 10) {
      throw new Error('La note doit être comprise entre 1 et 10.')
    }

    await prisma.review.upsert({
      where: {
        gameId: input.gameId,
      },
      create: {
        gameId: input.gameId,
        rating: input.rating,
        content: trimNullable(input.content),
        strengths: trimNullable(input.strengths),
        weaknesses: trimNullable(input.weaknesses),
        mainMemory: trimNullable(input.mainMemory),
        favorite: input.favorite ?? false,
      },
      update: {
        rating: input.rating,
        content: trimNullable(input.content),
        strengths: trimNullable(input.strengths),
        weaknesses: trimNullable(input.weaknesses),
        mainMemory: trimNullable(input.mainMemory),
        favorite: input.favorite,
      },
    })

    return toGameDetail(await requireGameDetail(input.gameId))
  }

  async createDlc(input: CreateDlcInput): Promise<GameDetail> {
    const name = input.name.trim()

    if (name.length === 0) {
      throw new Error('Le nom du DLC est obligatoire.')
    }

    await prisma.dlc.create({
      data: {
        gameId: input.gameId,
        name,
        releaseDate: parseNullableDate(input.releaseDate),
        owned: input.completed ? true : input.owned ?? false,
        completed: input.completed ?? false,
      },
    })

    return toGameDetail(await requireGameDetail(input.gameId))
  }

  async addAvailableDlc(input: AddAvailableDlcInput): Promise<GameDetail> {
    if (input.provider !== steamProvider) {
      throw new Error('Catalogue DLC non pris en charge.')
    }

    const dlcAppId = readSteamAppId(input.externalId)

    if (!dlcAppId) {
      throw new Error('Identifiant de DLC Steam invalide.')
    }

    const game = await prisma.game.findFirst({
      where: {
        id: input.gameId,
        archived: false,
      },
      include: {
        externalGames: {
          where: {
            provider: steamProvider,
          },
          take: 1,
        },
      },
    })

    if (!game) {
      throw new Error('Jeu introuvable.')
    }

    const steamAppId = readSteamAppId(game.externalGames[0]?.externalId)

    if (!steamAppId) {
      throw new Error("Ce jeu n'est pas relie a Steam.")
    }

    const catalog = await fetchSteamDlcCatalog({
      appid: steamAppId,
    })
    const detail = catalog.find((dlc) => dlc.appid === dlcAppId)

    if (!detail) {
      throw new Error('DLC Steam introuvable pour ce jeu.')
    }

    const externalId = String(detail.appid)
    const name = createSteamDlcName(detail)
    const releaseDate = parseNullableDate(detail.releaseDate)
    const existingSyncedDlc = await prisma.dlc.findFirst({
      where: {
        gameId: input.gameId,
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
          name,
          releaseDate,
          owned: true,
        },
      })

      return toGameDetail(await requireGameDetail(input.gameId))
    }

    const existingManualDlc = await prisma.dlc.findFirst({
      where: {
        gameId: input.gameId,
        name,
        provider: null,
        externalId: null,
      },
      select: {
        id: true,
      },
    })

    if (existingManualDlc) {
      await prisma.dlc.update({
        where: {
          id: existingManualDlc.id,
        },
        data: {
          releaseDate,
          owned: true,
          provider: steamProvider,
          externalId,
        },
      })

      return toGameDetail(await requireGameDetail(input.gameId))
    }

    await prisma.dlc.create({
      data: {
        gameId: input.gameId,
        name,
        releaseDate,
        owned: true,
        completed: false,
        provider: steamProvider,
        externalId,
      },
    })

    return toGameDetail(await requireGameDetail(input.gameId))
  }

  async updateDlc(input: UpdateDlcInput): Promise<GameDetail> {
    const name = trimOptional(input.name)
    const owned = input.completed ? true : input.owned
    const completed = input.owned === false ? false : input.completed
    const result = await prisma.dlc.updateMany({
      where: {
        id: input.id,
        gameId: input.gameId,
      },
      data: {
        name,
        releaseDate: parseNullableDate(input.releaseDate),
        owned,
        completed,
      },
    })

    if (result.count === 0) {
      throw new Error('DLC introuvable.')
    }

    return toGameDetail(await requireGameDetail(input.gameId))
  }

  async deleteDlc(input: DeleteDlcInput): Promise<GameDetail> {
    const result = await prisma.dlc.deleteMany({
      where: {
        id: input.id,
        gameId: input.gameId,
      },
    })

    if (result.count === 0) {
      throw new Error('DLC introuvable.')
    }

    return toGameDetail(await requireGameDetail(input.gameId))
  }

  async createAchievement(input: CreateAchievementInput): Promise<GameDetail> {
    const name = input.name.trim()

    if (name.length === 0) {
      throw new Error('Le nom du succès est obligatoire.')
    }

    const unlocked = input.unlocked ?? false

    await prisma.achievement.create({
      data: {
        gameId: input.gameId,
        name,
        description: trimNullable(input.description),
        iconUrl: trimNullable(input.iconUrl),
        provider: trimNullable(input.provider),
        unlocked,
        unlockDate: unlocked ? parseNullableDate(input.unlockDate) ?? new Date() : null,
      },
    })

    return toGameDetail(await requireGameDetail(input.gameId))
  }

  async updateAchievement(input: UpdateAchievementInput): Promise<GameDetail> {
    const data: {
      name?: string
      description?: string | null
      iconUrl?: string | null
      provider?: string | null
      unlocked?: boolean
      unlockDate?: Date | null
    } = {
      name: trimOptional(input.name),
      description: trimNullable(input.description),
      iconUrl: trimNullable(input.iconUrl),
      provider: trimNullable(input.provider),
    }

    if (input.unlocked !== undefined) {
      data.unlocked = input.unlocked
      data.unlockDate = input.unlocked
        ? parseNullableDate(input.unlockDate) ?? new Date()
        : null
    } else if (input.unlockDate !== undefined) {
      data.unlockDate = parseNullableDate(input.unlockDate)
    }

    const result = await prisma.achievement.updateMany({
      where: {
        id: input.id,
        gameId: input.gameId,
      },
      data,
    })

    if (result.count === 0) {
      throw new Error('Succès introuvable.')
    }

    return toGameDetail(await requireGameDetail(input.gameId))
  }

  async deleteAchievement(input: DeleteAchievementInput): Promise<GameDetail> {
    const result = await prisma.achievement.deleteMany({
      where: {
        id: input.id,
        gameId: input.gameId,
      },
    })

    if (result.count === 0) {
      throw new Error('Succès introuvable.')
    }

    return toGameDetail(await requireGameDetail(input.gameId))
  }

  async createScreenshot(input: CreateScreenshotInput): Promise<GameDetail> {
    const path = input.path.trim()

    if (path.length === 0) {
      throw new Error('Le chemin de la capture est obligatoire.')
    }

    const chronicleId = trimOptional(input.chronicleId)

    if (chronicleId) {
      await requireChronicleForGame(input.gameId, chronicleId)
    }

    await prisma.screenshot.create({
      data: {
        gameId: input.gameId,
        path,
        description: trimNullable(input.description),
        chronicleId,
      },
    })

    return toGameDetail(await requireGameDetail(input.gameId))
  }

  async importScreenshotFile(input: ImportScreenshotFileData): Promise<GameDetail> {
    const sourcePath = input.sourcePath.trim()

    if (sourcePath.length === 0) {
      throw new Error('Fichier de capture invalide.')
    }

    const destinationDirectory = join(screenshotMediaDirectory, input.gameId)
    const destinationPath = join(
      destinationDirectory,
      createImportedScreenshotName(sourcePath),
    )

    await mkdir(destinationDirectory, { recursive: true })
    await copyFile(sourcePath, destinationPath)

    return this.createScreenshot({
      gameId: input.gameId,
      path: destinationPath,
      description: input.description || basename(sourcePath),
      chronicleId: input.chronicleId,
    })
  }

  async updateScreenshot(input: UpdateScreenshotInput): Promise<GameDetail> {
    const chronicleId = trimNullable(input.chronicleId)

    if (chronicleId) {
      await requireChronicleForGame(input.gameId, chronicleId)
    }

    const result = await prisma.screenshot.updateMany({
      where: {
        id: input.id,
        gameId: input.gameId,
      },
      data: {
        path: trimOptional(input.path),
        description: trimNullable(input.description),
        chronicleId,
      },
    })

    if (result.count === 0) {
      throw new Error('Capture introuvable.')
    }

    return toGameDetail(await requireGameDetail(input.gameId))
  }

  async deleteScreenshot(input: DeleteScreenshotInput): Promise<GameDetail> {
    const result = await prisma.screenshot.deleteMany({
      where: {
        id: input.id,
        gameId: input.gameId,
      },
    })

    if (result.count === 0) {
      throw new Error('Capture introuvable.')
    }

    return toGameDetail(await requireGameDetail(input.gameId))
  }

  async archiveGame(id: string): Promise<void> {
    await prisma.game.update({
      where: {
        id,
      },
      data: {
        archived: true,
      },
    })
  }

  async restoreGame(id: string): Promise<void> {
    await prisma.game.update({
      where: {
        id,
      },
      data: {
        archived: false,
      },
    })
  }

  async deleteGame(id: string): Promise<void> {
    await prisma.game.delete({
      where: {
        id,
      },
    })
  }

  async createChronicle(input: CreateChronicleInput): Promise<GameDetail> {
    const title = input.title.trim()
    const content = input.content.trim()

    if (title.length === 0 || content.length === 0) {
      throw new Error('Une chronique doit avoir un titre et un contenu.')
    }

    await prisma.chronicle.create({
      data: {
        gameId: input.gameId,
        title,
        content,
        emotion: input.emotion,
        date: input.date ? new Date(input.date) : new Date(),
      },
    })

    return toGameDetail(await requireGameDetail(input.gameId))
  }

  async updateChronicle(input: UpdateChronicleInput): Promise<GameDetail> {
    const title = trimOptional(input.title)
    const content = trimOptional(input.content)

    if (input.title !== undefined && !title) {
      throw new Error('Le titre de la chronique est obligatoire.')
    }

    if (input.content !== undefined && !content) {
      throw new Error('Le contenu de la chronique est obligatoire.')
    }

    const result = await prisma.chronicle.updateMany({
      where: {
        id: input.id,
        gameId: input.gameId,
      },
      data: {
        title,
        content,
        emotion: input.emotion,
        date: input.date ? new Date(input.date) : undefined,
        favorite: input.favorite,
      },
    })

    if (result.count === 0) {
      throw new Error('Chronique introuvable.')
    }

    return toGameDetail(await requireGameDetail(input.gameId))
  }

  async deleteChronicle(input: DeleteChronicleInput): Promise<GameDetail> {
    const result = await prisma.chronicle.deleteMany({
      where: {
        id: input.id,
        gameId: input.gameId,
      },
    })

    if (result.count === 0) {
      throw new Error('Chronique introuvable.')
    }

    return toGameDetail(await requireGameDetail(input.gameId))
  }

  async createPlaySession(input: CreatePlaySessionInput): Promise<GameDetail> {
    if (!Number.isFinite(input.durationMinutes) || input.durationMinutes <= 0) {
      throw new Error('La durée de session doit être positive.')
    }

    const platformName = trimOptional(input.platformName)
    const start = input.start ? new Date(input.start) : new Date()

    await prisma.playSession.create({
      data: {
        game: {
          connect: {
            id: input.gameId,
          },
        },
        start,
        durationMinutes: Math.round(input.durationMinutes),
        note: trimOptional(input.note),
        platform: platformName
          ? {
              connectOrCreate: {
                where: {
                  name: platformName,
                },
                create: {
                  name: platformName,
                },
              },
            }
          : undefined,
      },
    })

    return toGameDetail(await requireGameDetail(input.gameId))
  }

  async updatePlaySession(input: UpdatePlaySessionInput): Promise<GameDetail> {
    if (
      input.durationMinutes !== undefined &&
      (!Number.isFinite(input.durationMinutes) || input.durationMinutes <= 0)
    ) {
      throw new Error('La durée de session doit être positive.')
    }

    const session = await prisma.playSession.findFirst({
      where: {
        id: input.id,
        gameId: input.gameId,
      },
      select: {
        id: true,
      },
    })

    if (!session) {
      throw new Error('Session introuvable.')
    }

    const platformName = trimNullable(input.platformName)

    await prisma.playSession.update({
      where: {
        id: input.id,
      },
      data: {
        start: input.start ? new Date(input.start) : undefined,
        durationMinutes:
          input.durationMinutes === undefined
            ? undefined
            : Math.round(input.durationMinutes),
        note: trimNullable(input.note),
        platform:
          platformName === undefined
            ? undefined
            : platformName === null
              ? {
                  disconnect: true,
                }
              : {
                  connectOrCreate: {
                    where: {
                      name: platformName,
                    },
                    create: {
                      name: platformName,
                    },
                  },
                },
      },
    })

    return toGameDetail(await requireGameDetail(input.gameId))
  }

  async deletePlaySession(input: DeletePlaySessionInput): Promise<GameDetail> {
    const result = await prisma.playSession.deleteMany({
      where: {
        id: input.id,
        gameId: input.gameId,
      },
    })

    if (result.count === 0) {
      throw new Error('Session introuvable.')
    }

    return toGameDetail(await requireGameDetail(input.gameId))
  }
}

export const gameService = new GameService()
