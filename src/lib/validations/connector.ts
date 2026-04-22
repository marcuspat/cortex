import { z } from 'zod'

// ===========================================
// CONNECTOR VALIDATION SCHEMAS
// ===========================================

export const ConnectorTypeSchema = z.enum([
  'gmail',
  'github',
  'obsidian',
  'notion',
  'google_calendar',
  'google_drive',
  'slack',
  'local_filesystem',
])

export const ConnectorStatusSchema = z.enum([
  'active',
  'inactive',
  'error',
  'syncing',
  'disconnected',
])

export const CreateConnectorSchema = z.object({
  type: ConnectorTypeSchema,
  name: z.string()
    .min(1, 'Name is required')
    .max(100, 'Name must be less than 100 characters'),
  config: z.record(z.any()).optional(),
  status: ConnectorStatusSchema.optional(),
})

export const UpdateConnectorSchema = z.object({
  name: z.string()
    .min(1, 'Name is required')
    .max(100, 'Name must be less than 100 characters')
    .optional(),
  config: z.record(z.any()).optional(),
  status: ConnectorStatusSchema.optional(),
})

export type CreateConnectorInput = z.infer<typeof CreateConnectorSchema>
export type UpdateConnectorInput = z.infer<typeof UpdateConnectorSchema>
