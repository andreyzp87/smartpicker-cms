import { protectedProcedure, router } from './trpc'
import { z } from 'zod'
import {
  productCreateSchema,
  productUpdateSchema,
  productFilterSchema,
  paginationSchema,
} from '../shared/schemas'
import { db } from '../db/client'
import { categories, deviceCompatibility, products } from '../db/schema'
import { and, or, eq, ilike, asc, desc, count, inArray } from 'drizzle-orm'

type ProductPublishRow = {
  id: number
  manufacturerId: number | null
  categoryId: number | null
  primaryProtocol: string | null
}

type CategoryNode = {
  id: number
  parentId: number | null
}

function isBulkPublishSafe(product: ProductPublishRow): boolean {
  return (
    product.manufacturerId !== null &&
    product.categoryId !== null &&
    product.primaryProtocol !== null
  )
}

function toIdSet(ids: (number | null)[]): Set<number> {
  return new Set(ids.filter((id): id is number => id !== null))
}

function collectCategoryIdsWithAncestors(
  directCategoryIds: Set<number>,
  categoryNodes: CategoryNode[],
): Set<number> {
  const categoryById = new Map(categoryNodes.map((category) => [category.id, category]))
  const collected = new Set<number>()

  for (const categoryId of directCategoryIds) {
    let currentId: number | null = categoryId

    while (currentId !== null && !collected.has(currentId)) {
      collected.add(currentId)
      currentId = categoryById.get(currentId)?.parentId ?? null
    }
  }

  return collected
}

async function buildBulkPublishSnapshot() {
  const [draftProducts, publishedProducts, categoryNodes] = await Promise.all([
    db
      .select({
        id: products.id,
        manufacturerId: products.manufacturerId,
        categoryId: products.categoryId,
        primaryProtocol: products.primaryProtocol,
      })
      .from(products)
      .where(eq(products.status, 'draft')),
    db
      .select({
        id: products.id,
        manufacturerId: products.manufacturerId,
        categoryId: products.categoryId,
      })
      .from(products)
      .where(eq(products.status, 'published')),
    db
      .select({
        id: categories.id,
        parentId: categories.parentId,
      })
      .from(categories),
  ])

  const eligibleDraftProducts = draftProducts.filter(isBulkPublishSafe)
  const eligibleDraftProductIds = eligibleDraftProducts.map((product) => product.id)
  const publishedProductIds = publishedProducts.map((product) => product.id)

  const [eligibleHubRows, publishedHubRows] = await Promise.all([
    eligibleDraftProductIds.length > 0
      ? db
          .select({ hubId: deviceCompatibility.hubId })
          .from(deviceCompatibility)
          .where(inArray(deviceCompatibility.productId, eligibleDraftProductIds))
      : Promise.resolve([]),
    publishedProductIds.length > 0
      ? db
          .select({ hubId: deviceCompatibility.hubId })
          .from(deviceCompatibility)
          .where(inArray(deviceCompatibility.productId, publishedProductIds))
      : Promise.resolve([]),
  ])

  const eligibleManufacturerIds = toIdSet(
    eligibleDraftProducts.map((product) => product.manufacturerId),
  )
  const currentManufacturerIds = toIdSet(publishedProducts.map((product) => product.manufacturerId))

  const eligibleDirectCategoryIds = toIdSet(
    eligibleDraftProducts.map((product) => product.categoryId),
  )
  const currentDirectCategoryIds = toIdSet(publishedProducts.map((product) => product.categoryId))

  const eligibleCategoryIds = collectCategoryIdsWithAncestors(
    eligibleDirectCategoryIds,
    categoryNodes,
  )
  const currentCategoryIds = collectCategoryIdsWithAncestors(
    currentDirectCategoryIds,
    categoryNodes,
  )

  const eligibleHubIds = new Set(eligibleHubRows.map((row) => row.hubId))
  const currentHubIds = new Set(publishedHubRows.map((row) => row.hubId))

  const missingManufacturerCount = draftProducts.filter(
    (product) => product.manufacturerId === null,
  ).length
  const missingCategoryCount = draftProducts.filter((product) => product.categoryId === null).length
  const missingProtocolCount = draftProducts.filter(
    (product) => product.primaryProtocol === null,
  ).length

  return {
    eligibleDraftProductIds,
    counts: {
      draftProducts: draftProducts.length,
      currentlyPublishedProducts: publishedProducts.length,
      eligibleProducts: eligibleDraftProducts.length,
      blockedProducts: draftProducts.length - eligibleDraftProducts.length,
      missingManufacturerCount,
      missingCategoryCount,
      missingProtocolCount,
      eligibleRelated: {
        manufacturers: eligibleManufacturerIds.size,
        categories: eligibleCategoryIds.size,
        hubs: eligibleHubIds.size,
      },
      newlyUnlockedRelated: {
        manufacturers: Array.from(eligibleManufacturerIds).filter(
          (id) => !currentManufacturerIds.has(id),
        ).length,
        categories: Array.from(eligibleCategoryIds).filter((id) => !currentCategoryIds.has(id))
          .length,
        hubs: Array.from(eligibleHubIds).filter((id) => !currentHubIds.has(id)).length,
      },
      totalsAfterPublish: {
        products: publishedProducts.length + eligibleDraftProducts.length,
        manufacturers: new Set([...currentManufacturerIds, ...eligibleManufacturerIds]).size,
        categories: new Set([...currentCategoryIds, ...eligibleCategoryIds]).size,
        hubs: new Set([...currentHubIds, ...eligibleHubIds]).size,
      },
    },
  }
}

