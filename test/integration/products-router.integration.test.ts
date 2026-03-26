import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import type { AppRouter } from '../../src/routes'
import { startTestPostgres, resetTestDatabase, stopTestPostgres } from './helpers/postgres'
import { hasDockerRuntime } from './helpers/runtime'
import { createTrpcContext } from './helpers/server'

type ServerModules = {
  appRouter: AppRouter
  db: typeof import('../../src/db/client').db
  closeDbConnection: typeof import('../../src/db/client').closeDbConnection
  schema: typeof import('../../src/db/schema')
}

let connectionString = ''
let modules: ServerModules
const describeIntegration = hasDockerRuntime() ? describe : describe.skip

describeIntegration('products router integration', () => {
  beforeAll(async () => {
    connectionString = await startTestPostgres()
    process.env.DATABASE_URL = connectionString

    const [{ appRouter }, dbModule, schema] = await Promise.all([
      import('../../src/routes'),
      import('../../src/db/client'),
      import('../../src/db/schema'),
    ])

    modules = {
      appRouter,
      db: dbModule.db,
      closeDbConnection: dbModule.closeDbConnection,
      schema,
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

  it('filters, sorts, and paginates products through the protected tRPC router', async () => {
    const { db, schema, appRouter } = modules
    const now = new Date('2026-03-26T12:00:00.000Z')

    const [manufacturer] = await db
      .insert(schema.manufacturers)
      .values({
        name: 'Philips',
        slug: 'philips',
        createdAt: now,
        updatedAt: now,
      })
      .returning()

    const [lighting] = await db
      .insert(schema.categories)
      .values({
        name: 'Lighting',
        slug: 'lighting',
        sortOrder: 1,
        createdAt: now,
        updatedAt: now,
      })
      .returning()

    await db.insert(schema.products).values([
      {
        name: 'Hue Bulb A19',
        slug: 'hue-bulb-a19',
        manufacturerId: manufacturer.id,
        categoryId: lighting.id,
        primaryProtocol: 'zigbee',
        status: 'published',
        createdAt: new Date('2026-03-20T12:00:00.000Z'),
        updatedAt: new Date('2026-03-22T12:00:00.000Z'),
      },
      {
        name: 'Hue Motion Sensor',
        slug: 'hue-motion-sensor',
        manufacturerId: manufacturer.id,
        categoryId: lighting.id,
        primaryProtocol: 'zigbee',
        status: 'draft',
        createdAt: new Date('2026-03-21T12:00:00.000Z'),
        updatedAt: new Date('2026-03-24T12:00:00.000Z'),
      },
      {
        name: 'Wi-Fi Plug',
        slug: 'wifi-plug',
        manufacturerId: manufacturer.id,
        categoryId: lighting.id,
        primaryProtocol: 'wifi',
        status: 'published',
        createdAt: new Date('2026-03-22T12:00:00.000Z'),
        updatedAt: new Date('2026-03-23T12:00:00.000Z'),
      },
    ])

    const caller = appRouter.createCaller(createTrpcContext())
    const result = await caller.products.list({
      search: 'Hue',
      protocol: 'zigbee',
      status: 'published',
      limit: 1,
      offset: 0,
      sortField: 'updatedAt',
      sortOrder: 'desc',
    })

    expect(result.total).toBe(1)
    expect(result.items).toHaveLength(1)
    expect(result.items[0]?.slug).toBe('hue-bulb-a19')
  })
})
