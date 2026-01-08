import { router, publicProcedure } from './trpc'
import { z } from 'zod'
import { importSourceSchema } from '../shared/schemas'

export const importsRouter = router({
  list: publicProcedure
    .input(
      z.object({
        source: importSourceSchema.optional(),
        processed: z.boolean().optional(),
        limit: z.number().int().min(1).max(100).default(50),
        offset: z.number().int().min(0).default(0),
      }),
    )
    .query(async ({ input }) => {
      // TODO: Implement database query
      return { items: [], total: 0 }
    }),

  byId: publicProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .query(async ({ input }) => {
      // TODO: Implement database query
      return null
    }),

  trigger: publicProcedure
    .input(z.object({ source: importSourceSchema }))
    .mutation(async ({ input }) => {
      // TODO: Queue import job
      return { jobId: 'placeholder-job-id' }
    }),
})
