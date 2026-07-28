import { ChevronLeft, ChevronRight, Clock3, Star } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  GAME_STATUS_LABELS,
  type GameListItem,
} from '../../../types/game'
import { formatHours } from '../../utils/formatters'
import { GameCover } from './GameCover'

const gamesPerPage = 4
const gamesPerSpread = gamesPerPage * 2

interface GameBookViewProps {
  games: GameListItem[]
  onOpenGame: (gameId: string) => void
}

interface BookPageProps {
  games: GameListItem[]
  pageNumber: number
  totalPages: number
  onOpenGame: (gameId: string) => void
}

function BookGameEntry({
  game,
  onOpenGame,
}: {
  game: GameListItem
  onOpenGame: (gameId: string) => void
}) {
  return (
    <button
      type="button"
      className="book-page-game group grid min-h-0 w-full items-center gap-3 overflow-hidden border-b border-[#6F522B]/20 px-1 py-2 text-left last:border-b-0"
      onClick={() => onOpenGame(game.id)}
      aria-label={`Ouvrir ${game.title}`}
    >
      <span className="aspect-video min-w-0 overflow-hidden rounded-md border border-[#6F522B]/15 bg-[#D8CEBD] shadow-[0_10px_20px_-14px_rgba(44,30,16,0.9)]">
        <GameCover
          title={game.title}
          coverUrl={game.coverUrl}
          loading="eager"
          className="transition duration-200 group-hover:scale-[1.03]"
          initialClassName="text-2xl text-[#7B6B57]"
        />
      </span>

      <span className="min-w-0">
        <span className="font-display block text-[11px] font-semibold uppercase text-[#8A6132]">
          {GAME_STATUS_LABELS[game.status]}
        </span>
        <span className="font-literary mt-1 line-clamp-2 block break-words text-sm font-semibold leading-5 text-[#2E241A] transition group-hover:text-[#6F4421]">
          {game.title}
        </span>
        <span className="mt-1.5 block truncate text-xs text-[#776957]">
          {game.platforms.join(', ') || 'Plateforme non renseignée'}
        </span>
        <span className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#675948]">
          <span className="inline-flex items-center gap-1">
            <Clock3 size={13} aria-hidden="true" />
            {formatHours(game.totalMinutes)}
          </span>
          <span className="inline-flex items-center gap-1">
            <Star size={13} aria-hidden="true" />
            {game.rating ? `${game.rating}/10` : 'Non noté'}
          </span>
        </span>
      </span>
    </button>
  )
}

function BookPage({
  games,
  onOpenGame,
  pageNumber,
  totalPages,
}: BookPageProps) {
  return (
    <section className="book-paper-page grid min-h-0 grid-rows-[auto_minmax(0,1fr)_auto] px-2 py-1">
      <p className="font-display text-center text-xs font-semibold uppercase text-[#8A6132]">
        Ludux
      </p>

      <div className="grid min-h-0 grid-rows-4 py-1">
        {games.map((game) => (
          <BookGameEntry key={game.id} game={game} onOpenGame={onOpenGame} />
        ))}
        {games.length === 0 ? (
          <div className="grid place-items-center text-center">
            <p className="font-literary text-sm italic text-[#8A7B68]">
              Fin du catalogue
            </p>
          </div>
        ) : null}
      </div>

      <p className="font-display text-center text-[11px] text-[#8A7458]">
        {pageNumber <= totalPages ? pageNumber : ''}
      </p>
    </section>
  )
}

