import { db } from '../db/client'
import {
  commercialHubs,
  compatibilityEvidence,
  integrations,
  manufacturers,
  platformIntegrations,
  platforms,
  productHubCompatibility,
  productIntegrationCompatibility,
  products,
  sourceCompatibilityMappings,
} from '../db/schema'
import { and, eq, inArray } from 'drizzle-orm'

type CanonicalStatus = 'reported' | 'supported'
type EvidenceSource = 'zigbee2mqtt' | 'blakadder' | 'zwave_js' | 'imported_other'
type ReviewState = 'pending' | 'approved'

interface PlatformSeed {
  slug: string
  name: string
  kind: 'open_platform' | 'commercial_platform'
  manufacturerSlug: string | null
  website: string | null
  description: string
}

interface IntegrationSeed {
  slug: string
  name: string
  integrationKind:
    | 'protocol_stack'
    | 'bridge'
    | 'native_component'
    | 'vendor_connector'
    | 'addon'
    | 'external_service'
  primaryProtocol:
    | 'zigbee'
    | 'zwave'
    | 'matter'
    | 'wifi'
    | 'thread'
    | 'bluetooth'
    | 'proprietary'
    | 'multi'
    | null
  manufacturerSlug: string | null
  website: string | null
  description: string
}

interface CommercialHubSeed {
  slug: string
  name: string
  manufacturerSlug: string | null
  website: string | null
  description: string
}

interface PlatformIntegrationSeed {
  platformSlug: string
  integrationSlug: string
  supportType: 'native' | 'addon' | 'external' | 'community'
  notes?: string
}

interface CompatibilityTarget {
  targetType: 'integration' | 'hub'
  slug: string
  label: string
  note?: string
}

const BLAKADDER_COMPATIBILITY_MAP: Record<string, CompatibilityTarget[]> = {
  z2m: [
    {
      targetType: 'integration',
      slug: 'zigbee2mqtt',
      label: 'Zigbee2MQTT',
    },
  ],
  zha: [
    {
      targetType: 'integration',
      slug: 'zha',
      label: 'ZHA',
    },
  ],
  z4d: [
    {
      targetType: 'integration',
      slug: 'zigbee-for-domoticz',
      label: 'Zigbee for Domoticz',
    },
  ],
  deconz: [
    {
      targetType: 'integration',
      slug: 'deconz',
      label: 'deCONZ',
    },
  ],
  iob: [
    {
      targetType: 'integration',
      slug: 'iobroker-zigbee',
      label: 'ioBroker Zigbee',
    },
  ],
  ihost: [
    {
      targetType: 'hub',
      slug: 'sonoff-ihost',
      label: 'SONOFF iHost',
    },
  ],
  tasmota: [
    {
      targetType: 'integration',
      slug: 'tasmota',
      label: 'Tasmota',
    },
  ],
}

const SOURCE_COMPATIBILITY_TARGETS: Record<string, CompatibilityTarget[]> = {
  zigbee2mqtt: [
    {
      targetType: 'integration',
      slug: 'zigbee2mqtt',
      label: 'Zigbee2MQTT',
    },
  ],
  'zwave-js': [
    {
      targetType: 'integration',
      slug: 'zwave-js',
      label: 'Z-Wave JS',
    },
  ],
}

const AUTO_APPROVED_SOURCE_BACKED_RULES = {
  zigbee2mqtt: {
    targetType: 'integration',
    slug: 'zigbee2mqtt',
    status: 'supported',
    productProtocol: 'zigbee',
  },
  'zwave-js': {
    targetType: 'integration',
    slug: 'zwave-js',
    status: 'supported',
    productProtocol: 'zwave',
  },
} as const

const PLATFORM_SEEDS: PlatformSeed[] = [
  {
    slug: 'home-assistant',
    name: 'Home Assistant',
    kind: 'open_platform',
    manufacturerSlug: 'home-assistant',
    website: 'https://www.home-assistant.io',
    description: 'Open home automation platform used as a base for multiple integrations.',
  },
  {
    slug: 'openhab',
    name: 'OpenHAB',
    kind: 'open_platform',
    manufacturerSlug: null,
    website: 'https://www.openhab.org',
    description: 'Open-source smart home platform.',
  },
  {
    slug: 'domoticz',
    name: 'Domoticz',
    kind: 'open_platform',
    manufacturerSlug: null,
    website: 'https://www.domoticz.com',
    description: 'Open-source home automation platform with community Zigbee and Z-Wave integrations.',
  },
  {
    slug: 'homey',
    name: 'Homey',
    kind: 'commercial_platform',
    manufacturerSlug: 'athom',
    website: 'https://homey.app',
    description: 'Commercial smart home platform by Athom.',
  },
  {
    slug: 'iobroker',
    name: 'ioBroker',
    kind: 'open_platform',
    manufacturerSlug: null,
    website: 'https://www.iobroker.net',
    description: 'Open-source automation platform with adapter-based integrations.',
  },
]

