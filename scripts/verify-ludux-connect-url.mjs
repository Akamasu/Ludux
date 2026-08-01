const configuredUrl = process.env.LUDUX_CONNECT_URL?.trim()

if (!configuredUrl) {
  throw new Error('LUDUX_CONNECT_URL est absente de la configuration GitHub.')
}

const url = new URL(configuredUrl)

if (url.protocol !== 'https:') {
  throw new Error('LUDUX_CONNECT_URL doit utiliser HTTPS.')
}

if (
  url.username ||
  url.password ||
  url.search ||
  url.hash ||
  (url.pathname !== '' && url.pathname !== '/')
) {
  throw new Error('LUDUX_CONNECT_URL doit contenir uniquement l origine HTTPS du service.')
}

console.log(`Ludux Connect configure sur ${url.origin}.`)
