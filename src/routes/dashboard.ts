import { and, count, eq, gte, isNotNull } from 'drizzle-orm'
import { db } from '../db/client'
import {
  commercialHubs,
  compatibilityEvidence,
  integrations,
  productHubCompatibility,
  productIntegrationCompatibility,
  products,
  rawImports,
} from '../db/schema'
import { protectedProcedure, router } from './trpc'

export const dashboardRouter = router({
  overview: protectedProcedure.query(async () => {
    const processedSince = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

    const [
      publishedProductsResult,
      publishedIntegrationsResult,
      publishedHubsResult,
      pendingIntegrationReviewsResult,
      pendingHubReviewsResult,
      evidenceItemsResult,
      importsProcessedLastWeekResult,
    ] = await Promise.all([
      db.select({ count: count() }).from(products).where(eq(products.status, 'published')),
      db.select({ count: count() }).from(integrations).where(eq(integrations.status, 'published')),
      db
        .select({ count: count() })
        .from(commercialHubs)
        .where(eq(commercialHubs.status, 'published')),
      db
        .select({ count: count() })
        .from(productIntegrationCompatibility)
        .where(eq(productIntegrationCompatibility.reviewState, 'pending')),
      db
        .select({ count: count() })
        .from(productHubCompatibility)
        .where(eq(productHubCompatibility.reviewState, 'pending')),
      db.select({ count: count() }).from(compatibilityEvidence),
      db
        .select({ count: count() })
        .from(rawImports)
        .where(and(isNotNull(rawImports.processedAt), gte(rawImports.processedAt, processedSince))),
    ])

    return {
      publishedProducts: Number(publishedProductsResult[0]?.count ?? 0),
      publishedIntegrations: Number(publishedIntegrationsResult[0]?.count ?? 0),
      publishedHubs: Number(publishedHubsResult[0]?.count ?? 0),
      pendingReviews:
        Number(pendingIntegrationReviewsResult[0]?.count ?? 0) +
        Number(pendingHubReviewsResult[0]?.count ?? 0),
      evidenceItems: Number(evidenceItemsResult[0]?.count ?? 0),
      importsProcessedLastWeek: Number(importsProcessedLastWeekResult[0]?.count ?? 0),
    }
  }),
})
