import { and, eq, gt } from 'drizzle-orm'
import { db } from '../db/client'
import { products } from '../db/schema'
import { logger } from '../lib/logger'
import { createStorageDriver, getStorageConfig } from '../storage'
import type { StorageDriver } from '../storage'

const EXPORT_VERSION = '3.0'
const PRODUCT_EXPORT_BATCH_SIZE = 250
const FEATURED_DEVICE_COUNT = 12
const RECENT_DEVICE_COUNT = 24

const PROTOCOL_DEFINITIONS = [
  {
    slug: 'zigbee',
    name: 'Zigbee',
    title: 'Zigbee Devices',
    description: 'Low-power mesh devices that usually need a Zigbee coordinator or hub.',
  },
  {
    slug: 'zwave',
    name: 'Z-Wave',
    title: 'Z-Wave Devices',
    description: 'Sub-GHz smart home devices focused on reliability and interoperability.',
  },
  {
    slug: 'matter',
    name: 'Matter',
    title: 'Matter Devices',
    description: 'Matter-compatible devices designed for multi-platform smart home setups.',
  },
  {
    slug: 'wifi',
    name: 'Wi-Fi',
    title: 'Wi-Fi Devices',
    description: 'Smart home devices that connect directly over Wi-Fi.',
  },
  {
    slug: 'thread',
    name: 'Thread',
    title: 'Thread Devices',
    description: 'Low-power mesh devices that use Thread networking.',
  },
  {
    slug: 'bluetooth',
    name: 'Bluetooth',
    title: 'Bluetooth Devices',
    description: 'Short-range devices that connect over Bluetooth.',
  },
] as const

type ProtocolSlug = (typeof PROTOCOL_DEFINITIONS)[number]['slug']
type SitemapPageType =
  | 'static'
  | 'device'
  | 'hub'
  | 'manufacturer'
  | 'category'
  | 'protocol'

interface ExportEntityRef {
  id: number
  slug: string
  name: string
}

interface EntityWithIdentity {
  id: number
  slug: string
  name: string
}

interface ProductCompatibilityRecord {
  hub: ExportEntityRef | null
  integrationName: string | null
  status: string
}

interface PublishedProductRecord {
  id: number
  slug: string
  name: string
  manufacturer: ExportEntityRef | null
  model: string | null
  category: ExportEntityRef | null
  primaryProtocol: string | null
  localControl: boolean | null
  cloudDependent: boolean | null
  requiresHub: boolean | null
  matterCertified: boolean | null
  imageUrl: string | null
  description: string | null
  updatedAt: Date
  zigbeeDetails: {
    ieeeManufacturer: string | null
    modelId: string | null
    endpoints: unknown
    exposes: unknown
  } | null
  zwaveDetails: {
    zwaveManufacturerId: string | null
    productType: string | null
    productIdHex: string | null
    frequency: string | null
  } | null
  compatibility: ProductCompatibilityRecord[]
}

interface ManufacturerRecord {
  id: number
  slug: string
  name: string
  website: string | null
  logoUrl: string | null
}

interface HubRecord {
  id: number
  slug: string
  name: string
  manufacturer: ExportEntityRef | null
  protocolsSupported: string[] | null
  description: string | null
}

interface CategoryRecord {
  id: number
  slug: string
  name: string
  parentId: number | null
  sortOrder: number
}

interface CategoryMetadata {
  id: number
  slug: string
  name: string
  parentId: number | null
  parentSlug: string | null
  path: string
  pathSegments: string[]
  ancestors: ExportEntityRef[]
  children: ExportEntityRef[]
  sortOrder: number
}

interface CategoryAggregate extends CategoryMetadata {
  directDeviceSlugs: string[]
  deviceSlugs: string[]
  latestUpdatedAt: Date | null
}

interface ManufacturerAggregate extends ManufacturerRecord {
  deviceSlugs: string[]
  latestUpdatedAt: Date | null
}

interface HubAggregate extends HubRecord {
  deviceSlugs: string[]
  latestUpdatedAt: Date | null
  statusCounts: Record<string, number>
  protocolCounts: Partial<Record<ProtocolSlug, number>>
}

interface ProtocolAggregate {
  slug: ProtocolSlug
  name: string
  title: string
  description: string
  deviceSlugs: string[]
  latestUpdatedAt: Date | null
  localControlCount: number
  cloudDependentCount: number
  matterCertifiedCount: number
}

interface RecentProductRecord {
  slug: string
  updatedAt: Date
}

export interface ProductExportSummary {
  id: number
  slug: string
  name: string
  manufacturer: ExportEntityRef | null
  model: string | null
  category: ExportEntityRef | null
  categoryPath: string[]
  primaryProtocol: string | null
  localControl: boolean | null
  cloudDependent: boolean | null
  requiresHub: boolean | null
  matterCertified: boolean | null
  imageUrl: string | null
  compatibleHubSlugs: string[]
  compatibilityStatuses: string[]
  updatedAt: string
  searchText: string
}

export interface ProductExport extends ProductExportSummary {
  description: string | null
  zigbeeDetails?: {
    ieeeManufacturer: string | null
    modelId: string | null
    endpoints: unknown
    exposes: unknown
  }
  zwaveDetails?: {
    zwaveManufacturerId: string | null
    productType: string | null
    productIdHex: string | null
    frequency: string | null
  }
  compatibility: {
    hub: ExportEntityRef
    integrationName: string | null
    status: string
  }[]
}

interface ManufacturerExportSummary {
  id: number
  slug: string
  name: string
  website: string | null
  logoUrl: string | null
  deviceCount: number
}

interface ManufacturerExportDetail extends ManufacturerExportSummary {
  updatedAt: string | null
  deviceSlugs: string[]
}

