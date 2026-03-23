import { protectedProcedure, router } from './trpc'
import { z } from 'zod'
import {
  compatibilityEvidenceCreateSchema,
  compatibilityEvidenceUpdateSchema,
  productHubCompatibilityCreateSchema,
  productHubCompatibilityUpdateSchema,
  productIntegrationCompatibilityCreateSchema,
  productIntegrationCompatibilityUpdateSchema,
} from '../shared/schemas'
import { db } from '../db/client'
import {
  compatibilityEvidence,
  productHubCompatibility,
  productIntegrationCompatibility,
} from '../db/schema'
import { eq } from 'drizzle-orm'

function ensureEvidenceTarget(input: {
  targetType: 'integration' | 'hub'
  productIntegrationCompatibilityId?: number | null
  productHubCompatibilityId?: number | null
}) {
  const hasIntegrationTarget = input.productIntegrationCompatibilityId != null
  const hasHubTarget = input.productHubCompatibilityId != null

  if (hasIntegrationTarget === hasHubTarget) {
    throw new Error('Evidence must reference exactly one compatibility row')
  }

  if (input.targetType === 'integration' && !hasIntegrationTarget) {
    throw new Error('Integration evidence must reference an integration compatibility row')
  }

  if (input.targetType === 'hub' && !hasHubTarget) {
    throw new Error('Hub evidence must reference a hub compatibility row')
  }
}

export const compatibilityRouter = router({
  integrationList: protectedProcedure.query(async () => {
    return db.query.productIntegrationCompatibility.findMany({
      orderBy: (table, { desc }) => [desc(table.updatedAt)],
      with: {
        product: {
          with: {
            manufacturer: true,
          },
        },
        integration: {
          with: {
            manufacturer: true,
            platformIntegrations: {
              with: {
                platform: true,
              },
            },
          },
        },
        evidence: true,
      },
    })
  }),

  hubList: protectedProcedure.query(async () => {
    return db.query.productHubCompatibility.findMany({
      orderBy: (table, { desc }) => [desc(table.updatedAt)],
      with: {
        product: {
          with: {
            manufacturer: true,
          },
        },
        hub: {
          with: {
            manufacturer: true,
          },
        },
        evidence: true,
      },
    })
  }),

  evidenceList: protectedProcedure.query(async () => {
    return db.query.compatibilityEvidence.findMany({
      orderBy: (table, { desc }) => [desc(table.importedAt)],
      with: {
        productIntegrationCompatibility: {
          with: {
            product: true,
            integration: true,
          },
        },
        productHubCompatibility: {
          with: {
            product: true,
            hub: true,
          },
        },
      },
    })
  }),

  productIntegrationsByProductId: protectedProcedure
    .input(z.object({ productId: z.number() }))
    .query(async ({ input }) => {
      const items = await db.query.productIntegrationCompatibility.findMany({
        where: eq(productIntegrationCompatibility.productId, input.productId),
        with: {
          integration: {
            with: {
              manufacturer: true,
              platformIntegrations: {
                with: {
                  platform: true,
                },
              },
            },
          },
          evidence: true,
        },
      })

      return items
    }),

  productHubsByProductId: protectedProcedure
    .input(z.object({ productId: z.number() }))
    .query(async ({ input }) => {
      const items = await db.query.productHubCompatibility.findMany({
        where: eq(productHubCompatibility.productId, input.productId),
        with: {
          hub: {
            with: {
              manufacturer: true,
            },
          },
          evidence: true,
        },
      })

      return items
    }),

  productIntegrationsByIntegrationId: protectedProcedure
    .input(z.object({ integrationId: z.number() }))
    .query(async ({ input }) => {
      const items = await db.query.productIntegrationCompatibility.findMany({
        where: eq(productIntegrationCompatibility.integrationId, input.integrationId),
        with: {
          product: {
            with: {
              manufacturer: true,
            },
          },
          evidence: true,
        },
      })

      return items
    }),

  productHubsByHubId: protectedProcedure
    .input(z.object({ hubId: z.number() }))
    .query(async ({ input }) => {
      const items = await db.query.productHubCompatibility.findMany({
        where: eq(productHubCompatibility.hubId, input.hubId),
        with: {
          product: {
            with: {
              manufacturer: true,
            },
          },
          evidence: true,
        },
      })

      return items
    }),

  createProductIntegration: protectedProcedure
    .input(productIntegrationCompatibilityCreateSchema)
    .mutation(async ({ input }) => {
      const [compatibility] = await db
        .insert(productIntegrationCompatibility)
        .values({
          ...input,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning()

      return compatibility
    }),

  updateProductIntegration: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        data: productIntegrationCompatibilityUpdateSchema,
      }),
    )
    .mutation(async ({ input }) => {
      const [compatibility] = await db
        .update(productIntegrationCompatibility)
        .set({
          ...input.data,
          updatedAt: new Date(),
        })
        .where(eq(productIntegrationCompatibility.id, input.id))
        .returning()

      if (!compatibility) {
        throw new Error('Product integration compatibility entry not found')
      }

      return compatibility
    }),

  deleteProductIntegration: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await db
        .delete(productIntegrationCompatibility)
        .where(eq(productIntegrationCompatibility.id, input.id))

      return { success: true }
    }),

  createProductHub: protectedProcedure
    .input(productHubCompatibilityCreateSchema)
    .mutation(async ({ input }) => {
      const [compatibility] = await db
        .insert(productHubCompatibility)
        .values({
          ...input,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning()

      return compatibility
    }),

  updateProductHub: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        data: productHubCompatibilityUpdateSchema,
      }),
    )
    .mutation(async ({ input }) => {
      const [compatibility] = await db
        .update(productHubCompatibility)
        .set({
          ...input.data,
          updatedAt: new Date(),
        })
        .where(eq(productHubCompatibility.id, input.id))
        .returning()

      if (!compatibility) {
        throw new Error('Product hub compatibility entry not found')
      }

      return compatibility
    }),

  deleteProductHub: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await db.delete(productHubCompatibility).where(eq(productHubCompatibility.id, input.id))

      return { success: true }
    }),

  createEvidence: protectedProcedure
    .input(compatibilityEvidenceCreateSchema)
    .mutation(async ({ input }) => {
      ensureEvidenceTarget(input)

      const [evidence] = await db
        .insert(compatibilityEvidence)
        .values({
          ...input,
          metadata: input.metadata ?? {},
          createdAt: new Date(),
        })
        .returning()

      return evidence
    }),

  updateEvidence: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        data: compatibilityEvidenceUpdateSchema,
      }),
    )
    .mutation(async ({ input }) => {
      const existing = await db.query.compatibilityEvidence.findFirst({
        where: eq(compatibilityEvidence.id, input.id),
      })

      if (!existing) {
        throw new Error('Evidence entry not found')
      }

      const nextValue = {
        targetType: input.data.targetType ?? existing.targetType,
        productIntegrationCompatibilityId:
          input.data.productIntegrationCompatibilityId ??
          existing.productIntegrationCompatibilityId ??
          null,
        productHubCompatibilityId:
          input.data.productHubCompatibilityId ?? existing.productHubCompatibilityId ?? null,
      }

      ensureEvidenceTarget(nextValue)

      const [evidence] = await db
        .update(compatibilityEvidence)
        .set({
          ...input.data,
          metadata: input.data.metadata ?? existing.metadata,
        })
        .where(eq(compatibilityEvidence.id, input.id))
        .returning()

      return evidence
    }),

  deleteEvidence: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await db.delete(compatibilityEvidence).where(eq(compatibilityEvidence.id, input.id))

      return { success: true }
    }),
})
