import { dialog, ipcMain } from 'electron'
import { gameService } from '../../services/game.service'
import { libraryService } from '../../services/library.service'
import {
  EMOTION_VALUES,
  GAME_STATUS_VALUES,
  type CreateAchievementInput,
  type CreateChronicleInput,
  type CreateDlcInput,
  type CreateGameInput,
  type CreatePlaySessionInput,
  type CreateScreenshotInput,
  type DeleteAchievementInput,
  type DeleteChronicleInput,
  type DeleteDlcInput,
  type DeletePlaySessionInput,
  type DeleteScreenshotInput,
  type Emotion,
  type GameStatus,
  type ImportScreenshotFileInput,
  type UpdateAchievementInput,
  type UpdateChronicleInput,
  type UpdateDlcInput,
  type UpdateGameInput,
  type UpdatePlaySessionInput,
  type UpdateReviewInput,
  type UpdateScreenshotInput,
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

function readNullableString(value: unknown, message: string) {
  if (value === undefined) {
    return undefined
  }

  if (value === null) {
    return null
  }

  if (typeof value !== 'string') {
    throw new Error(message)
  }

  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function readOptionalBoolean(value: unknown, message: string) {
  if (value === undefined) {
    return undefined
  }

  if (typeof value !== 'boolean') {
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

function parseUpdateChronicleInput(value: unknown): UpdateChronicleInput {
  if (!isRecord(value)) {
    throw new Error('Les donnees de chronique sont invalides.')
  }

  const emotion = value['emotion']

  if (emotion !== undefined && emotion !== null && !isEmotion(emotion)) {
    throw new Error('Emotion invalide.')
  }

  const parsedEmotion = emotion === undefined || emotion === null ? emotion : emotion

  return {
    gameId: readRequiredString(value['gameId'], 'Identifiant de jeu invalide.'),
    id: readRequiredString(value['id'], 'Identifiant de chronique invalide.'),
    title: readOptionalString(value['title']),
    content: readOptionalString(value['content']),
    emotion: parsedEmotion,
    date: readOptionalString(value['date']),
    favorite: readOptionalBoolean(value['favorite'], 'Favori invalide.'),
  }
}

function parseDeleteChronicleInput(value: unknown): DeleteChronicleInput {
  if (!isRecord(value)) {
    throw new Error('Les donnees de chronique sont invalides.')
  }

  return {
    gameId: readRequiredString(value['gameId'], 'Identifiant de jeu invalide.'),
    id: readRequiredString(value['id'], 'Identifiant de chronique invalide.'),
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

function parseUpdatePlaySessionInput(value: unknown): UpdatePlaySessionInput {
  if (!isRecord(value)) {
    throw new Error('Les donnees de session sont invalides.')
  }

  const durationMinutes = value['durationMinutes']

  if (durationMinutes !== undefined && typeof durationMinutes !== 'number') {
    throw new Error('Les donnees de session sont invalides.')
  }

  return {
    gameId: readRequiredString(value['gameId'], 'Identifiant de jeu invalide.'),
    id: readRequiredString(value['id'], 'Identifiant de session invalide.'),
    start: readOptionalString(value['start']),
    durationMinutes,
    note: readNullableString(value['note'], 'Commentaire invalide.'),
    platformName: readNullableString(value['platformName'], 'Plateforme invalide.'),
  }
}

function parseDeletePlaySessionInput(value: unknown): DeletePlaySessionInput {
  if (!isRecord(value)) {
    throw new Error('Les donnees de session sont invalides.')
  }

  return {
    gameId: readRequiredString(value['gameId'], 'Identifiant de jeu invalide.'),
    id: readRequiredString(value['id'], 'Identifiant de session invalide.'),
  }
}

function parseCreateDlcInput(value: unknown): CreateDlcInput {
  if (!isRecord(value)) {
    throw new Error('Les donnees du DLC sont invalides.')
  }

  return {
    gameId: readRequiredString(value['gameId'], 'Identifiant de jeu invalide.'),
    name: readRequiredString(value['name'], 'Le nom du DLC est obligatoire.'),
    releaseDate: readOptionalString(value['releaseDate']),
    owned: readOptionalBoolean(value['owned'], 'Etat de possession invalide.'),
    completed: readOptionalBoolean(value['completed'], 'Etat de completion invalide.'),
  }
}

function parseUpdateDlcInput(value: unknown): UpdateDlcInput {
  if (!isRecord(value)) {
    throw new Error('Les donnees du DLC sont invalides.')
  }

  return {
    gameId: readRequiredString(value['gameId'], 'Identifiant de jeu invalide.'),
    id: readRequiredString(value['id'], 'Identifiant de DLC invalide.'),
    name: readOptionalString(value['name']),
    releaseDate: readNullableString(value['releaseDate'], 'Date de sortie invalide.'),
    owned: readOptionalBoolean(value['owned'], 'Etat de possession invalide.'),
    completed: readOptionalBoolean(value['completed'], 'Etat de completion invalide.'),
  }
}

function parseDeleteDlcInput(value: unknown): DeleteDlcInput {
  if (!isRecord(value)) {
    throw new Error('Les donnees du DLC sont invalides.')
  }

  return {
    gameId: readRequiredString(value['gameId'], 'Identifiant de jeu invalide.'),
    id: readRequiredString(value['id'], 'Identifiant de DLC invalide.'),
  }
}

function parseCreateAchievementInput(value: unknown): CreateAchievementInput {
  if (!isRecord(value)) {
    throw new Error('Les donnees du succes sont invalides.')
  }

  return {
    gameId: readRequiredString(value['gameId'], 'Identifiant de jeu invalide.'),
    name: readRequiredString(value['name'], 'Le nom du succes est obligatoire.'),
    description: readOptionalString(value['description']),
    iconUrl: readOptionalString(value['iconUrl']),
    provider: readOptionalString(value['provider']),
    unlocked: readOptionalBoolean(value['unlocked'], 'Etat de deblocage invalide.'),
    unlockDate: readOptionalString(value['unlockDate']),
  }
}

function parseUpdateAchievementInput(value: unknown): UpdateAchievementInput {
  if (!isRecord(value)) {
    throw new Error('Les donnees du succes sont invalides.')
  }

  return {
    gameId: readRequiredString(value['gameId'], 'Identifiant de jeu invalide.'),
    id: readRequiredString(value['id'], 'Identifiant de succes invalide.'),
    name: readOptionalString(value['name']),
    description: readNullableString(value['description'], 'Description invalide.'),
    iconUrl: readNullableString(value['iconUrl'], 'Icone invalide.'),
    provider: readNullableString(value['provider'], 'Fournisseur invalide.'),
    unlocked: readOptionalBoolean(value['unlocked'], 'Etat de deblocage invalide.'),
    unlockDate: readNullableString(value['unlockDate'], 'Date de deblocage invalide.'),
  }
}

function parseDeleteAchievementInput(value: unknown): DeleteAchievementInput {
  if (!isRecord(value)) {
    throw new Error('Les donnees du succes sont invalides.')
  }

  return {
    gameId: readRequiredString(value['gameId'], 'Identifiant de jeu invalide.'),
    id: readRequiredString(value['id'], 'Identifiant de succes invalide.'),
  }
}

function parseCreateScreenshotInput(value: unknown): CreateScreenshotInput {
  if (!isRecord(value)) {
    throw new Error('Les donnees de la capture sont invalides.')
  }

  return {
    gameId: readRequiredString(value['gameId'], 'Identifiant de jeu invalide.'),
    path: readRequiredString(value['path'], 'Le chemin de la capture est obligatoire.'),
    description: readOptionalString(value['description']),
    chronicleId: readOptionalString(value['chronicleId']),
  }
}

function parseImportScreenshotFileInput(value: unknown): ImportScreenshotFileInput {
  if (!isRecord(value)) {
    throw new Error('Les donnees de la capture sont invalides.')
  }

  return {
    gameId: readRequiredString(value['gameId'], 'Identifiant de jeu invalide.'),
    description: readOptionalString(value['description']),
    chronicleId: readOptionalString(value['chronicleId']),
  }
}

function parseUpdateScreenshotInput(value: unknown): UpdateScreenshotInput {
  if (!isRecord(value)) {
    throw new Error('Les donnees de la capture sont invalides.')
  }

  return {
    gameId: readRequiredString(value['gameId'], 'Identifiant de jeu invalide.'),
    id: readRequiredString(value['id'], 'Identifiant de capture invalide.'),
    path: readOptionalString(value['path']),
    description: readNullableString(value['description'], 'Description invalide.'),
    chronicleId: readNullableString(value['chronicleId'], 'Chronique liee invalide.'),
  }
}

function parseDeleteScreenshotInput(value: unknown): DeleteScreenshotInput {
  if (!isRecord(value)) {
    throw new Error('Les donnees de la capture sont invalides.')
  }

  return {
    gameId: readRequiredString(value['gameId'], 'Identifiant de jeu invalide.'),
    id: readRequiredString(value['id'], 'Identifiant de capture invalide.'),
  }
}

function parseUpdateReviewInput(value: unknown): UpdateReviewInput {
  if (!isRecord(value) || typeof value['rating'] !== 'number') {
    throw new Error('Les donnees de l evaluation sont invalides.')
  }

  const rating = Math.round(value['rating'])

  if (rating < 1 || rating > 10) {
    throw new Error('La note doit etre comprise entre 1 et 10.')
  }

  return {
    gameId: readRequiredString(value['gameId'], 'Identifiant de jeu invalide.'),
    rating,
    content: readNullableString(value['content'], 'Avis invalide.'),
    strengths: readNullableString(value['strengths'], 'Points forts invalides.'),
    weaknesses: readNullableString(value['weaknesses'], 'Points faibles invalides.'),
    mainMemory: readNullableString(value['mainMemory'], 'Souvenir principal invalide.'),
    favorite: readOptionalBoolean(value['favorite'], 'Favori invalide.'),
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

  ipcMain.handle('library:listLifeEvents', async () => {
    try {
      return await libraryService.listLifeEvents()
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

  ipcMain.handle('games:listArchived', async () => {
    try {
      return await gameService.listArchivedGames()
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

  ipcMain.handle('games:archive', async (_event, id: unknown) => {
    try {
      await gameService.archiveGame(readRequiredString(id, 'Identifiant de jeu invalide.'))
    } catch (error) {
      logger.error('[LibraryIPC]', error)
      throw error
    }
  })

  ipcMain.handle('games:restore', async (_event, id: unknown) => {
    try {
      await gameService.restoreGame(readRequiredString(id, 'Identifiant de jeu invalide.'))
    } catch (error) {
      logger.error('[LibraryIPC]', error)
      throw error
    }
  })

  ipcMain.handle('games:delete', async (_event, id: unknown) => {
    try {
      await gameService.deleteGame(readRequiredString(id, 'Identifiant de jeu invalide.'))
    } catch (error) {
      logger.error('[LibraryIPC]', error)
      throw error
    }
  })

  ipcMain.handle('games:updateReview', async (_event, input: unknown) => {
    try {
      return await gameService.updateReview(parseUpdateReviewInput(input))
    } catch (error) {
      logger.error('[LibraryIPC]', error)
      throw error
    }
  })

  ipcMain.handle('games:createDlc', async (_event, input: unknown) => {
    try {
      return await gameService.createDlc(parseCreateDlcInput(input))
    } catch (error) {
      logger.error('[LibraryIPC]', error)
      throw error
    }
  })

  ipcMain.handle('games:updateDlc', async (_event, input: unknown) => {
    try {
      return await gameService.updateDlc(parseUpdateDlcInput(input))
    } catch (error) {
      logger.error('[LibraryIPC]', error)
      throw error
    }
  })

  ipcMain.handle('games:deleteDlc', async (_event, input: unknown) => {
    try {
      return await gameService.deleteDlc(parseDeleteDlcInput(input))
    } catch (error) {
      logger.error('[LibraryIPC]', error)
      throw error
    }
  })

  ipcMain.handle('games:createAchievement', async (_event, input: unknown) => {
    try {
      return await gameService.createAchievement(parseCreateAchievementInput(input))
    } catch (error) {
      logger.error('[LibraryIPC]', error)
      throw error
    }
  })

  ipcMain.handle('games:updateAchievement', async (_event, input: unknown) => {
    try {
      return await gameService.updateAchievement(parseUpdateAchievementInput(input))
    } catch (error) {
      logger.error('[LibraryIPC]', error)
      throw error
    }
  })

  ipcMain.handle('games:deleteAchievement', async (_event, input: unknown) => {
    try {
      return await gameService.deleteAchievement(parseDeleteAchievementInput(input))
    } catch (error) {
      logger.error('[LibraryIPC]', error)
      throw error
    }
  })

  ipcMain.handle('games:createScreenshot', async (_event, input: unknown) => {
    try {
      return await gameService.createScreenshot(parseCreateScreenshotInput(input))
    } catch (error) {
      logger.error('[LibraryIPC]', error)
      throw error
    }
  })

  ipcMain.handle('games:importScreenshotFile', async (_event, input: unknown) => {
    try {
      const parsedInput = parseImportScreenshotFileInput(input)
      const result = await dialog.showOpenDialog({
        title: 'Importer une capture Ludux',
        properties: ['openFile'],
        filters: [
          {
            name: 'Images',
            extensions: ['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp', 'avif'],
          },
        ],
      })

      if (result.canceled || result.filePaths.length === 0) {
        const detail = await gameService.getGameById(parsedInput.gameId)

        if (!detail) {
          throw new Error('Jeu introuvable.')
        }

        return detail
      }

      return await gameService.importScreenshotFile({
        ...parsedInput,
        sourcePath: result.filePaths[0],
      })
    } catch (error) {
      logger.error('[LibraryIPC]', error)
      throw error
    }
  })

  ipcMain.handle('games:updateScreenshot', async (_event, input: unknown) => {
    try {
      return await gameService.updateScreenshot(parseUpdateScreenshotInput(input))
    } catch (error) {
      logger.error('[LibraryIPC]', error)
      throw error
    }
  })

  ipcMain.handle('games:deleteScreenshot', async (_event, input: unknown) => {
    try {
      return await gameService.deleteScreenshot(parseDeleteScreenshotInput(input))
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

  ipcMain.handle('games:updateChronicle', async (_event, input: unknown) => {
    try {
      return await gameService.updateChronicle(parseUpdateChronicleInput(input))
    } catch (error) {
      logger.error('[LibraryIPC]', error)
      throw error
    }
  })

  ipcMain.handle('games:deleteChronicle', async (_event, input: unknown) => {
    try {
      return await gameService.deleteChronicle(parseDeleteChronicleInput(input))
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

  ipcMain.handle('games:updatePlaySession', async (_event, input: unknown) => {
    try {
      return await gameService.updatePlaySession(parseUpdatePlaySessionInput(input))
    } catch (error) {
      logger.error('[LibraryIPC]', error)
      throw error
    }
  })

  ipcMain.handle('games:deletePlaySession', async (_event, input: unknown) => {
    try {
      return await gameService.deletePlaySession(parseDeletePlaySessionInput(input))
    } catch (error) {
      logger.error('[LibraryIPC]', error)
      throw error
    }
  })
}
