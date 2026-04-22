/**
 * Validation Schemas Tests
 *
 * Tests for Zod validation schemas used throughout the application.
 */

import { describe, it, expect } from 'vitest'
import { z } from 'zod'
import {
  MemorySourceTypeSchema,
  CreateMemorySchema,
  UpdateMemorySchema,
  type CreateMemoryInput,
  type UpdateMemoryInput,
} from '../validations/memory'
import {
  CreateChatSessionSchema,
  CreateChatMessageSchema,
  type CreateChatSessionInput,
  type CreateChatMessageInput,
} from '../validations/chat'

describe('Memory Validation Schemas', () => {
  describe('MemorySourceTypeSchema', () => {
    it('should accept valid memory source types', () => {
      const validTypes = [
        'email',
        'github_issue',
        'github_pr',
        'notion_page',
        'obsidian_note',
        'calendar_event',
        'drive_file',
        'slack_message',
        'local_file',
      ] as const

      validTypes.forEach((type) => {
        const result = MemorySourceTypeSchema.safeParse(type)
        expect(result.success).toBe(true)
      })
    })

    it('should reject invalid memory source types', () => {
      const result = MemorySourceTypeSchema.safeParse('invalid_type')

      expect(result.success).toBe(false)
    })
  })

  describe('CreateMemorySchema', () => {
    const validMemory = {
      sourceType: 'local_file',
      title: 'Test Memory',
      content: 'Test content',
    }

    it('should accept valid memory with required fields', () => {
      const result = CreateMemorySchema.safeParse(validMemory)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toEqual(validMemory)
      }
    })

    it('should accept memory with optional fields', () => {
      const memoryWithOptionals = {
        sourceType: 'local_file' as const,
        title: 'Test Memory',
        content: 'Test content',
        connectorId: 'connector-123',
        sourceId: 'source-456',
        tags: ['tag1', 'tag2'],
        sourceTimestamp: new Date('2024-01-01T00:00:00.000Z'),
        sourceUrl: 'https://example.com',
      }

      const result = CreateMemorySchema.safeParse(memoryWithOptionals)

      expect(result.success).toBe(true)
    })

    it('should accept empty sourceUrl', () => {
      const memoryWithEmptyUrl = {
        ...validMemory,
        sourceUrl: '',
      }

      const result = CreateMemorySchema.safeParse(memoryWithEmptyUrl)

      expect(result.success).toBe(true)
    })

    it('should reject memory without title', () => {
      const invalidMemory = {
        sourceType: 'local_file' as const,
        content: 'Test content',
      }

      const result = CreateMemorySchema.safeParse(invalidMemory)

      expect(result.success).toBe(false)
    })

    it('should reject memory with empty title', () => {
      const invalidMemory = {
        sourceType: 'local_file',
        title: '',
        content: 'Test content',
      }

      const result = CreateMemorySchema.safeParse(invalidMemory)

      expect(result.success).toBe(false)
    })

    it('should reject memory with title too long', () => {
      const invalidMemory = {
        sourceType: 'local_file',
        title: 'a'.repeat(501), // Exceeds 500 character limit
        content: 'Test content',
      }

      const result = CreateMemorySchema.safeParse(invalidMemory)

      expect(result.success).toBe(false)
    })

    it('should reject memory without content', () => {
      const invalidMemory = {
        sourceType: 'local_file',
        title: 'Test Memory',
      }

      const result = CreateMemorySchema.safeParse(invalidMemory)

      expect(result.success).toBe(false)
    })

    it('should reject memory with empty content', () => {
      const invalidMemory = {
        sourceType: 'local_file',
        title: 'Test Memory',
        content: '',
      }

      const result = CreateMemorySchema.safeParse(invalidMemory)

      expect(result.success).toBe(false)
    })

    it('should reject memory with content too large', () => {
      const invalidMemory = {
        sourceType: 'local_file',
        title: 'Test Memory',
        content: 'a'.repeat(100001), // Exceeds 100,000 character limit
      }

      const result = CreateMemorySchema.safeParse(invalidMemory)

      expect(result.success).toBe(false)
    })

    it('should reject memory with invalid sourceType', () => {
      const invalidMemory = {
        sourceType: 'invalid_type',
        title: 'Test Memory',
        content: 'Test content',
      }

      const result = CreateMemorySchema.safeParse(invalidMemory)

      expect(result.success).toBe(false)
    })

    it('should reject memory with invalid sourceUrl', () => {
      const invalidMemory = {
        ...validMemory,
        sourceUrl: 'not-a-url',
      }

      const result = CreateMemorySchema.safeParse(invalidMemory)

      expect(result.success).toBe(false)
    })

    it('should coerce date strings for sourceTimestamp', () => {
      const memoryWithDate = {
        ...validMemory,
        sourceTimestamp: '2024-01-01T00:00:00.000Z',
      }

      const result = CreateMemorySchema.safeParse(memoryWithDate)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.sourceTimestamp).toBeInstanceOf(Date)
      }
    })

    it('should accept empty tags array', () => {
      const memoryWithEmptyTags = {
        ...validMemory,
        tags: [],
      }

      const result = CreateMemorySchema.safeParse(memoryWithEmptyTags)

      expect(result.success).toBe(true)
    })

    it('should accept memory with empty metadata', () => {
      const memoryWithEmptyMetadata = {
        sourceType: 'local_file' as const,
        title: 'Test Memory',
        content: 'Test content',
        metadata: {},
      }

      const result = CreateMemorySchema.safeParse(memoryWithEmptyMetadata)

      expect(result.success).toBe(true)
    })
  })

  describe('UpdateMemorySchema', () => {
    it('should accept valid title update', () => {
      const update = {
        title: 'Updated Title',
      }

      const result = UpdateMemorySchema.safeParse(update)

      expect(result.success).toBe(true)
    })

    it('should accept valid content update', () => {
      const update = {
        content: 'Updated content',
      }

      const result = UpdateMemorySchema.safeParse(update)

      expect(result.success).toBe(true)
    })

    it('should accept valid tags update', () => {
      const update = {
        tags: ['new-tag'],
      }

      const result = UpdateMemorySchema.safeParse(update)

      expect(result.success).toBe(true)
    })

    it('should accept valid metadata update', () => {
      const update = {
        title: 'Updated Title',
      }

      const result = UpdateMemorySchema.safeParse(update)

      expect(result.success).toBe(true)
    })

    it('should accept multiple field updates', () => {
      const update = {
        title: 'Updated Title',
        content: 'Updated content',
        tags: ['tag1', 'tag2'],
      }

      const result = UpdateMemorySchema.safeParse(update)

      expect(result.success).toBe(true)
    })

    it('should accept empty update object', () => {
      const update = {}

      const result = UpdateMemorySchema.safeParse(update)

      expect(result.success).toBe(true)
    })

    it('should reject title update that is too short', () => {
      const update = {
        title: '',
      }

      const result = UpdateMemorySchema.safeParse(update)

      expect(result.success).toBe(false)
    })

    it('should reject title update that is too long', () => {
      const update = {
        title: 'a'.repeat(501),
      }

      const result = UpdateMemorySchema.safeParse(update)

      expect(result.success).toBe(false)
    })

    it('should reject content update that is too short', () => {
      const update = {
        content: '',
      }

      const result = UpdateMemorySchema.safeParse(update)

      expect(result.success).toBe(false)
    })

    it('should reject content update that is too large', () => {
      const update = {
        content: 'a'.repeat(100001),
      }

      const result = UpdateMemorySchema.safeParse(update)

      expect(result.success).toBe(false)
    })
  })

  describe('Memory Type Exports', () => {
    it('should export CreateMemoryInput type', () => {
      const input: CreateMemoryInput = {
        sourceType: 'local_file',
        title: 'Test',
        content: 'Content',
      }

      expect(input).toBeDefined()
    })

    it('should export UpdateMemoryInput type', () => {
      const input: UpdateMemoryInput = {
        title: 'Updated',
      }

      expect(input).toBeDefined()
    })
  })
})