const INTEGRATION_SEEDS: IntegrationSeed[] = [
  {
    slug: 'zigbee2mqtt',
    name: 'Zigbee2MQTT',
    integrationKind: 'protocol_stack',
    primaryProtocol: 'zigbee',
    manufacturerSlug: null,
    website: 'https://www.zigbee2mqtt.io',
    description: 'MQTT-based Zigbee integration layer.',
  },
  {
    slug: 'zha',
    name: 'ZHA',
    integrationKind: 'native_component',
    primaryProtocol: 'zigbee',
    manufacturerSlug: 'home-assistant',
    website: 'https://www.home-assistant.io/integrations/zha/',
    description: 'Native Zigbee integration for Home Assistant.',
  },
  {
    slug: 'deconz',
    name: 'deCONZ',
    integrationKind: 'bridge',
    primaryProtocol: 'zigbee',
    manufacturerSlug: null,
    website: 'https://phoscon.de/en/conbee2/software',
    description: 'deCONZ/Phoscon Zigbee bridge integration.',
  },
  {
    slug: 'zwave-js',
    name: 'Z-Wave JS',
    integrationKind: 'protocol_stack',
    primaryProtocol: 'zwave',
    manufacturerSlug: null,
    website: 'https://zwave-js.github.io',
    description: 'Open-source Z-Wave controller software stack.',
  },
  {
    slug: 'zigbee-for-domoticz',
    name: 'Zigbee for Domoticz',
    integrationKind: 'addon',
    primaryProtocol: 'zigbee',
    manufacturerSlug: null,
    website: null,
    description: 'Domoticz Zigbee integration imported from Blakadder compatibility data.',
  },
  {
    slug: 'iobroker-zigbee',
    name: 'ioBroker Zigbee',
    integrationKind: 'addon',
    primaryProtocol: 'zigbee',
    manufacturerSlug: null,
    website: null,
    description: 'ioBroker Zigbee integration imported from Blakadder compatibility data.',
  },
  {
    slug: 'tasmota',
    name: 'Tasmota',
    integrationKind: 'bridge',
    primaryProtocol: 'zigbee',
    manufacturerSlug: null,
    website: 'https://tasmota.github.io/docs/Zigbee/',
    description: 'Tasmota Zigbee bridge and device integration imported from Blakadder compatibility data.',
  },
]

const COMMERCIAL_HUB_SEEDS: CommercialHubSeed[] = [
  {
    slug: 'smartthings',
    name: 'SmartThings Hub',
    manufacturerSlug: 'samsung-smartthings',
    website: 'https://www.smartthings.com',
    description: 'Samsung SmartThings commercial hub ecosystem.',
  },
  {
    slug: 'hubitat',
    name: 'Hubitat Elevation',
    manufacturerSlug: 'hubitat',
    website: 'https://hubitat.com',
    description: 'Hubitat local automation hub.',
  },
  {
    slug: 'aqara-hub',
    name: 'Aqara Hub',
    manufacturerSlug: 'aqara',
    website: 'https://www.aqara.com',
    description: 'Aqara commercial smart home hub.',
  },
  {
    slug: 'sonoff-ihost',
    name: 'SONOFF iHost',
    manufacturerSlug: 'sonoff',
    website: 'https://sonoff.tech/product/gateway-amd-security-alarm/ihost-smart-home-hub/',
    description: 'SONOFF local commercial hub imported from source compatibility data.',
  },
]

const PLATFORM_INTEGRATION_SEEDS: PlatformIntegrationSeed[] = [
  {
    platformSlug: 'home-assistant',
    integrationSlug: 'zigbee2mqtt',
    supportType: 'addon',
    notes: 'Common Home Assistant deployment path for Zigbee2MQTT.',
  },
  {
    platformSlug: 'home-assistant',
    integrationSlug: 'zha',
    supportType: 'native',
  },
  {
    platformSlug: 'home-assistant',
    integrationSlug: 'zwave-js',
    supportType: 'addon',
  },
  {
    platformSlug: 'domoticz',
    integrationSlug: 'zigbee2mqtt',
    supportType: 'addon',
    notes: 'Community-supported Zigbee2MQTT deployment path for Domoticz.',
  },
  {
    platformSlug: 'openhab',
    integrationSlug: 'zwave-js',
    supportType: 'addon',
    notes: 'Z-Wave JS is used as the Z-Wave backend for OpenHAB.',
  },
  {
    platformSlug: 'iobroker',
    integrationSlug: 'iobroker-zigbee',
    supportType: 'addon',
    notes: 'Official ioBroker Zigbee adapter for coordinator-backed Zigbee support.',
  },
]

