import { readdir, readFile, stat } from 'node:fs/promises'
import { basename, join } from 'node:path'
import { unzipSync } from 'fflate'

export interface UbisoftAchievement {
  externalId: string
  name: string
  description: string | null
  iconUrl: null
  unlocked: boolean
  unlockDate: string | null
}

export interface UbisoftAchievementUnlock {
  externalId: string
  unlockDate: string
}

interface UbisoftAchievementArchive {
  gameId: string
  path: string
  modifiedAt: number
}

interface ProtobufVarint {
  nextOffset: number
  value: bigint
}

const achievementArchiveMaxBytes = 32 * 1024 * 1024
const achievementLocalizationMaxBytes = 2 * 1024 * 1024

function readProtobufVarint(
  buffer: Uint8Array,
  offset: number,
): ProtobufVarint {
  let value = 0n
  let shift = 0n

  for (let index = 0; index < 10 && offset + index < buffer.length; index += 1) {
    const byte = BigInt(buffer[offset + index] ?? 0)
    value |= (byte & 0x7fn) << shift

    if ((byte & 0x80n) === 0n) {
      return {
        nextOffset: offset + index + 1,
        value,
      }
    }

    shift += 7n
  }

  throw new Error('Varint protobuf Ubisoft invalide.')
}

function readLengthDelimitedField(buffer: Uint8Array, offset: number) {
  const length = readProtobufVarint(buffer, offset)
  const size = Number(length.value)
  const endOffset = length.nextOffset + size

  if (!Number.isSafeInteger(size) || size < 0 || endOffset > buffer.length) {
    throw new Error('Champ protobuf Ubisoft tronqué.')
  }

  return {
    endOffset,
    nextOffset: length.nextOffset,
  }
}

function skipProtobufField(
  buffer: Uint8Array,
  offset: number,
  wireType: number,
) {
  if (wireType === 0) {
    return readProtobufVarint(buffer, offset).nextOffset
  }

  if (wireType === 1) {
    const nextOffset = offset + 8

    if (nextOffset > buffer.length) {
      throw new Error('Champ protobuf Ubisoft tronqué.')
    }

    return nextOffset
  }

  if (wireType === 2) {
    return readLengthDelimitedField(buffer, offset).endOffset
  }

  if (wireType === 5) {
    const nextOffset = offset + 4

    if (nextOffset > buffer.length) {
      throw new Error('Champ protobuf Ubisoft tronqué.')
    }

    return nextOffset
  }

  throw new Error(`Type protobuf Ubisoft non pris en charge: ${wireType}.`)
}

function parseUbisoftAchievementKey(buffer: Uint8Array) {
  let offset = 0

  while (offset < buffer.length) {
    const tag = readProtobufVarint(buffer, offset)
    const fieldNumber = Number(tag.value >> 3n)
    const wireType = Number(tag.value & 0x07n)
    offset = tag.nextOffset

    if (fieldNumber === 1 && wireType === 0) {
      const achievementId = readProtobufVarint(buffer, offset)
      const value = Number(achievementId.value)

      return Number.isSafeInteger(value) && value > 0 ? String(value) : null
    }

    offset = skipProtobufField(buffer, offset, wireType)
  }

  return null
}

function parseUbisoftAchievementUnlockEntry(buffer: Uint8Array) {
  let externalId: string | null = null
  let timestamp: number | null = null
  let offset = 0

  while (offset < buffer.length) {
    const tag = readProtobufVarint(buffer, offset)
    const fieldNumber = Number(tag.value >> 3n)
    const wireType = Number(tag.value & 0x07n)
    offset = tag.nextOffset

    if (fieldNumber === 1 && wireType === 2) {
      const field = readLengthDelimitedField(buffer, offset)
      externalId = parseUbisoftAchievementKey(
        buffer.subarray(field.nextOffset, field.endOffset),
      )
      offset = field.endOffset
      continue
    }

    if (fieldNumber === 2 && wireType === 0) {
      const unlockedAt = readProtobufVarint(buffer, offset)
      const value = Number(unlockedAt.value)

      timestamp = Number.isSafeInteger(value) && value > 0 ? value : null
      offset = unlockedAt.nextOffset
      continue
    }

    offset = skipProtobufField(buffer, offset, wireType)
  }

  if (!externalId || timestamp === null) {
    return null
  }

  const unlockDate = new Date(timestamp * 1_000)

  if (Number.isNaN(unlockDate.getTime())) {
    return null
  }

  return {
    externalId,
    unlockDate: unlockDate.toISOString(),
  } satisfies UbisoftAchievementUnlock
}

