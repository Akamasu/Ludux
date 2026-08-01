import {
  Activity,
  AlertTriangle,
  Archive,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Cloud,
  Database,
  Download,
  FolderOpen,
  HardDrive,
  KeyRound,
  Link2,
  LogIn,
  RefreshCw,
  RotateCcw,
  SlidersHorizontal,
  ShieldCheck,
  Trash2,
  Wrench,
} from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import type { GameListItem } from '../../types/game'
import type {
  DeleteProviderConnectionInput,
  LocalPlatformDetection,
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
  onClearGameCache: () => Promise<void>
  onConnectSteam: () => Promise<void>
  onCreateBackup: () => Promise<void>
  onRestoreBackup: () => Promise<void>
  onDeleteGame: (gameId: string) => Promise<void>
  onDeleteProviderConnection: (input: DeleteProviderConnectionInput) => Promise<void>
  onExportLibrary: () => Promise<void>
  onOpenSetupAssistant: () => void
  onOpenDataFolder: () => Promise<void>
  onRefresh: () => Promise<void>
  onRestoreGame: (gameId: string) => Promise<void>
  onSyncAllProviders: () => Promise<void>
  onSyncProvider: (input: SyncProviderInput) => Promise<void>
  onUpsertProviderConnection: (input: UpsertProviderConnectionInput) => Promise<void>
}

const launchViewOptions: {
  value: AppView
  label: string
}[] = [
  { value: 'home', label: 'Accueil' },
  { value: 'library', label: 'Bibliothèque' },
  { value: 'chronicles', label: 'Chroniques' },
  { value: 'museum', label: 'Musée' },
  { value: 'lifeBook', label: 'Livre de Vie' },
  { value: 'statistics', label: 'Statistiques' },
]

const providerQueueOrder = [
  'STEAM',
  'EPIC',
  'EA_APP',
  'UBISOFT',
  'BATTLENET',
  'GOG',
  'RAWG',
  'IGDB',
] as const
const providerDisplayOrder = [
  'STEAM',
  'EPIC',
  'EA_APP',
  'UBISOFT',
  'BATTLENET',
  'GOG',
  'RAWG',
  'IGDB',
] as const

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

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value))
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

function CompactPathList({ paths }: { paths: string[] }) {
  if (paths.length === 0) {
    return <span className="text-zinc-600">Aucun chemin</span>
  }

  return (
    <ul className="grid gap-1">
      {paths.slice(0, 3).map((path) => (
        <li key={path} className="truncate" title={path}>
          {path}
        </li>
      ))}
      {paths.length > 3 ? (
        <li className="text-zinc-600">+{paths.length - 3} autre(s)</li>
      ) : null}
    </ul>
  )
}

function LocalPlatformCard({ platform }: { platform: LocalPlatformDetection }) {
  const allPaths = Array.from(
    new Set([...platform.libraryPaths, ...platform.rootPaths, ...platform.configPaths]),
  )

  return (
    <article className="rounded-lg border border-white/10 bg-[#121620] p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate font-semibold text-white">{platform.label}</h3>
          <p className="mt-1 text-sm leading-5 text-zinc-500">{platform.message}</p>
        </div>
        <span
          className={`shrink-0 rounded-lg px-2.5 py-1 text-xs font-medium ${
            platform.detected
              ? 'bg-[#4F7CFF]/10 text-[#C9D6FF]'
              : 'bg-white/7 text-zinc-500'
          }`}
        >
          {platform.detected ? 'Détecté' : 'Absent'}
        </span>
      </div>

      <div className="mt-4 grid gap-3 text-xs text-zinc-400">
        <div className="grid grid-cols-[110px_1fr] gap-3">
          <span className="text-zinc-600">Sources locales</span>
          <span>{platform.manifestCount}</span>
        </div>
        <div className="grid grid-cols-[110px_1fr] gap-3">
          <span className="text-zinc-600">Chemins</span>
          <CompactPathList paths={allPaths} />
        </div>
      </div>
    </article>
  )
}

