import { useCallback, useEffect, useState } from 'react'
import type { GameListItem, LifeBookEvent } from '../../types/game'

function buildBrowserLifeEvents(games: GameListItem[]): LifeBookEvent[] {
  const events: LifeBookEvent[] = []

  for (const game of games) {
    if (game.lastChronicleTitle) {
      events.push({
        id: `browser-chronicle-${game.id}`,
        kind: 'CHRONICLE',
        title: game.lastChronicleTitle,
        description:
          'Ouvrez la version Electron pour retrouver le contenu complet de ce souvenir.',
        date: game.updatedAt,
        gameId: game.id,
        gameTitle: game.title,
        gameCoverUrl: game.coverUrl,
        gameStatus: game.status,
        emotion: null,
        durationMinutes: null,
        platformName: null,
      })
    }

    if (game.totalMinutes > 0) {
      events.push({
        id: `browser-session-${game.id}`,
        kind: 'SESSION',
        title: 'Temps de jeu renseigne',
        description: null,
        date: game.updatedAt,
        gameId: game.id,
        gameTitle: game.title,
        gameCoverUrl: game.coverUrl,
        gameStatus: game.status,
        emotion: null,
        durationMinutes: game.totalMinutes,
        platformName: game.platforms[0] ?? null,
      })
    }
  }

  return events.sort(
    (left, right) => new Date(right.date).getTime() - new Date(left.date).getTime(),
  )
}

export function useLifeBook(games: GameListItem[]) {
  const [events, setEvents] = useState<LifeBookEvent[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    const api = window.ludux

    if (!api) {
      setEvents(buildBrowserLifeEvents(games))
      setError(null)
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      setEvents(await api.library.listLifeEvents())
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Erreur inconnue')
    } finally {
      setIsLoading(false)
    }
  }, [games])

  useEffect(() => {
    void refresh()
  }, [refresh])

  return {
    events,
    error,
    isLoading,
    refresh,
  }
}