const integrationIdCache = new Map<string, number>()
const commercialHubIdCache = new Map<string, number>()
const platformIdCache = new Map<string, number>()
const manufacturerIdCache = new Map<string, number>()

let compatibilitySeedsEnsured = false

function normalizeCompatibilityToken(code: string): string[] {
  const normalized = code.trim().toLowerCase()

  switch (normalized) {
    case 'zigbee2mqtt':
    case 'sz2m':
      return ['z2m']
    case '24d':
      return ['z4d']
    case 'deconz.zha':
      return ['deconz', 'zha']
    default:
      return [normalized]
  }
}

function toEvidenceSource(source: string): EvidenceSource {
  switch (source) {
    case 'zigbee2mqtt':
      return 'zigbee2mqtt'
    case 'blakadder':
      return 'blakadder'
    case 'zwave-js':
      return 'zwave_js'
    default:
      return 'imported_other'
  }
}

async function findManufacturerIdBySlug(slug: string | null): Promise<number | null> {
  if (!slug) {
    return null
  }

  if (manufacturerIdCache.has(slug)) {
    return manufacturerIdCache.get(slug) ?? null
  }

  const [manufacturer] = await db
    .select({ id: manufacturers.id })
    .from(manufacturers)
    .where(eq(manufacturers.slug, slug))
    .limit(1)

  if (!manufacturer) {
    return null
  }

  manufacturerIdCache.set(slug, manufacturer.id)
  return manufacturer.id
}

async function getProductPrimaryProtocol(productId: number): Promise<string | null> {
  const [product] = await db
    .select({ primaryProtocol: products.primaryProtocol })
    .from(products)
    .where(eq(products.id, productId))
    .limit(1)

  return product?.primaryProtocol ?? null
}

function determineAutoApprovalReviewState(options: {
  source: string
  target: CompatibilityTarget
  status: CanonicalStatus
  productProtocol: string | null
}): ReviewState {
  const rule =
    AUTO_APPROVED_SOURCE_BACKED_RULES[
      options.source as keyof typeof AUTO_APPROVED_SOURCE_BACKED_RULES
    ]

  if (!rule) {
    return 'pending'
  }

  return rule.targetType === options.target.targetType &&
    rule.slug === options.target.slug &&
    rule.status === options.status &&
    rule.productProtocol === options.productProtocol
    ? 'approved'
    : 'pending'
}

export function extractCompatibilityCodes(value: unknown): string[] {
  const rawCodes = Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : typeof value === 'string'
      ? [value]
      : typeof value === 'object' &&
          value !== null &&
          'compatible' in value &&
          (Array.isArray(value.compatible) || typeof value.compatible === 'string')
        ? Array.isArray(value.compatible)
          ? value.compatible.filter((item): item is string => typeof item === 'string')
          : [value.compatible]
        : []

  return Array.from(new Set(rawCodes.flatMap((code) => normalizeCompatibilityToken(code))))
}

export function findUnmappedCompatibilityCodes(
  value: unknown,
  resolvedCodes: ReadonlySet<string> = new Set(),
): string[] {
  return extractCompatibilityCodes(value).filter((code) => {
    if (resolvedCodes.has(code)) {
      return false
    }

    const targets = BLAKADDER_COMPATIBILITY_MAP[code]
    return !targets || targets.length === 0
  })
}

