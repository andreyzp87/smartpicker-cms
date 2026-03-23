import { z } from 'zod'

export const compatibilityStatusSchema = z.enum([
  'verified',
  'supported',
  'reported',
  'untested',
  'incompatible',
])

export const reviewStateSchema = z.enum(['pending', 'approved', 'rejected'])
export const evidenceSourceSchema = z.enum([
  'zigbee2mqtt',
  'blakadder',
  'zwave_js',
  'manual',
  'imported_other',
])
export const supportTypeSchema = z.enum(['native', 'addon', 'external', 'community'])
export const hardwareRequirementTypeSchema = z.enum(['required', 'recommended', 'supported'])

export const productIntegrationCompatibilityCreateSchema = z.object({
  productId: z.number().int().positive(),
  integrationId: z.number().int().positive(),
  status: compatibilityStatusSchema,
  reviewState: reviewStateSchema.default('pending'),
  supportSummary: z.string().optional().nullable(),
  internalNotes: z.string().optional().nullable(),
  canonicalSource: evidenceSourceSchema,
  firstSeenAt: z.date().optional().nullable(),
  lastConfirmedAt: z.date().optional().nullable(),
})

export const productIntegrationCompatibilityUpdateSchema =
  productIntegrationCompatibilityCreateSchema.partial()

export const productHubCompatibilityCreateSchema = z.object({
  productId: z.number().int().positive(),
  hubId: z.number().int().positive(),
  status: compatibilityStatusSchema,
  reviewState: reviewStateSchema.default('pending'),
  supportSummary: z.string().optional().nullable(),
  internalNotes: z.string().optional().nullable(),
  canonicalSource: evidenceSourceSchema,
  firstSeenAt: z.date().optional().nullable(),
  lastConfirmedAt: z.date().optional().nullable(),
})

export const productHubCompatibilityUpdateSchema = productHubCompatibilityCreateSchema.partial()

export const platformIntegrationCreateSchema = z.object({
  platformId: z.number().int().positive(),
  integrationId: z.number().int().positive(),
  supportType: supportTypeSchema,
  notes: z.string().optional().nullable(),
})

export const integrationHardwareSupportCreateSchema = z.object({
  integrationId: z.number().int().positive(),
  productId: z.number().int().positive(),
  requirementType: hardwareRequirementTypeSchema,
  notes: z.string().optional().nullable(),
})

export const compatibilityEvidenceCreateSchema = z.object({
  targetType: z.enum(['integration', 'hub']),
  productIntegrationCompatibilityId: z.number().int().positive().optional().nullable(),
  productHubCompatibilityId: z.number().int().positive().optional().nullable(),
  source: evidenceSourceSchema,
  sourceRecordKey: z.string().min(1),
  assertedStatus: compatibilityStatusSchema,
  note: z.string().optional().nullable(),
  metadata: z.record(z.string(), z.unknown()).default({}),
  importedAt: z.date(),
})

export const compatibilityEvidenceUpdateSchema = compatibilityEvidenceCreateSchema.partial()

export type CompatibilityStatus = z.infer<typeof compatibilityStatusSchema>
export type ReviewState = z.infer<typeof reviewStateSchema>
export type EvidenceSource = z.infer<typeof evidenceSourceSchema>
export type SupportType = z.infer<typeof supportTypeSchema>
export type HardwareRequirementType = z.infer<typeof hardwareRequirementTypeSchema>
export type ProductIntegrationCompatibilityCreate = z.infer<
  typeof productIntegrationCompatibilityCreateSchema
>
export type ProductIntegrationCompatibilityUpdate = z.infer<
  typeof productIntegrationCompatibilityUpdateSchema
>
export type ProductHubCompatibilityCreate = z.infer<typeof productHubCompatibilityCreateSchema>
export type ProductHubCompatibilityUpdate = z.infer<typeof productHubCompatibilityUpdateSchema>
export type PlatformIntegrationCreate = z.infer<typeof platformIntegrationCreateSchema>
export type IntegrationHardwareSupportCreate = z.infer<
  typeof integrationHardwareSupportCreateSchema
>
export type CompatibilityEvidenceCreate = z.infer<typeof compatibilityEvidenceCreateSchema>
export type CompatibilityEvidenceUpdate = z.infer<typeof compatibilityEvidenceUpdateSchema>
