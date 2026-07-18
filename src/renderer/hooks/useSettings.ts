import { useCallback, useEffect, useState } from 'react'
import type { SettingsActionResult, SettingsOverview } from '../../types/settings'

const BROWSER_OVERVIEW: SettingsOverview = {
  appVersion: 'navigateur',
  databasePath: null,
  databaseSizeBytes: 0,
  exportDirectory: 'Electron requis',
  backupDirectory: 'Electron requis',
  lastBackupAt: null,
}

export function useSettings() {
  const [overview, setOverview] = useState<SettingsOverview>(BROWSER_OVERVIEW)
  const [isLoading, setIsLoading] = useState(true)
  const [isBusy, setIsBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [actionResult, setActionResult] = useState<SettingsActionResult | null>(null)

  const refresh = useCallback(async () => {
    const api = window.ludux

    if (!api) {
      setOverview(BROWSER_OVERVIEW)
      setError(null)
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      setOverview(await api.settings.getOverview())
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Erreur inconnue')
    } finally {
      setIsLoading(false)
    }
  }, [])

  const runAction = useCallback(
    async (action: () => Promise<SettingsActionResult>) => {
      setIsBusy(true)
      setError(null)
      setActionResult(null)

      try {
        const result = await action()
        setActionResult(result)
        await refresh()
      } catch (caughtError) {
        setError(caughtError instanceof Error ? caughtError.message : 'Erreur inconnue')
      } finally {
        setIsBusy(false)
      }
    },
    [refresh],
  )

  const exportLibrary = useCallback(async () => {
    const api = window.ludux

    if (!api) {
      setActionResult({
        canceled: true,
        path: null,
        message: 'Export disponible dans la version Electron.',
      })
      return
    }

    await runAction(api.settings.exportLibrary)
  }, [runAction])

  const createBackup = useCallback(async () => {
    const api = window.ludux

    if (!api) {
      setActionResult({
        canceled: true,
        path: null,
        message: 'Sauvegarde disponible dans la version Electron.',
      })
      return
    }

    await runAction(api.settings.createBackup)
  }, [runAction])

  const openDataFolder = useCallback(async () => {
    const api = window.ludux

    if (!api) {
      setActionResult({
        canceled: true,
        path: null,
        message: 'Dossier local disponible dans la version Electron.',
      })
      return
    }

    setIsBusy(true)
    setError(null)
    setActionResult(null)

    try {
      await api.settings.openDataFolder()
      setActionResult({
        canceled: false,
        path: null,
        message: 'Dossier local ouvert.',
      })
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Erreur inconnue')
    } finally {
      setIsBusy(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  return {
    overview,
    isLoading,
    isBusy,
    error,
    actionResult,
    refresh,
    exportLibrary,
    createBackup,
    openDataFolder,
  }
}
