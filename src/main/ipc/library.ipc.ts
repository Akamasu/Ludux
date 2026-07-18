import { ipcMain } from 'electron'
import { gameService } from '../../services/game.service'
import { libraryService } from '../../services/library.service'
import {
  EMOTION_VALUES,
  GAME_STATUS_VALUES,
  type CreateChronicleInput,
  type CreateGameInput,
  type CreatePlaySessionInput,
  type Emotion,
  type GameStatus,
  type UpdateGameInput,
} from '../../types/game'
import { logger } from '../../utils/logger'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isGameStatus(value: unknown): value is GameStatus {
  return typeof value === 'string' && GAME_STATUS_VALUES.includes(value as GameStatus)
}

function isEmotion(value: unknown): value is Emotion {
  return typeof value === 'string' && EMOTION_VALUES.includes(value as Emotion)
}

function readOptionalString(value: unknown) {
  return typeof value === 'string' && value.trim().length > 0 ? value : undefined
}

function readRequiredString(value: unknown, message: string) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(message)
  }

  return value
}

function parseCreateGameInput(value: unknown): CreateGameInput {
  if (!isRecord(value) || typeof value['title'] !== 'string') {
    throw new Error('Les donnees du jeu sont invalides.')
  }

  const status = value['status']

  if (status !== undefined && !isGameStatus(status)) {
    throw new Error('Le statut du jeu est invalide.')
  }

  return {
    title: value['title'],
    status,
    platformName: readOptionalString(value['platformName']),
    description: readOptionalString(value['description']),
    coverUrl: readOptionalString(value['coverUrl']),
  }
}

function parseUpdateGameInput(value: unknown): UpdateGameInput {
  if (!isRecord(value)) {
    throw new Error('Les donnees du jeu sont invalides.')
  }

  const status = value['status']

  if (status !== undefined && !isGameStatus(status)) {
    throw new Error('Le statut du jeu est invalide.')
  }

  return {
    id: readRequiredString(value['id'], 'Identifiant de jeu invalide.'),
    title: readOptionalString(value['title']),
    status,
    description: readOptionalString(value['description']),
    coverUrl: readOptionalString(value['coverUrl']),
    developer: readOptionalString(value['developer']),
    publisher: readOptionalString(value['publisher']),
    website: readOptionalString(value['website']),
  }
}

function parseCreateChronicleInput(value: unknown): CreateChronicleInput {
  if (!isRecord(value)) {
    throw new Error('Les donnees de chronique sont invalides.')
  }

  const emotion = value['emotion']

  if (emotion !== undefined && !isEmotion(emotion)) {
    throw new Error('Emotion invalide.')
  }

  return {
    gameId: readRequiredString(value['gameId'], 'Identifiant de jeu invalide.'),
    title: readRequiredString(value['title'], 'Le titre de la chronique est obligatoire.'),
    content: readRequiredString(value['content'], 'Le contenu de la chronique est obligatoire.'),
    emotion,
    date: readOptionalString(value['date']),
  }
}

function parseCreatePlaySessionInput(value: unknown): CreatePlaySessionInput {
  if (!isRecord(value) || typeof value['durationMinutes'] !== 'number') {
    throw new Error('Les donnees de session sont invalides.')
  }

  return {
    gameId: readRequiredString(value['gameId'], 'Identifiant de jeu invalide.'),
    start: readOptionalString(value['start']),
    durationMinutes: value['durationMinutes'],
    note: readOptionalString(value['note']),
    platformName: readOptionalString(value['platformName']),
  }
}

export function registerLibraryHandlers() {
  ipcMain.handle('library:getOverview', async () => {
    try {
      return await libraryService.getOverview()
    } catch (error) {
      logger.error('[LibraryIPC]', error)
      throw error
    }
  })

  ipcMain.handle('library:getStatistics', async () => {
    try {
      return await libraryService.getStatistics()
    } catch (error) {
      logger.error('[LibraryIPC]', error)
      throw error
    }
  })

  ipcMain.handle('library:listChronicles', async () => {
    try {
      return await libraryService.listChronicles()
    } catch (error) {
      logger.error('[LibraryIPC]', error)
      throw error
    }
  })

  ipcMain.handle('games:list', async () => {
    try {
      return await gameService.listGames()
    } catch (error) {
      logger.error('[LibraryIPC]', error)
      throw error
    }
  })

  ipcMain.handle('games:create', async (_event, input: unknown) => {
    try {
      return await gameService.createGame(parseCreateGameInput(input))
    } catch (error) {
      logger.error('[LibraryIPC]', error)
      throw error
    }
  })

  ipcMain.handle('games:getById', async (_event, id: unknown) => {
    try {
      return await gameService.getGameById(
        readRequiredString(id, 'Identifiant de jeu invalide.'),
      )
    } catch (error) {
      logger.error('[LibraryIPC]', error)
      throw error
    }
  })

  ipcMain.handle('games:update', async (_event, input: unknown) => {
    try {
      return await gameService.updateGame(parseUpdateGameInput(input))
    } catch (error) {
      logger.error('[LibraryIPC]', error)
      throw error
    }
  })

  ipcMain.handle('games:createChronicle', async (_event, input: unknown) => {
    try {
      return await gameService.createChronicle(parseCreateChronicleInput(input))
    } catch (error) {
      logger.error('[LibraryIPC]', error)
      throw error
    }
  })

  ipcMain.handle('games:createPlaySession', async (_event, input: unknown) => {
    try {
      return await gameService.createPlaySession(parseCreatePlaySessionInput(input))
    } catch (error) {
      logger.error('[LibraryIPC]', error)
      throw error
    }
  })
}
