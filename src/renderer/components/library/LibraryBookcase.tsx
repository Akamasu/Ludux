import { ChevronLeft, ChevronRight } from 'lucide-react'
import { type CSSProperties, useEffect, useMemo, useState } from 'react'
import { GAME_STATUS_LABELS, type GameListItem } from '../../../types/game'
import { cn } from '../../../utils/cn'
import { formatHours } from '../../utils/formatters'

interface LibraryBookcaseProps {
  games: GameListItem[]
  onOpen?: (gameId: string) => void
}

interface GenreShelf {
  id: string
  label: string
  subtitle: string
  accent: string
  palette: string[]
  keywords: string[]
}

interface BookcaseShelf {
  id: string
  games: GameListItem[]
}

interface BookcasePage {
  id: string
  label: string
  shelves: BookcaseShelf[]
}

type BookSpineStyle = CSSProperties & {
  '--book-accent': string
  '--book-color': string
  '--book-height': string
  '--book-span': string
}

interface GenreLegendItem {
  genre: GenreShelf
  count: number
}

const booksPerShelf = 8
const shelvesPerPage = 2

const genreShelves: GenreShelf[] = [
  {
    id: 'simulation',
    label: 'Simulation',
    subtitle: 'Mondes persistants, gestion et expériences contemplatives.',
    accent: '#8BC7FF',
    palette: ['#274C77', '#3B6EA5', '#2D5F73', '#415A77'],
    keywords: [
      'sim',
      'simulator',
      'simulation',
      'farming',
      'truck',
      'flight',
      'planet',
      'cities',
      'hunter',
      'thehunter',
      'manager',
    ],
  },
  {
    id: 'rpg',
    label: 'RPG',
    subtitle: 'Quêtes longues, builds, choix et grands voyages.',
    accent: '#A797FF',
    palette: ['#4B367C', '#5B3F93', '#37215F', '#6D4ED8'],
    keywords: [
      'rpg',
      'fantasy',
      'final fantasy',
      'baldur',
      'persona',
      'witcher',
      'cyberpunk',
      'elder scrolls',
      'skyrim',
      'fallout',
      'elden',
      'souls',
    ],
  },
  {
    id: 'action',
    label: 'Action',
    subtitle: 'Rythme, réflexes, combats et campagnes nerveuses.',
    accent: '#FF6F91',
    palette: ['#7A3148', '#963F5A', '#5C2638', '#AA4A65'],
    keywords: [
      'action',
      'battlefield',
      'call of duty',
      'doom',
      'halo',
      'resident evil',
      'war',
      'combat',
      'fighter',
      'strike',
      'shooter',
    ],
  },
  {
    id: 'adventure',
    label: 'Aventure',
    subtitle: 'Exploration, récit, mystères et grands horizons.',
    accent: '#F4C95D',
    palette: ['#735C27', '#8A6E2F', '#5E4B20', '#9A7A33'],
    keywords: [
      'adventure',
      'avent',
      'story',
      'journey',
      'tomb',
      'uncharted',
      'zelda',
      'horizon',
      'life is strange',
      'walking dead',
    ],
  },
  {
    id: 'strategy',
    label: 'Stratégie',
    subtitle: 'Plans, empires, tactique et décisions lentes.',
    accent: '#73D2A3',
    palette: ['#22543D', '#2F6B4F', '#1F4A37', '#3B7B5D'],
    keywords: [
      'strategy',
      'strategie',
      'civilization',
      'total war',
      'xcom',
      'age of',
      'crusader',
      'europa',
      'tactics',
      'tactical',
    ],
  },
  {
    id: 'puzzle',
    label: 'Indé & puzzle',
    subtitle: 'Idées singulières, énigmes et petites merveilles.',
    accent: '#F4A261',
    palette: ['#7A4A2D', '#965E38', '#623C24', '#A66A41'],
    keywords: [
      'puzzle',
      'portal',
      'witness',
      'baba',
      'inside',
      'limbo',
      'hollow',
      'celeste',
      'stardew',
      'indie',
    ],
  },
  {
    id: 'sport',
    label: 'Sport & course',
    subtitle: 'Compétition, vitesse et records personnels.',
    accent: '#4F7CFF',
    palette: ['#1E3A8A', '#2548A8', '#1D2F6F', '#315BBF'],
    keywords: [
      'sport',
      'football',
      'fifa',
      'fc ',
      'nba',
      'tennis',
      'racing',
      'race',
      'forza',
      'dirt',
      'need for speed',
    ],
  },
]

