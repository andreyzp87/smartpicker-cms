import { and, eq, gt, inArray } from 'drizzle-orm'
import { db } from '../db/client'
import {
  commercialHubs,
  integrations,
  platforms,
  productHubCompatibility,
  productIntegrationCompatibility,
  products,
} from '../db/schema'
import { logger } from '../lib/logger'
import { createStorageDriver, getStorageConfig } from '../storage'
import type { StorageDriver } from '../storage'

const EXPORT_VERSION = '4.0'
const PRODUCT_EXPORT_BATCH_SIZE = 250
const FEATURED_DEVICE_COUNT = 12
const RECENT_DEVICE_COUNT = 24
const FEATURED_ENTITY_COUNT = 12
const LIMITED_EXPORT_MAX_MANUFACTURERS = 20
const LIMITED_EXPORT_MAX_DEVICES_PER_COMBO = 10
const UNCATEGORIZED_LIMITED_GROUP = '__uncategorized__'
const UNKNOWN_PROTOCOL_LIMITED_GROUP = '__unknown_protocol__'

const POSITIVE_COMPATIBILITY_STATUSES = new Set(['verified', 'supported', 'reported'])

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
  | 'integration'
  | 'platform'
  | 'hub'
  | 'manufacturer'
  | 'category'
  | 'protocol'
type SearchEntityType = 'device' | 'integration' | 'platform' | 'hub' | 'manufacturer'
type ExportMode = 'full' | 'limited'

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

interface ProductQueryRecord {
  id: number
  slug: string
  name: string
  manufacturer: ExportEntityRef | null
  model: string | null
  category: ExportEntityRef | null
  primaryProtocol: string | null
  productRole: 'endpoint' | 'infrastructure'
  localControl: boolean | null
  cloudDependent: boolean | null
  requiresHub: boolean | null
  matterCertified: boolean | null
  imageUrl: string | null
  description: string | null
  status: 'draft' | 'published' | 'archived'
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
  integrationCompatibilities: ProductIntegrationQueryRecord[]
  hubCompatibilities: ProductHubQueryRecord[]
}

interface ProductIntegrationQueryRecord {
  id: number
  integrationId: number
  status: string
  reviewState: string
  supportSummary: string | null
  internalNotes: string | null
  canonicalSource: string
  firstSeenAt: Date | null
  lastConfirmedAt: Date | null
  updatedAt: Date
  integration: ProductIntegrationTargetRecord
}

interface ProductHubQueryRecord {
  id: number
  hubId: number
  status: string
  reviewState: string
  supportSummary: string | null
  internalNotes: string | null
  canonicalSource: string
  firstSeenAt: Date | null
  lastConfirmedAt: Date | null
  updatedAt: Date
  hub: ProductHubTargetRecord
}

interface PublishedIntegrationRecord {
  id: number
  slug: string
  name: string
  integrationKind: string
  primaryProtocol: string | null
  website: string | null
  description: string | null
  status: 'draft' | 'published' | 'archived'
  updatedAt: Date
  manufacturer: ExportEntityRef | null
  platformIntegrations: IntegrationPlatformLinkRecord[]
  hardwareSupport: {
    requirementType: string
    notes: string | null
    product: InfrastructureProductRecord
  }[]
}

interface PublishedPlatformRecord {
  id: number
  slug: string
  name: string
  kind: string
  website: string | null
  description: string | null
  status: 'draft' | 'published' | 'archived'
  updatedAt: Date
  manufacturer: ExportEntityRef | null
  platformIntegrations: PlatformIntegrationLinkRecord[]
}

interface PublishedHubRecord {
  id: number
  slug: string
  name: string
  website: string | null
  description: string | null
  status: 'draft' | 'published' | 'archived'
  updatedAt: Date
  manufacturer: ExportEntityRef | null
}

interface IntegrationPlatformLinkRecord {
  supportType: string
  notes: string | null
  platform: {
    id: number
    slug: string
    name: string
    kind: string
    status: 'draft' | 'published' | 'archived'
    manufacturer: ExportEntityRef | null
  }
}

interface PlatformIntegrationLinkRecord {
  supportType: string
  notes: string | null
  integration: {
    id: number
    slug: string
    name: string
    status: 'draft' | 'published' | 'archived'
    manufacturer: ExportEntityRef | null
  }
}

interface ProductIntegrationTargetRecord {
  id: number
  slug: string
  name: string
  manufacturer: ExportEntityRef | null
}

interface ProductHubTargetRecord {
  id: number
  slug: string
  name: string
  manufacturer: ExportEntityRef | null
}

interface InfrastructureProductRecord {
  id: number
  slug: string
  name: string
  productRole: 'endpoint' | 'infrastructure'
  status: 'draft' | 'published' | 'archived'
  manufacturer: ExportEntityRef | null
  category: ExportEntityRef | null
}

