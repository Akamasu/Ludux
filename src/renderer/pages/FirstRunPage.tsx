import {
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  FolderSearch,
  HardDrive,
  RefreshCw,
  Settings2,
  ShieldCheck,
} from 'lucide-react'
import type {
  LocalPlatformDetection,
  ProviderConnection,
  SettingsOverview,
} from '../../types/settings'
import { TitleBar } from '../components/layout/TitleBar'
import { Button } from '../components/ui/Button'

interface FirstRunPageProps {
  overview: SettingsOverview
  isLoading: boolean
  isBusy: boolean
  error: string | null
  onContinue: () => void
  onOpenConnections: () => void
  onRefresh: () => Promise<void>
}

const FIRST_RUN_PROVIDER_ORDER = ['STEAM', 'EPIC', 'GOG', 'RAWG', 'IGDB'] as const

function collectPlatformPaths(platform: LocalPlatformDetection) {
  return Array.from(
    new Set([...platform.libraryPaths, ...platform.rootPaths, ...platform.configPaths]),
  )
}

function connectionIsReady(
  provider: ProviderConnection,
  platforms: LocalPlatformDetection[],
) {
  if (provider.provider === 'EPIC' || provider.provider === 'GOG') {
    return platforms.some(
      (platform) => platform.provider === provider.provider && platform.detected,
    )
  }

  return provider.configured
}

