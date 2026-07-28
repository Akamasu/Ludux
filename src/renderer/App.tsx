import {
  lazy,
  Suspense,
  useState,
  type ReactNode,
} from 'react'
import { AppShell } from './components/layout/AppShell'
import { useChronicles } from './hooks/useChronicles'
import { useGameDetail } from './hooks/useGameDetail'
import { useLifeBook } from './hooks/useLifeBook'
import { useLibraryOverview } from './hooks/useLibraryOverview'
import { useLibraryStatistics } from './hooks/useLibraryStatistics'
import { useSettings } from './hooks/useSettings'
import { FirstRunPage } from './pages/FirstRunPage'
import { HomePage } from './pages/HomePage'
import type { AppView } from './types/navigation'

const ChroniclesPage = lazy(() =>
  import('./pages/ChroniclesPage').then((module) => ({
    default: module.ChroniclesPage,
  })),
)
const GameDetailPage = lazy(() =>
  import('./pages/GameDetailPage').then((module) => ({
    default: module.GameDetailPage,
  })),
)
const LifeBookPage = lazy(() =>
  import('./pages/LifeBookPage').then((module) => ({
    default: module.LifeBookPage,
  })),
)
const LibraryPage = lazy(() =>
  import('./pages/LibraryPage').then((module) => ({
    default: module.LibraryPage,
  })),
)
const MuseumPage = lazy(() =>
  import('./pages/MuseumPage').then((module) => ({
    default: module.MuseumPage,
  })),
)
const SettingsPage = lazy(() =>
  import('./pages/SettingsPage').then((module) => ({
    default: module.SettingsPage,
  })),
)
const StatisticsPage = lazy(() =>
  import('./pages/StatisticsPage').then((module) => ({
    default: module.StatisticsPage,
  })),
)

const LAUNCH_VIEW_STORAGE_KEY = 'ludux.launchView'
const SETUP_ASSISTANT_STORAGE_KEY = 'ludux.setupAssistantCompleted'
const launchableViews: AppView[] = [
  'home',
  'library',
  'chronicles',
  'museum',
  'lifeBook',
  'statistics',
]

function readLaunchView(): AppView {
  try {
    const storedView = window.localStorage.getItem(LAUNCH_VIEW_STORAGE_KEY) as AppView | null

    if (storedView && launchableViews.includes(storedView)) {
      return storedView
    }
  } catch {
    return 'home'
  }

  return 'home'
}

function readSetupAssistantPending() {
  if (!window.ludux) {
    return false
  }

  try {
    return window.localStorage.getItem(SETUP_ASSISTANT_STORAGE_KEY) !== 'true'
  } catch {
    return false
  }
}

