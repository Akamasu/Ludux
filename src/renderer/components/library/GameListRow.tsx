import { Clock3, Star } from 'lucide-react'
import { GAME_STATUS_LABELS, type GameListItem } from '../../../types/game'
import { formatHours } from '../../utils/formatters'

interface GameListRowProps {
  game: GameListItem
  onOpen?: (gameId: string) => void
}

export function GameListRow({ game, onOpen }: GameListRowProps) {
  return (
    <article>
      <button
        type="button"
        onClick={() => onOpen?.(game.id)}
        className="book-row grid w-full gap-4 rounded-lg border border-white/10 bg-[#181B23] p-4 text-left transition duration-200 hover:border-[#C9A646]/35 md:grid-cols-[1.4fr_0.8fr_0.6fr_0.6fr] md:items-center"
      >
      <div>
        <h3 className="font-medium text-white">{game.title}</h3>
        <p className="mt-1 text-sm text-zinc-500">
          {game.platforms.join(', ') || 'Plateforme non renseignée'}
        </p>
      </div>
      <span className="w-fit rounded-lg bg-white/5 px-3 py-1 text-xs text-zinc-300">
        {GAME_STATUS_LABELS[game.status]}
      </span>
      <div className="flex items-center gap-2 text-sm text-zinc-400">
        <Clock3 size={16} aria-hidden="true" />
        {formatHours(game.totalMinutes)}
      </div>
      <div className="flex items-center gap-2 text-sm text-zinc-400">
        <Star size={16} aria-hidden="true" />
        {game.rating ? `${game.rating}/10` : 'Non noté'}
      </div>
      </button>
    </article>
  )
}
