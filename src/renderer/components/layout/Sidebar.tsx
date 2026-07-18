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
    <aside className="fixed inset-y-0 left-0 flex w-64 flex-col border-r border-white/10 bg-[#11141B] px-4 py-5">
      <div className="mb-8 px-2">
        <div className="flex items-center gap-3">
          <img
            src="/ludux-logo.png"
            alt=""
            className="h-11 w-11 rounded-lg border border-white/10 object-cover"
          />
          <div>
            <p className="text-lg font-semibold text-white">Ludux</p>
            <p className="text-xs text-zinc-500">Memoire locale</p>
          </div>
        </div>
      </div>

      <nav className="space-y-1" aria-label="Navigation principale">
        {navItems.map((item) => (
          <button
            key={item.label}
            type="button"
            onClick={() => onNavigate(item.id)}
            className={cn(
              'flex h-11 w-full items-center gap-3 rounded-lg px-3 text-left text-sm text-zinc-400 transition hover:bg-white/5 hover:text-white',
              activeView === item.id &&
                'bg-[#7C5CFF]/15 text-white shadow-[inset_3px_0_0_#7C5CFF]',
            )}
          >
            <item.icon size={18} aria-hidden="true" />
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="mt-auto rounded-lg border border-white/10 bg-[#181B23] p-4">
        <p className="text-sm font-medium text-zinc-100">Local-first</p>
        <p className="mt-1 text-xs leading-5 text-zinc-500">
          Les souvenirs restent sur cette machine.
        </p>
      </div>
    </aside>
  )
}
