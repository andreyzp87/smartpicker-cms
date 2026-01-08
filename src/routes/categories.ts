import { router, publicProcedure } from './trpc'
import { z } from 'zod'
import { categoryCreateSchema, categoryUpdateSchema } from '../shared/schemas'

export const categoriesRouter = router({
  list: publicProcedure.query(async () => {
    // TODO: Implement database query
    return []
  }),

  byId: publicProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .query(async ({ input }) => {
      // TODO: Implement database query
      return null
    }),

  create: publicProcedure.input(categoryCreateSchema).mutation(async ({ input }) => {
    // TODO: Implement database insert
    return { id: 1, ...input }
  }),

  update: publicProcedure
    .input(z.object({ id: z.number().int().positive(), data: categoryUpdateSchema }))
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