export function parseUbisoftAchievementSpool(buffer: Uint8Array) {
  const unlocks: UbisoftAchievementUnlock[] = []
  let offset = 0

  while (offset < buffer.length) {
    const tag = readProtobufVarint(buffer, offset)
    const fieldNumber = Number(tag.value >> 3n)
    const wireType = Number(tag.value & 0x07n)
    offset = tag.nextOffset

    if (fieldNumber === 1 && wireType === 2) {
      const field = readLengthDelimitedField(buffer, offset)
      const unlock = parseUbisoftAchievementUnlockEntry(
        buffer.subarray(field.nextOffset, field.endOffset),
      )

      if (unlock) {
        unlocks.push(unlock)
      }

      offset = field.endOffset
      continue
    }

    offset = skipProtobufField(buffer, offset, wireType)
  }

  return unlocks
}

export function parseUbisoftAchievementLocalization(content: string) {
  const achievementsById = new Map<
    string,
    Omit<UbisoftAchievement, 'unlocked' | 'unlockDate'>
  >()
  const normalizedContent =
    content.charCodeAt(0) === 0xfeff ? content.slice(1) : content

  for (const line of normalizedContent.split(/\r?\n/)) {
    const [externalIdValue, nameValue, ...descriptionParts] = line.split('\t')
    const externalId = externalIdValue?.trim()
    const name = nameValue?.trim()

    if (!externalId || !name) {
      continue
    }

    const description = descriptionParts.join('\t').trim()

    achievementsById.set(externalId, {
      externalId,
      name,
      description: description || null,
      iconUrl: null,
    })
  }

  return Array.from(achievementsById.values())
}

function readArchiveLocalization(buffer: Uint8Array) {
  const files = unzipSync(buffer, {
    filter: (file) =>
      /(?:fr-FR|en-US)_loc\.txt$/i.test(file.name) &&
      file.originalSize <= achievementLocalizationMaxBytes,
  })
  const entries = Object.entries(files)
  const localizedFile =
    entries.find(([name]) => /(^|\/)fr-FR_loc\.txt$/i.test(name)) ??
    entries.find(([name]) => /(^|\/)en-US_loc\.txt$/i.test(name))

  if (!localizedFile) {
    return []
  }

  return parseUbisoftAchievementLocalization(
    new TextDecoder('utf-8').decode(localizedFile[1]),
  )
}

async function readDirectory(path: string) {
  try {
    return await readdir(path, {
      withFileTypes: true,
    })
  } catch {
    return []
  }
}

async function findAchievementArchives(
  directories: string[],
  gameIds: Set<string>,
) {
  const archives: UbisoftAchievementArchive[] = []

  for (const directory of directories) {
    for (const entry of await readDirectory(directory)) {
      if (!entry.isFile()) {
        continue
      }

      const match = entry.name.match(/^(\d+)_/)

      if (!match?.[1] || !gameIds.has(match[1])) {
        continue
      }

      const path = join(directory, entry.name)

      try {
        const archiveStat = await stat(path)

        if (
          archiveStat.size <= 0 ||
          archiveStat.size > achievementArchiveMaxBytes
        ) {
          continue
        }

        archives.push({
          gameId: match[1],
          path,
          modifiedAt: archiveStat.mtimeMs,
        })
      } catch {
        // A launcher cache can disappear while Ubisoft Connect refreshes it.
      }
    }
  }

  return archives
}

