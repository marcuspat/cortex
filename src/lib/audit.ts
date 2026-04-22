import { db } from '@/lib/db'
import { headers } from 'next/headers'

export type AuditAction =
  | 'create'
  | 'update'
  | 'delete'
  | 'sync'
  | 'login'
  | 'logout'
  | 'export'
  | 'bulk_create'
  | 'bulk_update'
  | 'bulk_delete'

export type AuditResourceType =
  | 'Connector'
  | 'Memory'
  | 'InsightCard'
  | 'ChatSession'
  | 'ChatMessage'
  | 'Setting'
  | 'AgentTrace'
  | 'Entity'

export interface AuditLogOptions {
  changes?: Record<string, any>
  ipAddress?: string
  userAgent?: string
  success?: boolean
  errorMessage?: string
  metadata?: Record<string, any>
}

/**
 * Extract client IP address from request headers
 */
export function extractIpAddress(): string | null {
  try {
    const headersList = headers()

    // Check various headers for IP (in order of preference)
    const ip =
      headersList.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      headersList.get('x-real-ip') ||
      headersList.get('cf-connecting-ip') || // Cloudflare
      headersList.get('x-client-ip') ||
      null

    return ip
  } catch (error) {
    console.error('Error extracting IP address:', error)
    return null
  }
}

/**
 * Extract user agent from request headers
 */
export function extractUserAgent(): string | null {
  try {
    const headersList = headers()
    return headersList.get('user-agent') || null
  } catch (error) {
    console.error('Error extracting user agent:', error)
    return null
  }
}

/**
 * Log an audit event
 */
export async function logAction(
  userId: string,
  action: AuditAction,
  resourceType: AuditResourceType,
  resourceId: string | null,
  options: AuditLogOptions = {}
): Promise<void> {
  try {
    await db.auditLog.create({
      data: {
        userId,
        action,
        resourceType,
        resourceId,
        changes: JSON.stringify(options.changes || {}),
        ipAddress: options.ipAddress || extractIpAddress() || undefined,
        userAgent: options.userAgent || extractUserAgent() || undefined,
        success: options.success !== undefined ? options.success : true,
        errorMessage: options.errorMessage,
        metadata: JSON.stringify(options.metadata || {}),
      },
    })
  } catch (error) {
    // Don't throw - audit logging failures shouldn't break the application
    console.error('Failed to create audit log:', error)
  }
}

/**
 * Log a create action
 */
export async function logCreate(
  userId: string,
  resourceType: AuditResourceType,
  resourceId: string,
  createdData: Record<string, any>,
  metadata?: Record<string, any>
): Promise<void> {
  await logAction(userId, 'create', resourceType, resourceId, {
    changes: { created: createdData },
    metadata,
  })
}

/**
 * Log an update action with before/after values
 */
export async function logUpdate(
  userId: string,
  resourceType: AuditResourceType,
  resourceId: string,
  beforeData: Record<string, any>,
  afterData: Record<string, any>,
  metadata?: Record<string, any>
): Promise<void> {
  await logAction(userId, 'update', resourceType, resourceId, {
    changes: { before: beforeData, after: afterData },
    metadata,
  })
}

/**
 * Log a delete action with the deleted data
 */
export async function logDelete(
  userId: string,
  resourceType: AuditResourceType,
  resourceId: string,
  deletedData: Record<string, any>,
  metadata?: Record<string, any>
): Promise<void> {
  await logAction(userId, 'delete', resourceType, resourceId, {
    changes: { deleted: deletedData },
    metadata,
  })
}

/**
 * Log a sync action
 */
export async function logSync(
  userId: string,
  resourceType: AuditResourceType,
  resourceId: string,
  syncDetails: {
    itemsProcessed?: number
    itemsAdded?: number
    itemsUpdated?: number
    itemsDeleted?: number
    duration?: number
    error?: string
  },
  metadata?: Record<string, any>
): Promise<void> {
  await logAction(userId, 'sync', resourceType, resourceId, {
    changes: syncDetails,
    success: !syncDetails.error,
    errorMessage: syncDetails.error,
    metadata,
  })
}

/**
 * Log a failed action
 */
export async function logFailure(
  userId: string,
  action: AuditAction,
  resourceType: AuditResourceType,
  resourceId: string | null,
  errorMessage: string,
  metadata?: Record<string, any>
): Promise<void> {
  await logAction(userId, action, resourceType, resourceId, {
    success: false,
    errorMessage,
    metadata,
  })
}

/**
 * Get audit logs for a user
 */
export async function getAuditLogs(
  userId: string,
  options: {
    resourceType?: AuditResourceType
    resourceId?: string
    action?: AuditAction
    limit?: number
    offset?: number
    startDate?: Date
    endDate?: Date
  } = {}
) {
  const where: any = { userId }

  if (options.resourceType) {
    where.resourceType = options.resourceType
  }

  if (options.resourceId) {
    where.resourceId = options.resourceId
  }

  if (options.action) {
    where.action = options.action
  }

  if (options.startDate || options.endDate) {
    where.createdAt = {}
    if (options.startDate) {
      where.createdAt.gte = options.startDate
    }
    if (options.endDate) {
      where.createdAt.lte = options.endDate
    }
  }

  const [logs, total] = await Promise.all([
    db.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: options.limit || 50,
      skip: options.offset || 0,
    }),
    db.auditLog.count({ where }),
  ])

  return {
    logs: logs.map(log => ({
      ...log,
      changes: JSON.parse(log.changes),
      metadata: JSON.parse(log.metadata),
    })),
    total,
    limit: options.limit || 50,
    offset: options.offset || 0,
  }
}

/**
 * Helper to sanitize data for audit logging (remove sensitive fields)
 */
export function sanitizeData(data: Record<string, any>, sensitiveFields: string[] = ['password', 'token', 'secret', 'apiKey']): Record<string, any> {
  const sanitized = { ...data }

  for (const field of sensitiveFields) {
    if (field in sanitized) {
      sanitized[field] = '[REDACTED]'
    }
  }

  return sanitized
}
