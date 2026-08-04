import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const failures = []

const readText = (relativePath) =>
  readFileSync(resolve(root, relativePath), 'utf8')
const readJson = (relativePath) => JSON.parse(readText(relativePath))
const expect = (condition, message) => {
  if (!condition) failures.push(message)
}

for (const manifestPath of ['package.json', 'connect/package.json']) {
  const manifest = readJson(manifestPath)
  expect(
    manifest.license === 'GPL-3.0-only',
    `${manifestPath} doit déclarer GPL-3.0-only.`,
  )
}

for (const requiredPath of [
  'LICENSE',
  'ASSETS.md',
  'PRIVACY.md',
  'CODE_SIGNING_POLICY.md',
  '.github/CODEOWNERS',
]) {
  expect(existsSync(resolve(root, requiredPath)), `${requiredPath} est manquant.`)
}

const license = readText('LICENSE')
expect(
  license.includes('GNU GENERAL PUBLIC LICENSE') &&
    license.includes('Version 3, 29 June 2007'),
  'LICENSE ne contient pas le texte attendu de la GNU GPL v3.',
)

const readme = readText('README.md')
for (const link of ['LICENSE', 'ASSETS.md', 'PRIVACY.md', 'CODE_SIGNING_POLICY.md']) {
  expect(readme.includes(`(${link})`), `README.md doit référencer ${link}.`)
}

const signingPolicy = readText('CODE_SIGNING_POLICY.md')
expect(
  signingPolicy.includes(
    'Free code signing provided by SignPath.io, certificate by SignPath Foundation.',
  ),
  'La mention exigée par SignPath Foundation est absente.',
)

const allowedLicenses = new Set([
  '(BSD-2-Clause OR MIT OR Apache-2.0)',
  '(MIT OR WTFPL)',
  'Apache-2.0',
  'BSD-2-Clause',
  'BSD-3-Clause',
  'BlueOak-1.0.0',
  'EPL-2.0',
  'ISC',
  'MIT',
  'MIT and ISC',
  'Python-2.0',
  'Unlicense',
])

const auditLockfile = (lockfilePath) => {
  const lockfile = readJson(lockfilePath)

  for (const [packagePath, metadata] of Object.entries(lockfile.packages ?? {})) {
    if (!packagePath || metadata.dev === true) continue

    const packageName = packagePath.replace(/^node_modules\//, '')
    if (allowedLicenses.has(metadata.license)) continue

    if (packageName === 'seq-queue' && metadata.license === undefined) {
      const dependencyLicensePath = resolve(root, 'node_modules/seq-queue/LICENSE')
      const dependencyLicense = existsSync(dependencyLicensePath)
        ? readFileSync(dependencyLicensePath, 'utf8')
        : ''

      expect(
        dependencyLicense.includes('The MIT License'),
        'La licence MIT de seq-queue est introuvable.',
      )
      continue
    }

    failures.push(
      `${lockfilePath}: licence à examiner pour ${packageName}: ${metadata.license ?? 'non déclarée'}.`,
    )
  }
}

auditLockfile('package-lock.json')
auditLockfile('connect/package-lock.json')

if (failures.length > 0) {
  console.error('Préparation open source incomplète :')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exitCode = 1
} else {
  console.log('Licence GPL-3.0, politiques, actifs et dépendances vérifiés.')
}
