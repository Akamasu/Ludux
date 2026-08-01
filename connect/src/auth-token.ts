import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto'

const steamIdPattern = /^\d{17}$/

export interface LuduxConnectTokenPayload {
  exp: number
  iat: number
  iss: 'ludux-connect'
  jti: string
  sub: string
}

function encodeJson(value: unknown) {
  return Buffer.from(JSON.stringify(value)).toString('base64url')
}

function sign(unsignedToken: string, secret: string) {
  return createHmac('sha256', secret).update(unsignedToken).digest('base64url')
}

function readPayload(value: string): LuduxConnectTokenPayload | null {
  try {
    const payload = JSON.parse(Buffer.from(value, 'base64url').toString('utf8')) as unknown

    if (typeof payload !== 'object' || payload === null) {
      return null
    }

    const candidate = payload as Record<string, unknown>

    if (
      candidate['iss'] !== 'ludux-connect' ||
      typeof candidate['sub'] !== 'string' ||
      !steamIdPattern.test(candidate['sub']) ||
      typeof candidate['iat'] !== 'number' ||
      typeof candidate['exp'] !== 'number' ||
      typeof candidate['jti'] !== 'string'
    ) {
      return null
    }

    return candidate as unknown as LuduxConnectTokenPayload
  } catch {
    return null
  }
}

export function createAccessToken({
  now = new Date(),
  secret,
  steamId,
  ttlSeconds = 30 * 24 * 60 * 60,
}: {
  now?: Date
  secret: string
  steamId: string
  ttlSeconds?: number
}) {
  if (secret.length < 32) {
    throw new Error('Le secret de jeton Ludux Connect doit contenir au moins 32 caractères.')
  }

  if (!steamIdPattern.test(steamId)) {
    throw new Error('SteamID64 invalide.')
  }

  const issuedAt = Math.floor(now.getTime() / 1000)
  const header = encodeJson({ alg: 'HS256', typ: 'JWT' })
  const payload = encodeJson({
    exp: issuedAt + ttlSeconds,
    iat: issuedAt,
    iss: 'ludux-connect',
    jti: randomUUID(),
    sub: steamId,
  } satisfies LuduxConnectTokenPayload)
  const unsignedToken = `${header}.${payload}`

  return `${unsignedToken}.${sign(unsignedToken, secret)}`
}

export function verifyAccessToken({
  now = new Date(),
  secret,
  token,
}: {
  now?: Date
  secret: string
  token: string
}): LuduxConnectTokenPayload | null {
  const parts = token.split('.')

  if (parts.length !== 3) {
    return null
  }

  const [header, payloadValue, signature] = parts

  if (!header || !payloadValue || !signature) {
    return null
  }

  const unsignedToken = `${header}.${payloadValue}`
  const expectedSignature = Buffer.from(sign(unsignedToken, secret))
  const receivedSignature = Buffer.from(signature)

  if (
    expectedSignature.length !== receivedSignature.length ||
    !timingSafeEqual(expectedSignature, receivedSignature)
  ) {
    return null
  }

  const payload = readPayload(payloadValue)
  const nowSeconds = Math.floor(now.getTime() / 1000)

  if (!payload || payload.iat > nowSeconds + 60 || payload.exp <= nowSeconds) {
    return null
  }

  return payload
}
