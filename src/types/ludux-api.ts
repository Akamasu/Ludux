import type { CreateGameInput, GameListItem, LibraryOverview } from './game'

export interface LuduxApi {
  library: {
    getOverview: () => Promise<LibraryOverview>
  }
  games: {
    list: () => Promise<GameListItem[]>
    create: (input: CreateGameInput) => Promise<GameListItem>
  }
}

declare global {
  interface Window {
    ludux?: LuduxApi
  }
}
