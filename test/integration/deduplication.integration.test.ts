import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { and, eq } from 'drizzle-orm'
import { startTestPostgres, resetTestDatabase, stopTestPostgres } from './helpers/postgres'
import { hasDockerRuntime } from './helpers/runtime'

type ServerModules = {
  db: typeof import('../../src/db/client').db
  closeDbConnection: typeof import('../../src/db/client').closeDbConnection
  schema: typeof import('../../src/db/schema')
  deduplicateProducts: typeof import('../../src/deduplication').deduplicateProducts
}

let connectionString = ''
let modules: ServerModules
const describeIntegration = hasDockerRuntime() ? describe : describe.skip

describeIntegration('deduplicateProducts integration', () => {
  beforeAll(async () => {
    connectionString = await startTestPostgres()
    process.env.DATABASE_URL = connectionString

    const [dbModule, schema, deduplicationModule] = await Promise.all([
      import('../../src/db/client'),
      import('../../src/db/schema'),
      import('../../src/deduplication'),
    ])

    modules = {
      db: dbModule.db,
      closeDbConnection: dbModule.closeDbConnection,
      schema,
      deduplicateProducts: deduplicationModule.deduplicateProducts,
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

  it('merges duplicate compatibility rows and evidence without violating unique constraints', async () => {
    const { db, schema, deduplicateProducts } = modules
    const now = new Date('2026-04-03T10:00:00.000Z')

    const [manufacturer] = await db
      .insert(schema.manufacturers)
      .values({
        name: 'Philips',
        slug: 'philips',
        createdAt: now,
        updatedAt: now,
      })
      .returning()

    const [category] = await db
      .insert(schema.categories)
      .values({
        name: 'Bulbs',
        slug: 'bulbs',
        sortOrder: 1,
        createdAt: now,
        updatedAt: now,
      })
      .returning()

    const [integration] = await db
      .insert(schema.integrations)
      .values({
        name: 'Zigbee2MQTT',
        slug: 'zigbee2mqtt',
        integrationKind: 'protocol_stack',
        primaryProtocol: 'zigbee',
        description: 'MQTT bridge',
        status: 'published',
        createdAt: now,
        updatedAt: now,
      })
      .returning()

    const [hub] = await db
      .insert(schema.commercialHubs)
      .values({
        name: 'Smart Hub',
        slug: 'smart-hub',
        manufacturerId: manufacturer.id,
        description: 'Test hub',
        status: 'published',
        createdAt: now,
        updatedAt: now,
      })
      .returning()

    const [canonicalImport] = await db
      .insert(schema.rawImports)
      .values({
        source: 'zigbee2mqtt',
        sourceId: 'LCT010',
        data: {},
        importedAt: now,
      })
      .returning()

    const [duplicateImport] = await db
      .insert(schema.rawImports)
      .values({
        source: 'blakadder',
        sourceId: 'philips-lct010',
        data: {},
        importedAt: new Date('2026-04-03T11:00:00.000Z'),
      })
      .returning()

    const [canonicalProduct] = await db
      .insert(schema.products)
      .values({
        name: 'Hue Bulb A19',
        slug: 'hue-bulb-a19',
        manufacturerId: manufacturer.id,
        model: 'LCT010',
        categoryId: category.id,
        primaryProtocol: 'zigbee',
        primarySourceId: canonicalImport.id,
        status: 'published',
        createdAt: now,
        updatedAt: now,
      })
      .returning()

    const [duplicateProduct] = await db
      .insert(schema.products)
      .values({
        name: 'Hue Bulb A19 Duplicate',
        slug: 'hue-bulb-a19-duplicate',
        manufacturerId: manufacturer.id,
        model: 'LCT010',
        categoryId: category.id,
        primaryProtocol: 'zigbee',
        primarySourceId: duplicateImport.id,
        status: 'draft',
        createdAt: new Date('2026-04-03T11:00:00.000Z'),
        updatedAt: new Date('2026-04-03T11:00:00.000Z'),
      })
      .returning()

    const [canonicalIntegrationCompatibility] = await db
      .insert(schema.productIntegrationCompatibility)
      .values({
        productId: canonicalProduct.id,
        integrationId: integration.id,
        status: 'supported',
        reviewState: 'pending',
        supportSummary: 'Imported compatibility',
        canonicalSource: 'zigbee2mqtt',
        firstSeenAt: now,
        lastConfirmedAt: now,
        createdAt: now,
        updatedAt: now,
      })
      .returning()

    const [duplicateIntegrationCompatibility] = await db
      .insert(schema.productIntegrationCompatibility)
      .values({
        productId: duplicateProduct.id,
        integrationId: integration.id,
        status: 'verified',
        reviewState: 'approved',
        supportSummary: 'Reviewed compatibility',
        internalNotes: 'Approved by editor',
        canonicalSource: 'manual',
        firstSeenAt: new Date('2026-04-01T10:00:00.000Z'),
        lastConfirmedAt: new Date('2026-04-03T12:00:00.000Z'),
        createdAt: now,
        updatedAt: new Date('2026-04-03T12:00:00.000Z'),
      })
      .returning()

    const [canonicalHubCompatibility] = await db
      .insert(schema.productHubCompatibility)
      .values({
        productId: canonicalProduct.id,
        hubId: hub.id,
        status: 'reported',
        reviewState: 'pending',
        supportSummary: 'Imported hub compatibility',
        canonicalSource: 'blakadder',
        firstSeenAt: now,
        lastConfirmedAt: now,
        createdAt: now,
        updatedAt: now,
      })
      .returning()

    const [duplicateHubCompatibility] = await db
      .insert(schema.productHubCompatibility)
      .values({
        productId: duplicateProduct.id,
        hubId: hub.id,
        status: 'supported',
        reviewState: 'approved',
        supportSummary: 'Manually reviewed hub compatibility',
        canonicalSource: 'manual',
        firstSeenAt: new Date('2026-04-02T10:00:00.000Z'),
        lastConfirmedAt: new Date('2026-04-03T13:00:00.000Z'),
        createdAt: now,
        updatedAt: new Date('2026-04-03T13:00:00.000Z'),
      })
      .returning()

    await db.insert(schema.compatibilityEvidence).values([
      {
        targetType: 'integration',
        productIntegrationCompatibilityId: canonicalIntegrationCompatibility.id,
        productHubCompatibilityId: null,
        source: 'zigbee2mqtt',
        sourceRecordKey: 'shared-record',
        assertedStatus: 'supported',
        note: 'Canonical evidence',
        metadata: {},
        importedAt: now,
        createdAt: now,
      },
      {
        targetType: 'integration',
        productIntegrationCompatibilityId: duplicateIntegrationCompatibility.id,
        productHubCompatibilityId: null,
        source: 'zigbee2mqtt',
        sourceRecordKey: 'shared-record',
        assertedStatus: 'supported',
        note: 'Duplicate shared evidence',
        metadata: {},
        importedAt: new Date('2026-04-03T12:00:00.000Z'),
        createdAt: now,
      },
      {
        targetType: 'integration',
        productIntegrationCompatibilityId: duplicateIntegrationCompatibility.id,
        productHubCompatibilityId: null,
        source: 'manual',
        sourceRecordKey: 'editor-review',
        assertedStatus: 'verified',
        note: 'Editor validated support',
        metadata: {},
        importedAt: new Date('2026-04-03T12:05:00.000Z'),
        createdAt: now,
      },
      {
        targetType: 'hub',
        productIntegrationCompatibilityId: null,
        productHubCompatibilityId: canonicalHubCompatibility.id,
        source: 'blakadder',
        sourceRecordKey: 'hub-import',
        assertedStatus: 'reported',
        note: 'Imported hub evidence',
        metadata: {},
        importedAt: now,
        createdAt: now,
      },
      {
        targetType: 'hub',
        productIntegrationCompatibilityId: null,
        productHubCompatibilityId: duplicateHubCompatibility.id,
        source: 'manual',
        sourceRecordKey: 'hub-review',
        assertedStatus: 'supported',
        note: 'Editor reviewed hub support',
        metadata: {},
        importedAt: new Date('2026-04-03T13:05:00.000Z'),
        createdAt: now,
      },
    ])

    const result = await deduplicateProducts()

    expect(result.duplicateGroups).toBe(1)
    expect(result.productsKept).toBe(1)
    expect(result.productsDeleted).toBe(1)
    expect(result.productSourcesCreated).toBe(2)

    const remainingProducts = await db.select().from(schema.products)
    expect(remainingProducts).toHaveLength(1)
    expect(remainingProducts[0]?.id).toBe(canonicalProduct.id)

    const [updatedDuplicateImport] = await db
      .select()
      .from(schema.rawImports)
      .where(eq(schema.rawImports.id, duplicateImport.id))
    expect(updatedDuplicateImport?.productId).toBe(canonicalProduct.id)

    const integrationRows = await db
      .select()
      .from(schema.productIntegrationCompatibility)
      .where(eq(schema.productIntegrationCompatibility.productId, canonicalProduct.id))
    expect(integrationRows).toHaveLength(1)
    expect(integrationRows[0]?.reviewState).toBe('approved')
    expect(integrationRows[0]?.status).toBe('verified')
    expect(integrationRows[0]?.canonicalSource).toBe('manual')
    expect(integrationRows[0]?.supportSummary).toBe('Reviewed compatibility')
    expect(integrationRows[0]?.internalNotes).toBe('Approved by editor')
    expect(integrationRows[0]?.firstSeenAt?.toISOString()).toBe('2026-04-01T10:00:00.000Z')
    expect(integrationRows[0]?.lastConfirmedAt?.toISOString()).toBe('2026-04-03T12:00:00.000Z')

    const hubRows = await db
      .select()
      .from(schema.productHubCompatibility)
      .where(eq(schema.productHubCompatibility.productId, canonicalProduct.id))
    expect(hubRows).toHaveLength(1)
    expect(hubRows[0]?.reviewState).toBe('approved')
    expect(hubRows[0]?.status).toBe('supported')
    expect(hubRows[0]?.canonicalSource).toBe('manual')
    expect(hubRows[0]?.supportSummary).toBe('Manually reviewed hub compatibility')

    const integrationEvidence = await db
      .select()
      .from(schema.compatibilityEvidence)
      .where(
        eq(
          schema.compatibilityEvidence.productIntegrationCompatibilityId,
          integrationRows[0]?.id ?? -1,
        ),
      )
    expect(integrationEvidence).toHaveLength(2)
    expect(
      integrationEvidence.map((entry) => `${entry.source}:${entry.sourceRecordKey}`).sort(),
    ).toEqual(['manual:editor-review', 'zigbee2mqtt:shared-record'])

    const hubEvidence = await db
      .select()
      .from(schema.compatibilityEvidence)
      .where(eq(schema.compatibilityEvidence.productHubCompatibilityId, hubRows[0]?.id ?? -1))
    expect(hubEvidence).toHaveLength(2)
    expect(hubEvidence.map((entry) => `${entry.source}:${entry.sourceRecordKey}`).sort()).toEqual([
      'blakadder:hub-import',
      'manual:hub-review',
    ])

    const productSourceLinks = await db
      .select()
      .from(schema.productSources)
      .where(eq(schema.productSources.productId, canonicalProduct.id))
    expect(productSourceLinks).toHaveLength(2)
    expect(
      productSourceLinks.find((entry) => entry.rawImportId === canonicalImport.id)?.isPrimary,
    ).toBe(true)
    expect(
      productSourceLinks.find((entry) => entry.rawImportId === duplicateImport.id)?.isPrimary,
    ).toBe(false)

    const duplicateCompatibilityRows = await db
      .select()
      .from(schema.productIntegrationCompatibility)
      .where(
        and(
          eq(schema.productIntegrationCompatibility.productId, duplicateProduct.id),
          eq(schema.productIntegrationCompatibility.integrationId, integration.id),
        ),
      )
    expect(duplicateCompatibilityRows).toHaveLength(0)
  })

  it('skips product_sources rows for manual duplicates without a primary source', async () => {
    const { db, schema, deduplicateProducts } = modules
    const now = new Date('2026-04-03T14:00:00.000Z')

    const [manufacturer] = await db
      .insert(schema.manufacturers)
      .values({
        name: 'Aqara',
        slug: 'aqara',
        createdAt: now,
        updatedAt: now,
      })
      .returning()

    const [category] = await db
      .insert(schema.categories)
      .values({
        name: 'Sensors',
        slug: 'sensors',
        sortOrder: 1,
        createdAt: now,
        updatedAt: now,
      })
      .returning()

    const [rawImport] = await db
      .insert(schema.rawImports)
      .values({
        source: 'zigbee2mqtt',
        sourceId: 'RTCGQ11LM',
        data: {},
        importedAt: now,
      })
      .returning()

    const [canonicalProduct] = await db
      .insert(schema.products)
      .values({
        name: 'Aqara Motion Sensor',
        slug: 'aqara-motion-sensor',
        manufacturerId: manufacturer.id,
        model: 'RTCGQ11LM',
        categoryId: category.id,
        primaryProtocol: 'zigbee',
        primarySourceId: rawImport.id,
        status: 'published',
        createdAt: now,
        updatedAt: now,
      })
      .returning()

    await db.insert(schema.products).values({
      name: 'Aqara Motion Sensor Manual',
      slug: 'aqara-motion-sensor-manual',
      manufacturerId: manufacturer.id,
      model: 'RTCGQ11LM',
      categoryId: category.id,
      primaryProtocol: 'zigbee',
      primarySourceId: null,
      status: 'draft',
      createdAt: new Date('2026-04-03T14:05:00.000Z'),
      updatedAt: new Date('2026-04-03T14:05:00.000Z'),
    })

    const result = await deduplicateProducts()

    expect(result.duplicateGroups).toBe(1)
    expect(result.productsKept).toBe(1)
    expect(result.productsDeleted).toBe(1)
    expect(result.productSourcesCreated).toBe(1)

    const remainingProducts = await db.select().from(schema.products)
    expect(remainingProducts).toHaveLength(1)
    expect(remainingProducts[0]?.id).toBe(canonicalProduct.id)
    expect(remainingProducts[0]?.primarySourceId).toBe(rawImport.id)

    const productSourceLinks = await db
      .select()
      .from(schema.productSources)
      .where(eq(schema.productSources.productId, canonicalProduct.id))
    expect(productSourceLinks).toHaveLength(1)
    expect(productSourceLinks[0]?.rawImportId).toBe(rawImport.id)
    expect(productSourceLinks[0]?.isPrimary).toBe(true)
  })
})
