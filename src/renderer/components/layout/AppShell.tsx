import type { PropsWithChildren } from 'react'
import { Sidebar } from './Sidebar'
import { TitleBar } from './TitleBar'
import type { AppView } from '../../types/navigation'

interface AppShellProps extends PropsWithChildren {
  activeView: AppView
  onNavigate: (view: AppView) => void
}

export function AppShell({ activeView, children, onNavigate }: AppShellProps) {
  return (
    <div className="library-atmosphere min-h-screen overflow-x-hidden bg-[#0F1117] text-zinc-100">
      <div className="library-grain pointer-events-none fixed inset-0 z-0" />
      <TitleBar />
      <Sidebar activeView={activeView} onNavigate={onNavigate} />
      <main className="relative z-10 min-h-screen min-w-0 pl-20 pt-11 transition-[padding] duration-200 lg:pl-64">
        <div className="mx-auto flex min-h-[calc(100vh-2.75rem)] w-full max-w-7xl flex-col px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
          {children}
        </div>
      </main>
    </div>
  )
}
