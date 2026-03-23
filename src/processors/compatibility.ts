import { db } from '../db/client'
import { deviceCompatibility, hubs, manufacturers } from '../db/schema'
import { and, eq } from 'drizzle-orm'

interface CompatibilityTarget {
  hubSlug: string
  integrationName: string
  label: string
  note?: string
}

interface CompatibilityHubSeed {
  slug: string
  name: string
  manufacturerSlug: string | null
  protocolsSupported: string[]
  description: string
}

/**
 * Mapping of Blakadder compatibility codes to hub slugs
 *
 * Blakadder compatibility codes:
 * - z2m: Zigbee2MQTT (Home Assistant integration or standalone)
 * - zha: Zigbee Home Automation (Home Assistant built-in)
 * - z4d: Zigbee for Domoticz
 * - deconz: deCONZ/Phoscon
 * - tasmota: Tasmota firmware
 * - iob: ioBroker
 */
const COMPATIBILITY_MAP: Record<string, CompatibilityTarget[]> = {
  z2m: [
    {
      hubSlug: 'home-assistant-generic',
      integrationName: 'Zigbee2MQTT',
      label: 'Zigbee2MQTT',
    },
  ],
  zha: [
    {
      hubSlug: 'home-assistant-generic',
      integrationName: 'ZHA',
      label: 'ZHA',
    },
  ],
  z4d: [
    {
      hubSlug: 'domoticz',
      integrationName: 'Zigbee for Domoticz',
      label: 'Zigbee for Domoticz',
    },
  ],
  deconz: [
    {
      hubSlug: 'deconz-phoscon',
      integrationName: 'deCONZ',
      label: 'deCONZ / Phoscon',
    },
  ],
  iob: [
    {
      hubSlug: 'iobroker',
      integrationName: 'ioBroker Zigbee',
      label: 'ioBroker Zigbee',
    },
  ],
  ihost: [
    {
      hubSlug: 'sonoff-ihost',
      integrationName: 'SONOFF iHost',
      label: 'SONOFF iHost',
    },
  ],
  tasmota: [],
}

const COMPATIBILITY_HUBS: CompatibilityHubSeed[] = [
  {
    slug: 'deconz-phoscon',
    name: 'deCONZ / Phoscon',
    manufacturerSlug: null,
    protocolsSupported: ['zigbee'],
    description: 'deCONZ and Phoscon-based Zigbee platform compatibility imported from Blakadder.',
  },
  {
    slug: 'domoticz',
    name: 'Domoticz',
    manufacturerSlug: null,
    protocolsSupported: ['zigbee'],
    description: 'Domoticz compatibility, including Zigbee for Domoticz integrations imported from Blakadder.',
  },
  {
    slug: 'iobroker',
    name: 'ioBroker',
    manufacturerSlug: null,
    protocolsSupported: ['zigbee'],
    description: 'ioBroker Zigbee platform compatibility imported from Blakadder.',
  },
  {
    slug: 'sonoff-ihost',
    name: 'SONOFF iHost',
    manufacturerSlug: 'sonoff',
    protocolsSupported: ['zigbee'],
    description: 'SONOFF iHost local Zigbee platform compatibility imported from Blakadder.',
  },
]

const SOURCE_COMPATIBILITY_MAP: Record<string, CompatibilityTarget[]> = {
  zigbee2mqtt: [
    {
      hubSlug: 'home-assistant-generic',
      integrationName: 'Zigbee2MQTT',
      label: 'Zigbee2MQTT',
    },
  ],
  'zwave-js': [
    {
      hubSlug: 'home-assistant-generic',
      integrationName: 'Z-Wave JS',
      label: 'Z-Wave JS',
    },
    {
      hubSlug: 'hubitat-elevation',
      integrationName: 'Z-Wave',
      label: 'Hubitat Elevation',
      note: 'Inferred from zwave-js source data and Hubitat Elevation Z-Wave hub support.',
    },
    {
      hubSlug: 'smartthings-hub-v3',
      integrationName: 'Z-Wave',
      label: 'SmartThings Hub v3',
      note: 'Inferred from zwave-js source data and SmartThings Hub v3 Z-Wave hub support.',
    },
    {
      hubSlug: 'homey-pro-2023',
      integrationName: 'Z-Wave',
      label: 'Homey Pro (2023)',
      note: 'Inferred from zwave-js source data and Homey Pro (2023) Z-Wave hub support.',
    },
  ],
}

// Cache hub IDs by slug
const hubIdCache = new Map<string, number>()
let compatibilityHubsEnsured = false

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

