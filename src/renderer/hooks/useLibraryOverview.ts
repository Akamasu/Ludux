import { useCallback, useEffect, useState } from 'react'
import type { CreateGameInput, GameListItem, LibraryOverview } from '../../types/game'
import {
  countLibraryItemKinds,
  isUtilityStatus,
} from '../../utils/libraryItemKind'

const EMPTY_OVERVIEW: LibraryOverview = {
  gamesOwned: 0,
  utilitiesOwned: 0,
  gamesCompleted: 0,
  totalMinutes: 0,
  topPlatform: null,
  lastAdventure: null,
  recentChronicle: null,
}

function createBrowserOnlyGame(input: CreateGameInput): GameListItem {
  return {
    id: crypto.randomUUID(),
    title: input.title.trim(),
    status: input.status ?? 'BACKLOG',
    coverUrl: input.coverUrl ?? null,
    platforms: input.platformName?.trim() ? [input.platformName.trim()] : [],
    collections: [],
    genres: [],
    totalMinutes: 0,
    rating: null,
    lastChronicleTitle: null,
    updatedAt: new Date().toISOString(),
  }
}

function buildOverviewFromGames(games: GameListItem[]): LibraryOverview {
  const platformCounts = new Map<string, number>()
  const playableGames = games.filter((game) => !isUtilityStatus(game.status))
  const itemCounts = countLibraryItemKinds(games)

  for (const game of playableGames) {
    for (const platform of game.platforms) {
      platformCounts.set(platform, (platformCounts.get(platform) ?? 0) + 1)
    }
  }

  return {
    ...itemCounts,
    gamesCompleted: playableGames.filter((game) =>
      game.status === 'COMPLETED' || game.status === 'COMPLETED_100',
    ).length,
    totalMinutes: playableGames.reduce(
      (total, game) => total + game.totalMinutes,
      0,
    ),
    topPlatform: [...platformCounts.entries()].sort((left, right) => right[1] - left[1])[0]?.[0] ?? null,
    lastAdventure: playableGames[0] ?? null,
    recentChronicle: null,
  }
}

export function useLibraryOverview() {
  const [overview, setOverview] = useState<LibraryOverview>(EMPTY_OVERVIEW)
  const [games, setGames] = useState<GameListItem[]>([])
  const [archivedGames, setArchivedGames] = useState<GameListItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    const api = window.ludux

    if (!api) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const [nextOverview, nextGames, nextArchivedGames] = await Promise.all([
        api.library.getOverview(),
        api.games.list(),
        api.games.listArchived(),
      ])

      setOverview(nextOverview)
      setGames(nextGames)
      setArchivedGames(nextArchivedGames)
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Erreur inconnue')
    } finally {
      setIsLoading(false)
    }
  }, [])

  const createGame = useCallback(
    async (input: CreateGameInput) => {
      const api = window.ludux
      setIsSaving(true)
      setError(null)

      try {
        if (!api) {
          const nextGames = [createBrowserOnlyGame(input), ...games]
          setGames(nextGames)
          setOverview(buildOverviewFromGames(nextGames))
          return
        }

        await api.games.create(input)
        await refresh()
      } catch (caughtError) {
        setError(caughtError instanceof Error ? caughtError.message : 'Erreur inconnue')
      } finally {
        setIsSaving(false)
      }
    },
    [games, refresh],
  )

  const archiveGame = useCallback(
    async (gameId: string) => {
      const api = window.ludux
      setIsSaving(true)
      setError(null)

      try {
        if (!api) {
          const game = games.find((item) => item.id === gameId)
          const nextGames = games.filter((item) => item.id !== gameId)

          setGames(nextGames)
          setOverview(buildOverviewFromGames(nextGames))

          if (game) {
            setArchivedGames((current) => [game, ...current])
          }

          return
        }

        await api.games.archive(gameId)
        await refresh()
      } catch (caughtError) {
        setError(caughtError instanceof Error ? caughtError.message : 'Erreur inconnue')
      } finally {
        setIsSaving(false)
      }
    },
    [games, refresh],
  )

  const restoreGame = useCallback(
    async (gameId: string) => {
      const api = window.ludux
      setIsSaving(true)
      setError(null)

      try {
        if (!api) {
          const game = archivedGames.find((item) => item.id === gameId)
          const nextArchivedGames = archivedGames.filter((item) => item.id !== gameId)

          setArchivedGames(nextArchivedGames)

          if (game) {
            const nextGames = [game, ...games]
            setGames(nextGames)
            setOverview(buildOverviewFromGames(nextGames))
          }

          return
        }

        await api.games.restore(gameId)
        await refresh()
      } catch (caughtError) {
        setError(caughtError instanceof Error ? caughtError.message : 'Erreur inconnue')
      } finally {
        setIsSaving(false)
      }
    },
    [archivedGames, games, refresh],
  )

  const deleteGame = useCallback(
    async (gameId: string) => {
      const api = window.ludux
      setIsSaving(true)
      setError(null)

      try {
        if (!api) {
          const nextGames = games.filter((item) => item.id !== gameId)

          setGames(nextGames)
          setArchivedGames((current) => current.filter((item) => item.id !== gameId))
          setOverview(buildOverviewFromGames(nextGames))
          return
        }

        await api.games.delete(gameId)
        await refresh()
      } catch (caughtError) {
        setError(caughtError instanceof Error ? caughtError.message : 'Erreur inconnue')
      } finally {
        setIsSaving(false)
      }
    },
    [games, refresh],
  )

  useEffect(() => {
    void refresh()
  }, [refresh])

  return {
    overview,
    games,
    archivedGames,
    isLoading,
    isSaving,
    error,
    createGame,
    archiveGame,
    restoreGame,
    deleteGame,
    refresh,
  }
}
