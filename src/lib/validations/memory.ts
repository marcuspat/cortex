import { z } from 'zod'

// ===========================================
// MEMORY VALIDATION SCHEMAS
// ===========================================

export const MemorySourceTypeSchema = z.enum([
  'email',
  'github_issue',
  'github_pr',
  'notion_page',
  'obsidian_note',
  'calendar_event',
  'drive_file',
  'slack_message',
  'local_file',
])

export const CreateMemorySchema = z.object({
  connectorId: z.string().optional(),
  sourceId: z.string().optional(),
  sourceType: MemorySourceTypeSchema,
  title: z.string()
    .min(1, 'Title is required')
    .max(500, 'Title must be less than 500 characters'),
  content: z.string()
    .min(1, 'Content is required')
    .max(100000, 'Content too large (max 100,000 characters)'),
  metadata: z.record(z.any()).optional(),
  tags: z.array(z.string()).optional(),
  sourceTimestamp: z.coerce.date().optional(),
  sourceUrl: z.string().url().optional().or(z.literal('')),
})

export const UpdateMemorySchema = z.object({
  title: z.string()
    .min(1, 'Title is required')
    .max(500, 'Title must be less than 500 characters')
    .optional(),
  content: z.string()
    .min(1, 'Content is required')
    .max(100000, 'Content too large (max 100,000 characters)')
    .optional(),
  tags: z.array(z.string()).optional(),
  metadata: z.record(z.any()).optional(),
})

export type CreateMemoryInput = z.infer<typeof CreateMemorySchema>
export type UpdateMemoryInput = z.infer<typeof UpdateMemorySchema>
