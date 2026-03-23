import { db } from '../db/client'
import { rawImports } from '../db/schema'
import { and, inArray, isNotNull } from 'drizzle-orm'
import {
  createCompatibilityRecords,
  createSourceBackedCompatibilityRecords,
  extractCompatibilityCodes,
} from './compatibility'
import { logger } from '../lib/logger'

/**
 * Backfill compatibility records for products from Blakadder source
 * that have compatible data in their raw imports
 */
export async function backfillCompatibility(): Promise<{ processed: number; created: number }> {
  // Walk all linked source imports that can contribute compatibility.
  const linkedImports = await db
    .select({
      productId: rawImports.productId,
      rawImportId: rawImports.id,
      source: rawImports.source,
      compatible: rawImports.data,
    })
    .from(rawImports)
    .where(
      and(
        isNotNull(rawImports.productId),
        inArray(rawImports.source, ['blakadder', 'zigbee2mqtt', 'zwave-js']),
      ),
    )

  let processed = 0
  let totalCreated = 0

  for (const rawImport of linkedImports) {
    if (rawImport.productId === null) {
      processed++
      continue
    }

    if (rawImport.source === 'blakadder') {
      const compatible = extractCompatibilityCodes(rawImport.compatible)

      if (compatible.length > 0) {
        const created = await createCompatibilityRecords(rawImport.productId, compatible)
        totalCreated += created
      }
    }

    totalCreated += await createSourceBackedCompatibilityRecords(rawImport.productId, rawImport.source)

    processed++

    if (processed % 100 === 0) {
      logger.info({ processed, total: linkedImports.length }, 'Backfill progress')
    }
  }

  return { processed, created: totalCreated }
}
