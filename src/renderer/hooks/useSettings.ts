import { useCallback, useEffect, useState } from 'react'
import { EXTERNAL_PROVIDER_DEFINITIONS } from '../../providers/registry'
import type {
  DeleteProviderConnectionInput,
  SettingsActionResult,
  SettingsOverview,
  SyncProviderInput,
  UpsertProviderConnectionInput,
} from '../../types/settings'

const BROWSER_PROVIDER_OVERVIEW = {
  providers: EXTERNAL_PROVIDER_DEFINITIONS.map((definition) => ({
    ...definition,
    account: null,
    sync: null,
    configured: false,
  })),
  configuredCount: 0,
  totalProviders: EXTERNAL_PROVIDER_DEFINITIONS.length,
  lastSyncAt: null,
}

const BROWSER_OVERVIEW: SettingsOverview = {
  appVersion: 'navigateur',
  databasePath: null,
  databaseSizeBytes: 0,
  exportDirectory: 'Electron requis',
  backupDirectory: 'Electron requis',
  lastBackupAt: null,
  providerOverview: BROWSER_PROVIDER_OVERVIEW,
}

const ELECTRON_ONLY_ACTION_MESSAGE =
  "Cette action est disponible dans la fenetre Electron de Ludux. Lance npm run dev et utilise la fenetre qui s'ouvre, pas l'URL du navigateur."

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
        message: ELECTRON_ONLY_ACTION_MESSAGE,
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
        message: ELECTRON_ONLY_ACTION_MESSAGE,
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
        message: ELECTRON_ONLY_ACTION_MESSAGE,
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

  const upsertProviderConnection = useCallback(
    async (input: UpsertProviderConnectionInput) => {
      const api = window.ludux

      if (!api) {
        setActionResult({
          canceled: true,
          path: null,
          message: ELECTRON_ONLY_ACTION_MESSAGE,
        })
        return
      }

      setIsBusy(true)
      setError(null)
      setActionResult(null)

      try {
        setOverview(await api.settings.upsertProviderConnection(input))
        setActionResult({
          canceled: false,
          path: null,
          message: 'Connexion provider enregistree localement.',
        })
      } catch (caughtError) {
        setError(caughtError instanceof Error ? caughtError.message : 'Erreur inconnue')
      } finally {
        setIsBusy(false)
      }
    },
    [],
  )

  const deleteProviderConnection = useCallback(
    async (input: DeleteProviderConnectionInput) => {
      const api = window.ludux

      if (!api) {
        setActionResult({
          canceled: true,
          path: null,
          message: ELECTRON_ONLY_ACTION_MESSAGE,
        })
        return
      }

      setIsBusy(true)
      setError(null)
      setActionResult(null)

      try {
        setOverview(await api.settings.deleteProviderConnection(input))
        setActionResult({
          canceled: false,
          path: null,
          message: 'Connexion provider retiree.',
        })
      } catch (caughtError) {
        setError(caughtError instanceof Error ? caughtError.message : 'Erreur inconnue')
      } finally {
        setIsBusy(false)
      }
    },
    [],
  )

  const syncProvider = useCallback(
    async (input: SyncProviderInput) => {
      const api = window.ludux

      if (!api) {
        setActionResult({
          canceled: true,
          path: null,
          message: ELECTRON_ONLY_ACTION_MESSAGE,
        })
        return
      }

      await runAction(() => api.settings.syncProvider(input))
    },
    [runAction],
  )

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
    upsertProviderConnection,
    deleteProviderConnection,
    syncProvider,
  }
}
