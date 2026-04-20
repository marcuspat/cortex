import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const connectors = await db.connector.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { memories: true },
        },
      },
    })

    return NextResponse.json(connectors)
  } catch (error) {
    console.error('Connectors list error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch connectors' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { type, name, config, status } = body

    if (!type || !name) {
      return NextResponse.json(
        { error: 'Connector type and name are required' },
        { status: 400 }
      )
    }

    const connector = await db.connector.create({
      data: {
        type,
        name,
        config: config ? JSON.stringify(config) : '{}',
        status: status || 'disconnected',
      },
    })

    return NextResponse.json(connector, { status: 201 })
  } catch (error) {
    console.error('Connector create error:', error)
    return NextResponse.json(
      { error: 'Failed to create connector' },
      { status: 500 }
    )
  }
}
