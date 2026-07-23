import type {
  AddAvailableDlcInput,
  AvailableDlcListItem,
  ChronicleTimelineItem,
  CreateAchievementInput,
  CreateChronicleInput,
  CreateDlcInput,
  CreateGameInput,
  CreatePlaySessionInput,
  CreateScreenshotInput,
  DeleteAchievementInput,
  DeleteChronicleInput,
  DeleteDlcInput,
  DeleteExternalGameLinkInput,
  DeletePlaySessionInput,
  DeleteScreenshotInput,
  GameDetail,
  GameListItem,
  ImportScreenshotFileInput,
  LibraryOverview,
  LibraryStatistics,
  LifeBookEvent,
  RestoreExternalGameLinkInput,
  UpdateAchievementInput,
  UpdateChronicleInput,
  UpdateDlcInput,
  UpdateGameInput,
  UpdatePlaySessionInput,
  UpdateReviewInput,
  UpdateScreenshotInput,
} from './game'
import type {
  DeleteProviderConnectionInput,
  SettingsActionResult,
  SettingsOverview,
  SyncProviderInput,
  UpsertProviderConnectionInput,
} from './settings'

export interface LuduxApi {
  windowControls: {
    minimize: () => Promise<void>
    toggleMaximize: () => Promise<void>
    close: () => Promise<void>
  }
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
    deleteExternalGameLink: (input: DeleteExternalGameLinkInput) => Promise<GameDetail>
    restoreExternalGameLink: (input: RestoreExternalGameLinkInput) => Promise<GameDetail>
    updateReview: (input: UpdateReviewInput) => Promise<GameDetail>
    createDlc: (input: CreateDlcInput) => Promise<GameDetail>
    listAvailableDlc: (gameId: string) => Promise<AvailableDlcListItem[]>
    addAvailableDlc: (input: AddAvailableDlcInput) => Promise<GameDetail>
    updateDlc: (input: UpdateDlcInput) => Promise<GameDetail>
    deleteDlc: (input: DeleteDlcInput) => Promise<GameDetail>
    createAchievement: (input: CreateAchievementInput) => Promise<GameDetail>
    updateAchievement: (input: UpdateAchievementInput) => Promise<GameDetail>
    deleteAchievement: (input: DeleteAchievementInput) => Promise<GameDetail>
    createScreenshot: (input: CreateScreenshotInput) => Promise<GameDetail>
    importScreenshotFile: (input: ImportScreenshotFileInput) => Promise<GameDetail>
    updateScreenshot: (input: UpdateScreenshotInput) => Promise<GameDetail>
    deleteScreenshot: (input: DeleteScreenshotInput) => Promise<GameDetail>
    createChronicle: (input: CreateChronicleInput) => Promise<GameDetail>
    updateChronicle: (input: UpdateChronicleInput) => Promise<GameDetail>
    deleteChronicle: (input: DeleteChronicleInput) => Promise<GameDetail>
    createPlaySession: (input: CreatePlaySessionInput) => Promise<GameDetail>
    updatePlaySession: (input: UpdatePlaySessionInput) => Promise<GameDetail>
    deletePlaySession: (input: DeletePlaySessionInput) => Promise<GameDetail>
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
    syncAllProviders: () => Promise<SettingsActionResult>
    syncProvider: (input: SyncProviderInput) => Promise<SettingsActionResult>
  }
}

declare global {
  interface Window {
    ludux?: LuduxApi
  }
}