interface HubExportSummary {
  id: number
  slug: string
  name: string
  manufacturer: ExportEntityRef | null
  protocolsSupported: string[]
  description: string | null
  deviceCount: number
  statusCounts: Record<string, number>
  protocolCounts: Partial<Record<ProtocolSlug, number>>
}

interface HubExportDetail extends HubExportSummary {
  updatedAt: string | null
  deviceSlugs: string[]
}

interface CategoryExportSummary {
  id: number
  slug: string
  name: string
  parentId: number | null
  parentSlug: string | null
  path: string
  pathSegments: string[]
  ancestors: ExportEntityRef[]
  children: ExportEntityRef[]
  directDeviceCount: number
  deviceCount: number
}

interface CategoryExportDetail extends CategoryExportSummary {
  updatedAt: string | null
  directDeviceSlugs: string[]
  deviceSlugs: string[]
}

interface ProtocolExportSummary {
  slug: ProtocolSlug
  name: string
  title: string
  description: string
  deviceCount: number
  localControlCount: number
  cloudDependentCount: number
  matterCertifiedCount: number
}

interface ProtocolExportDetail extends ProtocolExportSummary {
  updatedAt: string | null
  deviceSlugs: string[]
}

interface SiteExport {
  generated: string
  version: string
  stats: {
    devices: number
    hubs: number
    manufacturers: number
    categories: number
    protocols: number
  }
  protocolCounts: Partial<Record<ProtocolSlug, number>>
  featuredDeviceSlugs: string[]
  recentlyUpdatedDeviceSlugs: string[]
}

interface SitemapEntry {
  path: string
  type: SitemapPageType
  lastModified: string
}

interface ExportSnapshot {
  generated: string
  productSummaries: ProductExportSummary[]
  productSlugs: string[]
  productDetailKeys: Set<string>
  manufacturerSummaries: ManufacturerExportSummary[]
  manufacturerDetails: ManufacturerExportDetail[]
  manufacturerSlugs: string[]
  hubSummaries: HubExportSummary[]
  hubDetails: HubExportDetail[]
  hubSlugs: string[]
  categorySummaries: CategoryExportSummary[]
  categoryDetails: CategoryExportDetail[]
  categoryPaths: { slug: string; path: string; pathSegments: string[] }[]
  categoryDetailKeys: Set<string>
  protocolSummaries: ProtocolExportSummary[]
  protocolDetails: ProtocolExportDetail[]
  protocolSlugs: ProtocolSlug[]
  site: SiteExport
  sitemap: SitemapEntry[]
}

export interface ExportWriteResult {
  url: string
  count: number
}

export class ExportService {
  private storage: StorageDriver

  constructor(storage?: StorageDriver) {
    this.storage = storage ?? createStorageDriver(getStorageConfig())
  }

  async generateProductsExport(snapshot?: ExportSnapshot): Promise<ExportWriteResult> {
    logger.info('Starting products export generation')
    const resolvedSnapshot = snapshot ?? (await this.buildExportSnapshot(true))

    await this.deleteStaleJsonFiles('products', resolvedSnapshot.productDetailKeys, ['products/slugs.json'])

    await this.storage.write('products/slugs.json', {
      generated: resolvedSnapshot.generated,
      version: EXPORT_VERSION,
      count: resolvedSnapshot.productSlugs.length,
      slugs: resolvedSnapshot.productSlugs,
    })

    await this.storage.write('types.ts', this.buildTypesExportFile())

    const url = await this.storage.write('products.json', {
      generated: resolvedSnapshot.generated,
      version: EXPORT_VERSION,
      count: resolvedSnapshot.productSummaries.length,
      products: resolvedSnapshot.productSummaries,
    })

    logger.info(
      `Products export complete: ${resolvedSnapshot.productSummaries.length} products exported to ${url}`
    )

    return { url, count: resolvedSnapshot.productSummaries.length }
  }

  async generateManufacturersExport(snapshot?: ExportSnapshot): Promise<ExportWriteResult> {
    logger.info('Starting manufacturers export generation')
    const resolvedSnapshot = snapshot ?? (await this.buildExportSnapshot())
    const detailKeys = new Set(
      resolvedSnapshot.manufacturerSlugs.map((slug) => `manufacturers/${slug}.json`)
    )

    await this.deleteStaleJsonFiles('manufacturers', detailKeys, ['manufacturers/slugs.json'])

    for (const manufacturer of resolvedSnapshot.manufacturerDetails) {
      await this.storage.write(`manufacturers/${manufacturer.slug}.json`, {
        generated: resolvedSnapshot.generated,
        version: EXPORT_VERSION,
        manufacturer,
      })
    }

    await this.storage.write('manufacturers/slugs.json', {
      generated: resolvedSnapshot.generated,
      version: EXPORT_VERSION,
      count: resolvedSnapshot.manufacturerSlugs.length,
      slugs: resolvedSnapshot.manufacturerSlugs,
    })

    const url = await this.storage.write('manufacturers.json', {
      generated: resolvedSnapshot.generated,
      version: EXPORT_VERSION,
      count: resolvedSnapshot.manufacturerSummaries.length,
      manufacturers: resolvedSnapshot.manufacturerSummaries,
    })

    logger.info(
      `Manufacturers export complete: ${resolvedSnapshot.manufacturerSummaries.length} manufacturers exported to ${url}`
    )

    return { url, count: resolvedSnapshot.manufacturerSummaries.length }
  }

