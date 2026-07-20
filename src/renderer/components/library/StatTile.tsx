import type { LucideIcon } from 'lucide-react'

interface StatTileProps {
  label: string
  value: string
  icon: LucideIcon
  tone: 'violet' | 'blue' | 'gold' | 'magenta'
}

const toneClasses: Record<StatTileProps['tone'], string> = {
  violet: 'bg-[#7C5CFF] text-white',
  blue: 'bg-[#4F7CFF] text-white',
  gold: 'bg-[#C9A646] text-[#0F1117]',
  magenta: 'bg-[#A33D69] text-white',
}

export function StatTile({ label, value, icon: Icon, tone }: StatTileProps) {
  return (
    <article className="rounded-lg border border-[#C9A646]/15 bg-[#181B23] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
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
