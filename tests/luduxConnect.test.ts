import { createHash } from 'node:crypto'
import { once } from 'node:events'
import type { AddressInfo } from 'node:net'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createAccessToken, verifyAccessToken } from '../connect/src/auth-token'
import {
  createSteamOpenIdUrl,
  steamOpenIdEndpoint,
  verifySteamOpenIdAssertion,
} from '../connect/src/openid'
import { createLuduxConnectServer } from '../connect/src/server'
import { SteamAuthSessionStore } from '../connect/src/session-store'
import {
  connectSteamThroughLuduxConnect,
  fetchSteamAchievementsThroughLuduxConnect,
  fetchSteamOwnedGamesThroughLuduxConnect,
  parseLuduxConnectCredential,
  serializeLuduxConnectCredential,
} from '../src/services/ludux-connect'

const steamId = '76561198000000000'
const tokenSecret = 'test-secret-that-is-long-enough-for-hmac-signing-123456'

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('Ludux Connect tokens', () => {
  it('signs, validates and expires access tokens', () => {
    const token = createAccessToken({
      now: new Date('2026-08-01T12:00:00.000Z'),
      secret: tokenSecret,
      steamId,
      ttlSeconds: 60,
    })

    expect(
      verifyAccessToken({
        now: new Date('2026-08-01T12:00:30.000Z'),
        secret: tokenSecret,
        token,
      })?.sub,
    ).toBe(steamId)
    expect(
      verifyAccessToken({
        now: new Date('2026-08-01T12:01:00.000Z'),
        secret: tokenSecret,
        token,
      }),
    ).toBeNull()
    expect(
      verifyAccessToken({
        secret: tokenSecret,
        token: `${token.slice(0, -1)}x`,
      }),
    ).toBeNull()
  })

  it('serializes desktop credentials without exposing them in settings types', () => {
    const serialized = serializeLuduxConnectCredential({
      accessToken: 'access-token-with-enough-entropy-for-this-contract',
      baseUrl: 'https://connect.example.com',
    })

    expect(serialized).not.toContain('access-token-with-enough-entropy')
    expect(parseLuduxConnectCredential(serialized)).toEqual({
      accessToken: 'access-token-with-enough-entropy-for-this-contract',
      baseUrl: 'https://connect.example.com/',
    })
  })
})

describe('Ludux Connect Steam OpenID', () => {
  it('builds a Steam OpenID request with an exact return URL', () => {
    const url = new URL(
      createSteamOpenIdUrl({
        publicUrl: 'https://connect.example.com/',
        sessionId: 'session-id',
      }),
    )

    expect(url.origin + url.pathname).toBe(steamOpenIdEndpoint)
    expect(url.searchParams.get('openid.mode')).toBe('checkid_setup')
    expect(url.searchParams.get('openid.return_to')).toBe(
      'https://connect.example.com/v1/auth/steam/callback?session=session-id',
    )
  })

  it('verifies the assertion directly with Steam and rejects nonce replay', async () => {
    const expectedReturnTo =
      'https://connect.example.com/v1/auth/steam/callback?session=session-id'
    const nonce = '2026-08-01T12:00:00Zunique'
    const parameters = new URLSearchParams({
      'openid.assoc_handle': 'handle',
      'openid.claimed_id': `https://steamcommunity.com/openid/id/${steamId}`,
      'openid.identity': `https://steamcommunity.com/openid/id/${steamId}`,
      'openid.mode': 'id_res',
      'openid.ns': 'http://specs.openid.net/auth/2.0',
      'openid.op_endpoint': steamOpenIdEndpoint,
      'openid.response_nonce': nonce,
      'openid.return_to': expectedReturnTo,
      'openid.sig': 'signature',
      'openid.signed':
        'signed,op_endpoint,claimed_id,identity,return_to,response_nonce,assoc_handle',
    })
    const usedNonces = new Set<string>()
    const fetchImpl = vi.fn(async (_input: URL | RequestInfo, init?: RequestInit) => {
      expect(String(init?.body)).toContain('openid.mode=check_authentication')
      return new Response('ns:http://specs.openid.net/auth/2.0\nis_valid:true\n')
    }) as typeof fetch
    const verify = () =>
      verifySteamOpenIdAssertion({
        expectedReturnTo,
        fetchImpl,
        isNonceUsed: (value) => usedNonces.has(value),
        markNonceUsed: (value) => usedNonces.add(value),
        now: new Date('2026-08-01T12:04:00.000Z'),
        parameters,
      })

    await expect(verify()).resolves.toBe(steamId)
    await expect(verify()).rejects.toThrow('déjà été utilisée')
  })
})

describe('Ludux Connect auth sessions', () => {
  it('allows a single exchange and removes expired sessions', () => {
    const store = new SteamAuthSessionStore(1_000)
    const now = Date.now()
    const session = store.create({
      codeChallenge: 'challenge',
      deviceName: 'Ludux',
      now,
    })

    store.approve({ id: session.id, personaName: 'Joueur', steamId })
    const exchangeCode = session.exchangeCode ?? ''

    expect(store.exchange(session.id, exchangeCode)?.steamId).toBe(steamId)
    expect(store.exchange(session.id, exchangeCode)).toBeNull()
    expect(store.get(session.id, now + 1_001)).toBeNull()
  })
})

