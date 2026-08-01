import 'dotenv/config'
import {
  app,
  BrowserWindow,
  dialog,
  Menu,
  net,
  protocol,
  shell,
} from 'electron'
import { access } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { runBundledDatabaseMigrations } from '../database/migrations'
import {
  getLuduxDatabasePath,
  migrateLegacyLuduxData,
} from '../services/app-data'
import { startAppUpdater } from '../services/app-updater'
import { logger } from '../utils/logger'
import { registerWindowHandlers } from './ipc/window.ipc'

const localGameCacheProtocol = 'ludux-cache'
const isElectronE2E = process.env['LUDUX_E2E'] === '1'
const startupStartedAt = performance.now()
let stopAutoSync: (() => void) | null = null
let stopAppUpdater: (() => void) | null = null
let disconnectDatabase: (() => Promise<void>) | null = null
let runtimeReady = false

app.setName('Ludux')

if (isElectronE2E && process.env['LUDUX_E2E_USER_DATA_DIR']) {
  app.setPath('userData', resolve(process.env['LUDUX_E2E_USER_DATA_DIR']))
}

if (process.platform === 'win32') {
  app.setAppUserModelId('com.akamasu.ludux')
}

protocol.registerSchemesAsPrivileged([
  {
    scheme: localGameCacheProtocol,
    privileges: {
      secure: true,
      standard: true,
      supportFetchAPI: true,
    },
  },
])

function registerLocalGameCacheProtocol(
  resolveLocalGameCacheUrl: (url: string) => string | null,
  resolveLocalGameCacheRemoteCoverUrl: (url: string) => Promise<string | null>,
) {
  protocol.handle(localGameCacheProtocol, async (request) => {
    const resourcePath = resolveLocalGameCacheUrl(request.url)

    if (resourcePath) {
      try {
        await access(resourcePath)
        return net.fetch(pathToFileURL(resourcePath).toString())
      } catch {
        // The lightweight cache may evict a cover that remains referenced locally.
      }
    }

    const remoteCoverUrl = await resolveLocalGameCacheRemoteCoverUrl(request.url)

    if (remoteCoverUrl) {
      try {
        const response = await fetch(remoteCoverUrl, {
          signal: AbortSignal.timeout(10_000),
        })

        if (response.ok) {
          return response
        }
      } catch {
        // The renderer will display its regular cover placeholder while offline.
      }
    }

    return new Response('Cache introuvable.', {
      status: 404,
    })
  })
}

async function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 760,
    minHeight: 560,
    show: false,
    title: 'Ludux - Mémoire vidéoludique',
    icon: join(__dirname, '../renderer/ludux-logo.png'),
    frame: false,
    autoHideMenuBar: true,
    backgroundColor: '#0F1117',
    webPreferences: {
      preload: join(__dirname, '../preload/preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  mainWindow.once('ready-to-show', () => {
    if (!isElectronE2E) {
      mainWindow.show()
    }
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

async function initializeApplication() {
  const targetDataDirectory = join(app.getPath('userData'), 'data')
  const legacyDirectories = isElectronE2E
    ? []
    : [join(app.getAppPath(), 'userdata'), resolve('userdata')]
  const storageMigration = await migrateLegacyLuduxData({
    legacyDirectories,
    targetDirectory: targetDataDirectory,
  })

  process.env['LUDUX_DATA_DIR'] = targetDataDirectory

  if (storageMigration.migrated) {
    logger.info(
      '[AppData]',
      `Données migrées depuis ${storageMigration.sourceDirectory} vers ${storageMigration.targetDirectory}.`,
    )
  }

  const migrationsDirectory = app.isPackaged
    ? join(process.resourcesPath, 'prisma', 'migrations')
    : join(app.getAppPath(), 'prisma', 'migrations')
  const migrationResult = await runBundledDatabaseMigrations({
    appVersion: app.getVersion(),
    backupDirectory: join(targetDataDirectory, 'backups'),
    databasePath: getLuduxDatabasePath(targetDataDirectory),
    migrationsDirectory,
  })

  if (migrationResult.appliedMigrations.length > 0) {
    logger.info(
      '[Database]',
      `${migrationResult.appliedMigrations.length} migration(s) appliquée(s).`,
    )
  }

  const [
    { prisma },
    { resolveLocalGameCacheRemoteCoverUrl, resolveLocalGameCacheUrl },
    { settingsService },
    { registerLibraryHandlers },
    { registerSettingsHandlers },
  ] = await Promise.all([
    import('../database/client'),
    import('../services/local-game-cache'),
    import('../services/settings.service'),
    import('./ipc/library.ipc'),
    import('./ipc/settings.ipc'),
  ])

  registerLibraryHandlers()
  registerSettingsHandlers()
  registerWindowHandlers()
  registerLocalGameCacheProtocol(
    resolveLocalGameCacheUrl,
    resolveLocalGameCacheRemoteCoverUrl,
  )

  stopAutoSync = () => settingsService.stopAutoSync()
  disconnectDatabase = () => prisma.$disconnect()

  Menu.setApplicationMenu(null)
  await createWindow()

  if (!isElectronE2E) {
    settingsService.startAutoSync()
    stopAppUpdater = startAppUpdater()
  }

  runtimeReady = true
  logger.info(
    '[Performance]',
    `Ludux prêt en ${Math.round(performance.now() - startupStartedAt)} ms.`,
  )
}

app.whenReady().then(initializeApplication).catch((error: unknown) => {
  logger.error('[ElectronMain]', error)
  dialog.showErrorBox(
    'Ludux ne peut pas démarrer',
    error instanceof Error
      ? error.message
      : 'Une erreur inattendue empêche Ludux de démarrer.',
  )
  app.quit()
})

app.on('activate', () => {
  if (runtimeReady && BrowserWindow.getAllWindows().length === 0) {
    void createWindow()
  }
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('before-quit', () => {
  stopAutoSync?.()
  stopAppUpdater?.()
  void disconnectDatabase?.()
})