  async generateCategoriesExport(snapshot?: ExportSnapshot): Promise<ExportWriteResult> {
    logger.info('Starting categories export generation')
    const resolvedSnapshot = snapshot ?? (await this.buildExportSnapshot())

    await this.deleteStaleJsonFiles('categories', resolvedSnapshot.categoryDetailKeys, [
      'categories/paths.json',
    ])

    for (const category of resolvedSnapshot.categoryDetails) {
      await this.storage.write(`categories/${category.path}.json`, {
        generated: resolvedSnapshot.generated,
        version: EXPORT_VERSION,
        category,
      })
    }

    await this.storage.write('categories/paths.json', {
      generated: resolvedSnapshot.generated,
      version: EXPORT_VERSION,
      count: resolvedSnapshot.categoryPaths.length,
      categories: resolvedSnapshot.categoryPaths,
    })

    const url = await this.storage.write('categories.json', {
      generated: resolvedSnapshot.generated,
      version: EXPORT_VERSION,
      count: resolvedSnapshot.categorySummaries.length,
      categories: resolvedSnapshot.categorySummaries,
    })

    logger.info(
      `Categories export complete: ${resolvedSnapshot.categorySummaries.length} categories exported to ${url}`
    )

    return { url, count: resolvedSnapshot.categorySummaries.length }
  }

  async generateHubsExport(snapshot?: ExportSnapshot): Promise<ExportWriteResult> {
    logger.info('Starting hubs export generation')
    const resolvedSnapshot = snapshot ?? (await this.buildExportSnapshot())
    const detailKeys = new Set(resolvedSnapshot.hubSlugs.map((slug) => `hubs/${slug}.json`))

    await this.deleteStaleJsonFiles('hubs', detailKeys, ['hubs/slugs.json'])

    for (const hub of resolvedSnapshot.hubDetails) {
      await this.storage.write(`hubs/${hub.slug}.json`, {
        generated: resolvedSnapshot.generated,
        version: EXPORT_VERSION,
        hub,
      })
    }

    await this.storage.write('hubs/slugs.json', {
      generated: resolvedSnapshot.generated,
      version: EXPORT_VERSION,
      count: resolvedSnapshot.hubSlugs.length,
      slugs: resolvedSnapshot.hubSlugs,
    })

    const url = await this.storage.write('hubs.json', {
      generated: resolvedSnapshot.generated,
      version: EXPORT_VERSION,
      count: resolvedSnapshot.hubSummaries.length,
      hubs: resolvedSnapshot.hubSummaries,
    })

    logger.info(`Hubs export complete: ${resolvedSnapshot.hubSummaries.length} hubs exported to ${url}`)

    return { url, count: resolvedSnapshot.hubSummaries.length }
  }

  async generateProtocolsExport(snapshot?: ExportSnapshot): Promise<ExportWriteResult> {
    logger.info('Starting protocols export generation')
    const resolvedSnapshot = snapshot ?? (await this.buildExportSnapshot())
    const detailKeys = new Set(resolvedSnapshot.protocolSlugs.map((slug) => `protocols/${slug}.json`))

    await this.deleteStaleJsonFiles('protocols', detailKeys, ['protocols/slugs.json'])

    for (const protocol of resolvedSnapshot.protocolDetails) {
      await this.storage.write(`protocols/${protocol.slug}.json`, {
        generated: resolvedSnapshot.generated,
        version: EXPORT_VERSION,
        protocol,
      })
    }

    await this.storage.write('protocols/slugs.json', {
      generated: resolvedSnapshot.generated,
      version: EXPORT_VERSION,
      count: resolvedSnapshot.protocolSlugs.length,
      slugs: resolvedSnapshot.protocolSlugs,
    })

    const url = await this.storage.write('protocols.json', {
      generated: resolvedSnapshot.generated,
      version: EXPORT_VERSION,
      count: resolvedSnapshot.protocolSummaries.length,
      protocols: resolvedSnapshot.protocolSummaries,
    })

    logger.info(
      `Protocols export complete: ${resolvedSnapshot.protocolSummaries.length} protocols exported to ${url}`
    )

    return { url, count: resolvedSnapshot.protocolSummaries.length }
  }

  async generateSiteExport(snapshot?: ExportSnapshot): Promise<ExportWriteResult> {
    logger.info('Starting site export generation')
    const resolvedSnapshot = snapshot ?? (await this.buildExportSnapshot())
    const url = await this.storage.write('site.json', resolvedSnapshot.site)
    logger.info(`Site export complete: ${url}`)
    return { url, count: 1 }
  }

  async generateSitemapExport(snapshot?: ExportSnapshot): Promise<ExportWriteResult> {
    logger.info('Starting sitemap export generation')
    const resolvedSnapshot = snapshot ?? (await this.buildExportSnapshot())
    const url = await this.storage.write('sitemap.json', {
      generated: resolvedSnapshot.generated,
      version: EXPORT_VERSION,
      count: resolvedSnapshot.sitemap.length,
      urls: resolvedSnapshot.sitemap,
    })
    logger.info(`Sitemap export complete: ${url}`)
    return { url, count: resolvedSnapshot.sitemap.length }
  }

  async generateAllExports(): Promise<{
    products: ExportWriteResult
    manufacturers: ExportWriteResult
    categories: ExportWriteResult
    hubs: ExportWriteResult
    protocols: ExportWriteResult
    site: ExportWriteResult
    sitemap: ExportWriteResult
  }> {
    logger.info('Starting full export generation')
    const snapshot = await this.buildExportSnapshot(true)

    const [productsResult, manufacturersResult, categoriesResult, hubsResult, protocolsResult, siteResult, sitemapResult] =
      await Promise.all([
        this.generateProductsExport(snapshot),
        this.generateManufacturersExport(snapshot),
        this.generateCategoriesExport(snapshot),
        this.generateHubsExport(snapshot),
        this.generateProtocolsExport(snapshot),
        this.generateSiteExport(snapshot),
        this.generateSitemapExport(snapshot),
      ])

    await this.triggerDeployHook()

    logger.info('Full export generation complete')

    return {
      products: productsResult,
      manufacturers: manufacturersResult,
      categories: categoriesResult,
      hubs: hubsResult,
      protocols: protocolsResult,
      site: siteResult,
      sitemap: sitemapResult,
    }
  }

