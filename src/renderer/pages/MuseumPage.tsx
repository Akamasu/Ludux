import { Clock3, Gamepad2, Search, Star, Trophy } from 'lucide-react'
import { useMemo, useState } from 'react'
import {
  GAME_STATUS_LABELS,
  type GameListItem,
  type GameStatus,
} from '../../types/game'
import { Button } from '../components/ui/Button'
import { GameCover } from '../components/library/GameCover'
import { formatHours } from '../utils/formatters'

type MuseumFilter = 'ALL' | Extract<GameStatus, 'COMPLETED' | 'COMPLETED_100'>
type MuseumSort = 'recent' | 'time' | 'title'

interface MuseumPageProps {
  games: GameListItem[]
  onOpenGame: (gameId: string) => void
  onOpenLibrary: () => void
}

function isMuseumGame(game: GameListItem) {
  return game.status === 'COMPLETED' || game.status === 'COMPLETED_100'
}

function normalizeSearch(value: string) {
  return value.trim().toLocaleLowerCase()
}

function sortMuseumGames(games: GameListItem[], sortBy: MuseumSort) {
  return [...games].sort((left, right) => {
    if (sortBy === 'title') {
      return left.title.localeCompare(right.title)
    }

    if (sortBy === 'time') {
      return right.totalMinutes - left.totalMinutes
    }

    return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime()
  })
}

function MuseumCard({
  game,
  onOpenGame,
}: {
  game: GameListItem
  onOpenGame: (gameId: string) => void
}) {
  return (
    <article className="book-card group overflow-hidden rounded-lg border border-white/10 bg-[#181B23] transition duration-200 hover:-translate-y-0.5 hover:border-[#C9A646]/35">
      <button type="button" onClick={() => onOpenGame(game.id)} className="relative z-10 block w-full text-left">
        <div className="relative aspect-[4/3] bg-[#121620]">
          <GameCover title={game.title} coverUrl={game.coverUrl} />
          <span className="absolute left-3 top-3 rounded-lg bg-black/55 px-3 py-1 text-xs font-medium text-white backdrop-blur">
            {GAME_STATUS_LABELS[game.status]}
          </span>
        </div>

        <div className="p-4">
          <h2 className="line-clamp-2 min-h-12 text-base font-semibold leading-6 text-white">
            {game.title}
          </h2>
          <p className="mt-2 truncate text-sm text-zinc-500">
            {game.platforms.join(', ') || 'Plateforme non renseignée'}
          </p>

          <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-zinc-400">
            <div className="flex h-9 items-center gap-2 rounded-lg bg-white/5 px-3">
              <Clock3 size={15} aria-hidden="true" />
              {formatHours(game.totalMinutes)}
            </div>
            <div className="flex h-9 items-center gap-2 rounded-lg bg-white/5 px-3">
              <Star size={15} aria-hidden="true" />
              {game.rating ? `${game.rating}/10` : 'Non note'}
            </div>
          </div>

          {game.lastChronicleTitle ? (
            <p className="mt-4 line-clamp-2 text-sm leading-6 text-zinc-400">
              {game.lastChronicleTitle}
            </p>
          ) : null}
        </div>
      </button>
    </article>
  )
}

