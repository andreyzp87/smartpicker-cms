import { readFile } from 'node:fs/promises'
import path from 'node:path'
import postgres from 'postgres'
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql'

let container: StartedPostgreSqlContainer | null = null

async function applyMigrations(connectionString: string) {
  const sql = postgres(connectionString, { max: 1 })
  const migrationPath = path.resolve(
    process.cwd(),
    './src/db/migrations/0000_initial_schema.sql',
  )

  try {
    const migrationSql = await readFile(migrationPath, 'utf-8')
    await sql.unsafe(migrationSql)
  } finally {
    await sql.end()
  }
}

export async function startTestPostgres(): Promise<string> {
  if (container) {
    return container.getConnectionUri()
  }

  container = await new PostgreSqlContainer('postgres:16-alpine')
    .withDatabase('smartpicker_test')
    .withUsername('smartpicker')
    .withPassword('smartpicker')
    .start()

  const connectionString = container.getConnectionUri()
  await applyMigrations(connectionString)
  return connectionString
}

export async function resetTestDatabase(connectionString: string) {
  const sql = postgres(connectionString, { max: 1 })

  try {
    const tables = await sql<{ tablename: string }[]>`
      select tablename
      from pg_tables
      where schemaname = 'public'
    `

    if (tables.length === 0) {
      return
    }

    const identifiers = tables.map(({ tablename }) => `"public"."${tablename}"`).join(', ')
    await sql.unsafe(`TRUNCATE TABLE ${identifiers} RESTART IDENTITY CASCADE`)
  } finally {
    await sql.end()
  }
}

export async function stopTestPostgres() {
  if (!container) {
    return
  }

  await container.stop()
  container = null
}
