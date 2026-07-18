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
}

declare global {
  interface Window {
    ludux?: LuduxApi
  }
}
