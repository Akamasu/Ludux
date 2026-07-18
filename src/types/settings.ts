export interface SettingsOverview {
  appVersion: string
  databasePath: string | null
  databaseSizeBytes: number
  exportDirectory: string
  backupDirectory: string
  lastBackupAt: string | null
}

export interface SettingsActionResult {
  canceled: boolean
  path: string | null
  message: string
  bytes?: number
  createdAt?: string
}
