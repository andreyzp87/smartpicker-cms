import { router, publicProcedure } from './trpc'
import { z } from 'zod'
import { categoryCreateSchema, categoryUpdateSchema } from '../shared/schemas'
import { db } from '../db/client'
import { categories } from '../db/schema'
import { eq, asc } from 'drizzle-orm'

export const categoriesRouter = router({
  list: publicProcedure.query(async () => {
    const items = await db.query.categories.findMany({
      orderBy: asc(categories.sortOrder),
      with: {
        parent: true,
      },
    })

    return items
  }),

  byId: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const category = await db.query.categories.findFirst({
        where: eq(categories.id, input.id),
        with: {
          parent: true,
          children: true,
        },
      })

      return category ?? null
    }),

  create: publicProcedure
    .input(categoryCreateSchema)
    .mutation(async ({ input }) => {
      const [category] = await db
        .insert(categories)
        .values(input)
        .returning()

      return category
    }),

  update: publicProcedure
    .input(
      z.object({
        id: z.number(),
        data: categoryUpdateSchema,
      })
    )
    .mutation(async ({ input }) => {
      const [category] = await db
        .update(categories)
        .set(input.data)
        .where(eq(categories.id, input.id))
        .returning()

      if (!category) {
        throw new Error('Category not found')
      }

      return category
    }),

  delete: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await db.delete(categories).where(eq(categories.id, input.id))

      return { success: true }
    }),
})
