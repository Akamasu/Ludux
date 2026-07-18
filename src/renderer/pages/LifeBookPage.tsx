import {
  BookText,
  CalendarDays,
  Clock3,
  Gamepad2,
  LibraryBig,
  Search,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import {
  EMOTION_LABELS,
  GAME_STATUS_LABELS,
  type LifeBookEvent,
  type LifeBookEventKind,
} from '../../types/game'
import { Button } from '../components/ui/Button'
import { cn } from '../../utils/cn'
import { formatDate, formatHours } from '../utils/formatters'

type EventTypeFilter = 'ALL' | LifeBookEventKind
type GameFilter = 'ALL' | string

interface LifeBookPageProps {
  events: LifeBookEvent[]
  isLoading: boolean
  error: string | null
  onOpenGame: (gameId: string) => void
}

interface EventGroup {
  year: string
  months: {
    key: string
    label: string
    events: LifeBookEvent[]
  }[]
}

function normalizeSearch(value: string) {
  return value.trim().toLocaleLowerCase()
}

function formatMonth(value: string) {
  return new Intl.DateTimeFormat('fr-FR', {
    month: 'long',
  }).format(new Date(value))
}

function buildGroups(events: LifeBookEvent[]): EventGroup[] {
  const yearGroups = new Map<string, Map<string, LifeBookEvent[]>>()

  for (const event of events) {
    const date = new Date(event.date)
    const year = String(date.getFullYear())
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const monthKey = `${year}-${month}`
    const monthGroups = yearGroups.get(year) ?? new Map<string, LifeBookEvent[]>()
    const monthEvents = monthGroups.get(monthKey) ?? []

    monthEvents.push(event)
    monthGroups.set(monthKey, monthEvents)
    yearGroups.set(year, monthGroups)
  }

  return [...yearGroups.entries()]
    .sort((left, right) => Number(right[0]) - Number(left[0]))
    .map(([year, monthGroups]) => ({
      year,
      months: [...monthGroups.entries()]
        .sort((left, right) => right[0].localeCompare(left[0]))
        .map(([key, monthEvents]) => ({
          key,
          label: formatMonth(monthEvents[0].date),
          events: monthEvents,
        })),
    }))
}

function LifeBookCover({ event }: { event: LifeBookEvent }) {
  if (event.gameCoverUrl) {
    return (
      <img
        src={event.gameCoverUrl}
        alt=""
        className="h-20 w-14 rounded-md object-cover"
      />
    )
  }

  return (
    <div className="grid h-20 w-14 place-items-center rounded-md bg-[#7C5CFF]/10 text-[#D8D0FF]">
      <Gamepad2 size={22} aria-hidden="true" />
    </div>
  )
}

function EventKindIcon({ kind }: { kind: LifeBookEventKind }) {
  if (kind === 'CHRONICLE') {
    return <BookText size={17} aria-hidden="true" />
  }

  return <Clock3 size={17} aria-hidden="true" />
}

function EventCard({
  event,
  onOpenGame,
}: {
  event: LifeBookEvent
  onOpenGame: (gameId: string) => void
}) {
  return (
    <article className="relative rounded-lg border border-white/10 bg-[#181B23] p-4 transition hover:border-[#7C5CFF]/40">
      <div className="flex items-start gap-4">
        <LifeBookCover event={event} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500">
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-white/7 px-2.5 py-1 text-zinc-300">
              <EventKindIcon kind={event.kind} />
              {event.kind === 'CHRONICLE' ? 'Chronique' : 'Session'}
            </span>
            <span>{formatDate(event.date)}</span>
          </div>

          <h3 className="mt-3 text-xl font-semibold text-white">{event.title}</h3>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-zinc-500">
            <span className="font-medium text-[#A797FF]">{event.gameTitle}</span>
            <span>{GAME_STATUS_LABELS[event.gameStatus]}</span>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {event.emotion ? (
              <span className="rounded-lg bg-[#7C5CFF]/10 px-3 py-1 text-xs text-[#D8D0FF]">
                {EMOTION_LABELS[event.emotion]}
              </span>
            ) : null}
            {event.durationMinutes ? (
              <span className="rounded-lg bg-[#4F7CFF]/10 px-3 py-1 text-xs text-[#C9D6FF]">
                {formatHours(event.durationMinutes)}
              </span>
            ) : null}
            {event.platformName ? (
              <span className="rounded-lg bg-white/7 px-3 py-1 text-xs text-zinc-300">
                {event.platformName}
              </span>
            ) : null}
          </div>

          {event.description ? (
            <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-zinc-400">
              {event.description}
            </p>
          ) : null}
        </div>

        <Button type="button" variant="secondary" onClick={() => onOpenGame(event.gameId)}>
          <Gamepad2 size={17} aria-hidden="true" />
          Jeu
        </Button>
      </div>
    </article>
  )
}

export function LifeBookPage({
  error,
  events,
  isLoading,
  onOpenGame,
}: LifeBookPageProps) {
  const [query, setQuery] = useState('')
  const [eventType, setEventType] = useState<EventTypeFilter>('ALL')
  const [gameFilter, setGameFilter] = useState<GameFilter>('ALL')

  const games = useMemo(() => {
    const gameMap = new Map<string, string>()

    for (const event of events) {
      gameMap.set(event.gameId, event.gameTitle)
    }

    return [...gameMap.entries()]
      .map(([id, title]) => ({ id, title }))
      .sort((left, right) => left.title.localeCompare(right.title))
  }, [events])

  const stats = useMemo(() => {
    const chronicleCount = events.filter((event) => event.kind === 'CHRONICLE').length
    const sessionCount = events.filter((event) => event.kind === 'SESSION').length
    const totalMinutes = events.reduce(
      (total, event) => total + (event.durationMinutes ?? 0),
      0,
    )

    return {
      chronicleCount,
      sessionCount,
      totalMinutes,
    }
  }, [events])

  const filteredEvents = useMemo(() => {
    const normalizedQuery = normalizeSearch(query)

    return events.filter((event) => {
      const matchesQuery =
        normalizedQuery.length === 0 ||
        event.title.toLocaleLowerCase().includes(normalizedQuery) ||
        event.gameTitle.toLocaleLowerCase().includes(normalizedQuery) ||
        (event.description ?? '').toLocaleLowerCase().includes(normalizedQuery) ||
        (event.platformName ?? '').toLocaleLowerCase().includes(normalizedQuery)
      const matchesType = eventType === 'ALL' || event.kind === eventType
      const matchesGame = gameFilter === 'ALL' || event.gameId === gameFilter

      return matchesQuery && matchesType && matchesGame
    })
  }, [eventType, events, gameFilter, query])

  const groups = useMemo(() => buildGroups(filteredEvents), [filteredEvents])

  return (
    <div className="flex flex-1 flex-col gap-7">
      <header className="flex items-start justify-between gap-6 border-b border-white/10 pb-7">
        <div>
          <p className="text-sm font-medium text-[#A797FF]">Livre de Vie</p>
          <h1 className="mt-2 text-4xl font-semibold text-white">
            Chronologie du parcours
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400">
            Une ligne du temps qui rassemble sessions de jeu et chroniques personnelles.
          </p>
        </div>
        <div className="rounded-lg border border-white/10 bg-[#181B23] px-4 py-3 text-right">
          <p className="text-xs text-zinc-500">Moments</p>
          <p className="mt-1 text-sm font-medium text-zinc-100">
            {isLoading ? 'Chargement' : events.length}
          </p>
        </div>
      </header>

      {error ? (
        <div className="rounded-lg border border-rose-400/30 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
          {error}
        </div>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-lg border border-white/10 bg-[#181B23] p-4">
          <div className="mb-5 flex items-center justify-between gap-4">
            <p className="text-sm text-zinc-500">Moments</p>
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-[#7C5CFF] text-white">
              <CalendarDays size={18} aria-hidden="true" />
            </div>
          </div>
          <p className="text-2xl font-semibold text-white">{events.length}</p>
        </article>
        <article className="rounded-lg border border-white/10 bg-[#181B23] p-4">
          <div className="mb-5 flex items-center justify-between gap-4">
            <p className="text-sm text-zinc-500">Chroniques</p>
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-[#4F7CFF] text-white">
              <BookText size={18} aria-hidden="true" />
            </div>
          </div>
          <p className="text-2xl font-semibold text-white">{stats.chronicleCount}</p>
        </article>
        <article className="rounded-lg border border-white/10 bg-[#181B23] p-4">
          <div className="mb-5 flex items-center justify-between gap-4">
            <p className="text-sm text-zinc-500">Sessions</p>
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-[#A33D69] text-white">
              <Clock3 size={18} aria-hidden="true" />
            </div>
          </div>
          <p className="text-2xl font-semibold text-white">{stats.sessionCount}</p>
        </article>
        <article className="rounded-lg border border-white/10 bg-[#181B23] p-4">
          <div className="mb-5 flex items-center justify-between gap-4">
            <p className="text-sm text-zinc-500">Temps joue</p>
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-[#C9A646] text-[#0F1117]">
              <Clock3 size={18} aria-hidden="true" />
            </div>
          </div>
          <p className="text-2xl font-semibold text-white">
            {formatHours(stats.totalMinutes)}
          </p>
        </article>
      </section>

      <section className="grid gap-4 rounded-lg border border-white/10 bg-[#181B23] p-4 xl:grid-cols-[1fr_auto_260px]">
        <label className="relative block">
          <span className="sr-only">Rechercher dans le Livre de Vie</span>
          <Search
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600"
            size={17}
            aria-hidden="true"
          />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Rechercher un moment..."
            className="h-11 w-full rounded-lg border border-white/10 bg-[#0F1117] pl-10 pr-3 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-[#7C5CFF]"
          />
        </label>

        <div className="grid grid-cols-3 gap-2 rounded-lg border border-white/10 bg-[#0F1117] p-1">
          {[
            { value: 'ALL', label: 'Tout', icon: LibraryBig },
            { value: 'CHRONICLE', label: 'Chroniques', icon: BookText },
            { value: 'SESSION', label: 'Sessions', icon: Clock3 },
          ].map((item) => {
            const Icon = item.icon
            const active = eventType === item.value

            return (
              <button
                key={item.value}
                type="button"
                onClick={() => setEventType(item.value as EventTypeFilter)}
                className={cn(
                  'inline-flex h-9 items-center justify-center gap-2 rounded-md px-3 text-xs font-medium text-zinc-500 transition hover:text-white',
                  active && 'bg-[#7C5CFF] text-white',
                )}
              >
                <Icon size={15} aria-hidden="true" />
                {item.label}
              </button>
            )
          })}
        </div>

        <label>
          <span className="sr-only">Filtrer par jeu</span>
          <select
            value={gameFilter}
            onChange={(event) => setGameFilter(event.target.value)}
            className="h-11 w-full rounded-lg border border-white/10 bg-[#0F1117] px-3 text-sm text-white outline-none transition focus:border-[#7C5CFF]"
          >
            <option value="ALL">Tous les jeux</option>
            {games.map((game) => (
              <option key={game.id} value={game.id}>
                {game.title}
              </option>
            ))}
          </select>
        </label>
      </section>

      <section className="flex flex-1 flex-col gap-6">
        <div className="flex items-center justify-between gap-4 text-sm text-zinc-500">
          <span>{filteredEvents.length} moments affiches</span>
        </div>

        {filteredEvents.length === 0 ? (
          <div className="grid min-h-[360px] place-items-center rounded-lg border border-dashed border-white/15 bg-[#181B23] p-8 text-center">
            <div>
              <div className="mx-auto grid h-12 w-12 place-items-center rounded-lg bg-[#7C5CFF]/10 text-[#D8D0FF]">
                <CalendarDays size={22} aria-hidden="true" />
              </div>
              <h2 className="mt-4 text-lg font-semibold text-white">
                Aucun moment trouve
              </h2>
              <p className="mt-2 max-w-md text-sm leading-6 text-zinc-500">
                Les sessions et chroniques creees depuis les fiches de jeux formeront
                cette chronologie.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            {groups.map((group) => (
              <section key={group.year} className="grid gap-4 xl:grid-cols-[130px_1fr]">
                <div>
                  <p className="sticky top-7 text-3xl font-semibold text-white">
                    {group.year}
                  </p>
                </div>
                <div className="space-y-6">
                  {group.months.map((month) => (
                    <div key={month.key} className="relative pl-7">
                      <div className="absolute left-2 top-8 h-[calc(100%-2rem)] w-px bg-white/10" />
                      <div className="mb-3 flex items-center gap-3">
                        <span className="grid h-4 w-4 place-items-center rounded-full bg-[#7C5CFF] shadow-[0_0_0_6px_rgba(124,92,255,0.12)]" />
                        <h2 className="text-sm font-medium uppercase tracking-[0.18em] text-zinc-500">
                          {month.label}
                        </h2>
                      </div>
                      <div className="space-y-3">
                        {month.events.map((event) => (
                          <EventCard
                            key={event.id}
                            event={event}
                            onOpenGame={onOpenGame}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