const fallbackShelf: GenreShelf = {
  id: 'collection',
  label: 'Collection',
  subtitle: 'Volumes rares, favoris inattendus et jeux à classer.',
  accent: '#C9A646',
  palette: ['#3C3344', '#45395B', '#2F3444', '#524667'],
  keywords: [],
}

function normalizeText(value: string) {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLocaleLowerCase('fr-FR')
}

function inferGenre(game: GameListItem) {
  const haystack = normalizeText(
    `${game.title} ${game.platforms.join(' ')} ${game.collections.join(' ')}`,
  )

  return (
    genreShelves.find((shelf) =>
      shelf.keywords.some((keyword) => haystack.includes(normalizeText(keyword))),
    ) ?? fallbackShelf
  )
}

function chunkGames(games: GameListItem[]) {
  const chunks: GameListItem[][] = []

  for (let index = 0; index < games.length; index += booksPerShelf) {
    chunks.push(games.slice(index, index + booksPerShelf))
  }

  return chunks
}

function chunkShelves(shelves: BookcaseShelf[]) {
  const pages: BookcaseShelf[][] = []

  for (let index = 0; index < shelves.length; index += shelvesPerPage) {
    pages.push(shelves.slice(index, index + shelvesPerPage))
  }

  return pages
}

function buildBookcasePages(games: GameListItem[]) {
  const sortedGames = [...games].sort((left, right) =>
    left.title.localeCompare(right.title, 'fr-FR'),
  )
  const shelves = chunkGames(sortedGames).map(
    (chunk, index): BookcaseShelf => ({
      id: `shelf-${index}`,
      games: chunk,
    }),
  )

  return chunkShelves(shelves).map(
    (pageShelves, index): BookcasePage => ({
      id: `page-${index}-${pageShelves.map((shelf) => shelf.id).join('-')}`,
      label: `Page ${index + 1}`,
      shelves: pageShelves,
    }),
  )
}

function buildGenreLegend(games: GameListItem[]): GenreLegendItem[] {
  const counts = new Map<string, GenreLegendItem>()

  for (const game of games) {
    const genre = inferGenre(game)
    const current = counts.get(genre.id)

    if (current) {
      current.count += 1
    } else {
      counts.set(genre.id, { genre, count: 1 })
    }
  }

  const order = [...genreShelves, fallbackShelf].map((genre) => genre.id)

  return [...counts.values()].sort(
    (left, right) => order.indexOf(left.genre.id) - order.indexOf(right.genre.id),
  )
}

function createBookStyle(game: GameListItem, genre: GenreShelf, index: number): BookSpineStyle {
  const seed = [...game.id].reduce((total, character) => total + character.charCodeAt(0), 0)
  const color = genre.palette[(seed + index) % genre.palette.length]
  const readableTitleLength = normalizeText(game.title).replace(/[^a-z0-9]/g, '').length
  const span =
    readableTitleLength > 58 ? 6 : readableTitleLength > 42 ? 5 : readableTitleLength > 26 ? 4 : 3
  const height = 50 + Math.min(16, Math.floor(readableTitleLength / 12) * 3) + (seed % 4)

  return {
    '--book-accent': genre.accent,
    '--book-color': color,
    '--book-height': `${height}px`,
    '--book-span': String(span),
  } as BookSpineStyle
}