function LocalPlatformsPanel({ overview }: { overview: SettingsOverview }) {
  const localOverview = overview.localPlatformOverview

  return (
    <section className="rounded-lg border border-white/10 bg-[#181B23] p-5">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-white">Plateformes locales</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Chemins détectés automatiquement pour préparer les synchronisations PC.
          </p>
        </div>
        <div className="grid h-10 w-10 place-items-center rounded-lg bg-[#4F7CFF]/10 text-[#C9D6FF]">
          <HardDrive size={18} aria-hidden="true" />
        </div>
      </div>

      <div className="mb-5 grid gap-3 md:grid-cols-2">
        <div className="rounded-lg border border-white/10 bg-[#121620] p-3">
          <p className="text-xs text-zinc-500">Détectées</p>
          <p className="mt-1 text-xl font-semibold text-white">
            {localOverview.detectedCount}/{localOverview.platforms.length}
          </p>
        </div>
        <div className="rounded-lg border border-white/10 bg-[#121620] p-3">
          <p className="text-xs text-zinc-500">Dernier scan</p>
          <p className="mt-1 truncate text-xl font-semibold text-white">
            {formatDate(localOverview.scannedAt)}
          </p>
        </div>
      </div>

      {localOverview.platforms.length === 0 ? (
        <p className="rounded-lg border border-dashed border-white/15 bg-[#121620] p-4 text-sm text-zinc-500">
          Diagnostic disponible dans la fenêtre Electron de Ludux.
        </p>
      ) : (
        <div className="grid gap-3 xl:grid-cols-3">
          {localOverview.platforms.map((platform) => (
            <LocalPlatformCard key={platform.provider} platform={platform} />
          ))}
        </div>
      )}
    </section>
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

function CacheStoragePanel({
  isBusy,
  onClearGameCache,
  overview,
}: {
  isBusy: boolean
  onClearGameCache: () => Promise<void>
  overview: SettingsOverview
}) {
  const cache = overview.cacheOverview
  const usagePercent =
    cache.maxSizeBytes > 0
      ? Math.min(100, Math.round((cache.sizeBytes / cache.maxSizeBytes) * 100))
      : 0

  return (
    <section className="rounded-lg border border-white/10 bg-[#181B23] p-5">
      <div className="mb-5 flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
        <div>
          <h2 className="text-lg font-semibold text-white">Cache d'affichage</h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-zinc-500">
            Jaquettes et métadonnées locales utilisées pour accélérer les écrans, sans
            copier les dossiers de jeux.
          </p>
        </div>
        <Button
          type="button"
          variant="secondary"
          onClick={onClearGameCache}
          disabled={isBusy || cache.sizeBytes === 0}
          className="w-full border-rose-400/30 bg-rose-400/10 text-rose-100 hover:border-rose-300/60 hover:bg-rose-400/15 lg:w-auto"
        >
          <Trash2 size={17} aria-hidden="true" />
          Vider le cache
        </Button>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <div className="rounded-lg border border-white/10 bg-[#121620] p-3">
          <p className="text-xs text-zinc-500">Poids</p>
          <p className="mt-1 text-xl font-semibold text-white">
            {formatBytes(cache.sizeBytes)}
          </p>
        </div>
        <div className="rounded-lg border border-white/10 bg-[#121620] p-3">
          <p className="text-xs text-zinc-500">Limite</p>
          <p className="mt-1 text-xl font-semibold text-white">
            {formatBytes(cache.maxSizeBytes)}
          </p>
        </div>
        <div className="rounded-lg border border-white/10 bg-[#121620] p-3">
          <p className="text-xs text-zinc-500">Jaquettes</p>
          <p className="mt-1 text-xl font-semibold text-white">{cache.coverFiles}</p>
        </div>
        <div className="rounded-lg border border-white/10 bg-[#121620] p-3">
          <p className="text-xs text-zinc-500">Métadonnées</p>
          <p className="mt-1 text-xl font-semibold text-white">{cache.metadataFiles}</p>
        </div>
      </div>

      <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/7">
        <div
          className="h-full rounded-full bg-[#7C5CFF] transition-all duration-300"
          style={{ width: `${usagePercent}%` }}
        />
      </div>
      <p className="mt-2 text-xs text-zinc-600">{usagePercent}% de la limite locale</p>
    </section>
  )
}

function providerStatusLabel(
  connection: ProviderConnection,
  overview: SettingsOverview,
) {
  if (
    isLocalLibraryProvider(connection) &&
    localPlatformForProvider(overview, connection)?.detected
  ) {
    return connection.sync?.status === 'SYNCED' ? 'Synchronisé' : 'Détecté'
  }

  if (!connection.configured) {
    return 'À configurer'
  }

  if (connection.sync?.status === 'SYNCED') {
    return 'Synchronisé'
  }

  if (connection.sync?.status === 'SYNCING') {
    return 'En cours'
  }

  if (connection.sync?.status === 'ERROR') {
    return 'Erreur'
  }

  if (connection.sync?.status === 'READY') {
    return 'Prêt'
  }

  return connection.sync?.status ?? 'Local'
}

function syncStatusLabel(status: string | null) {
  if (status === 'SYNCED') {
    return 'Synchronisé'
  }

  if (status === 'SYNCING') {
    return 'En cours'
  }

  if (status === 'ERROR') {
    return 'Erreur'
  }

  if (status === 'READY') {
    return 'Prêt'
  }

  return status ?? 'En attente'
}

function syncStatusClassName(status: string | null) {
  if (status === 'SYNCED') {
    return 'border-emerald-400/25 bg-emerald-400/10 text-emerald-100'
  }

  if (status === 'SYNCING') {
    return 'border-[#7C5CFF]/30 bg-[#7C5CFF]/10 text-[#D8D0FF]'
  }

  if (status === 'ERROR') {
    return 'border-rose-400/30 bg-rose-400/10 text-rose-100'
  }

  if (status === 'READY') {
    return 'border-[#4F7CFF]/25 bg-[#4F7CFF]/10 text-[#C9D6FF]'
  }

  return 'border-white/10 bg-white/7 text-zinc-400'
}

function SyncStatusIcon({ status }: { status: string | null }) {
  if (status === 'SYNCED') {
    return <CheckCircle2 size={16} aria-hidden="true" />
  }

  if (status === 'ERROR') {
    return <AlertTriangle size={16} aria-hidden="true" />
  }

  if (status === 'SYNCING') {
    return <RefreshCw size={16} aria-hidden="true" className="animate-spin" />
  }

  return <Clock3 size={16} aria-hidden="true" />
}

function providerExternalIdLabel(provider: ProviderConnection) {
  if (provider.provider === 'STEAM') {
    return 'SteamID64'
  }

  if (provider.provider === 'RAWG') {
    return 'Catalogue'
  }

  if (provider.provider === 'IGDB') {
    return 'Client ID Twitch/IGDB'
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

  if (provider.provider === 'IGDB') {
    return 'Client ID'
  }

  return 'SteamID, gamertag, pseudo, clé publique...'
}

function providerTokenLabel(provider: ProviderConnection) {
  if (provider.provider === 'STEAM') {
    return 'Clé API Steam'
  }

  if (provider.provider === 'RAWG') {
    return 'Clé API RAWG'
  }

  if (provider.provider === 'IGDB') {
    return 'Client Secret IGDB'
  }

  return 'Indice token'
}

function providerDefaultExternalId(provider: ProviderConnection) {
  return provider.provider === 'RAWG' ? 'catalogue' : ''
}

function localPlatformForProvider(
  overview: SettingsOverview,
  provider: ProviderConnection | undefined,
) {
  return overview.localPlatformOverview.platforms.find(
    (platform) => platform.provider === provider?.provider,
  )
}

function isLocalLibraryProvider(provider: ProviderConnection | undefined) {
  return (
    provider?.provider === 'EPIC' ||
    provider?.provider === 'EA_APP' ||
    provider?.provider === 'UBISOFT' ||
    provider?.provider === 'BATTLENET' ||
    provider?.provider === 'GOG'
  )
}

function isSyncableProvider(provider: ProviderConnection | undefined) {
  return (
    provider?.provider === 'STEAM' ||
    provider?.provider === 'EPIC' ||
    provider?.provider === 'EA_APP' ||
    provider?.provider === 'UBISOFT' ||
    provider?.provider === 'BATTLENET' ||
    provider?.provider === 'GOG' ||
    provider?.provider === 'IGDB' ||
    provider?.provider === 'RAWG'
  )
}

function canSyncProvider(
  provider: ProviderConnection | undefined,
  overview: SettingsOverview,
) {
  if (!provider || !isSyncableProvider(provider)) {
    return false
  }

  if (isLocalLibraryProvider(provider)) {
    const localPlatform = localPlatformForProvider(overview, provider)
    return Boolean(
      localPlatform?.detected &&
      localPlatform.manifestCount > 0,
    )
  }

  if (
    (provider.provider === 'RAWG' || provider.provider === 'IGDB') &&
    provider.configured
  ) {
    return true
  }

  if (!provider.account) {
    return false
  }

  return provider.provider === 'STEAM' || provider.account.hasToken
}

function providerTokenPlaceholder(provider: ProviderConnection) {
  if (provider.provider === 'STEAM') {
    return provider.account?.hasToken
      ? 'Laisser vide pour conserver la clé existante'
      : 'Optionnel pour la bibliothèque locale'
  }

  if (provider.provider === 'RAWG') {
    return provider.account?.hasToken
      ? 'Laisser vide pour conserver la clé existante'
      : 'Clé fournie par RAWG'
  }

  if (provider.provider === 'IGDB') {
    return provider.account?.hasToken
      ? 'Laisser vide pour conserver le secret existant'
      : 'Secret fourni par Twitch'
  }

  return 'Optionnel'
}

function SyncActivityPanel({ overview }: { overview: SettingsOverview }) {
  const providersById = new Map(
    overview.providerOverview.providers.map((provider) => [provider.provider, provider]),
  )
  const queueProviders = providerQueueOrder
    .map((provider) => providersById.get(provider))
    .filter((provider): provider is ProviderConnection => provider !== undefined)

  return (
    <section className="rounded-lg border border-white/10 bg-[#181B23] p-5">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-white">Activité de synchronisation</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Ordre d'exécution et derniers événements des plateformes connectées.
          </p>
        </div>
        <div className="grid h-10 w-10 place-items-center rounded-lg bg-[#7C5CFF]/10 text-[#D8D0FF]">
          <Activity size={18} aria-hidden="true" />
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <div>
          <h3 className="text-sm font-semibold text-white">File active</h3>
          <div className="mt-3 grid gap-2">
            {queueProviders.map((provider, index) => {
              const canRun = canSyncProvider(provider, overview)
              const status = provider.sync?.status ?? (canRun ? 'READY' : null)

              return (
                <article
                  key={provider.provider}
                  className="grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-lg border border-white/10 bg-[#121620] p-3"
                >
                  <span className="grid h-7 w-7 place-items-center rounded-lg bg-[#0F1117] text-xs font-semibold text-zinc-400">
                    {index + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-white">
                      {provider.label}
                    </p>
                    <p className="mt-1 truncate text-xs text-zinc-500">
                      {provider.sync?.lastSync
                        ? `Dernier passage : ${formatDateTime(provider.sync.lastSync)}`
                        : canRun
                          ? 'Prêt pour la prochaine synchronisation'
                          : 'Non prêt'}
                    </p>
                  </div>
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-lg border px-2 py-1 text-xs ${syncStatusClassName(status)}`}
                  >
                    <SyncStatusIcon status={status} />
                    {syncStatusLabel(status)}
                  </span>
                </article>
              )
            })}
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-white">Derniers événements</h3>
          {overview.providerOverview.activity.length === 0 ? (
            <p className="mt-3 rounded-lg border border-dashed border-white/15 bg-[#121620] p-4 text-sm text-zinc-500">
              Aucun événement de synchronisation enregistré pour le moment.
            </p>
          ) : (
            <div className="mt-3 grid max-h-96 gap-2 overflow-y-auto pr-1">
              {overview.providerOverview.activity.map((item) => (
                <article
                  key={item.id}
                  className="rounded-lg border border-white/10 bg-[#121620] p-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-white">
                        {item.providerLabel}
                      </p>
                      <p className="mt-1 text-xs text-zinc-500">
                        {formatDateTime(item.updatedAt)}
                      </p>
                    </div>
                    <span
                      className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg border px-2 py-1 text-xs ${syncStatusClassName(item.status)}`}
                    >
                      <SyncStatusIcon status={item.status} />
                      {syncStatusLabel(item.status)}
                    </span>
                  </div>
                  {item.message ? (
                    <p className="mt-3 line-clamp-2 text-sm leading-5 text-zinc-400">
                      {item.message}
                    </p>
                  ) : null}
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

function ProvidersPanel({
  isBusy,
  overview,
  onConnectSteam,
  onDeleteProviderConnection,
  onSyncAllProviders,
  onSyncProvider,
  onUpsertProviderConnection,
}: {
  isBusy: boolean
  overview: SettingsOverview
  onConnectSteam: () => Promise<void>
  onDeleteProviderConnection: (input: DeleteProviderConnectionInput) => Promise<void>
  onSyncAllProviders: () => Promise<void>
  onSyncProvider: (input: SyncProviderInput) => Promise<void>
  onUpsertProviderConnection: (input: UpsertProviderConnectionInput) => Promise<void>
}) {
  const providers = providerDisplayOrder
    .map((providerId) =>
      overview.providerOverview.providers.find(
        (provider) => provider.provider === providerId,
      ),
    )
    .filter((provider): provider is ProviderConnection => provider !== undefined)
  const [selectedProviderId, setSelectedProviderId] = useState(
    providers[0]?.provider ?? 'STEAM',
  )
  const selectedProvider =
    providers.find((provider) => provider.provider === selectedProviderId) ?? providers[0]
  const [externalId, setExternalId] = useState('')
  const [username, setUsername] = useState('')
  const [tokenHint, setTokenHint] = useState('')
  const [formError, setFormError] = useState<string | null>(null)
  const [showSteamAdvanced, setShowSteamAdvanced] = useState(false)
  const trimmedExternalId = externalId.trim()
  const isSteamProvider = selectedProvider?.provider === 'STEAM'
  const isRawgProvider = selectedProvider?.provider === 'RAWG'
  const isIgdbProvider = selectedProvider?.provider === 'IGDB'
  const selectedLocalPlatform = localPlatformForProvider(overview, selectedProvider)
  const selectedProviderCanSync = canSyncProvider(selectedProvider, overview)
  const selectedLocalPlatformDetected = Boolean(selectedLocalPlatform?.detected)

  useEffect(() => {
    setExternalId(
      selectedProvider?.account?.externalId ??
        (selectedProvider ? providerDefaultExternalId(selectedProvider) : ''),
    )
    setUsername(selectedProvider?.account?.username ?? '')
    setTokenHint('')
    setFormError(null)
    setShowSteamAdvanced(
      selectedProvider?.account?.connectionMode === 'PERSONAL_API_KEY' ||
        !overview.luduxConnect.available,
    )
  }, [overview.luduxConnect.available, selectedProvider])

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
    if (!selectedProvider || !selectedProviderCanSync) {
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
          <h2 className="text-lg font-semibold text-white">Connexions</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Comptes et services utilisés pour enrichir ou importer la bibliothèque.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="secondary"
            onClick={onSyncAllProviders}
            disabled={isBusy}
            className="h-10 px-3"
          >
            <RefreshCw
              size={16}
              aria-hidden="true"
              className={isBusy ? 'animate-spin' : undefined}
            />
            {isBusy ? 'Synchronisation...' : 'Synchroniser tout'}
          </Button>
          <Cloud className="text-[#8CA7FF]" size={20} aria-hidden="true" />
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="grid gap-2 sm:grid-cols-2">
          {providers.map((provider) => {
            const isSelected = provider.provider === selectedProvider?.provider
            const isReady = canSyncProvider(provider, overview)

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
                      provider.configured || isReady
                        ? 'bg-[#4F7CFF]/10 text-[#C9D6FF]'
                        : 'bg-white/7 text-zinc-500'
                    }`}
                  >
                    {providerStatusLabel(provider, overview)}
                  </span>
                </span>
                <span className="mt-2 line-clamp-2 block text-sm leading-5 text-zinc-500">
                  {provider.description}
                </span>
              </button>
            )
          })}
        </div>

        {selectedProvider && isLocalLibraryProvider(selectedProvider) ? (
          <div className="border-t border-white/10 pt-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-base font-semibold text-white">
                  {selectedProvider.label}
                </h3>
                <p className="mt-1 text-sm leading-6 text-zinc-500">
                  {selectedProvider.description}
                </p>
              </div>
              <ShieldCheck className="text-[#A797FF]" size={20} aria-hidden="true" />
            </div>

            <div
              className={`mt-5 rounded-lg border px-4 py-4 text-sm ${
                selectedProviderCanSync
                  ? 'border-emerald-400/25 bg-emerald-400/10 text-emerald-100'
                  : 'border-white/10 bg-[#0F1117] text-zinc-400'
              }`}
            >
              <p className="font-medium">
                {selectedProviderCanSync
                  ? `${selectedProvider.label} est prêt`
                  : selectedLocalPlatformDetected
                    ? `${selectedProvider.label} est détecté`
                  : `${selectedProvider.label} n'a pas été trouvé`}
              </p>
              <p className="mt-1 leading-6 opacity-80">
                {selectedProviderCanSync
                  ? `${selectedLocalPlatform?.manifestCount ?? 0} jeu(x) prêt(s) à synchroniser depuis cet ordinateur.`
                  : selectedLocalPlatformDetected
                    ? 'Aucun jeu installé à importer pour le moment.'
                  : 'Ouvrez la plateforme une première fois, puis relancez la détection.'}
              </p>
            </div>

            {selectedProviderCanSync ? (
              <Button
                type="button"
                variant="secondary"
                onClick={handleSyncProvider}
                disabled={isBusy}
                className="mt-5"
              >
                <RefreshCw
                  size={17}
                  aria-hidden="true"
                  className={isBusy ? 'animate-spin' : undefined}
                />
                {isBusy ? 'Synchronisation...' : `Synchroniser ${selectedProvider.label}`}
              </Button>
            ) : null}
          </div>
        ) : selectedProvider ? (
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

            {isSteamProvider ? (
              <div className="mt-5 border-l-2 border-[#7C5CFF]/60 bg-[#121620] px-4 py-4">
                <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
                  <div>
                    <p className="font-medium text-white">
                      {selectedProvider.account?.connectionMode === 'LUDUX_CONNECT'
                        ? 'Compte Steam connecté'
                        : 'Connexion Steam simplifiée'}
                    </p>
                    <p className="mt-1 text-sm leading-6 text-zinc-400">
                      {overview.luduxConnect.available
                        ? 'Steam s’ouvre dans votre navigateur. Aucun mot de passe ni clé API n’est demandé par Ludux.'
                        : 'La connexion simplifiée sera disponible dès que le service Ludux Connect sera activé.'}
                    </p>
                  </div>
                  <Button
                    type="button"
                    onClick={onConnectSteam}
                    disabled={isBusy || !overview.luduxConnect.available}
                    className="shrink-0"
                  >
                    <LogIn size={17} aria-hidden="true" />
                    {isBusy
                      ? 'Connexion...'
                      : selectedProvider.account?.connectionMode === 'LUDUX_CONNECT'
                        ? 'Reconnecter'
                        : 'Se connecter'}
                  </Button>
                </div>

                {overview.luduxConnect.available ? (
                  <button
                    type="button"
                    onClick={() => setShowSteamAdvanced((current) => !current)}
                    className="mt-4 inline-flex items-center gap-2 text-xs font-medium text-zinc-500 transition hover:text-zinc-300"
                  >
                    <KeyRound size={14} aria-hidden="true" />
                    {showSteamAdvanced
                      ? 'Masquer la configuration avancée'
                      : 'Utiliser une clé personnelle'}
                  </button>
                ) : null}
              </div>
            ) : null}

            {!isSteamProvider || showSteamAdvanced ? (
              <div className="mt-5 grid gap-3">
              {!isRawgProvider ? (
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
                  {isIgdbProvider ? (
                    <span className="mt-2 block text-xs text-zinc-600">
                      Identifiant de l'application Twitch utilisée par IGDB.
                    </span>
                  ) : null}
                </label>
              ) : null}

              <div className={`grid gap-3 ${isSteamProvider ? 'md:grid-cols-2' : ''}`}>
                {isSteamProvider ? (
                  <label>
                    <span className="mb-2 block text-xs font-medium text-zinc-500">
                      Nom affiché
                    </span>
                    <input
                      value={username}
                      onChange={(event) => setUsername(event.target.value)}
                      placeholder="Compte principal"
                      className="h-11 w-full rounded-lg border border-white/10 bg-[#0F1117] px-3 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-[#7C5CFF]"
                    />
                  </label>
                ) : null}
                <label>
                  <span className="mb-2 block text-xs font-medium text-zinc-500">
                    {providerTokenLabel(selectedProvider)}
                  </span>
                  <input
                    type={isSteamProvider || isRawgProvider || isIgdbProvider ? 'password' : 'text'}
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
                      Clé configurée. Sa valeur n'est pas affichée.
                    </span>
                  ) : null}
                </label>
              </div>
              </div>
            ) : null}

            <div className="mt-5 flex flex-wrap items-center gap-3">
              {!isSteamProvider || showSteamAdvanced ? (
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
              ) : null}
              {isSyncableProvider(selectedProvider) ? (
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
              {formError ? (
                <div className="rounded-lg border border-rose-400/30 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
                  {formError}
                </div>
              ) : null}
            </div>

            {selectedProvider.account && !isRawgProvider ? (
              <div className="mt-5 rounded-lg border border-white/10 bg-[#0F1117] p-3 text-sm text-zinc-400">
                <p className="font-medium text-white">
                  {selectedProvider.account.username ?? selectedProvider.account.externalId}
                </p>
                <p className="mt-1 truncate text-xs text-zinc-500">
                  {selectedProvider.account.externalId}
                </p>
                <p className="mt-2 text-xs text-zinc-600">
                  Mis à jour le {formatDate(selectedProvider.account.updatedAt)}
                </p>
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
      `Supprimer définitivement "${game.title}" ? Cette action supprimera aussi ses sessions, chroniques et souvenirs.`,
    )

    if (confirmed) {
      await onDeleteGame(game.id)
    }
  }

  return (
    <section className="rounded-lg border border-white/10 bg-[#181B23] p-5">
      <div className="mb-5 flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-white">Jeux archivés</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Les jeux archivés quittent la bibliothèque active sans perdre leurs données.
          </p>
        </div>
        <Archive className="text-[#A797FF]" size={20} aria-hidden="true" />
      </div>

      {archivedGames.length === 0 ? (
        <p className="rounded-lg border border-dashed border-white/15 bg-[#121620] p-4 text-sm text-zinc-500">
          Aucun jeu archivé pour le moment.
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
                  {game.platforms.join(', ') || 'Plateforme non renseignée'}
                </p>
                <p className="mt-2 text-xs text-zinc-600">
                  Archivé le {formatDate(game.updatedAt)} / {game.rating ? `${game.rating}/10` : 'Non noté'}
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
  onClearGameCache,
  onConnectSteam,
  onCreateBackup,
  onRestoreBackup,
  onDeleteGame,
  onDeleteProviderConnection,
  onExportLibrary,
  onOpenDataFolder,
  onOpenSetupAssistant,
  onRefresh,
  onRestoreGame,
  onSyncAllProviders,
  onSyncProvider,
  onUpsertProviderConnection,
  overview,
}: SettingsPageProps) {
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false)

  return (
    <div className="flex flex-1 flex-col gap-7">
      <header className="flex flex-col items-start justify-between gap-4 border-b border-white/10 pb-7 sm:flex-row">
        <div>
          <p className="text-sm font-medium text-[#A797FF]">Ludux</p>
          <h1 className="mt-2 text-3xl font-semibold text-white sm:text-4xl">Paramètres</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400">
            Gérez vos connexions, la synchronisation et vos préférences.
          </p>
        </div>
        <div className="flex w-full items-center justify-between gap-3 sm:w-auto sm:justify-end">
          <span className="text-sm text-zinc-500">
            {isLoading ? 'Ludux' : `Ludux ${formatAppVersion(overview.appVersion)}`}
          </span>
          <button
            type="button"
            title="Actualiser"
            aria-label="Actualiser les paramètres"
            onClick={() => void onRefresh()}
            disabled={isBusy}
            className="grid h-11 w-11 place-items-center rounded-lg border border-white/10 bg-white/5 text-zinc-300 transition hover:border-[#7C5CFF]/40 hover:bg-[#7C5CFF]/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCw
              size={17}
              aria-hidden="true"
              className={isLoading ? 'animate-spin' : undefined}
            />
          </button>
        </div>
      </header>

      {error ? (
        <div className="rounded-lg border border-rose-400/30 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
          {error}
        </div>
      ) : null}

      {actionResult ? <ResultMessage result={actionResult} /> : null}

      <ProvidersPanel
        overview={overview}
        isBusy={isBusy}
        onConnectSteam={onConnectSteam}
        onDeleteProviderConnection={onDeleteProviderConnection}
        onSyncAllProviders={onSyncAllProviders}
        onSyncProvider={onSyncProvider}
        onUpsertProviderConnection={onUpsertProviderConnection}
      />

      <section className="grid gap-4 xl:grid-cols-2">
        <article className="rounded-lg border border-white/10 bg-[#181B23] p-5">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-white">Préférences</h2>
              <p className="mt-1 text-sm text-zinc-500">
                Choisissez votre page de départ.
              </p>
            </div>
            <SlidersHorizontal className="text-[#8CA7FF]" size={20} aria-hidden="true" />
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

          <Button
            type="button"
            variant="secondary"
            onClick={onOpenSetupAssistant}
            disabled={isBusy}
            className="mt-4 w-full"
          >
            <HardDrive size={17} aria-hidden="true" />
            Revoir la détection des plateformes
          </Button>
        </article>

        <article className="rounded-lg border border-white/10 bg-[#181B23] p-5">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-white">Sauvegarde</h2>
              <p className="mt-1 text-sm text-zinc-500">
                Protégez votre bibliothèque et vos souvenirs.
              </p>
            </div>
            <Archive className="text-[#A797FF]" size={20} aria-hidden="true" />
          </div>

          <p className="mb-4 text-sm text-zinc-400">
            Dernière sauvegarde :{' '}
            <span className="font-medium text-white">
              {overview.lastBackupAt ? formatDate(overview.lastBackupAt) : 'aucune'}
            </span>
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            <Button
              type="button"
              onClick={onCreateBackup}
              disabled={isBusy}
              className="w-full"
            >
              <Archive size={17} aria-hidden="true" />
              Créer une sauvegarde
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={onRestoreBackup}
              disabled={isBusy}
              className="w-full"
            >
              <RotateCcw size={17} aria-hidden="true" />
              Restaurer
            </Button>
          </div>
          <p className="mt-3 text-xs leading-5 text-zinc-500">
            Avant une restauration, Ludux conserve automatiquement la bibliothèque actuelle.
          </p>
        </article>
      </section>

      {archivedGames.length > 0 ? (
        <ArchivedGamesPanel
          archivedGames={archivedGames}
          isBusy={isBusy}
          onDeleteGame={onDeleteGame}
          onRestoreGame={onRestoreGame}
        />
      ) : null}

      <section>
        <button
          type="button"
          aria-expanded={isAdvancedOpen}
          onClick={() => setIsAdvancedOpen((current) => !current)}
          className="flex w-full items-center justify-between gap-4 rounded-lg border border-white/10 bg-[#181B23] p-5 text-left transition hover:border-white/20"
        >
          <span className="flex min-w-0 items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-white/5 text-zinc-400">
              <Wrench size={18} aria-hidden="true" />
            </span>
            <span className="min-w-0">
              <span className="block font-semibold text-white">Outils avancés</span>
              <span className="mt-1 block text-sm text-zinc-500">
                Maintenance, chemins et diagnostic
              </span>
            </span>
          </span>
          <ChevronDown
            size={18}
            aria-hidden="true"
            className={`shrink-0 text-zinc-500 transition-transform ${
              isAdvancedOpen ? 'rotate-180' : ''
            }`}
          />
        </button>

        {isAdvancedOpen ? (
          <div className="view-transition mt-4 grid gap-4">
            <CacheStoragePanel
              isBusy={isBusy}
              overview={overview}
              onClearGameCache={onClearGameCache}
            />

            <section className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
              <article className="rounded-lg border border-white/10 bg-[#181B23] p-5">
                <div className="mb-5 flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-semibold text-white">Données locales</h2>
                    <p className="mt-1 text-sm text-zinc-500">
                      Export et accès aux fichiers Ludux.
                    </p>
                  </div>
                  <FolderOpen className="text-[#A797FF]" size={20} aria-hidden="true" />
                </div>
                <div className="grid gap-3">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={onExportLibrary}
                    disabled={isBusy}
                  >
                    <Download size={17} aria-hidden="true" />
                    Exporter en JSON
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={onOpenDataFolder}
                    disabled={isBusy}
                  >
                    <FolderOpen size={17} aria-hidden="true" />
                    Ouvrir le dossier local
                  </Button>
                </div>
              </article>

              <article className="rounded-lg border border-white/10 bg-[#181B23] p-5">
                <div className="mb-3 flex items-center justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-semibold text-white">Emplacements Ludux</h2>
                    <p className="mt-1 text-sm text-zinc-500">
                      Fichiers utilisés sur cet ordinateur.
                    </p>
                  </div>
                  <Database className="text-[#A797FF]" size={20} aria-hidden="true" />
                </div>
                <dl>
                  <DetailRow label="Base locale" value={overview.databasePath ?? 'Non disponible'} />
                  <DetailRow label="Exports" value={overview.exportDirectory} />
                  <DetailRow label="Sauvegardes" value={overview.backupDirectory} />
                </dl>
              </article>
            </section>

            <LocalPlatformsPanel overview={overview} />
            <SyncActivityPanel overview={overview} />
          </div>
        ) : null}
      </section>
    </div>
  )
}
