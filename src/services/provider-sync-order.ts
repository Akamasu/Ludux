import type { ExternalProvider } from '../types/settings'

const providerSyncOrder: ExternalProvider[] = [
  'STEAM',
  'EPIC',
  'EA_APP',
  'UBISOFT',
  'BATTLENET',
  'GOG',
  'XBOX',
  'PLAYSTATION',
  'NINTENDO',
  'RAWG',
  'IGDB',
]

const providerSyncOrderIndex = new Map(
  providerSyncOrder.map((provider, index) => [provider, index]),
)

export function sortConfiguredSyncProviders(providers: ExternalProvider[]) {
  return Array.from(new Set(providers)).sort(
    (left, right) =>
      (providerSyncOrderIndex.get(left) ?? Number.MAX_SAFE_INTEGER) -
      (providerSyncOrderIndex.get(right) ?? Number.MAX_SAFE_INTEGER),
  )
}

export function filterProvidersDueForAutoSync(
  providers: ExternalProvider[],
  syncRecords: Array<{
    provider: string
    lastSync: Date | null
  }>,
  intervalMs: number,
  now = new Date(),
) {
  const latestSyncByProvider = new Map<string, number>()

  for (const record of syncRecords) {
    if (!record.lastSync) {
      continue
    }

    const syncedAt = record.lastSync.getTime()
    const currentLatest = latestSyncByProvider.get(record.provider)

    if (currentLatest === undefined || syncedAt > currentLatest) {
      latestSyncByProvider.set(record.provider, syncedAt)
    }
  }

  return providers.filter((provider) => {
    const lastSyncAt = latestSyncByProvider.get(provider)
    return lastSyncAt === undefined || now.getTime() - lastSyncAt >= intervalMs
  })
}