async function resolveSourceCompatibilityTargets(
  source: string,
  codes: string[],
): Promise<Map<string, CompatibilityTarget[]>> {
  const normalizedCodes = Array.from(new Set(codes))
  const targetMap = new Map<string, CompatibilityTarget[]>()

  for (const code of normalizedCodes) {
    targetMap.set(code, [
      ...(source === 'blakadder' ? BLAKADDER_COMPATIBILITY_MAP[code] ?? [] : []),
    ])
  }

  if (normalizedCodes.length === 0) {
    return targetMap
  }

  const customMappings = await db.query.sourceCompatibilityMappings.findMany({
    where: and(
      eq(sourceCompatibilityMappings.source, source),
      inArray(sourceCompatibilityMappings.sourceCode, normalizedCodes),
    ),
    with: {
      integration: true,
      hub: true,
    },
  })

  for (const mapping of customMappings) {
    const currentTargets = targetMap.get(mapping.sourceCode) ?? []
    const nextTarget =
      mapping.targetType === 'integration' && mapping.integration
        ? {
            targetType: 'integration' as const,
            slug: mapping.integration.slug,
            label: mapping.integration.name,
            note: mapping.notes ?? undefined,
          }
        : mapping.targetType === 'hub' && mapping.hub
          ? {
              targetType: 'hub' as const,
              slug: mapping.hub.slug,
              label: mapping.hub.name,
              note: mapping.notes ?? undefined,
            }
          : null

    if (!nextTarget) {
      continue
    }

    const key = `${nextTarget.targetType}:${nextTarget.slug}`

    if (!currentTargets.some((target) => `${target.targetType}:${target.slug}` === key)) {
      currentTargets.push(nextTarget)
    }

    targetMap.set(mapping.sourceCode, currentTargets)
  }

  return targetMap
}

async function ensureCompatibilitySeeds(): Promise<void> {
  if (compatibilitySeedsEnsured) {
    return
  }

  for (const platform of PLATFORM_SEEDS) {
    const manufacturerId = await findManufacturerIdBySlug(platform.manufacturerSlug)

    await db
      .insert(platforms)
      .values({
        slug: platform.slug,
        name: platform.name,
        kind: platform.kind,
        manufacturerId,
        website: platform.website,
        description: platform.description,
        status: 'published',
      })
      .onConflictDoUpdate({
        target: platforms.slug,
        set: {
          name: platform.name,
          kind: platform.kind,
          manufacturerId,
          website: platform.website,
          description: platform.description,
          status: 'published',
          updatedAt: new Date(),
        },
      })
  }

  for (const integration of INTEGRATION_SEEDS) {
    const manufacturerId = await findManufacturerIdBySlug(integration.manufacturerSlug)

    await db
      .insert(integrations)
      .values({
        slug: integration.slug,
        name: integration.name,
        integrationKind: integration.integrationKind,
        primaryProtocol: integration.primaryProtocol,
        manufacturerId,
        website: integration.website,
        description: integration.description,
        status: 'published',
      })
      .onConflictDoUpdate({
        target: integrations.slug,
        set: {
          name: integration.name,
          integrationKind: integration.integrationKind,
          primaryProtocol: integration.primaryProtocol,
          manufacturerId,
          website: integration.website,
          description: integration.description,
          status: 'published',
          updatedAt: new Date(),
        },
      })
  }

  for (const hub of COMMERCIAL_HUB_SEEDS) {
    const manufacturerId = await findManufacturerIdBySlug(hub.manufacturerSlug)

    await db
      .insert(commercialHubs)
      .values({
        slug: hub.slug,
        name: hub.name,
        manufacturerId,
        website: hub.website,
        description: hub.description,
        status: 'published',
      })
      .onConflictDoUpdate({
        target: commercialHubs.slug,
        set: {
          name: hub.name,
          manufacturerId,
          website: hub.website,
          description: hub.description,
          status: 'published',
          updatedAt: new Date(),
        },
      })
  }

  for (const link of PLATFORM_INTEGRATION_SEEDS) {
    const platformId = await findPlatformIdBySlug(link.platformSlug)
    const integrationId = await findIntegrationIdBySlug(link.integrationSlug)

    if (platformId === null || integrationId === null) {
      continue
    }

    await db
      .insert(platformIntegrations)
      .values({
        platformId,
        integrationId,
        supportType: link.supportType,
        notes: link.notes ?? null,
      })
      .onConflictDoUpdate({
        target: [platformIntegrations.platformId, platformIntegrations.integrationId],
        set: {
          supportType: link.supportType,
          notes: link.notes ?? null,
          updatedAt: new Date(),
        },
      })
  }

  compatibilitySeedsEnsured = true
}

async function findPlatformIdBySlug(slug: string): Promise<number | null> {
  if (platformIdCache.has(slug)) {
    return platformIdCache.get(slug) ?? null
  }

  const [platform] = await db
    .select({ id: platforms.id })
    .from(platforms)
    .where(eq(platforms.slug, slug))
    .limit(1)

  if (!platform) {
    return null
  }

  platformIdCache.set(slug, platform.id)
  return platform.id
}

