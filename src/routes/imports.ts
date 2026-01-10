import { router, publicProcedure } from './trpc'
import { z } from 'zod'
import { importSourceSchema } from '../shared/schemas'
import { db } from '../db/client'
import { rawImports } from '../db/schema'
import { eq, and, desc, isNull, isNotNull, count } from 'drizzle-orm'

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
      const { source, processed, limit, offset } = input

      const conditions = []

      if (source) {
        conditions.push(eq(rawImports.source, source))
      }

      if (processed !== undefined) {
        conditions.push(
          processed
            ? isNotNull(rawImports.processedAt)
            : isNull(rawImports.processedAt)
        )
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined

      const [items, countResult] = await Promise.all([
        db
          .select()
          .from(rawImports)
          .where(whereClause)
          .orderBy(desc(rawImports.importedAt))
          .limit(limit)
          .offset(offset),
        db
          .select({ count: count() })
          .from(rawImports)
          .where(whereClause),
      ])

      return {
        items,
        total: Number(countResult[0]?.count ?? 0),
      }
    }),

  byId: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const rawImport = await db.query.rawImports.findFirst({
        where: eq(rawImports.id, input.id),
      })

      return rawImport ?? null
    }),

  trigger: publicProcedure
    .input(z.object({ source: importSourceSchema }))
    .mutation(async ({ input }) => {
      // TODO: Queue import job
      return { jobId: 'placeholder-job-id' }
    }),
})
