import {
  Archive,
  Database,
  Download,
  ExternalLink,
  FolderOpen,
  HardDrive,
  Home,
  RefreshCw,
  Settings,
} from 'lucide-react'
import type { SettingsActionResult, SettingsOverview } from '../../types/settings'
import type { AppView } from '../types/navigation'
import { Button } from '../components/ui/Button'
import { formatDate } from '../utils/formatters'

interface SettingsPageProps {
  overview: SettingsOverview
  isLoading: boolean
  isBusy: boolean
  error: string | null
  actionResult: SettingsActionResult | null
  launchView: AppView
  onChangeLaunchView: (view: AppView) => void
  onCreateBackup: () => Promise<void>
  onExportLibrary: () => Promise<void>
  onOpenDataFolder: () => Promise<void>
  onRefresh: () => Promise<void>
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

export function SettingsPage({
  actionResult,
  error,
  isBusy,
  isLoading,
  launchView,
  onChangeLaunchView,
  onCreateBackup,
  onExportLibrary,
  onOpenDataFolder,
  onRefresh,
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

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-lg border border-white/10 bg-[#181B23] p-4">
          <div className="mb-5 flex items-center justify-between gap-4">
            <p className="text-sm text-zinc-500">Application</p>
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-[#7C5CFF] text-white">
              <Settings size={18} aria-hidden="true" />
            </div>
          </div>
          <p className="text-2xl font-semibold text-white">
            {isLoading ? '...' : overview.appVersion}
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
        <article className="rounded-lg border border-white/10 bg-[#181B23] p-4">
          <div className="mb-5 flex items-center justify-between gap-4">
            <p className="text-sm text-zinc-500">Page ouverte</p>
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-[#C9A646] text-[#0F1117]">
              <Home size={18} aria-hidden="true" />
            </div>
          </div>
          <p className="truncate text-2xl font-semibold text-white">
            {launchViewOptions.find((option) => option.value === launchView)?.label}
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
    </div>
  )
}