async function findIntegrationIdBySlug(slug: string): Promise<number | null> {
  if (integrationIdCache.has(slug)) {
    return integrationIdCache.get(slug) ?? null
  }

  const [integration] = await db
    .select({ id: integrations.id })
    .from(integrations)
    .where(eq(integrations.slug, slug))
    .limit(1)

  if (!integration) {
    return null
  }

  integrationIdCache.set(slug, integration.id)
  return integration.id
}

async function findCommercialHubIdBySlug(slug: string): Promise<number | null> {
  if (commercialHubIdCache.has(slug)) {
    return commercialHubIdCache.get(slug) ?? null
  }

  const [hub] = await db
    .select({ id: commercialHubs.id })
    .from(commercialHubs)
    .where(eq(commercialHubs.slug, slug))
    .limit(1)

  if (!hub) {
    return null
  }

  commercialHubIdCache.set(slug, hub.id)
  return hub.id
}

async function getIntegrationIdBySlug(slug: string): Promise<number | null> {
  await ensureCompatibilitySeeds()
  return findIntegrationIdBySlug(slug)
}

async function getCommercialHubIdBySlug(slug: string): Promise<number | null> {
  await ensureCompatibilitySeeds()
  return findCommercialHubIdBySlug(slug)
}

async function upsertIntegrationCompatibility(
  productId: number,
  integrationId: number,
  status: CanonicalStatus,
  reviewState: ReviewState,
  source: EvidenceSource,
  sourceRecordKey: string,
  note: string | null,
  metadata: Record<string, unknown>,
): Promise<boolean> {
  const now = new Date()
  const [existing] = await db
    .select({
      id: productIntegrationCompatibility.id,
      reviewState: productIntegrationCompatibility.reviewState,
    })
    .from(productIntegrationCompatibility)
    .where(
      and(
        eq(productIntegrationCompatibility.productId, productId),
        eq(productIntegrationCompatibility.integrationId, integrationId),
      ),
    )
    .limit(1)

  let compatibilityId = existing?.id ?? null
  let created = false

  if (compatibilityId === null) {
    const [createdCompatibility] = await db
      .insert(productIntegrationCompatibility)
      .values({
        productId,
        integrationId,
        status,
        reviewState,
        supportSummary: note,
        internalNotes: null,
        canonicalSource: source,
        firstSeenAt: now,
        lastConfirmedAt: now,
        createdAt: now,
        updatedAt: now,
      })
      .returning({ id: productIntegrationCompatibility.id })

    compatibilityId = createdCompatibility.id
    created = true
  } else {
    await db
      .update(productIntegrationCompatibility)
      .set({
        status,
        ...(existing.reviewState === 'pending' && reviewState === 'approved'
          ? { reviewState: 'approved' as const }
          : {}),
        supportSummary: note,
        canonicalSource: source,
        lastConfirmedAt: now,
        updatedAt: now,
      })
      .where(eq(productIntegrationCompatibility.id, compatibilityId))
  }

  await db
    .insert(compatibilityEvidence)
    .values({
      targetType: 'integration',
      productIntegrationCompatibilityId: compatibilityId,
      productHubCompatibilityId: null,
      source,
      sourceRecordKey,
      assertedStatus: status,
      note,
      metadata,
      importedAt: now,
      createdAt: now,
    })
    .onConflictDoNothing()

  return created
}

async function upsertHubCompatibility(
  productId: number,
  hubId: number,
  status: CanonicalStatus,
  reviewState: ReviewState,
  source: EvidenceSource,
  sourceRecordKey: string,
  note: string | null,
  metadata: Record<string, unknown>,
): Promise<boolean> {
  const now = new Date()
  const [existing] = await db
    .select({
      id: productHubCompatibility.id,
      reviewState: productHubCompatibility.reviewState,
    })
    .from(productHubCompatibility)
    .where(
      and(
        eq(productHubCompatibility.productId, productId),
        eq(productHubCompatibility.hubId, hubId),
      ),
    )
    .limit(1)

  let compatibilityId = existing?.id ?? null
  let created = false

  if (compatibilityId === null) {
    const [createdCompatibility] = await db
      .insert(productHubCompatibility)
      .values({
        productId,
        hubId,
        status,
        reviewState,
        supportSummary: note,
        internalNotes: null,
        canonicalSource: source,
        firstSeenAt: now,
        lastConfirmedAt: now,
        createdAt: now,
        updatedAt: now,
      })
      .returning({ id: productHubCompatibility.id })

    compatibilityId = createdCompatibility.id
    created = true
  } else {
    await db
      .update(productHubCompatibility)
      .set({
        status,
        ...(existing.reviewState === 'pending' && reviewState === 'approved'
          ? { reviewState: 'approved' as const }
          : {}),
        supportSummary: note,
        canonicalSource: source,
        lastConfirmedAt: now,
        updatedAt: now,
      })
      .where(eq(productHubCompatibility.id, compatibilityId))
  }

  await db
    .insert(compatibilityEvidence)
    .values({
      targetType: 'hub',
      productIntegrationCompatibilityId: null,
      productHubCompatibilityId: compatibilityId,
      source,
      sourceRecordKey,
      assertedStatus: status,
      note,
      metadata,
      importedAt: now,
      createdAt: now,
    })
    .onConflictDoNothing()

  return created
}

