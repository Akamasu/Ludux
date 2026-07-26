import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'
import { mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { PrismaClient } from '../../generated/prisma/client'
import { getLuduxDatabasePath } from '../services/app-data'

const globalForPrisma = globalThis as unknown as {
  luduxPrisma?: PrismaClient
}

function getDatabaseUrl() {
  if (process.env['LUDUX_DATA_DIR']?.trim()) {
    return `file:${getLuduxDatabasePath()}`
  }

  return process.env['DATABASE_URL'] ?? 'file:./userdata/database/ludux.db'
}

export function getDatabaseFilePath() {
  const databaseUrl = getDatabaseUrl()

  if (databaseUrl === ':memory:') {
    return null
  }

  return resolve(databaseUrl.replace(/^file:/, ''))
}

function ensureSqliteDirectory(databaseUrl: string) {
  if (databaseUrl === ':memory:') {
    return
  }

  const databasePath = getDatabaseFilePath()

  if (databasePath) {
    mkdirSync(dirname(databasePath), { recursive: true })
  }
}

const databaseUrl = getDatabaseUrl()
ensureSqliteDirectory(databaseUrl)

export const prisma =
  globalForPrisma.luduxPrisma ??
  new PrismaClient({
    adapter: new PrismaBetterSqlite3({ url: databaseUrl }),
    log: ['warn', 'error'],
  })

if (process.env['NODE_ENV'] !== 'production') {
  globalForPrisma.luduxPrisma = prisma
}