async function findAchievementSpoolFiles(
  directories: string[],
  gameIds: Set<string>,
) {
  const spoolFiles = new Map<string, string[]>()

  function appendSpoolFile(gameId: string, path: string) {
    const paths = spoolFiles.get(gameId) ?? []
    paths.push(path)
    spoolFiles.set(gameId, paths)
  }

  for (const directory of directories) {
    const entries = await readDirectory(directory)

    for (const entry of entries) {
      if (entry.isFile()) {
        const gameId = basename(entry.name, '.spool')

        if (entry.name.endsWith('.spool') && gameIds.has(gameId)) {
          appendSpoolFile(gameId, join(directory, entry.name))
        }

        continue
      }

      if (!entry.isDirectory()) {
        continue
      }

      const accountDirectory = join(directory, entry.name)

      for (const spoolEntry of await readDirectory(accountDirectory)) {
        const gameId = basename(spoolEntry.name, '.spool')

        if (
          spoolEntry.isFile() &&
          spoolEntry.name.endsWith('.spool') &&
          gameIds.has(gameId)
        ) {
          appendSpoolFile(gameId, join(accountDirectory, spoolEntry.name))
        }
      }
    }
  }

  return spoolFiles
}

async function readAchievementUnlocks(paths: string[]) {
  const unlocksById = new Map<string, UbisoftAchievementUnlock>()

  for (const path of paths) {
    try {
      for (const unlock of parseUbisoftAchievementSpool(await readFile(path))) {
        const existing = unlocksById.get(unlock.externalId)

        if (!existing || unlock.unlockDate < existing.unlockDate) {
          unlocksById.set(unlock.externalId, unlock)
        }
      }
    } catch {
      // A partial or outdated spool must not block the rest of the library.
    }
  }

  return unlocksById
}

export async function readUbisoftAchievementLibrary({
  achievementDirectories,
  gameIds,
  spoolDirectories,
}: {
  achievementDirectories: string[]
  gameIds: string[]
  spoolDirectories: string[]
}) {
  const uniqueGameIds = new Set(gameIds.filter((gameId) => /^\d+$/.test(gameId)))
  const achievementsByGameId = new Map<string, UbisoftAchievement[]>()

  if (uniqueGameIds.size === 0) {
    return achievementsByGameId
  }

  const [archives, spoolFiles] = await Promise.all([
    findAchievementArchives(achievementDirectories, uniqueGameIds),
    findAchievementSpoolFiles(spoolDirectories, uniqueGameIds),
  ])
  const archivesByGameId = new Map<string, UbisoftAchievementArchive[]>()

  for (const archive of archives) {
    const gameArchives = archivesByGameId.get(archive.gameId) ?? []
    gameArchives.push(archive)
    archivesByGameId.set(archive.gameId, gameArchives)
  }

  for (const gameId of uniqueGameIds) {
    const gameArchives = (archivesByGameId.get(gameId) ?? []).sort(
      (left, right) => right.modifiedAt - left.modifiedAt,
    )
    let definitions: ReturnType<typeof parseUbisoftAchievementLocalization> = []

    for (const archive of gameArchives) {
      try {
        definitions = readArchiveLocalization(await readFile(archive.path))
      } catch {
        definitions = []
      }

      if (definitions.length > 0) {
        break
      }
    }

    if (definitions.length === 0) {
      continue
    }

    const unlocks = await readAchievementUnlocks(spoolFiles.get(gameId) ?? [])

    achievementsByGameId.set(
      gameId,
      definitions.map((achievement) => {
        const unlock = unlocks.get(achievement.externalId)

        return {
          ...achievement,
          unlocked: Boolean(unlock),
          unlockDate: unlock?.unlockDate ?? null,
        }
      }),
    )
  }

  return achievementsByGameId
}
