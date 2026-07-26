import { useCallback, useEffect, useRef, useState } from 'react'
import {
  EMOTION_VALUES,
  GAME_STATUS_VALUES,
  type GameListItem,
  type LibraryStatistics,
  type PlatformStat,
  type StatusStat,
} from '../../types/game'

function createEmptyStatistics(): LibraryStatistics {
  return {
    gamesOwned: 0,
    gamesCompleted: 0,
    completionRate: 0,
    totalMinutes: 0,
    totalSessions: 0,
    totalChronicles: 0,
    statusStats: GAME_STATUS_VALUES.map((status) => ({
      status,
      count: 0,
      totalMinutes: 0,
    })),
    platformStats: [],
    emotionStats: EMOTION_VALUES.map((emotion) => ({
      emotion,
      count: 0,
    })),
    monthlyPlayStats: [],
  }
}

function buildStatisticsFromGames(games: GameListItem[]): LibraryStatistics {
  const statusStats = new Map<string, StatusStat>(
    createEmptyStatistics().statusStats.map((stat) => [stat.status, stat]),
  )
  const platformStats = new Map<string, PlatformStat>()

  let totalMinutes = 0
  let gamesCompleted = 0

  for (const game of games) {
    totalMinutes += game.totalMinutes

    if (game.status === 'COMPLETED' || game.status === 'COMPLETED_100') {
      gamesCompleted += 1
    }

    const statusStat = statusStats.get(game.status)

    if (statusStat) {
      statusStat.count += 1
      statusStat.totalMinutes += game.totalMinutes
    }

    for (const platform of game.platforms) {
      const platformStat =
        platformStats.get(platform) ?? {
          name: platform,
          games: 0,
          sessions: 0,
          totalMinutes: 0,
        }

      platformStat.games += 1
      platformStat.totalMinutes += game.totalMinutes
      platformStats.set(platform, platformStat)
    }
  }

  return {
    ...createEmptyStatistics(),
    gamesOwned: games.length,
    gamesCompleted,
    completionRate:
      games.length === 0 ? 0 : Math.round((gamesCompleted / games.length) * 100),
    totalMinutes,
    statusStats: [...statusStats.values()],
    platformStats: [...platformStats.values()].sort((left, right) => {
      if (right.games !== left.games) {
        return right.games - left.games
      }

      return right.totalMinutes - left.totalMinutes
    }),
  }
}

export function useLibraryStatistics(games: GameListItem[], enabled = true) {
  const gamesRef = useRef(games)
  const [statistics, setStatistics] = useState<LibraryStatistics>(createEmptyStatistics)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    const api = window.ludux

    if (!api) {
      setStatistics(buildStatisticsFromGames(gamesRef.current))
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      setStatistics(await api.library.getStatistics())
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Erreur inconnue')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (enabled) {
      void refresh()
    }
  }, [enabled, refresh])

  useEffect(() => {
    gamesRef.current = games

    if (enabled && !window.ludux) {
      void refresh()
    }
  }, [enabled, games, refresh])

  return {
    statistics,
    isLoading,
    error,
    refresh,
  }
}
