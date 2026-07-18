import type {
  ChronicleTimelineItem,
  CreateChronicleInput,
  CreateGameInput,
  CreatePlaySessionInput,
  GameDetail,
  GameListItem,
  LibraryOverview,
  LibraryStatistics,
  LifeBookEvent,
  UpdateGameInput,
} from './game'
import type { SettingsActionResult, SettingsOverview } from './settings'

export interface LuduxApi {
  library: {
    getOverview: () => Promise<LibraryOverview>
    getStatistics: () => Promise<LibraryStatistics>
    listChronicles: () => Promise<ChronicleTimelineItem[]>
    listLifeEvents: () => Promise<LifeBookEvent[]>
  }
  games: {
    list: () => Promise<GameListItem[]>
    create: (input: CreateGameInput) => Promise<GameListItem>
    getById: (id: string) => Promise<GameDetail | null>
    update: (input: UpdateGameInput) => Promise<GameDetail>
    createChronicle: (input: CreateChronicleInput) => Promise<GameDetail>
    createPlaySession: (input: CreatePlaySessionInput) => Promise<GameDetail>
  }
  settings: {
    getOverview: () => Promise<SettingsOverview>
    exportLibrary: () => Promise<SettingsActionResult>
    createBackup: () => Promise<SettingsActionResult>
    openDataFolder: () => Promise<boolean>
  }
}

declare global {
  interface Window {
    ludux?: LuduxApi
  }
}