async function createCompatibilityRecordsForTargets(
  productId: number,
  targets: CompatibilityTarget[],
  status: CanonicalStatus,
  source: string,
  sourceRecordKey: string,
  defaultNote: string,
  metadata: Record<string, unknown>,
  options: {
    resolveReviewState?: (target: CompatibilityTarget) => ReviewState
  } = {},
): Promise<number> {
  await ensureCompatibilitySeeds()

  let createdCount = 0
  const evidenceSource = toEvidenceSource(source)

  for (const target of targets) {
    const note = target.note ?? defaultNote
    const reviewState = options.resolveReviewState?.(target) ?? 'pending'

    if (target.targetType === 'integration') {
      const integrationId = await getIntegrationIdBySlug(target.slug)

      if (integrationId === null) {
        continue
      }

      const created = await upsertIntegrationCompatibility(
        productId,
        integrationId,
        status,
        reviewState,
        evidenceSource,
        sourceRecordKey,
        note,
        metadata,
      )

      if (created) {
        createdCount++
      }

      continue
    }

    const hubId = await getCommercialHubIdBySlug(target.slug)

    if (hubId === null) {
      continue
    }

    const created = await upsertHubCompatibility(
      productId,
      hubId,
      status,
      reviewState,
      evidenceSource,
      sourceRecordKey,
      note,
      metadata,
    )

    if (created) {
      createdCount++
    }
  }

  return createdCount
}

/**
 * Create compatibility records for a product based on Blakadder compatibility codes.
 */
export async function createCompatibilityRecords(
  productId: number,
  compatibleWith: unknown,
  options: { sourceRecordKey?: string } = {},
): Promise<number> {
  const normalizedCodes = extractCompatibilityCodes(compatibleWith)

  if (normalizedCodes.length === 0) {
    return 0
  }

  const resolvedTargets = new Map<string, CompatibilityTarget>()
  const resolvedTargetMap = await resolveSourceCompatibilityTargets('blakadder', normalizedCodes)

  for (const code of normalizedCodes) {
    for (const target of resolvedTargetMap.get(code) ?? []) {
      resolvedTargets.set(`${target.targetType}:${target.slug}`, target)
    }
  }

  const defaultNote = `Compatible according to Blakadder: ${Array.from(resolvedTargets.values())
    .map((target) => target.label)
    .join(', ')} (${normalizedCodes.join(', ')})`

  return createCompatibilityRecordsForTargets(
    productId,
    Array.from(resolvedTargets.values()),
    'reported',
    'blakadder',
    options.sourceRecordKey ?? `blakadder:product:${productId}`,
    defaultNote,
    {
      compatibilityCodes: normalizedCodes,
    },
  )
}

export async function createSourceBackedCompatibilityRecords(
  productId: number,
  source: string,
  options: { sourceRecordKey?: string } = {},
): Promise<number> {
  const productProtocol = await getProductPrimaryProtocol(productId)

  return createCompatibilityRecordsForTargets(
    productId,
    SOURCE_COMPATIBILITY_TARGETS[source] ?? [],
    'supported',
    source,
    options.sourceRecordKey ?? `${source}:product:${productId}`,
    `Imported from ${source} source data: device definition is present in the upstream integration database.`,
    {
      importedFrom: source,
    },
    {
      resolveReviewState: (target) =>
        determineAutoApprovalReviewState({
          source,
          target,
          status: 'supported',
          productProtocol,
        }),
    },
  )
}

export function clearHubCache() {
  integrationIdCache.clear()
  commercialHubIdCache.clear()
  platformIdCache.clear()
  manufacturerIdCache.clear()
  compatibilitySeedsEnsured = false
}