  async listExports(): Promise<string[]> {
    return this.storage.list()
  }

  private async buildExportSnapshot(writeProductDetails = false): Promise<ExportSnapshot> {
    const generated = new Date().toISOString()

    const manufacturers = (await db.query.manufacturers.findMany({
      orderBy: (manufacturers, { asc }) => [asc(manufacturers.name)],
    })) as ManufacturerRecord[]

    const hubs = (await db.query.hubs.findMany({
      with: {
        manufacturer: true,
      },
      orderBy: (hubs, { asc }) => [asc(hubs.name)],
    })) as {
      id: number
      slug: string
      name: string
      manufacturer: ExportEntityRef | null
      protocolsSupported: string[] | null
      description: string | null
    }[]

    const categories = (await db.query.categories.findMany({
      orderBy: (categories, { asc }) => [asc(categories.sortOrder), asc(categories.name)],
    })) as CategoryRecord[]

    const categoryMetadataById = this.buildCategoryMetadata(categories)
    const manufacturerAggregates = new Map<string, ManufacturerAggregate>(
      manufacturers.map((manufacturer) => [
        manufacturer.slug,
        {
          ...manufacturer,
          deviceSlugs: [],
          latestUpdatedAt: null,
        },
      ])
    )
    const hubAggregates = new Map<string, HubAggregate>(
      hubs.map((hub) => [
        hub.slug,
        {
          id: hub.id,
          slug: hub.slug,
          name: hub.name,
          manufacturer: this.toExportEntityRef(hub.manufacturer),
          protocolsSupported: hub.protocolsSupported ?? [],
          description: hub.description,
          deviceSlugs: [],
          latestUpdatedAt: null,
          statusCounts: {},
          protocolCounts: {},
        },
      ])
    )
    const categoryAggregates = new Map<string, CategoryAggregate>(
      Array.from(categoryMetadataById.values()).map((category) => [
        category.path,
        {
          ...category,
          directDeviceSlugs: [],
          deviceSlugs: [],
          latestUpdatedAt: null,
        },
      ])
    )
    const protocolAggregates = new Map<ProtocolSlug, ProtocolAggregate>(
      PROTOCOL_DEFINITIONS.map((protocol) => [
        protocol.slug,
        {
          ...protocol,
          deviceSlugs: [],
          latestUpdatedAt: null,
          localControlCount: 0,
          cloudDependentCount: 0,
          matterCertifiedCount: 0,
        },
      ])
    )

    const productSummaries: ProductExportSummary[] = []
    const productSlugs: string[] = []
    const productDetailKeys = new Set<string>()
    const productNameBySlug = new Map<string, string>()
    const recentProducts: RecentProductRecord[] = []
    let lastProductId = 0

    while (true) {
      /* eslint-disable @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access */
      const batch = (await db.query.products.findMany({
        where: and(eq(products.status, 'published'), gt(products.id, lastProductId)),
        with: {
          manufacturer: true,
          category: true,
          zigbeeDetails: true,
          zwaveDetails: true,
          compatibility: {
            with: {
              hub: true,
            },
          },
        },
        orderBy: (products, { asc }) => [asc(products.id)],
        limit: PRODUCT_EXPORT_BATCH_SIZE,
      })) as PublishedProductRecord[]
      /* eslint-enable @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access */

      if (batch.length === 0) {
        break
      }

      for (const product of batch) {
        const categoryMetadata = product.category
          ? categoryMetadataById.get(product.category.id) ?? null
          : null
        const compatibilitySummary = this.buildCompatibilitySummary(product.compatibility)
        const summary = this.toProductSummary(product, categoryMetadata, compatibilitySummary)
        const detail = this.toProductDetail(product, summary)
        const detailKey = `products/${product.slug}.json`
        const updatedAt = new Date(product.updatedAt)

        productSummaries.push(summary)
        productSlugs.push(product.slug)
        productNameBySlug.set(product.slug, product.name)
        productDetailKeys.add(detailKey)
        recentProducts.push({ slug: product.slug, updatedAt })

        if (writeProductDetails) {
          await this.storage.write(detailKey, {
            generated,
            version: EXPORT_VERSION,
            product: detail,
          })
        }

        if (product.manufacturer) {
          const manufacturer = manufacturerAggregates.get(product.manufacturer.slug)
          if (manufacturer) {
            manufacturer.deviceSlugs.push(product.slug)
            manufacturer.latestUpdatedAt = this.maxDate(manufacturer.latestUpdatedAt, updatedAt)
          }
        }

        if (categoryMetadata) {
          this.assignProductToCategory(categoryMetadata.path, product.slug, updatedAt, categoryAggregates)

          for (const ancestor of categoryMetadata.ancestors) {
            const ancestorMetadata = categoryMetadataById.get(ancestor.id)
            if (ancestorMetadata) {
              this.assignProductToCategory(
                ancestorMetadata.path,
                product.slug,
                updatedAt,
                categoryAggregates,
                false
              )
            }
          }
        }

        if (this.isProtocolSlug(product.primaryProtocol)) {
          const protocol = protocolAggregates.get(product.primaryProtocol)
          if (protocol) {
            protocol.deviceSlugs.push(product.slug)
            protocol.latestUpdatedAt = this.maxDate(protocol.latestUpdatedAt, updatedAt)
            if (product.localControl) {
              protocol.localControlCount += 1
            }
            if (product.cloudDependent) {
              protocol.cloudDependentCount += 1
            }
            if (product.matterCertified) {
              protocol.matterCertifiedCount += 1
            }
          }
        }

        for (const [hubSlug, hubStatus] of compatibilitySummary.byHub.entries()) {
          const hub = hubAggregates.get(hubSlug)
          if (!hub) {
            continue
          }

          if (!hub.deviceSlugs.includes(product.slug)) {
            hub.deviceSlugs.push(product.slug)
          }

          hub.latestUpdatedAt = this.maxDate(hub.latestUpdatedAt, updatedAt)
          hub.statusCounts[hubStatus] = (hub.statusCounts[hubStatus] ?? 0) + 1

          if (this.isProtocolSlug(product.primaryProtocol)) {
            hub.protocolCounts[product.primaryProtocol] =
              (hub.protocolCounts[product.primaryProtocol] ?? 0) + 1
          }
        }
      }

      lastProductId = batch[batch.length - 1].id
      logger.info(
        `Prepared ${productSummaries.length} product exports so far (last product id: ${lastProductId})`
      )
    }

    const sortSlugsByName = (slugs: string[]) =>
      Array.from(new Set(slugs)).sort((left, right) =>
        (productNameBySlug.get(left) ?? left).localeCompare(productNameBySlug.get(right) ?? right)
      )

    productSummaries.sort((left, right) => left.name.localeCompare(right.name))
    productSlugs.sort((left, right) => left.localeCompare(right))
    recentProducts.sort((left, right) => right.updatedAt.getTime() - left.updatedAt.getTime())

    const manufacturerDetails = Array.from(manufacturerAggregates.values())
      .map<ManufacturerExportDetail>((manufacturer) => ({
        id: manufacturer.id,
        slug: manufacturer.slug,
        name: manufacturer.name,
        website: manufacturer.website,
        logoUrl: manufacturer.logoUrl,
        deviceCount: manufacturer.deviceSlugs.length,
        updatedAt: manufacturer.latestUpdatedAt?.toISOString() ?? null,
        deviceSlugs: sortSlugsByName(manufacturer.deviceSlugs),
      }))
      .filter((manufacturer) => manufacturer.deviceCount > 0)
      .sort((left, right) => left.name.localeCompare(right.name))

    const manufacturerSummaries: ManufacturerExportSummary[] = manufacturerDetails.map(
      ({ updatedAt: _updatedAt, deviceSlugs: _deviceSlugs, ...manufacturer }) => manufacturer
    )
    const manufacturerSlugs = manufacturerDetails.map((manufacturer) => manufacturer.slug)

    const hubDetails = Array.from(hubAggregates.values())
      .map<HubExportDetail>((hub) => ({
        id: hub.id,
        slug: hub.slug,
        name: hub.name,
        manufacturer: hub.manufacturer,
        protocolsSupported: hub.protocolsSupported ?? [],
        description: hub.description,
        deviceCount: hub.deviceSlugs.length,
        statusCounts: this.sortRecord(hub.statusCounts),
        protocolCounts: this.sortRecord(hub.protocolCounts),
        updatedAt: hub.latestUpdatedAt?.toISOString() ?? null,
        deviceSlugs: sortSlugsByName(hub.deviceSlugs),
      }))
      .filter((hub) => hub.deviceCount > 0)
      .sort((left, right) => left.name.localeCompare(right.name))

    const hubSummaries: HubExportSummary[] = hubDetails.map(
      ({ updatedAt: _updatedAt, deviceSlugs: _deviceSlugs, ...hub }) => hub
    )
    const hubSlugs = hubDetails.map((hub) => hub.slug)

    const categoryDetails = Array.from(categoryAggregates.values())
      .map<CategoryExportDetail>((category) => ({
        id: category.id,
        slug: category.slug,
        name: category.name,
        parentId: category.parentId,
        parentSlug: category.parentSlug,
        path: category.path,
        pathSegments: category.pathSegments,
        ancestors: category.ancestors,
        children: category.children,
        directDeviceCount: category.directDeviceSlugs.length,
        deviceCount: category.deviceSlugs.length,
        updatedAt: category.latestUpdatedAt?.toISOString() ?? null,
        directDeviceSlugs: sortSlugsByName(category.directDeviceSlugs),
        deviceSlugs: sortSlugsByName(category.deviceSlugs),
      }))
      .filter((category) => category.deviceCount > 0)
      .sort((left, right) => left.path.localeCompare(right.path))

    const categorySummaries: CategoryExportSummary[] = categoryDetails.map(
      ({ updatedAt: _updatedAt, directDeviceSlugs: _directDeviceSlugs, deviceSlugs: _deviceSlugs, ...category }) =>
        category
    )
    const categoryPaths = categoryDetails.map((category) => ({
      slug: category.slug,
      path: category.path,
      pathSegments: category.pathSegments,
    }))
    const categoryDetailKeys = new Set(categoryDetails.map((category) => `categories/${category.path}.json`))

    const protocolDetails = Array.from(protocolAggregates.values())
      .map<ProtocolExportDetail>((protocol) => ({
        slug: protocol.slug,
        name: protocol.name,
        title: protocol.title,
        description: protocol.description,
        deviceCount: protocol.deviceSlugs.length,
        localControlCount: protocol.localControlCount,
        cloudDependentCount: protocol.cloudDependentCount,
        matterCertifiedCount: protocol.matterCertifiedCount,
        updatedAt: protocol.latestUpdatedAt?.toISOString() ?? null,
        deviceSlugs: sortSlugsByName(protocol.deviceSlugs),
      }))

    const protocolSummaries: ProtocolExportSummary[] = protocolDetails.map(
      ({ updatedAt: _updatedAt, deviceSlugs: _deviceSlugs, ...protocol }) => protocol
    )
    const protocolSlugs = protocolDetails.map((protocol) => protocol.slug)
    const protocolCounts = this.sortRecord(
      Object.fromEntries(protocolDetails.map((protocol) => [protocol.slug, protocol.deviceCount]))
    ) as Partial<Record<ProtocolSlug, number>>

    const featuredDeviceSlugs = recentProducts.slice(0, FEATURED_DEVICE_COUNT).map((item) => item.slug)
    const recentlyUpdatedDeviceSlugs = recentProducts
      .slice(0, RECENT_DEVICE_COUNT)
      .map((item) => item.slug)

    const site: SiteExport = {
      generated,
      version: EXPORT_VERSION,
      stats: {
        devices: productSummaries.length,
        hubs: hubSummaries.length,
        manufacturers: manufacturerSummaries.length,
        categories: categorySummaries.length,
        protocols: protocolSummaries.length,
      },
      protocolCounts,
      featuredDeviceSlugs,
      recentlyUpdatedDeviceSlugs,
    }

    const sitemap: SitemapEntry[] = [
      { path: '/', type: 'static' as const, lastModified: generated },
      { path: '/about', type: 'static' as const, lastModified: generated },
      { path: '/devices', type: 'static' as const, lastModified: generated },
      { path: '/hubs', type: 'static' as const, lastModified: generated },
      { path: '/manufacturers', type: 'static' as const, lastModified: generated },
      { path: '/categories', type: 'static' as const, lastModified: generated },
      { path: '/protocols', type: 'static' as const, lastModified: generated },
      ...productSummaries.map((product) => ({
        path: `/devices/${product.slug}`,
        type: 'device' as const,
        lastModified: product.updatedAt,
      })),
      ...manufacturerDetails.map((manufacturer) => ({
        path: `/manufacturers/${manufacturer.slug}`,
        type: 'manufacturer' as const,
        lastModified: manufacturer.updatedAt ?? generated,
      })),
      ...hubDetails.map((hub) => ({
        path: `/hubs/${hub.slug}`,
        type: 'hub' as const,
        lastModified: hub.updatedAt ?? generated,
      })),
      ...categoryDetails.map((category) => ({
        path: `/categories/${category.path}`,
        type: 'category' as const,
        lastModified: category.updatedAt ?? generated,
      })),
      ...protocolDetails.map((protocol) => ({
        path: `/protocols/${protocol.slug}`,
        type: 'protocol' as const,
        lastModified: protocol.updatedAt ?? generated,
      })),
    ].sort((left, right) => left.path.localeCompare(right.path))
    return {
      generated,
      productSummaries,
      productSlugs,
      productDetailKeys,
      manufacturerSummaries,
      manufacturerDetails,
      manufacturerSlugs,
      hubSummaries,
      hubDetails,
      hubSlugs,
      categorySummaries,
      categoryDetails,
      categoryPaths,
      categoryDetailKeys,
      protocolSummaries,
      protocolDetails,
      protocolSlugs,
      site,
      sitemap,
    }
  }

