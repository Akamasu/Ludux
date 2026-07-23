interface ExternalGameLinkIdentity {
  gameId: string
  provider: string
  externalId: string
}

export function createIgnoredExternalGameLinkKey({
  gameId,
  provider,
  externalId,
}: ExternalGameLinkIdentity) {
  return `${gameId}\u0000${provider}\u0000${externalId}`
}

export function buildIgnoredExternalGameLinkKeySet(
  records: ExternalGameLinkIdentity[],
) {
  return new Set(records.map(createIgnoredExternalGameLinkKey))
}

export function hasIgnoredExternalGameLink(
  keys: ReadonlySet<string>,
  identity: ExternalGameLinkIdentity,
) {
  return keys.has(createIgnoredExternalGameLinkKey(identity))
}
