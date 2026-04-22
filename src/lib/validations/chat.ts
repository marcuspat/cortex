import { z } from 'zod'

// ===========================================
// CHAT VALIDATION SCHEMAS
// ===========================================

export const CreateChatSessionSchema = z.object({
  title: z.string()
    .min(1, 'Title is required')
    .max(200, 'Title must be less than 200 characters')
    .optional(),
})

export const CreateChatMessageSchema = z.object({
  content: z.string()
    .min(1, 'Message content is required')
    .max(10000, 'Message too large (max 10,000 characters)'),
  role: z.enum(['user', 'assistant']).optional(),
})

export type CreateChatSessionInput = z.infer<typeof CreateChatSessionSchema>
export type CreateChatMessageInput = z.infer<typeof CreateChatMessageSchema>
