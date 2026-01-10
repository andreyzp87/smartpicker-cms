import { router, publicProcedure } from './trpc'
import { z } from 'zod'
import { manufacturerCreateSchema, manufacturerUpdateSchema } from '../shared/schemas'
import { db } from '../db/client'
import { manufacturers } from '../db/schema'
import { eq, asc } from 'drizzle-orm'

export const manufacturersRouter = router({
  list: publicProcedure.query(async () => {
    const items = await db.query.manufacturers.findMany({
      orderBy: asc(manufacturers.name),
    });

    return items;
  }),

  byId: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const manufacturer = await db.query.manufacturers.findFirst({
        where: eq(manufacturers.id, input.id),
      });

      return manufacturer ?? null;
    }),

  create: publicProcedure
    .input(manufacturerCreateSchema)
    .mutation(async ({ input }) => {
      const [manufacturer] = await db
        .insert(manufacturers)
        .values({
          ...input,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      return manufacturer;
    }),

  update: publicProcedure
    .input(
      z.object({
        id: z.number(),
        data: manufacturerUpdateSchema,
      })
    )
    .mutation(async ({ input }) => {
      const [manufacturer] = await db
        .update(manufacturers)
        .set({
          ...input.data,
          updatedAt: new Date(),
        })
        .where(eq(manufacturers.id, input.id))
        .returning();

      if (!manufacturer) {
        throw new Error('Manufacturer not found');
      }

      return manufacturer;
    }),

  delete: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await db.delete(manufacturers).where(eq(manufacturers.id, input.id));

      return { success: true };
    }),
})
