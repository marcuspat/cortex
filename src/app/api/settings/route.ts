import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserId } from '@/lib/auth-helpers'
import { db } from '@/lib/db'
import { UpsertSettingsSchema } from '@/lib/validations/settings'
import { validateRequest, validationErrorResponse } from '@/lib/validate'
import { AuthRequiredError, generateRequestId } from '@/lib/errors'
import { logUpdate, logFailure } from '@/lib/audit'

export async function GET() {
  const requestId = generateRequestId()
  const startTime = Date.now()

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

    const response = NextResponse.json({
      data: settingsMap,
    })

    response.headers.set('x-request-id', requestId)
    response.headers.set('x-response-time', `${Date.now() - startTime}ms`)

    return response
  } catch (error) {
    console.error('Settings get error:', error)
    throw error
  }
}

export async function PUT(request: NextRequest) {
  const requestId = generateRequestId()
  const startTime = Date.now()

  const userId = await getCurrentUserId()

  if (!userId) {
    throw new AuthRequiredError()
  }

  const { data, error } = await validateRequest(UpsertSettingsSchema, request)

  if (error || !data) {
    return validationErrorResponse(error, requestId)
  }

  try {
    const entries = Object.entries(data.settings)

    if (!entries.length) {
      return NextResponse.json(
        {
          error: 'No settings provided',
          code: 'VALIDATION_ERROR',
          requestId,
        },
        { status: 400 }
      )
    }

    // Fetch existing settings for audit log
    const existingSettings = await db.setting.findMany({
      where: { userId, key: { in: entries.map(([key]) => key) } },
    })
    const existingMap = Object.fromEntries(
      existingSettings.map(s => [s.key, s.value])
    )

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
    const changesMap: Record<string, { before?: string; after: string }> = {}

    for (const result of results) {
      settingsMap[result.key] = result.value
      if (existingMap[result.key] !== result.value) {
        changesMap[result.key] = {
          before: existingMap[result.key],
          after: result.value,
        }
      }
    }

    // Audit log the settings update
    await logUpdate(userId, 'Setting', 'batch', existingMap, settingsMap, {
      updatedKeys: Object.keys(changesMap),
    })

    const response = NextResponse.json({
      data: settingsMap,
    })

    response.headers.set('x-request-id', requestId)
    response.headers.set('x-response-time', `${Date.now() - startTime}ms`)

    return response
  } catch (error) {
    console.error('Settings update error:', error)
    await logFailure(userId, 'update', 'Setting', 'batch', String(error))
    throw error
  }
}
