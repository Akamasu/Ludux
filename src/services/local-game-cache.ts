import { mkdir, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { extname, isAbsolute, join, relative, resolve } from 'node:path'
import type { LocalGameCacheOverview } from '../types/settings'
import { logger } from '../utils/logger'

const gameCacheDirectory = resolve('userdata', 'cache', 'games')
const coverCacheDirectory = join(gameCacheDirectory, 'covers')
const metadataCacheDirectory = join(gameCacheDirectory, 'metadata')
const defaultMaxCoverBytes = 1_500_000
const defaultMaxCacheBytes = 120 * 1024 * 1024
const coverRefreshMs = 30 * 24 * 60 * 60 * 1000
const cleanupEveryWrites = 20
const supportedImageExtensions = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif'])

let cacheWritesSinceCleanup = 0

export const localGameCacheProtocol = 'ludux-cache'
const fallbackKeySeparator = '\u0000'

export interface CacheSyncedGameDataInput {
  provider: string
  externalId: string
  title: string
  coverUrl: string | null
  metadata: unknown
  fetchImpl?: typeof fetch
}

export interface CacheSyncedGameDataResult {
  coverUrl: string | null
  metadataPath: string
  cachedCover: boolean
}

export interface LocalGameCacheCoverFallback {
  provider: string
  externalId: string
  remoteCoverUrl: string
  cachedCoverUrl: string | null
}

interface CachedCover {
  path: string
  url: string
  fresh: boolean
}

interface CacheFileEntry {
  path: string
  size: number
  mtimeMs: number
}

function readPositiveIntegerEnv(name: string, fallback: number) {
  const value = Number(process.env[name])

  return Number.isFinite(value) && value > 0 ? Math.trunc(value) : fallback
}

function getMaxCoverBytes() {
  return readPositiveIntegerEnv('LUDUX_GAME_CACHE_MAX_COVER_BYTES', defaultMaxCoverBytes)
}

function getMaxCacheBytes() {
  return readPositiveIntegerEnv('LUDUX_GAME_CACHE_MAX_BYTES', defaultMaxCacheBytes)
}

function isPathInside(childPath: string, parentPath: string) {
  const child = resolve(childPath)
  const parent = resolve(parentPath)
  const pathDelta = relative(parent, child)

  return pathDelta === '' || (!pathDelta.startsWith('..') && !isAbsolute(pathDelta))
}

export function normalizeCacheSegment(value: string) {
  const normalized = value
    .trim()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('en-US')
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)

  return normalized || 'unknown'
}

