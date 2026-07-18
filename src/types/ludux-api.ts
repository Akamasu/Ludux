import type {
  ChronicleTimelineItem,
  CreateAchievementInput,
  CreateChronicleInput,
  CreateDlcInput,
  CreateGameInput,
  CreatePlaySessionInput,
  DeleteAchievementInput,
  DeleteDlcInput,
  GameDetail,
  GameListItem,
  LibraryOverview,
  LibraryStatistics,
  LifeBookEvent,
  UpdateAchievementInput,
  UpdateDlcInput,
  UpdateGameInput,
  UpdateReviewInput,
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
    listArchived: () => Promise<GameListItem[]>
    create: (input: CreateGameInput) => Promise<GameListItem>
    getById: (id: string) => Promise<GameDetail | null>
    update: (input: UpdateGameInput) => Promise<GameDetail>
    archive: (id: string) => Promise<void>
    restore: (id: string) => Promise<void>
    delete: (id: string) => Promise<void>
    updateReview: (input: UpdateReviewInput) => Promise<GameDetail>
    createDlc: (input: CreateDlcInput) => Promise<GameDetail>
    updateDlc: (input: UpdateDlcInput) => Promise<GameDetail>
    deleteDlc: (input: DeleteDlcInput) => Promise<GameDetail>
    createAchievement: (input: CreateAchievementInput) => Promise<GameDetail>
    updateAchievement: (input: UpdateAchievementInput) => Promise<GameDetail>
    deleteAchievement: (input: DeleteAchievementInput) => Promise<GameDetail>
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
