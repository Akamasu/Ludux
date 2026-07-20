import { app, BrowserWindow, shell } from 'electron'
import { join } from 'node:path'
import { prisma } from '../database/client'
import { settingsService } from '../services/settings.service'
import { logger } from '../utils/logger'
import { registerLibraryHandlers } from './ipc/library.ipc'
import { registerSettingsHandlers } from './ipc/settings.ipc'

registerLibraryHandlers()
registerSettingsHandlers()

async function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 980,
    minHeight: 680,
    show: false,
    title: 'Ludux',
    backgroundColor: '#0F1117',
    webPreferences: {
      preload: join(__dirname, '../preload/preload.mjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  })

  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url)
    return { action: 'deny' }
  })

  const rendererUrl = process.env['ELECTRON_RENDERER_URL']

  if (rendererUrl) {
    await mainWindow.loadURL(rendererUrl)
    return
  }

  await mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
}

app.whenReady().then(async () => {
  settingsService.startAutoSync()
  await createWindow()
}).catch((error: unknown) => {
  logger.error('[ElectronMain]', error)
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    void createWindow()
  }
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('before-quit', () => {
  settingsService.stopAutoSync()
  void prisma.$disconnect()
})