export function shouldCacheRemoteAsset(
  value: string | null | undefined,
): value is string {
  if (!value) {
    return false
  }

  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

export function isLocalGameCacheCoverUrl(value: string | null | undefined): value is string {
  if (!value) {
    return false
  }

  try {
    const url = new URL(value)
    return url.protocol === `${localGameCacheProtocol}:` && url.hostname === 'cover'
  } catch {
    return false
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function readNonEmptyString(value: unknown) {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null
}

export function parseLocalGameCacheSnapshot(
  value: unknown,
): LocalGameCacheCoverFallback | null {
  if (!isRecord(value)) {
    return null
  }

  const provider = readNonEmptyString(value['provider'])
  const externalId = readNonEmptyString(value['externalId'])
  const remoteCoverUrl = readNonEmptyString(value['remoteCoverUrl'])
  const cachedCoverUrl = readNonEmptyString(value['cachedCoverUrl'])

  if (!provider || !externalId || !shouldCacheRemoteAsset(remoteCoverUrl)) {
    return null
  }

  return {
    provider,
    externalId,
    remoteCoverUrl,
    cachedCoverUrl: isLocalGameCacheCoverUrl(cachedCoverUrl) ? cachedCoverUrl : null,
  }
}

export function resolveImageExtension(contentType: string | null, imageUrl: string) {
  const normalizedContentType = contentType?.split(';')[0]?.trim().toLocaleLowerCase('en-US')

  if (normalizedContentType === 'image/jpeg' || normalizedContentType === 'image/jpg') {
    return '.jpg'
  }

  if (normalizedContentType === 'image/png') {
    return '.png'
  }

  if (normalizedContentType === 'image/webp') {
    return '.webp'
  }

  if (normalizedContentType === 'image/gif') {
    return '.gif'
  }

  try {
    const extension = extname(new URL(imageUrl).pathname).toLocaleLowerCase('en-US')

    if (supportedImageExtensions.has(extension)) {
      return extension === '.jpeg' ? '.jpg' : extension
    }
  } catch {
    return '.jpg'
  }

  return '.jpg'
}

function createCachedCoverUrl(providerSegment: string, fileName: string) {
  return `${localGameCacheProtocol}://cover/${encodeURIComponent(providerSegment)}/${encodeURIComponent(fileName)}`
}

export function resolveLocalGameCacheUrl(resourceUrl: string) {
  try {
    const url = new URL(resourceUrl)

    if (url.protocol !== `${localGameCacheProtocol}:` || url.hostname !== 'cover') {
      return null
    }

    const pathParts = url.pathname
      .split('/')
      .filter((part) => part.length > 0)
      .map((part) => normalizeCacheSegment(decodeURIComponent(part)))

    if (pathParts.length !== 2) {
      return null
    }

    const extension = extname(pathParts[1]).toLocaleLowerCase('en-US')

    if (!supportedImageExtensions.has(extension)) {
      return null
    }

    const filePath = resolve(coverCacheDirectory, pathParts[0], pathParts[1])

    return isPathInside(filePath, coverCacheDirectory) ? filePath : null
  } catch {
    return null
  }
}

async function listCachedCoverCandidates(providerSegment: string, externalIdSegment: string) {
  const providerDirectory = join(coverCacheDirectory, providerSegment)

  try {
    const entries = await readdir(providerDirectory, { withFileTypes: true })
    return entries
      .filter(
        (entry) =>
          entry.isFile() &&
          supportedImageExtensions.has(extname(entry.name).toLocaleLowerCase('en-US')) &&
          entry.name
            .toLocaleLowerCase('en-US')
            .startsWith(`${externalIdSegment.toLocaleLowerCase('en-US')}.`),
      )
      .map((entry) => join(providerDirectory, entry.name))
  } catch {
    return []
  }
}

async function findCachedCover(
  providerSegment: string,
  externalIdSegment: string,
): Promise<CachedCover | null> {
  const candidates = await listCachedCoverCandidates(providerSegment, externalIdSegment)

  for (const candidate of candidates) {
    try {
      const fileStats = await stat(candidate)
      const fileName = candidate.slice(join(coverCacheDirectory, providerSegment).length + 1)

      if (fileStats.isFile() && fileStats.size > 0) {
        return {
          path: candidate,
          url: createCachedCoverUrl(providerSegment, fileName),
          fresh: Date.now() - fileStats.mtimeMs < coverRefreshMs,
        }
      }
    } catch {
      continue
    }
  }

  return null
}

async function fetchWithTimeout(
  url: string,
  fetchImpl: typeof fetch,
  timeoutMs: number,
) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)

  try {
    return await fetchImpl(url, {
      signal: controller.signal,
    })
  } finally {
    clearTimeout(timeout)
  }
}

function readContentLength(headers: Headers) {
  const rawLength = headers.get('content-length')

  if (!rawLength) {
    return null
  }

  const length = Number(rawLength)

  return Number.isFinite(length) && length >= 0 ? length : null
}

async function readResponseBodyWithinLimit(response: Response, maxBytes: number) {
  const contentLength = readContentLength(response.headers)

  if (contentLength !== null && contentLength > maxBytes) {
    return null
  }

  const reader = response.body?.getReader()

  if (!reader) {
    const buffer = Buffer.from(await response.arrayBuffer())
    return buffer.byteLength <= maxBytes ? buffer : null
  }

  const chunks: Uint8Array[] = []
  let totalBytes = 0

  while (true) {
    const result = await reader.read()

    if (result.done) {
      break
    }

    totalBytes += result.value.byteLength

    if (totalBytes > maxBytes) {
      await reader.cancel()
      return null
    }

    chunks.push(result.value)
  }

  return Buffer.concat(chunks, totalBytes)
}

async function cacheRemoteCover({
  coverUrl,
  externalIdSegment,
  fetchImpl,
  providerSegment,
}: {
  coverUrl: string | null
  externalIdSegment: string
  fetchImpl: typeof fetch
  providerSegment: string
}) {
  const existingCover = await findCachedCover(providerSegment, externalIdSegment)

  if (!shouldCacheRemoteAsset(coverUrl)) {
    return {
      coverUrl: existingCover?.url ?? coverUrl,
      cachedCover: Boolean(existingCover),
    }
  }

  if (existingCover?.fresh) {
    return {
      coverUrl: existingCover.url,
      cachedCover: true,
    }
  }

  try {
    const response = await fetchWithTimeout(coverUrl, fetchImpl, 8_000)

    if (!response.ok) {
      return {
        coverUrl: existingCover?.url ?? coverUrl,
        cachedCover: Boolean(existingCover),
      }
    }

    const contentType = response.headers.get('content-type')

    if (contentType && !contentType.toLocaleLowerCase('en-US').startsWith('image/')) {
      return {
        coverUrl: existingCover?.url ?? coverUrl,
        cachedCover: Boolean(existingCover),
      }
    }

    const body = await readResponseBodyWithinLimit(response, getMaxCoverBytes())

    if (!body) {
      return {
        coverUrl: existingCover?.url ?? coverUrl,
        cachedCover: Boolean(existingCover),
      }
    }

    const extension = resolveImageExtension(contentType, coverUrl)
    const providerDirectory = join(coverCacheDirectory, providerSegment)
    const fileName = `${externalIdSegment}${extension}`
    const filePath = join(providerDirectory, fileName)

    await mkdir(providerDirectory, { recursive: true })
    await writeFile(filePath, body)
    await cleanupLocalGameCacheAfterWrite()

    return {
      coverUrl: createCachedCoverUrl(providerSegment, fileName),
      cachedCover: true,
    }
  } catch (error) {
    logger.error('[LocalGameCache]', error)

    return {
      coverUrl: existingCover?.url ?? coverUrl,
      cachedCover: Boolean(existingCover),
    }
  }
}

async function writeMetadataSnapshot({
  cachedCoverUrl,
  externalIdSegment,
  input,
  providerSegment,
}: {
  cachedCoverUrl: string | null
  externalIdSegment: string
  input: CacheSyncedGameDataInput
  providerSegment: string
}) {
  const providerDirectory = join(metadataCacheDirectory, providerSegment)
  const metadataPath = join(providerDirectory, `${externalIdSegment}.json`)
  const snapshot = {
    provider: input.provider,
    externalId: input.externalId,
    title: input.title,
    syncedAt: new Date().toISOString(),
    remoteCoverUrl: input.coverUrl,
    cachedCoverUrl,
    metadata: input.metadata,
  }

  await mkdir(providerDirectory, { recursive: true })
  await writeFile(metadataPath, JSON.stringify(snapshot), 'utf8')
  await cleanupLocalGameCacheAfterWrite()

  return metadataPath
}

async function collectCacheFiles(directory: string): Promise<CacheFileEntry[]> {
  let entries: CacheFileEntry[] = []

  try {
    const children = await readdir(directory, { withFileTypes: true })

    for (const child of children) {
      const childPath = join(directory, child.name)

      if (child.isDirectory()) {
        entries = entries.concat(await collectCacheFiles(childPath))
        continue
      }

      if (!child.isFile()) {
        continue
      }

      const fileStats = await stat(childPath)
      entries.push({
        path: childPath,
        size: fileStats.size,
        mtimeMs: fileStats.mtimeMs,
      })
    }
  } catch {
    return entries
  }

  return entries
}

async function cleanupLocalGameCacheAfterWrite() {
  cacheWritesSinceCleanup += 1

  if (cacheWritesSinceCleanup < cleanupEveryWrites) {
    return
  }

  cacheWritesSinceCleanup = 0
  await trimLocalGameCache()
}

export async function trimLocalGameCache() {
  const maxCacheBytes = getMaxCacheBytes()
  const files = (await collectCacheFiles(gameCacheDirectory)).sort(
    (left, right) => left.mtimeMs - right.mtimeMs,
  )
  let totalBytes = files.reduce((total, file) => total + file.size, 0)

  for (const file of files) {
    if (totalBytes <= maxCacheBytes) {
      break
    }

    if (!isPathInside(file.path, gameCacheDirectory)) {
      continue
    }

    try {
      await rm(file.path, { force: true })
      totalBytes -= file.size
    } catch (error) {
      logger.error('[LocalGameCache]', error)
    }
  }
}

export async function readLocalGameCacheOverview(): Promise<LocalGameCacheOverview> {
  const files = await collectCacheFiles(gameCacheDirectory)
  const coverFiles = files.filter((file) =>
    isPathInside(file.path, coverCacheDirectory),
  ).length
  const metadataFiles = files.filter((file) =>
    isPathInside(file.path, metadataCacheDirectory),
  ).length

  return {
    directory: gameCacheDirectory,
    sizeBytes: files.reduce((total, file) => total + file.size, 0),
    maxSizeBytes: getMaxCacheBytes(),
    coverFiles,
    metadataFiles,
  }
}

export async function readLocalGameCacheCoverFallbacks() {
  const files = await collectCacheFiles(metadataCacheDirectory)
  const fallbackByLink = new Map<string, LocalGameCacheCoverFallback>()

  for (const file of files) {
    if (extname(file.path).toLocaleLowerCase('en-US') !== '.json') {
      continue
    }

    try {
      const snapshot = parseLocalGameCacheSnapshot(
        JSON.parse(await readFile(file.path, 'utf8')),
      )

      if (snapshot) {
        fallbackByLink.set(
          `${snapshot.provider}${fallbackKeySeparator}${snapshot.externalId}`,
          snapshot,
        )
      }
    } catch {
      continue
    }
  }

  return Array.from(fallbackByLink.values())
}

export async function clearLocalGameCache(): Promise<LocalGameCacheOverview> {
  const overview = await readLocalGameCacheOverview()
  const cacheParentDirectory = resolve('userdata', 'cache')

  if (!isPathInside(gameCacheDirectory, cacheParentDirectory)) {
    throw new Error('Chemin de cache invalide.')
  }

  await rm(gameCacheDirectory, {
    force: true,
    recursive: true,
  })

  return overview
}

export async function cacheSyncedGameData(
  input: CacheSyncedGameDataInput,
): Promise<CacheSyncedGameDataResult> {
  try {
    const providerSegment = normalizeCacheSegment(input.provider)
    const externalIdSegment = normalizeCacheSegment(input.externalId)
    const cover = await cacheRemoteCover({
      coverUrl: input.coverUrl,
      externalIdSegment,
      fetchImpl: input.fetchImpl ?? fetch,
      providerSegment,
    })
    const metadataPath = await writeMetadataSnapshot({
      cachedCoverUrl: cover.coverUrl,
      externalIdSegment,
      input,
      providerSegment,
    })

    return {
      coverUrl: cover.coverUrl,
      metadataPath,
      cachedCover: cover.cachedCover,
    }
  } catch (error) {
    logger.error('[LocalGameCache]', error)

    return {
      coverUrl: input.coverUrl,
      metadataPath: '',
      cachedCover: false,
    }
  }
}
