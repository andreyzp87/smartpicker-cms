import { db } from '../db/client'
import {
  compatibilityEvidence,
  productHubCompatibility,
  productIntegrationCompatibility,
  productSources,
  products,
  rawImports,
  zigbeeDetails,
  zwaveDetails,
} from '../db/schema'
import { eq } from 'drizzle-orm'
import { logger } from '../lib/logger'
import { findDuplicates, type ProductWithSource } from './finder'
import { pickCanonicalProduct, getDuplicates, determinePrimarySource } from './picker'

export interface DeduplicationResult {
  duplicateGroups: number
  productsKept: number
  productsDeleted: number
  productSourcesCreated: number
}

export interface DeduplicationOptions {
  dryRun?: boolean
  verbose?: boolean
}

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0]
type IntegrationCompatibilityRow = typeof productIntegrationCompatibility.$inferSelect

const REVIEW_STATE_PRIORITY: Record<IntegrationCompatibilityRow['reviewState'], number> = {
  rejected: 0,
  pending: 1,
  approved: 2,
}

const COMPATIBILITY_STATUS_PRIORITY: Record<IntegrationCompatibilityRow['status'], number> = {
  untested: 1,
  incompatible: 2,
  reported: 3,
  supported: 4,
  verified: 5,
}

function getEarlierDate(first: Date | null, second: Date | null): Date | null {
  if (!first) {
    return second
  }

  if (!second) {
    return first
  }

  return first.getTime() <= second.getTime() ? first : second
}

function getLaterDate(first: Date | null, second: Date | null): Date | null {
  if (!first) {
    return second
  }

  if (!second) {
    return first
  }

  return first.getTime() >= second.getTime() ? first : second
}

function shouldPreferCandidate<
  T extends Pick<
    IntegrationCompatibilityRow,
    'reviewState' | 'canonicalSource' | 'status'
  >,
>(existing: T, candidate: T): boolean {
  const reviewStateDelta =
    REVIEW_STATE_PRIORITY[candidate.reviewState] - REVIEW_STATE_PRIORITY[existing.reviewState]

  if (reviewStateDelta !== 0) {
    return reviewStateDelta > 0
  }

  const existingIsManual = existing.canonicalSource === 'manual'
  const candidateIsManual = candidate.canonicalSource === 'manual'

  if (existingIsManual !== candidateIsManual) {
    return candidateIsManual
  }

  return COMPATIBILITY_STATUS_PRIORITY[candidate.status] > COMPATIBILITY_STATUS_PRIORITY[existing.status]
}

async function reassignIntegrationEvidence(
  tx: Transaction,
  sourceCompatibilityId: number,
  targetCompatibilityId: number,
): Promise<void> {
  const existingEvidence = await tx
    .select({
      id: compatibilityEvidence.id,
      source: compatibilityEvidence.source,
      sourceRecordKey: compatibilityEvidence.sourceRecordKey,
    })
    .from(compatibilityEvidence)
    .where(eq(compatibilityEvidence.productIntegrationCompatibilityId, targetCompatibilityId))

  const existingKeys = new Set(
    existingEvidence.map((entry) => `${entry.source}:${entry.sourceRecordKey}`),
  )

  const sourceEvidence = await tx
    .select({
      id: compatibilityEvidence.id,
      source: compatibilityEvidence.source,
      sourceRecordKey: compatibilityEvidence.sourceRecordKey,
    })
    .from(compatibilityEvidence)
    .where(eq(compatibilityEvidence.productIntegrationCompatibilityId, sourceCompatibilityId))

  for (const entry of sourceEvidence) {
    const evidenceKey = `${entry.source}:${entry.sourceRecordKey}`

    if (existingKeys.has(evidenceKey)) {
      await tx.delete(compatibilityEvidence).where(eq(compatibilityEvidence.id, entry.id))
      continue
    }

    await tx
      .update(compatibilityEvidence)
      .set({
        productIntegrationCompatibilityId: targetCompatibilityId,
      })
      .where(eq(compatibilityEvidence.id, entry.id))

    existingKeys.add(evidenceKey)
  }
}

