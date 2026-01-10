import { z } from 'zod'
import { protocolSchema } from './product'

export const hubCreateSchema = z.object({
  name: z.string().min(1).max(255),
  slug: z
    .string()
    .min(1)
    .max(255)
    .regex(/^[a-z0-9-]+$/),
  manufacturerId: z.number().int().positive().optional().nullable(),
  protocolsSupported: z.array(protocolSchema).default([]),
  description: z.string().optional().nullable(),
})

export const hubUpdateSchema = hubCreateSchema.partial()

export type HubCreate = z.infer<typeof hubCreateSchema>
export type HubUpdate = z.infer<typeof hubUpdateSchema>
