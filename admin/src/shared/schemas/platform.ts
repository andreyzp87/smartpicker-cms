import { z } from 'zod'
import { productStatusSchema } from './product'

export const platformKindSchema = z.enum(['open_platform', 'commercial_platform'])

export const platformCreateSchema = z.object({
  name: z.string().min(1).max(255),
  slug: z
    .string()
    .min(1)
    .max(255)
    .regex(/^[a-z0-9-]+$/),
  kind: platformKindSchema,
  manufacturerId: z.number().int().positive().optional().nullable(),
  website: z.string().url().optional().nullable(),
  description: z.string().optional().nullable(),
  status: productStatusSchema.default('draft'),
})

export const platformUpdateSchema = platformCreateSchema.partial()

export type PlatformKind = z.infer<typeof platformKindSchema>
export type PlatformCreate = z.infer<typeof platformCreateSchema>
export type PlatformUpdate = z.infer<typeof platformUpdateSchema>
