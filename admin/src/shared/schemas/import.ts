import { z } from 'zod'

export const importSourceSchema = z.enum(['zigbee2mqtt', 'blakadder', 'zwave-js'])

export const rawImportSchema = z.object({
  source: importSourceSchema,
  sourceId: z.string().min(1).max(255),
  data: z.record(z.string(), z.unknown()),
  checksum: z.string().max(64).optional(),
})

export const sourceCompatibilityMappingCreateSchema = z.object({
  source: importSourceSchema.default('blakadder'),
  sourceCode: z.string().min(1).max(100).transform((value) => value.trim().toLowerCase()),
  targetType: z.enum(['integration', 'hub']),
  integrationId: z.number().int().positive().optional().nullable(),
  hubId: z.number().int().positive().optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
  applyToExistingProducts: z.boolean().default(true),
})

export type ImportSource = z.infer<typeof importSourceSchema>
export type RawImport = z.infer<typeof rawImportSchema>
export type SourceCompatibilityMappingCreate = z.infer<typeof sourceCompatibilityMappingCreateSchema>
