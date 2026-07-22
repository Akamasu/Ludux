import { describe, expect, it, vi } from 'vitest'
import {
  createIgdbGameSearchBody,
  createTwitchClientCredentialsBody,
  fetchIgdbAccessToken,
  fetchIgdbGameMetadata,
  parseIgdbAccessToken,
  parseIgdbGameMetadata,
} from '../../src/providers/igdb'

describe('igdb provider', () => {
  it('builds Twitch OAuth and IGDB search requests', () => {
    expect(createTwitchClientCredentialsBody(' client ', ' secret ')).toBe(
      'client_id=client&client_secret=secret&grant_type=client_credentials',
    )

    const body = createIgdbGameSearchBody(' Portal "2" ')

    expect(body).toContain('search "Portal \\"2\\""')
    expect(body).toContain('fields name,summary')
    expect(body).toContain('where version_parent = null')
    expect(body).toContain('limit 10')
  })

  it('normalizes Twitch OAuth token payloads', () => {
    expect(
      parseIgdbAccessToken({
        access_token: 'token',
        expires_in: 5_000,
        token_type: 'bearer',
      }),
    ).toEqual({
      accessToken: 'token',
      expiresIn: 5_000,
      tokenType: 'bearer',
    })
  })

  it('normalizes IGDB game metadata payloads', () => {
    expect(
      parseIgdbGameMetadata([
        {
          id: 4200,
          name: ' Portal 2 ',
          summary: 'Aperture Science returns.',
          first_release_date: 1303084800,
          cover: {
            image_id: 'abc123',
          },
          genres: [{ name: 'Puzzle' }, { name: 'Platformer' }, { name: 'Puzzle' }],
          involved_companies: [
            {
              developer: true,
              company: {
                name: 'Valve Software',
              },
            },
            {
              publisher: true,
              company: {
                name: 'Valve',
              },
            },
          ],
          websites: [
            {
              category: 1,
              url: 'https://www.thinkwithportals.com/',
            },
          ],
        },
      ]),
    ).toEqual({
      igdbId: 4200,
      title: 'Portal 2',
      description: 'Aperture Science returns.',
      coverUrl: 'https://images.igdb.com/igdb/image/upload/t_cover_big_2x/abc123.jpg',
      releaseDate: '2011-04-18',
      developer: 'Valve Software',
      genres: ['Puzzle', 'Platformer'],
      publisher: 'Valve',
      website: 'https://www.thinkwithportals.com/',
    })

    expect(parseIgdbGameMetadata([])).toBeNull()
  })

  it('selects the best IGDB candidate by requested title', () => {
    expect(
      parseIgdbGameMetadata(
        [
          {
            id: 1,
            name: 'Portal Maze 2',
          },
          {
            id: 2,
            name: 'Portal 2',
          },
        ],
        'Portal 2',
      ),
    ).toMatchObject({
      igdbId: 2,
      title: 'Portal 2',
    })
  })

  it('rejects weak IGDB candidates when no close title is available', () => {
    expect(
      parseIgdbGameMetadata(
        [
          {
            id: 1,
            name: 'Portal Maze 2',
          },
        ],
        'Portal 2',
      ),
    ).toBeNull()
  })

  it('fetches metadata with Twitch token then IGDB request', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            access_token: 'token',
            expires_in: 5_000,
            token_type: 'bearer',
          }),
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify([
            {
              id: 4200,
              name: 'Portal 2',
              summary: 'Aperture Science returns.',
              genres: [{ name: 'Puzzle' }],
            },
          ]),
        ),
      )

    const token = await fetchIgdbAccessToken({
      clientId: 'client',
      clientSecret: 'secret',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    })
    const metadata = await fetchIgdbGameMetadata({
      accessToken: token.accessToken,
      clientId: 'client',
      fetchImpl: fetchImpl as unknown as typeof fetch,
      title: 'Portal 2',
    })

    expect(metadata).toMatchObject({
      igdbId: 4200,
      title: 'Portal 2',
      genres: ['Puzzle'],
    })
    expect(fetchImpl).toHaveBeenCalledTimes(2)
    expect(fetchImpl.mock.calls[1][1]?.headers).toMatchObject({
      Authorization: 'Bearer token',
      'Client-ID': 'client',
    })
  })

  it('maps IGDB HTTP errors to readable messages', async () => {
    const fetchImpl = vi.fn(async () => new Response(null, { status: 403 }))

    await expect(
      fetchIgdbGameMetadata({
        accessToken: 'token',
        clientId: 'client',
        fetchImpl: fetchImpl as unknown as typeof fetch,
        title: 'Portal 2',
      }),
    ).rejects.toThrow('Vérifiez le Client ID')
  })
})
