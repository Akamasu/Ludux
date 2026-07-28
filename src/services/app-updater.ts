import { app, Notification } from 'electron'
import { createRequire } from 'node:module'
import type { AppUpdater } from 'electron-updater'
import { logger } from '../utils/logger'

const require = createRequire(import.meta.url)

function loadAutoUpdater() {
  return (
    require('electron-updater') as {
      autoUpdater: AppUpdater
    }
  ).autoUpdater
}

const initialUpdateCheckDelayMs = 20_000
const updateCheckIntervalMs = 4 * 60 * 60_000

export function shouldStartAppUpdater({
  disabled,
  isPackaged,
}: {
  disabled: boolean
  isPackaged: boolean
}) {
  return isPackaged && !disabled
}

export function startAppUpdater() {
  const disabled = process.env['LUDUX_DISABLE_AUTO_UPDATE'] === '1'

  if (
    !shouldStartAppUpdater({
      disabled,
      isPackaged: app.isPackaged,
    })
  ) {
    return () => undefined
  }

  const autoUpdater = loadAutoUpdater()
  let checkInProgress = false

  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = true
  autoUpdater.allowDowngrade = false
  autoUpdater.allowPrerelease = false

  const checkForUpdates = async () => {
    if (checkInProgress) {
      return
    }

    checkInProgress = true

    try {
      await autoUpdater.checkForUpdates()
    } catch (error) {
      logger.error('[AppUpdater]', error)
    } finally {
      checkInProgress = false
    }
  }

  const handleUpdateAvailable = (info: { version: string }) => {
    logger.info(
      '[AppUpdater]',
      `Téléchargement de Ludux ${info.version} en arrière-plan.`,
    )
  }
  const handleUpdateDownloaded = (info: { version: string }) => {
    logger.info(
      '[AppUpdater]',
      `Ludux ${info.version} sera installé à la fermeture.`,
    )

    if (Notification.isSupported()) {
      new Notification({
        title: 'Mise à jour prête',
        body: `Ludux ${info.version} sera installé à la fermeture de l’application.`,
      }).show()
    }
  }
  const handleUpdateError = (error: Error) => {
    logger.error('[AppUpdater]', error)
  }

  autoUpdater.on('update-available', handleUpdateAvailable)
  autoUpdater.on('update-downloaded', handleUpdateDownloaded)
  autoUpdater.on('error', handleUpdateError)

  const initialTimer = setTimeout(() => {
    void checkForUpdates()
  }, initialUpdateCheckDelayMs)
  const intervalTimer = setInterval(() => {
    void checkForUpdates()
  }, updateCheckIntervalMs)

  return () => {
    clearTimeout(initialTimer)
    clearInterval(intervalTimer)
    autoUpdater.off('update-available', handleUpdateAvailable)
    autoUpdater.off('update-downloaded', handleUpdateDownloaded)
    autoUpdater.off('error', handleUpdateError)
  }
}
