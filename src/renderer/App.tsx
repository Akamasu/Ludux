import { useCallback, useState, type ReactNode } from 'react'
import { AppShell } from './components/layout/AppShell'
import { useChronicles } from './hooks/useChronicles'
import { useGameDetail } from './hooks/useGameDetail'
import { useLifeBook } from './hooks/useLifeBook'
import { useLibraryOverview } from './hooks/useLibraryOverview'
import { useLibraryStatistics } from './hooks/useLibraryStatistics'
import { useSettings } from './hooks/useSettings'
import { ChroniclesPage } from './pages/ChroniclesPage'
import { GameDetailPage } from './pages/GameDetailPage'
import { HomePage } from './pages/HomePage'
import { LifeBookPage } from './pages/LifeBookPage'
import { LibraryPage } from './pages/LibraryPage'
import { MuseumPage } from './pages/MuseumPage'
import { SettingsPage } from './pages/SettingsPage'
import { StatisticsPage } from './pages/StatisticsPage'
import type { AppView } from './types/navigation'

const LAUNCH_VIEW_STORAGE_KEY = 'ludux.launchView'
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

export default function App() {
  const [launchView, setLaunchViewState] = useState<AppView>(readLaunchView)
  const [activeView, setActiveView] = useState<AppView>(() => launchView)
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null)
  const libraryState = useLibraryOverview()
  const chroniclesState = useChronicles(libraryState.games)
  const lifeBookState = useLifeBook(libraryState.games)
  const statisticsState = useLibraryStatistics(libraryState.games)
  const settingsState = useSettings()
  const refreshChronicles = chroniclesState.refresh
  const refreshLibrary = libraryState.refresh
  const refreshLifeBook = lifeBookState.refresh
  const refreshSettings = settingsState.refresh
  const refreshStatistics = statisticsState.refresh
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

  const refreshContent = useCallback(async () => {
    await Promise.all([
      refreshLibrary(),
      refreshChronicles(),
      refreshLifeBook(),
      refreshStatistics(),
    ])
  }, [
    refreshChronicles,
    refreshLibrary,
    refreshLifeBook,
    refreshStatistics,
  ])

  async function refreshSettingsView() {
    await Promise.all([refreshSettings(), refreshContent()])
  }

  async function syncProvider(input: Parameters<typeof settingsState.syncProvider>[0]) {
    await settingsState.syncProvider(input)
    await refreshContent()
  }

  async function syncAllProviders() {
    await settingsState.syncAllProviders()
    await refreshContent()
  }

  function changeLaunchView(view: AppView) {
    setLaunchViewState(view)

    try {
      window.localStorage.setItem(LAUNCH_VIEW_STORAGE_KEY, view)
    } catch {
      // The in-memory state is still useful if localStorage is unavailable.
    }
  }

  let content: ReactNode = null

  if (selectedGameId) {
    content = (
      <GameDetailPage
        detail={gameDetailState.detail}
        availableDlc={gameDetailState.availableDlc}
        error={gameDetailState.error}
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
        onDeleteExternalGameLink={gameDetailState.deleteExternalGameLink}
        onDeletePlaySession={gameDetailState.deletePlaySession}
        onDeleteScreenshot={gameDetailState.deleteScreenshot}
        onImportScreenshotFile={gameDetailState.importScreenshotFile}
        onRefreshAvailableDlc={gameDetailState.loadAvailableDlc}
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
        onChangeLaunchView={changeLaunchView}
        onCreateBackup={settingsState.createBackup}
        onDeleteProviderConnection={settingsState.deleteProviderConnection}
        onDeleteGame={libraryState.deleteGame}
        onExportLibrary={settingsState.exportLibrary}
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
        {content}
      </div>
    </AppShell>
  )
}
