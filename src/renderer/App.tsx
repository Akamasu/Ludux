import { useState } from 'react'
import { AppShell } from './components/layout/AppShell'
import { useChronicles } from './hooks/useChronicles'
import { useGameDetail } from './hooks/useGameDetail'
import { useLifeBook } from './hooks/useLifeBook'
import { useLibraryOverview } from './hooks/useLibraryOverview'
import { useLibraryStatistics } from './hooks/useLibraryStatistics'
import { ChroniclesPage } from './pages/ChroniclesPage'
import { GameDetailPage } from './pages/GameDetailPage'
import { HomePage } from './pages/HomePage'
import { LifeBookPage } from './pages/LifeBookPage'
import { LibraryPage } from './pages/LibraryPage'
import { MuseumPage } from './pages/MuseumPage'
import { PlaceholderPage } from './pages/PlaceholderPage'
import { StatisticsPage } from './pages/StatisticsPage'
import type { AppView } from './types/navigation'

export default function App() {
  const [activeView, setActiveView] = useState<AppView>('home')
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null)
  const libraryState = useLibraryOverview()
  const chroniclesState = useChronicles(libraryState.games)
  const lifeBookState = useLifeBook(libraryState.games)
  const statisticsState = useLibraryStatistics(libraryState.games)
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
        <PlaceholderPage
          eyebrow="Parametres"
          title="Controle local des donnees"
          description="Sauvegardes, exports et preferences prendront place ici."
        />
      ) : null}
    </AppShell>
  )
}
