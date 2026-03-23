import { protectedProcedure, router } from './trpc'
import { z } from 'zod'
import {
  integrationCreateSchema,
  integrationHardwareSupportCreateSchema,
  integrationUpdateSchema,
  platformIntegrationCreateSchema,
} from '../shared/schemas'
import { db } from '../db/client'
import {
  integrationHardwareSupport,
  integrations,
  platformIntegrations,
} from '../db/schema'
import { and, asc, eq } from 'drizzle-orm'

export const integrationsRouter = router({
  list: protectedProcedure.query(async () => {
    const items = await db.query.integrations.findMany({
      orderBy: asc(integrations.name),
      with: {
        manufacturer: true,
        platformIntegrations: true,
        hardwareSupport: true,
        compatibility: true,
      },
    })

    return items
  }),

  byId: protectedProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
    const integration = await db.query.integrations.findFirst({
      where: eq(integrations.id, input.id),
      with: {
        manufacturer: true,
        platformIntegrations: {
          with: {
            platform: true,
          },
        },
        hardwareSupport: {
          with: {
            product: true,
          },
        },
        compatibility: {
          with: {
            product: {
              with: {
                manufacturer: true,
              },
            },
            evidence: true,
          },
        },
      },
    })

    return integration ?? null
  }),

  create: protectedProcedure.input(integrationCreateSchema).mutation(async ({ input }) => {
    const [integration] = await db.insert(integrations).values(input).returning()

    return integration
  }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        data: integrationUpdateSchema,
      }),
    )
    .mutation(async ({ input }) => {
      const [integration] = await db
        .update(integrations)
        .set(input.data)
        .where(eq(integrations.id, input.id))
        .returning()

      if (!integration) {
        throw new Error('Integration not found')
      }

      return integration
    }),

  delete: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
    await db.delete(integrations).where(eq(integrations.id, input.id))

    return { success: true }
  }),

  addPlatformLink: protectedProcedure
    .input(platformIntegrationCreateSchema)
    .mutation(async ({ input }) => {
      const [link] = await db
        .insert(platformIntegrations)
        .values(input)
        .onConflictDoUpdate({
          target: [platformIntegrations.platformId, platformIntegrations.integrationId],
          set: {
            supportType: input.supportType,
            notes: input.notes ?? null,
            updatedAt: new Date(),
          },
        })
        .returning()

      return link
    }),

  removePlatformLink: protectedProcedure
    .input(
      z.object({
        platformId: z.number().int().positive(),
        integrationId: z.number().int().positive(),
      }),
    )
    .mutation(async ({ input }) => {
      await db
        .delete(platformIntegrations)
        .where(
          and(
            eq(platformIntegrations.platformId, input.platformId),
            eq(platformIntegrations.integrationId, input.integrationId),
          ),
        )

      return { success: true }
    }),

  addHardwareSupport: protectedProcedure
    .input(integrationHardwareSupportCreateSchema)
    .mutation(async ({ input }) => {
      const [support] = await db
        .insert(integrationHardwareSupport)
        .values(input)
        .onConflictDoUpdate({
          target: [integrationHardwareSupport.integrationId, integrationHardwareSupport.productId],
          set: {
            requirementType: input.requirementType,
            notes: input.notes ?? null,
            updatedAt: new Date(),
          },
        })
        .returning()

      return support
    }),

  removeHardwareSupport: protectedProcedure
    .input(
      z.object({
        integrationId: z.number().int().positive(),
        productId: z.number().int().positive(),
      }),
    )
    .mutation(async ({ input }) => {
      await db
        .delete(integrationHardwareSupport)
        .where(
          and(
            eq(integrationHardwareSupport.integrationId, input.integrationId),
            eq(integrationHardwareSupport.productId, input.productId),
          ),
        )

      return { success: true }
    }),
})
