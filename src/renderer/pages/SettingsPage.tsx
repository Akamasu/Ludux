import {
  Archive,
  Cloud,
  Database,
  Download,
  ExternalLink,
  FolderOpen,
  HardDrive,
  Link2,
  RefreshCw,
  RotateCcw,
  Settings,
  ShieldCheck,
  Trash2,
} from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import type { GameListItem } from '../../types/game'
import type {
  DeleteProviderConnectionInput,
  ProviderConnection,
  SettingsActionResult,
  SettingsOverview,
  SyncProviderInput,
  UpsertProviderConnectionInput,
} from '../../types/settings'
import type { AppView } from '../types/navigation'
import { Button } from '../components/ui/Button'
import { formatDate } from '../utils/formatters'

interface SettingsPageProps {
  overview: SettingsOverview
  isLoading: boolean
  isBusy: boolean
  error: string | null
  actionResult: SettingsActionResult | null
  archivedGames: GameListItem[]
  launchView: AppView
  onChangeLaunchView: (view: AppView) => void
  onCreateBackup: () => Promise<void>
  onDeleteGame: (gameId: string) => Promise<void>
  onDeleteProviderConnection: (input: DeleteProviderConnectionInput) => Promise<void>
  onExportLibrary: () => Promise<void>
  onOpenDataFolder: () => Promise<void>
  onRefresh: () => Promise<void>
  onRestoreGame: (gameId: string) => Promise<void>
  onSyncProvider: (input: SyncProviderInput) => Promise<void>
  onUpsertProviderConnection: (input: UpsertProviderConnectionInput) => Promise<void>
}

const launchViewOptions: {
  value: AppView
  label: string
}[] = [
  { value: 'home', label: 'Accueil' },
  { value: 'library', label: 'Bibliotheque' },
  { value: 'chronicles', label: 'Chroniques' },
  { value: 'museum', label: 'Musee' },
  { value: 'lifeBook', label: 'Livre de Vie' },
  { value: 'statistics', label: 'Statistiques' },
]

function formatBytes(bytes: number) {
  if (bytes === 0) {
    return '0 o'
  }

  const units = ['o', 'Ko', 'Mo', 'Go'] as const
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  const value = bytes / 1024 ** exponent

  return `${value.toFixed(value >= 10 || exponent === 0 ? 0 : 1)} ${units[exponent]}`
}

function formatAppVersion(version: string) {
  return version === 'navigateur' ? version : `v${version}`
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-2 border-b border-white/10 py-4 last:border-b-0 md:grid-cols-[180px_1fr]">
      <dt className="text-sm text-zinc-500">{label}</dt>
      <dd className="min-w-0 truncate text-sm text-zinc-200" title={value}>
        {value}
      </dd>
    </div>
  )
}

function ResultMessage({ result }: { result: SettingsActionResult }) {
  return (
    <div className="rounded-lg border border-[#7C5CFF]/30 bg-[#7C5CFF]/10 px-4 py-3 text-sm text-[#D8D0FF]">
      <p className="font-medium">{result.message}</p>
      {result.path ? (
        <p className="mt-1 truncate text-xs text-zinc-400" title={result.path}>
          {result.path}
        </p>
      ) : null}
    </div>
  )
}

function providerStatusLabel(connection: ProviderConnection) {
  if (!connection.configured) {
    return 'Non configure'
  }

  if (connection.sync?.status === 'SYNCED') {
    return 'Synchronise'
  }

  if (connection.sync?.status === 'SYNCING') {
    return 'En cours'
  }

  if (connection.sync?.status === 'ERROR') {
    return 'Erreur'
  }

  if (connection.sync?.status === 'READY') {
    return 'Pret'
  }

  return connection.sync?.status ?? 'Local'
}

function providerExternalIdLabel(provider: ProviderConnection) {
  if (provider.provider === 'STEAM') {
    return 'SteamID64'
  }

  if (provider.provider === 'RAWG') {
    return 'Catalogue'
  }

  return 'Identifiant externe'
}

