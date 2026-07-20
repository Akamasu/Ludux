import { useState } from 'react'
import { cn } from '../../../utils/cn'

interface GameCoverProps {
  title: string
  coverUrl: string | null
  className?: string
  initialClassName?: string
}

export function GameCover({
  className,
  coverUrl,
  initialClassName,
  title,
}: GameCoverProps) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null)
  const canRenderImage = Boolean(coverUrl && coverUrl !== failedUrl)
  const initial = title.trim().charAt(0).toUpperCase() || '?'

  if (canRenderImage) {
    return (
      <img
        src={coverUrl ?? undefined}
        alt=""
        loading="lazy"
        onError={() => setFailedUrl(coverUrl)}
        className={cn('h-full w-full object-cover', className)}
      />
    )
  }

  return (
    <div
      className={cn(
        'grid h-full w-full place-items-center bg-[radial-gradient(circle_at_top_left,#4F7CFF33,transparent_42%),linear-gradient(135deg,#181B23,#0F1117)]',
        className,
      )}
    >
      <span className={cn('text-5xl font-semibold text-zinc-600', initialClassName)}>
        {initial}
      </span>
    </div>
  )
}
