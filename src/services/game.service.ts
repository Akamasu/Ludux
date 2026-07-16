import { prisma } from '../database/client'
import type { CreateGameInput, GameListItem, GameStatus } from '../types/game'

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
}

export const gameService = new GameService()
