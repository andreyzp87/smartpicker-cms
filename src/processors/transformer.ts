import { db } from '../db/client'
import { products, rawImports, zigbeeDetails, zwaveDetails } from '../db/schema'
import { eq, isNull } from 'drizzle-orm'
import slugify from 'slugify'
import { extractProduct } from './extractors'
import { findOrCreateManufacturer } from './manufacturers'
import { createCompatibilityRecords } from './compatibility'
import { ProcessResult } from './types'

/**
 * Generate a unique slug for a product
 * Format: vendor-model (e.g., "philips-hue-bulb")
 */
async function generateUniqueSlug(vendor: string, model: string): Promise<string> {
  const baseSlug = slugify(`${vendor} ${model}`, { lower: true, strict: true })

  // Check for conflicts and append number if needed
  let uniqueSlug = baseSlug
  let counter = 1

  while (true) {
    const existing = await db.select().from(products).where(eq(products.slug, uniqueSlug)).limit(1)

    if (existing.length === 0) break

    uniqueSlug = `${baseSlug}-${counter}`
    counter++
  }

  return uniqueSlug
}

/**
 * Transform a single raw import into a product
 *
 * @param rawImportId The ID of the raw import to process
 * @returns ProcessResult with productId, created flag, and compatibility count
 */
export async function transformRawImport(rawImportId: number): Promise<ProcessResult> {
  // Fetch the raw import
  const [rawImport] = await db.select().from(rawImports).where(eq(rawImports.id, rawImportId))

  if (!rawImport) {
    throw new Error(`Raw import not found: ${rawImportId}`)
  }

  // Extract product fields from raw data
  const extracted = extractProduct(rawImport.source, rawImport.data)

  // Find or create manufacturer
  const manufacturerId = await findOrCreateManufacturer(extracted.vendor)

  // Generate unique slug
  const slug = await generateUniqueSlug(extracted.vendor, extracted.model || extracted.name)

  // Check if product already exists (by primarySourceId)
  const existingProduct = await db
    .select()
    .from(products)
    .where(eq(products.primarySourceId, rawImportId))
    .limit(1)

  let productId: number
  let created = false

  if (existingProduct.length > 0) {
    // Update existing product
    productId = existingProduct[0].id

    await db
      .update(products)
      .set({
        name: extracted.name,
        slug,
        manufacturerId,
        model: extracted.model,
        primaryProtocol: extracted.protocol,
        description: extracted.description,
        updatedAt: new Date(),
      })
      .where(eq(products.id, productId))
  } else {
    // Create new product
    const [newProduct] = await db
      .insert(products)
      .values({
        name: extracted.name,
        slug,
        manufacturerId,
        model: extracted.model,
        primaryProtocol: extracted.protocol,
        description: extracted.description,
        primarySourceId: rawImportId,
        status: 'draft',
      })
      .returning()

    productId = newProduct.id
    created = true
  }

  // Update the raw import with the product link
  await db.update(rawImports).set({ productId, processedAt: new Date() }).where(eq(rawImports.id, rawImportId))

  // Handle protocol-specific details
  if (extracted.zigbeeDetails && extracted.protocol === 'zigbee') {
    await db
      .insert(zigbeeDetails)
      .values({
        productId,
        ieeeManufacturer: extracted.zigbeeDetails.ieeeManufacturer || null,
        modelId: extracted.zigbeeDetails.modelId || null,
        endpoints: extracted.zigbeeDetails.endpoints || null,
        exposes: extracted.zigbeeDetails.exposes || null,
      })
      .onConflictDoUpdate({
        target: zigbeeDetails.productId,
        set: {
          ieeeManufacturer: extracted.zigbeeDetails.ieeeManufacturer || null,
          modelId: extracted.zigbeeDetails.modelId || null,
          endpoints: extracted.zigbeeDetails.endpoints || null,
          exposes: extracted.zigbeeDetails.exposes || null,
        },
      })
  }

  if (extracted.zwaveDetails && extracted.protocol === 'zwave') {
    await db
      .insert(zwaveDetails)
      .values({
        productId,
        zwaveManufacturerId: extracted.zwaveDetails.zwaveManufacturerId || null,
        productType: extracted.zwaveDetails.productType || null,
        productIdHex: extracted.zwaveDetails.productIdHex || null,
        frequency: extracted.zwaveDetails.frequency || null,
      })
      .onConflictDoUpdate({
        target: zwaveDetails.productId,
        set: {
          zwaveManufacturerId: extracted.zwaveDetails.zwaveManufacturerId || null,
          productType: extracted.zwaveDetails.productType || null,
          productIdHex: extracted.zwaveDetails.productIdHex || null,
          frequency: extracted.zwaveDetails.frequency || null,
        },
      })
  }

  // Handle compatibility data (from Blakadder)
  let compatibilityRecordsCreated = 0
  if (extracted.compatibleWith && extracted.compatibleWith.length > 0) {
    compatibilityRecordsCreated = await createCompatibilityRecords(productId, extracted.compatibleWith)
  }

  return {
    productId,
    created,
    compatibilityRecordsCreated,
  }
}

/**
 * Transform all unprocessed raw imports
 *
 * @param limit Maximum number of imports to process (optional)
 * @returns Array of ProcessResult
 */
export async function transformAllUnprocessed(limit?: number): Promise<ProcessResult[]> {
  // Get unprocessed raw imports
  const query = db.select().from(rawImports).where(isNull(rawImports.processedAt))

  const unprocessed = limit ? await query.limit(limit) : await query

  const results: ProcessResult[] = []

  for (const rawImport of unprocessed) {
    try {
      const result = await transformRawImport(rawImport.id)
      results.push(result)
    } catch (error) {
      console.error(`Failed to process raw import ${rawImport.id}:`, error)
      // Continue processing other imports
    }
  }

  return results
}
