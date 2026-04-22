import { z } from 'zod'

// ===========================================
// SETTINGS VALIDATION SCHEMAS
// ===========================================

export const SettingKeySchema = z.enum([
  // Inference settings
  'inference_provider',
  'inference_model',
  'inference_temperature',

  // Privacy settings
  'data_retention_days',
  'anonymous_analytics',

  // Connector settings
  'sync_frequency_minutes',
  'auto_sync_enabled',

  // UI settings
  'theme',
  'items_per_page',
])

export const SettingValueSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.array(z.any()),
  z.record(z.any()),
])

export const UpsertSettingsSchema = z.record(
  SettingKeySchema,
  SettingValueSchema
)

export type UpsertSettingsInput = z.infer<typeof UpsertSettingsSchema>