  private async triggerDeployHook(): Promise<void> {
    const deployHook = process.env.CLOUDFLARE_DEPLOY_HOOK

    if (!deployHook) {
      logger.debug('No CLOUDFLARE_DEPLOY_HOOK configured, skipping')
      return
    }

    try {
      logger.info('Triggering Cloudflare Pages rebuild')
      const response = await fetch(deployHook, { method: 'POST' })

      if (response.ok) {
        logger.info('Cloudflare rebuild triggered successfully')
      } else {
        logger.warn(`Cloudflare rebuild failed: ${response.status} ${response.statusText}`)
      }
    } catch (error) {
      logger.error({ error }, 'Failed to trigger Cloudflare rebuild')
    }
  }

  private buildCategoryMetadata(categories: CategoryRecord[]): Map<number, CategoryMetadata> {
    const categoryById = new Map(categories.map((category) => [category.id, category]))
    const childrenByParentId = new Map<number | null, CategoryRecord[]>()

    for (const category of categories) {
      const siblings = childrenByParentId.get(category.parentId) ?? []
      siblings.push(category)
      childrenByParentId.set(category.parentId, siblings)
    }

    const metadataById = new Map<number, CategoryMetadata>()

    const buildMetadata = (category: CategoryRecord): CategoryMetadata => {
      const existing = metadataById.get(category.id)
      if (existing) {
        return existing
      }

      const parent = category.parentId ? categoryById.get(category.parentId) ?? null : null
      const parentMetadata = parent ? buildMetadata(parent) : null
      const pathSegments = parentMetadata
        ? [...parentMetadata.pathSegments, category.slug]
        : [category.slug]
      const path = pathSegments.join('/')
      const children = (childrenByParentId.get(category.id) ?? [])
        .slice()
        .sort((left, right) =>
          left.sortOrder === right.sortOrder
            ? left.name.localeCompare(right.name)
            : left.sortOrder - right.sortOrder
        )
        .map((child) => ({
          id: child.id,
          slug: child.slug,
          name: child.name,
        }))

      const metadata: CategoryMetadata = {
        id: category.id,
        slug: category.slug,
        name: category.name,
        parentId: category.parentId,
        parentSlug: parent?.slug ?? null,
        path,
        pathSegments,
        ancestors: parentMetadata
          ? [...parentMetadata.ancestors, { id: parentMetadata.id, slug: parentMetadata.slug, name: parentMetadata.name }]
          : [],
        children,
        sortOrder: category.sortOrder,
      }

      metadataById.set(category.id, metadata)
      return metadata
    }

    for (const category of categories) {
      buildMetadata(category)
    }

    return metadataById
  }

