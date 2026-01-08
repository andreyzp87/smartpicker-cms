import { z } from 'zod'

export const categoryCreateSchema = z.object({
  name: z.string().min(1).max(255),
  slug: z
    .string()
    .min(1)
    .max(255)
    .regex(/^[a-z0-9-]+$/),
  parentId: z.number().int().positive().optional().nullable(),
  sortOrder: z.number().int().default(0),
})

export const categoryUpdateSchema = categoryCreateSchema.partial()

export type CategoryCreate = z.infer<typeof categoryCreateSchema>
export type CategoryUpdate = z.infer<typeof categoryUpdateSchema>