function providerExternalIdPlaceholder(provider: ProviderConnection) {
  if (provider.provider === 'STEAM') {
    return '7656119...'
  }

  if (provider.provider === 'RAWG') {
    return 'catalogue'
  }

  return 'SteamID, gamertag, pseudo, cle publique...'
}

function providerTokenLabel(provider: ProviderConnection) {
  if (provider.provider === 'STEAM') {
    return 'Cle API Steam ou variable .env'
  }

  if (provider.provider === 'RAWG') {
    return 'Cle API RAWG ou variable .env'
  }

  return 'Indice token'
}

function providerDefaultExternalId(provider: ProviderConnection) {
  return provider.provider === 'RAWG' ? 'catalogue' : ''
}

function isSyncableProvider(provider: ProviderConnection | undefined) {
  return provider?.provider === 'STEAM' || provider?.provider === 'RAWG'
}

function canSyncProvider(provider: ProviderConnection | undefined) {
  if (!provider?.account || !isSyncableProvider(provider)) {
    return false
  }

  return provider.provider === 'STEAM' || provider.account.hasToken
}

function providerTokenPlaceholder(provider: ProviderConnection) {
  if (provider.provider === 'STEAM') {
    return provider.account?.hasToken
      ? 'Laisser vide pour conserver la cle existante'
      : 'Optionnel : manifests locaux ou STEAM_WEB_API_KEY'
  }

  if (provider.provider === 'RAWG') {
    return provider.account?.hasToken
      ? 'Laisser vide pour conserver la cle existante'
      : 'Optionnel si RAWG_API_KEY est defini'
  }

  return 'Optionnel'
}

