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

export interface ChronicleTimelineItem extends ChronicleListItem {
  gameId: string
  gameTitle: string
  gameCoverUrl: string | null
  gameStatus: GameStatus
}

export interface PlaySessionListItem {
  id: string
  start: string
  end: string | null
  durationMinutes: number
  note: string | null
  platformName: string | null
}

export interface DlcListItem {
  id: string
  name: string
  releaseDate: string | null
  owned: boolean
  completed: boolean
}

export interface AchievementListItem {
  id: string
  name: string
  description: string | null
  iconUrl: string | null
  unlocked: boolean
  unlockDate: string | null
  provider: string | null
}

export interface ScreenshotListItem {
  id: string
  path: string
  description: string | null
  createdAt: string
  chronicleId: string | null
  chronicleTitle: string | null
}

export interface GameReview {
  id: string
  rating: number
  content: string | null
  strengths: string | null
  weaknesses: string | null
  mainMemory: string | null
  favorite: boolean
  createdAt: string
  updatedAt: string
}

export type LifeBookEventKind = 'CHRONICLE' | 'SESSION'

export interface LifeBookEvent {
  id: string
  kind: LifeBookEventKind
  title: string
  description: string | null
  date: string
  gameId: string
  gameTitle: string
  gameCoverUrl: string | null
  gameStatus: GameStatus
  emotion: Emotion | null
  durationMinutes: number | null
  platformName: string | null
}

export interface GameDetail extends GameListItem {
  description: string | null
  developer: string | null
  publisher: string | null
  releaseDate: string | null
  website: string | null
  review: GameReview | null
  dlcs: DlcListItem[]
  achievements: AchievementListItem[]
  screenshots: ScreenshotListItem[]
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

export interface StatusStat {
  status: GameStatus
  count: number
  totalMinutes: number
}

export interface PlatformStat {
  name: string
  games: number
  sessions: number
  totalMinutes: number
}

export interface EmotionStat {
  emotion: Emotion
  count: number
}

export interface MonthlyPlayStat {
  month: string
  sessions: number
  totalMinutes: number
}

export interface LibraryStatistics {
  gamesOwned: number
  gamesCompleted: number
  completionRate: number
  totalMinutes: number
  totalSessions: number
  totalChronicles: number
  statusStats: StatusStat[]
  platformStats: PlatformStat[]
  emotionStats: EmotionStat[]
  monthlyPlayStats: MonthlyPlayStat[]
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

export interface UpdateReviewInput {
  gameId: string
  rating: number
  content?: string | null
  strengths?: string | null
  weaknesses?: string | null
  mainMemory?: string | null
  favorite?: boolean
}

export interface CreateDlcInput {
  gameId: string
  name: string
  releaseDate?: string
  owned?: boolean
  completed?: boolean
}

export interface UpdateDlcInput {
  gameId: string
  id: string
  name?: string
  releaseDate?: string | null
  owned?: boolean
  completed?: boolean
}

export interface DeleteDlcInput {
  gameId: string
  id: string
}

export interface CreateAchievementInput {
  gameId: string
  name: string
  description?: string
  iconUrl?: string
  provider?: string
  unlocked?: boolean
  unlockDate?: string
}

export interface UpdateAchievementInput {
  gameId: string
  id: string
  name?: string
  description?: string | null
  iconUrl?: string | null
  provider?: string | null
  unlocked?: boolean
  unlockDate?: string | null
}

export interface DeleteAchievementInput {
  gameId: string
  id: string
}

export interface CreateScreenshotInput {
  gameId: string
  path: string
  description?: string
  chronicleId?: string
}

export interface ImportScreenshotFileInput {
  gameId: string
  description?: string
  chronicleId?: string
}

export interface UpdateScreenshotInput {
  gameId: string
  id: string
  path?: string
  description?: string | null
  chronicleId?: string | null
}

export interface DeleteScreenshotInput {
  gameId: string
  id: string
}

export interface CreateChronicleInput {
  gameId: string
  title: string
  content: string
  emotion?: Emotion
  date?: string
}

export interface UpdateChronicleInput {
  gameId: string
  id: string
  title?: string
  content?: string
  emotion?: Emotion | null
  date?: string
  favorite?: boolean
}

export interface DeleteChronicleInput {
  gameId: string
  id: string
}

export interface CreatePlaySessionInput {
  gameId: string
  start?: string
  durationMinutes: number
  note?: string
  platformName?: string
}
