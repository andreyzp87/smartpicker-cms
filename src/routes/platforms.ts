import { protectedProcedure, router } from './trpc'
import { z } from 'zod'
import { platformCreateSchema, platformUpdateSchema } from '../shared/schemas'
import { db } from '../db/client'
import { platforms } from '../db/schema'
import { asc, eq } from 'drizzle-orm'

export const platformsRouter = router({
  list: protectedProcedure.query(async () => {
    const items = await db.query.platforms.findMany({
      orderBy: asc(platforms.name),
      with: {
        manufacturer: true,
        platformIntegrations: {
          with: {
            integration: {
              with: {
                compatibility: true,
              },
            },
          },
        },
      },
    })

    return items
  }),

  byId: protectedProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
    const platform = await db.query.platforms.findFirst({
      where: eq(platforms.id, input.id),
      with: {
        manufacturer: true,
        platformIntegrations: {
          with: {
            integration: true,
          },
        },
      },
    })

    return platform ?? null
  }),

  create: protectedProcedure.input(platformCreateSchema).mutation(async ({ input }) => {
    const [platform] = await db.insert(platforms).values(input).returning()

    return platform
  }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        data: platformUpdateSchema,
      }),
    )
    .mutation(async ({ input }) => {
      const [platform] = await db
        .update(platforms)
        .set(input.data)
        .where(eq(platforms.id, input.id))
        .returning()

      if (!platform) {
        throw new Error('Platform not found')
      }

      return platform
    }),

  delete: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
    await db.delete(platforms).where(eq(platforms.id, input.id))

    return { success: true }
  }),
})