describe('Ludux Connect HTTP service', () => {
  it('uses the authenticated SteamID for library requests', async () => {
    const upstreamFetch = vi.fn(async (input: URL | RequestInfo) => {
      const url = new URL(String(input))
      expect(url.searchParams.get('steamid')).toBe(steamId)
      expect(url.searchParams.get('key')).toBe('server-only-key')
      return Response.json({
        response: {
          game_count: 1,
          games: [{ appid: 620, name: 'Portal 2', playtime_forever: 42 }],
        },
      })
    }) as typeof fetch
    const server = createLuduxConnectServer({
      fetchImpl: upstreamFetch,
      publicUrl: 'http://127.0.0.1:8787',
      steamApiKey: 'server-only-key',
      tokenSecret,
    })

    server.listen(0, '127.0.0.1')
    await once(server, 'listening')
    const port = (server.address() as AddressInfo).port
    const token = createAccessToken({ secret: tokenSecret, steamId })

    try {
      const response = await fetch(`http://127.0.0.1:${port}/v1/steam/library`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      expect(response.status).toBe(200)
      expect(await response.json()).toMatchObject({ response: { game_count: 1 } })
      expect(upstreamFetch).toHaveBeenCalledTimes(1)
    } finally {
      server.close()
      await once(server, 'close')
    }
  })
})

describe('Ludux Connect desktop client', () => {
  it('completes the PKCE browser flow and stores only the returned token', async () => {
    vi.stubEnv('LUDUX_CONNECT_URL', 'https://connect.example.com')
    let challenge = ''
    const openedUrls: string[] = []
    const fetchImpl = vi.fn(async (input: URL | RequestInfo, init?: RequestInit) => {
      const url = new URL(String(input))

      if (url.pathname === '/v1/auth/steam/sessions' && init?.method === 'POST') {
        const body = JSON.parse(String(init.body)) as { codeChallenge: string }
        challenge = body.codeChallenge
        return Response.json(
          {
            expiresAt: new Date(Date.now() + 60_000).toISOString(),
            pollIntervalMs: 1_000,
            sessionId: 'session',
            verificationUrl: 'https://connect.example.com/v1/auth/steam?session=session',
          },
          { status: 201 },
        )
      }

      if (url.pathname.endsWith('/sessions/session') && init?.method !== 'POST') {
        return Response.json({ exchangeCode: 'exchange', status: 'approved' })
      }

      const body = JSON.parse(String(init?.body)) as { codeVerifier: string }
      expect(createHash('sha256').update(body.codeVerifier).digest('base64url')).toBe(
        challenge,
      )
      return Response.json({
        accessToken: 'signed-access-token-with-more-than-thirty-two-characters',
        expiresAt: '2026-09-01T12:00:00.000Z',
        personaName: 'Joueur Steam',
        steamId,
      })
    }) as typeof fetch

    const result = await connectSteamThroughLuduxConnect({
      fetchImpl,
      openExternal: async (url) => openedUrls.push(url),
      sleepImpl: async () => undefined,
    })

    expect(openedUrls).toEqual([
      'https://connect.example.com/v1/auth/steam?session=session',
    ])
    expect(result.steamId).toBe(steamId)
    expect(result.personaName).toBe('Joueur Steam')
  })

  it('normalizes library and achievement payloads returned by the service', async () => {
    const credential = {
      accessToken: 'signed-access-token-with-more-than-thirty-two-characters',
      baseUrl: 'https://connect.example.com/',
    }
    const fetchImpl = vi.fn(async (input: URL | RequestInfo) => {
      const url = new URL(String(input))

      if (url.pathname === '/v1/steam/library') {
        return Response.json({
          response: {
            game_count: 1,
            games: [{ appid: 620, name: 'Portal 2', playtime_forever: 42 }],
          },
        })
      }

      return Response.json({
        player: {
          playerstats: {
            achievements: [{ achieved: 1, apiname: 'WIN', unlocktime: 1_700_000_000 }],
            success: true,
          },
        },
        schema: {
          game: {
            availableGameStats: {
              achievements: [{ displayName: 'Victoire', name: 'WIN' }],
            },
          },
        },
      })
    }) as typeof fetch

    await expect(
      fetchSteamOwnedGamesThroughLuduxConnect({ credential, fetchImpl }),
    ).resolves.toMatchObject({ totalCount: 1, games: [{ appid: 620 }] })
    await expect(
      fetchSteamAchievementsThroughLuduxConnect({
        appid: 620,
        credential,
        fetchImpl,
      }),
    ).resolves.toEqual([
      expect.objectContaining({ externalId: 'WIN', name: 'Victoire', unlocked: true }),
    ])
  })
})
