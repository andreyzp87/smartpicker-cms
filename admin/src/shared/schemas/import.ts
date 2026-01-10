import { z } from 'zod'

export const importSourceSchema = z.enum(['zigbee2mqtt', 'blakadder', 'zwave-js'])

export const rawImportSchema = z.object({
  source: importSourceSchema,
  sourceId: z.string().min(1).max(255),
  data: z.record(z.string(), z.unknown()),
  checksum: z.string().max(64).optional(),
})

export type ImportSource = z.infer<typeof importSourceSchema>
export type RawImport = z.infer<typeof rawImportSchema>