function ProvidersPanel({
  actionResult,
  error,
  isBusy,
  overview,
  onDeleteProviderConnection,
  onSyncProvider,
  onUpsertProviderConnection,
}: {
  actionResult: SettingsActionResult | null
  error: string | null
  isBusy: boolean
  overview: SettingsOverview
  onDeleteProviderConnection: (input: DeleteProviderConnectionInput) => Promise<void>
  onSyncProvider: (input: SyncProviderInput) => Promise<void>
  onUpsertProviderConnection: (input: UpsertProviderConnectionInput) => Promise<void>
}) {
  const providers = overview.providerOverview.providers
  const [selectedProviderId, setSelectedProviderId] = useState(
    providers[0]?.provider ?? 'STEAM',
  )
  const selectedProvider =
    providers.find((provider) => provider.provider === selectedProviderId) ?? providers[0]
  const [externalId, setExternalId] = useState('')
  const [username, setUsername] = useState('')
  const [tokenHint, setTokenHint] = useState('')
  const [formError, setFormError] = useState<string | null>(null)
  const trimmedExternalId = externalId.trim()
  const isSteamProvider = selectedProvider?.provider === 'STEAM'
  const isRawgProvider = selectedProvider?.provider === 'RAWG'
  const selectedProviderCanSync = canSyncProvider(selectedProvider)

  useEffect(() => {
    setExternalId(
      selectedProvider?.account?.externalId ??
        (selectedProvider ? providerDefaultExternalId(selectedProvider) : ''),
    )
    setUsername(selectedProvider?.account?.username ?? '')
    setTokenHint('')
    setFormError(null)
  }, [selectedProvider])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!selectedProvider) {
      return
    }

    const resolvedExternalId =
      isRawgProvider && trimmedExternalId.length === 0
        ? providerDefaultExternalId(selectedProvider)
        : trimmedExternalId

    if (resolvedExternalId.length === 0) {
      setFormError('Identifiant externe obligatoire.')
      return
    }

    if (selectedProvider.provider === 'STEAM' && !/^\d{17}$/.test(resolvedExternalId)) {
      setFormError('SteamID64 invalide : il doit contenir exactement 17 chiffres.')
      return
    }

    setFormError(null)

    await onUpsertProviderConnection({
      provider: selectedProvider.provider,
      externalId: resolvedExternalId,
      username: username.trim(),
      tokenHint: tokenHint.trim(),
    })
  }

  async function handleDeleteConnection() {
    if (!selectedProvider?.account) {
      return
    }

    const confirmed = window.confirm(`Retirer la connexion ${selectedProvider.label} ?`)

    if (confirmed) {
      await onDeleteProviderConnection({
        provider: selectedProvider.provider,
        accountId: selectedProvider.account.id,
      })
    }
  }

  async function handleSyncProvider() {
    if (!selectedProvider?.account || !isSyncableProvider(selectedProvider)) {
      return
    }

    await onSyncProvider({
      provider: selectedProvider.provider,
    })
  }

  return (
    <section className="rounded-lg border border-white/10 bg-[#181B23] p-5">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-white">Providers externes</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Comptes connectes et synchronisations automatiques selon les acces disponibles.
          </p>
        </div>
        <Cloud className="text-[#8CA7FF]" size={20} aria-hidden="true" />
      </div>

      <div className="mb-5 grid gap-3 md:grid-cols-3">
        <div className="rounded-lg border border-white/10 bg-[#121620] p-3">
          <p className="text-xs text-zinc-500">Providers</p>
          <p className="mt-1 text-xl font-semibold text-white">
            {overview.providerOverview.totalProviders}
          </p>
        </div>
        <div className="rounded-lg border border-white/10 bg-[#121620] p-3">
          <p className="text-xs text-zinc-500">Configures</p>
          <p className="mt-1 text-xl font-semibold text-white">
            {overview.providerOverview.configuredCount}
          </p>
        </div>
        <div className="rounded-lg border border-white/10 bg-[#121620] p-3">
          <p className="text-xs text-zinc-500">Dernier etat</p>
          <p className="mt-1 truncate text-xl font-semibold text-white">
            {overview.providerOverview.lastSyncAt
              ? formatDate(overview.providerOverview.lastSyncAt)
              : 'Aucun'}
          </p>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="grid gap-2 sm:grid-cols-2">
          {providers.map((provider) => {
            const isSelected = provider.provider === selectedProvider?.provider

            return (
              <button
                key={provider.provider}
                type="button"
                onClick={() => setSelectedProviderId(provider.provider)}
                className={`rounded-lg border p-3 text-left transition ${
                  isSelected
                    ? 'border-[#7C5CFF]/70 bg-[#7C5CFF]/10'
                    : 'border-white/10 bg-[#121620] hover:border-white/20'
                }`}
              >
                <span className="flex items-center justify-between gap-3">
                  <span className="font-medium text-white">{provider.label}</span>
                  <span
                    className={`rounded-lg px-2 py-1 text-xs ${
                      provider.configured
                        ? 'bg-[#4F7CFF]/10 text-[#C9D6FF]'
                        : 'bg-white/7 text-zinc-500'
                    }`}
                  >
                    {providerStatusLabel(provider)}
                  </span>
                </span>
                <span className="mt-2 line-clamp-2 block text-sm leading-5 text-zinc-500">
                  {provider.description}
                </span>
              </button>
            )
          })}
        </div>

        {selectedProvider ? (
          <form className="border-t border-white/10 pt-4" onSubmit={handleSubmit}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-base font-semibold text-white">{selectedProvider.label}</h3>
                <p className="mt-1 text-sm leading-6 text-zinc-500">
                  {selectedProvider.description}
                </p>
              </div>
              <ShieldCheck className="text-[#A797FF]" size={20} aria-hidden="true" />
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {selectedProvider.capabilities.map((capability) => (
                <span
                  key={capability}
                  className="rounded-lg bg-[#0F1117] px-2.5 py-1 text-xs text-zinc-300"
                >
                  {capability}
                </span>
              ))}
            </div>

            <div className="mt-5 grid gap-3">
              <label>
                <span className="mb-2 block text-xs font-medium text-zinc-500">
                  {providerExternalIdLabel(selectedProvider)}
                </span>
                <input
                  value={externalId}
                  onChange={(event) => {
                    setExternalId(event.target.value)
                    setFormError(null)
                  }}
                  inputMode={isSteamProvider ? 'numeric' : 'text'}
                  placeholder={providerExternalIdPlaceholder(selectedProvider)}
                  className="h-11 w-full rounded-lg border border-white/10 bg-[#0F1117] px-3 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-[#7C5CFF]"
                />
                {isSteamProvider ? (
                  <span className="mt-2 block text-xs text-zinc-600">
                    SteamID64 attendu : 17 chiffres.
                  </span>
                ) : null}
                {isRawgProvider ? (
                  <span className="mt-2 block text-xs text-zinc-600">
                    Catalogue RAWG public pour enrichir les fiches locales.
                  </span>
                ) : null}
              </label>

              <div className="grid gap-3 md:grid-cols-2">
                <label>
                  <span className="mb-2 block text-xs font-medium text-zinc-500">
                    Nom affiche
                  </span>
                  <input
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
                    placeholder="Compte principal"
                    className="h-11 w-full rounded-lg border border-white/10 bg-[#0F1117] px-3 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-[#7C5CFF]"
                  />
                </label>
                <label>
                  <span className="mb-2 block text-xs font-medium text-zinc-500">
                    {providerTokenLabel(selectedProvider)}
                  </span>
                  <input
                    type={isSteamProvider || isRawgProvider ? 'password' : 'text'}
                    value={tokenHint}
                    onChange={(event) => {
                      setTokenHint(event.target.value)
                      setFormError(null)
                    }}
                    placeholder={providerTokenPlaceholder(selectedProvider)}
                    className="h-11 w-full rounded-lg border border-white/10 bg-[#0F1117] px-3 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-[#7C5CFF]"
                  />
                  {selectedProvider.account?.hasToken ? (
                    <span className="mt-2 block text-xs text-[#C9D6FF]">
                      Cle configuree. Sa valeur n'est pas affichee.
                    </span>
                  ) : null}
                </label>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-3">
              <Button
                type="submit"
                disabled={
                  isBusy ||
                  (!isRawgProvider && trimmedExternalId.length === 0)
                }
              >
                <Link2 size={17} aria-hidden="true" />
                {isBusy ? 'Enregistrement...' : 'Enregistrer'}
              </Button>
              {selectedProvider.account ? (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleSyncProvider}
                  disabled={
                    isBusy ||
                    !selectedProviderCanSync
                  }
                >
                  <RefreshCw size={17} aria-hidden="true" />
                  {isBusy ? 'Synchronisation...' : 'Synchroniser'}
                </Button>
              ) : null}
              {selectedProvider.account ? (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleDeleteConnection}
                  disabled={isBusy}
                  className="border-rose-400/30 bg-rose-400/10 text-rose-100 hover:border-rose-300/60 hover:bg-rose-400/15"
                >
                  <Trash2 size={17} aria-hidden="true" />
                  Retirer
                </Button>
              ) : null}
            </div>

            <div aria-live="polite" className="mt-4">
              {formError || error ? (
                <div className="rounded-lg border border-rose-400/30 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
                  {formError ?? error}
                </div>
              ) : actionResult ? (
                <ResultMessage result={actionResult} />
              ) : null}
            </div>

            {selectedProvider.account ? (
              <div className="mt-5 rounded-lg border border-white/10 bg-[#0F1117] p-3 text-sm text-zinc-400">
                <p className="font-medium text-white">
                  {selectedProvider.account.username ?? selectedProvider.account.externalId}
                </p>
                <p className="mt-1 truncate text-xs text-zinc-500">
                  {selectedProvider.account.externalId}
                </p>
                <p className="mt-2 text-xs text-zinc-600">
                  Mis a jour le {formatDate(selectedProvider.account.updatedAt)}
                </p>
                {selectedProvider.sync?.message ? (
                  <p className="mt-2 text-xs text-[#C9D6FF]">
                    {selectedProvider.sync.message}
                  </p>
                ) : null}
              </div>
            ) : null}
          </form>
        ) : null}
      </div>
    </section>
  )
}