export const productsRouter = router({
  list: protectedProcedure
    .input(productFilterSchema.merge(paginationSchema))
    .query(async ({ input }) => {
      const {
        search,
        protocol,
        manufacturerId,
        categoryId,
        status,
        localControl,
        matterCertified,
        limit,
        offset,
        sortField,
        sortOrder,
      } = input

      // Build where conditions
      const conditions = []

      if (search) {
        conditions.push(
          or(ilike(products.name, `%${search}%`), ilike(products.model, `%${search}%`)),
        )
      }

      if (protocol) {
        conditions.push(eq(products.primaryProtocol, protocol))
      }

      if (manufacturerId) {
        conditions.push(eq(products.manufacturerId, manufacturerId))
      }

      if (categoryId) {
        conditions.push(eq(products.categoryId, categoryId))
      }

      if (status) {
        conditions.push(eq(products.status, status))
      }

      if (localControl !== undefined) {
        conditions.push(eq(products.localControl, localControl))
      }

      if (matterCertified !== undefined) {
        conditions.push(eq(products.matterCertified, matterCertified))
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined

      // Build order by
      const orderByColumn =
        sortField === 'name'
          ? products.name
          : sortField === 'updatedAt'
            ? products.updatedAt
            : products.createdAt // sortField === 'createdAt'
      const orderByClause = sortOrder === 'asc' ? asc(orderByColumn) : desc(orderByColumn)

      // Execute queries
      const [items, countResult] = await Promise.all([
        db
          .select()
          .from(products)
          .where(whereClause)
          .orderBy(orderByClause)
          .limit(limit)
          .offset(offset),
        db.select({ count: count() }).from(products).where(whereClause),
      ])

      return {
        items,
        total: Number(countResult[0]?.count ?? 0),
      }
    }),

  byId: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .query(async ({ input }) => {
      const product = await db.query.products.findFirst({
        where: eq(products.id, input.id),
        with: {
          manufacturer: true,
          category: true,
          zigbeeDetails: true,
          zwaveDetails: true,
        },
      })

      return product ?? null
    }),

  bySlug: protectedProcedure.input(z.object({ slug: z.string() })).query(async ({ input }) => {
    const product = await db.query.products.findFirst({
      where: eq(products.slug, input.slug),
      with: {
        manufacturer: true,
        category: true,
        zigbeeDetails: true,
        zwaveDetails: true,
      },
    })

    return product ?? null
  }),

  bulkPublishPreview: protectedProcedure.query(async () => {
    const snapshot = await buildBulkPublishSnapshot()

    return {
      rules: [
        'Draft device has a manufacturer',
        'Draft device has a category',
        'Draft device has a primary protocol',
      ],
      ...snapshot.counts,
    }
  }),

  bulkPublishSafe: protectedProcedure.mutation(async () => {
    const snapshot = await buildBulkPublishSnapshot()

    if (snapshot.eligibleDraftProductIds.length === 0) {
      return {
        success: true,
        publishedProducts: 0,
        ...snapshot.counts,
      }
    }

    const updatedProducts = await db
      .update(products)
      .set({
        status: 'published',
        updatedAt: new Date(),
      })
      .where(
        and(eq(products.status, 'draft'), inArray(products.id, snapshot.eligibleDraftProductIds)),
      )
      .returning({ id: products.id })

    return {
      success: true,
      publishedProducts: updatedProducts.length,
      ...snapshot.counts,
    }
  }),

  create: protectedProcedure.input(productCreateSchema).mutation(async ({ input }) => {
    const [product] = await db
      .insert(products)
      .values({
        ...input,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning()

    return product
  }),

  update: protectedProcedure
    .input(z.object({ id: z.number().int().positive(), data: productUpdateSchema }))
    .mutation(async ({ input }) => {
      const [product] = await db
        .update(products)
        .set({
          ...input.data,
          updatedAt: new Date(),
        })
        .where(eq(products.id, input.id))
        .returning()

      if (!product) {
        throw new Error('Product not found')
      }

      return product
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      await db.delete(products).where(eq(products.id, input.id))

      return { success: true }
    }),
})
