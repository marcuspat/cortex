import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const settings = await db.setting.findMany()
    const settingsMap: Record<string, string> = {}
    for (const setting of settings) {
      settingsMap[setting.key] = setting.value
    }
    return NextResponse.json(settingsMap)
  } catch (error) {
    console.error('Settings get error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch settings' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const entries = Object.entries(body) as [string, string][]

    if (!entries.length) {
      return NextResponse.json(
        { error: 'No settings provided' },
        { status: 400 }
      )
    }

    const results = await Promise.all(
      entries.map(([key, value]) =>
        db.setting.upsert({
          where: { key },
          update: { value: String(value) },
          create: { key, value: String(value) },
        })
      )
    )

    const settingsMap: Record<string, string> = {}
    for (const result of results) {
      settingsMap[result.key] = result.value
    }

    return NextResponse.json(settingsMap)
  } catch (error) {
    console.error('Settings update error:', error)
    return NextResponse.json(
      { error: 'Failed to update settings' },
      { status: 500 }
    )
  }
}
