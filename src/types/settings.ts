export const EXTERNAL_PROVIDER_VALUES = [
  'STEAM',
  'XBOX',
  'PLAYSTATION',
  'NINTENDO',
  'GOG',
  'EPIC',
  'IGDB',
  'RAWG',
] as const

export type ExternalProvider = (typeof EXTERNAL_PROVIDER_VALUES)[number]

export interface ExternalProviderDefinition {
  provider: ExternalProvider
  label: string
  description: string
  capabilities: string[]
}

interface ExternalAccountItem {
  id: string
  provider: ExternalProvider
  externalId: string
  username: string | null
  hasToken: boolean
  createdAt: string
  updatedAt: string
}

interface ProviderSyncState {
  status: string | null
  message: string | null
  lastSync: string | null
  updatedAt: string
}

export interface ProviderConnection extends ExternalProviderDefinition {
  account: ExternalAccountItem | null
  sync: ProviderSyncState | null
  configured: boolean
}

export interface ProviderOverview {
  providers: ProviderConnection[]
  configuredCount: number
  totalProviders: number
  lastSyncAt: string | null
}

export interface LocalPlatformDetection {
  provider: ExternalProvider
  label: string
  detected: boolean
  rootPaths: string[]
  libraryPaths: string[]
  configPaths: string[]
  manifestCount: number
  message: string
}

interface LocalPlatformOverview {
  platforms: LocalPlatformDetection[]
  detectedCount: number
  scannedAt: string
}

export interface SettingsOverview {
  appVersion: string
  databasePath: string | null
  databaseSizeBytes: number
  exportDirectory: string
  backupDirectory: string
  lastBackupAt: string | null
  providerOverview: ProviderOverview
  localPlatformOverview: LocalPlatformOverview
}

export interface SettingsActionResult {
  canceled: boolean
  path: string | null
  message: string
  bytes?: number
  createdAt?: string
}

export interface UpsertProviderConnectionInput {
  provider: ExternalProvider
  externalId: string
  username?: string
  tokenHint?: string
}

export interface DeleteProviderConnectionInput {
  provider: ExternalProvider
  accountId: string
}

export interface SyncProviderInput {
  provider: ExternalProvider
}
