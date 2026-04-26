/**
 * HEALTH CHECK ENDPOINTS
 *
 * Provides comprehensive health monitoring for production deployment.
 *
 * GET /api/health - Basic health check
 * GET /api/health?detailed=true - Full health check with all services
 */

// Force dynamic rendering - don't prerender at build time
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { generateRequestId } from '@/lib/errors';
import { withRateLimit } from '@/lib/rate-limit';
import { RateLimitType } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';
import { getEmbeddingClient } from '@/lib/embeddings';
import { redisConnection } from '@/lib/queue';

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  checks: {
    database: { status: 'pass' | 'fail'; message?: string; latency?: number };
    redis: { status: 'pass' | 'fail'; message?: string; latency?: number };
    embeddings: { status: 'pass' | 'fail' | 'skip'; message?: string };
    memory: { status: 'pass' | 'warn' | 'fail'; usage?: number; heap?: number };
  };
}

// ===========================================
// HEALTH CHECK FUNCTIONS
// ===========================================

async function checkDatabase(): Promise<{ status: 'pass' | 'fail'; message?: string; latency?: number }> {
  const start = Date.now();
  try {
    await db.$queryRaw`SELECT 1`;
    return { status: 'pass', latency: Date.now() - start };
  } catch (error) {
    return { status: 'fail', message: error instanceof Error ? error.message : 'Unknown error' };
  }
}

async function checkRedis(): Promise<{ status: 'pass' | 'fail'; message?: string; latency?: number }> {
  const start = Date.now();
  try {
    if (!redisConnection) {
      return { status: 'fail', message: 'Redis not configured' };
    }
    await redisConnection.ping();
    return { status: 'pass', latency: Date.now() - start };
  } catch (error) {
    return { status: 'fail', message: error instanceof Error ? error.message : 'Unknown error' };
  }
}

async function checkEmbeddings(): Promise<{ status: 'pass' | 'fail' | 'skip'; message?: string }> {
  try {
    const client = getEmbeddingClient();
    await client.testConnection();
    return { status: 'pass' };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    if (message.includes('OPENAI_API_KEY')) {
      return { status: 'skip', message: 'OpenAI API key not configured' };
    }
    return { status: 'fail', message };
  }
}

function checkMemory(): { status: 'pass' | 'warn' | 'fail'; usage?: number; heap?: number } {
  const usage = process.memoryUsage();
  const heapUsed = usage.heapUsed / 1024 / 1024; // MB
  const heapTotal = usage.heapTotal / 1024 / 1024; // MB
  const rss = usage.rss / 1024 / 1024; // MB

  const heapPercent = (heapUsed / heapTotal) * 100;

  if (heapPercent > 90) {
    return { status: 'fail', usage: rss, heap: heapPercent };
  } else if (heapPercent > 70) {
    return { status: 'warn', usage: rss, heap: heapPercent };
  } else {
    return { status: 'pass', usage: rss, heap: heapPercent };
  }
}

async function getHealthStatus(detailed = false): Promise<HealthStatus> {
  const [database, redis, embeddings, memory] = await Promise.all([
    checkDatabase(),
    checkRedis(),
    checkEmbeddings(),
    Promise.resolve(checkMemory()),
  ]);

  // Determine overall status
  const criticalFailures = [database.status, redis.status].filter(s => s === 'fail').length;
  const warnings = [memory.status].filter(s => s === 'warn').length;

  let status: 'healthy' | 'degraded' | 'unhealthy';
  if (criticalFailures > 0) {
    status = 'unhealthy';
  } else if (warnings > 0 || embeddings.status === 'fail') {
    status = 'degraded';
  } else {
    status = 'healthy';
  }

  return {
    status,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    checks: detailed ? { database, redis, embeddings, memory } : { database, redis },
  };
}

// ===========================================
// HANDLERS
// ===========================================

async function healthCheckHandler(request: NextRequest) {
  const requestId = generateRequestId();
  const { searchParams } = new URL(request.url);
  const detailed = searchParams.get('detailed') === 'true';

  try {
    const health = await getHealthStatus(detailed);

    logger.info('Health check', { requestId, status: health.status });

    const response = NextResponse.json(health);
    response.headers.set('x-request-id', requestId);

    if (health.status === 'unhealthy') {
      return NextResponse.json(health, { status: 503 });
    }

    return response;
  } catch (error) {
    logger.logError(requestId, error as Error, { path: '/api/health' });

    const errorResponse = NextResponse.json(
      {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error',
        requestId,
      },
      { status: 503 }
    );

    errorResponse.headers.set('x-request-id', requestId);
    return errorResponse;
  }
}

// Wrap with rate limiting (internal endpoints have high limits)
export const GET = withRateLimit(healthCheckHandler, RateLimitType.INTERNAL)
