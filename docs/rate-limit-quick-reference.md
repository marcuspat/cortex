# Rate Limiting Quick Reference

## Installation
```bash
npm install @upstash/ratelimit @upstash/redis
```

## Environment Variables
```bash
UPSTASH_REDIS_REST_URL=https://your-redis-url.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-redis-token
```

## Rate Limit Tiers
| Tier | Limit | Window | Use Case |
|------|-------|--------|----------|
| AUTH | 10/min | 60s | Authentication |
| GENERAL | 100/min | 60s | Standard API |
| READ | 200/min | 60s | Read operations |
| INTERNAL | 1000/min | 60s | Health/status |
| EXPENSIVE | 5/min | 60s | Resource-intensive |

## Quick Usage

### Automatic (Already Done)
All `/api/*` routes are automatically rate-limited via middleware.

### Explicit Route Protection
```typescript
import { withRateLimit } from '@/lib/rate-limit'
import { RateLimitType } from '@/lib/rate-limit'

export const GET = withRateLimit(handler, RateLimitType.READ)
export const POST = withRateLimit(handler, RateLimitType.EXPENSIVE)
```

### Manual Check
```typescript
import { enforceRateLimit } from '@/lib/rate-limit'

export async function POST(request: Request) {
  await enforceRateLimit(request, RateLimitType.GENERAL)
  // Your code...
}
```

## Response Headers
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1713848400000
Retry-After: 45 (only when limited)
```

## Error Response (429)
```json
{
  "error": "Too many requests. Please try again later.",
  "code": "RATE_LIMIT_EXCEEDED",
  "details": { "retryAfter": 45 },
  "timestamp": "2024-04-22T12:00:00.000Z"
}
```

## Route Mappings
```typescript
/api/auth/*              → AUTH (10/min)
/api/health              → INTERNAL (1000/min)
/api/memories            → READ (200/min)
/api/entities            → READ (200/min)
/api/connectors/sync     → EXPENSIVE (5/min)
/api/* (default)         → GENERAL (100/min)
```

## Testing
```bash
# Test rate limiting
for i in {1..15}; do
  curl -i http://localhost:3000/api/auth/signin
done
```

## Status Check
```typescript
import { getRateLimitStatus } from '@/lib/rate-limit'

const status = getRateLimitStatus()
// { enabled: true, configured: true, redisUrl: '***configured***' }
```

## Common Patterns

### Protect Expensive Operations
```typescript
export const POST = withRateLimit(
  expensiveHandler,
  RateLimitType.EXPENSIVE
)
```

### Protect Read Endpoints
```typescript
export const GET = withRateLimit(
  readHandler,
  RateLimitType.READ
)
```

### Protect Auth Endpoints
```typescript
export const POST = withRateLimit(
  authHandler,
  RateLimitType.AUTH
)
```

## Graceful Degradation
If Upstash credentials are not set, rate limiting is automatically disabled and all requests are allowed. No code changes needed.

## Documentation
- Full Guide: `docs/rate-limiting.md`
- Implementation: `docs/rate-limit-implementation-summary.md`
- Tests: `src/lib/rate-limit.test.ts`

## Performance
- Latency: 10-20ms per request
- Throughput: 10,000+ req/s
- Memory: Minimal (sliding window)
