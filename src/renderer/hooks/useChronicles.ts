import { useCallback, useEffect, useRef, useState } from 'react'
import type { ChronicleTimelineItem, GameListItem } from '../../types/game'

function buildBrowserChronicles(games: GameListItem[]): ChronicleTimelineItem[] {
  return games
    .filter((game) => game.lastChronicleTitle)
    .map((game) => ({
      id: `browser-${game.id}`,
      title: game.lastChronicleTitle ?? 'Souvenir',
      content: 'Ouvrez la version Electron pour retrouver le contenu complet de cette chronique.',
      date: game.updatedAt,
      emotion: null,
      favorite: false,
      gameId: game.id,
      gameTitle: game.title,
      gameCoverUrl: game.coverUrl,
      gameStatus: game.status,
    }))
}

export function useChronicles(games: GameListItem[], enabled = true) {
  const gamesRef = useRef(games)
  const [chronicles, setChronicles] = useState<ChronicleTimelineItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    const api = window.ludux

    if (!api) {
      setChronicles(buildBrowserChronicles(gamesRef.current))
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      setChronicles(await api.library.listChronicles())
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
    chronicles,
    error,
    isLoading,
    refresh,
  }
}
