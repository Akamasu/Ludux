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
  source: 'steam' | 'fallback'
}

interface BookcaseShelf {
  id: string
  genre: GenreShelf
  games: GameListItem[]
  pageNumber: number
  totalGenrePages: number
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

const booksPerShelf = 8
const shelvesPerPage = 2

const genreShelves: GenreShelf[] = [
  {
    id: 'simulation',
    label: 'Simulation',
    subtitle: 'Mondes persistants, gestion et expériences contemplatives.',
    accent: '#8BC7FF',
    palette: ['#274C77', '#3B6EA5', '#2D5F73', '#415A77'],
    source: 'fallback',
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
    source: 'fallback',
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
    source: 'fallback',
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
    source: 'fallback',
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
    source: 'fallback',
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
    source: 'fallback',
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
    source: 'fallback',
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
  source: 'fallback',
}

const collectionAccents = [
  '#8BC7FF',
  '#A797FF',
  '#FF6F91',
  '#F4C95D',
  '#73D2A3',
  '#F4A261',
  '#4F7CFF',
]

const collectionPalettes = [
  ['#274C77', '#3B6EA5', '#2D5F73', '#415A77'],
  ['#4B367C', '#5B3F93', '#37215F', '#6D4ED8'],
  ['#7A3148', '#963F5A', '#5C2638', '#AA4A65'],
  ['#735C27', '#8A6E2F', '#5E4B20', '#9A7A33'],
  ['#22543D', '#2F6B4F', '#1F4A37', '#3B7B5D'],
  ['#7A4A2D', '#965E38', '#623C24', '#A66A41'],
  ['#1E3A8A', '#2548A8', '#1D2F6F', '#315BBF'],
]

function normalizeText(value: string) {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLocaleLowerCase('fr-FR')
}

function hashText(value: string) {
  return [...value].reduce((total, character) => total + character.charCodeAt(0), 0)
}

function createCollectionShelf(name: string): GenreShelf {
  const normalizedName = normalizeText(name)
  const seed = hashText(normalizedName)
  const paletteIndex = seed % collectionPalettes.length

  return {
    id: `steam:${normalizedName}`,
    label: name,
    subtitle: 'Catégorie Steam synchronisée depuis votre bibliothèque.',
    accent: collectionAccents[paletteIndex],
    palette: collectionPalettes[paletteIndex],
    keywords: [],
    source: 'steam',
  }
}

function inferGenre(game: GameListItem) {
  const haystack = normalizeText(`${game.title} ${game.platforms.join(' ')}`)

  return (
    genreShelves.find((shelf) =>
      shelf.keywords.some((keyword) => haystack.includes(normalizeText(keyword))),
    ) ?? fallbackShelf
  )
}

function resolveShelvesForGame(game: GameListItem) {
  const collections = Array.from(
    new Set(
      game.collections
        .map((collection) => collection.trim())
        .filter((collection) => collection.length > 0),
    ),
  )

  if (collections.length > 0) {
    return collections.map(createCollectionShelf)
  }

  return [inferGenre(game)]
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
  const groupedGames = new Map<string, { genre: GenreShelf; games: GameListItem[] }>()

  for (const game of games) {
    for (const genre of resolveShelvesForGame(game)) {
      const group = groupedGames.get(genre.id)

      if (group) {
        group.games.push(game)
      } else {
        groupedGames.set(genre.id, {
          genre,
          games: [game],
        })
      }
    }
  }

  const order = [...genreShelves, fallbackShelf].map((genre) => genre.id)

  const shelves = [...groupedGames.values()]
    .sort((left, right) => {
      if (left.genre.source !== right.genre.source) {
        return left.genre.source === 'steam' ? -1 : 1
      }

      if (left.genre.source === 'steam') {
        return right.genre.label.localeCompare(left.genre.label, 'fr-FR')
      }

      return order.indexOf(right.genre.id) - order.indexOf(left.genre.id)
    })
    .flatMap((group) => {
      const sortedGames = [...group.games].sort((left, right) =>
        left.title.localeCompare(right.title, 'fr-FR'),
      )
      const chunks = chunkGames(sortedGames)

      return chunks.map(
        (chunk, index): BookcaseShelf => ({
          id: `${group.genre.id}-${index}`,
          genre: group.genre,
          games: chunk,
          pageNumber: index + 1,
          totalGenrePages: chunks.length,
        }),
      )
    })

  return chunkShelves(shelves).map(
    (pageShelves, index): BookcasePage => ({
      id: `page-${index}-${pageShelves.map((shelf) => shelf.id).join('-')}`,
      label: pageShelves.map((shelf) => shelf.genre.label).join(' / '),
      shelves: pageShelves,
    }),
  )
}

function createBookStyle(game: GameListItem, genre: GenreShelf, index: number): BookSpineStyle {
  const seed = [...game.id].reduce((total, character) => total + character.charCodeAt(0), 0)
  const color = genre.palette[(seed + index) % genre.palette.length]
  const readableTitleLength = normalizeText(game.title).replace(/[^a-z0-9]/g, '').length
  const span = readableTitleLength > 58 ? 6 : readableTitleLength > 42 ? 5 : readableTitleLength > 26 ? 4 : 3
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
  const [currentPageIndex, setCurrentPageIndex] = useState(0)
  const [direction, setDirection] = useState<'next' | 'previous'>('next')

  useEffect(() => {
    setCurrentPageIndex((current) => Math.min(current, Math.max(pages.length - 1, 0)))
  }, [pages.length])

  if (pages.length === 0) {
    return null
  }

  const currentPage = pages[currentPageIndex]
  const currentAccent = currentPage.shelves[0]?.genre.accent ?? '#C9A646'
  const currentSubtitle = currentPage.shelves.every(
    (shelf) => shelf.genre.source === 'steam',
  )
    ? 'Catégories Steam synchronisées depuis votre bibliothèque.'
    : currentPage.shelves.map((shelf) => shelf.genre.subtitle).join(' ')
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
    <section className="library-cabinet" aria-label="Armoire de la bibliothèque">
      <div className="library-cabinet-header">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase text-[#C9A646]">Armoire ancienne</p>
          <h2 className="mt-1 truncate text-xl font-semibold text-white">
            Rayons {currentPage.label}
          </h2>
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
                <div className="genre-shelf-heading">
                  <span>{shelf.genre.label}</span>
                  {shelf.totalGenrePages > 1 ? (
                    <span>
                      {shelf.pageNumber}/{shelf.totalGenrePages}
                    </span>
                  ) : null}
                </div>
                <div className="genre-book-row">
                  {shelf.games.map((game, index) => (
                    <button
                      key={game.id}
                      type="button"
                      title={game.title}
                      onClick={() => onOpen?.(game.id)}
                      className="library-book-spine"
                      style={createBookStyle(game, shelf.genre, index)}
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
                  ))}
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

      <div className="library-page-tabs" aria-label="Rayons">
        {pages.map((page, index) => (
          <button
            key={page.id}
            type="button"
            aria-label={`Ouvrir les rayons ${page.label}`}
            aria-current={index === currentPageIndex ? 'page' : undefined}
            onClick={() => openPage(index)}
            className={cn(
              'library-page-tab',
              index === currentPageIndex && 'library-page-tab-active',
            )}
            style={{
              '--tab-accent': page.shelves[0]?.genre.accent ?? '#C9A646',
            } as CSSProperties}
          >
            {page.label}
          </button>
        ))}
      </div>
    </section>
  )
}
