import { db } from '../db/client'
import { hubs, deviceCompatibility } from '../db/schema'
import { eq, and } from 'drizzle-orm'

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
const COMPATIBILITY_MAP: Record<string, string[]> = {
  z2m: ['home-assistant-generic'], // Zigbee2MQTT runs on Home Assistant
  zha: ['home-assistant-generic'], // ZHA is built into Home Assistant
  z4d: [], // Domoticz not in our hub list (skip for MVP)
  deconz: [], // deCONZ not in our hub list (skip for MVP)
  tasmota: [], // Tasmota is firmware, not a hub (skip)
  iob: [], // ioBroker not in our hub list (skip for MVP)
}

// Cache hub IDs by slug
const hubIdCache = new Map<string, number>()

/**
 * Get hub ID by slug with caching
 */
async function getHubIdBySlug(slug: string): Promise<number | null> {
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
  if (!compatibleWith || compatibleWith.length === 0) {
    return 0
  }

  let count = 0
  const hubSlugsToCreate = new Set<string>()

  // Map compatibility codes to hub slugs
  for (const code of compatibleWith) {
    const hubSlugs = COMPATIBILITY_MAP[code] || []
    hubSlugs.forEach((slug) => hubSlugsToCreate.add(slug))
  }

  // Create compatibility records
  for (const hubSlug of hubSlugsToCreate) {
    const hubId = await getHubIdBySlug(hubSlug)
    if (!hubId) continue

    // Check if compatibility record already exists
    const existing = await db
      .select()
      .from(deviceCompatibility)
      .where(and(
        eq(deviceCompatibility.productId, productId),
        eq(deviceCompatibility.hubId, hubId)
      ))
      .limit(1)

    if (existing.length > 0) continue

    // Create new compatibility record
    await db.insert(deviceCompatibility).values({
      productId,
      hubId,
      status: 'reported', // Blakadder data is community-reported, not verified
      source: 'blakadder',
      notes: `Compatible according to Blakadder: ${compatibleWith.join(', ')}`,
    })

    count++
  }

  return count
}

/**
 * Clear the hub ID cache (useful for testing)
 */
export function clearHubCache() {
  hubIdCache.clear()
}
