import { useState } from 'react'
import { AppShell } from './components/layout/AppShell'
import { useLibraryOverview } from './hooks/useLibraryOverview'
import { HomePage } from './pages/HomePage'
import { LibraryPage } from './pages/LibraryPage'
import { PlaceholderPage } from './pages/PlaceholderPage'
import type { AppView } from './types/navigation'

export default function App() {
  const [activeView, setActiveView] = useState<AppView>('home')
  const libraryState = useLibraryOverview()

  return (
    <AppShell activeView={activeView} onNavigate={setActiveView}>
      {activeView === 'home' ? (
        <HomePage {...libraryState} onOpenLibrary={() => setActiveView('library')} />
      ) : null}
      {activeView === 'library' ? <LibraryPage {...libraryState} /> : null}
      {activeView === 'chronicles' ? (
        <PlaceholderPage
          eyebrow="Chroniques"
          title="Journal des souvenirs"
          description="La prochaine etape consistera a relier les chroniques aux jeux et aux sessions."
        />
      ) : null}
      {activeView === 'museum' ? (
        <PlaceholderPage
          eyebrow="Musee"
          title="Galerie des aventures accomplies"
          description="Cet espace presentera les jeux termines comme une collection personnelle."
        />
      ) : null}
      {activeView === 'lifeBook' ? (
        <PlaceholderPage
          eyebrow="Livre de Vie"
          title="Chronologie du parcours"
          description="Le Livre de Vie organisera les chapitres par annees et periodes."
        />
      ) : null}
      {activeView === 'statistics' ? (
        <PlaceholderPage
          eyebrow="Statistiques"
          title="Les chiffres qui racontent une histoire"
          description="Les statistiques seront construites a partir des jeux, sessions et chroniques."
        />
      ) : null}
      {activeView === 'settings' ? (
        <PlaceholderPage
          eyebrow="Parametres"
          title="Controle local des donnees"
          description="Sauvegardes, exports et preferences prendront place ici."
        />
      ) : null}
    </AppShell>
  )
}
