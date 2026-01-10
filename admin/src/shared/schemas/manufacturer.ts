import { z } from 'zod'

export const manufacturerCreateSchema = z.object({
  name: z.string().min(1).max(255),
  slug: z
    .string()
    .min(1)
    .max(255)
    .regex(/^[a-z0-9-]+$/),
  website: z.string().url().optional().nullable(),
  logoUrl: z.string().url().optional().nullable(),
})

export const manufacturerUpdateSchema = manufacturerCreateSchema.partial()

export type ManufacturerCreate = z.infer<typeof manufacturerCreateSchema>
export type ManufacturerUpdate = z.infer<typeof manufacturerUpdateSchema>