function ViewLoading() {
  return (
    <div className="grid min-h-[50vh] place-items-center" role="status">
      <div className="flex items-center gap-3 text-sm text-zinc-500">
        <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-[#7C5CFF]" />
        Ouverture...
      </div>
    </div>
  )
}

export default function App() {
  const [launchView, setLaunchViewState] = useState<AppView>(readLaunchView)
  const [isSetupAssistantPending, setIsSetupAssistantPending] = useState(
    readSetupAssistantPending,
  )
  const [entryView, setEntryView] = useState<AppView>(launchView)
  const setupSettingsState = useSettings(isSetupAssistantPending)

  function changeLaunchView(view: AppView) {
    setLaunchViewState(view)

    try {
      window.localStorage.setItem(LAUNCH_VIEW_STORAGE_KEY, view)
    } catch {
      // The in-memory state is still useful if localStorage is unavailable.
    }
  }

  function completeSetupAssistant(destination: AppView) {
    setEntryView(destination)
    setIsSetupAssistantPending(false)

    try {
      window.localStorage.setItem(SETUP_ASSISTANT_STORAGE_KEY, 'true')
    } catch {
      // The assistant can still be dismissed for the current session.
    }
  }

  function reopenSetupAssistant() {
    setIsSetupAssistantPending(true)

    try {
      window.localStorage.removeItem(SETUP_ASSISTANT_STORAGE_KEY)
    } catch {
      // The assistant still opens for the current session.
    }
  }

  if (isSetupAssistantPending) {
    return (
      <FirstRunPage
        overview={setupSettingsState.overview}
        isLoading={setupSettingsState.isLoading}
        isBusy={setupSettingsState.isBusy}
        error={setupSettingsState.error}
        onContinue={() => completeSetupAssistant(launchView)}
        onOpenConnections={() => completeSetupAssistant('settings')}
        onRefresh={setupSettingsState.refresh}
      />
    )
  }

  return (
    <MainApplication
      launchView={launchView}
      initialView={entryView}
      onChangeLaunchView={changeLaunchView}
      onOpenSetupAssistant={reopenSetupAssistant}
    />
  )
}

function MainApplication({
  initialView,
  launchView,
  onChangeLaunchView,
  onOpenSetupAssistant,
}: {
  initialView: AppView
  launchView: AppView
  onChangeLaunchView: (view: AppView) => void
  onOpenSetupAssistant: () => void
}) {
  const [activeView, setActiveView] = useState<AppView>(initialView)
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null)
  const libraryState = useLibraryOverview()
  const chroniclesState = useChronicles(
    libraryState.games,
    activeView === 'chronicles' && selectedGameId === null,
  )
  const lifeBookState = useLifeBook(
    libraryState.games,
    activeView === 'lifeBook' && selectedGameId === null,
  )
  const statisticsState = useLibraryStatistics(
    libraryState.games,
    activeView === 'statistics' && selectedGameId === null,
  )
  const settingsState = useSettings(
    activeView === 'settings' && selectedGameId === null,
  )
  const refreshLibrary = libraryState.refresh
  const refreshSettings = settingsState.refresh
  const selectedListItem =
    libraryState.games.find((game) => game.id === selectedGameId) ?? null
  const gameDetailState = useGameDetail(
    selectedGameId,
    selectedListItem,
    libraryState.refresh,
  )

  function navigate(view: AppView) {
    setSelectedGameId(null)
    setActiveView(view)
  }

  function openGame(gameId: string) {
    setSelectedGameId(gameId)
    setActiveView('library')
  }

  async function archiveGame(gameId: string) {
    await libraryState.archiveGame(gameId)
    setSelectedGameId(null)
    setActiveView('library')
  }

  async function refreshSettingsView() {
    await refreshSettings()
  }

  async function syncProvider(input: Parameters<typeof settingsState.syncProvider>[0]) {
    await settingsState.syncProvider(input)
    await refreshLibrary()
  }

  async function syncAllProviders() {
    await settingsState.syncAllProviders()
    await refreshLibrary()
  }

  let content: ReactNode = null

  if (selectedGameId) {
    content = (
      <GameDetailPage
        detail={gameDetailState.detail}
        availableDlc={gameDetailState.availableDlc}
        error={gameDetailState.error}
        syncResult={gameDetailState.syncResult}
        isLoading={gameDetailState.isLoading}
        isLoadingAvailableDlc={gameDetailState.isLoadingAvailableDlc}
        isSaving={gameDetailState.isSaving}
        onBack={() => setSelectedGameId(null)}
        onArchiveGame={archiveGame}
        onAddAvailableDlc={gameDetailState.addAvailableDlc}
        onCreateAchievement={gameDetailState.createAchievement}
        onCreateChronicle={gameDetailState.createChronicle}
        onCreateDlc={gameDetailState.createDlc}
        onCreatePlaySession={gameDetailState.createPlaySession}
        onCreateScreenshot={gameDetailState.createScreenshot}
        onDeleteAchievement={gameDetailState.deleteAchievement}
        onDeleteChronicle={gameDetailState.deleteChronicle}
        onDeleteDlc={gameDetailState.deleteDlc}
        onConfirmExternalGameLink={gameDetailState.confirmExternalGameLink}
        onDeleteExternalGameLink={gameDetailState.deleteExternalGameLink}
        onDeletePlaySession={gameDetailState.deletePlaySession}
        onDeleteScreenshot={gameDetailState.deleteScreenshot}
        onImportScreenshotFile={gameDetailState.importScreenshotFile}
        onRefreshAvailableDlc={gameDetailState.loadAvailableDlc}
        onRestoreExternalGameLink={gameDetailState.restoreExternalGameLink}
        onSyncGame={gameDetailState.syncGame}
        onUpdateAchievement={gameDetailState.updateAchievement}
        onUpdateChronicle={gameDetailState.updateChronicle}
        onUpdateDlc={gameDetailState.updateDlc}
        onUpdateGame={gameDetailState.updateGame}
        onUpdatePlaySession={gameDetailState.updatePlaySession}
        onUpdateReview={gameDetailState.updateReview}
        onUpdateScreenshot={gameDetailState.updateScreenshot}
      />
    )
  } else if (activeView === 'home') {
    content = (
      <HomePage
        {...libraryState}
        onOpenGame={openGame}
        onOpenLibrary={() => navigate('library')}
      />
    )
  } else if (activeView === 'library') {
    content = <LibraryPage {...libraryState} onOpenGame={openGame} />
  } else if (activeView === 'chronicles') {
    content = (
      <ChroniclesPage
        chronicles={chroniclesState.chronicles}
        isLoading={chroniclesState.isLoading}
        error={chroniclesState.error}
        onOpenGame={openGame}
      />
    )
  } else if (activeView === 'museum') {
    content = (
      <MuseumPage
        games={libraryState.games}
        onOpenGame={openGame}
        onOpenLibrary={() => navigate('library')}
      />
    )
  } else if (activeView === 'lifeBook') {
    content = (
      <LifeBookPage
        events={lifeBookState.events}
        isLoading={lifeBookState.isLoading}
        error={lifeBookState.error}
        onOpenGame={openGame}
      />
    )
  } else if (activeView === 'statistics') {
    content = (
      <StatisticsPage
        statistics={statisticsState.statistics}
        isLoading={statisticsState.isLoading}
        error={statisticsState.error}
      />
    )
  } else if (activeView === 'settings') {
    content = (
      <SettingsPage
        overview={settingsState.overview}
        isLoading={settingsState.isLoading}
        isBusy={settingsState.isBusy || libraryState.isSaving}
        error={settingsState.error ?? libraryState.error}
        actionResult={settingsState.actionResult}
        archivedGames={libraryState.archivedGames}
        launchView={launchView}
        onChangeLaunchView={onChangeLaunchView}
        onClearGameCache={settingsState.clearGameCache}
        onCreateBackup={settingsState.createBackup}
        onDeleteProviderConnection={settingsState.deleteProviderConnection}
        onDeleteGame={libraryState.deleteGame}
        onExportLibrary={settingsState.exportLibrary}
        onOpenSetupAssistant={onOpenSetupAssistant}
        onOpenDataFolder={settingsState.openDataFolder}
        onRefresh={refreshSettingsView}
        onRestoreGame={libraryState.restoreGame}
        onSyncAllProviders={syncAllProviders}
        onSyncProvider={syncProvider}
        onUpsertProviderConnection={settingsState.upsertProviderConnection}
      />
    )
  }

  return (
    <AppShell activeView={activeView} onNavigate={navigate}>
      <div
        key={selectedGameId ? `game-${selectedGameId}` : activeView}
        className="view-transition min-w-0"
      >
        <Suspense fallback={<ViewLoading />}>{content}</Suspense>
      </div>
    </AppShell>
  )
}
