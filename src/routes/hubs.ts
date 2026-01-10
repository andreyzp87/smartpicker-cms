import { router, publicProcedure } from './trpc'
import { z } from 'zod'
import { hubCreateSchema, hubUpdateSchema } from '../shared/schemas'
import { db } from '../db/client'
import { hubs } from '../db/schema'
import { eq, asc } from 'drizzle-orm'

export const hubsRouter = router({
  list: publicProcedure.query(async () => {
    const items = await db.query.hubs.findMany({
      orderBy: asc(hubs.name),
      with: {
        manufacturer: true,
      },
    })

    return items
  }),

  byId: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const hub = await db.query.hubs.findFirst({
        where: eq(hubs.id, input.id),
        with: {
          manufacturer: true,
        },
      })

      return hub ?? null
    }),

  create: publicProcedure
    .input(hubCreateSchema)
    .mutation(async ({ input }) => {
      const [hub] = await db
        .insert(hubs)
        .values(input)
        .returning()

      return hub
    }),

  update: publicProcedure
    .input(
      z.object({
        id: z.number(),
        data: hubUpdateSchema,
      })
    )
    .mutation(async ({ input }) => {
      const [hub] = await db
        .update(hubs)
        .set(input.data)
        .where(eq(hubs.id, input.id))
        .returning()

      if (!hub) {
        throw new Error('Hub not found')
      }

      return hub
    }),

  delete: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await db.delete(hubs).where(eq(hubs.id, input.id))

      return { success: true }
    }),
})
