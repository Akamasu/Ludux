export const GAME_STATUS_VALUES = [
  'BACKLOG',
  'PLAYING',
  'COMPLETED',
  'COMPLETED_100',
  'DROPPED',
  'PAUSED',
] as const

export type GameStatus = (typeof GAME_STATUS_VALUES)[number]

export const GAME_STATUS_LABELS: Record<GameStatus, string> = {
  BACKLOG: 'A jouer',
  PLAYING: 'En cours',
  COMPLETED: 'Termine',
  COMPLETED_100: 'Termine a 100 %',
  DROPPED: 'Abandonne',
  PAUSED: 'En pause',
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
