import type { PropsWithChildren } from 'react'
import { Sidebar } from './Sidebar'
import type { AppView } from '../../types/navigation'

interface AppShellProps extends PropsWithChildren {
  activeView: AppView
  onNavigate: (view: AppView) => void
}

export function AppShell({ activeView, children, onNavigate }: AppShellProps) {
  return (
    <div className="min-h-screen bg-[#0F1117] text-zinc-100">
      <Sidebar activeView={activeView} onNavigate={onNavigate} />
      <main className="min-h-screen pl-64">
        <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-8 py-7">
          {children}
        </div>
      </main>
    </div>
  )
}