function PlatformRow({ platform }: { platform: LocalPlatformDetection }) {
  const paths = collectPlatformPaths(platform)

  return (
    <article className="border-b border-white/10 py-4 first:pt-0 last:border-b-0 last:pb-0">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="font-semibold text-white">{platform.label}</h3>
          <p className="mt-1 text-sm leading-5 text-zinc-500">
            {platform.detected ? platform.message : 'Aucune installation trouvée.'}
          </p>
        </div>
        <span
          className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium ${
            platform.detected
              ? 'border-emerald-400/25 bg-emerald-400/10 text-emerald-100'
              : 'border-white/10 bg-white/5 text-zinc-500'
          }`}
        >
          {platform.detected ? <CheckCircle2 size={14} aria-hidden="true" /> : null}
          {platform.detected ? 'Détecté' : 'Non trouvé'}
        </span>
      </div>

      {paths.length > 0 ? (
        <details className="group mt-3">
          <summary className="flex w-fit cursor-pointer list-none items-center gap-2 text-xs font-medium text-[#B9A66B] outline-none">
            <ChevronDown
              size={14}
              aria-hidden="true"
              className="transition-transform group-open:rotate-180"
            />
            Voir {paths.length > 1 ? 'les chemins' : 'le chemin'}
          </summary>
          <ul className="mt-3 grid gap-2">
            {paths.slice(0, 4).map((path) => (
              <li
                key={path}
                className="break-all rounded-lg border border-white/8 bg-[#0F1117] px-3 py-2 text-xs leading-5 text-zinc-400"
              >
                {path}
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </article>
  )
}

function ConnectionRow({
  provider,
  ready,
}: {
  provider: ProviderConnection
  ready: boolean
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-white/10 py-3 first:pt-0 last:border-b-0 last:pb-0">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-white">{provider.label}</p>
        <p className="mt-1 line-clamp-1 text-xs text-zinc-500">
          {provider.description}
        </p>
      </div>
      <span
        className={`shrink-0 text-xs font-medium ${
          ready ? 'text-emerald-200' : 'text-zinc-500'
        }`}
      >
        {ready ? 'Prêt' : 'À configurer'}
      </span>
    </div>
  )
}

export function FirstRunPage({
  error,
  isBusy,
  isLoading,
  onContinue,
  onOpenConnections,
  onRefresh,
  overview,
}: FirstRunPageProps) {
  const platforms = overview.localPlatformOverview.platforms
  const providers = FIRST_RUN_PROVIDER_ORDER.map((providerId) =>
    overview.providerOverview.providers.find(
      (provider) => provider.provider === providerId,
    ),
  ).filter((provider): provider is ProviderConnection => provider !== undefined)
  const readyConnections = providers.filter((provider) =>
    connectionIsReady(provider, platforms),
  ).length

  return (
    <div className="library-atmosphere min-h-screen overflow-x-hidden bg-[#0F1117] text-zinc-100">
      <div className="library-grain pointer-events-none fixed inset-0 z-0" />
      <TitleBar />

      <main className="relative z-10 min-h-screen pt-11">
        <div className="mx-auto flex min-h-[calc(100vh-2.75rem)] w-full max-w-6xl flex-col px-4 py-6 sm:px-7 lg:px-10 lg:py-9">
          <header className="flex flex-col gap-5 border-b border-[#C9A646]/20 pb-7 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-4">
              <img
                src="./ludux-logo.png"
                alt=""
                className="h-14 w-14 shrink-0 rounded-lg border border-white/10 object-cover shadow-lg"
              />
              <div className="min-w-0">
                <p className="text-sm font-medium text-[#B9A66B]">Première ouverture</p>
                <h1 className="mt-1 text-3xl font-semibold text-white sm:text-4xl">
                  Bienvenue dans Ludux
                </h1>
              </div>
            </div>

            <button
              type="button"
              title="Relancer la détection"
              aria-label="Relancer la détection"
              onClick={() => void onRefresh()}
              disabled={isBusy || isLoading}
              className="grid h-11 w-11 shrink-0 place-items-center rounded-lg border border-white/10 bg-white/5 text-zinc-300 transition hover:border-[#7C5CFF]/40 hover:bg-[#7C5CFF]/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RefreshCw
                size={18}
                aria-hidden="true"
                className={isLoading ? 'animate-spin' : undefined}
              />
            </button>
          </header>

          <div className="grid flex-1 gap-7 py-7 lg:grid-cols-[minmax(0,1.15fr)_minmax(19rem,0.85fr)]">
            <section className="min-w-0">
              <div className="mb-5">
                <div className="flex items-center gap-3">
                  <FolderSearch className="text-[#A797FF]" size={20} aria-hidden="true" />
                  <h2 className="text-xl font-semibold text-white">Jeux sur cet ordinateur</h2>
                </div>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">
                  Ludux recherche automatiquement les bibliothèques installées. Vous
                  pourrez relancer cette détection plus tard depuis les paramètres.
                </p>
              </div>

              <div className="rounded-lg border border-white/10 bg-[#181B23] p-5">
                {isLoading ? (
                  <div className="flex min-h-44 items-center justify-center gap-3 text-sm text-zinc-400">
                    <RefreshCw className="animate-spin text-[#A797FF]" size={18} aria-hidden="true" />
                    Recherche des plateformes...
                  </div>
                ) : platforms.length > 0 ? (
                  platforms.map((platform) => (
                    <PlatformRow key={platform.provider} platform={platform} />
                  ))
                ) : (
                  <p className="py-10 text-center text-sm text-zinc-500">
                    La détection locale n'est pas disponible.
                  </p>
                )}
              </div>
            </section>

            <aside className="min-w-0">
              <div className="mb-5 flex items-center gap-3">
                <ShieldCheck className="text-[#8CA7FF]" size={20} aria-hidden="true" />
                <div>
                  <h2 className="text-xl font-semibold text-white">Connexions</h2>
                  <p className="mt-1 text-sm text-zinc-500">
                    {readyConnections}/{providers.length} sources prêtes
                  </p>
                </div>
              </div>

              <div className="rounded-lg border border-white/10 bg-[#181B23] p-5">
                {providers.map((provider) => (
                  <ConnectionRow
                    key={provider.provider}
                    provider={provider}
                    ready={connectionIsReady(provider, platforms)}
                  />
                ))}
              </div>

              <div className="mt-4 flex items-start gap-3 border-l-2 border-[#C9A646]/60 px-4 py-2 text-sm leading-6 text-zinc-400">
                <HardDrive className="mt-1 shrink-0 text-[#B9A66B]" size={16} aria-hidden="true" />
                <p>
                  Vos données restent sur cet ordinateur. Les connexions manquantes
                  peuvent être ajoutées plus tard.
                </p>
              </div>
            </aside>
          </div>

          {error ? (
            <div className="mb-5 rounded-lg border border-rose-400/30 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
              La détection n'a pas pu se terminer : {error}
            </div>
          ) : null}

          <footer className="flex flex-col-reverse gap-3 border-t border-white/10 pt-5 sm:flex-row sm:items-center sm:justify-end">
            <Button
              type="button"
              variant="secondary"
              onClick={onOpenConnections}
              disabled={isBusy || isLoading}
              className="w-full sm:w-auto"
            >
              <Settings2 size={17} aria-hidden="true" />
              Configurer les connexions
            </Button>
            <Button
              type="button"
              onClick={onContinue}
              disabled={isBusy || isLoading}
              className="w-full sm:w-auto"
            >
              Entrer dans Ludux
              <ArrowRight size={17} aria-hidden="true" />
            </Button>
          </footer>
        </div>
      </main>
    </div>
  )
}
