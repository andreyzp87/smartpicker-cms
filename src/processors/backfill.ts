import { db } from '../db/client'
import { products, rawImports } from '../db/schema'
import { eq } from 'drizzle-orm'
import { createCompatibilityRecords } from './compatibility'
import { logger } from '../lib/logger'

function getCompatibilityCodes(value: unknown): string[] {
  if (
    typeof value === 'object' &&
    value !== null &&
    'compatible' in value &&
    Array.isArray(value.compatible)
  ) {
    return value.compatible.filter((item): item is string => typeof item === 'string')
  }

  return []
}

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
    const compatible = getCompatibilityCodes(product.compatible)

    if (compatible.length > 0) {
      const created = await createCompatibilityRecords(product.productId, compatible)
      totalCreated += created
    }

    processed++

    if (processed % 100 === 0) {
      logger.info({ processed, total: blakadderProducts.length }, 'Backfill progress')
    }
  }

  return { processed, created: totalCreated }
}