interface InternalProductCompatibilityIntegrationEntry
  extends ProductCompatibilityIntegrationEntry {
  platformRefs: ExportEntityRef[]
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

interface LimitedExportCandidate {
  id: number
  name: string
  manufacturer: Pick<ExportEntityRef, 'slug' | 'name'> | null
  categoryId: number | null
  primaryProtocol: string | null
  updatedAt: Date
  compatibilityReferenceCount: number
}

interface LimitedExportSelection {
  manufacturerSlugs: Set<string>
  productIds: number[]
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
  compatibleIntegrationSlugs: string[]
  compatiblePlatformSlugs: string[]
  compatibleHubSlugs: string[]
  compatibilityStatuses: string[]
  updatedAt: string
  searchText: string
}

export interface ProductCompatibilityIntegrationEntry {
  integration: ExportEntityRef
  manufacturer: ExportEntityRef | null
  platformSlugs: string[]
  status: string
  reviewState: string
  supportSummary: string | null
  canonicalSource: string
  lastConfirmedAt: string | null
}

export interface ProductCompatibilityPlatformEntry {
  platform: ExportEntityRef
  kind: string
  status: string
  viaIntegrations: ExportEntityRef[]
}

export interface ProductCompatibilityHubEntry {
  hub: ExportEntityRef
  manufacturer: ExportEntityRef | null
  status: string
  reviewState: string
  supportSummary: string | null
  canonicalSource: string
  lastConfirmedAt: string | null
}

export interface InfrastructureHint {
  product: ExportEntityRef
  manufacturer: ExportEntityRef | null
  category: ExportEntityRef | null
  requirementType: string
  viaIntegrations: ExportEntityRef[]
  note: string | null
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
  integrationCompatibility: ProductCompatibilityIntegrationEntry[]
  platformCompatibility: ProductCompatibilityPlatformEntry[]
  hubCompatibility: ProductCompatibilityHubEntry[]
  infrastructureHints: InfrastructureHint[]
}

interface ManufacturerExportSummary {
  id: number
  slug: string
  name: string
  website: string | null
  logoUrl: string | null
  deviceCount: number
  compatibilityCounts: {
    integrations: number
    platforms: number
    hubs: number
  }
}

interface ManufacturerExportDetail extends ManufacturerExportSummary {
  updatedAt: string | null
  deviceSlugs: string[]
  integrationSlugs: string[]
  platformSlugs: string[]
  hubSlugs: string[]
}

interface IntegrationExportSummary {
  id: number
  slug: string
  name: string
  manufacturer: ExportEntityRef | null
  primaryProtocol: string | null
  integrationKind: string
  platformSlugs: string[]
  compatibleDeviceCount: number
  statusBreakdown: Record<string, number>
  searchText: string
  updatedAt: string
}

interface IntegrationHardwareHint {
  product: ExportEntityRef
  manufacturer: ExportEntityRef | null
  category: ExportEntityRef | null
  requirementType: string
  note: string | null
}

interface IntegrationExportDetail extends IntegrationExportSummary {
  website: string | null
  description: string | null
  platforms: ExportEntityRef[]
  compatibleDeviceSlugs: string[]
  hardwareHints: IntegrationHardwareHint[]
}

interface PlatformExportSummary {
  id: number
  slug: string
  name: string
  manufacturer: ExportEntityRef | null
  kind: string
  integrationSlugs: string[]
  compatibleDeviceCountDerived: number
  searchText: string
  updatedAt: string
}

interface PlatformExportDetail extends PlatformExportSummary {
  website: string | null
  description: string | null
  integrations: ExportEntityRef[]
  compatibleDeviceSlugs: string[]
  statusBreakdown: Record<string, number>
}

interface HubExportSummary {
  id: number
  slug: string
  name: string
  manufacturer: ExportEntityRef | null
  compatibleDeviceCount: number
  statusBreakdown: Record<string, number>
  searchText: string
  updatedAt: string
}

interface HubExportDetail extends HubExportSummary {
  website: string | null
  description: string | null
  compatibleDeviceSlugs: string[]
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
  integrationCount: number
  platformCount: number
  hubCount: number
}

interface ProtocolExportDetail extends ProtocolExportSummary {
  updatedAt: string | null
  deviceSlugs: string[]
  integrationSlugs: string[]
  platformSlugs: string[]
  hubSlugs: string[]
}

interface SearchExportItem {
  type: SearchEntityType
  slug: string
  title: string
  subtitle: string | null
  url: string
  searchText: string
}

interface CatalogFacetValue {
  slug: string
  name: string
  count: number
}

interface CatalogCategoryFacetValue {
  slug: string
  path: string
  name: string
  count: number
}

interface CatalogFeatureFacetValue {
  slug: 'local-control' | 'cloud-dependent' | 'requires-hub' | 'matter-certified'
  name: string
  count: number
}

interface CatalogExport {
  generated: string
  version: string
  count: number
  products: ProductExportSummary[]
  facets: {
    protocols: CatalogFacetValue[]
    manufacturers: CatalogFacetValue[]
    categories: CatalogCategoryFacetValue[]
    integrations: CatalogFacetValue[]
    platforms: CatalogFacetValue[]
    hubs: CatalogFacetValue[]
    features: CatalogFeatureFacetValue[]
  }
}

interface SearchExport {
  generated: string
  version: string
  count: number
  items: SearchExportItem[]
}

interface SiteExport {
  generated: string
  version: string
  stats: {
    devices: number
    integrations: number
    platforms: number
    hubs: number
    manufacturers: number
    categories: number
    protocols: number
  }
  protocolCounts: Partial<Record<ProtocolSlug, number>>
  featuredDeviceSlugs: string[]
  recentlyUpdatedDeviceSlugs: string[]
  featuredIntegrationSlugs: string[]
  featuredPlatformSlugs: string[]
  featuredHubSlugs: string[]
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
  integrationSummaries: IntegrationExportSummary[]
  integrationDetails: IntegrationExportDetail[]
  integrationSlugs: string[]
  platformSummaries: PlatformExportSummary[]
  platformDetails: PlatformExportDetail[]
  platformSlugs: string[]
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
  catalog: CatalogExport
  search: SearchExport
  site: SiteExport
  sitemap: SitemapEntry[]
}

interface ExportBuildOptions {
  mode?: ExportMode
  writeProductDetails?: boolean
}

interface ExportOptions {
  mode?: ExportMode
}

export interface ExportWriteResult {
  url: string
  count: number
}

interface ManufacturerAggregate {
  id: number
  slug: string
  name: string
  website: string | null
  logoUrl: string | null
  deviceSlugs: string[]
  integrationSlugs: Set<string>
  platformSlugs: Set<string>
  hubSlugs: Set<string>
  latestUpdatedAt: Date | null
}

interface IntegrationAggregate {
  id: number
  slug: string
  name: string
  manufacturer: ExportEntityRef | null
  primaryProtocol: string | null
  integrationKind: string
  website: string | null
  description: string | null
  updatedAt: Date
  platformRefs: ExportEntityRef[]
  platformSlugs: string[]
  deviceSlugs: string[]
  statusBreakdown: Record<string, number>
  hardwareHints: IntegrationHardwareHint[]
  latestUpdatedAt: Date | null
}

interface PlatformAggregate {
  id: number
  slug: string
  name: string
  manufacturer: ExportEntityRef | null
  kind: string
  website: string | null
  description: string | null
  updatedAt: Date
  integrations: ExportEntityRef[]
  integrationSlugs: string[]
  deviceSlugs: string[]
  statusBreakdown: Record<string, number>
  latestUpdatedAt: Date | null
}

interface HubAggregate {
  id: number
  slug: string
  name: string
  manufacturer: ExportEntityRef | null
  website: string | null
  description: string | null
  updatedAt: Date
  deviceSlugs: string[]
  statusBreakdown: Record<string, number>
  latestUpdatedAt: Date | null
}

interface CategoryAggregate extends CategoryMetadata {
  directDeviceSlugs: string[]
  deviceSlugs: string[]
  latestUpdatedAt: Date | null
}

interface ProtocolAggregate {
  slug: ProtocolSlug
  name: string
  title: string
  description: string
  deviceSlugs: string[]
  localControlCount: number
  cloudDependentCount: number
  matterCertifiedCount: number
  integrationSlugs: Set<string>
  platformSlugs: Set<string>
  hubSlugs: Set<string>
  latestUpdatedAt: Date | null
}

interface RecentProductRecord {
  slug: string
  updatedAt: Date
}

export class ExportService {
  private storage: StorageDriver

  constructor(storage?: StorageDriver) {
    this.storage = storage ?? createStorageDriver(getStorageConfig())
  }

  async generateProductsExport(
    snapshot?: ExportSnapshot,
    options: ExportOptions = {},
  ): Promise<ExportWriteResult> {
    logger.info('Starting products export generation')
    const resolvedSnapshot =
      snapshot ??
      (await this.buildExportSnapshot({
        mode: options.mode,
        writeProductDetails: true,
      }))

    await this.deleteStaleJsonFiles('products', resolvedSnapshot.productDetailKeys, [
      'products/slugs.json',
    ])

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
      `Products export complete: ${resolvedSnapshot.productSummaries.length} products exported to ${url}`,
    )

    return { url, count: resolvedSnapshot.productSummaries.length }
  }

  async generateManufacturersExport(
    snapshot?: ExportSnapshot,
    options: ExportOptions = {},
  ): Promise<ExportWriteResult> {
    logger.info('Starting manufacturers export generation')
    const resolvedSnapshot = snapshot ?? (await this.buildExportSnapshot({ mode: options.mode }))
    const detailKeys = new Set(
      resolvedSnapshot.manufacturerSlugs.map((slug) => `manufacturers/${slug}.json`),
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
      `Manufacturers export complete: ${resolvedSnapshot.manufacturerSummaries.length} manufacturers exported to ${url}`,
    )

    return { url, count: resolvedSnapshot.manufacturerSummaries.length }
  }

  async generateCategoriesExport(
    snapshot?: ExportSnapshot,
    options: ExportOptions = {},
  ): Promise<ExportWriteResult> {
    logger.info('Starting categories export generation')
    const resolvedSnapshot = snapshot ?? (await this.buildExportSnapshot({ mode: options.mode }))

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
      `Categories export complete: ${resolvedSnapshot.categorySummaries.length} categories exported to ${url}`,
    )

    return { url, count: resolvedSnapshot.categorySummaries.length }
  }

  async generateIntegrationsExport(
    snapshot?: ExportSnapshot,
    options: ExportOptions = {},
  ): Promise<ExportWriteResult> {
    logger.info('Starting integrations export generation')
    const resolvedSnapshot = snapshot ?? (await this.buildExportSnapshot({ mode: options.mode }))
    const detailKeys = new Set(
      resolvedSnapshot.integrationSlugs.map((slug) => `integrations/${slug}.json`),
    )

    await this.deleteStaleJsonFiles('integrations', detailKeys, ['integrations/slugs.json'])

    for (const integration of resolvedSnapshot.integrationDetails) {
      await this.storage.write(`integrations/${integration.slug}.json`, {
        generated: resolvedSnapshot.generated,
        version: EXPORT_VERSION,
        integration,
      })
    }

    await this.storage.write('integrations/slugs.json', {
      generated: resolvedSnapshot.generated,
      version: EXPORT_VERSION,
      count: resolvedSnapshot.integrationSlugs.length,
      slugs: resolvedSnapshot.integrationSlugs,
    })

    const url = await this.storage.write('integrations.json', {
      generated: resolvedSnapshot.generated,
      version: EXPORT_VERSION,
      count: resolvedSnapshot.integrationSummaries.length,
      integrations: resolvedSnapshot.integrationSummaries,
    })

    logger.info(
      `Integrations export complete: ${resolvedSnapshot.integrationSummaries.length} integrations exported to ${url}`,
    )

    return { url, count: resolvedSnapshot.integrationSummaries.length }
  }

  async generatePlatformsExport(
    snapshot?: ExportSnapshot,
    options: ExportOptions = {},
  ): Promise<ExportWriteResult> {
    logger.info('Starting platforms export generation')
    const resolvedSnapshot = snapshot ?? (await this.buildExportSnapshot({ mode: options.mode }))
    const detailKeys = new Set(
      resolvedSnapshot.platformSlugs.map((slug) => `platforms/${slug}.json`),
    )

    await this.deleteStaleJsonFiles('platforms', detailKeys, ['platforms/slugs.json'])

    for (const platform of resolvedSnapshot.platformDetails) {
      await this.storage.write(`platforms/${platform.slug}.json`, {
        generated: resolvedSnapshot.generated,
        version: EXPORT_VERSION,
        platform,
      })
    }

    await this.storage.write('platforms/slugs.json', {
      generated: resolvedSnapshot.generated,
      version: EXPORT_VERSION,
      count: resolvedSnapshot.platformSlugs.length,
      slugs: resolvedSnapshot.platformSlugs,
    })

    const url = await this.storage.write('platforms.json', {
      generated: resolvedSnapshot.generated,
      version: EXPORT_VERSION,
      count: resolvedSnapshot.platformSummaries.length,
      platforms: resolvedSnapshot.platformSummaries,
    })

    logger.info(
      `Platforms export complete: ${resolvedSnapshot.platformSummaries.length} platforms exported to ${url}`,
    )

    return { url, count: resolvedSnapshot.platformSummaries.length }
  }

  async generateHubsExport(
    snapshot?: ExportSnapshot,
    options: ExportOptions = {},
  ): Promise<ExportWriteResult> {
    logger.info('Starting hubs export generation')
    const resolvedSnapshot = snapshot ?? (await this.buildExportSnapshot({ mode: options.mode }))
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

  async generateProtocolsExport(
    snapshot?: ExportSnapshot,
    options: ExportOptions = {},
  ): Promise<ExportWriteResult> {
    logger.info('Starting protocols export generation')
    const resolvedSnapshot = snapshot ?? (await this.buildExportSnapshot({ mode: options.mode }))
    const detailKeys = new Set(
      resolvedSnapshot.protocolSlugs.map((slug) => `protocols/${slug}.json`),
    )

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
      `Protocols export complete: ${resolvedSnapshot.protocolSummaries.length} protocols exported to ${url}`,
    )

    return { url, count: resolvedSnapshot.protocolSummaries.length }
  }

  async generateCatalogExport(
    snapshot?: ExportSnapshot,
    options: ExportOptions = {},
  ): Promise<ExportWriteResult> {
    logger.info('Starting catalog export generation')
    const resolvedSnapshot = snapshot ?? (await this.buildExportSnapshot({ mode: options.mode }))
    const url = await this.storage.write('catalog.json', resolvedSnapshot.catalog)
    logger.info(`Catalog export complete: ${url}`)
    return { url, count: resolvedSnapshot.catalog.count }
  }

  async generateSearchExport(
    snapshot?: ExportSnapshot,
    options: ExportOptions = {},
  ): Promise<ExportWriteResult> {
    logger.info('Starting search export generation')
    const resolvedSnapshot = snapshot ?? (await this.buildExportSnapshot({ mode: options.mode }))
    const url = await this.storage.write('search.json', resolvedSnapshot.search)
    logger.info(`Search export complete: ${url}`)
    return { url, count: resolvedSnapshot.search.count }
  }

  async generateSiteExport(
    snapshot?: ExportSnapshot,
    options: ExportOptions = {},
  ): Promise<ExportWriteResult> {
    logger.info('Starting site export generation')
    const resolvedSnapshot = snapshot ?? (await this.buildExportSnapshot({ mode: options.mode }))
    const url = await this.storage.write('site.json', resolvedSnapshot.site)
    logger.info(`Site export complete: ${url}`)
    return { url, count: 1 }
  }

  async generateSitemapExport(
    snapshot?: ExportSnapshot,
    options: ExportOptions = {},
  ): Promise<ExportWriteResult> {
    logger.info('Starting sitemap export generation')
    const resolvedSnapshot = snapshot ?? (await this.buildExportSnapshot({ mode: options.mode }))
    const url = await this.storage.write('sitemap.json', {
      generated: resolvedSnapshot.generated,
      version: EXPORT_VERSION,
      count: resolvedSnapshot.sitemap.length,
      urls: resolvedSnapshot.sitemap,
    })
    logger.info(`Sitemap export complete: ${url}`)
    return { url, count: resolvedSnapshot.sitemap.length }
  }

  async generateAllExports(options: ExportOptions = {}): Promise<{
    products: ExportWriteResult
    manufacturers: ExportWriteResult
    categories: ExportWriteResult
    integrations: ExportWriteResult
    platforms: ExportWriteResult
    hubs: ExportWriteResult
    protocols: ExportWriteResult
    catalog: ExportWriteResult
    search: ExportWriteResult
    site: ExportWriteResult
    sitemap: ExportWriteResult
  }> {
    logger.info('Starting full export generation')
    const snapshot = await this.buildExportSnapshot({
      mode: options.mode,
      writeProductDetails: true,
    })

    const [
      productsResult,
      manufacturersResult,
      categoriesResult,
      integrationsResult,
      platformsResult,
      hubsResult,
      protocolsResult,
      catalogResult,
      searchResult,
      siteResult,
      sitemapResult,
    ] = await Promise.all([
      this.generateProductsExport(snapshot),
      this.generateManufacturersExport(snapshot),
      this.generateCategoriesExport(snapshot),
      this.generateIntegrationsExport(snapshot),
      this.generatePlatformsExport(snapshot),
      this.generateHubsExport(snapshot),
      this.generateProtocolsExport(snapshot),
      this.generateCatalogExport(snapshot),
      this.generateSearchExport(snapshot),
      this.generateSiteExport(snapshot),
      this.generateSitemapExport(snapshot),
    ])

    await this.triggerDeployHook()

    logger.info('Full export generation complete')

    return {
      products: productsResult,
      manufacturers: manufacturersResult,
      categories: categoriesResult,
      integrations: integrationsResult,
      platforms: platformsResult,
      hubs: hubsResult,
      protocols: protocolsResult,
      catalog: catalogResult,
      search: searchResult,
      site: siteResult,
      sitemap: sitemapResult,
    }
  }

  async listExports(): Promise<string[]> {
    return this.storage.list()
  }

  private async buildExportSnapshot(options: ExportBuildOptions = {}): Promise<ExportSnapshot> {
    const mode = options.mode ?? 'full'
    const writeProductDetails = options.writeProductDetails ?? false
    const generated = new Date().toISOString()
    const limitedSelection = mode === 'limited' ? await this.buildLimitedExportSelection() : null

    if (limitedSelection) {
      logger.info(
        `Preparing limited export snapshot with ${limitedSelection.manufacturerSlugs.size} manufacturers and ${limitedSelection.productIds.length} selected products`,
      )
    }

    const [manufacturers, categories, publishedIntegrations, publishedPlatforms, publishedHubs] =
      await Promise.all([
        db.query.manufacturers.findMany({
          orderBy: (table, { asc }) => [asc(table.name)],
        }),
        db.query.categories.findMany({
          orderBy: (table, { asc }) => [asc(table.sortOrder), asc(table.name)],
        }),
        db.query.integrations.findMany({
          where: eq(integrations.status, 'published'),
          with: {
            manufacturer: true,
            platformIntegrations: {
              with: {
                platform: {
                  with: {
                    manufacturer: true,
                  },
                },
              },
            },
            hardwareSupport: {
              with: {
                product: {
                  with: {
                    manufacturer: true,
                    category: true,
                  },
                },
              },
            },
          },
          orderBy: (table, { asc }) => [asc(table.name)],
        }).then((rows) => rows as unknown as PublishedIntegrationRecord[]),
        db.query.platforms.findMany({
          where: eq(platforms.status, 'published'),
          with: {
            manufacturer: true,
            platformIntegrations: {
              with: {
                integration: {
                  with: {
                    manufacturer: true,
                  },
                },
              },
            },
          },
          orderBy: (table, { asc }) => [asc(table.name)],
        }).then((rows) => rows as unknown as PublishedPlatformRecord[]),
        db.query.commercialHubs.findMany({
          where: eq(commercialHubs.status, 'published'),
          with: {
            manufacturer: true,
          },
          orderBy: (table, { asc }) => [asc(table.name)],
        }) as Promise<PublishedHubRecord[]>,
      ])

    const categoryMetadataById = this.buildCategoryMetadata(categories as CategoryRecord[])
    const productNameBySlug = new Map<string, string>()

    const manufacturerAggregates = new Map<string, ManufacturerAggregate>(
      manufacturers.map((manufacturer) => [
        manufacturer.slug,
        {
          id: manufacturer.id,
          slug: manufacturer.slug,
          name: manufacturer.name,
          website: manufacturer.website,
          logoUrl: manufacturer.logoUrl,
          deviceSlugs: [],
          integrationSlugs: new Set<string>(),
          platformSlugs: new Set<string>(),
          hubSlugs: new Set<string>(),
          latestUpdatedAt: null,
        },
      ]),
    )

    const integrationAggregates = new Map<string, IntegrationAggregate>(
      publishedIntegrations.map((integration) => {
        const publishedPlatformRefs = integration.platformIntegrations
          .filter((link) => link.platform.status === 'published')
          .map((link) => this.toExportEntityRef(link.platform))
          .filter((item): item is ExportEntityRef => item !== null)

        const hardwareHints = integration.hardwareSupport
          .filter(
            (link) =>
              link.product.status === 'published' && link.product.productRole === 'infrastructure',
          )
          .map<IntegrationHardwareHint>((link) => ({
            product: {
              id: link.product.id,
              slug: link.product.slug,
              name: link.product.name,
            },
            manufacturer: this.toExportEntityRef(link.product.manufacturer),
            category: this.toExportEntityRef(link.product.category),
            requirementType: link.requirementType,
            note: link.notes,
          }))

        return [
          integration.slug,
          {
            id: integration.id,
            slug: integration.slug,
            name: integration.name,
            manufacturer: this.toExportEntityRef(integration.manufacturer),
            primaryProtocol: integration.primaryProtocol,
            integrationKind: integration.integrationKind,
            website: integration.website,
            description: integration.description,
            updatedAt: integration.updatedAt,
            platformRefs: publishedPlatformRefs,
            platformSlugs: publishedPlatformRefs.map((item) => item.slug),
            deviceSlugs: [],
            statusBreakdown: {},
            hardwareHints,
            latestUpdatedAt: null,
          },
        ]
      }),
    )

    const platformAggregates = new Map<string, PlatformAggregate>(
      publishedPlatforms.map((platform) => {
        const integrationRefs = platform.platformIntegrations
          .filter((link) => link.integration.status === 'published')
          .map((link) => this.toExportEntityRef(link.integration))
          .filter((item): item is ExportEntityRef => item !== null)

        return [
          platform.slug,
          {
            id: platform.id,
            slug: platform.slug,
            name: platform.name,
            manufacturer: this.toExportEntityRef(platform.manufacturer),
            kind: platform.kind,
            website: platform.website,
            description: platform.description,
            updatedAt: platform.updatedAt,
            integrations: integrationRefs,
            integrationSlugs: integrationRefs.map((item) => item.slug),
            deviceSlugs: [],
            statusBreakdown: {},
            latestUpdatedAt: null,
          },
        ]
      }),
    )

    const hubAggregates = new Map<string, HubAggregate>(
      publishedHubs.map((hub) => [
        hub.slug,
        {
          id: hub.id,
          slug: hub.slug,
          name: hub.name,
          manufacturer: this.toExportEntityRef(hub.manufacturer),
          website: hub.website,
          description: hub.description,
          updatedAt: hub.updatedAt,
          deviceSlugs: [],
          statusBreakdown: {},
          latestUpdatedAt: null,
        },
      ]),
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
      ]),
    )

    const protocolAggregates = new Map<ProtocolSlug, ProtocolAggregate>(
      PROTOCOL_DEFINITIONS.map((protocol) => [
        protocol.slug,
        {
          ...protocol,
          deviceSlugs: [],
          localControlCount: 0,
          cloudDependentCount: 0,
          matterCertifiedCount: 0,
          integrationSlugs: new Set<string>(),
          platformSlugs: new Set<string>(),
          hubSlugs: new Set<string>(),
          latestUpdatedAt: null,
        },
      ]),
    )

    const publishedIntegrationById = new Map(publishedIntegrations.map((item) => [item.id, item]))
    const publishedPlatformById = new Map(publishedPlatforms.map((item) => [item.id, item]))
    const publishedHubById = new Map(publishedHubs.map((item) => [item.id, item]))

    const productSummaries: ProductExportSummary[] = []
    const productSlugs: string[] = []
    const productDetailKeys = new Set<string>()
    const recentProducts: RecentProductRecord[] = []

    const processProduct = async (product: ProductQueryRecord): Promise<void> => {
      const categoryMetadata = product.category
        ? (categoryMetadataById.get(product.category.id) ?? null)
        : null
      const publicCompatibility = this.buildPublicCompatibility(product, {
        publishedIntegrationById,
        publishedPlatformById,
        publishedHubById,
      })
      const summary = this.toProductSummary(product, categoryMetadata, publicCompatibility)
      const detail = this.toProductDetail(product, summary, publicCompatibility)
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
        const aggregate = manufacturerAggregates.get(product.manufacturer.slug)
        if (aggregate) {
          aggregate.deviceSlugs.push(product.slug)
          aggregate.latestUpdatedAt = this.maxDate(aggregate.latestUpdatedAt, updatedAt)

          for (const slug of summary.compatibleIntegrationSlugs) {
            aggregate.integrationSlugs.add(slug)
          }

          for (const slug of summary.compatiblePlatformSlugs) {
            aggregate.platformSlugs.add(slug)
          }

          for (const slug of summary.compatibleHubSlugs) {
            aggregate.hubSlugs.add(slug)
          }
        }
      }

      if (categoryMetadata) {
        this.assignProductToCategory(
          categoryMetadata.path,
          product.slug,
          updatedAt,
          categoryAggregates,
        )

        for (const ancestor of categoryMetadata.ancestors) {
          const ancestorMetadata = categoryMetadataById.get(ancestor.id)
          if (ancestorMetadata) {
            this.assignProductToCategory(
              ancestorMetadata.path,
              product.slug,
              updatedAt,
              categoryAggregates,
              false,
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

          for (const slug of summary.compatibleIntegrationSlugs) {
            protocol.integrationSlugs.add(slug)
          }

          for (const slug of summary.compatiblePlatformSlugs) {
            protocol.platformSlugs.add(slug)
          }

          for (const slug of summary.compatibleHubSlugs) {
            protocol.hubSlugs.add(slug)
          }
        }
      }

      for (const row of publicCompatibility.integrationRows) {
        if (!this.isPositiveCompatibilityStatus(row.status)) {
          continue
        }

        const aggregate = integrationAggregates.get(row.integration.slug)
        if (!aggregate) {
          continue
        }

        if (!aggregate.deviceSlugs.includes(product.slug)) {
          aggregate.deviceSlugs.push(product.slug)
        }

        aggregate.statusBreakdown[row.status] = (aggregate.statusBreakdown[row.status] ?? 0) + 1
        aggregate.latestUpdatedAt = this.maxDate(aggregate.latestUpdatedAt, updatedAt)
      }

      for (const row of publicCompatibility.platformRows) {
        if (!this.isPositiveCompatibilityStatus(row.status)) {
          continue
        }

        const aggregate = platformAggregates.get(row.platform.slug)
        if (!aggregate) {
          continue
        }

        if (!aggregate.deviceSlugs.includes(product.slug)) {
          aggregate.deviceSlugs.push(product.slug)
        }

        aggregate.statusBreakdown[row.status] = (aggregate.statusBreakdown[row.status] ?? 0) + 1
        aggregate.latestUpdatedAt = this.maxDate(aggregate.latestUpdatedAt, updatedAt)
      }

      for (const row of publicCompatibility.hubRows) {
        if (!this.isPositiveCompatibilityStatus(row.status)) {
          continue
        }

        const aggregate = hubAggregates.get(row.hub.slug)
        if (!aggregate) {
          continue
        }

        if (!aggregate.deviceSlugs.includes(product.slug)) {
          aggregate.deviceSlugs.push(product.slug)
        }

        aggregate.statusBreakdown[row.status] = (aggregate.statusBreakdown[row.status] ?? 0) + 1
        aggregate.latestUpdatedAt = this.maxDate(aggregate.latestUpdatedAt, updatedAt)
      }
    }

    if (limitedSelection) {
      for (
        let index = 0;
        index < limitedSelection.productIds.length;
        index += PRODUCT_EXPORT_BATCH_SIZE
      ) {
        const batchIds = limitedSelection.productIds.slice(index, index + PRODUCT_EXPORT_BATCH_SIZE)
        const batch = (await db.query.products.findMany({
          where: and(eq(products.status, 'published'), inArray(products.id, batchIds)),
          with: this.productExportRelations(),
          orderBy: (table, { asc }) => [asc(table.id)],
        })) as unknown as ProductQueryRecord[]

        for (const product of batch) {
          await processProduct(product)
        }
      }
    } else {
      let lastProductId = 0

      while (true) {
        const batch = (await db.query.products.findMany({
          where: and(eq(products.status, 'published'), gt(products.id, lastProductId)),
          with: this.productExportRelations(),
          orderBy: (table, { asc }) => [asc(table.id)],
          limit: PRODUCT_EXPORT_BATCH_SIZE,
        })) as unknown as ProductQueryRecord[]

        if (batch.length === 0) {
          break
        }

        for (const product of batch) {
          await processProduct(product)
        }

        lastProductId = batch[batch.length - 1].id
        logger.info(
          `Prepared ${productSummaries.length} product exports so far (last product id: ${lastProductId})`,
        )
      }
    }

    const sortSlugsByName = (slugs: string[]) =>
      Array.from(new Set(slugs)).sort((left, right) =>
        (productNameBySlug.get(left) ?? left).localeCompare(productNameBySlug.get(right) ?? right),
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
        compatibilityCounts: {
          integrations: manufacturer.integrationSlugs.size,
          platforms: manufacturer.platformSlugs.size,
          hubs: manufacturer.hubSlugs.size,
        },
        updatedAt: manufacturer.latestUpdatedAt?.toISOString() ?? null,
        deviceSlugs: sortSlugsByName(manufacturer.deviceSlugs),
        integrationSlugs: Array.from(manufacturer.integrationSlugs).sort((left, right) =>
          left.localeCompare(right),
        ),
        platformSlugs: Array.from(manufacturer.platformSlugs).sort((left, right) =>
          left.localeCompare(right),
        ),
        hubSlugs: Array.from(manufacturer.hubSlugs).sort((left, right) => left.localeCompare(right)),
      }))
      .filter((manufacturer) => manufacturer.deviceCount > 0)
      .sort((left, right) => left.name.localeCompare(right.name))

    const manufacturerSummaries = manufacturerDetails.map(
      ({
        updatedAt: _updatedAt,
        deviceSlugs: _deviceSlugs,
        integrationSlugs: _integrationSlugs,
        platformSlugs: _platformSlugs,
        hubSlugs: _hubSlugs,
        ...manufacturer
      }) => manufacturer,
    )
    const manufacturerSlugs = manufacturerDetails.map((manufacturer) => manufacturer.slug)

    const integrationDetails = Array.from(integrationAggregates.values())
      .map<IntegrationExportDetail>((integration) => ({
        id: integration.id,
        slug: integration.slug,
        name: integration.name,
        manufacturer: integration.manufacturer,
        primaryProtocol: integration.primaryProtocol,
        integrationKind: integration.integrationKind,
        platformSlugs: integration.platformSlugs.slice().sort((left, right) =>
          left.localeCompare(right),
        ),
        compatibleDeviceCount: integration.deviceSlugs.length,
        statusBreakdown: this.sortRecord(integration.statusBreakdown),
        searchText: this.buildSearchText([
          integration.name,
          integration.manufacturer?.name ?? null,
          integration.primaryProtocol,
          integration.description,
          ...integration.platformRefs.map((item) => item.name),
        ]),
        updatedAt: this.maxDate(integration.latestUpdatedAt, integration.updatedAt).toISOString(),
        website: integration.website,
        description: integration.description,
        platforms: integration.platformRefs.slice().sort((left, right) =>
          left.name.localeCompare(right.name),
        ),
        compatibleDeviceSlugs: sortSlugsByName(integration.deviceSlugs),
        hardwareHints: integration.hardwareHints.slice().sort((left, right) =>
          left.product.name.localeCompare(right.product.name),
        ),
      }))
      .sort((left, right) => left.name.localeCompare(right.name))

    const integrationSummaries = integrationDetails.map(
      ({
        website: _website,
        description: _description,
        platforms: _platforms,
        compatibleDeviceSlugs: _compatibleDeviceSlugs,
        hardwareHints: _hardwareHints,
        ...integration
      }) => integration,
    )
    const integrationSlugs = integrationDetails.map((integration) => integration.slug)

    const platformDetails = Array.from(platformAggregates.values())
      .map<PlatformExportDetail>((platform) => ({
        id: platform.id,
        slug: platform.slug,
        name: platform.name,
        manufacturer: platform.manufacturer,
        kind: platform.kind,
        integrationSlugs: platform.integrationSlugs.slice().sort((left, right) =>
          left.localeCompare(right),
        ),
        compatibleDeviceCountDerived: platform.deviceSlugs.length,
        searchText: this.buildSearchText([
          platform.name,
          platform.manufacturer?.name ?? null,
          platform.kind,
          platform.description,
          ...platform.integrations.map((item) => item.name),
        ]),
        updatedAt: this.maxDate(platform.latestUpdatedAt, platform.updatedAt).toISOString(),
        website: platform.website,
        description: platform.description,
        integrations: platform.integrations.slice().sort((left, right) =>
          left.name.localeCompare(right.name),
        ),
        compatibleDeviceSlugs: sortSlugsByName(platform.deviceSlugs),
        statusBreakdown: this.sortRecord(platform.statusBreakdown),
      }))
      .sort((left, right) => left.name.localeCompare(right.name))

    const platformSummaries = platformDetails.map(
      ({
        website: _website,
        description: _description,
        integrations: _integrations,
        compatibleDeviceSlugs: _compatibleDeviceSlugs,
        statusBreakdown: _statusBreakdown,
        ...platform
      }) => platform,
    )
    const platformSlugs = platformDetails.map((platform) => platform.slug)

    const hubDetails = Array.from(hubAggregates.values())
      .map<HubExportDetail>((hub) => ({
        id: hub.id,
        slug: hub.slug,
        name: hub.name,
        manufacturer: hub.manufacturer,
        compatibleDeviceCount: hub.deviceSlugs.length,
        statusBreakdown: this.sortRecord(hub.statusBreakdown),
        searchText: this.buildSearchText([
          hub.name,
          hub.manufacturer?.name ?? null,
          hub.description,
        ]),
        updatedAt: this.maxDate(hub.latestUpdatedAt, hub.updatedAt).toISOString(),
        website: hub.website,
        description: hub.description,
        compatibleDeviceSlugs: sortSlugsByName(hub.deviceSlugs),
      }))
      .sort((left, right) => left.name.localeCompare(right.name))

    const hubSummaries = hubDetails.map(
      ({
        website: _website,
        description: _description,
        compatibleDeviceSlugs: _compatibleDeviceSlugs,
        ...hub
      }) => hub,
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
      .filter((category) => mode === 'limited' || category.deviceCount > 0)
      .sort((left, right) => left.path.localeCompare(right.path))

    const categorySummaries = categoryDetails.map(
      ({
        updatedAt: _updatedAt,
        directDeviceSlugs: _directDeviceSlugs,
        deviceSlugs: _deviceSlugs,
        ...category
      }) => category,
    )
    const categoryPaths = categoryDetails.map((category) => ({
      slug: category.slug,
      path: category.path,
      pathSegments: category.pathSegments,
    }))
    const categoryDetailKeys = new Set(
      categoryDetails.map((category) => `categories/${category.path}.json`),
    )

    const protocolDetails = Array.from(protocolAggregates.values()).map<ProtocolExportDetail>(
      (protocol) => ({
        slug: protocol.slug,
        name: protocol.name,
        title: protocol.title,
        description: protocol.description,
        deviceCount: protocol.deviceSlugs.length,
        localControlCount: protocol.localControlCount,
        cloudDependentCount: protocol.cloudDependentCount,
        matterCertifiedCount: protocol.matterCertifiedCount,
        integrationCount: protocol.integrationSlugs.size,
        platformCount: protocol.platformSlugs.size,
        hubCount: protocol.hubSlugs.size,
        updatedAt: protocol.latestUpdatedAt?.toISOString() ?? null,
        deviceSlugs: sortSlugsByName(protocol.deviceSlugs),
        integrationSlugs: Array.from(protocol.integrationSlugs).sort((left, right) =>
          left.localeCompare(right),
        ),
        platformSlugs: Array.from(protocol.platformSlugs).sort((left, right) =>
          left.localeCompare(right),
        ),
        hubSlugs: Array.from(protocol.hubSlugs).sort((left, right) => left.localeCompare(right)),
      }),
    )

    const protocolSummaries = protocolDetails.map(
      ({
        updatedAt: _updatedAt,
        deviceSlugs: _deviceSlugs,
        integrationSlugs: _integrationSlugs,
        platformSlugs: _platformSlugs,
        hubSlugs: _hubSlugs,
        ...protocol
      }) => protocol,
    )
    const protocolSlugs = protocolDetails.map((protocol) => protocol.slug)
    const protocolCounts = this.sortRecord(
      Object.fromEntries(protocolDetails.map((protocol) => [protocol.slug, protocol.deviceCount])),
    ) as Partial<Record<ProtocolSlug, number>>

    const catalog = this.buildCatalogExport(
      generated,
      productSummaries,
      integrationDetails,
      platformDetails,
      hubDetails,
      categoryDetails,
    )
    const search = this.buildSearchExport(
      generated,
      productSummaries,
      manufacturerDetails,
      integrationDetails,
      platformDetails,
      hubDetails,
    )

    const featuredDeviceSlugs = recentProducts
      .slice(0, FEATURED_DEVICE_COUNT)
      .map((item) => item.slug)
    const recentlyUpdatedDeviceSlugs = recentProducts
      .slice(0, RECENT_DEVICE_COUNT)
      .map((item) => item.slug)
    const featuredIntegrationSlugs = integrationDetails
      .slice()
      .sort((left, right) => {
        const countDiff = right.compatibleDeviceCount - left.compatibleDeviceCount
        return countDiff !== 0 ? countDiff : left.name.localeCompare(right.name)
      })
      .slice(0, FEATURED_ENTITY_COUNT)
      .map((item) => item.slug)
    const featuredPlatformSlugs = platformDetails
      .slice()
      .sort((left, right) => {
        const countDiff = right.compatibleDeviceCountDerived - left.compatibleDeviceCountDerived
        return countDiff !== 0 ? countDiff : left.name.localeCompare(right.name)
      })
      .slice(0, FEATURED_ENTITY_COUNT)
      .map((item) => item.slug)
    const featuredHubSlugs = hubDetails
      .slice()
      .sort((left, right) => {
        const countDiff = right.compatibleDeviceCount - left.compatibleDeviceCount
        return countDiff !== 0 ? countDiff : left.name.localeCompare(right.name)
      })
      .slice(0, FEATURED_ENTITY_COUNT)
      .map((item) => item.slug)

    const site: SiteExport = {
      generated,
      version: EXPORT_VERSION,
      stats: {
        devices: productSummaries.length,
        integrations: integrationSummaries.length,
        platforms: platformSummaries.length,
        hubs: hubSummaries.length,
        manufacturers: manufacturerSummaries.length,
        categories: categorySummaries.length,
        protocols: protocolSummaries.length,
      },
      protocolCounts,
      featuredDeviceSlugs,
      recentlyUpdatedDeviceSlugs,
      featuredIntegrationSlugs,
      featuredPlatformSlugs,
      featuredHubSlugs,
    }

    const sitemap: SitemapEntry[] = [
      { path: '/', type: 'static' as const, lastModified: generated },
      { path: '/about', type: 'static' as const, lastModified: generated },
      { path: '/devices', type: 'static' as const, lastModified: generated },
      { path: '/integrations', type: 'static' as const, lastModified: generated },
      { path: '/platforms', type: 'static' as const, lastModified: generated },
      { path: '/hubs', type: 'static' as const, lastModified: generated },
      { path: '/manufacturers', type: 'static' as const, lastModified: generated },
      { path: '/categories', type: 'static' as const, lastModified: generated },
      { path: '/protocols', type: 'static' as const, lastModified: generated },
      ...productSummaries.map((product) => ({
        path: `/devices/${product.slug}`,
        type: 'device' as const,
        lastModified: product.updatedAt,
      })),
      ...integrationDetails.map((integration) => ({
        path: `/integrations/${integration.slug}`,
        type: 'integration' as const,
        lastModified: integration.updatedAt,
      })),
      ...platformDetails.map((platform) => ({
        path: `/platforms/${platform.slug}`,
        type: 'platform' as const,
        lastModified: platform.updatedAt,
      })),
      ...hubDetails.map((hub) => ({
        path: `/hubs/${hub.slug}`,
        type: 'hub' as const,
        lastModified: hub.updatedAt,
      })),
      ...manufacturerDetails.map((manufacturer) => ({
        path: `/manufacturers/${manufacturer.slug}`,
        type: 'manufacturer' as const,
        lastModified: manufacturer.updatedAt ?? generated,
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
      integrationSummaries,
      integrationDetails,
      integrationSlugs,
      platformSummaries,
      platformDetails,
      platformSlugs,
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
      catalog,
      search,
      site,
      sitemap,
    }
  }

  private productExportRelations() {
    return {
      manufacturer: true,
      category: true,
      zigbeeDetails: true,
      zwaveDetails: true,
      integrationCompatibilities: {
        with: {
          integration: {
            with: {
              manufacturer: true,
            },
          },
        },
      },
      hubCompatibilities: {
        with: {
          hub: {
            with: {
              manufacturer: true,
            },
          },
        },
      },
    } as const
  }

  private buildPublicCompatibility(
    product: ProductQueryRecord,
    options: {
      publishedIntegrationById: Map<number, PublishedIntegrationRecord>
      publishedPlatformById: Map<number, PublishedPlatformRecord>
      publishedHubById: Map<number, PublishedHubRecord>
    },
  ) {
    const integrationRows = product.integrationCompatibilities
      .filter(
        (row) =>
          this.isPublicCompatibilityReviewState(row.reviewState) &&
          options.publishedIntegrationById.has(row.integrationId),
      )
      .map<InternalProductCompatibilityIntegrationEntry>((row) => {
        const publishedIntegration = options.publishedIntegrationById.get(row.integrationId)
        const platformRefs = (publishedIntegration?.platformIntegrations ?? [])
          .filter((link) => options.publishedPlatformById.has(link.platform.id))
          .map((link) => this.toExportEntityRef(link.platform))
          .filter((item): item is ExportEntityRef => item !== null)

        return {
        integration: {
          id: row.integration.id,
          slug: row.integration.slug,
          name: row.integration.name,
        },
        manufacturer: this.toExportEntityRef(row.integration.manufacturer),
        platformRefs,
        platformSlugs: platformRefs.map((item) => item.slug).sort((left, right) =>
          left.localeCompare(right),
        ),
        status: row.status,
        reviewState: row.reviewState,
        supportSummary: row.supportSummary,
        canonicalSource: row.canonicalSource,
        lastConfirmedAt: row.lastConfirmedAt?.toISOString() ?? null,
      }
      })
      .sort((left, right) => left.integration.name.localeCompare(right.integration.name))

    const hubRows = product.hubCompatibilities
      .filter(
        (row) =>
          this.isPublicCompatibilityReviewState(row.reviewState) &&
          options.publishedHubById.has(row.hubId),
      )
      .map((row) => ({
        hub: {
          id: row.hub.id,
          slug: row.hub.slug,
          name: row.hub.name,
        },
        manufacturer: this.toExportEntityRef(row.hub.manufacturer),
        status: row.status,
        reviewState: row.reviewState,
        supportSummary: row.supportSummary,
        canonicalSource: row.canonicalSource,
        lastConfirmedAt: row.lastConfirmedAt?.toISOString() ?? null,
      }))
      .sort((left, right) => left.hub.name.localeCompare(right.hub.name))

    const platformRowsBySlug = new Map<
      string,
      {
        platform: ExportEntityRef
        kind: string
        status: string
        viaIntegrations: Map<string, ExportEntityRef>
      }
    >()

    for (const row of integrationRows) {
      if (!this.isPositiveCompatibilityStatus(row.status)) {
        continue
      }

      for (const platformRef of row.platformRefs) {
        const platform = options.publishedPlatformById.get(platformRef.id)

        if (!platform) {
          continue
        }

        const current = platformRowsBySlug.get(platform.slug) ?? {
          platform: platformRef,
          kind: platform.kind,
          status: row.status,
          viaIntegrations: new Map<string, ExportEntityRef>(),
        }

        current.viaIntegrations.set(row.integration.slug, row.integration)

        if (this.statusRank(row.status) > this.statusRank(current.status)) {
          current.status = row.status
        }

        platformRowsBySlug.set(platform.slug, current)
      }
    }

    const platformRows = Array.from(platformRowsBySlug.values())
      .map<ProductCompatibilityPlatformEntry>((row) => ({
        platform: row.platform,
        kind: row.kind,
        status: row.status,
        viaIntegrations: Array.from(row.viaIntegrations.values()).sort((left, right) =>
          left.name.localeCompare(right.name),
        ),
      }))
      .sort((left, right) => left.platform.name.localeCompare(right.platform.name))

    const infrastructureHintsByProductSlug = new Map<
      string,
      {
        product: ExportEntityRef
        manufacturer: ExportEntityRef | null
        category: ExportEntityRef | null
        requirementType: string
        viaIntegrations: Map<string, ExportEntityRef>
        note: string | null
      }
    >()

    for (const row of integrationRows) {
      if (!this.isPositiveCompatibilityStatus(row.status)) {
        continue
      }

      const publishedIntegration = options.publishedIntegrationById.get(row.integration.id)
      if (!publishedIntegration) {
        continue
      }

      for (const hardwareLink of publishedIntegration.hardwareSupport) {
        const key = `${hardwareLink.product.slug}:${hardwareLink.requirementType}`
        const current = infrastructureHintsByProductSlug.get(key) ?? {
          product: {
            id: hardwareLink.product.id,
            slug: hardwareLink.product.slug,
            name: hardwareLink.product.name,
          },
          manufacturer: this.toExportEntityRef(hardwareLink.product.manufacturer),
          category: this.toExportEntityRef(hardwareLink.product.category),
          requirementType: hardwareLink.requirementType,
          viaIntegrations: new Map<string, ExportEntityRef>(),
          note: hardwareLink.notes,
        }

        current.viaIntegrations.set(row.integration.slug, row.integration)

        if (!current.note && hardwareLink.notes) {
          current.note = hardwareLink.notes
        }

        infrastructureHintsByProductSlug.set(key, current)
      }
    }

    const infrastructureHints = Array.from(infrastructureHintsByProductSlug.values())
      .map<InfrastructureHint>((hint) => ({
        product: hint.product,
        manufacturer: hint.manufacturer,
        category: hint.category,
        requirementType: hint.requirementType,
        viaIntegrations: Array.from(hint.viaIntegrations.values()).sort((left, right) =>
          left.name.localeCompare(right.name),
        ),
        note: hint.note,
      }))
      .sort((left, right) => left.product.name.localeCompare(right.product.name))

    return {
      integrationRows,
      platformRows,
      hubRows,
      infrastructureHints,
      compatibleIntegrationSlugs: integrationRows
        .filter((row) => this.isPositiveCompatibilityStatus(row.status))
        .map((row) => row.integration.slug)
        .sort((left, right) => left.localeCompare(right)),
      compatiblePlatformSlugs: platformRows
        .filter((row) => this.isPositiveCompatibilityStatus(row.status))
        .map((row) => row.platform.slug)
        .sort((left, right) => left.localeCompare(right)),
      compatibleHubSlugs: hubRows
        .filter((row) => this.isPositiveCompatibilityStatus(row.status))
        .map((row) => row.hub.slug)
        .sort((left, right) => left.localeCompare(right)),
      compatibilityStatuses: this.sortStatuses(
        Array.from(
          new Set([
            ...integrationRows.map((row) => row.status),
            ...platformRows.map((row) => row.status),
            ...hubRows.map((row) => row.status),
          ]),
        ),
      ),
    }
  }

  private toProductSummary(
    product: ProductQueryRecord,
    category: CategoryMetadata | null,
    compatibility: {
      integrationRows: InternalProductCompatibilityIntegrationEntry[]
      platformRows: ProductCompatibilityPlatformEntry[]
      hubRows: ProductCompatibilityHubEntry[]
      compatibleIntegrationSlugs: string[]
      compatiblePlatformSlugs: string[]
      compatibleHubSlugs: string[]
      compatibilityStatuses: string[]
    },
  ): ProductExportSummary {
    const searchText = this.buildSearchText([
      product.name,
      product.model,
      product.manufacturer?.name ?? null,
      category?.name ?? null,
      ...(category?.ancestors.map((ancestor) => ancestor.name) ?? []),
      product.primaryProtocol,
      ...compatibility.integrationRows.map((row) => row.integration.name),
      ...compatibility.platformRows.map((row) => row.platform.name),
      ...compatibility.hubRows.map((row) => row.hub.name),
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
      compatibleIntegrationSlugs: compatibility.compatibleIntegrationSlugs,
      compatiblePlatformSlugs: compatibility.compatiblePlatformSlugs,
      compatibleHubSlugs: compatibility.compatibleHubSlugs,
      compatibilityStatuses: compatibility.compatibilityStatuses,
      updatedAt: product.updatedAt.toISOString(),
      searchText,
    }
  }

  private toProductDetail(
    product: ProductQueryRecord,
    summary: ProductExportSummary,
    compatibility: {
      integrationRows: InternalProductCompatibilityIntegrationEntry[]
      platformRows: ProductCompatibilityPlatformEntry[]
      hubRows: ProductCompatibilityHubEntry[]
      infrastructureHints: InfrastructureHint[]
    },
  ): ProductExport {
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
      integrationCompatibility: compatibility.integrationRows.map(({ platformRefs: _platformRefs, ...row }) => row),
      platformCompatibility: compatibility.platformRows,
      hubCompatibility: compatibility.hubRows,
      infrastructureHints: compatibility.infrastructureHints,
    }
  }

  private async buildLimitedExportSelection(): Promise<LimitedExportSelection> {
    const candidates: LimitedExportCandidate[] = []
    let lastProductId = 0

    while (true) {
      const batch = (await db.query.products.findMany({
        where: and(eq(products.status, 'published'), gt(products.id, lastProductId)),
        columns: {
          id: true,
          name: true,
          categoryId: true,
          primaryProtocol: true,
          updatedAt: true,
        },
        with: {
          manufacturer: {
            columns: {
              slug: true,
              name: true,
            },
          },
        },
        orderBy: (table, { asc }) => [asc(table.id)],
        limit: PRODUCT_EXPORT_BATCH_SIZE,
      })) as LimitedExportCandidate[]

      if (batch.length === 0) {
        break
      }

      candidates.push(...batch)
      lastProductId = batch[batch.length - 1].id
    }

    const manufacturerCounts = new Map<string, { count: number; name: string }>()

    for (const candidate of candidates) {
      if (!candidate.manufacturer) {
        continue
      }

      const current = manufacturerCounts.get(candidate.manufacturer.slug)

      if (current) {
        current.count += 1
      } else {
        manufacturerCounts.set(candidate.manufacturer.slug, {
          count: 1,
          name: candidate.manufacturer.name,
        })
      }
    }

    const topManufacturerSlugs = Array.from(manufacturerCounts.entries())
      .sort((left, right) => {
        const countDiff = right[1].count - left[1].count
        if (countDiff !== 0) {
          return countDiff
        }

        const nameDiff = left[1].name.localeCompare(right[1].name)
        if (nameDiff !== 0) {
          return nameDiff
        }

        return left[0].localeCompare(right[0])
      })
      .slice(0, LIMITED_EXPORT_MAX_MANUFACTURERS)
      .map(([slug]) => slug)

    const manufacturerSlugs = new Set(topManufacturerSlugs)
    const limitedCandidates = candidates.filter((candidate) =>
      manufacturerSlugs.has(candidate.manufacturer?.slug ?? ''),
    )
    const compatibilityReferenceCounts = new Map<number, number>()

    for (let index = 0; index < limitedCandidates.length; index += PRODUCT_EXPORT_BATCH_SIZE) {
      const batchIds = limitedCandidates
        .slice(index, index + PRODUCT_EXPORT_BATCH_SIZE)
        .map((candidate) => candidate.id)

      const [integrationRows, hubRows] = await Promise.all([
        db.query.productIntegrationCompatibility.findMany({
          where: inArray(productIntegrationCompatibility.productId, batchIds),
          columns: {
            productId: true,
          },
        }),
        db.query.productHubCompatibility.findMany({
          where: inArray(productHubCompatibility.productId, batchIds),
          columns: {
            productId: true,
          },
        }),
      ])

      for (const row of [...integrationRows, ...hubRows]) {
        compatibilityReferenceCounts.set(
          row.productId,
          (compatibilityReferenceCounts.get(row.productId) ?? 0) + 1,
        )
      }
    }

    const deviceCountsByCombo = new Map<string, number>()
    const productIds: number[] = []

    const rankedCandidates = limitedCandidates
      .map((candidate) => ({
        ...candidate,
        compatibilityReferenceCount: compatibilityReferenceCounts.get(candidate.id) ?? 0,
      }))
      .sort((left, right) => {
        const compatibilityDiff =
          right.compatibilityReferenceCount - left.compatibilityReferenceCount
        if (compatibilityDiff !== 0) {
          return compatibilityDiff
        }

        const updatedDiff = right.updatedAt.getTime() - left.updatedAt.getTime()
        if (updatedDiff !== 0) {
          return updatedDiff
        }

        const nameDiff = left.name.localeCompare(right.name)
        if (nameDiff !== 0) {
          return nameDiff
        }

        return left.id - right.id
      })

    for (const candidate of rankedCandidates) {
      const manufacturerSlug = candidate.manufacturer?.slug
      if (!manufacturerSlug) {
        continue
      }

      const comboKey = this.buildLimitedComboKey(
        manufacturerSlug,
        candidate.categoryId,
        candidate.primaryProtocol,
      )
      const currentCount = deviceCountsByCombo.get(comboKey) ?? 0

      if (currentCount >= LIMITED_EXPORT_MAX_DEVICES_PER_COMBO) {
        continue
      }

      deviceCountsByCombo.set(comboKey, currentCount + 1)
      productIds.push(candidate.id)
    }

    productIds.sort((left, right) => left - right)

    return {
      manufacturerSlugs,
      productIds,
    }
  }

  private buildLimitedComboKey(
    manufacturerSlug: string,
    categoryId: number | null,
    primaryProtocol: string | null,
  ): string {
    return [
      manufacturerSlug,
      categoryId ?? UNCATEGORIZED_LIMITED_GROUP,
      primaryProtocol ?? UNKNOWN_PROTOCOL_LIMITED_GROUP,
    ].join('::')
  }

  private buildCatalogExport(
    generated: string,
    products: ProductExportSummary[],
    integrations: IntegrationExportDetail[],
    platforms: PlatformExportDetail[],
    hubs: HubExportDetail[],
    categories: CategoryExportDetail[],
  ): CatalogExport {
    const protocolCounts = new Map<string, number>()
    const manufacturerCounts = new Map<string, { name: string; count: number }>()
    const categoryCounts = new Map<string, { slug: string; name: string; count: number }>()
    const integrationCounts = new Map<string, { name: string; count: number }>()
    const platformCounts = new Map<string, { name: string; count: number }>()
    const hubCounts = new Map<string, { name: string; count: number }>()

    const increment = (
      map: Map<string, { name: string; count: number }>,
      slug: string,
      name: string,
    ) => {
      const current = map.get(slug)
      if (current) {
        current.count += 1
      } else {
        map.set(slug, { name, count: 1 })
      }
    }

    const integrationNameBySlug = new Map(integrations.map((item) => [item.slug, item.name]))
    const platformNameBySlug = new Map(platforms.map((item) => [item.slug, item.name]))
    const hubNameBySlug = new Map(hubs.map((item) => [item.slug, item.name]))
    const categoryByPath = new Map(categories.map((item) => [item.path, item]))

    let localControlCount = 0
    let cloudDependentCount = 0
    let requiresHubCount = 0
    let matterCertifiedCount = 0

    for (const product of products) {
      if (product.primaryProtocol) {
        protocolCounts.set(
          product.primaryProtocol,
          (protocolCounts.get(product.primaryProtocol) ?? 0) + 1,
        )
      }

      if (product.manufacturer) {
        increment(manufacturerCounts, product.manufacturer.slug, product.manufacturer.name)
      }

      const categoryPath = product.categoryPath.join('/')
      if (categoryPath) {
        const category = categoryByPath.get(categoryPath)
        if (category) {
          const current = categoryCounts.get(categoryPath)
          if (current) {
            current.count += 1
          } else {
            categoryCounts.set(categoryPath, {
              slug: category.slug,
              name: category.name,
              count: 1,
            })
          }
        }
      }

      for (const slug of product.compatibleIntegrationSlugs) {
        increment(integrationCounts, slug, integrationNameBySlug.get(slug) ?? slug)
      }

      for (const slug of product.compatiblePlatformSlugs) {
        increment(platformCounts, slug, platformNameBySlug.get(slug) ?? slug)
      }

      for (const slug of product.compatibleHubSlugs) {
        increment(hubCounts, slug, hubNameBySlug.get(slug) ?? slug)
      }

      if (product.localControl) {
        localControlCount += 1
      }

      if (product.cloudDependent) {
        cloudDependentCount += 1
      }

      if (product.requiresHub) {
        requiresHubCount += 1
      }

      if (product.matterCertified) {
        matterCertifiedCount += 1
      }
    }

    return {
      generated,
      version: EXPORT_VERSION,
      count: products.length,
      products,
      facets: {
        protocols: Array.from(protocolCounts.entries())
          .map(([slug, count]) => ({
            slug,
            name: PROTOCOL_DEFINITIONS.find((item) => item.slug === slug)?.name ?? slug,
            count,
          }))
          .sort((left, right) => right.count - left.count || left.name.localeCompare(right.name)),
        manufacturers: Array.from(manufacturerCounts.entries())
          .map(([slug, value]) => ({
            slug,
            name: value.name,
            count: value.count,
          }))
          .sort((left, right) => right.count - left.count || left.name.localeCompare(right.name)),
        categories: Array.from(categoryCounts.entries())
          .map(([path, value]) => ({
            path,
            slug: value.slug,
            name: value.name,
            count: value.count,
          }))
          .sort((left, right) => right.count - left.count || left.path.localeCompare(right.path)),
        integrations: Array.from(integrationCounts.entries())
          .map(([slug, value]) => ({
            slug,
            name: value.name,
            count: value.count,
          }))
          .sort((left, right) => right.count - left.count || left.name.localeCompare(right.name)),
        platforms: Array.from(platformCounts.entries())
          .map(([slug, value]) => ({
            slug,
            name: value.name,
            count: value.count,
          }))
          .sort((left, right) => right.count - left.count || left.name.localeCompare(right.name)),
        hubs: Array.from(hubCounts.entries())
          .map(([slug, value]) => ({
            slug,
            name: value.name,
            count: value.count,
          }))
          .sort((left, right) => right.count - left.count || left.name.localeCompare(right.name)),
        features: [
          {
            slug: 'local-control',
            name: 'Local control',
            count: localControlCount,
          },
          {
            slug: 'cloud-dependent',
            name: 'Cloud dependent',
            count: cloudDependentCount,
          },
          {
            slug: 'requires-hub',
            name: 'Requires hub',
            count: requiresHubCount,
          },
          {
            slug: 'matter-certified',
            name: 'Matter certified',
            count: matterCertifiedCount,
          },
        ],
      },
    }
  }

  private buildSearchExport(
    generated: string,
    products: ProductExportSummary[],
    manufacturers: ManufacturerExportDetail[],
    integrations: IntegrationExportDetail[],
    platforms: PlatformExportDetail[],
    hubs: HubExportDetail[],
  ): SearchExport {
    const items: SearchExportItem[] = [
      ...products.map((product) => ({
        type: 'device' as const,
        slug: product.slug,
        title: product.name,
        subtitle: product.manufacturer?.name ?? null,
        url: `/devices/${product.slug}`,
        searchText: product.searchText,
      })),
      ...manufacturers.map((manufacturer) => ({
        type: 'manufacturer' as const,
        slug: manufacturer.slug,
        title: manufacturer.name,
        subtitle: `${manufacturer.deviceCount} devices`,
        url: `/manufacturers/${manufacturer.slug}`,
        searchText: this.buildSearchText([
          manufacturer.name,
          manufacturer.website,
          ...manufacturer.integrationSlugs,
          ...manufacturer.platformSlugs,
          ...manufacturer.hubSlugs,
        ]),
      })),
      ...integrations.map((integration) => ({
        type: 'integration' as const,
        slug: integration.slug,
        title: integration.name,
        subtitle: integration.primaryProtocol ?? integration.integrationKind,
        url: `/integrations/${integration.slug}`,
        searchText: integration.searchText,
      })),
      ...platforms.map((platform) => ({
        type: 'platform' as const,
        slug: platform.slug,
        title: platform.name,
        subtitle: platform.kind,
        url: `/platforms/${platform.slug}`,
        searchText: platform.searchText,
      })),
      ...hubs.map((hub) => ({
        type: 'hub' as const,
        slug: hub.slug,
        title: hub.name,
        subtitle: hub.manufacturer?.name ?? null,
        url: `/hubs/${hub.slug}`,
        searchText: hub.searchText,
      })),
    ].sort((left, right) => left.title.localeCompare(right.title))

    return {
      generated,
      version: EXPORT_VERSION,
      count: items.length,
      items,
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

      const parent = category.parentId ? (categoryById.get(category.parentId) ?? null) : null
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
            : left.sortOrder - right.sortOrder,
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
          ? [
              ...parentMetadata.ancestors,
              { id: parentMetadata.id, slug: parentMetadata.slug, name: parentMetadata.name },
            ]
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
    isDirect = true,
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

  private async deleteStaleJsonFiles(
    prefix: string,
    activeKeys: Set<string>,
    preserveKeys: string[] = [],
  ): Promise<void> {
    const existingFiles = await this.storage.list(prefix)
    const staleFiles = existingFiles.filter(
      (file) => file.endsWith('.json') && !preserveKeys.includes(file) && !activeKeys.has(file),
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
          .map((part) => part.trim().toLowerCase()),
      ),
    ).join(' ')
  }

  private maxDate(left: Date | null, right: Date): Date {
    if (!left) {
      return right
    }

    return left.getTime() > right.getTime() ? left : right
  }

  private sortStatuses(statuses: string[]): string[] {
    return statuses.slice().sort((left, right) => {
      const rankDiff = this.statusRank(right) - this.statusRank(left)
      return rankDiff !== 0 ? rankDiff : left.localeCompare(right)
    })
  }

  private statusRank(status: string): number {
    switch (status) {
      case 'verified':
        return 5
      case 'supported':
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

  private isPositiveCompatibilityStatus(status: string): boolean {
    return POSITIVE_COMPATIBILITY_STATUSES.has(status)
  }

  private isPublicCompatibilityReviewState(reviewState: string): boolean {
    return reviewState === 'approved'
  }

  private isProtocolSlug(value: string | null): value is ProtocolSlug {
    return PROTOCOL_DEFINITIONS.some((protocol) => protocol.slug === value)
  }

  private sortRecord<T extends string>(
    record: Partial<Record<T, number>> | Record<string, number>,
  ): Record<string, number> {
    return Object.fromEntries(
      Object.entries(record).sort(([left], [right]) => left.localeCompare(right)),
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
export type SitemapPageType =
  | 'static'
  | 'device'
  | 'integration'
  | 'platform'
  | 'hub'
  | 'manufacturer'
  | 'category'
  | 'protocol'
export type SearchEntityType = 'device' | 'integration' | 'platform' | 'hub' | 'manufacturer'

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
  compatibleIntegrationSlugs: string[]
  compatiblePlatformSlugs: string[]
  compatibleHubSlugs: string[]
  compatibilityStatuses: string[]
  updatedAt: string
  searchText: string
}

export interface ProductCompatibilityIntegrationEntry {
  integration: ExportEntityRef
  manufacturer: ExportEntityRef | null
  platformSlugs: string[]
  status: string
  reviewState: string
  supportSummary: string | null
  canonicalSource: string
  lastConfirmedAt: string | null
}

export interface ProductCompatibilityPlatformEntry {
  platform: ExportEntityRef
  kind: string
  status: string
  viaIntegrations: ExportEntityRef[]
}

export interface ProductCompatibilityHubEntry {
  hub: ExportEntityRef
  manufacturer: ExportEntityRef | null
  status: string
  reviewState: string
  supportSummary: string | null
  canonicalSource: string
  lastConfirmedAt: string | null
}

export interface InfrastructureHint {
  product: ExportEntityRef
  manufacturer: ExportEntityRef | null
  category: ExportEntityRef | null
  requirementType: string
  viaIntegrations: ExportEntityRef[]
  note: string | null
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
  integrationCompatibility: ProductCompatibilityIntegrationEntry[]
  platformCompatibility: ProductCompatibilityPlatformEntry[]
  hubCompatibility: ProductCompatibilityHubEntry[]
  infrastructureHints: InfrastructureHint[]
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
  compatibilityCounts: {
    integrations: number
    platforms: number
    hubs: number
  }
}

export interface ManufacturerExportDetail extends ManufacturerExportSummary {
  updatedAt: string | null
  deviceSlugs: string[]
  integrationSlugs: string[]
  platformSlugs: string[]
  hubSlugs: string[]
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

export interface IntegrationExportSummary {
  id: number
  slug: string
  name: string
  manufacturer: ExportEntityRef | null
  primaryProtocol: string | null
  integrationKind: string
  platformSlugs: string[]
  compatibleDeviceCount: number
  statusBreakdown: Record<string, number>
  searchText: string
  updatedAt: string
}

export interface IntegrationHardwareHint {
  product: ExportEntityRef
  manufacturer: ExportEntityRef | null
  category: ExportEntityRef | null
  requirementType: string
  note: string | null
}

export interface IntegrationExportDetail extends IntegrationExportSummary {
  website: string | null
  description: string | null
  platforms: ExportEntityRef[]
  compatibleDeviceSlugs: string[]
  hardwareHints: IntegrationHardwareHint[]
}

export interface IntegrationsResponse {
  generated: string
  version: string
  count: number
  integrations: IntegrationExportSummary[]
}

export interface IntegrationSlugsResponse {
  generated: string
  version: string
  count: number
  slugs: string[]
}

export interface IntegrationDetailResponse {
  generated: string
  version: string
  integration: IntegrationExportDetail
}

export interface PlatformExportSummary {
  id: number
  slug: string
  name: string
  manufacturer: ExportEntityRef | null
  kind: string
  integrationSlugs: string[]
  compatibleDeviceCountDerived: number
  searchText: string
  updatedAt: string
}

export interface PlatformExportDetail extends PlatformExportSummary {
  website: string | null
  description: string | null
  integrations: ExportEntityRef[]
  compatibleDeviceSlugs: string[]
  statusBreakdown: Record<string, number>
}

export interface PlatformsResponse {
  generated: string
  version: string
  count: number
  platforms: PlatformExportSummary[]
}

export interface PlatformSlugsResponse {
  generated: string
  version: string
  count: number
  slugs: string[]
}

export interface PlatformDetailResponse {
  generated: string
  version: string
  platform: PlatformExportDetail
}

export interface HubExportSummary {
  id: number
  slug: string
  name: string
  manufacturer: ExportEntityRef | null
  compatibleDeviceCount: number
  statusBreakdown: Record<string, number>
  searchText: string
  updatedAt: string
}

export interface HubExportDetail extends HubExportSummary {
  website: string | null
  description: string | null
  compatibleDeviceSlugs: string[]
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
  integrationCount: number
  platformCount: number
  hubCount: number
}

export interface ProtocolExportDetail extends ProtocolExportSummary {
  updatedAt: string | null
  deviceSlugs: string[]
  integrationSlugs: string[]
  platformSlugs: string[]
  hubSlugs: string[]
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

export interface SearchExportItem {
  type: SearchEntityType
  slug: string
  title: string
  subtitle: string | null
  url: string
  searchText: string
}

export interface SearchResponse {
  generated: string
  version: string
  count: number
  items: SearchExportItem[]
}

export interface CatalogFacetValue {
  slug: string
  name: string
  count: number
}

export interface CatalogCategoryFacetValue {
  slug: string
  path: string
  name: string
  count: number
}

export interface CatalogFeatureFacetValue {
  slug: 'local-control' | 'cloud-dependent' | 'requires-hub' | 'matter-certified'
  name: string
  count: number
}

export interface CatalogResponse {
  generated: string
  version: string
  count: number
  products: ProductExportSummary[]
  facets: {
    protocols: CatalogFacetValue[]
    manufacturers: CatalogFacetValue[]
    categories: CatalogCategoryFacetValue[]
    integrations: CatalogFacetValue[]
    platforms: CatalogFacetValue[]
    hubs: CatalogFacetValue[]
    features: CatalogFeatureFacetValue[]
  }
}

export interface SiteResponse {
  generated: string
  version: string
  stats: {
    devices: number
    integrations: number
    platforms: number
    hubs: number
    manufacturers: number
    categories: number
    protocols: number
  }
  protocolCounts: Partial<Record<ProtocolSlug, number>>
  featuredDeviceSlugs: string[]
  recentlyUpdatedDeviceSlugs: string[]
  featuredIntegrationSlugs: string[]
  featuredPlatformSlugs: string[]
  featuredHubSlugs: string[]
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
