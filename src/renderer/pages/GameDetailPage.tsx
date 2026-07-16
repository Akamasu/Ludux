import { ArrowLeft, BookText, CalendarDays, Clock3, Save } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import {
  EMOTION_LABELS,
  EMOTION_VALUES,
  GAME_STATUS_LABELS,
  GAME_STATUS_VALUES,
  type CreateChronicleInput,
  type CreatePlaySessionInput,
  type Emotion,
  type GameDetail,
  type GameStatus,
  type UpdateGameInput,
} from '../../types/game'
import { Button } from '../components/ui/Button'
import { formatDate, formatHours } from '../utils/formatters'

interface GameDetailPageProps {
  detail: GameDetail | null
  error: string | null
  isLoading: boolean
  isSaving: boolean
  onBack: () => void
  onCreateChronicle: (input: CreateChronicleInput) => Promise<void>
  onCreatePlaySession: (input: CreatePlaySessionInput) => Promise<void>
  onUpdateGame: (input: UpdateGameInput) => Promise<void>
}

function todayInputValue() {
  return new Date().toISOString().slice(0, 10)
}

export function GameDetailPage({
  detail,
  error,
  isLoading,
  isSaving,
  onBack,
  onCreateChronicle,
  onCreatePlaySession,
  onUpdateGame,
}: GameDetailPageProps) {
  if (isLoading) {
    return (
      <div className="grid flex-1 place-items-center text-sm text-zinc-500">
        Chargement du chapitre...
      </div>
    )
  }

  if (!detail) {
    return (
      <div className="flex flex-1 items-center">
        <section className="rounded-lg border border-dashed border-white/15 bg-[#141417] p-8">
          <h1 className="text-2xl font-semibold text-white">Jeu introuvable</h1>
          <p className="mt-2 text-sm text-zinc-500">Ce chapitre n'existe plus dans la bibliotheque.</p>
          <Button className="mt-5" type="button" onClick={onBack}>
            <ArrowLeft size={17} aria-hidden="true" />
            Retour
          </Button>
        </section>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col gap-6">
      <header className="border-b border-white/10 pb-7">
        <Button type="button" variant="secondary" onClick={onBack}>
          <ArrowLeft size={17} aria-hidden="true" />
          Bibliotheque
        </Button>
        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_280px]">
          <div>
            <p className="text-sm font-medium text-emerald-300">
              {GAME_STATUS_LABELS[detail.status]}
            </p>
            <h1 className="mt-2 text-4xl font-semibold text-white">{detail.title}</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-400">
              {detail.description || 'Aucune note personnelle pour le moment.'}
            </p>
          </div>
          <div className="grid gap-3 rounded-lg border border-white/10 bg-[#16161a] p-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-zinc-500">Temps joue</span>
              <span className="font-medium text-white">{formatHours(detail.totalMinutes)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-zinc-500">Chroniques</span>
              <span className="font-medium text-white">{detail.chronicles.length}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-zinc-500">Sessions</span>
              <span className="font-medium text-white">{detail.sessions.length}</span>
            </div>
          </div>
        </div>
      </header>

      {error ? (
        <div className="rounded-lg border border-rose-400/30 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
          {error}
        </div>
      ) : null}

      <section className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <GameEditPanel detail={detail} isSaving={isSaving} onUpdateGame={onUpdateGame} />
        <SessionForm detail={detail} isSaving={isSaving} onCreatePlaySession={onCreatePlaySession} />
      </section>

      <section className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <ChronicleForm detail={detail} isSaving={isSaving} onCreateChronicle={onCreateChronicle} />
        <Timeline detail={detail} />
      </section>
    </div>
  )
}

interface DetailChildProps {
  detail: GameDetail
  isSaving: boolean
}

function GameEditPanel({
  detail,
  isSaving,
  onUpdateGame,
}: DetailChildProps & {
  onUpdateGame: (input: UpdateGameInput) => Promise<void>
}) {
  const [title, setTitle] = useState(detail.title)
  const [status, setStatus] = useState<GameStatus>(detail.status)
  const [description, setDescription] = useState(detail.description ?? '')

  useEffect(() => {
    setTitle(detail.title)
    setStatus(detail.status)
    setDescription(detail.description ?? '')
  }, [detail])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    await onUpdateGame({
      id: detail.id,
      title,
      status,
      description,
    })
  }

  return (
    <form className="rounded-lg border border-white/10 bg-[#16161a] p-5" onSubmit={handleSubmit}>
      <h2 className="text-lg font-semibold text-white">Informations personnelles</h2>
      <div className="mt-5 grid gap-3">
        <label>
          <span className="mb-2 block text-xs font-medium text-zinc-500">Titre</span>
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            className="h-11 w-full rounded-lg border border-white/10 bg-[#0f0f12] px-3 text-sm text-white outline-none transition focus:border-emerald-400"
          />
        </label>
        <label>
          <span className="mb-2 block text-xs font-medium text-zinc-500">Statut</span>
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value as GameStatus)}
            className="h-11 w-full rounded-lg border border-white/10 bg-[#0f0f12] px-3 text-sm text-white outline-none transition focus:border-emerald-400"
          >
            {GAME_STATUS_VALUES.map((value) => (
              <option key={value} value={value}>
                {GAME_STATUS_LABELS[value]}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="mb-2 block text-xs font-medium text-zinc-500">Note personnelle</span>
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={4}
            className="w-full resize-none rounded-lg border border-white/10 bg-[#0f0f12] px-3 py-3 text-sm leading-6 text-white outline-none transition focus:border-emerald-400"
          />
        </label>
      </div>
      <Button className="mt-4" type="submit" disabled={isSaving || title.trim().length === 0}>
        <Save size={17} aria-hidden="true" />
        Enregistrer
      </Button>
    </form>
  )
}

function SessionForm({
  detail,
  isSaving,
  onCreatePlaySession,
}: DetailChildProps & {
  onCreatePlaySession: (input: CreatePlaySessionInput) => Promise<void>
}) {
  const [date, setDate] = useState(todayInputValue())
  const [hours, setHours] = useState('1')
  const [minutes, setMinutes] = useState('0')
  const [note, setNote] = useState('')
  const [platformName, setPlatformName] = useState(detail.platforms[0] ?? '')

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const durationMinutes = Number(hours) * 60 + Number(minutes)

    await onCreatePlaySession({
      gameId: detail.id,
      start: new Date(date).toISOString(),
      durationMinutes,
      note,
      platformName,
    })

    setHours('1')
    setMinutes('0')
    setNote('')
  }

  return (
    <form className="rounded-lg border border-white/10 bg-[#16161a] p-5" onSubmit={handleSubmit}>
      <h2 className="text-lg font-semibold text-white">Ajouter une session</h2>
      <div className="mt-5 grid gap-3 md:grid-cols-2">
        <label>
          <span className="mb-2 block text-xs font-medium text-zinc-500">Date</span>
          <input
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            className="h-11 w-full rounded-lg border border-white/10 bg-[#0f0f12] px-3 text-sm text-white outline-none transition focus:border-emerald-400"
          />
        </label>
        <label>
          <span className="mb-2 block text-xs font-medium text-zinc-500">Plateforme</span>
          <input
            value={platformName}
            onChange={(event) => setPlatformName(event.target.value)}
            className="h-11 w-full rounded-lg border border-white/10 bg-[#0f0f12] px-3 text-sm text-white outline-none transition focus:border-emerald-400"
          />
        </label>
        <label>
          <span className="mb-2 block text-xs font-medium text-zinc-500">Heures</span>
          <input
            type="number"
            min="0"
            value={hours}
            onChange={(event) => setHours(event.target.value)}
            className="h-11 w-full rounded-lg border border-white/10 bg-[#0f0f12] px-3 text-sm text-white outline-none transition focus:border-emerald-400"
          />
        </label>
        <label>
          <span className="mb-2 block text-xs font-medium text-zinc-500">Minutes</span>
          <input
            type="number"
            min="0"
            max="59"
            value={minutes}
            onChange={(event) => setMinutes(event.target.value)}
            className="h-11 w-full rounded-lg border border-white/10 bg-[#0f0f12] px-3 text-sm text-white outline-none transition focus:border-emerald-400"
          />
        </label>
      </div>
      <label className="mt-3 block">
        <span className="mb-2 block text-xs font-medium text-zinc-500">Commentaire</span>
        <input
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="Premier passage a Anor Londo..."
          className="h-11 w-full rounded-lg border border-white/10 bg-[#0f0f12] px-3 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-emerald-400"
        />
      </label>
      <Button className="mt-4" type="submit" disabled={isSaving || Number(hours) * 60 + Number(minutes) <= 0}>
        <Clock3 size={17} aria-hidden="true" />
        Ajouter
      </Button>
    </form>
  )
}