  private assignProductToCategory(
    categoryPath: string,
    productSlug: string,
    updatedAt: Date,
    categoryAggregates: Map<string, CategoryAggregate>,
    isDirect = true
  ): void {
    const category = categoryAggregates.get(categoryPath)
    if (!category) {
      return
    }

    if (!category.deviceSlugs.includes(productSlug)) {
      category.deviceSlugs.push(productSlug)
    }

    if (isDirect && !category.directDeviceSlugs.includes(productSlug)) {
      category.directDeviceSlugs.push(productSlug)
    }

    category.latestUpdatedAt = this.maxDate(category.latestUpdatedAt, updatedAt)
  }

  private buildCompatibilitySummary(records: ProductCompatibilityRecord[]): {
    compatibleHubSlugs: string[]
    compatibilityStatuses: string[]
    byHub: Map<string, string>
  } {
    const byHub = new Map<string, string>()

    for (const record of records) {
      if (!record.hub) {
        continue
      }

      const previous = byHub.get(record.hub.slug)
      if (!previous || this.statusRank(record.status) > this.statusRank(previous)) {
        byHub.set(record.hub.slug, record.status)
      }
    }

    return {
      compatibleHubSlugs: Array.from(byHub.keys()).sort((left, right) => left.localeCompare(right)),
      compatibilityStatuses: Array.from(new Set(byHub.values())).sort((left, right) =>
        left.localeCompare(right)
      ),
      byHub,
    }
  }

