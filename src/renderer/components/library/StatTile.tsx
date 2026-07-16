import type { LucideIcon } from 'lucide-react'

interface StatTileProps {
  label: string
  value: string
  icon: LucideIcon
  tone: 'emerald' | 'cyan' | 'amber' | 'rose'
}

const toneClasses: Record<StatTileProps['tone'], string> = {
  emerald: 'bg-emerald-400 text-zinc-950',
  cyan: 'bg-cyan-400 text-zinc-950',
  amber: 'bg-amber-300 text-zinc-950',
  rose: 'bg-rose-400 text-zinc-950',
}

export function StatTile({ label, value, icon: Icon, tone }: StatTileProps) {
  return (
    <article className="rounded-lg border border-white/10 bg-[#16161a] p-4">
      <div className="mb-5 flex items-center justify-between gap-4">
        <p className="text-sm text-zinc-500">{label}</p>
        <div className={`grid h-9 w-9 place-items-center rounded-lg ${toneClasses[tone]}`}>
          <Icon size={18} aria-hidden="true" />
        </div>
      </div>
      <p className="text-2xl font-semibold text-white">{value}</p>
    </article>
  )
}
