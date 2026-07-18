import { useState } from 'react'
import { AppShell } from './components/layout/AppShell'
import { useChronicles } from './hooks/useChronicles'
import { useGameDetail } from './hooks/useGameDetail'
import { useLibraryOverview } from './hooks/useLibraryOverview'
import { useLibraryStatistics } from './hooks/useLibraryStatistics'
import { ChroniclesPage } from './pages/ChroniclesPage'
import { GameDetailPage } from './pages/GameDetailPage'
import { HomePage } from './pages/HomePage'
import { LibraryPage } from './pages/LibraryPage'
import { PlaceholderPage } from './pages/PlaceholderPage'
import { StatisticsPage } from './pages/StatisticsPage'
import type { AppView } from './types/navigation'

export default function App() {
  const [activeView, setActiveView] = useState<AppView>('home')
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null)
  const libraryState = useLibraryOverview()
  const chroniclesState = useChronicles(libraryState.games)
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
        <PlaceholderPage
          eyebrow="Musee"
          title="Galerie des aventures accomplies"
          description="Cet espace presentera les jeux termines comme une collection personnelle."
        />
      ) : null}
      {!selectedGameId && activeView === 'lifeBook' ? (
        <PlaceholderPage
          eyebrow="Livre de Vie"
          title="Chronologie du parcours"
          description="Le Livre de Vie organisera les chapitres par annees et periodes."
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
