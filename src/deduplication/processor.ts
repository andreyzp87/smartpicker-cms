import { db } from '../db/client'
import {
  products,
  rawImports,
  productSources,
  deviceCompatibility,
  zigbeeDetails,
  zwaveDetails,
} from '../db/schema'
import { eq } from 'drizzle-orm'
import { findDuplicates, DuplicateGroup } from './finder'
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

/**
 * Main deduplication process
 */
export async function deduplicateProducts(
  options: DeduplicationOptions = {},
): Promise<DeduplicationResult> {
  const { dryRun = false, verbose = false } = options

  const duplicateGroups = await findDuplicates()

  if (verbose) {
    console.log(`\nFound ${duplicateGroups.length} duplicate groups`)
  }

  let productsKept = 0
  let productsDeleted = 0
  let productSourcesCreated = 0

  for (const group of duplicateGroups) {
    const canonical = pickCanonicalProduct(group.products)
    const duplicates = getDuplicates(canonical, group.products)

    if (verbose) {
      console.log(`\n  Group: ${canonical.manufacturerName} ${canonical.model}`)
      console.log(`    Canonical: Product #${canonical.id} (${canonical.source})`)
      console.log(`    Duplicates: ${duplicates.map((p) => `#${p.id} (${p.source})`).join(', ')}`)
    }

    if (dryRun) {
      // Dry run: just count what would be done
      productsKept++
      productsDeleted += duplicates.length
      productSourcesCreated += group.products.length // One per product in the group
      continue
    }

    // ACTUAL MERGE PROCESS

    // Step 1: Migrate all raw_imports from duplicates to canonical
    for (const duplicate of duplicates) {
      await db
        .update(rawImports)
        .set({ productId: canonical.id })
        .where(eq(rawImports.productId, duplicate.id))
    }

    // Step 2: Migrate compatibility records from duplicates to canonical
    for (const duplicate of duplicates) {
      await db
        .update(deviceCompatibility)
        .set({ productId: canonical.id })
        .where(eq(deviceCompatibility.productId, duplicate.id))
    }

    // Step 3: Create product_sources entries for all sources
    const primarySourceId = determinePrimarySource(canonical, group.products)

    for (const product of group.products) {
      const isPrimary = product.primarySourceId === primarySourceId

      await db
        .insert(productSources)
        .values({
          productId: canonical.id,
          rawImportId: product.primarySourceId,
          isPrimary,
          mergeConfidence: 'exact',
          mergedBy: 'auto',
          mergedAt: new Date(),
        })
        .onConflictDoNothing() // Skip if already exists

      productSourcesCreated++
    }

    // Step 4: Delete protocol-specific details for duplicate products
    for (const duplicate of duplicates) {
      // Delete zigbee details if they exist
      await db.delete(zigbeeDetails).where(eq(zigbeeDetails.productId, duplicate.id))

      // Delete zwave details if they exist
      await db.delete(zwaveDetails).where(eq(zwaveDetails.productId, duplicate.id))
    }

    // Step 5: Delete duplicate products
    // Now safe to delete since we've removed all foreign key dependencies
    for (const duplicate of duplicates) {
      await db.delete(products).where(eq(products.id, duplicate.id))
      productsDeleted++
    }

    productsKept++
  }

  return {
    duplicateGroups: duplicateGroups.length,
    productsKept,
    productsDeleted,
    productSourcesCreated,
  }
}
