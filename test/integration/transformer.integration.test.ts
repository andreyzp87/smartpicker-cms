import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { eq } from 'drizzle-orm'
import { startTestPostgres, resetTestDatabase, stopTestPostgres } from './helpers/postgres'
import { hasDockerRuntime } from './helpers/runtime'

type ServerModules = {
  db: typeof import('../../src/db/client').db
  closeDbConnection: typeof import('../../src/db/client').closeDbConnection
  schema: typeof import('../../src/db/schema')
  transformRawImport: typeof import('../../src/processors/transformer').transformRawImport
  clearHubCache: typeof import('../../src/processors/compatibility').clearHubCache
  clearManufacturerCache: typeof import('../../src/processors/manufacturers').clearManufacturerCache
}

let connectionString = ''
let modules: ServerModules
const describeIntegration = hasDockerRuntime() ? describe : describe.skip

describeIntegration('transformRawImport integration', () => {
  beforeAll(async () => {
    connectionString = await startTestPostgres()
    process.env.DATABASE_URL = connectionString

    const [dbModule, schema, transformerModule, compatibilityModule, manufacturerModule] =
      await Promise.all([
      import('../../src/db/client'),
      import('../../src/db/schema'),
      import('../../src/processors/transformer'),
      import('../../src/processors/compatibility'),
      import('../../src/processors/manufacturers'),
    ])

    modules = {
      db: dbModule.db,
      closeDbConnection: dbModule.closeDbConnection,
      schema,
      transformRawImport: transformerModule.transformRawImport,
      clearHubCache: compatibilityModule.clearHubCache,
      clearManufacturerCache: manufacturerModule.clearManufacturerCache,
    }
  })

  beforeEach(async () => {
    await resetTestDatabase(connectionString)
    modules.clearHubCache()
    modules.clearManufacturerCache()
  })

  afterAll(async () => {
    if (modules) {
      await modules.closeDbConnection()
    }

    await stopTestPostgres()
  })

  it('creates a new product, protocol details, compatibility, and auto-publishes safe imports', async () => {
    const { db, schema, transformRawImport } = modules
    const now = new Date('2026-03-26T12:00:00.000Z')

    const [bulbsCategory] = await db
      .insert(schema.categories)
      .values({
        name: 'Bulbs',
        slug: 'bulbs',
        sortOrder: 1,
        createdAt: now,
        updatedAt: now,
      })
      .returning()

    const [otherCategory] = await db
      .insert(schema.categories)
      .values({
        name: 'Other',
        slug: 'other',
        sortOrder: 999,
        createdAt: now,
        updatedAt: now,
      })
      .returning()

    expect(bulbsCategory.id).toBeGreaterThan(0)
    expect(otherCategory.id).toBeGreaterThan(0)

    const [rawImport] = await db
      .insert(schema.rawImports)
      .values({
        source: 'zigbee2mqtt',
        sourceId: 'LCT010',
        data: {
          description: 'Philips Hue bulb',
          model: 'LCT010',
          vendor: 'Philips',
          exposes: [{ type: 'light' }],
        },
        importedAt: now,
      })
      .returning()

    const result = await transformRawImport(rawImport.id)

    expect(result.created).toBe(true)
    expect(result.compatibilityRecordsCreated).toBe(1)
    expect(result.autoPublished).toBe(true)

    const [product] = await db.select().from(schema.products)
    const [manufacturer] = await db.select().from(schema.manufacturers)
    const [zigbeeDetails] = await db.select().from(schema.zigbeeDetails)
    const compatibilityRows = await db.select().from(schema.productIntegrationCompatibility)
    const [updatedRawImport] = await db.select().from(schema.rawImports)

    expect(product?.name).toBe('Philips Hue bulb')
    expect(product?.manufacturerId).toBe(manufacturer?.id)
    expect(product?.categoryId).toBe(bulbsCategory.id)
    expect(product?.status).toBe('published')
    expect(zigbeeDetails?.productId).toBe(product?.id)
    expect(compatibilityRows).toHaveLength(1)
    expect(compatibilityRows[0]?.canonicalSource).toBe('zigbee2mqtt')
    expect(compatibilityRows[0]?.reviewState).toBe('approved')
    expect(updatedRawImport?.productId).toBe(product?.id)
    expect(updatedRawImport?.processedAt).not.toBeNull()
  })

  it('updates an existing product and preserves a manually assigned category', async () => {
    const { db, schema, transformRawImport } = modules
    const now = new Date('2026-03-26T12:00:00.000Z')

    const [otherCategory] = await db
      .insert(schema.categories)
      .values({
        name: 'Other',
        slug: 'other',
        sortOrder: 999,
        createdAt: now,
        updatedAt: now,
      })
      .returning()

    await db.insert(schema.categories).values({
      name: 'Bulbs',
      slug: 'bulbs',
      sortOrder: 1,
      createdAt: now,
      updatedAt: now,
    })

    const [manufacturer] = await db
      .insert(schema.manufacturers)
      .values({
        name: 'Legacy Vendor',
        slug: 'legacy-vendor',
        createdAt: now,
        updatedAt: now,
      })
      .returning()

    const [rawImport] = await db
      .insert(schema.rawImports)
      .values({
        source: 'zigbee2mqtt',
        sourceId: 'LCT020',
        data: {
          description: 'Philips Hue candle bulb',
          model: 'LCT020',
          vendor: 'Philips',
        },
        importedAt: now,
      })
      .returning()

    const [existingProduct] = await db
      .insert(schema.products)
      .values({
        name: 'Old Name',
        slug: 'old-name',
        manufacturerId: manufacturer.id,
        categoryId: otherCategory.id,
        primaryProtocol: 'zigbee',
        primarySourceId: rawImport.id,
        status: 'draft',
        createdAt: now,
        updatedAt: now,
      })
      .returning()

    const result = await transformRawImport(rawImport.id)

    expect(result.created).toBe(false)
    expect(result.autoPublished).toBe(false)

    const [updatedProduct] = await db
      .select()
      .from(schema.products)
      .where(eq(schema.products.id, existingProduct.id))

    expect(updatedProduct?.id).toBe(existingProduct.id)
    expect(updatedProduct?.name).toBe('Philips Hue candle bulb')
    expect(updatedProduct?.categoryId).toBe(otherCategory.id)
    expect(updatedProduct?.status).toBe('draft')
  })
})
