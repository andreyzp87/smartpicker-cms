import { db } from '../db/client'
import { integrations, productIntegrationCompatibility, products, rawImports } from '../db/schema'
import { and, eq, inArray, isNotNull, or } from 'drizzle-orm'
import {
  createCompatibilityRecords,
  createSourceBackedCompatibilityRecords,
  extractCompatibilityCodes,
} from './compatibility'
import { autoPublishProductIfEligible } from './publishing'
import { logger } from '../lib/logger'

const APPROVAL_BACKFILL_BATCH_SIZE = 500

/**
 * Backfill compatibility records for products from Blakadder source
 * that have compatible data in their raw imports
 */
export async function backfillCompatibility(): Promise<{
  processed: number
  created: number
  autoPublished: number
}> {
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
  let totalAutoPublished = 0

  for (const rawImport of linkedImports) {
    if (rawImport.productId === null) {
      processed++
      continue
    }

    if (rawImport.source === 'blakadder') {
      const compatible = extractCompatibilityCodes(rawImport.compatible)

      if (compatible.length > 0) {
        const created = await createCompatibilityRecords(rawImport.productId, compatible, {
          sourceRecordKey: `${rawImport.source}:${rawImport.rawImportId}`,
        })
        totalCreated += created
      }
    }

    totalCreated += await createSourceBackedCompatibilityRecords(rawImport.productId, rawImport.source, {
      sourceRecordKey: `${rawImport.source}:${rawImport.rawImportId}`,
    })

    if (await autoPublishProductIfEligible(rawImport.productId)) {
      totalAutoPublished += 1
    }

    processed++

    if (processed % 100 === 0) {
      logger.info({ processed, total: linkedImports.length }, 'Backfill progress')
    }
  }

  return { processed, created: totalCreated, autoPublished: totalAutoPublished }
}

/**
 * Auto-approve source-backed compatibility rows that match the MVP policy:
 * - Zigbee2MQTT supported rows on Zigbee products
 * - Z-Wave JS supported rows on Z-Wave products
 */
export async function backfillCompatibilityApprovals(): Promise<{
  eligible: number
  approved: number
}> {
  const eligibleRows = await db
    .select({
      id: productIntegrationCompatibility.id,
    })
    .from(productIntegrationCompatibility)
    .innerJoin(products, eq(productIntegrationCompatibility.productId, products.id))
    .innerJoin(integrations, eq(productIntegrationCompatibility.integrationId, integrations.id))
    .where(
      and(
        eq(productIntegrationCompatibility.reviewState, 'pending'),
        eq(productIntegrationCompatibility.status, 'supported'),
        or(
          and(
            eq(productIntegrationCompatibility.canonicalSource, 'zigbee2mqtt'),
            eq(integrations.slug, 'zigbee2mqtt'),
            eq(products.primaryProtocol, 'zigbee'),
          ),
          and(
            eq(productIntegrationCompatibility.canonicalSource, 'zwave_js'),
            eq(integrations.slug, 'zwave-js'),
            eq(products.primaryProtocol, 'zwave'),
          ),
        ),
      ),
    )

  const eligibleIds = eligibleRows.map((row) => row.id)

  if (eligibleIds.length === 0) {
    return {
      eligible: 0,
      approved: 0,
    }
  }

  let approved = 0

  for (let index = 0; index < eligibleIds.length; index += APPROVAL_BACKFILL_BATCH_SIZE) {
    const batchIds = eligibleIds.slice(index, index + APPROVAL_BACKFILL_BATCH_SIZE)
    const updatedRows = await db
      .update(productIntegrationCompatibility)
      .set({
        reviewState: 'approved',
        updatedAt: new Date(),
      })
      .where(inArray(productIntegrationCompatibility.id, batchIds))
      .returning({ id: productIntegrationCompatibility.id })

    approved += updatedRows.length
  }

  return {
    eligible: eligibleIds.length,
    approved,
  }
}
