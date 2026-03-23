import { z } from 'zod'
import { productStatusSchema, protocolSchema } from './product'

export const integrationKindSchema = z.enum([
  'protocol_stack',
  'bridge',
  'native_component',
  'vendor_connector',
  'addon',
  'external_service',
])

export const integrationCreateSchema = z.object({
  name: z.string().min(1).max(255),
  slug: z
    .string()
    .min(1)
    .max(255)
    .regex(/^[a-z0-9-]+$/),
  integrationKind: integrationKindSchema,
  primaryProtocol: protocolSchema.optional().nullable(),
  manufacturerId: z.number().int().positive().optional().nullable(),
  website: z.string().url().optional().nullable(),
  description: z.string().optional().nullable(),
  status: productStatusSchema.default('draft'),
})

export const integrationUpdateSchema = integrationCreateSchema.partial()

export type IntegrationKind = z.infer<typeof integrationKindSchema>
export type IntegrationCreate = z.infer<typeof integrationCreateSchema>
export type IntegrationUpdate = z.infer<typeof integrationUpdateSchema>
