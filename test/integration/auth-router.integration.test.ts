import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import type { AppRouter } from '../../src/routes'
import { createHonoContext } from './helpers/hono'
import { startTestPostgres, resetTestDatabase, stopTestPostgres } from './helpers/postgres'
import { hasDockerRuntime } from './helpers/runtime'

type ServerModules = {
  appRouter: AppRouter
  db: typeof import('../../src/db/client').db
  closeDbConnection: typeof import('../../src/db/client').closeDbConnection
  schema: typeof import('../../src/db/schema')
  hashPassword: typeof import('../../src/lib/auth').hashPassword
  sessionCookieName: string
}

let connectionString = ''
let modules: ServerModules
const describeIntegration = hasDockerRuntime() ? describe : describe.skip

describeIntegration('auth router integration', () => {
  beforeAll(async () => {
    connectionString = await startTestPostgres()
    process.env.DATABASE_URL = connectionString

    const [{ appRouter }, dbModule, schema, authModule] = await Promise.all([
      import('../../src/routes'),
      import('../../src/db/client'),
      import('../../src/db/schema'),
      import('../../src/lib/auth'),
    ])

    modules = {
      appRouter,
      db: dbModule.db,
      closeDbConnection: dbModule.closeDbConnection,
      schema,
      hashPassword: authModule.hashPassword,
      sessionCookieName: authModule.SESSION_COOKIE_NAME,
    }
  })

  beforeEach(async () => {
    await resetTestDatabase(connectionString)
  })

  afterAll(async () => {
    if (modules) {
      await modules.closeDbConnection()
    }

    await stopTestPostgres()
  })

  it('logs in, creates a session, and clears it on logout', async () => {
    const { db, schema, appRouter, hashPassword, sessionCookieName } = modules
    const password = 'super-secret-password'
    const now = new Date('2026-03-26T12:00:00.000Z')

    const [user] = await db
      .insert(schema.users)
      .values({
        email: 'admin@example.com',
        name: 'Admin',
        passwordHash: await hashPassword(password),
        isActive: true,
        createdAt: now,
        updatedAt: now,
      })
      .returning()

    const loginContext = createHonoContext('http://localhost/api/trpc/auth.login')
    const caller = appRouter.createCaller({
      c: loginContext,
      session: null,
      user: null,
    })

    const loginResult = await caller.auth.login({
      email: 'admin@example.com',
      password,
    })

    expect(loginResult.user.email).toBe('admin@example.com')

    const sessionRows = await db.select().from(schema.sessions)
    expect(sessionRows).toHaveLength(1)
    expect(sessionRows[0]?.userId).toBe(user.id)

    const setCookieHeader = loginContext.res.headers.get('set-cookie')
    expect(setCookieHeader).toContain(`${sessionCookieName}=`)

    const cookieHeader = setCookieHeader?.split(';', 1)[0]
    expect(cookieHeader).toBeTruthy()

    const logoutContext = createHonoContext('http://localhost/api/trpc/auth.logout', {
      headers: {
        Cookie: cookieHeader!,
      },
    })

    const logoutCaller = appRouter.createCaller({
      c: logoutContext,
      session: null,
      user: null,
    })

    const logoutResult = await logoutCaller.auth.logout()

    expect(logoutResult).toEqual({ success: true })
    await expect(db.select().from(schema.sessions)).resolves.toHaveLength(0)
    expect(logoutContext.res.headers.get('set-cookie')).toContain(`${sessionCookieName}=`)
  })

  it('rejects inactive users even when the password is correct', async () => {
    const { db, schema, appRouter, hashPassword } = modules

    await db.insert(schema.users).values({
      email: 'inactive@example.com',
      name: 'Inactive',
      passwordHash: await hashPassword('password123'),
      isActive: false,
    })

    const caller = appRouter.createCaller({
      c: createHonoContext('http://localhost/api/trpc/auth.login'),
      session: null,
      user: null,
    })

    await expect(
      caller.auth.login({
        email: 'inactive@example.com',
        password: 'password123',
      }),
    ).rejects.toMatchObject({
      code: 'UNAUTHORIZED',
      message: 'Invalid email or password',
    })
  })
})