async function ensureCompatibilityHubs(): Promise<void> {
  if (compatibilityHubsEnsured) {
    return
  }

  const manufacturerBySlug = new Map<string, number>()

  for (const hub of COMPATIBILITY_HUBS) {
    let manufacturerId: number | null = null

    if (hub.manufacturerSlug) {
      if (manufacturerBySlug.has(hub.manufacturerSlug)) {
        manufacturerId = manufacturerBySlug.get(hub.manufacturerSlug) ?? null
      } else {
        const [manufacturer] = await db
          .select({
            id: manufacturers.id,
          })
          .from(manufacturers)
          .where(eq(manufacturers.slug, hub.manufacturerSlug))
          .limit(1)

        manufacturerId = manufacturer?.id ?? null
        if (manufacturerId !== null) {
          manufacturerBySlug.set(hub.manufacturerSlug, manufacturerId)
        }
      }
    }

    await db
      .insert(hubs)
      .values({
        slug: hub.slug,
        name: hub.name,
        manufacturerId,
        protocolsSupported: hub.protocolsSupported,
        description: hub.description,
      })
      .onConflictDoUpdate({
        target: hubs.slug,
        set: {
          name: hub.name,
          manufacturerId,
          protocolsSupported: hub.protocolsSupported,
          description: hub.description,
        },
      })
  }

  compatibilityHubsEnsured = true
}

/**
 * Get hub ID by slug with caching
 */
async function getHubIdBySlug(slug: string): Promise<number | null> {
  await ensureCompatibilityHubs()

  if (hubIdCache.has(slug)) {
    return hubIdCache.get(slug)!
  }

  const [hub] = await db.select().from(hubs).where(eq(hubs.slug, slug)).limit(1)

  if (hub) {
    hubIdCache.set(slug, hub.id)
    return hub.id
  }

  return null
}

async function createCompatibilityRecordsForTargets(
  productId: number,
  targets: CompatibilityTarget[],
  status: 'reported' | 'inferred',
  source: string,
  defaultNote: string,
): Promise<number> {
  if (targets.length === 0) {
    return 0
  }

  let count = 0

  for (const target of targets) {
    const hubId = await getHubIdBySlug(target.hubSlug)
    if (!hubId) continue

    const existing = await db
      .select()
      .from(deviceCompatibility)
      .where(
        and(
          eq(deviceCompatibility.productId, productId),
          eq(deviceCompatibility.hubId, hubId),
          eq(deviceCompatibility.integrationName, target.integrationName),
        ),
      )
      .limit(1)

    if (existing.length > 0) continue

    await db.insert(deviceCompatibility).values({
      productId,
      hubId,
      integrationName: target.integrationName,
      status,
      source,
      notes: target.note ?? defaultNote,
    })

    count++
  }

  return count
}

/**
 * Create compatibility records for a product based on Blakadder compatibility codes
 *
 * @param productId The product ID to create compatibility records for
 * @param compatibleWith Array of Blakadder compatibility codes (e.g., ["z2m", "zha"])
 * @returns Number of compatibility records created
 */
export async function createCompatibilityRecords(
  productId: number,
  compatibleWith: string[],
): Promise<number> {
  const normalizedCodes = extractCompatibilityCodes(compatibleWith)

  if (normalizedCodes.length === 0) {
    return 0
  }

  let count = 0
  const targetsToCreate = new Map<string, CompatibilityTarget>()

  // Map compatibility codes to hub slugs
  for (const code of normalizedCodes) {
    const targets = COMPATIBILITY_MAP[code] || []
    for (const target of targets) {
      targetsToCreate.set(`${target.hubSlug}:${target.integrationName}`, target)
    }
  }

  // Create compatibility records
  count += await createCompatibilityRecordsForTargets(
    productId,
    Array.from(targetsToCreate.values()),
    'reported',
    'blakadder',
    `Compatible according to Blakadder: ${Array.from(targetsToCreate.values())
      .map((target) => target.label)
      .join(', ')} (${normalizedCodes.join(', ')})`,
  )

  return count
}

export async function createSourceBackedCompatibilityRecords(
  productId: number,
  source: string,
): Promise<number> {
  const targets = SOURCE_COMPATIBILITY_MAP[source] ?? []

  return createCompatibilityRecordsForTargets(
    productId,
    targets,
    'inferred',
    source,
    `Inferred from ${source} source data: device definition is present in the upstream integration database.`,
  )
}

/**
 * Clear the hub ID cache (useful for testing)
 */
export function clearHubCache() {
  hubIdCache.clear()
  compatibilityHubsEnsured = false
}
