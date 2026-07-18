import { BookOpen, BookText, Gamepad2, Search, Star } from 'lucide-react'
import { useMemo, useState } from 'react'
import {
  EMOTION_LABELS,
  EMOTION_VALUES,
  GAME_STATUS_LABELS,
  type ChronicleTimelineItem,
  type Emotion,
} from '../../types/game'
import { cn } from '../../utils/cn'
import { Button } from '../components/ui/Button'
import { formatDate } from '../utils/formatters'

type EmotionFilter = 'ALL' | Emotion
type GameFilter = 'ALL' | string

interface ChroniclesPageProps {
  chronicles: ChronicleTimelineItem[]
  isLoading: boolean
  error: string | null
  onOpenGame: (gameId: string) => void
}

function normalizeSearch(value: string) {
  return value.trim().toLocaleLowerCase()
}

function ChronicleCover({ chronicle }: { chronicle: ChronicleTimelineItem }) {
  if (chronicle.gameCoverUrl) {
    return (
      <img
        src={chronicle.gameCoverUrl}
        alt=""
        className="h-16 w-12 rounded-md object-cover"
      />
    )
  }

  return (
    <div className="grid h-16 w-12 place-items-center rounded-md bg-[#7C5CFF]/10 text-[#D8D0FF]">
      <BookText size={20} aria-hidden="true" />
    </div>
  )
}