async function reassignHubEvidence(
  tx: Transaction,
  sourceCompatibilityId: number,
  targetCompatibilityId: number,
): Promise<void> {
  const existingEvidence = await tx
    .select({
      id: compatibilityEvidence.id,
      source: compatibilityEvidence.source,
      sourceRecordKey: compatibilityEvidence.sourceRecordKey,
    })
    .from(compatibilityEvidence)
    .where(eq(compatibilityEvidence.productHubCompatibilityId, targetCompatibilityId))

  const existingKeys = new Set(
    existingEvidence.map((entry) => `${entry.source}:${entry.sourceRecordKey}`),
  )

  const sourceEvidence = await tx
    .select({
      id: compatibilityEvidence.id,
      source: compatibilityEvidence.source,
      sourceRecordKey: compatibilityEvidence.sourceRecordKey,
    })
    .from(compatibilityEvidence)
    .where(eq(compatibilityEvidence.productHubCompatibilityId, sourceCompatibilityId))

  for (const entry of sourceEvidence) {
    const evidenceKey = `${entry.source}:${entry.sourceRecordKey}`

    if (existingKeys.has(evidenceKey)) {
      await tx.delete(compatibilityEvidence).where(eq(compatibilityEvidence.id, entry.id))
      continue
    }

    await tx
      .update(compatibilityEvidence)
      .set({
        productHubCompatibilityId: targetCompatibilityId,
      })
      .where(eq(compatibilityEvidence.id, entry.id))

    existingKeys.add(evidenceKey)
  }
}

async function mergeIntegrationCompatibilityRows(
  tx: Transaction,
  canonical: ProductWithSource,
  duplicates: ProductWithSource[],
): Promise<void> {
  const canonicalRows = await tx
    .select()
    .from(productIntegrationCompatibility)
    .where(eq(productIntegrationCompatibility.productId, canonical.id))

  const compatibilityByIntegrationId = new Map(
    canonicalRows.map((row) => [row.integrationId, row]),
  )

  for (const duplicate of duplicates) {
    const duplicateRows = await tx
      .select()
      .from(productIntegrationCompatibility)
      .where(eq(productIntegrationCompatibility.productId, duplicate.id))

    for (const duplicateRow of duplicateRows) {
      const existingRow = compatibilityByIntegrationId.get(duplicateRow.integrationId)

      if (!existingRow) {
        const [movedRow] = await tx
          .update(productIntegrationCompatibility)
          .set({ productId: canonical.id })
          .where(eq(productIntegrationCompatibility.id, duplicateRow.id))
          .returning()

        compatibilityByIntegrationId.set(duplicateRow.integrationId, movedRow)
        continue
      }

      await reassignIntegrationEvidence(tx, duplicateRow.id, existingRow.id)

      const preferDuplicate = shouldPreferCandidate(existingRow, duplicateRow)
      const [mergedRow] = await tx
        .update(productIntegrationCompatibility)
        .set({
          status: preferDuplicate ? duplicateRow.status : existingRow.status,
          reviewState: preferDuplicate ? duplicateRow.reviewState : existingRow.reviewState,
          supportSummary: preferDuplicate
            ? (duplicateRow.supportSummary ?? existingRow.supportSummary)
            : (existingRow.supportSummary ?? duplicateRow.supportSummary),
          internalNotes: preferDuplicate
            ? (duplicateRow.internalNotes ?? existingRow.internalNotes)
            : (existingRow.internalNotes ?? duplicateRow.internalNotes),
          canonicalSource: preferDuplicate ? duplicateRow.canonicalSource : existingRow.canonicalSource,
          firstSeenAt: getEarlierDate(existingRow.firstSeenAt, duplicateRow.firstSeenAt),
          lastConfirmedAt: getLaterDate(existingRow.lastConfirmedAt, duplicateRow.lastConfirmedAt),
          updatedAt: getLaterDate(existingRow.updatedAt, duplicateRow.updatedAt) ?? new Date(),
        })
        .where(eq(productIntegrationCompatibility.id, existingRow.id))
        .returning()

      await tx
        .delete(productIntegrationCompatibility)
        .where(eq(productIntegrationCompatibility.id, duplicateRow.id))

      compatibilityByIntegrationId.set(duplicateRow.integrationId, mergedRow)
    }
  }
}

