import { randomBytes } from 'node:crypto'

export type SteamAuthSessionStatus = 'PENDING' | 'APPROVED' | 'EXCHANGED'

export interface SteamAuthSession {
  codeChallenge: string
  createdAt: number
  deviceName: string
  exchangeCode: string | null
  expiresAt: number
  id: string
  personaName: string | null
  status: SteamAuthSessionStatus
  steamId: string | null
}

function randomToken(bytes = 32) {
  return randomBytes(bytes).toString('base64url')
}

export class SteamAuthSessionStore {
  private readonly sessions = new Map<string, SteamAuthSession>()
  private readonly usedNonces = new Map<string, number>()

  constructor(private readonly ttlMs = 10 * 60_000) {}

  create({
    codeChallenge,
    deviceName,
    now = Date.now(),
  }: {
    codeChallenge: string
    deviceName: string
    now?: number
  }) {
    this.cleanup(now)

    const session: SteamAuthSession = {
      codeChallenge,
      createdAt: now,
      deviceName,
      exchangeCode: null,
      expiresAt: now + this.ttlMs,
      id: randomToken(),
      personaName: null,
      status: 'PENDING',
      steamId: null,
    }

    this.sessions.set(session.id, session)
    return session
  }

  get(id: string, now = Date.now()) {
    const session = this.sessions.get(id)

    if (!session || session.expiresAt <= now) {
      this.sessions.delete(id)
      return null
    }

    return session
  }

  approve({
    id,
    personaName,
    steamId,
  }: {
    id: string
    personaName: string | null
    steamId: string
  }) {
    const session = this.get(id)

    if (!session || session.status !== 'PENDING') {
      return null
    }

    session.exchangeCode = randomToken()
    session.personaName = personaName
    session.status = 'APPROVED'
    session.steamId = steamId
    return session
  }

  exchange(id: string, exchangeCode: string) {
    const session = this.get(id)

    if (
      !session ||
      session.status !== 'APPROVED' ||
      !session.exchangeCode ||
      session.exchangeCode !== exchangeCode
    ) {
      return null
    }

    session.exchangeCode = null
    session.status = 'EXCHANGED'
    return session
  }

  isNonceUsed(nonce: string, now = Date.now()) {
    this.cleanup(now)
    return this.usedNonces.has(nonce)
  }

  markNonceUsed(nonce: string, now = Date.now()) {
    this.usedNonces.set(nonce, now + this.ttlMs)
  }

  cleanup(now = Date.now()) {
    for (const [id, session] of this.sessions) {
      if (session.expiresAt <= now) {
        this.sessions.delete(id)
      }
    }

    for (const [nonce, expiresAt] of this.usedNonces) {
      if (expiresAt <= now) {
        this.usedNonces.delete(nonce)
      }
    }
  }
}
