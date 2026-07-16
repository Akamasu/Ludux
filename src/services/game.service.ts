import { prisma } from '../database/client'
import type {
  CreateChronicleInput,
  CreateGameInput,
  CreatePlaySessionInput,
  Emotion,
  GameDetail,
  GameListItem,
  GameStatus,
  UpdateGameInput,
} from '../types/game'

async function fetchGames() {
  return prisma.game.findMany({
    where: {
      archived: false,
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
