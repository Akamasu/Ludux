import { contextBridge, ipcRenderer } from 'electron'
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
  UpdateReviewInput,
} from '../types/game'
import type { LuduxApi } from '../types/ludux-api'
import type { SettingsActionResult, SettingsOverview } from '../types/settings'

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
    create: (input: CreateGameInput) =>
      ipcRenderer.invoke('games:create', input) as Promise<GameListItem>,
    getById: (id: string) =>
      ipcRenderer.invoke('games:getById', id) as Promise<GameDetail | null>,
    update: (input: UpdateGameInput) =>
      ipcRenderer.invoke('games:update', input) as Promise<GameDetail>,
    updateReview: (input: UpdateReviewInput) =>
      ipcRenderer.invoke('games:updateReview', input) as Promise<GameDetail>,
    createChronicle: (input: CreateChronicleInput) =>
      ipcRenderer.invoke('games:createChronicle', input) as Promise<GameDetail>,
    createPlaySession: (input: CreatePlaySessionInput) =>
      ipcRenderer.invoke('games:createPlaySession', input) as Promise<GameDetail>,
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
  },
}

contextBridge.exposeInMainWorld('ludux', api)