export function LibraryBookcase({ games, onOpen }: LibraryBookcaseProps) {
  const pages = useMemo(() => buildBookcasePages(games), [games])
  const legendItems = useMemo(() => buildGenreLegend(games), [games])
  const [currentPageIndex, setCurrentPageIndex] = useState(0)
  const [direction, setDirection] = useState<'next' | 'previous'>('next')

  useEffect(() => {
    setCurrentPageIndex((current) => Math.min(current, Math.max(pages.length - 1, 0)))
  }, [pages.length])

  if (pages.length === 0) {
    return null
  }

  const currentPage = pages[currentPageIndex]
  const currentAccent = '#C9A646'
  const currentSubtitle =
    'Tous vos jeux réunis sur les mêmes rayons, quelle que soit leur plateforme. Les couleurs indiquent le genre estimé.'
  const currentVolumeCount = currentPage.shelves.reduce(
    (total, shelf) => total + shelf.games.length,
    0,
  )
  const canMoveBackward = currentPageIndex > 0
  const canMoveForward = currentPageIndex < pages.length - 1

  function openPage(index: number) {
    if (index === currentPageIndex) {
      return
    }

    setDirection(index > currentPageIndex ? 'next' : 'previous')
    setCurrentPageIndex(index)
  }

  return (
    <section className="library-cabinet" aria-label="Rayonnage de la bibliothèque">
      <div className="library-cabinet-header">
        <div className="min-w-0">
          <h2 className="truncate text-xl font-semibold text-white">Rayonnage</h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-zinc-400">
            {currentSubtitle}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            aria-label="Page précédente"
            title="Page précédente"
            disabled={!canMoveBackward}
            onClick={() => openPage(currentPageIndex - 1)}
            className="library-cabinet-nav"
          >
            <ChevronLeft size={18} aria-hidden="true" />
          </button>
          <span className="min-w-16 text-center text-sm font-medium text-zinc-300">
            {currentPageIndex + 1}/{pages.length}
          </span>
          <button
            type="button"
            aria-label="Page suivante"
            title="Page suivante"
            disabled={!canMoveForward}
            onClick={() => openPage(currentPageIndex + 1)}
            className="library-cabinet-nav"
          >
            <ChevronRight size={18} aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="library-genre-legend" aria-label="Légende des genres">
        {legendItems.map((item) => (
          <span
            className="library-genre-legend-item"
            key={item.genre.id}
            style={{ '--legend-accent': item.genre.accent } as CSSProperties}
          >
            <span className="library-genre-dot" aria-hidden="true" />
            <span>{item.genre.label}</span>
            <span className="library-genre-count">{item.count}</span>
          </span>
        ))}
      </div>

      <div className="library-page-shell">
        <div
          key={currentPage.id}
          className="library-page-turn"
          data-direction={direction}
          style={{ '--page-accent': currentAccent } as CSSProperties}
        >
          <div className="library-shelf-stack">
            {currentPage.shelves.map((shelf) => (
              <div className="genre-shelf" key={shelf.id}>
                <div className="genre-book-row">
                  {shelf.games.map((game, index) => {
                    const genre = inferGenre(game)

                    return (
                      <button
                        key={game.id}
                        type="button"
                        title={`${game.title} - ${genre.label}`}
                        onClick={() => onOpen?.(game.id)}
                        className="library-book-spine"
                        style={createBookStyle(game, genre, index)}
                      >
                        <span className="library-book-title">{game.title}</span>
                        <span className="library-book-meta">
                          <span className="library-book-status">
                            {GAME_STATUS_LABELS[game.status]}
                          </span>
                          <span className="library-book-time">
                            {formatHours(game.totalMinutes)}
                          </span>
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>

          <footer className="library-page-footer">
            <span>
              {currentVolumeCount} jeu{currentVolumeCount > 1 ? 'x' : ''}
            </span>
            <span>{games.length} jeux filtrés</span>
          </footer>
        </div>
      </div>

      {pages.length > 1 ? (
        <div className="library-page-tabs" aria-label="Pages du rayonnage">
          {pages.map((page, index) => (
            <button
              key={page.id}
              type="button"
              aria-label={`Ouvrir la ${page.label.toLocaleLowerCase('fr-FR')}`}
              aria-current={index === currentPageIndex ? 'page' : undefined}
              onClick={() => openPage(index)}
              className={cn(
                'library-page-tab',
                index === currentPageIndex && 'library-page-tab-active',
              )}
              style={{
                '--tab-accent': '#C9A646',
              } as CSSProperties}
            >
              {index + 1}
            </button>
          ))}
        </div>
      ) : null}
    </section>
  )
}
