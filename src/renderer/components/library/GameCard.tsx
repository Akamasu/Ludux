import { Clock3, Star } from 'lucide-react'
import { GAME_STATUS_LABELS, type GameListItem } from '../../../types/game'
import { formatHours } from '../../utils/formatters'
import { GameCover } from './GameCover'

interface GameCardProps {
  game: GameListItem
  onOpen?: (gameId: string) => void
}

export function GameCard({ game, onOpen }: GameCardProps) {
  return (
    <article className="book-card group overflow-hidden rounded-lg border border-white/10 bg-[#181B23] transition duration-200 hover:-translate-y-0.5 hover:border-[#C9A646]/35">
      <button
        type="button"
        onClick={() => onOpen?.(game.id)}
        className="relative z-10 block w-full text-left"
      >
      <div className="relative aspect-[4/3] bg-[#121620]">
        <GameCover title={game.title} coverUrl={game.coverUrl} />
        <span className="absolute left-3 top-3 rounded-lg bg-black/55 px-3 py-1 text-xs font-medium text-white backdrop-blur">
          {GAME_STATUS_LABELS[game.status]}
        </span>
      </div>

      <div className="p-4">
        <h3 className="line-clamp-2 min-h-12 text-base font-semibold leading-6 text-white">
          {game.title}
        </h3>
        <p className="mt-2 truncate text-sm text-zinc-500">
          {game.platforms.join(', ') || 'Plateforme non renseignée'}
        </p>

        <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-zinc-400">
          <div className="flex h-9 items-center gap-2 rounded-lg bg-white/5 px-3">
            <Clock3 size={15} aria-hidden="true" />
            {formatHours(game.totalMinutes)}
          </div>
          <div className="flex h-9 items-center gap-2 rounded-lg bg-white/5 px-3">
            <Star size={15} aria-hidden="true" />
            {game.rating ? `${game.rating}/10` : 'Non noté'}
          </div>
        </div>

        {game.lastChronicleTitle ? (
          <p className="mt-4 line-clamp-2 text-sm leading-6 text-zinc-400">
            {game.lastChronicleTitle}
          </p>
        ) : null}
      </div>
      </button>
    </article>
  )
}
