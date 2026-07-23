import { describe, expect, it } from 'vitest'
import {
  localGameCacheProtocol,
  normalizeCacheSegment,
  resolveImageExtension,
  resolveLocalGameCacheUrl,
  shouldCacheRemoteAsset,
} from '../src/services/local-game-cache'

describe('local game cache', () => {
  it('normalizes provider and game identifiers into safe path segments', () => {
    expect(normalizeCacheSegment(' Steam / 1245620: Shadow ')).toBe(
      'steam-1245620-shadow',
    )
    expect(normalizeCacheSegment('   ')).toBe('unknown')
  })

  it('only accepts remote HTTP assets for cover caching', () => {
    expect(shouldCacheRemoteAsset('https://cdn.example.test/cover.jpg')).toBe(true)
    expect(shouldCacheRemoteAsset('http://cdn.example.test/cover.jpg')).toBe(true)
    expect(shouldCacheRemoteAsset('file:///C:/cover.jpg')).toBe(false)
    expect(shouldCacheRemoteAsset(`${localGameCacheProtocol}://cover/steam/620.jpg`)).toBe(
      false,
    )
  })

  it('resolves image extensions from content type before URL suffixes', () => {
    expect(resolveImageExtension('image/webp', 'https://cdn.example.test/cover.jpg')).toBe(
      '.webp',
    )
    expect(resolveImageExtension(null, 'https://cdn.example.test/cover.jpeg')).toBe(
      '.jpg',
    )
    expect(resolveImageExtension(null, 'https://cdn.example.test/cover')).toBe('.jpg')
  })

  it('rejects unsafe custom cache URLs', () => {
    expect(resolveLocalGameCacheUrl('https://cdn.example.test/cover.jpg')).toBeNull()
    expect(resolveLocalGameCacheUrl(`${localGameCacheProtocol}://cover/steam/../x.jpg`)).toBeNull()
    expect(resolveLocalGameCacheUrl(`${localGameCacheProtocol}://metadata/steam/620.json`)).toBeNull()
  })
})
