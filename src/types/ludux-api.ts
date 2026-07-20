import type {
  ChronicleTimelineItem,
  CreateAchievementInput,
  CreateChronicleInput,
  CreateDlcInput,
  CreateGameInput,
  CreatePlaySessionInput,
  CreateScreenshotInput,
  DeleteAchievementInput,
  DeleteDlcInput,
  DeleteScreenshotInput,
  GameDetail,
  GameListItem,
  LibraryOverview,
  LibraryStatistics,
  LifeBookEvent,
  UpdateAchievementInput,
  UpdateDlcInput,
  UpdateGameInput,
  UpdateReviewInput,
  UpdateScreenshotInput,
} from './game'
import type {
  DeleteProviderConnectionInput,
  SettingsActionResult,
  SettingsOverview,
  UpsertProviderConnectionInput,
} from './settings'

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
    createScreenshot: (input: CreateScreenshotInput) => Promise<GameDetail>
    updateScreenshot: (input: UpdateScreenshotInput) => Promise<GameDetail>
    deleteScreenshot: (input: DeleteScreenshotInput) => Promise<GameDetail>
    createChronicle: (input: CreateChronicleInput) => Promise<GameDetail>
    createPlaySession: (input: CreatePlaySessionInput) => Promise<GameDetail>
  }
  settings: {
    getOverview: () => Promise<SettingsOverview>
    exportLibrary: () => Promise<SettingsActionResult>
    createBackup: () => Promise<SettingsActionResult>
    openDataFolder: () => Promise<boolean>
    upsertProviderConnection: (
      input: UpsertProviderConnectionInput,
    ) => Promise<SettingsOverview>
    deleteProviderConnection: (
      input: DeleteProviderConnectionInput,
    ) => Promise<SettingsOverview>
  }
}

declare global {
  interface Window {
    ludux?: LuduxApi
  }
}
