import { z } from 'zod'

export const compatibilityStatusSchema = z.enum([
  'verified',
  'reported',
  'inferred',
  'untested',
  'incompatible',
])

export const compatibilityCreateSchema = z.object({
  productId: z.number().int().positive(),
  hubId: z.number().int().positive(),
  integrationName: z.string().max(100).optional().nullable(),
  status: compatibilityStatusSchema.default('untested'),
  notes: z.string().optional().nullable(),
  source: z.string().max(100).optional().nullable(),
})

export const compatibilityUpdateSchema = compatibilityCreateSchema.partial()

export type CompatibilityStatus = z.infer<typeof compatibilityStatusSchema>
export type CompatibilityCreate = z.infer<typeof compatibilityCreateSchema>
export type CompatibilityUpdate = z.infer<typeof compatibilityUpdateSchema>