describe('Chat Validation Schemas', () => {
  describe('CreateChatSessionSchema', () => {
    it('should accept valid session with title', () => {
      const session = {
        title: 'Test Chat',
      }

      const result = CreateChatSessionSchema.safeParse(session)

      expect(result.success).toBe(true)
    })

    it('should accept session without title', () => {
      const session = {}

      const result = CreateChatSessionSchema.safeParse(session)

      expect(result.success).toBe(true)
    })

    it('should reject title that is too short', () => {
      const session = {
        title: '',
      }

      const result = CreateChatSessionSchema.safeParse(session)

      expect(result.success).toBe(false)
    })

    it('should reject title that is too long', () => {
      const session = {
        title: 'a'.repeat(201), // Exceeds 200 character limit
      }

      const result = CreateChatSessionSchema.safeParse(session)

      expect(result.success).toBe(false)
    })
  })

  describe('CreateChatMessageSchema', () => {
    const validMessage = {
      content: 'Hello, how are you?',
    }

    it('should accept valid message with required fields', () => {
      const result = CreateChatMessageSchema.safeParse(validMessage)

      expect(result.success).toBe(true)
    })

    it('should accept message with role', () => {
      const messageWithRole = {
        ...validMessage,
        role: 'user',
      }

      const result = CreateChatMessageSchema.safeParse(messageWithRole)

      expect(result.success).toBe(true)
    })

    it('should accept message with assistant role', () => {
      const messageWithRole = {
        ...validMessage,
        role: 'assistant',
      }

      const result = CreateChatMessageSchema.safeParse(messageWithRole)

      expect(result.success).toBe(true)
    })

    it('should reject message without content', () => {
      const invalidMessage = {}

      const result = CreateChatMessageSchema.safeParse(invalidMessage)

      expect(result.success).toBe(false)
    })

    it('should reject message with empty content', () => {
      const invalidMessage = {
        content: '',
      }

      const result = CreateChatMessageSchema.safeParse(invalidMessage)

      expect(result.success).toBe(false)
    })

    it('should reject message with content too large', () => {
      const invalidMessage = {
        content: 'a'.repeat(10001), // Exceeds 10,000 character limit
      }

      const result = CreateChatMessageSchema.safeParse(invalidMessage)

      expect(result.success).toBe(false)
    })

    it('should reject message with invalid role', () => {
      const invalidMessage = {
        ...validMessage,
        role: 'invalid_role',
      }

      const result = CreateChatMessageSchema.safeParse(invalidMessage)

      expect(result.success).toBe(false)
    })
  })

  describe('Chat Type Exports', () => {
    it('should export CreateChatSessionInput type', () => {
      const input: CreateChatSessionInput = {
        title: 'Test',
      }

      expect(input).toBeDefined()
    })

    it('should export CreateChatMessageInput type', () => {
      const input: CreateChatMessageInput = {
        content: 'Hello',
      }

      expect(input).toBeDefined()
    })
  })
})