function ChronicleForm({
  detail,
  isSaving,
  onCreateChronicle,
}: DetailChildProps & {
  onCreateChronicle: (input: CreateChronicleInput) => Promise<void>
}) {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [emotion, setEmotion] = useState<Emotion | ''>('')

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    await onCreateChronicle({
      gameId: detail.id,
      title,
      content,
      emotion: emotion || undefined,
    })

    setTitle('')
    setContent('')
    setEmotion('')
  }

  return (
    <form className="rounded-lg border border-white/10 bg-[#16161a] p-5" onSubmit={handleSubmit}>
      <h2 className="text-lg font-semibold text-white">Ecrire une chronique</h2>
      <div className="mt-5 grid gap-3">
        <label>
          <span className="mb-2 block text-xs font-medium text-zinc-500">Titre</span>
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="La victoire finale"
            className="h-11 w-full rounded-lg border border-white/10 bg-[#0f0f12] px-3 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-emerald-400"
          />
        </label>
        <label>
          <span className="mb-2 block text-xs font-medium text-zinc-500">Emotion</span>
          <select
            value={emotion}
            onChange={(event) => setEmotion(event.target.value as Emotion | '')}
            className="h-11 w-full rounded-lg border border-white/10 bg-[#0f0f12] px-3 text-sm text-white outline-none transition focus:border-emerald-400"
          >
            <option value="">Aucune emotion</option>
            {EMOTION_VALUES.map((value) => (
              <option key={value} value={value}>
                {EMOTION_LABELS[value]}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="mb-2 block text-xs font-medium text-zinc-500">Souvenir</span>
          <textarea
            value={content}
            onChange={(event) => setContent(event.target.value)}
            rows={6}
            placeholder="Ce que ce moment a represente..."
            className="w-full resize-none rounded-lg border border-white/10 bg-[#0f0f12] px-3 py-3 text-sm leading-6 text-white outline-none transition placeholder:text-zinc-600 focus:border-emerald-400"
          />
        </label>
      </div>
      <Button className="mt-4" type="submit" disabled={isSaving || title.trim().length === 0 || content.trim().length === 0}>
        <BookText size={17} aria-hidden="true" />
        Ajouter
      </Button>
    </form>
  )
}

function Timeline({ detail }: { detail: GameDetail }) {
  return (
    <section className="rounded-lg border border-white/10 bg-[#16161a] p-5">
      <h2 className="text-lg font-semibold text-white">Mon histoire</h2>
      <div className="mt-5 space-y-4">
        {detail.chronicles.length === 0 && detail.sessions.length === 0 ? (
          <p className="text-sm leading-6 text-zinc-500">
            Aucune chronique ou session n'a encore ete ajoutee pour ce jeu.
          </p>
        ) : null}

        {detail.chronicles.map((chronicle) => (
          <article key={chronicle.id} className="rounded-lg border border-white/10 bg-[#101013] p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="font-medium text-white">{chronicle.title}</h3>
                <p className="mt-1 text-xs text-zinc-500">{formatDate(chronicle.date)}</p>
              </div>
              {chronicle.emotion ? (
                <span className="rounded-lg bg-emerald-400/10 px-3 py-1 text-xs text-emerald-200">
                  {EMOTION_LABELS[chronicle.emotion]}
                </span>
              ) : null}
            </div>
            <p className="mt-3 text-sm leading-6 text-zinc-400">{chronicle.content}</p>
          </article>
        ))}

        {detail.sessions.map((session) => (
          <article key={session.id} className="rounded-lg border border-white/10 bg-[#101013] p-4">
            <div className="flex items-center gap-3 text-sm text-white">
              <CalendarDays size={17} aria-hidden="true" />
              <span>{formatDate(session.start)}</span>
              <span className="text-zinc-600">/</span>
              <span>{formatHours(session.durationMinutes)}</span>
            </div>
            <p className="mt-2 text-sm text-zinc-500">
              {session.platformName ?? 'Plateforme non renseignee'}
            </p>
            {session.note ? (
              <p className="mt-3 text-sm leading-6 text-zinc-400">{session.note}</p>
            ) : null}
          </article>
        ))}
      </div>
    </section>
  )
}
