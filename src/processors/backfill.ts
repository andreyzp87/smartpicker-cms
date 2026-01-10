import { db } from '../db/client'
import { products, rawImports } from '../db/schema'
import { eq } from 'drizzle-orm'
import { createCompatibilityRecords } from './compatibility'

/**
 * Backfill compatibility records for products from Blakadder source
 * that have compatible data in their raw imports
 */
export async function backfillCompatibility(): Promise<{ processed: number; created: number }> {
  // Get all products from Blakadder source
  const blakadderProducts = await db
    .select({
      productId: products.id,
      rawImportId: rawImports.id,
      compatible: rawImports.data,
    })
    .from(products)
    .innerJoin(rawImports, eq(products.primarySourceId, rawImports.id))
    .where(eq(rawImports.source, 'blakadder'))

  let processed = 0
  let totalCreated = 0

  for (const product of blakadderProducts) {
    const compatible = product.compatible?.compatible as string[] | undefined

    if (compatible && compatible.length > 0) {
      const created = await createCompatibilityRecords(product.productId, compatible)
      totalCreated += created
    }

    processed++

    if (processed % 100 === 0) {
      console.log(`   Processed ${processed}/${blakadderProducts.length} products...`)
    }
  }

  return { processed, created: totalCreated }
}
