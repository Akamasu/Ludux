import { Clock3, Star } from 'lucide-react'
import { GAME_STATUS_LABELS, type GameListItem } from '../../../types/game'
import { formatHours } from '../../utils/formatters'

interface GameCardProps {
  game: GameListItem
  onOpen?: (gameId: string) => void
}

export function GameCard({ game, onOpen }: GameCardProps) {
  const initial = game.title.trim().charAt(0).toUpperCase()

  return (
    <article className="overflow-hidden rounded-lg border border-white/10 bg-[#181B23]">
      <button
        type="button"
        onClick={() => onOpen?.(game.id)}
        className="block w-full text-left"
      >
      <div className="relative aspect-[4/3] bg-[#121620]">
        {game.coverUrl ? (
          <img className="h-full w-full object-cover" src={game.coverUrl} alt="" />
        ) : (
          <div className="grid h-full place-items-center bg-[radial-gradient(circle_at_top_left,#4F7CFF33,transparent_42%),linear-gradient(135deg,#181B23,#0F1117)]">
            <span className="text-5xl font-semibold text-zinc-600">{initial}</span>
          </div>
        )}
        <span className="absolute left-3 top-3 rounded-lg bg-black/55 px-3 py-1 text-xs font-medium text-white backdrop-blur">
          {GAME_STATUS_LABELS[game.status]}
        </span>
      </div>

      <div className="p-4">
        <h3 className="line-clamp-2 min-h-12 text-base font-semibold leading-6 text-white">
          {game.title}
        </h3>
        <p className="mt-2 truncate text-sm text-zinc-500">
          {game.platforms.join(', ') || 'Plateforme non renseignee'}
        </p>

        <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-zinc-400">
          <div className="flex h-9 items-center gap-2 rounded-lg bg-white/5 px-3">
            <Clock3 size={15} aria-hidden="true" />
            {formatHours(game.totalMinutes)}
          </div>
          <div className="flex h-9 items-center gap-2 rounded-lg bg-white/5 px-3">
            <Star size={15} aria-hidden="true" />
            {game.rating ? `${game.rating}/10` : 'Non note'}
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
