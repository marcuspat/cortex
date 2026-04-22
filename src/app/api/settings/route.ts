import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserId } from '@/lib/auth-helpers'
import { db } from '@/lib/db'
import { UpsertSettingsSchema } from '@/lib/validations/settings'
import { validateRequest, validationErrorResponse } from '@/lib/validate'
import { AuthRequiredError } from '@/lib/errors'

export async function GET() {
  const userId = await getCurrentUserId()

  if (!userId) {
    throw new AuthRequiredError()
  }

  try {
    const settings = await db.setting.findMany({
      where: { userId },
    })
    const settingsMap: Record<string, string> = {}
    for (const setting of settings) {
      settingsMap[setting.key] = setting.value
    }

    return NextResponse.json({
      data: settingsMap,
    })
  } catch (error) {
    console.error('Settings get error:', error)
    throw error
  }
}

export async function PUT(request: NextRequest) {
  const userId = await getCurrentUserId()

  if (!userId) {
    throw new AuthRequiredError()
  }

  try {
    const body = await request.json()

    // Validate settings (basic check, will use Zod in production)
    if (typeof body !== 'object' || body === null) {
      return NextResponse.json(
        {
          error: 'Settings must be an object',
          code: 'VALIDATION_ERROR',
        },
        { status: 400 }
      )
    }

    const entries = Object.entries(body) as [string, any][]

    if (!entries.length) {
      return NextResponse.json(
        {
          error: 'No settings provided',
          code: 'VALIDATION_ERROR',
        },
        { status: 400 }
      )
    }

    // Upsert all settings with userId
    const results = await Promise.all(
      entries.map(([key, value]) =>
        db.setting.upsert({
          where: { key, userId },
          update: { value: String(value) },
          create: { key, value: String(value), userId },
        })
      )
    )

    const settingsMap: Record<string, string> = {}
    for (const result of results) {
      settingsMap[result.key] = result.value
    }

    return NextResponse.json({
      data: settingsMap,
    })
  } catch (error) {
    console.error('Settings update error:', error)
    throw error
  }
}
