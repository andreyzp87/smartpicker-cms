import { db } from '../db/client'
import { products, manufacturers, rawImports } from '../db/schema'
import { eq, isNotNull, sql } from 'drizzle-orm'
import { generateMatchKey, matchKeyToString, MatchKey } from './matcher'

export interface ProductWithSource {
  id: number
  slug: string
  name: string
  model: string | null
  manufacturerId: number
  manufacturerName: string
  primarySourceId: number
  source: string
}

export interface DuplicateGroup {
  matchKey: MatchKey
  products: ProductWithSource[]
}

/**
 * Find all products that have duplicates based on manufacturer + model matching
 */
export async function findDuplicates(): Promise<DuplicateGroup[]> {
  // Get all products with their manufacturers and source info
  const allProducts = await db
    .select({
      id: products.id,
      slug: products.slug,
      name: products.name,
      model: products.model,
      manufacturerId: products.manufacturerId,
      manufacturerName: manufacturers.name,
      primarySourceId: products.primarySourceId,
      source: rawImports.source,
    })
    .from(products)
    .innerJoin(manufacturers, eq(products.manufacturerId, manufacturers.id))
    .leftJoin(rawImports, eq(products.primarySourceId, rawImports.id))
    .where(isNotNull(products.model)) // Only consider products with models

  // Group products by match key
  const groupedByMatchKey = new Map<string, ProductWithSource[]>()

  for (const product of allProducts) {
    const matchKey = generateMatchKey(product.manufacturerName, product.model)

    if (!matchKey) continue

    const keyString = matchKeyToString(matchKey)

    if (!groupedByMatchKey.has(keyString)) {
      groupedByMatchKey.set(keyString, [])
    }

    groupedByMatchKey.get(keyString)!.push(product as ProductWithSource)
  }

  // Filter to only groups with duplicates (2+ products)
  const duplicateGroups: DuplicateGroup[] = []

  for (const productList of groupedByMatchKey.values()) {
    if (productList.length > 1) {
      // Reconstruct match key from the first product
      const firstProduct = productList[0]
      const matchKey = generateMatchKey(firstProduct.manufacturerName, firstProduct.model)

      if (matchKey) {
        duplicateGroups.push({
          matchKey,
          products: productList,
        })
      }
    }
  }

  // Sort by number of duplicates (most duplicates first)
  duplicateGroups.sort((a, b) => b.products.length - a.products.length)

  return duplicateGroups
}

/**
 * Get statistics about duplicates
 */
export async function getDuplicateStats(): Promise<{
  totalProducts: number
  productsWithModel: number
  duplicateGroups: number
  totalDuplicates: number
  potentialMerges: number
}> {
  const [stats] = await db
    .select({
      totalProducts: sql<number>`COUNT(*)`,
      productsWithModel: sql<number>`COUNT(CASE WHEN ${products.model} IS NOT NULL THEN 1 END)`,
    })
    .from(products)

  const duplicateGroups = await findDuplicates()
  const totalDuplicates = duplicateGroups.reduce((sum, group) => sum + group.products.length, 0)
  const potentialMerges = duplicateGroups.reduce(
    (sum, group) => sum + (group.products.length - 1),
    0,
  )

  return {
    totalProducts: stats.totalProducts,
    productsWithModel: stats.productsWithModel,
    duplicateGroups: duplicateGroups.length,
    totalDuplicates,
    potentialMerges,
  }
}
