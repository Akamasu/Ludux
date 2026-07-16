import { useCallback, useEffect, useState } from 'react'
import type {
  CreateChronicleInput,
  CreatePlaySessionInput,
  GameDetail,
  GameListItem,
  UpdateGameInput,
} from '../../types/game'

function detailFromListItem(game: GameListItem): GameDetail {
  return {
    ...game,
    description: null,
    developer: null,
    publisher: null,
    releaseDate: null,
    website: null,
    chronicles: [],
    sessions: [],
  }
}

export function useGameDetail(
  gameId: string | null,
  fallbackGame: GameListItem | null,
  onChanged: () => Promise<void>,
) {
  const [detail, setDetail] = useState<GameDetail | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!gameId) {
      setDetail(null)
      return
    }

    const api = window.ludux

    if (!api) {
      setDetail(fallbackGame ? detailFromListItem(fallbackGame) : null)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      setDetail(await api.games.getById(gameId))
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Erreur inconnue')
    } finally {
      setIsLoading(false)
    }
  }, [fallbackGame, gameId])

  const updateGame = useCallback(
    async (input: UpdateGameInput) => {
      const api = window.ludux
      setIsSaving(true)
      setError(null)

      try {
        if (!api) {
          setDetail((current) =>
            current
              ? {
                  ...current,
                  title: input.title ?? current.title,
                  status: input.status ?? current.status,
                  description: input.description ?? current.description,
                  coverUrl: input.coverUrl ?? current.coverUrl,
                  developer: input.developer ?? current.developer,
                  publisher: input.publisher ?? current.publisher,
                  website: input.website ?? current.website,
                }
              : current,
          )
          return
        }

        setDetail(await api.games.update(input))
        await onChanged()
      } catch (caughtError) {
        setError(caughtError instanceof Error ? caughtError.message : 'Erreur inconnue')
      } finally {
        setIsSaving(false)
      }
    },
    [onChanged],
  )

  const createChronicle = useCallback(
    async (input: CreateChronicleInput) => {
      const api = window.ludux
      setIsSaving(true)
      setError(null)

      try {
        if (!api) {
          setDetail((current) =>
            current
              ? {
                  ...current,
                  lastChronicleTitle: input.title,
                  chronicles: [
                    {
                      id: crypto.randomUUID(),
                      title: input.title,
                      content: input.content,
                      date: input.date ?? new Date().toISOString(),
                      emotion: input.emotion ?? null,
                      favorite: false,
                    },
                    ...current.chronicles,
                  ],
                }
              : current,
          )
          return
        }

        setDetail(await api.games.createChronicle(input))
        await onChanged()
      } catch (caughtError) {
        setError(caughtError instanceof Error ? caughtError.message : 'Erreur inconnue')
      } finally {
        setIsSaving(false)
      }
    },
    [onChanged],
  )

  const createPlaySession = useCallback(
    async (input: CreatePlaySessionInput) => {
      const api = window.ludux
      setIsSaving(true)
      setError(null)

      try {
        if (!api) {
          setDetail((current) =>
            current
              ? {
                  ...current,
                  totalMinutes: current.totalMinutes + input.durationMinutes,
                  sessions: [
                    {
                      id: crypto.randomUUID(),
                      start: input.start ?? new Date().toISOString(),
                      end: null,
                      durationMinutes: input.durationMinutes,
                      note: input.note ?? null,
                      platformName: input.platformName ?? null,
                    },
                    ...current.sessions,
                  ],
                }
              : current,
          )
          return
        }

        setDetail(await api.games.createPlaySession(input))
        await onChanged()
      } catch (caughtError) {
        setError(caughtError instanceof Error ? caughtError.message : 'Erreur inconnue')
      } finally {
        setIsSaving(false)
      }
    },
    [onChanged],
  )

  useEffect(() => {
    void refresh()
  }, [refresh])

  return {
    detail,
    error,
    isLoading,
    isSaving,
    refresh,
    updateGame,
    createChronicle,
    createPlaySession,
  }
}
