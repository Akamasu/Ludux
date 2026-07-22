import type { SteamAppDetails } from '../providers/steam'

const steamDlcFallbackPattern = /^steam dlc (\d+)$/i

interface SteamDlcCandidate {
  id: string
  name: string
  provider: string | null
  externalId: string | null
}

interface DlcBundleMergeCandidate {
  name: string
  releaseDate: Date | string | null
  owned: boolean
  ownedAt?: Date | string | null
  completed: boolean
  completedAt?: Date | string | null
}

export function createSteamDlcDisplayName(detail: SteamAppDetails) {
  return detail.title?.trim() || `Steam DLC ${detail.appid}`
}

export function hasResolvedSteamDlcName(detail: SteamAppDetails) {
  const title = detail.title?.trim()

  return Boolean(title && !isSteamDlcFallbackName(title, detail.appid))
}

export function normalizeDlcLookupText(value: string) {
  return value.trim().replace(/\s+/g, ' ').toLocaleLowerCase('fr-FR')
}

export function isSteamDlcFallbackName(value: string, appid?: number | string) {
  const match = normalizeDlcLookupText(value).match(steamDlcFallbackPattern)

  if (!match) {
    return false
  }

  return appid === undefined || match[1] === String(appid)
}

export function findMergeableSteamDlc<TDlc extends SteamDlcCandidate>(
  dlcs: TDlc[],
  detail: SteamAppDetails,
) {
  const externalId = String(detail.appid)
  const name = createSteamDlcDisplayName(detail)
  const normalizedName = normalizeDlcLookupText(name)

  return dlcs.find((dlc) => {
    if (dlc.externalId === externalId && dlc.provider === 'STEAM') {
      return true
    }

    if (dlc.provider === null && dlc.externalId === null) {
      return (
        normalizeDlcLookupText(dlc.name) === normalizedName ||
        isSteamDlcFallbackName(dlc.name, externalId)
      )
    }

    return false
  }) ?? null
}

export function shouldMergeSteamDlcCandidate(
  dlc: SteamDlcCandidate,
  detail: SteamAppDetails,
) {
  const externalId = String(detail.appid)
  const normalizedName = normalizeDlcLookupText(createSteamDlcDisplayName(detail))

  if (dlc.provider === 'STEAM' && dlc.externalId === externalId) {
    return true
  }

  if (dlc.provider !== null || dlc.externalId !== null) {
    return false
  }

  return (
    normalizeDlcLookupText(dlc.name) === normalizedName ||
    isSteamDlcFallbackName(dlc.name, externalId)
  )
}

function normalizeBundleBaseName(value: string) {
  const normalized = normalizeDlcLookupText(value)
  const baseName = normalized.replace(/\s+(premium\s+)?bundle$/, '').trim()

  return baseName === normalized ? null : baseName
}

export function filterSteamDlcCatalogDuplicates(catalog: SteamAppDetails[]) {
  const names = new Set(
    catalog.map((detail) => normalizeDlcLookupText(createSteamDlcDisplayName(detail))),
  )

  return catalog.filter((detail) => {
    const baseName = normalizeBundleBaseName(createSteamDlcDisplayName(detail))

    return !baseName || !names.has(baseName)
  })
}

export function mergeSteamDlcBundleDuplicates<TDlc extends DlcBundleMergeCandidate>(
  dlcs: TDlc[],
) {
  const mergedDlcs = dlcs.map((dlc) => ({ ...dlc }))
  const dlcsByName = new Map(
    mergedDlcs.map((dlc) => [normalizeDlcLookupText(dlc.name), dlc]),
  )
  const hiddenBundleNames = new Set<string>()

  for (const dlc of mergedDlcs) {
    const baseName = normalizeBundleBaseName(dlc.name)

    if (!baseName) {
      continue
    }

    const baseDlc = dlcsByName.get(baseName)

    if (!baseDlc || baseDlc === dlc) {
      continue
    }

    baseDlc.owned = baseDlc.owned || dlc.owned
    baseDlc.ownedAt = baseDlc.ownedAt ?? dlc.ownedAt
    baseDlc.completed = baseDlc.completed || dlc.completed
    baseDlc.completedAt = baseDlc.completedAt ?? dlc.completedAt
    baseDlc.releaseDate = baseDlc.releaseDate ?? dlc.releaseDate
    hiddenBundleNames.add(normalizeDlcLookupText(dlc.name))
  }

  return mergedDlcs.filter((dlc) => !hiddenBundleNames.has(normalizeDlcLookupText(dlc.name)))
}
