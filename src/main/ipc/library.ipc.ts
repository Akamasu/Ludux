import { ipcMain } from 'electron'
import { gameService } from '../../services/game.service'
import { libraryService } from '../../services/library.service'
import {
  GAME_STATUS_VALUES,
  type CreateGameInput,
  type GameStatus,
} from '../../types/game'
import { logger } from '../../utils/logger'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isGameStatus(value: unknown): value is GameStatus {
  return typeof value === 'string' && GAME_STATUS_VALUES.includes(value as GameStatus)
}

function readOptionalString(value: unknown) {
  return typeof value === 'string' && value.trim().length > 0 ? value : undefined
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

export function registerLibraryHandlers() {
  ipcMain.handle('library:getOverview', async () => {
    try {
      return await libraryService.getOverview()
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
}
