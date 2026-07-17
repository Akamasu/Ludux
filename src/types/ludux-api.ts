import type {
  CreateChronicleInput,
  CreateGameInput,
  CreatePlaySessionInput,
  GameDetail,
  GameListItem,
  LibraryOverview,
  LibraryStatistics,
  UpdateGameInput,
} from './game'

export interface LuduxApi {
  library: {
    getOverview: () => Promise<LibraryOverview>
    getStatistics: () => Promise<LibraryStatistics>
  }
  games: {
    list: () => Promise<GameListItem[]>
    create: (input: CreateGameInput) => Promise<GameListItem>
    getById: (id: string) => Promise<GameDetail | null>
    update: (input: UpdateGameInput) => Promise<GameDetail>
    createChronicle: (input: CreateChronicleInput) => Promise<GameDetail>
    createPlaySession: (input: CreatePlaySessionInput) => Promise<GameDetail>
  }
}

declare global {
  interface Window {
    ludux?: LuduxApi
  }
}
