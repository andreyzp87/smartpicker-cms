import { db } from '../db/client'
import { manufacturers } from '../db/schema'
import { eq, sql } from 'drizzle-orm'
import slugify from 'slugify'

// Cache to avoid redundant database lookups
const manufacturerCache = new Map<string, number>()

/**
 * Normalize manufacturer name for matching
 * Handles common variations and inconsistencies
 */
function normalizeManufacturerName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ') // Normalize whitespace
    .replace(/[^\w\s-]/g, '') // Remove special chars except hyphen
}

/**
 * Find or create manufacturer by name
 * Uses fuzzy matching to handle name variations
 */
export async function findOrCreateManufacturer(vendorName: string): Promise<number> {
  const normalized = normalizeManufacturerName(vendorName)

  // Check cache first
  if (manufacturerCache.has(normalized)) {
    return manufacturerCache.get(normalized)!
  }

  // Try exact match on normalized name (case-insensitive)
  const existing = await db
    .select()
    .from(manufacturers)
    .where(sql`LOWER(${manufacturers.name}) = ${normalized}`)
    .limit(1)

  if (existing.length > 0) {
    manufacturerCache.set(normalized, existing[0].id)
    return existing[0].id
  }

  // Create new manufacturer
  const slug = slugify(vendorName, { lower: true, strict: true })

  // Handle slug conflicts by appending a number
  let uniqueSlug = slug
  let counter = 1
  while (true) {
    const conflict = await db
      .select()
      .from(manufacturers)
      .where(eq(manufacturers.slug, uniqueSlug))
      .limit(1)

    if (conflict.length === 0) break
    uniqueSlug = `${slug}-${counter}`
    counter++
  }

  const [newManufacturer] = await db
    .insert(manufacturers)
    .values({
      name: vendorName,
      slug: uniqueSlug,
    })
    .returning()

  manufacturerCache.set(normalized, newManufacturer.id)
  return newManufacturer.id
}

/**
 * Clear the manufacturer cache (useful for testing)
 */
export function clearManufacturerCache() {
  manufacturerCache.clear()
}
