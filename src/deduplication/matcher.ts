/**
 * Match key generation and normalization for deduplication
 */

export interface MatchKey {
  normalizedManufacturer: string
  normalizedModel: string
}

/**
 * Normalize a string for matching
 * Removes all non-alphanumeric characters and converts to lowercase
 */
export function normalize(str: string | null | undefined): string {
  if (!str) return ''

  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w]/g, '') // Remove all non-alphanumeric (spaces, dashes, dots, etc)
}

/**
 * Generate a match key from manufacturer and model
 */
export function generateMatchKey(manufacturer: string, model: string | null): MatchKey | null {
  const normalizedManufacturer = normalize(manufacturer)
  const normalizedModel = normalize(model)

  // Require both manufacturer and model for matching
  if (!normalizedManufacturer || !normalizedModel) {
    return null
  }

  return {
    normalizedManufacturer,
    normalizedModel,
  }
}

/**
 * Convert match key to string for grouping
 */
export function matchKeyToString(key: MatchKey): string {
  return `${key.normalizedManufacturer}___${key.normalizedModel}`
}

/**
 * Check if two match keys are equal
 */
export function matchKeysEqual(key1: MatchKey | null, key2: MatchKey | null): boolean {
  if (!key1 || !key2) return false

  return (
    key1.normalizedManufacturer === key2.normalizedManufacturer &&
    key1.normalizedModel === key2.normalizedModel
  )
}
