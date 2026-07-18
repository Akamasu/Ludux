import { prisma } from '../database/client'
import {
  EMOTION_VALUES,
  GAME_STATUS_VALUES,
  type ChronicleTimelineItem,
  type Emotion,
  type GameListItem,
  type GameStatus,
  type LibraryOverview,
  type LibraryStatistics,
  type LifeBookEvent,
} from '../types/game'
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

function isCompletedStatus(status: GameStatus) {
  return status === 'COMPLETED' || status === 'COMPLETED_100'
}

function toMonthKey(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')

  return `${year}-${month}`
}

async function fetchStatisticsGames() {
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
      sessions: {
        include: {
          platform: true,
        },
      },
      chronicles: true,
    },
  })
}

type PlatformAccumulator = {
  name: string
  gameIds: Set<string>
  sessions: number
  totalMinutes: number
}

function createPlatformAccumulator(name: string): PlatformAccumulator {
  return {
    name,
    gameIds: new Set<string>(),
    sessions: 0,
    totalMinutes: 0,
  }
}

class LibraryService {
  async getOverview(): Promise<LibraryOverview> {
    const [games, recentChronicle] = await Promise.all([
      gameService.listGames(),
      prisma.chronicle.findFirst({
        where: {
          game: {
            archived: false,
          },
        },
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

  async getStatistics(): Promise<LibraryStatistics> {
    const games = await fetchStatisticsGames()
    const statusStats = new Map(
      GAME_STATUS_VALUES.map((status) => [
        status,
        {
          status,
          count: 0,
          totalMinutes: 0,
        },
      ]),
    )
    const platformStats = new Map<string, PlatformAccumulator>()
    const emotionStats = new Map(
      EMOTION_VALUES.map((emotion) => [
        emotion,
        {
          emotion,
          count: 0,
        },
      ]),
    )
    const monthlyPlayStats = new Map<
      string,
      {
        month: string
        sessions: number
        totalMinutes: number
      }
    >()

    let totalMinutes = 0
    let totalSessions = 0
    let totalChronicles = 0

    for (const game of games) {
      const status = game.status as GameStatus
      const gameMinutes = game.sessions.reduce(
        (total, session) => total + session.durationMinutes,
        0,
      )
      const statusStat = statusStats.get(status)

      if (statusStat) {
        statusStat.count += 1
        statusStat.totalMinutes += gameMinutes
      }

      for (const gamePlatform of game.platforms) {
        const platformName = gamePlatform.platform.name
        const accumulator =
          platformStats.get(platformName) ?? createPlatformAccumulator(platformName)

        accumulator.gameIds.add(game.id)
        platformStats.set(platformName, accumulator)
      }

      for (const session of game.sessions) {
        totalMinutes += session.durationMinutes
        totalSessions += 1

        if (session.platform) {
          const platformName = session.platform.name
          const accumulator =
            platformStats.get(platformName) ?? createPlatformAccumulator(platformName)

          accumulator.gameIds.add(game.id)
          accumulator.sessions += 1
          accumulator.totalMinutes += session.durationMinutes
          platformStats.set(platformName, accumulator)
        }

        const month = toMonthKey(session.start)
        const monthlyStat =
          monthlyPlayStats.get(month) ?? {
            month,
            sessions: 0,
            totalMinutes: 0,
          }

        monthlyStat.sessions += 1
        monthlyStat.totalMinutes += session.durationMinutes
        monthlyPlayStats.set(month, monthlyStat)
      }

      for (const chronicle of game.chronicles) {
        totalChronicles += 1

        if (chronicle.emotion) {
          const emotion = chronicle.emotion as Emotion
          const emotionStat = emotionStats.get(emotion)

          if (emotionStat) {
            emotionStat.count += 1
          }
        }
      }
    }

    const gamesCompleted = games.filter((game) =>
      isCompletedStatus(game.status as GameStatus),
    ).length
    const gamesOwned = games.length

    return {
      gamesOwned,
      gamesCompleted,
      completionRate:
        gamesOwned === 0 ? 0 : Math.round((gamesCompleted / gamesOwned) * 100),
      totalMinutes,
      totalSessions,
      totalChronicles,
      statusStats: [...statusStats.values()],
      platformStats: [...platformStats.values()]
        .map((stat) => ({
          name: stat.name,
          games: stat.gameIds.size,
          sessions: stat.sessions,
          totalMinutes: stat.totalMinutes,
        }))
        .sort((left, right) => {
          if (right.games !== left.games) {
            return right.games - left.games
          }

          return right.totalMinutes - left.totalMinutes
        }),
      emotionStats: [...emotionStats.values()].sort((left, right) => right.count - left.count),
      monthlyPlayStats: [...monthlyPlayStats.values()]
        .sort((left, right) => left.month.localeCompare(right.month))
        .slice(-12),
    }
  }

  async listChronicles(): Promise<ChronicleTimelineItem[]> {
    const chronicles = await prisma.chronicle.findMany({
      where: {
        game: {
          archived: false,
        },
      },
      include: {
        game: true,
      },
      orderBy: {
        date: 'desc',
      },
    })

    return chronicles.map((chronicle) => ({
      id: chronicle.id,
      title: chronicle.title,
      content: chronicle.content,
      date: chronicle.date.toISOString(),
      emotion: chronicle.emotion as Emotion | null,
      favorite: chronicle.favorite,
      gameId: chronicle.gameId,
      gameTitle: chronicle.game.title,
      gameCoverUrl: chronicle.game.coverUrl,
      gameStatus: chronicle.game.status as GameStatus,
    }))
  }

  async listLifeEvents(): Promise<LifeBookEvent[]> {
    const [chronicles, sessions] = await Promise.all([
      prisma.chronicle.findMany({
        where: {
          game: {
            archived: false,
          },
        },
        include: {
          game: true,
        },
        orderBy: {
          date: 'desc',
        },
      }),
      prisma.playSession.findMany({
        where: {
          game: {
            archived: false,
          },
        },
        include: {
          game: true,
          platform: true,
        },
        orderBy: {
          start: 'desc',
        },
      }),
    ])

    return [
      ...chronicles.map((chronicle): LifeBookEvent => ({
        id: `chronicle-${chronicle.id}`,
        kind: 'CHRONICLE',
        title: chronicle.title,
        description: chronicle.content,
        date: chronicle.date.toISOString(),
        gameId: chronicle.gameId,
        gameTitle: chronicle.game.title,
        gameCoverUrl: chronicle.game.coverUrl,
        gameStatus: chronicle.game.status as GameStatus,
        emotion: chronicle.emotion as Emotion | null,
        durationMinutes: null,
        platformName: null,
      })),
      ...sessions.map((session): LifeBookEvent => ({
        id: `session-${session.id}`,
        kind: 'SESSION',
        title: 'Session de jeu',
        description: session.note,
        date: session.start.toISOString(),
        gameId: session.gameId,
        gameTitle: session.game.title,
        gameCoverUrl: session.game.coverUrl,
        gameStatus: session.game.status as GameStatus,
        emotion: null,
        durationMinutes: session.durationMinutes,
        platformName: session.platform?.name ?? null,
      })),
    ].sort((left, right) => new Date(right.date).getTime() - new Date(left.date).getTime())
  }
}

export const libraryService = new LibraryService()
