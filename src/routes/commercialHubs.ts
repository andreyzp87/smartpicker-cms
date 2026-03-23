import { protectedProcedure, router } from './trpc'
import { z } from 'zod'
import { commercialHubCreateSchema, commercialHubUpdateSchema } from '../shared/schemas'
import { db } from '../db/client'
import { commercialHubs } from '../db/schema'
import { asc, eq } from 'drizzle-orm'

export const commercialHubsRouter = router({
  list: protectedProcedure.query(async () => {
    const items = await db.query.commercialHubs.findMany({
      orderBy: asc(commercialHubs.name),
      with: {
        manufacturer: true,
        compatibility: true,
      },
    })

    return items
  }),

  byId: protectedProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
    const hub = await db.query.commercialHubs.findFirst({
      where: eq(commercialHubs.id, input.id),
      with: {
        manufacturer: true,
      },
    })

    return hub ?? null
  }),

  create: protectedProcedure.input(commercialHubCreateSchema).mutation(async ({ input }) => {
    const [hub] = await db.insert(commercialHubs).values(input).returning()

    return hub
  }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        data: commercialHubUpdateSchema,
      }),
    )
    .mutation(async ({ input }) => {
      const [hub] = await db
        .update(commercialHubs)
        .set(input.data)
        .where(eq(commercialHubs.id, input.id))
        .returning()

      if (!hub) {
        throw new Error('Commercial hub not found')
      }

      return hub
    }),

  delete: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
    await db.delete(commercialHubs).where(eq(commercialHubs.id, input.id))

    return { success: true }
  }),
})
