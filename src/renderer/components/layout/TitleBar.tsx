import { Minus, Square, X } from 'lucide-react'

function readWindowControls() {
  return window.ludux?.windowControls ?? null
}

export function TitleBar() {
  const windowControls = readWindowControls()

  return (
    <header className="drag-region fixed inset-x-0 top-0 z-50 flex h-11 items-center border-b border-[#C9A646]/15 bg-[#0C0E13]/95 text-zinc-400 shadow-[0_1px_20px_rgba(0,0,0,0.24)] backdrop-blur">
      <div className="flex min-w-0 flex-1 items-center gap-2 px-3">
        <img
          src="./ludux-logo.png"
          alt=""
          className="h-6 w-6 rounded-md border border-white/10 object-cover"
        />
        <div className="min-w-0">
          <p className="truncate text-xs font-medium text-zinc-100">
            Ludux
          </p>
          <p className="hidden truncate text-[11px] text-[#B9A66B] sm:block">
            Cabinet de jeux local
          </p>
        </div>
      </div>

      {windowControls ? (
        <div className="no-drag ml-auto flex h-full">
          <button
            type="button"
            title="Reduire"
            aria-label="Réduire la fenêtre"
            onClick={() => void windowControls.minimize()}
            className="grid h-11 w-11 place-items-center text-zinc-400 transition hover:bg-white/10 hover:text-white"
          >
            <Minus size={16} aria-hidden="true" />
          </button>
          <button
            type="button"
            title="Agrandir"
            aria-label="Agrandir ou restaurer la fenêtre"
            onClick={() => void windowControls.toggleMaximize()}
            className="grid h-11 w-11 place-items-center text-zinc-400 transition hover:bg-white/10 hover:text-white"
          >
            <Square size={14} aria-hidden="true" />
          </button>
          <button
            type="button"
            title="Fermer"
            aria-label="Fermer la fenêtre"
            onClick={() => void windowControls.close()}
            className="grid h-11 w-11 place-items-center text-zinc-400 transition hover:bg-rose-500 hover:text-white"
          >
            <X size={17} aria-hidden="true" />
          </button>
        </div>
      ) : null}
    </header>
  )
}
