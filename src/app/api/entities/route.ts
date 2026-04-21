import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { Prisma } from '@prisma/client'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''

    const where: Prisma.EntityWhereInput = {}

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { canonicalName: { contains: search } },
        { aliases: { contains: search } },
      ]
    }

    const entities = await db.entity.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { memories: true },
        },
      },
    })

    return NextResponse.json(entities)
  } catch (error) {
    console.error('Entities list error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch entities' },
      { status: 500 }
    )
  }
}