export function ChroniclesPage({
  chronicles,
  error,
  isLoading,
  onOpenGame,
}: ChroniclesPageProps) {
  const [query, setQuery] = useState('')
  const [emotionFilter, setEmotionFilter] = useState<EmotionFilter>('ALL')
  const [gameFilter, setGameFilter] = useState<GameFilter>('ALL')
  const [showFavorites, setShowFavorites] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const games = useMemo(() => {
    const gameMap = new Map<string, string>()

    for (const chronicle of chronicles) {
      gameMap.set(chronicle.gameId, chronicle.gameTitle)
    }

    return [...gameMap.entries()]
      .map(([id, title]) => ({ id, title }))
      .sort((left, right) => left.title.localeCompare(right.title))
  }, [chronicles])

  const filteredChronicles = useMemo(() => {
    const normalizedQuery = normalizeSearch(query)

    return chronicles.filter((chronicle) => {
      const matchesQuery =
        normalizedQuery.length === 0 ||
        chronicle.title.toLocaleLowerCase().includes(normalizedQuery) ||
        chronicle.content.toLocaleLowerCase().includes(normalizedQuery) ||
        chronicle.gameTitle.toLocaleLowerCase().includes(normalizedQuery)

      const matchesEmotion =
        emotionFilter === 'ALL' || chronicle.emotion === emotionFilter
      const matchesGame = gameFilter === 'ALL' || chronicle.gameId === gameFilter
      const matchesFavorite = !showFavorites || chronicle.favorite

      return matchesQuery && matchesEmotion && matchesGame && matchesFavorite
    })
  }, [chronicles, emotionFilter, gameFilter, query, showFavorites])

  const selectedChronicle =
    filteredChronicles.find((chronicle) => chronicle.id === selectedId) ??
    filteredChronicles[0] ??
    null

  return (
    <div className="flex flex-1 flex-col gap-7">
      <header className="flex items-start justify-between gap-6 border-b border-white/10 pb-7">
        <div>
          <p className="text-sm font-medium text-[#A797FF]">Chroniques</p>
          <h1 className="mt-2 text-4xl font-semibold text-white">Journal des souvenirs</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400">
            Retrouvez les moments marquants notes au fil de vos jeux.
          </p>
        </div>
        <div className="rounded-lg border border-white/10 bg-[#181B23] px-4 py-3 text-right">
          <p className="text-xs text-zinc-500">Entrees</p>
          <p className="mt-1 text-sm font-medium text-zinc-100">
            {isLoading ? 'Chargement' : chronicles.length}
          </p>
        </div>
      </header>

      {error ? (
        <div className="rounded-lg border border-rose-400/30 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
          {error}
        </div>
      ) : null}

      <section className="grid min-h-[620px] gap-4 xl:grid-cols-[380px_1fr]">
        <aside className="flex min-h-0 flex-col rounded-lg border border-white/10 bg-[#181B23] p-4">
          <div className="grid gap-3">
            <label className="relative block">
              <span className="sr-only">Rechercher une chronique</span>
              <Search
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600"
                size={17}
                aria-hidden="true"
              />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Rechercher un souvenir..."
                className="h-11 w-full rounded-lg border border-white/10 bg-[#0F1117] pl-10 pr-3 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-[#7C5CFF]"
              />
            </label>

            <div className="grid gap-3">
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

              <div className="grid grid-cols-[1fr_44px] gap-3">
                <label>
                  <span className="sr-only">Filtrer par emotion</span>
                  <select
                    value={emotionFilter}
                    onChange={(event) => setEmotionFilter(event.target.value as EmotionFilter)}
                    className="h-11 w-full rounded-lg border border-white/10 bg-[#0F1117] px-3 text-sm text-white outline-none transition focus:border-[#7C5CFF]"
                  >
                    <option value="ALL">Toutes les emotions</option>
                    {EMOTION_VALUES.map((emotion) => (
                      <option key={emotion} value={emotion}>
                        {EMOTION_LABELS[emotion]}
                      </option>
                    ))}
                  </select>
                </label>

                <button
                  type="button"
                  aria-label="Favoris"
                  aria-pressed={showFavorites}
                  title="Favoris"
                  onClick={() => setShowFavorites((current) => !current)}
                  className={cn(
                    'grid h-11 w-11 place-items-center rounded-lg border border-white/10 bg-[#0F1117] text-zinc-500 transition hover:text-white',
                    showFavorites && 'border-amber-300/50 bg-amber-300/10 text-amber-200',
                  )}
                >
                  <Star size={17} aria-hidden="true" />
                </button>
              </div>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between text-xs text-zinc-500">
            <span>{filteredChronicles.length} chroniques</span>
          </div>

          <div className="mt-4 min-h-0 flex-1 overflow-y-auto pr-1">
            {filteredChronicles.length === 0 ? (
              <div className="rounded-lg border border-dashed border-white/15 bg-[#121620] p-5">
                <h2 className="text-sm font-medium text-white">Aucune chronique</h2>
                <p className="mt-2 text-sm leading-6 text-zinc-500">
                  Ajoutez un souvenir depuis la fiche d'un jeu pour le retrouver ici.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredChronicles.map((chronicle) => (
                  <button
                    key={chronicle.id}
                    type="button"
                    onClick={() => setSelectedId(chronicle.id)}
                    className={cn(
                      'flex w-full items-start gap-3 rounded-lg border border-white/10 bg-[#121620] p-3 text-left transition hover:border-[#7C5CFF]/40',
                      selectedChronicle?.id === chronicle.id &&
                        'border-[#A797FF]/50 bg-[#7C5CFF]/10',
                    )}
                  >
                    <ChronicleCover chronicle={chronicle} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-white">
                        {chronicle.title}
                      </span>
                      <span className="mt-1 block truncate text-xs text-zinc-500">
                        {chronicle.gameTitle}
                      </span>
                      <span className="mt-2 flex items-center gap-2 text-xs text-zinc-500">
                        <span>{formatDate(chronicle.date)}</span>
                        {chronicle.emotion ? (
                          <span className="rounded-md bg-white/7 px-2 py-0.5 text-zinc-300">
                            {EMOTION_LABELS[chronicle.emotion]}
                          </span>
                        ) : null}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </aside>

        <article className="rounded-lg border border-white/10 bg-[#181B23] p-6">
          {selectedChronicle ? (
            <div className="flex h-full flex-col">
              <div className="flex items-start justify-between gap-5 border-b border-white/10 pb-6">
                <div className="min-w-0">
                  <div className="mb-4 flex items-center gap-3">
                    <ChronicleCover chronicle={selectedChronicle} />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-[#A797FF]">
                        {selectedChronicle.gameTitle}
                      </p>
                      <p className="mt-1 text-xs text-zinc-500">
                        {GAME_STATUS_LABELS[selectedChronicle.gameStatus]}
                      </p>
                    </div>
                  </div>
                  <h2 className="text-3xl font-semibold text-white">
                    {selectedChronicle.title}
                  </h2>
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-zinc-500">
                    <span>{formatDate(selectedChronicle.date)}</span>
                    {selectedChronicle.emotion ? (
                      <span className="rounded-lg bg-[#7C5CFF]/10 px-3 py-1 text-xs text-[#D8D0FF]">
                        {EMOTION_LABELS[selectedChronicle.emotion]}
                      </span>
                    ) : null}
                    {selectedChronicle.favorite ? (
                      <span className="rounded-lg bg-amber-300/10 px-3 py-1 text-xs text-amber-100">
                        Favori
                      </span>
                    ) : null}
                  </div>
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => onOpenGame(selectedChronicle.gameId)}
                >
                  <Gamepad2 size={17} aria-hidden="true" />
                  Jeu
                </Button>
              </div>

              <div className="mt-6 max-w-none">
                <p className="whitespace-pre-wrap text-base leading-8 text-zinc-300">
                  {selectedChronicle.content}
                </p>
              </div>
            </div>
          ) : (
            <div className="grid h-full min-h-[420px] place-items-center rounded-lg border border-dashed border-white/15 bg-[#121620] p-8 text-center">
              <div>
                <div className="mx-auto grid h-12 w-12 place-items-center rounded-lg bg-[#7C5CFF]/10 text-[#D8D0FF]">
                  <BookOpen size={22} aria-hidden="true" />
                </div>
                <h2 className="mt-4 text-lg font-semibold text-white">
                  Aucun souvenir selectionne
                </h2>
                <p className="mt-2 max-w-md text-sm leading-6 text-zinc-500">
                  Les chroniques ecrites depuis les fiches de jeux formeront ce journal.
                </p>
              </div>
            </div>
          )}
        </article>
      </section>
    </div>
  )
}
