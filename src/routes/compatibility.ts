import { router, publicProcedure } from './trpc'
import { z } from 'zod'
import { compatibilityCreateSchema, compatibilityUpdateSchema } from '../shared/schemas'

export const compatibilityRouter = router({
  byProductId: publicProcedure
    .input(z.object({ productId: z.number().int().positive() }))
    .query(async ({ input }) => {
      // TODO: Implement database query
      return []
    }),

  byHubId: publicProcedure
    .input(z.object({ hubId: z.number().int().positive() }))
    .query(async ({ input }) => {
      // TODO: Implement database query
      return []
    }),

  create: publicProcedure.input(compatibilityCreateSchema).mutation(async ({ input }) => {
    // TODO: Implement database insert
    return { id: 1, ...input }
  }),

  update: publicProcedure
    .input(z.object({ id: z.number().int().positive(), data: compatibilityUpdateSchema }))
    .mutation(async ({ input }) => {
      // TODO: Implement database update
      return { id: input.id, ...input.data }
    }),

  delete: publicProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      // TODO: Implement database delete
      return { success: true }
    }),
})
