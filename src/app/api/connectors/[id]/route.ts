import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const connector = await db.connector.findUnique({
      where: { id },
      include: {
        _count: {
          select: { memories: true },
        },
      },
    })

    if (!connector) {
      return NextResponse.json(
        { error: 'Connector not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(connector)
  } catch (error) {
    console.error('Connector get error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch connector' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { type, name, config, status, error } = body

    const connector = await db.connector.findUnique({ where: { id } })
    if (!connector) {
      return NextResponse.json(
        { error: 'Connector not found' },
        { status: 404 }
      )
    }

    const updated = await db.connector.update({
      where: { id },
      data: {
        ...(type && { type }),
        ...(name && { name }),
        ...(config !== undefined && { config: JSON.stringify(config) }),
        ...(status && { status }),
        ...(error !== undefined && { error }),
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Connector update error:', error)
    return NextResponse.json(
      { error: 'Failed to update connector' },
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
    const connector = await db.connector.findUnique({ where: { id } })
    if (!connector) {
      return NextResponse.json(
        { error: 'Connector not found' },
        { status: 404 }
      )
    }

    await db.connector.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Connector delete error:', error)
    return NextResponse.json(
      { error: 'Failed to delete connector' },
      { status: 500 }
    )
  }
}
