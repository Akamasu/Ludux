import type {
  GameIgnoredProviderLink,
  GameProviderLink,
  GameProviderLinkMatchStatus,
} from '../types/game'

interface ProviderLinkRecord {
  id: string
  provider: string
  externalId: string
  sourceTitle: string | null
  sourceCoverUrl: string | null
  lastSyncedAt: Date | null
}

interface IgnoredProviderLinkRecord {
  id: string
  provider: string
  externalId: string
  sourceTitle: string | null
  createdAt: Date
}

const providerLabels = new Map([
  ['STEAM', 'Steam'],
  ['EPIC', 'Epic Games'],
  ['GOG', 'GOG'],
  ['RAWG', 'RAWG'],
  ['IGDB', 'IGDB'],
  ['XBOX', 'Xbox'],
  ['PLAYSTATION', 'PlayStation'],
  ['NINTENDO', 'Nintendo'],
])

function normalizeComparableTitle(value: string) {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[™®©]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .trim()
    .toLocaleLowerCase('fr-FR')
}

export function resolveProviderLinkMatchStatus(
  gameTitle: string,
  sourceTitle: string | null,
): GameProviderLinkMatchStatus {
  if (!sourceTitle) {
    return 'UNKNOWN'
  }

  const localTitle = normalizeComparableTitle(gameTitle)
  const providerTitle = normalizeComparableTitle(sourceTitle)

  if (!localTitle || !providerTitle) {
    return 'UNKNOWN'
  }

  if (
    localTitle === providerTitle ||
    localTitle.includes(providerTitle) ||
    providerTitle.includes(localTitle)
  ) {
    return 'CONFIDENT'
  }

  return 'REVIEW'
}

function createProviderLinkUrl(provider: string, externalId: string) {
  if (provider === 'STEAM' && /^\d+$/.test(externalId)) {
    return `https://store.steampowered.com/app/${externalId}/`
  }

  if (provider === 'RAWG') {
    return 'https://rawg.io/'
  }

  if (provider === 'IGDB') {
    return 'https://www.igdb.com/'
  }

  if (provider === 'EPIC') {
    return 'https://store.epicgames.com/'
  }

  if (provider === 'GOG') {
    return 'https://www.gog.com/'
  }

  return null
}

export function buildGameProviderLink(
  gameTitle: string,
  record: ProviderLinkRecord,
): GameProviderLink {
  const matchStatus = resolveProviderLinkMatchStatus(gameTitle, record.sourceTitle)

  return {
    id: record.id,
    provider: record.provider,
    label: providerLabels.get(record.provider) ?? record.provider,
    externalId: record.externalId,
    sourceTitle: record.sourceTitle,
    sourceCoverUrl: record.sourceCoverUrl,
    url: createProviderLinkUrl(record.provider, record.externalId),
    lastSyncedAt: record.lastSyncedAt?.toISOString() ?? null,
    matchStatus,
    matchReason:
      matchStatus === 'REVIEW'
        ? 'Le titre trouvé ne correspond pas exactement au titre dans Ludux.'
        : null,
  }
}

export function buildIgnoredGameProviderLink(
  record: IgnoredProviderLinkRecord,
): GameIgnoredProviderLink {
  return {
    id: record.id,
    provider: record.provider,
    label: providerLabels.get(record.provider) ?? record.provider,
    externalId: record.externalId,
    sourceTitle: record.sourceTitle,
    url: createProviderLinkUrl(record.provider, record.externalId),
    createdAt: record.createdAt.toISOString(),
  }
}
