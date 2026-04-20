import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const memory = await db.memory.findUnique({
      where: { id },
      include: {
        connector: {
          select: { id: true, name: true, type: true },
        },
        entities: {
          include: {
            entity: true,
          },
        },
      },
    })

    if (!memory) {
      return NextResponse.json(
        { error: 'Memory not found' },
        { status: 404 }
      )
    }

    // Increment access count
    await db.memory.update({
      where: { id },
      data: { accessCount: { increment: 1 } },
    })

    return NextResponse.json({ ...memory, accessCount: memory.accessCount + 1 })
  } catch (error) {
    console.error('Memory get error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch memory' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const memory = await db.memory.findUnique({ where: { id } })
    if (!memory) {
      return NextResponse.json(
        { error: 'Memory not found' },
        { status: 404 }
      )
    }

    await db.memory.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Memory delete error:', error)
    return NextResponse.json(
      { error: 'Failed to delete memory' },
      { status: 500 }
    )
  }
}
