import { ipcMain } from 'electron'
import { settingsService } from '../../services/settings.service'
import {
  EXTERNAL_PROVIDER_VALUES,
  type DeleteProviderConnectionInput,
  type ExternalProvider,
  type SyncProviderInput,
  type UpsertProviderConnectionInput,
} from '../../types/settings'
import { logger } from '../../utils/logger'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isExternalProvider(value: unknown): value is ExternalProvider {
  return (
    typeof value === 'string' &&
    EXTERNAL_PROVIDER_VALUES.includes(value as ExternalProvider)
  )
}

function readRequiredString(value: unknown, message: string) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(message)
  }

  return value
}

function readOptionalString(value: unknown) {
  return typeof value === 'string' && value.trim().length > 0 ? value : undefined
}

function parseUpsertProviderConnectionInput(
  value: unknown,
): UpsertProviderConnectionInput {
  if (!isRecord(value) || !isExternalProvider(value['provider'])) {
    throw new Error('Les données du provider sont invalides.')
  }

  return {
    provider: value['provider'],
    externalId: readRequiredString(
      value['externalId'],
      'Identifiant externe obligatoire.',
    ),
    username: readOptionalString(value['username']),
    tokenHint: readOptionalString(value['tokenHint']),
  }
}

function parseDeleteProviderConnectionInput(
  value: unknown,
): DeleteProviderConnectionInput {
  if (!isRecord(value) || !isExternalProvider(value['provider'])) {
    throw new Error('Les données du provider sont invalides.')
  }

  return {
    provider: value['provider'],
    accountId: readRequiredString(value['accountId'], 'Connexion invalide.'),
  }
}

function parseSyncProviderInput(value: unknown): SyncProviderInput {
  if (!isRecord(value) || !isExternalProvider(value['provider'])) {
    throw new Error('Les données du provider sont invalides.')
  }

  return {
    provider: value['provider'],
  }
}

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

  ipcMain.handle('settings:upsertProviderConnection', async (_event, input: unknown) => {
    try {
      return await settingsService.upsertProviderConnection(
        parseUpsertProviderConnectionInput(input),
      )
    } catch (error) {
      logger.error('[SettingsIPC]', error)
      throw error
    }
  })

  ipcMain.handle('settings:deleteProviderConnection', async (_event, input: unknown) => {
    try {
      return await settingsService.deleteProviderConnection(
        parseDeleteProviderConnectionInput(input),
      )
    } catch (error) {
      logger.error('[SettingsIPC]', error)
      throw error
    }
  })

  ipcMain.handle('settings:syncProvider', async (_event, input: unknown) => {
    try {
      return await settingsService.syncProvider(parseSyncProviderInput(input))
    } catch (error) {
      logger.error('[SettingsIPC]', error)
      throw error
    }
  })

  ipcMain.handle('settings:syncAllProviders', async () => {
    try {
      return await settingsService.syncAllProviders()
    } catch (error) {
      logger.error('[SettingsIPC]', error)
      throw error
    }
  })
}
