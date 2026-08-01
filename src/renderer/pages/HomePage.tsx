import {
  BookOpen,
  Clock3,
  Gamepad2,
  Library,
  Trophy,
  Wrench,
} from 'lucide-react'
import { GAME_STATUS_LABELS, type CreateGameInput, type GameListItem, type LibraryOverview } from '../../types/game'
import { EmptyLibrary } from '../components/library/EmptyLibrary'
import { StatTile } from '../components/library/StatTile'
import { Button } from '../components/ui/Button'
import { formatHours } from '../utils/formatters'

interface HomePageProps {
  overview: LibraryOverview
  games: GameListItem[]
  isLoading: boolean
  isSaving: boolean
  error: string | null
  createGame: (input: CreateGameInput) => Promise<void>
  onOpenLibrary: () => void
  onOpenGame: (gameId: string) => void
}

export function HomePage({
  createGame,
  error,
  games,
  isLoading,
  isSaving,
  onOpenLibrary,
  onOpenGame,
  overview,
}: HomePageProps) {
  const gameLabel = overview.gamesOwned === 1 ? 'jeu' : 'jeux'
  const utilityLabel = overview.utilitiesOwned === 1 ? 'outil' : 'outils'

  return (
    <div className="flex flex-1 flex-col gap-7">
      <header className="flex flex-col items-start justify-between gap-5 border-b border-white/10 pb-7 xl:flex-row">
        <div className="flex flex-col items-start gap-4 sm:flex-row sm:gap-5">
          <img
            src="./ludux-logo.png"
            alt=""
            className="h-20 w-20 rounded-lg border border-[#C9A646]/20 object-cover sm:h-24 sm:w-24"
          />
          <div>
          <p className="text-sm font-medium text-[#A797FF]">Ludux</p>
          <h1 className="mt-2 text-3xl font-semibold text-white sm:text-4xl">Bienvenue dans Ludux</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400">
            La mémoire de votre vie de joueur, en local et à votre rythme.
          </p>
          </div>
        </div>
        <div className="w-full rounded-lg border border-[#C9A646]/15 bg-[#181B23] px-4 py-3 text-left sm:w-auto sm:text-right">
          <p className="text-xs text-zinc-500">État</p>
          <p className="mt-1 text-sm font-medium text-zinc-100">
            {isLoading
              ? 'Chargement'
              : `${overview.gamesOwned} ${gameLabel} · ${overview.utilitiesOwned} ${utilityLabel}`}
          </p>
        </div>
      </header>

      {error ? (
        <div className="rounded-lg border border-rose-400/30 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
          {error}
        </div>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
        <StatTile label="Jeux" value={String(overview.gamesOwned)} icon={Gamepad2} tone="violet" />
        <StatTile label="Outils" value={String(overview.utilitiesOwned)} icon={Wrench} tone="magenta" />
        <StatTile label="Heures" value={formatHours(overview.totalMinutes)} icon={Clock3} tone="blue" />
        <StatTile label="Terminés" value={String(overview.gamesCompleted)} icon={Trophy} tone="gold" />
        <StatTile label="Plateforme" value={overview.topPlatform ?? '-'} icon={BookOpen} tone="magenta" />
      </section>

      {games.length === 0 ? (
        <EmptyLibrary onCreateGame={createGame} isSaving={isSaving} />
      ) : (
        <section className="grid gap-4 xl:grid-cols-[1.5fr_1fr]">
          <div className="rounded-lg border border-[#C9A646]/15 bg-[#181B23] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-white">Bibliothèque</h2>
                <p className="mt-1 text-sm text-zinc-500">Derniers chapitres ajoutés</p>
              </div>
              <Button type="button" variant="secondary" onClick={onOpenLibrary}>
                <Library size={17} aria-hidden="true" />
                Ouvrir
              </Button>
            </div>
            <div className="space-y-3">
              {games.slice(0, 6).map((game) => (
                <article
                  key={game.id}
                >
                  <button
                    type="button"
                    onClick={() => onOpenGame(game.id)}
                    className="flex w-full items-center justify-between gap-4 rounded-lg border border-white/10 bg-[#121620] p-4 text-left transition hover:border-[#7C5CFF]/40"
                  >
                  <div>
                    <h3 className="font-medium text-white">{game.title}</h3>
                    <p className="mt-1 text-sm text-zinc-500">
                      {game.platforms.join(', ') || 'Plateforme non renseignée'}
                    </p>
                  </div>
                  <span className="rounded-lg bg-white/5 px-3 py-1 text-xs text-zinc-300">
                    {GAME_STATUS_LABELS[game.status]}
                  </span>
                  </button>
                </article>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-[#C9A646]/15 bg-[#181B23] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
            <h2 className="text-lg font-semibold text-white">Dernière aventure</h2>
            {overview.lastAdventure ? (
              <div className="mt-5">
                <p className="text-2xl font-semibold text-white">{overview.lastAdventure.title}</p>
                <p className="mt-2 text-sm text-zinc-500">
                  {GAME_STATUS_LABELS[overview.lastAdventure.status]}
                </p>
              </div>
            ) : (
              <p className="mt-5 text-sm leading-6 text-zinc-500">
                Aucun chapitre n'a encore été ajouté.
              </p>
            )}
          </div>
        </section>
      )}
    </div>
  )
}
