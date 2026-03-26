import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { LocalStorageDriver } from '../../src/storage/local.driver'
import { startTestPostgres, resetTestDatabase, stopTestPostgres } from './helpers/postgres'
import { hasDockerRuntime } from './helpers/runtime'

type ServerModules = {
  db: typeof import('../../src/db/client').db
  closeDbConnection: typeof import('../../src/db/client').closeDbConnection
  schema: typeof import('../../src/db/schema')
  ExportService: typeof import('../../src/services/export.service').ExportService
}

let connectionString = ''
let modules: ServerModules
let exportDir = ''
const describeIntegration = hasDockerRuntime() ? describe : describe.skip

describeIntegration('ExportService integration', () => {
  beforeAll(async () => {
    connectionString = await startTestPostgres()
    process.env.DATABASE_URL = connectionString
    delete process.env.CLOUDFLARE_DEPLOY_HOOK

    const [dbModule, schema, exportModule] = await Promise.all([
      import('../../src/db/client'),
      import('../../src/db/schema'),
      import('../../src/services/export.service'),
    ])

    modules = {
      db: dbModule.db,
      closeDbConnection: dbModule.closeDbConnection,
      schema,
      ExportService: exportModule.ExportService,
    }
  })

  beforeEach(async () => {
    await resetTestDatabase(connectionString)
    exportDir = await mkdtemp(path.join(os.tmpdir(), 'smartpicker-exports-'))
  })

  afterEach(async () => {
    if (exportDir) {
      await rm(exportDir, { recursive: true, force: true })
      exportDir = ''
    }
  })

  afterAll(async () => {
    if (modules) {
      await modules.closeDbConnection()
    }

    await stopTestPostgres()
  })

  it('writes public export files, excludes draft entities, and removes stale detail files', async () => {
    const { db, schema, ExportService } = modules
    const now = new Date('2026-03-26T12:00:00.000Z')

    const [manufacturer] = await db
      .insert(schema.manufacturers)
      .values({
        name: 'Philips',
        slug: 'philips',
        website: 'https://example.com/philips',
        createdAt: now,
        updatedAt: now,
      })
      .returning()

    const [category] = await db
      .insert(schema.categories)
      .values({
        name: 'Lighting',
        slug: 'lighting',
        sortOrder: 1,
        createdAt: now,
        updatedAt: now,
      })
      .returning()

    const [platform] = await db
      .insert(schema.platforms)
      .values({
        name: 'Home Assistant',
        slug: 'home-assistant',
        kind: 'open_platform',
        manufacturerId: manufacturer.id,
        website: 'https://example.com/home-assistant',
        description: 'Open smart home platform',
        status: 'published',
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
        website: 'https://example.com/z2m',
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
        website: 'https://example.com/hub',
        description: 'A published hub',
        status: 'published',
        createdAt: now,
        updatedAt: now,
      })
      .returning()

    await db.insert(schema.platformIntegrations).values({
      platformId: platform.id,
      integrationId: integration.id,
      supportType: 'native',
      notes: 'Built in',
      createdAt: now,
      updatedAt: now,
    })

    const [publishedProduct] = await db
      .insert(schema.products)
      .values({
        name: 'Hue Bulb A19',
        slug: 'hue-bulb-a19',
        manufacturerId: manufacturer.id,
        model: 'LCT010',
        categoryId: category.id,
        primaryProtocol: 'zigbee',
        localControl: true,
        cloudDependent: false,
        requiresHub: true,
        matterCertified: false,
        description: 'A published bulb',
        status: 'published',
        createdAt: new Date('2026-03-20T12:00:00.000Z'),
        updatedAt: new Date('2026-03-22T12:00:00.000Z'),
      })
      .returning()

    await db.insert(schema.products).values({
      name: 'Draft Bulb',
      slug: 'draft-bulb',
      manufacturerId: manufacturer.id,
      model: 'DRAFT1',
      categoryId: category.id,
      primaryProtocol: 'zigbee',
      status: 'draft',
      createdAt: new Date('2026-03-21T12:00:00.000Z'),
      updatedAt: new Date('2026-03-23T12:00:00.000Z'),
    })

    await db.insert(schema.zigbeeDetails).values({
      productId: publishedProduct.id,
      ieeeManufacturer: 'Philips',
      modelId: 'LCT010',
      endpoints: [{ ID: 1 }],
      exposes: [{ type: 'light' }],
    })

    await db.insert(schema.productIntegrationCompatibility).values({
      productId: publishedProduct.id,
      integrationId: integration.id,
      status: 'supported',
      reviewState: 'approved',
      supportSummary: 'Works well',
      canonicalSource: 'manual',
      firstSeenAt: now,
      lastConfirmedAt: now,
      createdAt: now,
      updatedAt: now,
    })

    await db.insert(schema.productHubCompatibility).values({
      productId: publishedProduct.id,
      hubId: hub.id,
      status: 'reported',
      reviewState: 'approved',
      supportSummary: 'Reported working',
      canonicalSource: 'manual',
      firstSeenAt: now,
      lastConfirmedAt: now,
      createdAt: now,
      updatedAt: now,
    })

    await mkdir(path.join(exportDir, 'products'), { recursive: true })
    await writeFile(path.join(exportDir, 'products/stale.json'), '{"stale":true}', 'utf-8')

    const service = new ExportService(
      new LocalStorageDriver({
        basePath: exportDir,
        publicUrlBase: '/api/exports',
      }),
    )

    const result = await service.generateAllExports()

    expect(result.products.count).toBe(1)
    expect(result.manufacturers.count).toBe(1)
    expect(result.platforms.count).toBe(1)
    expect(result.integrations.count).toBe(1)
    expect(result.hubs.count).toBe(1)

    await expect(readFile(path.join(exportDir, 'products/stale.json'), 'utf-8')).rejects.toThrow()

    const productsIndex = JSON.parse(await readFile(path.join(exportDir, 'products.json'), 'utf-8'))
    const productDetail = JSON.parse(
      await readFile(path.join(exportDir, 'products/hue-bulb-a19.json'), 'utf-8'),
    )
    const categoriesIndex = JSON.parse(
      await readFile(path.join(exportDir, 'categories.json'), 'utf-8'),
    )
    const searchExport = JSON.parse(await readFile(path.join(exportDir, 'search.json'), 'utf-8'))
    const siteExport = JSON.parse(await readFile(path.join(exportDir, 'site.json'), 'utf-8'))
    const sitemapExport = JSON.parse(await readFile(path.join(exportDir, 'sitemap.json'), 'utf-8'))
    const typesExport = await readFile(path.join(exportDir, 'types.ts'), 'utf-8')

    expect(productsIndex.count).toBe(1)
    expect(productsIndex.products).toHaveLength(1)
    expect(productsIndex.products[0].slug).toBe('hue-bulb-a19')
    expect(productsIndex.products[0].compatibleIntegrationSlugs).toEqual(['zigbee2mqtt'])
    expect(productsIndex.products[0].compatiblePlatformSlugs).toEqual(['home-assistant'])
    expect(productsIndex.products[0].compatibleHubSlugs).toEqual(['smart-hub'])

    expect(productDetail.product.integrationCompatibility).toHaveLength(1)
    expect(productDetail.product.platformCompatibility).toHaveLength(1)
    expect(productDetail.product.hubCompatibility).toHaveLength(1)
    expect(productDetail.product.zigbeeDetails.modelId).toBe('LCT010')

    expect(categoriesIndex.categories).toHaveLength(1)
    expect(searchExport.items.some((item: { slug: string }) => item.slug === 'draft-bulb')).toBe(false)
    expect(siteExport.stats.devices).toBe(1)
    expect(sitemapExport.urls.some((item: { path: string }) => item.path === '/devices/hue-bulb-a19')).toBe(
      true,
    )
    expect(typesExport).toContain('export interface ProductExportSummary')
  })
})