export function GameBookView({ games, onOpenGame }: GameBookViewProps) {
  const [spreadIndex, setSpreadIndex] = useState(0)
  const [turnDirection, setTurnDirection] = useState<'backward' | 'forward'>(
    'forward',
  )
  const [turnSequence, setTurnSequence] = useState(0)
  const [isTurning, setIsTurning] = useState(false)
  const turnMidpointTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const turnEndTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const spreadCount = Math.max(1, Math.ceil(games.length / gamesPerSpread))
  const safeSpreadIndex = Math.min(spreadIndex, spreadCount - 1)
  const totalPages = Math.max(1, Math.ceil(games.length / gamesPerPage))

  function clearTurnTimers() {
    if (turnMidpointTimer.current) {
      clearTimeout(turnMidpointTimer.current)
      turnMidpointTimer.current = null
    }

    if (turnEndTimer.current) {
      clearTimeout(turnEndTimer.current)
      turnEndTimer.current = null
    }
  }

  useEffect(() => {
    clearTurnTimers()
    setIsTurning(false)
    setSpreadIndex(0)

    return clearTurnTimers
  }, [games])

  const spreadGames = useMemo(
    () =>
      games.slice(
        safeSpreadIndex * gamesPerSpread,
        safeSpreadIndex * gamesPerSpread + gamesPerSpread,
      ),
    [games, safeSpreadIndex],
  )

  function turnTo(nextIndex: number) {
    if (
      isTurning ||
      nextIndex < 0 ||
      nextIndex >= spreadCount ||
      nextIndex === safeSpreadIndex
    ) {
      return
    }

    const direction = nextIndex > safeSpreadIndex ? 'forward' : 'backward'
    setTurnDirection(direction)

    clearTurnTimers()
    setIsTurning(true)
    setTurnSequence((current) => current + 1)

    turnMidpointTimer.current = setTimeout(() => {
      setSpreadIndex(nextIndex)
      turnMidpointTimer.current = null
    }, 360)

    turnEndTimer.current = setTimeout(() => {
      setIsTurning(false)
      turnEndTimer.current = null
    }, 760)
  }

  const firstGameNumber = safeSpreadIndex * gamesPerSpread + 1
  const lastGameNumber = Math.min(
    firstGameNumber + gamesPerSpread - 1,
    games.length,
  )
  const leftPageNumber = safeSpreadIndex * 2 + 1

  return (
    <section
      className="library-book-stage view-transition"
      aria-label="Catalogue en livre"
    >
      <div
        className="book-stage-index"
        aria-live="polite"
        aria-atomic="true"
      >
        <span aria-hidden="true" />
        <p className="font-display text-center text-xs font-semibold uppercase text-[#C9A646]">
          Jeux {firstGameNumber} à {lastGameNumber} sur {games.length}
          <span className="mx-2 text-zinc-700" aria-hidden="true">
            •
          </span>
          Double page {safeSpreadIndex + 1} sur {spreadCount}
        </p>
        <span aria-hidden="true" />
      </div>

      <div className="library-book-spread mx-auto">
        <img
          src="./assets/open-book-pages.webp"
          alt=""
          aria-hidden="true"
          draggable={false}
          className="book-spread-art pointer-events-none absolute inset-0 h-full w-full object-contain"
        />

        <button
          type="button"
          className="book-turn-button absolute left-[2.5%] top-1/2 z-20 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full border border-[#C9A646]/25 bg-[#0F1117]/90 text-[#E9DFA8] shadow-lg transition hover:border-[#C9A646]/60 hover:bg-[#181B23] hover:text-white disabled:pointer-events-none disabled:opacity-20"
          disabled={isTurning || safeSpreadIndex === 0}
          onClick={() => turnTo(safeSpreadIndex - 1)}
          aria-label="Double page précédente"
          title="Double page précédente"
        >
          <ChevronLeft size={20} aria-hidden="true" />
        </button>

        <div
          className="book-spread-pages"
          data-turn={turnDirection}
          data-turn-state={isTurning ? 'turning' : 'idle'}
        >
          <BookPage
            games={spreadGames.slice(0, gamesPerPage)}
            pageNumber={leftPageNumber}
            totalPages={totalPages}
            onOpenGame={onOpenGame}
          />
          <BookPage
            games={spreadGames.slice(gamesPerPage, gamesPerSpread)}
            pageNumber={leftPageNumber + 1}
            totalPages={totalPages}
            onOpenGame={onOpenGame}
          />
        </div>

        {isTurning ? (
          <span
            key={turnSequence}
            className="book-page-turn-sheet"
            data-direction={turnDirection}
            aria-hidden="true"
          />
        ) : null}

        <button
          type="button"
          className="book-turn-button absolute right-[2.5%] top-1/2 z-20 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full border border-[#C9A646]/25 bg-[#0F1117]/90 text-[#E9DFA8] shadow-lg transition hover:border-[#C9A646]/60 hover:bg-[#181B23] hover:text-white disabled:pointer-events-none disabled:opacity-20"
          disabled={isTurning || safeSpreadIndex >= spreadCount - 1}
          onClick={() => turnTo(safeSpreadIndex + 1)}
          aria-label="Double page suivante"
          title="Double page suivante"
        >
          <ChevronRight size={20} aria-hidden="true" />
        </button>
      </div>
    </section>
  )
}