  private toProductSummary(
    product: PublishedProductRecord,
    category: CategoryMetadata | null,
    compatibilitySummary: {
      compatibleHubSlugs: string[]
      compatibilityStatuses: string[]
    }
  ): ProductExportSummary {
    const searchText = this.buildSearchText([
      product.name,
      product.model,
      product.manufacturer?.name ?? null,
      category?.name ?? null,
      ...(category?.ancestors.map((ancestor) => ancestor.name) ?? []),
      product.primaryProtocol,
      ...compatibilitySummary.compatibleHubSlugs,
    ])

    return {
      id: product.id,
      slug: product.slug,
      name: product.name,
      manufacturer: this.toExportEntityRef(product.manufacturer),
      model: product.model,
      category: this.toExportEntityRef(product.category),
      categoryPath: category?.pathSegments ?? [],
      primaryProtocol: product.primaryProtocol,
      localControl: product.localControl,
      cloudDependent: product.cloudDependent,
      requiresHub: product.requiresHub,
      matterCertified: product.matterCertified,
      imageUrl: product.imageUrl,
      compatibleHubSlugs: compatibilitySummary.compatibleHubSlugs,
      compatibilityStatuses: compatibilitySummary.compatibilityStatuses,
      updatedAt: product.updatedAt.toISOString(),
      searchText,
    }
  }

  private toProductDetail(product: PublishedProductRecord, summary: ProductExportSummary): ProductExport {
    return {
      ...summary,
      description: product.description,
      ...(product.zigbeeDetails && {
        zigbeeDetails: {
          ieeeManufacturer: product.zigbeeDetails.ieeeManufacturer,
          modelId: product.zigbeeDetails.modelId,
          endpoints: product.zigbeeDetails.endpoints,
          exposes: product.zigbeeDetails.exposes,
        },
      }),
      ...(product.zwaveDetails && {
        zwaveDetails: {
          zwaveManufacturerId: product.zwaveDetails.zwaveManufacturerId,
          productType: product.zwaveDetails.productType,
          productIdHex: product.zwaveDetails.productIdHex,
          frequency: product.zwaveDetails.frequency,
        },
      }),
      compatibility: product.compatibility
        .filter((compatibility) => compatibility.hub)
        .map((compatibility) => ({
          hub: {
            id: compatibility.hub!.id,
            slug: compatibility.hub!.slug,
            name: compatibility.hub!.name,
          },
          integrationName: compatibility.integrationName,
          status: compatibility.status,
        })),
    }
  }

  private async deleteStaleJsonFiles(
    prefix: string,
    activeKeys: Set<string>,
    preserveKeys: string[] = []
  ): Promise<void> {
    const existingFiles = await this.storage.list(prefix)
    const staleFiles = existingFiles.filter(
      (file) =>
        file.endsWith('.json') && !preserveKeys.includes(file) && !activeKeys.has(file)
    )

    if (staleFiles.length === 0) {
      return
    }

    logger.info(`Deleting ${staleFiles.length} stale export files under ${prefix}`)
    await Promise.all(staleFiles.map((file) => this.storage.delete(file)))
  }

  private buildSearchText(parts: (string | null | undefined)[]): string {
    return Array.from(
      new Set(
        parts
          .filter((part): part is string => Boolean(part?.trim()))
          .map((part) => part.trim().toLowerCase())
      )
    ).join(' ')
  }

  private maxDate(left: Date | null, right: Date): Date {
    if (!left) {
      return right
    }

    return left.getTime() > right.getTime() ? left : right
  }

  private statusRank(status: string): number {
    switch (status) {
      case 'verified':
        return 4
      case 'reported':
        return 3
      case 'untested':
        return 2
      case 'incompatible':
        return 1
      default:
        return 0
    }
  }

  private isProtocolSlug(value: string | null): value is ProtocolSlug {
    return PROTOCOL_DEFINITIONS.some((protocol) => protocol.slug === value)
  }