function ArchivedGamesPanel({
  archivedGames,
  isBusy,
  onDeleteGame,
  onRestoreGame,
}: {
  archivedGames: GameListItem[]
  isBusy: boolean
  onDeleteGame: (gameId: string) => Promise<void>
  onRestoreGame: (gameId: string) => Promise<void>
}) {
  async function handleDelete(game: GameListItem) {
    const confirmed = window.confirm(
      `Supprimer definitivement "${game.title}" ? Cette action supprimera aussi ses sessions, chroniques et souvenirs.`,
    )

    if (confirmed) {
      await onDeleteGame(game.id)
    }
  }

  return (
    <section className="rounded-lg border border-white/10 bg-[#181B23] p-5">
      <div className="mb-5 flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-white">Jeux archives</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Les jeux archives quittent la bibliotheque active sans perdre leurs donnees.
          </p>
        </div>
        <Archive className="text-[#A797FF]" size={20} aria-hidden="true" />
      </div>

      {archivedGames.length === 0 ? (
        <p className="rounded-lg border border-dashed border-white/15 bg-[#121620] p-4 text-sm text-zinc-500">
          Aucun jeu archive pour le moment.
        </p>
      ) : (
        <div className="space-y-3">
          {archivedGames.map((game) => (
            <article
              key={game.id}
              className="grid gap-4 rounded-lg border border-white/10 bg-[#121620] p-4 xl:grid-cols-[1fr_auto]"
            >
              <div className="min-w-0">
                <h3 className="truncate font-medium text-white">{game.title}</h3>
                <p className="mt-1 truncate text-sm text-zinc-500">
                  {game.platforms.join(', ') || 'Plateforme non renseignee'}
                </p>
                <p className="mt-2 text-xs text-zinc-600">
                  Archive le {formatDate(game.updatedAt)} / {game.rating ? `${game.rating}/10` : 'Non note'}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => onRestoreGame(game.id)}
                  disabled={isBusy}
                >
                  <RotateCcw size={17} aria-hidden="true" />
                  Restaurer
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => handleDelete(game)}
                  disabled={isBusy}
                  className="border-rose-400/30 bg-rose-400/10 text-rose-100 hover:border-rose-300/60 hover:bg-rose-400/15"
                >
                  <Trash2 size={17} aria-hidden="true" />
                  Supprimer
                </Button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}

export function SettingsPage({
  actionResult,
  archivedGames,
  error,
  isBusy,
  isLoading,
  launchView,
  onChangeLaunchView,
  onCreateBackup,
  onDeleteGame,
  onDeleteProviderConnection,
  onExportLibrary,
  onOpenDataFolder,
  onRefresh,
  onRestoreGame,
  onSyncProvider,
  onUpsertProviderConnection,
  overview,
}: SettingsPageProps) {
  return (
    <div className="flex flex-1 flex-col gap-7">
      <header className="flex items-start justify-between gap-6 border-b border-white/10 pb-7">
        <div>
          <p className="text-sm font-medium text-[#A797FF]">Parametres</p>
          <h1 className="mt-2 text-4xl font-semibold text-white">
            Controle local des donnees
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400">
            Sauvegardez la base locale, exportez un instantane JSON et gardez les
            chemins essentiels sous les yeux.
          </p>
        </div>
        <Button type="button" variant="secondary" onClick={onRefresh} disabled={isBusy}>
          <RefreshCw size={17} aria-hidden="true" />
          Actualiser
        </Button>
      </header>

      {error ? (
        <div className="rounded-lg border border-rose-400/30 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
          {error}
        </div>
      ) : null}

      {actionResult ? <ResultMessage result={actionResult} /> : null}

      <section className="grid gap-4 md:grid-cols-3">
        <article className="rounded-lg border border-white/10 bg-[#181B23] p-4">
          <div className="mb-5 flex items-center justify-between gap-4">
            <p className="text-sm text-zinc-500">Version</p>
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-[#7C5CFF] text-white">
              <Settings size={18} aria-hidden="true" />
            </div>
          </div>
          <p className="text-2xl font-semibold text-white">
            {isLoading ? '...' : formatAppVersion(overview.appVersion)}
          </p>
        </article>
        <article className="rounded-lg border border-white/10 bg-[#181B23] p-4">
          <div className="mb-5 flex items-center justify-between gap-4">
            <p className="text-sm text-zinc-500">Base locale</p>
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-[#4F7CFF] text-white">
              <Database size={18} aria-hidden="true" />
            </div>
          </div>
          <p className="text-2xl font-semibold text-white">
            {isLoading ? '...' : formatBytes(overview.databaseSizeBytes)}
          </p>
        </article>
        <article className="rounded-lg border border-white/10 bg-[#181B23] p-4">
          <div className="mb-5 flex items-center justify-between gap-4">
            <p className="text-sm text-zinc-500">Derniere sauvegarde</p>
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-[#A33D69] text-white">
              <Archive size={18} aria-hidden="true" />
            </div>
          </div>
          <p className="truncate text-2xl font-semibold text-white">
            {overview.lastBackupAt ? formatDate(overview.lastBackupAt) : 'Aucune'}
          </p>
        </article>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1fr_0.9fr]">
        <article className="rounded-lg border border-white/10 bg-[#181B23] p-5">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-white">Actions locales</h2>
              <p className="mt-1 text-sm text-zinc-500">
                Exports lisibles et copie directe de la base SQLite.
              </p>
            </div>
            <HardDrive className="text-[#A797FF]" size={20} aria-hidden="true" />
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <Button type="button" onClick={onCreateBackup} disabled={isBusy}>
              <Archive size={17} aria-hidden="true" />
              Sauvegarder
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={onExportLibrary}
              disabled={isBusy}
            >
              <Download size={17} aria-hidden="true" />
              Exporter JSON
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={onOpenDataFolder}
              disabled={isBusy}
            >
              <FolderOpen size={17} aria-hidden="true" />
              Dossier local
            </Button>
          </div>
        </article>

        <article className="rounded-lg border border-white/10 bg-[#181B23] p-5">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-white">Preferences</h2>
              <p className="mt-1 text-sm text-zinc-500">
                Reglages enregistres sur cette machine.
              </p>
            </div>
            <ExternalLink className="text-[#8CA7FF]" size={20} aria-hidden="true" />
          </div>

          <label>
            <span className="mb-2 block text-sm text-zinc-500">Page d'ouverture</span>
            <select
              value={launchView}
              onChange={(event) => onChangeLaunchView(event.target.value as AppView)}
              className="h-11 w-full rounded-lg border border-white/10 bg-[#0F1117] px-3 text-sm text-white outline-none transition focus:border-[#7C5CFF]"
            >
              {launchViewOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </article>
      </section>

      <section className="rounded-lg border border-white/10 bg-[#181B23] p-5">
        <div className="mb-3 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-white">Emplacements</h2>
            <p className="mt-1 text-sm text-zinc-500">
              Chemins utilises par Ludux pour les donnees locales.
            </p>
          </div>
          <Database className="text-[#A797FF]" size={20} aria-hidden="true" />
        </div>
        <dl>
          <DetailRow label="Base SQLite" value={overview.databasePath ?? 'Non disponible'} />
          <DetailRow label="Exports" value={overview.exportDirectory} />
          <DetailRow label="Sauvegardes" value={overview.backupDirectory} />
        </dl>
      </section>

      <ProvidersPanel
        actionResult={actionResult}
        error={error}
        overview={overview}
        isBusy={isBusy}
        onDeleteProviderConnection={onDeleteProviderConnection}
        onSyncProvider={onSyncProvider}
        onUpsertProviderConnection={onUpsertProviderConnection}
      />

      <ArchivedGamesPanel
        archivedGames={archivedGames}
        isBusy={isBusy}
        onDeleteGame={onDeleteGame}
        onRestoreGame={onRestoreGame}
      />
    </div>
  )
}
