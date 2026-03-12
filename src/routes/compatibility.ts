import { protectedProcedure, router } from './trpc'
import { z } from 'zod'
import { compatibilityCreateSchema, compatibilityUpdateSchema } from '../shared/schemas'
import { db } from '../db/client'
import { deviceCompatibility } from '../db/schema'
import { eq } from 'drizzle-orm'

export const compatibilityRouter = router({
  byProductId: protectedProcedure
    .input(z.object({ productId: z.number() }))
    .query(async ({ input }) => {
      const items = await db.query.deviceCompatibility.findMany({
        where: eq(deviceCompatibility.productId, input.productId),
        with: {
          hub: {
            with: {
              manufacturer: true,
            },
          },
        },
      })

      return items
    }),

  byHubId: protectedProcedure
    .input(z.object({ hubId: z.number() }))
    .query(async ({ input }) => {
      const items = await db.query.deviceCompatibility.findMany({
        where: eq(deviceCompatibility.hubId, input.hubId),
        with: {
          product: {
            with: {
              manufacturer: true,
            },
          },
        },
      })

      return items
    }),

  create: protectedProcedure
    .input(compatibilityCreateSchema)
    .mutation(async ({ input }) => {
      const [compatibility] = await db
        .insert(deviceCompatibility)
        .values({
          ...input,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning()

      return compatibility
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        data: compatibilityUpdateSchema,
      })
    )
    .mutation(async ({ input }) => {
      const [compatibility] = await db
        .update(deviceCompatibility)
        .set({
          ...input.data,
          updatedAt: new Date(),
        })
        .where(eq(deviceCompatibility.id, input.id))
        .returning()

      if (!compatibility) {
        throw new Error('Compatibility entry not found')
      }

      return compatibility
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await db.delete(deviceCompatibility).where(eq(deviceCompatibility.id, input.id))

      return { success: true }
    }),
})
