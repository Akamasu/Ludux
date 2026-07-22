import type {
  ExternalProvider,
  ExternalProviderDefinition,
  ProviderSyncActivityItem,
} from '../types/settings'

export interface ProviderSyncRecord {
  id: string
  provider: string
  status: string | null
  message: string | null
  lastSync: Date | null
  createdAt: Date
  updatedAt: Date
}

function syncStatusPriority(status: string | null) {
  if (status === 'SYNCED' || status === 'ERROR') {
    return 3
  }

  if (status === 'READY') {
    return 2
  }

  if (status === 'SYNCING') {
    return 1
  }

  return 0
}

function sortSyncRecords(left: ProviderSyncRecord, right: ProviderSyncRecord) {
  return (
    right.updatedAt.getTime() - left.updatedAt.getTime() ||
    syncStatusPriority(right.status) - syncStatusPriority(left.status) ||
    right.createdAt.getTime() - left.createdAt.getTime() ||
    right.id.localeCompare(left.id)
  )
}

export function sortProviderSyncRecords(records: ProviderSyncRecord[]) {
  return records.slice().sort(sortSyncRecords)
}

function isStaleSyncingRecord(
  record: ProviderSyncRecord,
  latestRecordIdByProvider: Map<string, string>,
) {
  return (
    record.status === 'SYNCING' &&
    latestRecordIdByProvider.get(record.provider) !== record.id
  )
}

export function buildProviderSyncActivity(
  records: ProviderSyncRecord[],
  providerDefinitions: ExternalProviderDefinition[],
  limit = 12,
): ProviderSyncActivityItem[] {
  const providerLabels = new Map(
    providerDefinitions.map((definition) => [definition.provider, definition.label]),
  )
  const sortedRecords = sortProviderSyncRecords(records)
  const latestRecordIdByProvider = new Map<string, string>()

  for (const record of sortedRecords) {
    if (!latestRecordIdByProvider.has(record.provider)) {
      latestRecordIdByProvider.set(record.provider, record.id)
    }
  }

  return sortedRecords
    .filter((record) => !isStaleSyncingRecord(record, latestRecordIdByProvider))
    .slice(0, limit)
    .map((record) => {
      const provider = record.provider as ExternalProvider

      return {
        id: record.id,
        provider,
        providerLabel: providerLabels.get(provider) ?? record.provider,
        status: record.status,
        message: record.message,
        lastSync: record.lastSync?.toISOString() ?? null,
        createdAt: record.createdAt.toISOString(),
        updatedAt: record.updatedAt.toISOString(),
      }
    })
}
