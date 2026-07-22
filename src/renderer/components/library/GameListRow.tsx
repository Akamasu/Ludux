import { Clock3, Star } from 'lucide-react'
import type { CSSProperties } from 'react'
import { GAME_STATUS_LABELS, type GameListItem } from '../../../types/game'
import { formatHours } from '../../utils/formatters'
import { GameGenreChips } from './GameGenreChips'

interface GameListRowProps {
  game: GameListItem
  onOpen?: (gameId: string) => void
}

function coverBackgroundStyle(coverUrl: string): CSSProperties {
  return {
    backgroundImage: `url(${JSON.stringify(coverUrl)})`,
  }
}

export function GameListRow({ game, onOpen }: GameListRowProps) {
  return (
    <article>
      <button
        type="button"
        onClick={() => onOpen?.(game.id)}
        className="book-row group relative grid w-full overflow-hidden rounded-lg border border-white/10 bg-[#181B23] p-4 text-left transition duration-200 hover:border-[#C9A646]/35 md:grid-cols-[1.4fr_0.8fr_0.6fr_0.6fr] md:items-center"
      >
        {game.coverUrl ? (
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-cover bg-center opacity-20 saturate-125 transition duration-200 group-hover:opacity-28"
            style={coverBackgroundStyle(game.coverUrl)}
          />
        ) : null}
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[linear-gradient(90deg,rgba(15,17,23,0.96),rgba(15,17,23,0.82)_48%,rgba(15,17,23,0.95)),linear-gradient(180deg,rgba(255,255,255,0.04),transparent)]"
        />

        <div className="relative z-10 min-w-0">
          <h3 className="truncate font-medium text-white">{game.title}</h3>
          <p className="mt-1 truncate text-sm text-zinc-500">
            {game.platforms.join(', ') || 'Plateforme non renseignée'}
          </p>
          <GameGenreChips className="mt-2" compact genres={game.genres} maxVisible={3} />
        </div>
        <span className="relative z-10 w-fit rounded-lg bg-white/7 px-3 py-1 text-xs text-zinc-200">
          {GAME_STATUS_LABELS[game.status]}
        </span>
        <div className="relative z-10 flex items-center gap-2 text-sm text-zinc-300">
          <Clock3 size={16} aria-hidden="true" />
          {formatHours(game.totalMinutes)}
        </div>
        <div className="relative z-10 flex items-center gap-2 text-sm text-zinc-300">
          <Star size={16} aria-hidden="true" />
          {game.rating ? `${game.rating}/10` : 'Non noté'}
        </div>
      </button>
    </article>
  )
}