async function mergeHubCompatibilityRows(
  tx: Transaction,
  canonical: ProductWithSource,
  duplicates: ProductWithSource[],
): Promise<void> {
  const canonicalRows = await tx
    .select()
    .from(productHubCompatibility)
    .where(eq(productHubCompatibility.productId, canonical.id))

  const compatibilityByHubId = new Map(canonicalRows.map((row) => [row.hubId, row]))

  for (const duplicate of duplicates) {
    const duplicateRows = await tx
      .select()
      .from(productHubCompatibility)
      .where(eq(productHubCompatibility.productId, duplicate.id))

    for (const duplicateRow of duplicateRows) {
      const existingRow = compatibilityByHubId.get(duplicateRow.hubId)

      if (!existingRow) {
        const [movedRow] = await tx
          .update(productHubCompatibility)
          .set({ productId: canonical.id })
          .where(eq(productHubCompatibility.id, duplicateRow.id))
          .returning()

        compatibilityByHubId.set(duplicateRow.hubId, movedRow)
        continue
      }

      await reassignHubEvidence(tx, duplicateRow.id, existingRow.id)

      const preferDuplicate = shouldPreferCandidate(existingRow, duplicateRow)
      const [mergedRow] = await tx
        .update(productHubCompatibility)
        .set({
          status: preferDuplicate ? duplicateRow.status : existingRow.status,
          reviewState: preferDuplicate ? duplicateRow.reviewState : existingRow.reviewState,
          supportSummary: preferDuplicate
            ? (duplicateRow.supportSummary ?? existingRow.supportSummary)
            : (existingRow.supportSummary ?? duplicateRow.supportSummary),
          internalNotes: preferDuplicate
            ? (duplicateRow.internalNotes ?? existingRow.internalNotes)
            : (existingRow.internalNotes ?? duplicateRow.internalNotes),
          canonicalSource: preferDuplicate ? duplicateRow.canonicalSource : existingRow.canonicalSource,
          firstSeenAt: getEarlierDate(existingRow.firstSeenAt, duplicateRow.firstSeenAt),
          lastConfirmedAt: getLaterDate(existingRow.lastConfirmedAt, duplicateRow.lastConfirmedAt),
          updatedAt: getLaterDate(existingRow.updatedAt, duplicateRow.updatedAt) ?? new Date(),
        })
        .where(eq(productHubCompatibility.id, existingRow.id))
        .returning()

      await tx
        .delete(productHubCompatibility)
        .where(eq(productHubCompatibility.id, duplicateRow.id))

      compatibilityByHubId.set(duplicateRow.hubId, mergedRow)
    }
  }
}

/**
 * Main deduplication process
 */
export async function deduplicateProducts(
  options: DeduplicationOptions = {},
): Promise<DeduplicationResult> {
  const { dryRun = false, verbose = false } = options

  const duplicateGroups = await findDuplicates()

  if (verbose) {
    logger.info({ duplicateGroups: duplicateGroups.length }, 'Found duplicate groups')
  }

  let productsKept = 0
  let productsDeleted = 0
  let productSourcesCreated = 0

  for (const group of duplicateGroups) {
    const canonical = pickCanonicalProduct(group.products)
    const duplicates = getDuplicates(canonical, group.products)

    if (verbose) {
      logger.info(
        {
          canonicalId: canonical.id,
          canonicalSource: canonical.source,
          duplicates: duplicates.map((product) => ({
            id: product.id,
            source: product.source,
          })),
          manufacturer: canonical.manufacturerName,
          model: canonical.model,
        },
        'Processing duplicate group',
      )
    }

    if (dryRun) {
      // Dry run: just count what would be done
      productsKept++
      productsDeleted += duplicates.length
      productSourcesCreated += group.products.length // One per product in the group
      continue
    }

    await db.transaction(async (tx) => {
      // Step 1: Migrate all raw_imports from duplicates to canonical.
      for (const duplicate of duplicates) {
        await tx
          .update(rawImports)
          .set({ productId: canonical.id })
          .where(eq(rawImports.productId, duplicate.id))
      }

      // Step 2: Merge compatibility rows without violating unique constraints.
      await mergeIntegrationCompatibilityRows(tx, canonical, duplicates)
      await mergeHubCompatibilityRows(tx, canonical, duplicates)

      // Step 3: Create product_sources entries for all sources.
      const primarySourceId = determinePrimarySource(canonical, group.products)

      if (primarySourceId !== canonical.primarySourceId) {
        await tx
          .update(products)
          .set({
            primarySourceId,
            updatedAt: new Date(),
          })
          .where(eq(products.id, canonical.id))
      }

      for (const product of group.products) {
        if (product.primarySourceId === null) {
          continue
        }

        const isPrimary = product.primarySourceId === primarySourceId
        const insertedRows = await tx
          .insert(productSources)
          .values({
            productId: canonical.id,
            rawImportId: product.primarySourceId,
            isPrimary,
            mergeConfidence: 'exact',
            mergedBy: 'auto',
            mergedAt: new Date(),
          })
          .onConflictDoNothing()
          .returning({ id: productSources.id })

        productSourcesCreated += insertedRows.length
      }

      // Step 4: Delete protocol-specific details for duplicate products.
      for (const duplicate of duplicates) {
        await tx.delete(zigbeeDetails).where(eq(zigbeeDetails.productId, duplicate.id))
        await tx.delete(zwaveDetails).where(eq(zwaveDetails.productId, duplicate.id))
      }

      // Step 5: Delete duplicate products once foreign key dependencies are gone.
      for (const duplicate of duplicates) {
        await tx.delete(products).where(eq(products.id, duplicate.id))
        productsDeleted++
      }
    })

    productsKept++
  }

  return {
    duplicateGroups: duplicateGroups.length,
    productsKept,
    productsDeleted,
    productSourcesCreated,
  }
}
