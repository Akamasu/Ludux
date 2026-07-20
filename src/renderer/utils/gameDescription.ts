const catalogueHeadingPattern = /\b([A-Z][A-Z0-9 &',-]{3,}:)\s*/g
const sentencePattern = /[^.!?]+[.!?]+(?:["')\]]+)?|[^.!?]+$/g
const targetParagraphLength = 560

function splitLongDescriptionBlock(block: string) {
  if (block.length <= targetParagraphLength) {
    return [block]
  }

  const sentences = block.match(sentencePattern)?.map((sentence) => sentence.trim()) ?? [block]
  const paragraphs: string[] = []
  let currentParagraph = ''

  for (const sentence of sentences) {
    const nextParagraph = currentParagraph
      ? `${currentParagraph} ${sentence}`
      : sentence

    if (currentParagraph && nextParagraph.length > targetParagraphLength) {
      paragraphs.push(currentParagraph)
      currentParagraph = sentence
    } else {
      currentParagraph = nextParagraph
    }
  }

  if (currentParagraph) {
    paragraphs.push(currentParagraph)
  }

  return paragraphs
}

export function isGameDescriptionHeading(block: string) {
  return /^[A-Z][A-Z0-9 &',-]{3,}:$/.test(block)
}

export function formatGameDescription(value: string | null | undefined) {
  const normalized = value
    ?.replace(/\r\n?/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/([.!?])(?=[A-Z][a-z])/g, '$1\n\n')
    .replace(catalogueHeadingPattern, '\n\n$1\n\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()

  if (!normalized) {
    return []
  }

  return normalized
    .split(/\n{2,}/)
    .map((block) => block.replace(/\n/g, ' ').trim())
    .filter(Boolean)
    .flatMap((block) =>
      isGameDescriptionHeading(block) ? [block] : splitLongDescriptionBlock(block),
    )
}
