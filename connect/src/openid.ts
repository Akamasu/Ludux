const steamOpenIdEndpoint = 'https://steamcommunity.com/openid/login'
const steamClaimedIdPattern = /^https:\/\/steamcommunity\.com\/openid\/id\/(\d{17})$/
const requiredSignedFields = [
  'assoc_handle',
  'claimed_id',
  'identity',
  'op_endpoint',
  'response_nonce',
  'return_to',
]

export function createSteamOpenIdUrl({
  publicUrl,
  sessionId,
}: {
  publicUrl: string
  sessionId: string
}) {
  const returnTo = new URL('/v1/auth/steam/callback', publicUrl)
  returnTo.searchParams.set('session', sessionId)
  const url = new URL(steamOpenIdEndpoint)

  url.searchParams.set('openid.ns', 'http://specs.openid.net/auth/2.0')
  url.searchParams.set('openid.mode', 'checkid_setup')
  url.searchParams.set('openid.return_to', returnTo.toString())
  url.searchParams.set('openid.realm', new URL('/', publicUrl).toString())
  url.searchParams.set(
    'openid.identity',
    'http://specs.openid.net/auth/2.0/identifier_select',
  )
  url.searchParams.set(
    'openid.claimed_id',
    'http://specs.openid.net/auth/2.0/identifier_select',
  )

  return url.toString()
}

function parseDirectResponse(value: string) {
  return new Map(
    value
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const separatorIndex = line.indexOf(':')
        return separatorIndex > 0
          ? [line.slice(0, separatorIndex), line.slice(separatorIndex + 1)]
          : [line, '']
      }),
  )
}

function readSteamId(parameters: URLSearchParams) {
  const claimedId = parameters.get('openid.claimed_id')
  const identity = parameters.get('openid.identity')
  const match = claimedId?.match(steamClaimedIdPattern)

  if (!match || identity !== claimedId) {
    throw new Error('Identité Steam invalide.')
  }

  return match[1]
}

function validateNonce(nonce: string | null, now: Date) {
  if (!nonce || nonce.length < 20 || nonce.length > 255) {
    throw new Error('Réponse Steam expirée ou invalide.')
  }

  const timestamp = Date.parse(nonce.slice(0, 20))
  const age = now.getTime() - timestamp

  if (!Number.isFinite(timestamp) || age < -60_000 || age > 10 * 60_000) {
    throw new Error('Réponse Steam expirée ou invalide.')
  }

  return nonce
}

export async function verifySteamOpenIdAssertion({
  expectedReturnTo,
  fetchImpl = fetch,
  isNonceUsed,
  markNonceUsed,
  now = new Date(),
  parameters,
}: {
  expectedReturnTo: string
  fetchImpl?: typeof fetch
  isNonceUsed: (nonce: string) => boolean
  markNonceUsed: (nonce: string) => void
  now?: Date
  parameters: URLSearchParams
}) {
  if (
    parameters.get('openid.ns') !== 'http://specs.openid.net/auth/2.0' ||
    parameters.get('openid.mode') !== 'id_res' ||
    parameters.get('openid.op_endpoint') !== steamOpenIdEndpoint ||
    parameters.get('openid.return_to') !== expectedReturnTo
  ) {
    throw new Error('Réponse Steam invalide.')
  }

  const signedFields = new Set(
    (parameters.get('openid.signed') ?? '').split(',').map((field) => field.trim()),
  )

  if (requiredSignedFields.some((field) => !signedFields.has(field))) {
    throw new Error('Signature Steam incomplète.')
  }

  const nonce = validateNonce(parameters.get('openid.response_nonce'), now)

  if (isNonceUsed(nonce)) {
    throw new Error('Cette réponse Steam a déjà été utilisée.')
  }

  const verificationParameters = new URLSearchParams()

  for (const [key, value] of parameters) {
    if (key.startsWith('openid.')) {
      verificationParameters.set(key, value)
    }
  }

  verificationParameters.set('openid.mode', 'check_authentication')

  const response = await fetchImpl(steamOpenIdEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: verificationParameters,
    signal: AbortSignal.timeout(15_000),
  })

  if (!response.ok) {
    throw new Error('Steam ne peut pas confirmer la connexion.')
  }

  const verification = parseDirectResponse(await response.text())

  if (verification.get('is_valid') !== 'true') {
    throw new Error('Steam a refusé la connexion.')
  }

  const steamId = readSteamId(parameters)
  markNonceUsed(nonce)
  return steamId
}

export { steamOpenIdEndpoint }
