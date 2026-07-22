import type { ExternalProvider } from '../types/settings'

const providerSyncOrder: ExternalProvider[] = [
  'STEAM',
  'EPIC',
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
