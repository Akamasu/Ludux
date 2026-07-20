import { describe, expect, it, vi } from 'vitest'
import {
  createRawgGameDetailsUrl,
  createRawgSearchUrl,
  fetchRawgGameMetadata,
  parseRawgGameMetadata,
  parseRawgSearchResults,
} from '../../src/providers/rawg'

describe('rawg provider', () => {
  it('builds search and details URLs with normalized credentials', () => {
    const searchUrl = createRawgSearchUrl(' key ', ' Portal 2 ')
    const detailsUrl = createRawgGameDetailsUrl(' key ', 4200)

    expect(searchUrl).toContain('/api/games?')
    expect(searchUrl).toContain('key=key')
    expect(searchUrl).toContain('search=Portal+2')
    expect(searchUrl).toContain('page_size=1')
    expect(searchUrl).toContain('search_precise=true')
    expect(detailsUrl).toBe('https://api.rawg.io/api/games/4200?key=key')
  })

  it('normalizes search results', () => {
    expect(
      parseRawgSearchResults({
        results: [
          {
            id: 4200,
            name: ' Portal 2 ',
          },
        ],
      }),
    ).toEqual({
      id: 4200,
      title: 'Portal 2',
    })

    expect(parseRawgSearchResults({ results: [] })).toBeNull()
  })

  it('normalizes game metadata payloads', () => {
    expect(
      parseRawgGameMetadata({
        id: 4200,
        name: ' Portal 2 ',
        description_raw: 'Aperture Science returns.',
        background_image: 'https://media.rawg.io/media/games/portal-2.jpg',
        released: '2011-04-18',
        developers: [{ name: 'Valve Software' }],
        publishers: [{ name: 'Valve' }],
        website: 'https://www.thinkwithportals.com/',
      }),
    ).toEqual({
      rawgId: 4200,
      title: 'Portal 2',
      description: 'Aperture Science returns.',
      coverUrl: 'https://media.rawg.io/media/games/portal-2.jpg',
      releaseDate: '2011-04-18',
      developer: 'Valve Software',
      publisher: 'Valve',
      website: 'https://www.thinkwithportals.com/',
    })
  })

  it('fetches metadata from search then details', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            results: [
              {
                id: 4200,
                name: 'Portal 2',
              },
            ],
          }),
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: 4200,
            name: 'Portal 2',
            description_raw: 'Aperture Science returns.',
            background_image: 'https://media.rawg.io/media/games/portal-2.jpg',
            released: '2011-04-18',
            developers: [{ name: 'Valve Software' }],
            publishers: [{ name: 'Valve' }],
            website: 'https://www.thinkwithportals.com/',
          }),
        ),
      )

    await expect(
      fetchRawgGameMetadata({
        apiKey: 'key',
        title: 'Portal 2',
        fetchImpl: fetchImpl as unknown as typeof fetch,
      }),
    ).resolves.toMatchObject({
      rawgId: 4200,
      title: 'Portal 2',
      developer: 'Valve Software',
    })
    expect(fetchImpl).toHaveBeenCalledTimes(2)
  })

  it('maps RAWG HTTP errors to readable messages', async () => {
    const fetchImpl = vi.fn(async () => new Response(null, { status: 403 }))

    await expect(
      fetchRawgGameMetadata({
        apiKey: 'key',
        title: 'Portal 2',
        fetchImpl: fetchImpl as unknown as typeof fetch,
      }),
    ).rejects.toThrow('Vérifiez la clé API RAWG')
  })
})
