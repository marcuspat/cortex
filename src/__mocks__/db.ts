/**
 * Mock Prisma Client for Testing
 *
 * This mock provides a complete Prisma client implementation
 * with all necessary methods for testing without a real database.
 */

import { PrismaClient } from '@prisma/client'

// Mock user data
const mockUsers = [
  {
    id: 'user-1',
    name: 'Test User',
    email: 'test@example.com',
    emailVerified: new Date(),
    image: 'https://example.com/avatar.png',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
]

// Mock memory data
const mockMemories = [
  {
    id: 'memory-1',
    userId: 'user-1',
    connectorId: null,
    sourceId: null,
    sourceType: 'local_file',
    title: 'Test Memory',
    content: 'Test content',
    metadata: {},
    tags: [],
    sourceTimestamp: null,
    sourceUrl: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
]

// Mock chat session data
const mockChatSessions = [
  {
    id: 'session-1',
    userId: 'user-1',
    title: 'Test Chat',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
]

// Mock chat message data
const mockChatMessages = [
  {
    id: 'message-1',
    sessionId: 'session-1',
    role: 'user',
    content: 'Hello',
    createdAt: new Date(),
  },
]

// Mock connector data
const mockConnectors = [
  {
    id: 'connector-1',
    userId: 'user-1',
    type: 'email',
    name: 'Email Connector',
    config: {},
    isActive: true,
    lastSyncAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
]

// Create a mock Prisma client
const mockPrismaClient = {
  user: {
    findMany: vi.fn().mockResolvedValue(mockUsers),
    findUnique: vi.fn().mockResolvedValue(mockUsers[0]),
    findFirst: vi.fn().mockResolvedValue(mockUsers[0]),
    create: vi.fn().mockResolvedValue(mockUsers[0]),
    update: vi.fn().mockResolvedValue(mockUsers[0]),
    delete: vi.fn().mockResolvedValue(mockUsers[0]),
    count: vi.fn().mockResolvedValue(1),
  },
  memory: {
    findMany: vi.fn().mockResolvedValue(mockMemories),
    findUnique: vi.fn().mockResolvedValue(mockMemories[0]),
    findFirst: vi.fn().mockResolvedValue(mockMemories[0]),
    create: vi.fn().mockResolvedValue(mockMemories[0]),
    update: vi.fn().mockResolvedValue(mockMemories[0]),
    delete: vi.fn().mockResolvedValue(mockMemories[0]),
    count: vi.fn().mockResolvedValue(1),
  },
  chatSession: {
    findMany: vi.fn().mockResolvedValue(mockChatSessions),
    findUnique: vi.fn().mockResolvedValue(mockChatSessions[0]),
    findFirst: vi.fn().mockResolvedValue(mockChatSessions[0]),
    create: vi.fn().mockResolvedValue(mockChatSessions[0]),
    update: vi.fn().mockResolvedValue(mockChatSessions[0]),
    delete: vi.fn().mockResolvedValue(mockChatSessions[0]),
    count: vi.fn().mockResolvedValue(1),
  },
  chatMessage: {
    findMany: vi.fn().mockResolvedValue(mockChatMessages),
    findUnique: vi.fn().mockResolvedValue(mockChatMessages[0]),
    findFirst: vi.fn().mockResolvedValue(mockChatMessages[0]),
    create: vi.fn().mockResolvedValue(mockChatMessages[0]),
    update: vi.fn().mockResolvedValue(mockChatMessages[0]),
    delete: vi.fn().mockResolvedValue(mockChatMessages[0]),
    count: vi.fn().mockResolvedValue(1),
  },
  connector: {
    findMany: vi.fn().mockResolvedValue(mockConnectors),
    findUnique: vi.fn().mockResolvedValue(mockConnectors[0]),
    findFirst: vi.fn().mockResolvedValue(mockConnectors[0]),
    create: vi.fn().mockResolvedValue(mockConnectors[0]),
    update: vi.fn().mockResolvedValue(mockConnectors[0]),
    delete: vi.fn().mockResolvedValue(mockConnectors[0]),
    count: vi.fn().mockResolvedValue(1),
  },
  $transaction: vi.fn().mockImplementation(async (callback) => {
    return callback(mockPrismaClient)
  }),
  $disconnect: vi.fn().mockResolvedValue(undefined),
  $connect: vi.fn().mockResolvedValue(undefined),
}

// Export both named and default exports
export const prisma = mockPrismaClient as any as PrismaClient
export default mockPrismaClient as any as PrismaClient