export function MuseumPage({ games, onOpenGame, onOpenLibrary }: MuseumPageProps) {
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<MuseumFilter>('ALL')
  const [sortBy, setSortBy] = useState<MuseumSort>('recent')

  const museumGames = useMemo(() => games.filter(isMuseumGame), [games])
  const perfectGames = useMemo(
    () => museumGames.filter((game) => game.status === 'COMPLETED_100'),
    [museumGames],
  )
  const totalMinutes = useMemo(
    () => museumGames.reduce((total, game) => total + game.totalMinutes, 0),
    [museumGames],
  )
  const favoriteCompleted = useMemo(
    () =>
      [...museumGames].sort((left, right) => right.totalMinutes - left.totalMinutes)[0] ??
      null,
    [museumGames],
  )

  const filteredGames = useMemo(() => {
    const normalizedQuery = normalizeSearch(query)
    const matchingGames = museumGames.filter((game) => {
      const matchesQuery =
        normalizedQuery.length === 0 ||
        game.title.toLocaleLowerCase().includes(normalizedQuery) ||
        game.platforms.some((platform) =>
          platform.toLocaleLowerCase().includes(normalizedQuery),
        )
      const matchesStatus = statusFilter === 'ALL' || game.status === statusFilter

      return matchesQuery && matchesStatus
    })

    return sortMuseumGames(matchingGames, sortBy)
  }, [museumGames, query, sortBy, statusFilter])

  return (
    <div className="flex flex-1 flex-col gap-7">
      <header className="flex flex-col items-start justify-between gap-4 border-b border-white/10 pb-7 sm:flex-row">
        <div>
          <p className="text-sm font-medium text-[#A797FF]">Musée</p>
          <h1 className="mt-2 text-3xl font-semibold text-white sm:text-4xl">
            Galerie des aventures accomplies
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400">
            Les jeux termines deviennent une collection personnelle a revisiter.
          </p>
        </div>
        <div className="w-full rounded-lg border border-[#C9A646]/15 bg-[#181B23] px-4 py-3 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] sm:w-auto sm:text-right">
          <p className="text-xs text-zinc-500">Pieces exposees</p>
          <p className="mt-1 text-sm font-medium text-zinc-100">{museumGames.length}</p>
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-lg border border-white/10 bg-[#181B23] p-4">
          <div className="mb-5 flex items-center justify-between gap-4">
            <p className="text-sm text-zinc-500">Termines</p>
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-[#7C5CFF] text-white">
              <Trophy size={18} aria-hidden="true" />
            </div>
          </div>
          <p className="text-2xl font-semibold text-white">{museumGames.length}</p>
        </article>

        <article className="rounded-lg border border-white/10 bg-[#181B23] p-4">
          <div className="mb-5 flex items-center justify-between gap-4">
            <p className="text-sm text-zinc-500">100 %</p>
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-[#C9A646] text-[#0F1117]">
              <Star size={18} aria-hidden="true" />
            </div>
          </div>
          <p className="text-2xl font-semibold text-white">{perfectGames.length}</p>
        </article>

        <article className="rounded-lg border border-white/10 bg-[#181B23] p-4">
          <div className="mb-5 flex items-center justify-between gap-4">
            <p className="text-sm text-zinc-500">Temps expose</p>
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-[#4F7CFF] text-white">
              <Clock3 size={18} aria-hidden="true" />
            </div>
          </div>
          <p className="text-2xl font-semibold text-white">{formatHours(totalMinutes)}</p>
        </article>

        <article className="rounded-lg border border-white/10 bg-[#181B23] p-4">
          <div className="mb-5 flex items-center justify-between gap-4">
            <p className="text-sm text-zinc-500">Piece majeure</p>
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-[#A33D69] text-white">
              <Gamepad2 size={18} aria-hidden="true" />
            </div>
          </div>
          <p className="truncate text-2xl font-semibold text-white">
            {favoriteCompleted?.title ?? '-'}
          </p>
        </article>
      </section>

      <section className="grid gap-3 rounded-lg border border-white/10 bg-[#181B23] p-4 xl:grid-cols-[1fr_220px_220px]">
        <label className="relative block">
          <span className="sr-only">Rechercher dans le musée</span>
          <Search
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600"
            size={17}
            aria-hidden="true"
          />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Rechercher un jeu expose..."
            className="h-11 w-full rounded-lg border border-white/10 bg-[#0F1117] pl-10 pr-3 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-[#7C5CFF]"
          />
        </label>

        <label>
          <span className="sr-only">Filtrer par accomplissement</span>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as MuseumFilter)}
            className="h-11 w-full rounded-lg border border-white/10 bg-[#0F1117] px-3 text-sm text-white outline-none transition focus:border-[#7C5CFF]"
          >
            <option value="ALL">Tous les accomplissements</option>
            <option value="COMPLETED">Termines</option>
            <option value="COMPLETED_100">Termines a 100 %</option>
          </select>
        </label>

        <label>
          <span className="sr-only">Trier le musée</span>
          <select
            value={sortBy}
            onChange={(event) => setSortBy(event.target.value as MuseumSort)}
            className="h-11 w-full rounded-lg border border-white/10 bg-[#0F1117] px-3 text-sm text-white outline-none transition focus:border-[#7C5CFF]"
          >
            <option value="recent">Ajout recent</option>
            <option value="time">Temps joue</option>
            <option value="title">Titre</option>
          </select>
        </label>
      </section>

      {museumGames.length === 0 ? (
        <section className="rounded-lg border border-dashed border-white/15 bg-[#181B23] p-8">
          <div className="grid max-w-2xl gap-4">
            <div className="grid h-12 w-12 place-items-center rounded-lg bg-[#7C5CFF]/10 text-[#D8D0FF]">
              <Trophy size={22} aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Le musée attend sa première pièce.</h2>
              <p className="mt-2 text-sm leading-6 text-zinc-500">
                Passez un jeu en statut terminé depuis sa fiche pour l'ajouter à cette galerie.
              </p>
            </div>
            <Button type="button" onClick={onOpenLibrary}>
              <Gamepad2 size={17} aria-hidden="true" />
              Ouvrir la bibliothèque
            </Button>
          </div>
        </section>
      ) : filteredGames.length === 0 ? (
        <section className="rounded-lg border border-dashed border-white/15 bg-[#181B23] p-8">
          <h2 className="text-lg font-semibold text-white">Aucune piece ne correspond.</h2>
          <p className="mt-2 text-sm leading-6 text-zinc-500">
            Ajustez la recherche ou les filtres pour retrouver un jeu accompli.
          </p>
        </section>
      ) : (
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {filteredGames.map((game) => (
            <MuseumCard key={game.id} game={game} onOpenGame={onOpenGame} />
          ))}
        </section>
      )}
    </div>
  )
}
