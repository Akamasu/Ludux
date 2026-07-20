import { Sparkles } from 'lucide-react'
import type { CreateGameInput } from '../../../types/game'
import { AddGameForm } from './AddGameForm'

interface EmptyLibraryProps {
  onCreateGame: (input: CreateGameInput) => Promise<void>
  isSaving: boolean
}

export function EmptyLibrary({ onCreateGame, isSaving }: EmptyLibraryProps) {
  return (
    <section className="rounded-lg border border-dashed border-white/15 bg-[#181B23] p-6">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row">
        <div>
          <div className="mb-4 grid h-11 w-11 place-items-center rounded-lg bg-[#4F7CFF] text-white">
            <Sparkles size={21} aria-hidden="true" />
          </div>
          <h2 className="text-xl font-semibold text-white">Votre bibliothèque est vide.</h2>
          <p className="mt-2 max-w-xl text-sm leading-6 text-zinc-400">
            Ajoutez votre premier jeu et Ludux commencera à construire votre parcours.
          </p>
        </div>
      </div>

      <div className="mt-6">
        <AddGameForm idPrefix="empty-game" isSaving={isSaving} onCreateGame={onCreateGame} />
      </div>
    </section>
  )
}
