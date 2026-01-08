import { router, publicProcedure } from './trpc'
import { z } from 'zod'
import {
  productCreateSchema,
  productUpdateSchema,
  productFilterSchema,
  paginationSchema,
} from '../shared/schemas'

export const productsRouter = router({
  list: publicProcedure
    .input(productFilterSchema.merge(paginationSchema))
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

  bySlug: publicProcedure.input(z.object({ slug: z.string() })).query(async ({ input }) => {
    // TODO: Implement database query
    return null
  }),

  create: publicProcedure.input(productCreateSchema).mutation(async ({ input }) => {
    // TODO: Implement database insert
    return { id: 1, ...input }
  }),

  update: publicProcedure
    .input(z.object({ id: z.number().int().positive(), data: productUpdateSchema }))
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
