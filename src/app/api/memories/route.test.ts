import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET } from './route'

vi.mock('@/lib/db', () => ({
  db: {
    memory: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
  },
}))

describe('/api/memories GET route', () => {
  let db: any

  beforeEach(async () => {
    vi.clearAllMocks()
    ;({ db } = await import('@/lib/db'))
  })

  it('should return 200 with memories array on success', async () => {
    const mockMemories = [
      {
        id: '1',
        content: 'Test memory 1',
        title: 'Test 1',
        connector: null,
        entities: [],
      },
      {
        id: '2',
        content: 'Test memory 2',
        title: 'Test 2',
        connector: null,
        entities: [],
      },
    ]

    db.memory.findMany.mockResolvedValue(mockMemories)
    db.memory.count.mockResolvedValue(2)

    const request = new Request('http://localhost:3000/api/memories')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toHaveProperty('data')
    expect(data.data).toEqual(mockMemories)
    expect(data).toHaveProperty('pagination')
    expect(data.pagination.total).toBe(2)
    expect(db.memory.findMany).toHaveBeenCalledTimes(1)
  })

  it('should return 500 on database error', async () => {
    const dbError = new Error('Database connection failed')
    db.memory.findMany.mockRejectedValue(dbError)

    const request = new Request('http://localhost:3000/api/memories')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data).toHaveProperty('error')
    expect(data.error).toBe('Failed to fetch memories')
    expect(db.memory.findMany).toHaveBeenCalledTimes(1)
  })

  it('should return empty array when no memories exist', async () => {
    db.memory.findMany.mockResolvedValue([])
    db.memory.count.mockResolvedValue(0)

    const request = new Request('http://localhost:3000/api/memories')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data).toEqual([])
    expect(data.pagination.total).toBe(0)
  })

  it('should respect limit query parameter', async () => {
    const mockMemories = [
      {
        id: '1',
        content: 'Memory 1',
        title: 'Test',
        connector: null,
        entities: [],
      },
    ]

    db.memory.findMany.mockResolvedValue(mockMemories)
    db.memory.count.mockResolvedValue(1)

    const request = new Request('http://localhost:3000/api/memories?limit=10')
    const response = await GET(request)

    expect(response.status).toBe(200)
    expect(db.memory.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 10,
      })
    )
  })

  it('should filter by search parameter', async () => {
    db.memory.findMany.mockResolvedValue([])
    db.memory.count.mockResolvedValue(0)

    const request = new Request('http://localhost:3000/api/memories?search=test')
    await GET(request)

    expect(db.memory.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: expect.arrayContaining([
            expect.objectContaining({ title: { contains: 'test' } }),
            expect.objectContaining({ content: { contains: 'test' } }),
          ]),
        }),
      })
    )
  })

  it('should handle connectorId filter', async () => {
    db.memory.findMany.mockResolvedValue([])
    db.memory.count.mockResolvedValue(0)

    const request = new Request('http://localhost:3000/api/memories?connectorId=conn123')
    await GET(request)

    expect(db.memory.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          connectorId: 'conn123',
        }),
      })
    )
  })
})
