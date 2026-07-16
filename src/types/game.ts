export const GAME_STATUS_VALUES = [
  'BACKLOG',
  'PLAYING',
  'COMPLETED',
  'COMPLETED_100',
  'DROPPED',
  'PAUSED',
] as const

export type GameStatus = (typeof GAME_STATUS_VALUES)[number]

export const EMOTION_VALUES = [
  'JOY',
  'EXCITEMENT',
  'NOSTALGIA',
  'FRUSTRATION',
  'SURPRISE',
  'SADNESS',
  'PRIDE',
] as const

export type Emotion = (typeof EMOTION_VALUES)[number]

export const GAME_STATUS_LABELS: Record<GameStatus, string> = {
  BACKLOG: 'A jouer',
  PLAYING: 'En cours',
  COMPLETED: 'Termine',
  COMPLETED_100: 'Termine a 100 %',
  DROPPED: 'Abandonne',
  PAUSED: 'En pause',
}

export const EMOTION_LABELS: Record<Emotion, string> = {
  JOY: 'Joie',
  EXCITEMENT: 'Excitation',
  NOSTALGIA: 'Nostalgie',
  FRUSTRATION: 'Frustration',
  SURPRISE: 'Surprise',
  SADNESS: 'Tristesse',
  PRIDE: 'Fierte',
}

export interface GameListItem {
  id: string
  title: string
  status: GameStatus
  coverUrl: string | null
  platforms: string[]
  totalMinutes: number
  rating: number | null
  lastChronicleTitle: string | null
  updatedAt: string
}

export interface ChronicleListItem {
  id: string
  title: string
  content: string
  date: string
  emotion: Emotion | null
  favorite: boolean
}

export interface PlaySessionListItem {
  id: string
  start: string
  end: string | null
  durationMinutes: number
  note: string | null
  platformName: string | null
}

export interface GameDetail extends GameListItem {
  description: string | null
  developer: string | null
  publisher: string | null
  releaseDate: string | null
  website: string | null
  chronicles: ChronicleListItem[]
  sessions: PlaySessionListItem[]
}

export interface RecentChronicle {
  id: string
  title: string
  gameTitle: string
  date: string
}

export interface LibraryOverview {
  gamesOwned: number
  gamesCompleted: number
  totalMinutes: number
  topPlatform: string | null
  lastAdventure: GameListItem | null
  recentChronicle: RecentChronicle | null
}

export interface CreateGameInput {
  title: string
  status?: GameStatus
  platformName?: string
  description?: string
  coverUrl?: string
}

export interface UpdateGameInput {
  id: string
  title?: string
  status?: GameStatus
  description?: string
  coverUrl?: string
  developer?: string
  publisher?: string
  website?: string
}

export interface CreateChronicleInput {
  gameId: string
  title: string
  content: string
  emotion?: Emotion
  date?: string
}

export interface CreatePlaySessionInput {
  gameId: string
  start?: string
  durationMinutes: number
  note?: string
  platformName?: string
}
