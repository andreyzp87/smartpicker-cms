import { ProductWithSource } from './finder'

/**
 * Source priority for determining canonical product
 * Higher number = higher priority
 */
const SOURCE_PRIORITY: Record<string, number> = {
  zigbee2mqtt: 3, // Most detailed exposes data
  'zwave-js': 2, // Official Z-Wave device database
  blakadder: 1, // Community-curated
}

/**
 * Pick the canonical product from a group of duplicates
 *
 * Priority:
 * 1. Source priority (zigbee2mqtt > zwave-js > blakadder)
 * 2. Lowest product ID (oldest product)
 */
export function pickCanonicalProduct(products: ProductWithSource[]): ProductWithSource {
  if (products.length === 0) {
    throw new Error('Cannot pick canonical product from empty list')
  }

  if (products.length === 1) {
    return products[0]
  }

  // Sort by priority
  const sorted = [...products].sort((a, b) => {
    // 1. Compare source priority
    const aPriority = a.source ? (SOURCE_PRIORITY[a.source] ?? 0) : 0
    const bPriority = b.source ? (SOURCE_PRIORITY[b.source] ?? 0) : 0

    if (aPriority !== bPriority) {
      return bPriority - aPriority // Higher priority first
    }

    // 2. Compare by ID (lower ID = older product)
    return a.id - b.id
  })

  return sorted[0]
}

/**
 * Determine which source should be marked as primary for a canonical product
 */
export function determinePrimarySource(
  canonicalProduct: ProductWithSource,
  allProducts: ProductWithSource[],
): number | null {
  if (canonicalProduct.primarySourceId !== null) {
    return canonicalProduct.primarySourceId
  }

  const sourceBackedProducts = allProducts.filter(
    (product) => product.primarySourceId !== null,
  )

  if (sourceBackedProducts.length === 0) {
    return null
  }

  return pickCanonicalProduct(sourceBackedProducts).primarySourceId
}

/**
 * Get all non-canonical products (duplicates to be merged)
 */
export function getDuplicates(
  canonical: ProductWithSource,
  allProducts: ProductWithSource[],
): ProductWithSource[] {
  return allProducts.filter((p) => p.id !== canonical.id)
}
