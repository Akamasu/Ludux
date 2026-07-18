import { ipcMain } from 'electron'
import { settingsService } from '../../services/settings.service'
import { logger } from '../../utils/logger'

export function registerSettingsHandlers() {
  ipcMain.handle('settings:getOverview', async () => {
    try {
      return await settingsService.getOverview()
    } catch (error) {
      logger.error('[SettingsIPC]', error)
      throw error
    }
  })

  ipcMain.handle('settings:exportLibrary', async () => {
    try {
      return await settingsService.exportLibrary()
    } catch (error) {
      logger.error('[SettingsIPC]', error)
      throw error
    }
  })

  ipcMain.handle('settings:createBackup', async () => {
    try {
      return await settingsService.createBackup()
    } catch (error) {
      logger.error('[SettingsIPC]', error)
      throw error
    }
  })

  ipcMain.handle('settings:openDataFolder', async () => {
    try {
      return await settingsService.openDataFolder()
    } catch (error) {
      logger.error('[SettingsIPC]', error)
      throw error
    }
  })
}
