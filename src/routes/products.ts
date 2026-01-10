import { router, publicProcedure } from './trpc'
import { z } from 'zod'
import {
  productCreateSchema,
  productUpdateSchema,
  productFilterSchema,
  paginationSchema,
} from '../shared/schemas'
import { db } from '../db/client'
import { products } from '../db/schema'
import { and, or, eq, ilike, asc, desc, count } from 'drizzle-orm'

export const productsRouter = router({
  list: publicProcedure
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
          or(
            ilike(products.name, `%${search}%`),
            ilike(products.model, `%${search}%`),
          ),
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
        db
          .select({ count: count() })
          .from(products)
          .where(whereClause),
      ])

      return {
        items,
        total: Number(countResult[0]?.count ?? 0),
      }
    }),

  byId: publicProcedure
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

  bySlug: publicProcedure.input(z.object({ slug: z.string() })).query(async ({ input }) => {
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

  create: publicProcedure
    .input(productCreateSchema)
    .mutation(async ({ input }) => {
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

  update: publicProcedure
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

  delete: publicProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      await db.delete(products).where(eq(products.id, input.id))

      return { success: true }
    }),
})
