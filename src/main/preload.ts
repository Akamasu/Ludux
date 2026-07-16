import { contextBridge, ipcRenderer } from 'electron'
import type { CreateGameInput, GameListItem, LibraryOverview } from '../types/game'
import type { LuduxApi } from '../types/ludux-api'

const api: LuduxApi = {
  library: {
    getOverview: () =>
      ipcRenderer.invoke('library:getOverview') as Promise<LibraryOverview>,
  },
  games: {
    list: () => ipcRenderer.invoke('games:list') as Promise<GameListItem[]>,
    create: (input: CreateGameInput) =>
      ipcRenderer.invoke('games:create', input) as Promise<GameListItem>,
  },
}

contextBridge.exposeInMainWorld('ludux', api)
