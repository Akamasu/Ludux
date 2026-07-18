import { prisma } from '../database/client'
import type {
  CreateAchievementInput,
  CreateChronicleInput,
  CreateDlcInput,
  CreateGameInput,
  CreatePlaySessionInput,
  DeleteAchievementInput,
  DeleteDlcInput,
  Emotion,
  GameDetail,
  GameListItem,
  GameStatus,
  UpdateAchievementInput,
  UpdateDlcInput,
  UpdateGameInput,
  UpdateReviewInput,
} from '../types/game'

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
      sessions: {
        include: {
          platform: true,
        },
        orderBy: {
          start: 'desc',
        },
      },
      review: true,
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
    developer: game.developer,
    publisher: game.publisher,
    releaseDate: game.releaseDate?.toISOString() ?? null,
    website: game.website,
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

function parseNullableDate(value: string | null | undefined) {
  if (value === undefined) {
    return undefined
  }

  if (value === null || value.trim().length === 0) {
    return null
  }

  return new Date(value)
}

async function requireGameDetail(id: string) {
  const game = await fetchGameDetail(id)

  if (!game) {
    throw new Error('Jeu introuvable.')
  }

  return game
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
      },
    })

    return toGameListItem(game)
  }

  async getGameById(id: string): Promise<GameDetail | null> {
    const game = await fetchGameDetail(id)
    return game ? toGameDetail(game) : null
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
        coverUrl: trimOptional(input.coverUrl),
        developer: trimOptional(input.developer),
        publisher: trimOptional(input.publisher),
        website: trimOptional(input.website),
      },
    })

    return toGameDetail(await requireGameDetail(input.id))
  }

  async updateReview(input: UpdateReviewInput): Promise<GameDetail> {
    if (!Number.isInteger(input.rating) || input.rating < 1 || input.rating > 10) {
      throw new Error('La note doit etre comprise entre 1 et 10.')
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
      throw new Error('Le nom du succes est obligatoire.')
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
      throw new Error('Succes introuvable.')
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
      throw new Error('Succes introuvable.')
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

  async createPlaySession(input: CreatePlaySessionInput): Promise<GameDetail> {
    if (!Number.isFinite(input.durationMinutes) || input.durationMinutes <= 0) {
      throw new Error('La duree de session doit etre positive.')
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
}

export const gameService = new GameService()
