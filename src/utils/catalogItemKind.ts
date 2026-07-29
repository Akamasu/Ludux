export type CatalogItemKind = 'GAME' | 'UTILITY' | 'UNKNOWN'

const utilityWords = new Set([
  'application',
  'applications',
  'editor',
  'editors',
  'logiciel',
  'logiciels',
  'outil',
  'outils',
  'software',
  'tool',
  'tools',
  'utilities',
  'utility',
])

const utilityApplicationTypes = new Set([
  'application',
  'editor',
  'software',
  'tool',
  'utility',
])

const gameApplicationTypes = new Set(['game'])

function normalizeKindValue(value: string) {
  return value
    .normalize('NFKD')
    .replace(/\p{Diacritic}/gu, '')
    .toLocaleLowerCase('en-US')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function hasUtilityCategory(categories: string[]) {
  return categories.some((category) =>
    normalizeKindValue(category)
      .split(/\s+/)
      .some((word) => utilityWords.has(word)),
  )
}

function hasGameCategory(categories: string[]) {
  return categories.some((category) => {
    const normalizedCategory = normalizeKindValue(category)

    return normalizedCategory === 'game' || normalizedCategory === 'games'
  })
}

export function detectCatalogItemKind({
  applicationType,
  categories = [],
}: {
  applicationType?: string | null
  categories?: string[]
}): CatalogItemKind {
  const normalizedApplicationType = applicationType
    ? normalizeKindValue(applicationType)
    : ''

  if (
    utilityApplicationTypes.has(normalizedApplicationType) ||
    hasUtilityCategory(categories)
  ) {
    return 'UTILITY'
  }

  if (
    gameApplicationTypes.has(normalizedApplicationType) ||
    hasGameCategory(categories)
  ) {
    return 'GAME'
  }

  return 'UNKNOWN'
}
