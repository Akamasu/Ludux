import {
  BarChart3,
  BookOpen,
  BookText,
  Gamepad2,
  Home,
  Library,
  Settings,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '../../../utils/cn'
import type { AppView } from '../../types/navigation'

interface NavItem {
  id: AppView
  label: string
  icon: LucideIcon
}

const navItems: NavItem[] = [
  { id: 'home', label: 'Accueil', icon: Home },
  { id: 'library', label: 'Bibliotheque', icon: Library },
  { id: 'chronicles', label: 'Chroniques', icon: BookText },
  { id: 'museum', label: 'Musee', icon: Gamepad2 },
  { id: 'lifeBook', label: 'Livre de Vie', icon: BookOpen },
  { id: 'statistics', label: 'Statistiques', icon: BarChart3 },
  { id: 'settings', label: 'Parametres', icon: Settings },
]

interface SidebarProps {
  activeView: AppView
  onNavigate: (view: AppView) => void
}

export function Sidebar({ activeView, onNavigate }: SidebarProps) {
  return (
    <aside className="fixed bottom-0 left-0 top-11 z-40 flex w-20 flex-col border-r border-[#C9A646]/15 bg-[#10131A]/95 px-2 py-5 shadow-[inset_-1px_0_0_rgba(255,255,255,0.03)] backdrop-blur transition-[width,padding] duration-200 lg:w-64 lg:px-4">
      <div className="mb-8 px-0 lg:px-2">
        <div className="flex items-center justify-center gap-3 lg:justify-start">
          <img
            src="/ludux-logo.png"
            alt=""
            className="h-11 w-11 rounded-lg border border-white/10 object-cover"
          />
          <div className="hidden min-w-0 lg:block">
            <p className="text-lg font-semibold text-white">Ludux</p>
            <p className="text-xs text-[#B9A66B]">Rayonnage local</p>
          </div>
        </div>
      </div>

      <p className="mb-2 hidden px-3 text-[11px] font-semibold uppercase text-zinc-600 lg:block">
        Pages
      </p>
      <nav className="space-y-1" aria-label="Navigation principale">
        {navItems.map((item) => (
          <button
            key={item.label}
            type="button"
            title={item.label}
            onClick={() => onNavigate(item.id)}
            className={cn(
              'group relative flex h-11 w-full items-center justify-center gap-3 rounded-lg border border-transparent px-0 text-left text-sm text-zinc-400 transition-all duration-200 hover:border-[#C9A646]/20 hover:bg-white/5 hover:text-white lg:justify-start lg:px-3',
              activeView === item.id &&
                'border-[#7C5CFF]/35 bg-[#211D32] text-white shadow-[inset_4px_0_0_#C9A646,0_10px_22px_rgba(0,0,0,0.22)]',
            )}
          >
            <item.icon
              className="shrink-0 transition-transform duration-200 group-hover:scale-105"
              size={18}
              aria-hidden="true"
            />
            <span className="hidden truncate lg:inline">{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="mt-auto hidden rounded-lg border border-[#C9A646]/15 bg-[#181B23] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] lg:block">
        <p className="text-sm font-medium text-zinc-100">Archives locales</p>
        <p className="mt-1 text-xs leading-5 text-zinc-500">
          Vos traces restent rangees sur cette machine.
        </p>
      </div>
    </aside>
  )
}
