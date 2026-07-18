import { useState } from 'react'
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

  function changeLaunchView(view: AppView) {
    setLaunchViewState(view)

    try {
      window.localStorage.setItem(LAUNCH_VIEW_STORAGE_KEY, view)
    } catch {
      // The in-memory state is still useful if localStorage is unavailable.
    }
  }

  return (
    <AppShell activeView={activeView} onNavigate={navigate}>
      {selectedGameId ? (
        <GameDetailPage
          detail={gameDetailState.detail}
          error={gameDetailState.error}
          isLoading={gameDetailState.isLoading}
          isSaving={gameDetailState.isSaving}
          onBack={() => setSelectedGameId(null)}
          onCreateChronicle={gameDetailState.createChronicle}
          onCreatePlaySession={gameDetailState.createPlaySession}
          onUpdateGame={gameDetailState.updateGame}
          onUpdateReview={gameDetailState.updateReview}
        />
      ) : null}
      {!selectedGameId && activeView === 'home' ? (
        <HomePage
          {...libraryState}
          onOpenGame={openGame}
          onOpenLibrary={() => navigate('library')}
        />
      ) : null}
      {!selectedGameId && activeView === 'library' ? (
        <LibraryPage {...libraryState} onOpenGame={openGame} />
      ) : null}
      {!selectedGameId && activeView === 'chronicles' ? (
        <ChroniclesPage
          chronicles={chroniclesState.chronicles}
          isLoading={chroniclesState.isLoading}
          error={chroniclesState.error}
          onOpenGame={openGame}
        />
      ) : null}
      {!selectedGameId && activeView === 'museum' ? (
        <MuseumPage
          games={libraryState.games}
          onOpenGame={openGame}
          onOpenLibrary={() => navigate('library')}
        />
      ) : null}
      {!selectedGameId && activeView === 'lifeBook' ? (
        <LifeBookPage
          events={lifeBookState.events}
          isLoading={lifeBookState.isLoading}
          error={lifeBookState.error}
          onOpenGame={openGame}
        />
      ) : null}
      {!selectedGameId && activeView === 'statistics' ? (
        <StatisticsPage
          statistics={statisticsState.statistics}
          isLoading={statisticsState.isLoading}
          error={statisticsState.error}
        />
      ) : null}
      {!selectedGameId && activeView === 'settings' ? (
        <SettingsPage
          overview={settingsState.overview}
          isLoading={settingsState.isLoading}
          isBusy={settingsState.isBusy}
          error={settingsState.error}
          actionResult={settingsState.actionResult}
          launchView={launchView}
          onChangeLaunchView={changeLaunchView}
          onCreateBackup={settingsState.createBackup}
          onExportLibrary={settingsState.exportLibrary}
          onOpenDataFolder={settingsState.openDataFolder}
          onRefresh={settingsState.refresh}
        />
      ) : null}
    </AppShell>
  )
}
