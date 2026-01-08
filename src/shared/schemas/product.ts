import { z } from 'zod'

export const protocolSchema = z.enum(['zigbee', 'zwave', 'matter', 'wifi', 'thread', 'bluetooth'])

export const productStatusSchema = z.enum(['draft', 'published', 'archived'])

export const productCreateSchema = z.object({
  name: z.string().min(1).max(255),
  slug: z
    .string()
    .min(1)
    .max(255)
    .regex(/^[a-z0-9-]+$/),
  manufacturerId: z.number().int().positive().optional().nullable(),
  model: z.string().max(255).optional().nullable(),
  categoryId: z.number().int().positive().optional().nullable(),
  primaryProtocol: protocolSchema.optional().nullable(),
  localControl: z.boolean().optional().nullable(),
  cloudDependent: z.boolean().optional().nullable(),
  requiresHub: z.boolean().optional().nullable(),
  matterCertified: z.boolean().optional().nullable(),
  imageUrl: z.string().url().optional().nullable(),
  description: z.string().optional().nullable(),
  status: productStatusSchema.default('draft'),
})

export const productUpdateSchema = productCreateSchema.partial()

export const productFilterSchema = z.object({
  search: z.string().optional(),
  protocol: protocolSchema.optional(),
  manufacturerId: z.coerce.number().int().positive().optional(),
  categoryId: z.coerce.number().int().positive().optional(),
  status: productStatusSchema.optional(),
  localControl: z.coerce.boolean().optional(),
  matterCertified: z.coerce.boolean().optional(),
})

export const paginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
  sortField: z.string().default('name'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
})

// Inferred types
export type Protocol = z.infer<typeof protocolSchema>
export type ProductStatus = z.infer<typeof productStatusSchema>
export type ProductCreate = z.infer<typeof productCreateSchema>
export type ProductUpdate = z.infer<typeof productUpdateSchema>
export type ProductFilter = z.infer<typeof productFilterSchema>
export type Pagination = z.infer<typeof paginationSchema>
