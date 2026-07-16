import { Grid3X3, List, Plus, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import {
  GAME_STATUS_LABELS,
  GAME_STATUS_VALUES,
  type CreateGameInput,
  type GameListItem,
  type GameStatus,
} from '../../types/game'
import { AddGameForm } from '../components/library/AddGameForm'
import { EmptyLibrary } from '../components/library/EmptyLibrary'
import { GameCard } from '../components/library/GameCard'
import { GameListRow } from '../components/library/GameListRow'
import { Button } from '../components/ui/Button'
import { cn } from '../../utils/cn'

type StatusFilter = 'ALL' | GameStatus
type PlatformFilter = 'ALL' | string
type ViewMode = 'grid' | 'list'

interface LibraryPageProps {
  games: GameListItem[]
  isSaving: boolean
  error: string | null
  createGame: (input: CreateGameInput) => Promise<void>
  onOpenGame: (gameId: string) => void
}

function normalizeSearch(value: string) {
  return value.trim().toLocaleLowerCase()
}

export function LibraryPage({
  createGame,
  error,
  games,
  isSaving,
  onOpenGame,
}: LibraryPageProps) {
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL')
  const [platformFilter, setPlatformFilter] = useState<PlatformFilter>('ALL')
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [isAddOpen, setIsAddOpen] = useState(false)

  const platforms = useMemo(() => {
    const names = new Set<string>()

    for (const game of games) {
      for (const platform of game.platforms) {
        names.add(platform)
      }
    }

    return [...names].sort((left, right) => left.localeCompare(right))
  }, [games])

  const filteredGames = useMemo(() => {
    const normalizedQuery = normalizeSearch(query)

    return games.filter((game) => {
      const matchesQuery =
        normalizedQuery.length === 0 ||
        game.title.toLocaleLowerCase().includes(normalizedQuery) ||
        game.platforms.some((platform) =>
          platform.toLocaleLowerCase().includes(normalizedQuery),
        )

      const matchesStatus = statusFilter === 'ALL' || game.status === statusFilter
      const matchesPlatform =
        platformFilter === 'ALL' || game.platforms.includes(platformFilter)

      return matchesQuery && matchesStatus && matchesPlatform
    })
  }, [games, platformFilter, query, statusFilter])

  async function handleCreateGame(input: CreateGameInput) {
    await createGame(input)
    setIsAddOpen(false)
  }

  return (
    <div className="flex flex-1 flex-col gap-6">
      <header className="flex items-start justify-between gap-6 border-b border-white/10 pb-7">
        <div>
          <p className="text-sm font-medium text-emerald-300">Bibliotheque</p>
          <h1 className="mt-2 text-4xl font-semibold text-white">Vos jeux</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400">
            Cherchez, filtrez et ajoutez les jeux qui composent votre histoire.
          </p>
        </div>
        {games.length > 0 ? (
          <Button type="button" onClick={() => setIsAddOpen((current) => !current)}>
            <Plus size={17} aria-hidden="true" />
            Ajouter un jeu
          </Button>
        ) : null}
      </header>

      {error ? (
        <div className="rounded-lg border border-rose-400/30 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
          {error}
        </div>
      ) : null}

      {isAddOpen && games.length > 0 ? (
        <section className="rounded-lg border border-white/10 bg-[#16161a] p-5">
          <div className="mb-5">
            <h2 className="text-lg font-semibold text-white">Nouveau chapitre</h2>
            <p className="mt-1 text-sm text-zinc-500">
              Les informations personnelles pourront etre enrichies ensuite avec les chroniques.
            </p>
          </div>
          <AddGameForm idPrefix="library-game" isSaving={isSaving} onCreateGame={handleCreateGame} />
        </section>
      ) : null}

      {games.length === 0 ? (
        <EmptyLibrary onCreateGame={createGame} isSaving={isSaving} />
      ) : (
        <>
          <section className="grid gap-3 rounded-lg border border-white/10 bg-[#16161a] p-4 xl:grid-cols-[1.2fr_0.8fr_0.8fr_auto]">
            <label className="relative block">
              <span className="sr-only">Rechercher</span>
              <Search
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600"
                size={17}
                aria-hidden="true"
              />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Rechercher un jeu, une plateforme..."
                className="h-11 w-full rounded-lg border border-white/10 bg-[#0f0f12] pl-10 pr-3 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-emerald-400"
              />
            </label>

            <label>
              <span className="sr-only">Filtrer par statut</span>
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
                className="h-11 w-full rounded-lg border border-white/10 bg-[#0f0f12] px-3 text-sm text-white outline-none transition focus:border-emerald-400"
              >
                <option value="ALL">Tous les statuts</option>
                {GAME_STATUS_VALUES.map((value) => (
                  <option key={value} value={value}>
                    {GAME_STATUS_LABELS[value]}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span className="sr-only">Filtrer par plateforme</span>
              <select
                value={platformFilter}
                onChange={(event) => setPlatformFilter(event.target.value)}
                className="h-11 w-full rounded-lg border border-white/10 bg-[#0f0f12] px-3 text-sm text-white outline-none transition focus:border-emerald-400"
              >
                <option value="ALL">Toutes les plateformes</option>
                {platforms.map((platform) => (
                  <option key={platform} value={platform}>
                    {platform}
                  </option>
                ))}
              </select>
            </label>

            <div className="grid h-11 grid-cols-2 rounded-lg border border-white/10 bg-[#0f0f12] p-1">
              <button
                type="button"
                aria-label="Vue grille"
                aria-pressed={viewMode === 'grid'}
                title="Vue grille"
                onClick={() => setViewMode('grid')}
                className={cn(
                  'grid place-items-center rounded-md text-zinc-500 transition hover:text-white',
                  viewMode === 'grid' && 'bg-white/10 text-white',
                )}
              >
                <Grid3X3 size={17} aria-hidden="true" />
              </button>
              <button
                type="button"
                aria-label="Vue liste"
                aria-pressed={viewMode === 'list'}
                title="Vue liste"
                onClick={() => setViewMode('list')}
                className={cn(
                  'grid place-items-center rounded-md text-zinc-500 transition hover:text-white',
                  viewMode === 'list' && 'bg-white/10 text-white',
                )}
              >
                <List size={17} aria-hidden="true" />
              </button>
            </div>
          </section>

          <div className="flex items-center justify-between text-sm text-zinc-500">
            <p>
              {filteredGames.length} sur {games.length} jeux
            </p>
          </div>

          {filteredGames.length === 0 ? (
            <section className="rounded-lg border border-dashed border-white/15 bg-[#141417] p-8">
              <h2 className="text-lg font-semibold text-white">Aucun jeu ne correspond.</h2>
              <p className="mt-2 text-sm leading-6 text-zinc-500">
                Ajustez la recherche ou les filtres pour retrouver votre chapitre.
              </p>
            </section>
          ) : viewMode === 'grid' ? (
            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {filteredGames.map((game) => (
                <GameCard key={game.id} game={game} onOpen={onOpenGame} />
              ))}
            </section>
          ) : (
            <section className="space-y-3">
              {filteredGames.map((game) => (
                <GameListRow key={game.id} game={game} onOpen={onOpenGame} />
              ))}
            </section>
          )}
        </>
      )}
    </div>
  )
}
