import { protectedProcedure, router } from './trpc'
import { z } from 'zod'
import { importSourceSchema, sourceCompatibilityMappingCreateSchema } from '../shared/schemas'
import { db } from '../db/client'
import { compatibilityEvidence, rawImports, sourceCompatibilityMappings } from '../db/schema'
import {
  createCompatibilityRecords,
  extractCompatibilityCodes,
  findUnmappedCompatibilityCodes,
} from '../processors/compatibility'
import { eq, and, desc, isNull, isNotNull, count } from 'drizzle-orm'

function toBatchBucket(value: Date | string) {
  const date = new Date(value)
  date.setUTCMinutes(0, 0, 0)
  return date.toISOString()
}

function buildEvidenceConflict(options: {
  rowId: number
  targetType: 'integration' | 'hub'
  product: {
    id: number
    name: string
    manufacturer?: {
      name: string
    } | null
  }
  target: {
    id: number
    name: string
  }
  canonicalStatus: string
  reviewState: string
  evidence: {
    id: number
    source: string
    sourceRecordKey: string
    assertedStatus: string
    importedAt: Date | string
    supersededAt: Date | string | null
  }[]
}) {
  const importedEvidence = options.evidence.filter(
    (item) => item.supersededAt === null && item.source !== 'manual',
  )

  if (importedEvidence.length === 0) {
    return null
  }

  const statuses = Array.from(new Set(importedEvidence.map((item) => item.assertedStatus)))
  const sources = Array.from(new Set(importedEvidence.map((item) => item.source)))
  const latestImportedAt = importedEvidence.reduce<Date | string>(
    (latest, item) =>
      new Date(item.importedAt).getTime() > new Date(latest).getTime() ? item.importedAt : latest,
    importedEvidence[0].importedAt,
  )
  const hasCanonicalMismatch = !statuses.includes(options.canonicalStatus)
  const hasSourceConflict = statuses.length > 1

  if (!hasCanonicalMismatch && !hasSourceConflict) {
    return null
  }

  return {
    id: `${options.targetType}-${options.rowId}`,
    targetType: options.targetType,
    compatibilityId: options.rowId,
    product: {
      id: options.product.id,
      name: options.product.name,
      manufacturer: options.product.manufacturer?.name ?? null,
    },
    target: options.target,
    canonicalStatus: options.canonicalStatus,
    reviewState: options.reviewState,
    evidenceCount: importedEvidence.length,
    evidenceSources: sources,
    evidenceStatuses: statuses,
    lastImportedAt: latestImportedAt,
    conflictReason: hasSourceConflict ? 'conflicting_imports' : 'canonical_mismatch',
    latestEvidence: importedEvidence
      .sort((left, right) => new Date(right.importedAt).getTime() - new Date(left.importedAt).getTime())
      .slice(0, 3)
      .map((item) => ({
        id: item.id,
        source: item.source,
        sourceRecordKey: item.sourceRecordKey,
        assertedStatus: item.assertedStatus,
        importedAt: item.importedAt,
      })),
  }
}

function ensureSourceCompatibilityMappingTarget(input: {
  targetType: 'integration' | 'hub'
  integrationId?: number | null
  hubId?: number | null
}) {
  const hasIntegrationTarget = input.integrationId != null
  const hasHubTarget = input.hubId != null

  if (hasIntegrationTarget === hasHubTarget) {
    throw new Error('Source compatibility mapping must reference exactly one target')
  }

  if (input.targetType === 'integration' && !hasIntegrationTarget) {
    throw new Error('Integration mapping must reference an integration')
  }

  if (input.targetType === 'hub' && !hasHubTarget) {
    throw new Error('Hub mapping must reference a commercial hub')
  }
}

