import { z } from 'zod'

// ===========================================
// INSIGHT VALIDATION SCHEMAS
// ===========================================

export const InsightTypeSchema = z.enum([
  'connection',
  'reminder',
  'draft',
  'summary',
  'suggestion',
])

export const InsightStatusSchema = z.enum([
  'pending',
  'surfaced',
  'acted',
  'dismissed',
  'expired',
])

export const InsightFeedbackSchema = z.enum([
  'useful',
  'not_useful',
  'already_knew',
])

export const UpdateInsightSchema = z.object({
  status: InsightStatusSchema.optional(),
  feedback: InsightFeedbackSchema.optional(),
  priority: z.number().int().min(1).max(10).optional(),
})

export type UpdateInsightInput = z.infer<typeof UpdateInsightSchema>
