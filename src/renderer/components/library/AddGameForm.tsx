import { Plus } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import {
  GAME_STATUS_LABELS,
  GAME_STATUS_VALUES,
  type CreateGameInput,
} from '../../../types/game'
import { Button } from '../ui/Button'

interface AddGameFormProps {
  idPrefix: string
  isSaving: boolean
  onCreateGame: (input: CreateGameInput) => Promise<void>
}

export function AddGameForm({ idPrefix, isSaving, onCreateGame }: AddGameFormProps) {
  const [title, setTitle] = useState('')
  const [platformName, setPlatformName] = useState('')
  const [status, setStatus] = useState<CreateGameInput['status']>('BACKLOG')
  const [coverUrl, setCoverUrl] = useState('')
  const [description, setDescription] = useState('')

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (title.trim().length === 0) {
      return
    }

    await onCreateGame({
      title,
      platformName,
      status,
      coverUrl,
      description,
    })

    setTitle('')
    setPlatformName('')
    setStatus('BACKLOG')
    setCoverUrl('')
    setDescription('')
  }

  return (
    <form className="grid gap-3" onSubmit={handleSubmit}>
      <div className="grid gap-3 lg:grid-cols-[1.3fr_0.9fr_0.9fr]">
        <div>
          <label className="mb-2 block text-xs font-medium text-zinc-500" htmlFor={`${idPrefix}-title`}>
            Titre
          </label>
          <input
            id={`${idPrefix}-title`}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Monster Hunter World"
            className="h-11 w-full rounded-lg border border-white/10 bg-[#0f0f12] px-3 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-emerald-400"
          />
        </div>

        <div>
          <label className="mb-2 block text-xs font-medium text-zinc-500" htmlFor={`${idPrefix}-platform`}>
            Plateforme
          </label>
          <input
            id={`${idPrefix}-platform`}
            value={platformName}
            onChange={(event) => setPlatformName(event.target.value)}
            placeholder="PC"
            className="h-11 w-full rounded-lg border border-white/10 bg-[#0f0f12] px-3 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-emerald-400"
          />
        </div>

        <div>
          <label className="mb-2 block text-xs font-medium text-zinc-500" htmlFor={`${idPrefix}-status`}>
            Statut
          </label>
          <select
            id={`${idPrefix}-status`}
            value={status}
            onChange={(event) => setStatus(event.target.value as CreateGameInput['status'])}
            className="h-11 w-full rounded-lg border border-white/10 bg-[#0f0f12] px-3 text-sm text-white outline-none transition focus:border-emerald-400"
          >
            {GAME_STATUS_VALUES.map((value) => (
              <option key={value} value={value}>
                {GAME_STATUS_LABELS[value]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-[1fr_1.3fr_auto] lg:items-end">
        <div>
          <label className="mb-2 block text-xs font-medium text-zinc-500" htmlFor={`${idPrefix}-cover`}>
            Couverture
          </label>
          <input
            id={`${idPrefix}-cover`}
            value={coverUrl}
            onChange={(event) => setCoverUrl(event.target.value)}
            placeholder="https://..."
            className="h-11 w-full rounded-lg border border-white/10 bg-[#0f0f12] px-3 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-emerald-400"
          />
        </div>

        <div>
          <label className="mb-2 block text-xs font-medium text-zinc-500" htmlFor={`${idPrefix}-description`}>
            Note courte
          </label>
          <input
            id={`${idPrefix}-description`}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Pourquoi ce jeu rejoint votre histoire ?"
            className="h-11 w-full rounded-lg border border-white/10 bg-[#0f0f12] px-3 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-emerald-400"
          />
        </div>

        <Button type="submit" disabled={isSaving || title.trim().length === 0}>
          <Plus size={17} aria-hidden="true" />
          Ajouter
        </Button>
      </div>
    </form>
  )
}
