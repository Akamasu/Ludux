import { cn } from '../../../utils/cn'

interface GameGenreChipsProps {
  className?: string
  compact?: boolean
  genres: string[]
  maxVisible?: number
}

export function GameGenreChips({
  className,
  compact = false,
  genres,
  maxVisible = 4,
}: GameGenreChipsProps) {
  if (genres.length === 0) {
    return null
  }

  const visibleGenres = genres.slice(0, maxVisible)
  const hiddenCount = Math.max(genres.length - visibleGenres.length, 0)

  return (
    <div className={cn('flex flex-wrap gap-1.5', className)}>
      {visibleGenres.map((genre) => (
        <span
          className={cn(
            'inline-flex max-w-full items-center truncate rounded-full border border-[#C9A646]/25 bg-[#C9A646]/10 font-medium text-[#E9DFA8]',
            compact ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs',
          )}
          key={genre}
          title={genre}
        >
          {genre}
        </span>
      ))}
      {hiddenCount > 0 ? (
        <span
          className={cn(
            'inline-flex items-center rounded-full border border-white/10 bg-white/5 font-medium text-zinc-400',
            compact ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs',
          )}
        >
          +{hiddenCount}
        </span>
      ) : null}
    </div>
  )
}
