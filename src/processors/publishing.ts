import { and, eq, inArray, isNotNull, ne, or } from 'drizzle-orm'
import { db } from '../db/client'
import { categories, integrations, productIntegrationCompatibility, products } from '../db/schema'

const AUTO_PUBLISH_BATCH_SIZE = 500

function buildSafeAutoPublishWhereClause(productId?: number) {
  const approvedSourceBackedCompatibility = or(
    and(
      eq(productIntegrationCompatibility.reviewState, 'approved'),
      eq(productIntegrationCompatibility.status, 'supported'),
      eq(productIntegrationCompatibility.canonicalSource, 'zigbee2mqtt'),
      eq(integrations.slug, 'zigbee2mqtt'),
      eq(products.primaryProtocol, 'zigbee'),
    ),
    and(
      eq(productIntegrationCompatibility.reviewState, 'approved'),
      eq(productIntegrationCompatibility.status, 'supported'),
      eq(productIntegrationCompatibility.canonicalSource, 'zwave_js'),
      eq(integrations.slug, 'zwave-js'),
      eq(products.primaryProtocol, 'zwave'),
    ),
  )

  return and(
    eq(products.status, 'draft'),
    isNotNull(products.manufacturerId),
    isNotNull(products.categoryId),
    isNotNull(products.primaryProtocol),
    ne(categories.slug, 'other'),
    approvedSourceBackedCompatibility,
    productId === undefined ? undefined : eq(products.id, productId),
  )
}

async function findSafeAutoPublishEligibleProductIds(productId?: number): Promise<number[]> {
  const rows = await db
    .selectDistinct({
      id: products.id,
    })
    .from(products)
    .innerJoin(categories, eq(products.categoryId, categories.id))
    .innerJoin(productIntegrationCompatibility, eq(productIntegrationCompatibility.productId, products.id))
    .innerJoin(integrations, eq(productIntegrationCompatibility.integrationId, integrations.id))
    .where(buildSafeAutoPublishWhereClause(productId))

  return rows.map((row) => row.id)
}

export async function autoPublishProductIfEligible(productId: number): Promise<boolean> {
  const eligibleIds = await findSafeAutoPublishEligibleProductIds(productId)

  if (eligibleIds.length === 0) {
    return false
  }

  const [updatedProduct] = await db
    .update(products)
    .set({
      status: 'published',
      updatedAt: new Date(),
    })
    .where(and(eq(products.id, productId), eq(products.status, 'draft')))
    .returning({ id: products.id })

  return Boolean(updatedProduct)
}

export async function backfillSafeAutoPublishProducts(): Promise<{
  eligible: number
  published: number
}> {
  const eligibleIds = await findSafeAutoPublishEligibleProductIds()

  if (eligibleIds.length === 0) {
    return {
      eligible: 0,
      published: 0,
    }
  }

  let published = 0

  for (let index = 0; index < eligibleIds.length; index += AUTO_PUBLISH_BATCH_SIZE) {
    const batchIds = eligibleIds.slice(index, index + AUTO_PUBLISH_BATCH_SIZE)
    const updatedRows = await db
      .update(products)
      .set({
        status: 'published',
        updatedAt: new Date(),
      })
      .where(and(eq(products.status, 'draft'), inArray(products.id, batchIds)))
      .returning({ id: products.id })

    published += updatedRows.length
  }

  return {
    eligible: eligibleIds.length,
    published,
  }
}
