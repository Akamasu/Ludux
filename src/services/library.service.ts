import { prisma } from '../database/client'
import type { GameListItem, LibraryOverview } from '../types/game'
import { gameService } from './game.service'

function findTopPlatform(games: GameListItem[]) {
  const platformCounts = new Map<string, number>()

  for (const game of games) {
    for (const platform of game.platforms) {
      platformCounts.set(platform, (platformCounts.get(platform) ?? 0) + 1)
    }
  }

  return [...platformCounts.entries()].sort((left, right) => right[1] - left[1])[0]?.[0] ?? null
}

class LibraryService {
  async getOverview(): Promise<LibraryOverview> {
    const [games, recentChronicle] = await Promise.all([
      gameService.listGames(),
      prisma.chronicle.findFirst({
        include: {
          game: true,
        },
        orderBy: {
          date: 'desc',
        },
      }),
    ])

    return {
      gamesOwned: games.length,
      gamesCompleted: games.filter((game) =>
        game.status === 'COMPLETED' || game.status === 'COMPLETED_100',
      ).length,
      totalMinutes: games.reduce((total, game) => total + game.totalMinutes, 0),
      topPlatform: findTopPlatform(games),
      lastAdventure: games[0] ?? null,
      recentChronicle: recentChronicle
        ? {
            id: recentChronicle.id,
            title: recentChronicle.title,
            gameTitle: recentChronicle.game.title,
            date: recentChronicle.date.toISOString(),
          }
        : null,
    }
  }
}

export const libraryService = new LibraryService()
