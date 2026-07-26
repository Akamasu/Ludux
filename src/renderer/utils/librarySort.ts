const libraryTitleCollator = new Intl.Collator('fr-FR', {
  numeric: true,
  sensitivity: 'base',
})

export function sortLibraryItemsByTitle<T extends { title: string }>(
  items: readonly T[],
) {
  return [...items].sort((left, right) =>
    libraryTitleCollator.compare(left.title, right.title),
  )
}
