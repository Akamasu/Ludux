import { contextBridge, ipcRenderer } from 'electron'
import type {
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
  DeletePlaySessionInput,
  DeleteScreenshotInput,
  GameDetail,
  GameListItem,
  ImportScreenshotFileInput,
  LibraryOverview,
  LibraryStatistics,
  LifeBookEvent,
  UpdateAchievementInput,
  UpdateChronicleInput,
  UpdateDlcInput,
  UpdateGameInput,
  UpdatePlaySessionInput,
  UpdateReviewInput,
  UpdateScreenshotInput,
} from '../types/game'
import type { LuduxApi } from '../types/ludux-api'
import type {
  DeleteProviderConnectionInput,
  SettingsActionResult,
  SettingsOverview,
  SyncProviderInput,
  UpsertProviderConnectionInput,
} from '../types/settings'

const api: LuduxApi = {
  library: {
    getOverview: () =>
      ipcRenderer.invoke('library:getOverview') as Promise<LibraryOverview>,
    getStatistics: () =>
      ipcRenderer.invoke('library:getStatistics') as Promise<LibraryStatistics>,
    listChronicles: () =>
      ipcRenderer.invoke('library:listChronicles') as Promise<ChronicleTimelineItem[]>,
    listLifeEvents: () =>
      ipcRenderer.invoke('library:listLifeEvents') as Promise<LifeBookEvent[]>,
  },
  games: {
    list: () => ipcRenderer.invoke('games:list') as Promise<GameListItem[]>,
    listArchived: () =>
      ipcRenderer.invoke('games:listArchived') as Promise<GameListItem[]>,
    create: (input: CreateGameInput) =>
      ipcRenderer.invoke('games:create', input) as Promise<GameListItem>,
    getById: (id: string) =>
      ipcRenderer.invoke('games:getById', id) as Promise<GameDetail | null>,
    update: (input: UpdateGameInput) =>
      ipcRenderer.invoke('games:update', input) as Promise<GameDetail>,
    archive: (id: string) => ipcRenderer.invoke('games:archive', id) as Promise<void>,
    restore: (id: string) => ipcRenderer.invoke('games:restore', id) as Promise<void>,
    delete: (id: string) => ipcRenderer.invoke('games:delete', id) as Promise<void>,
    updateReview: (input: UpdateReviewInput) =>
      ipcRenderer.invoke('games:updateReview', input) as Promise<GameDetail>,
    createDlc: (input: CreateDlcInput) =>
      ipcRenderer.invoke('games:createDlc', input) as Promise<GameDetail>,
    updateDlc: (input: UpdateDlcInput) =>
      ipcRenderer.invoke('games:updateDlc', input) as Promise<GameDetail>,
    deleteDlc: (input: DeleteDlcInput) =>
      ipcRenderer.invoke('games:deleteDlc', input) as Promise<GameDetail>,
    createAchievement: (input: CreateAchievementInput) =>
      ipcRenderer.invoke('games:createAchievement', input) as Promise<GameDetail>,
    updateAchievement: (input: UpdateAchievementInput) =>
      ipcRenderer.invoke('games:updateAchievement', input) as Promise<GameDetail>,
    deleteAchievement: (input: DeleteAchievementInput) =>
      ipcRenderer.invoke('games:deleteAchievement', input) as Promise<GameDetail>,
    createScreenshot: (input: CreateScreenshotInput) =>
      ipcRenderer.invoke('games:createScreenshot', input) as Promise<GameDetail>,
    importScreenshotFile: (input: ImportScreenshotFileInput) =>
      ipcRenderer.invoke('games:importScreenshotFile', input) as Promise<GameDetail>,
    updateScreenshot: (input: UpdateScreenshotInput) =>
      ipcRenderer.invoke('games:updateScreenshot', input) as Promise<GameDetail>,
    deleteScreenshot: (input: DeleteScreenshotInput) =>
      ipcRenderer.invoke('games:deleteScreenshot', input) as Promise<GameDetail>,
    createChronicle: (input: CreateChronicleInput) =>
      ipcRenderer.invoke('games:createChronicle', input) as Promise<GameDetail>,
    updateChronicle: (input: UpdateChronicleInput) =>
      ipcRenderer.invoke('games:updateChronicle', input) as Promise<GameDetail>,
    deleteChronicle: (input: DeleteChronicleInput) =>
      ipcRenderer.invoke('games:deleteChronicle', input) as Promise<GameDetail>,
    createPlaySession: (input: CreatePlaySessionInput) =>
      ipcRenderer.invoke('games:createPlaySession', input) as Promise<GameDetail>,
    updatePlaySession: (input: UpdatePlaySessionInput) =>
      ipcRenderer.invoke('games:updatePlaySession', input) as Promise<GameDetail>,
    deletePlaySession: (input: DeletePlaySessionInput) =>
      ipcRenderer.invoke('games:deletePlaySession', input) as Promise<GameDetail>,
  },
  settings: {
    getOverview: () =>
      ipcRenderer.invoke('settings:getOverview') as Promise<SettingsOverview>,
    exportLibrary: () =>
      ipcRenderer.invoke('settings:exportLibrary') as Promise<SettingsActionResult>,
    createBackup: () =>
      ipcRenderer.invoke('settings:createBackup') as Promise<SettingsActionResult>,
    openDataFolder: () =>
      ipcRenderer.invoke('settings:openDataFolder') as Promise<boolean>,
    upsertProviderConnection: (input: UpsertProviderConnectionInput) =>
      ipcRenderer.invoke('settings:upsertProviderConnection', input) as Promise<SettingsOverview>,
    deleteProviderConnection: (input: DeleteProviderConnectionInput) =>
      ipcRenderer.invoke('settings:deleteProviderConnection', input) as Promise<SettingsOverview>,
    syncProvider: (input: SyncProviderInput) =>
      ipcRenderer.invoke('settings:syncProvider', input) as Promise<SettingsActionResult>,
  },
}

contextBridge.exposeInMainWorld('ludux', api)