export const importsRouter = router({
  overview: protectedProcedure.query(async () => {
    const [
      allImports,
      recentTransformed,
      recentEvidence,
      integrationCompatibilityRows,
      hubCompatibilityRows,
      customMappings,
    ] = await Promise.all([
      db.query.rawImports.findMany({
        orderBy: desc(rawImports.importedAt),
        with: {
          product: {
            with: {
              manufacturer: true,
            },
          },
        },
      }),
      db.query.rawImports.findMany({
        where: isNotNull(rawImports.processedAt),
        orderBy: desc(rawImports.processedAt),
        limit: 12,
        with: {
          product: {
            with: {
              manufacturer: true,
            },
          },
        },
      }),
      db.query.compatibilityEvidence.findMany({
        orderBy: desc(compatibilityEvidence.importedAt),
        limit: 12,
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
      }),
      db.query.productIntegrationCompatibility.findMany({
        orderBy: (table, { desc }) => [desc(table.updatedAt)],
        with: {
          product: {
            with: {
              manufacturer: true,
            },
          },
          integration: true,
          evidence: true,
        },
      }),
      db.query.productHubCompatibility.findMany({
        orderBy: (table, { desc }) => [desc(table.updatedAt)],
        with: {
          product: {
            with: {
              manufacturer: true,
            },
          },
          hub: true,
          evidence: true,
        },
      }),
      db.query.sourceCompatibilityMappings.findMany({
        orderBy: (table, { desc }) => [desc(table.updatedAt)],
        with: {
          integration: true,
          hub: true,
        },
      }),
    ])
    const resolvedBlakadderCodes = new Set(
      customMappings.filter((item) => item.source === 'blakadder').map((item) => item.sourceCode),
    )

    const sourceSummaryMap = new Map<
      string,
      {
        source: string
        total: number
        processed: number
        pending: number
        linkedProducts: number
        lastImportedAt: Date | string | null
      }
    >()
    const batchSummaryMap = new Map<
      string,
      {
        key: string
        source: string
        batchStartedAt: string
        latestImportedAt: Date | string
        total: number
        processed: number
        pending: number
        linkedProducts: number
        unresolvedRows: number
        unresolvedCodes: string[]
      }
    >()

    const unresolvedMappings = allImports.flatMap((rawImport) => {
      if (rawImport.source !== 'blakadder') {
        return []
      }

      const unresolvedCodes = findUnmappedCompatibilityCodes(rawImport.data, resolvedBlakadderCodes)

      if (unresolvedCodes.length === 0) {
        return []
      }

      return [
        {
          id: rawImport.id,
          sourceId: rawImport.sourceId,
          importedAt: rawImport.importedAt,
          unresolvedCodes,
          product: rawImport.product
            ? {
                id: rawImport.product.id,
                name: rawImport.product.name,
                manufacturer: rawImport.product.manufacturer?.name ?? null,
              }
            : null,
        },
      ]
    })

    for (const rawImport of allImports) {
      const unresolvedCodes =
        rawImport.source === 'blakadder'
          ? findUnmappedCompatibilityCodes(rawImport.data, resolvedBlakadderCodes)
          : []
      const current = sourceSummaryMap.get(rawImport.source) ?? {
        source: rawImport.source,
        total: 0,
        processed: 0,
        pending: 0,
        linkedProducts: 0,
        lastImportedAt: rawImport.importedAt,
      }

      current.total += 1
      current.processed += rawImport.processedAt ? 1 : 0
      current.pending += rawImport.processedAt ? 0 : 1
      current.linkedProducts += rawImport.productId ? 1 : 0

      if (
        !current.lastImportedAt ||
        new Date(rawImport.importedAt).getTime() > new Date(current.lastImportedAt).getTime()
      ) {
        current.lastImportedAt = rawImport.importedAt
      }

      sourceSummaryMap.set(rawImport.source, current)

      const batchStartedAt = toBatchBucket(rawImport.importedAt)
      const batchKey = `${rawImport.source}:${batchStartedAt}`
      const batch = batchSummaryMap.get(batchKey) ?? {
        key: batchKey,
        source: rawImport.source,
        batchStartedAt,
        latestImportedAt: rawImport.importedAt,
        total: 0,
        processed: 0,
        pending: 0,
        linkedProducts: 0,
        unresolvedRows: 0,
        unresolvedCodes: [],
      }

      batch.total += 1
      batch.processed += rawImport.processedAt ? 1 : 0
      batch.pending += rawImport.processedAt ? 0 : 1
      batch.linkedProducts += rawImport.productId ? 1 : 0
      batch.unresolvedRows += unresolvedCodes.length > 0 ? 1 : 0
      batch.unresolvedCodes.push(...unresolvedCodes)

      if (new Date(rawImport.importedAt).getTime() > new Date(batch.latestImportedAt).getTime()) {
        batch.latestImportedAt = rawImport.importedAt
      }

      batchSummaryMap.set(batchKey, batch)
    }

    const evidenceConflicts = [
      ...integrationCompatibilityRows.flatMap((row) => {
        const conflict = buildEvidenceConflict({
          rowId: row.id,
          targetType: 'integration',
          product: row.product,
          target: {
            id: row.integration.id,
            name: row.integration.name,
          },
          canonicalStatus: row.status,
          reviewState: row.reviewState,
          evidence: row.evidence,
        })

        return conflict ? [conflict] : []
      }),
      ...hubCompatibilityRows.flatMap((row) => {
        const conflict = buildEvidenceConflict({
          rowId: row.id,
          targetType: 'hub',
          product: row.product,
          target: {
            id: row.hub.id,
            name: row.hub.name,
          },
          canonicalStatus: row.status,
          reviewState: row.reviewState,
          evidence: row.evidence,
        })

        return conflict ? [conflict] : []
      }),
    ]
      .sort((left, right) => {
        if (left.conflictReason !== right.conflictReason) {
          return left.conflictReason === 'conflicting_imports' ? -1 : 1
        }

        return new Date(right.lastImportedAt).getTime() - new Date(left.lastImportedAt).getTime()
      })
      .slice(0, 12)

    return {
      totals: {
        imports: allImports.length,
        processed: allImports.filter((item) => item.processedAt !== null).length,
        pending: allImports.filter((item) => item.processedAt === null).length,
        linkedProducts: allImports.filter((item) => item.productId !== null).length,
        evidence: recentEvidence.length,
        unresolvedMappings: unresolvedMappings.length,
      },
      sources: Array.from(sourceSummaryMap.values()).sort((left, right) =>
        left.source.localeCompare(right.source),
      ),
      recentBatches: Array.from(batchSummaryMap.values())
        .map((batch) => ({
          ...batch,
          unresolvedCodes: Array.from(new Set(batch.unresolvedCodes)).slice(0, 6),
        }))
        .sort(
          (left, right) =>
            new Date(right.latestImportedAt).getTime() - new Date(left.latestImportedAt).getTime(),
        )
        .slice(0, 12),
      recentTransformed: recentTransformed.map((rawImport) => ({
        id: rawImport.id,
        source: rawImport.source,
        sourceId: rawImport.sourceId,
        importedAt: rawImport.importedAt,
        processedAt: rawImport.processedAt,
        product: rawImport.product
          ? {
              id: rawImport.product.id,
              name: rawImport.product.name,
              manufacturer: rawImport.product.manufacturer?.name ?? null,
              status: rawImport.product.status,
            }
          : null,
      })),
      recentEvidence: recentEvidence.map((evidence) => ({
        id: evidence.id,
        targetType: evidence.targetType,
        source: evidence.source,
        assertedStatus: evidence.assertedStatus,
        importedAt: evidence.importedAt,
        sourceRecordKey: evidence.sourceRecordKey,
        targetLabel: evidence.productIntegrationCompatibility
          ? `${evidence.productIntegrationCompatibility.product.name} -> ${evidence.productIntegrationCompatibility.integration.name}`
          : evidence.productHubCompatibility
            ? `${evidence.productHubCompatibility.product.name} -> ${evidence.productHubCompatibility.hub.name}`
            : 'Unknown target',
      })),
      unresolvedMappings: unresolvedMappings
        .sort(
          (left, right) =>
            new Date(right.importedAt).getTime() - new Date(left.importedAt).getTime(),
        )
        .slice(0, 20),
      evidenceConflicts,
      customMappings: customMappings.map((item) => ({
        id: item.id,
        source: item.source,
        sourceCode: item.sourceCode,
        targetType: item.targetType,
        targetLabel:
          item.targetType === 'integration'
            ? item.integration?.name ?? 'Unknown integration'
            : item.hub?.name ?? 'Unknown hub',
        targetId:
          item.targetType === 'integration'
            ? item.integration?.id ?? null
            : item.hub?.id ?? null,
        notes: item.notes,
        updatedAt: item.updatedAt,
      })),
    }
  }),

  list: protectedProcedure
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
          processed ? isNotNull(rawImports.processedAt) : isNull(rawImports.processedAt),
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
        db.select({ count: count() }).from(rawImports).where(whereClause),
      ])

      return {
        items,
        total: Number(countResult[0]?.count ?? 0),
      }
    }),

  byId: protectedProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
    const rawImport = await db.query.rawImports.findFirst({
      where: eq(rawImports.id, input.id),
    })

    return rawImport ?? null
  }),

  createCompatibilityMapping: protectedProcedure
    .input(sourceCompatibilityMappingCreateSchema)
    .mutation(async ({ input }) => {
      ensureSourceCompatibilityMappingTarget(input)

      const targetKey =
        input.targetType === 'integration'
          ? `integration:${input.integrationId}`
          : `hub:${input.hubId}`

      const [mapping] = await db
        .insert(sourceCompatibilityMappings)
        .values({
          source: input.source,
          sourceCode: input.sourceCode,
          targetType: input.targetType,
          targetKey,
          integrationId: input.targetType === 'integration' ? input.integrationId ?? null : null,
          hubId: input.targetType === 'hub' ? input.hubId ?? null : null,
          notes: input.notes ?? null,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: [
            sourceCompatibilityMappings.source,
            sourceCompatibilityMappings.sourceCode,
            sourceCompatibilityMappings.targetKey,
          ],
          set: {
            notes: input.notes ?? null,
            targetType: input.targetType,
            integrationId: input.targetType === 'integration' ? input.integrationId ?? null : null,
            hubId: input.targetType === 'hub' ? input.hubId ?? null : null,
            updatedAt: new Date(),
          },
        })
        .returning()

      let matchedImports = 0
      const updatedProducts = new Set<number>()

      if (input.applyToExistingProducts && input.source === 'blakadder') {
        const existingImports = await db.query.rawImports.findMany({
          where: and(eq(rawImports.source, input.source), isNotNull(rawImports.productId)),
        })

        for (const rawImport of existingImports) {
          if (!rawImport.productId) {
            continue
          }

          const codes = extractCompatibilityCodes(rawImport.data)

          if (!codes.includes(input.sourceCode)) {
            continue
          }

          matchedImports += 1
          updatedProducts.add(rawImport.productId)

          await createCompatibilityRecords(rawImport.productId, rawImport.data, {
            sourceRecordKey: `${rawImport.source}:${rawImport.sourceId}`,
          })
        }
      }

      return {
        mapping,
        matchedImports,
        updatedProducts: updatedProducts.size,
      }
    }),

  trigger: protectedProcedure.input(z.object({ source: importSourceSchema })).mutation(async () => {
    // TODO: Queue import job
    return { jobId: 'placeholder-job-id' }
  }),
})