  private sortRecord<T extends string>(
    record: Partial<Record<T, number>> | Record<string, number>
  ): Record<string, number> {
    return Object.fromEntries(
      Object.entries(record).sort(([left], [right]) => left.localeCompare(right))
    )
  }

  private toExportEntityRef(entity: EntityWithIdentity | null | undefined): ExportEntityRef | null {
    if (!entity) {
      return null
    }

    return {
      id: entity.id,
      slug: entity.slug,
      name: entity.name,
    }
  }

  private buildTypesExportFile(): string {
    return `export type ProtocolSlug = 'zigbee' | 'zwave' | 'matter' | 'wifi' | 'thread' | 'bluetooth'
export type SitemapPageType = 'static' | 'device' | 'hub' | 'manufacturer' | 'category' | 'protocol'

export interface ExportEntityRef {
  id: number
  slug: string
  name: string
}

export interface ProductExportSummary {
  id: number
  slug: string
  name: string
  manufacturer: ExportEntityRef | null
  model: string | null
  category: ExportEntityRef | null
  categoryPath: string[]
  primaryProtocol: string | null
  localControl: boolean | null
  cloudDependent: boolean | null
  requiresHub: boolean | null
  matterCertified: boolean | null
  imageUrl: string | null
  compatibleHubSlugs: string[]
  compatibilityStatuses: string[]
  updatedAt: string
  searchText: string
}

export interface ProductExport extends ProductExportSummary {
  description: string | null
  zigbeeDetails?: {
    ieeeManufacturer: string | null
    modelId: string | null
    endpoints: unknown
    exposes: unknown
  }
  zwaveDetails?: {
    zwaveManufacturerId: string | null
    productType: string | null
    productIdHex: string | null
    frequency: string | null
  }
  compatibility: {
    hub: ExportEntityRef
    integrationName: string | null
    status: string
  }[]
}

export interface ProductsIndexResponse {
  generated: string
  version: string
  count: number
  products: ProductExportSummary[]
}

export interface ProductSlugsResponse {
  generated: string
  version: string
  count: number
  slugs: string[]
}

export interface ProductDetailResponse {
  generated: string
  version: string
  product: ProductExport
}

export interface ManufacturerExportSummary {
  id: number
  slug: string
  name: string
  website: string | null
  logoUrl: string | null
  deviceCount: number
}

export interface ManufacturerExportDetail extends ManufacturerExportSummary {
  updatedAt: string | null
  deviceSlugs: string[]
}

export interface ManufacturersResponse {
  generated: string
  version: string
  count: number
  manufacturers: ManufacturerExportSummary[]
}

export interface ManufacturerSlugsResponse {
  generated: string
  version: string
  count: number
  slugs: string[]
}

export interface ManufacturerDetailResponse {
  generated: string
  version: string
  manufacturer: ManufacturerExportDetail
}

export interface HubExportSummary {
  id: number
  slug: string
  name: string
  manufacturer: ExportEntityRef | null
  protocolsSupported: string[]
  description: string | null
  deviceCount: number
  statusCounts: Record<string, number>
  protocolCounts: Partial<Record<ProtocolSlug, number>>
}

export interface HubExportDetail extends HubExportSummary {
  updatedAt: string | null
  deviceSlugs: string[]
}

export interface HubsResponse {
  generated: string
  version: string
  count: number
  hubs: HubExportSummary[]
}

export interface HubSlugsResponse {
  generated: string
  version: string
  count: number
  slugs: string[]
}

export interface HubDetailResponse {
  generated: string
  version: string
  hub: HubExportDetail
}

export interface CategoryExportSummary {
  id: number
  slug: string
  name: string
  parentId: number | null
  parentSlug: string | null
  path: string
  pathSegments: string[]
  ancestors: ExportEntityRef[]
  children: ExportEntityRef[]
  directDeviceCount: number
  deviceCount: number
}

export interface CategoryExportDetail extends CategoryExportSummary {
  updatedAt: string | null
  directDeviceSlugs: string[]
  deviceSlugs: string[]
}

export interface CategoriesResponse {
  generated: string
  version: string
  count: number
  categories: CategoryExportSummary[]
}

export interface CategoryPathsResponse {
  generated: string
  version: string
  count: number
  categories: Array<{
    slug: string
    path: string
    pathSegments: string[]
  }>
}

export interface CategoryDetailResponse {
  generated: string
  version: string
  category: CategoryExportDetail
}

export interface ProtocolExportSummary {
  slug: ProtocolSlug
  name: string
  title: string
  description: string
  deviceCount: number
  localControlCount: number
  cloudDependentCount: number
  matterCertifiedCount: number
}

export interface ProtocolExportDetail extends ProtocolExportSummary {
  updatedAt: string | null
  deviceSlugs: string[]
}

export interface ProtocolsResponse {
  generated: string
  version: string
  count: number
  protocols: ProtocolExportSummary[]
}

export interface ProtocolSlugsResponse {
  generated: string
  version: string
  count: number
  slugs: ProtocolSlug[]
}

export interface ProtocolDetailResponse {
  generated: string
  version: string
  protocol: ProtocolExportDetail
}

export interface SiteResponse {
  generated: string
  version: string
  stats: {
    devices: number
    hubs: number
    manufacturers: number
    categories: number
    protocols: number
  }
  protocolCounts: Partial<Record<ProtocolSlug, number>>
  featuredDeviceSlugs: string[]
  recentlyUpdatedDeviceSlugs: string[]
}

export interface SitemapEntry {
  path: string
  type: SitemapPageType
  lastModified: string
}

export interface SitemapResponse {
  generated: string
  version: string
  count: number
  urls: SitemapEntry[]
}
`
  }
}

export const exportService = new ExportService()
