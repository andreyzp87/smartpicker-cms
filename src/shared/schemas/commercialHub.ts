import { z } from 'zod'
import { productStatusSchema } from './product'

export const commercialHubCreateSchema = z.object({
  name: z.string().min(1).max(255),
  slug: z
    .string()
    .min(1)
    .max(255)
    .regex(/^[a-z0-9-]+$/),
  manufacturerId: z.number().int().positive().optional().nullable(),
  website: z.string().url().optional().nullable(),
  description: z.string().optional().nullable(),
  status: productStatusSchema.default('draft'),
})

export const commercialHubUpdateSchema = commercialHubCreateSchema.partial()

export type CommercialHubCreate = z.infer<typeof commercialHubCreateSchema>
export type CommercialHubUpdate = z.infer<typeof commercialHubUpdateSchema>
