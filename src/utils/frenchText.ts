const frenchSignals = [
  ' avec ',
  ' dans ',
  ' des ',
  ' est ',
  ' jeu ',
  ' joueurs ',
  ' les ',
  ' pour ',
  ' une ',
  ' vous ',
  ' votre ',
]

const englishSignals = [
  ' and ',
  ' experience ',
  ' explore ',
  ' features',
  ' game ',
  ' in ',
  ' players',
  ' the ',
  ' with ',
  ' world ',
  ' you ',
  ' your ',
]

function countSignals(value: string, signals: string[]) {
  const normalized = ` ${value.toLocaleLowerCase('fr-FR')} `

  return signals.reduce(
    (total, signal) => total + (normalized.includes(signal) ? 1 : 0),
    0,
  )
}

export function isLikelyFrenchText(value: string) {
  const accentCount = value.match(/[àâçéèêëîïôùûüÿœæ]/gi)?.length ?? 0
  const frenchScore = countSignals(value, frenchSignals) + accentCount
  const englishScore = countSignals(value, englishSignals)

  return frenchScore >= 2 && frenchScore >= englishScore
}

export function isLikelyEnglishText(value: string) {
  const englishScore = countSignals(value, englishSignals)
  const frenchScore = countSignals(value, frenchSignals)

  return englishScore >= 3 && englishScore > frenchScore
}

export function shouldPreferFrenchText(
  currentValue: string | null | undefined,
  frenchCandidate: string | null | undefined,
) {
  const candidate = frenchCandidate?.trim()

  if (!candidate) {
    return false
  }

  if (!currentValue?.trim()) {
    return true
  }

  if (!isLikelyFrenchText(candidate)) {
    return false
  }

  return isLikelyEnglishText(currentValue)
}
