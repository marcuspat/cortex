# Phase 1 Implementation Plans — Step-by-Step Guides

**Purpose**: Detailed implementation guides for each Phase 1 task with code examples
**Audience**: Senior engineers implementing security improvements

---

## Implementation Guide 1.1: NextAuth.js Authentication

### Step 1: Install Dependencies

```bash
npm install next-auth @auth/prisma-adapter
npm install -D @types/node
```

### Step 2: Update Prisma Schema

Add to `prisma/schema.prisma`:

```prisma
// ===========================================
// AUTHENTICATION MODELS (NextAuth.js)
// ===========================================

model User {
  id            String    @id @default(cuid())
  name          String?
  email         String?   @unique
  emailVerified DateTime?
  image         String?
  accounts      Account[]
  sessions      Session[]
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  // User's data
  connectors    Connector[]
  memories      Memory[]
  chatSessions  ChatSession[]
  insightCards  InsightCard[]
  settings      Setting[]
}

model Account {
  id                String  @id @default(cuid())
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String? @db.Text
  access_token      String? @db.Text
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String? @db.Text
  session_state     String?

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model VerificationToken {
  identifier String
  token      String   @unique
  expires    DateTime

  @@unique([identifier, token])
}

// Update existing models to include userId
model Connector {
  // ... existing fields
  userId String
  
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@index([userId])
}

model Memory {
  // ... existing fields
  userId String
  
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@index([userId])
}

model InsightCard {
  // ... existing fields
  userId String
  
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@index([userId])
}

model ChatSession {
  // ... existing fields
  userId String?
  
  user User? @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@index([userId])
}
```

### Step 3: Create Migration

```bash
npx prisma migrate dev --name add_auth_models
```

### Step 4: Create Auth Configuration

Create `src/lib/auth.ts`:

```typescript
import { NextAuthOptions } from 'next-auth'
import { PrismaAdapter } from '@auth/prisma-adapter'
import GoogleProvider from 'next-auth/providers/google'
import GitHubProvider from 'next-auth/providers/github'
import { prisma } from './db'

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    GitHubProvider({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    session({ session, user }) {
      if (session.user) {
        session.user.id = user.id
      }
      return session
    },
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
  session: {
    strategy: 'database',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  secret: process.env.NEXTAUTH_SECRET,
}
```

### Step 5: Create Auth Route Handler

Create `src/app/api/auth/[...nextauth]/route.ts`:

```typescript
import NextAuth from 'next-auth'
import { authOptions } from '@/lib/auth'

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }
```

### Step 6: Create Session Provider

Create `src/components/providers/session-provider.tsx`:

```typescript
'use client'

import { SessionProvider as NextAuthSessionProvider } from 'next-auth/react'

export function SessionProvider({ children }: { children: React.ReactNode }) {
  return <NextAuthSessionProvider>{children}</NextAuthSessionProvider>
}
```

### Step 7: Update Root Layout

In `src/app/layout.tsx`:

```typescript
import { SessionProvider } from '@/components/providers/session-provider'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <SessionProvider>
          {children}
        </SessionProvider>
      </body>
    </html>
  )
}
```

### Step 8: Create Auth Middleware

Create `src/middleware.ts`:

```typescript
import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

export default withAuth(
  function middleware(req) {
    // Add user ID to headers for API routes
    const requestHeaders = new Headers(req.headers)
    requestHeaders.set('x-user-id', req.nextauth.token?.sub || '')
    
    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    })
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        // Public endpoints
        const publicPaths = ['/api/health', '/api/auth']
        const isPublic = publicPaths.some(path => 
          req.nextUrl.pathname.startsWith(path)
        )
        
        if (isPublic) return true
        
        return !!token
      },
    },
  }
)

export const config = {
  matcher: ['/api/:path*'],
}
```

### Step 9: Create Auth Helpers

Create `src/lib/auth-helpers.ts`:

```typescript
import { getServerSession } from 'next-auth'
import { authOptions } from './auth'
import { redirect } from 'next/navigation'

export async function requireAuth() {
  const session = await getServerSession(authOptions)
  
  if (!session?.user) {
    redirect('/api/auth/signin')
  }
  
  return session
}

export async function getCurrentUserId() {
  const session = await getServerSession(authOptions)
  return session?.user?.id
}
```

### Step 10: Update API Routes with Auth

Example for `src/app/api/connectors/route.ts`:

```typescript
import { NextResponse } from 'next/server'
import { getCurrentUserId } from '@/lib/auth-helpers'
import { db } from '@/lib/db'

export async function GET() {
  const userId = await getCurrentUserId()
  
  if (!userId) {
    return NextResponse.json(
      { error: 'Authentication required', code: 'AUTH_REQUIRED' },
      { status: 401 }
    )
  }

  const connectors = await db.connector.findMany({
    where: { userId },
  })
  
  return NextResponse.json({ data: connectors })
}

export async function POST(request: NextRequest) {
  const userId = await getCurrentUserId()
  
  if (!userId) {
    return NextResponse.json(
      { error: 'Authentication required', code: 'AUTH_REQUIRED' },
      { status: 401 }
    )
  }

  const body = await request.json()
  
  const connector = await db.connector.create({
    data: {
      ...body,
      userId,
    },
  })
  
  return NextResponse.json({ data: connector }, { status: 201 })
}
```

### Step 11: Update .env.example

```bash
# NextAuth.js
NEXTAUTH_SECRET=your-secret-here
NEXTAUTH_URL=http://localhost:3000

# OAuth Providers
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
```

### Step 12: Create Sign-In Page

Create `src/app/auth/signin/page.tsx`:

```typescript
import { signIn } from 'next-auth/react'

export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-md space-y-8">
        <div>
          <h2 className="text-3xl font-bold">Sign in to Cortex</h2>
        </div>
        
        <div className="space-y-4">
          <button
            onClick={() => signIn('google')}
            className="w-full rounded-lg border px-4 py-2"
          >
            Sign in with Google
          </button>
          
          <button
            onClick={() => signIn('github')}
            className="w-full rounded-lg border px-4 py-2"
          >
            Sign in with GitHub
          </button>
        </div>
      </div>
    </div>
  )
}
```

---

## Implementation Guide 1.2: Zod Input Validation

### Step 1: Create Validation Schemas

Create `src/lib/validations/connector.ts`:

```typescript
import { z } from 'zod'

export const ConnectorTypeSchema = z.enum([
  'gmail',
  'github',
  'obsidian',
  'notion',
  'google_calendar',
  'google_drive',
  'slack',
  'local_filesystem',
])

export const ConnectorStatusSchema = z.enum([
  'active',
  'inactive',
  'error',
  'syncing',
])

export const CreateConnectorSchema = z.object({
  type: ConnectorTypeSchema,
  name: z.string()
    .min(1, 'Name is required')
    .max(100, 'Name must be less than 100 characters'),
  config: z.record(z.any()).optional(),
  status: ConnectorStatusSchema.optional(),
})

export const UpdateConnectorSchema = z.object({
  name: z.string()
    .min(1, 'Name is required')
    .max(100, 'Name must be less than 100 characters')
    .optional(),
  config: z.record(z.any()).optional(),
  status: ConnectorStatusSchema.optional(),
})

export type CreateConnectorInput = z.infer<typeof CreateConnectorSchema>
export type UpdateConnectorInput = z.infer<typeof UpdateConnectorSchema>
```

Create `src/lib/validations/memory.ts`:

```typescript
import { z } from 'zod'

export const MemorySourceTypeSchema = z.enum([
  'email',
  'github_issue',
  'github_pr',
  'notion_page',
  'obsidian_note',
  'calendar_event',
  'drive_file',
  'slack_message',
  'local_file',
])

export const CreateMemorySchema = z.object({
  connectorId: z.string().optional(),
  sourceId: z.string().optional(),
  sourceType: MemorySourceTypeSchema,
  title: z.string()
    .min(1, 'Title is required')
    .max(500, 'Title must be less than 500 characters'),
  content: z.string()
    .min(1, 'Content is required')
    .max(100000, 'Content too large'),
  metadata: z.record(z.any()).optional(),
  tags: z.array(z.string()).optional(),
  sourceTimestamp: z.coerce.date().optional(),
  sourceUrl: z.string().url().optional().or(z.literal('')),
})

export type CreateMemoryInput = z.infer<typeof CreateMemorySchema>
```

### Step 2: Create Validation Middleware

Create `src/lib/validate.ts`:

```typescript
import { ZodSchema, ZodError } from 'zod'
import { NextResponse } from 'next/server'

export function validateRequest<T>(schema: ZodSchema<T>) {
  return async (request: Request) => {
    try {
      const body = await request.json()
      const validatedData = schema.parse(body)
      return { data: validatedData, error: null }
    } catch (error) {
      if (error instanceof ZodError) {
        return {
          data: null,
          error: {
            message: 'Validation failed',
            code: 'VALIDATION_ERROR',
            details: error.errors.map(e => ({
              path: e.path.join('.'),
              message: e.message,
            })),
          },
        }
      }
      throw error
    }
  }
}

export function validationErrorResponse(error: any) {
  return NextResponse.json(
    {
      error: error.message || 'Validation failed',
      code: error.code || 'VALIDATION_ERROR',
      details: error.details,
    },
    { status: 400 }
  )
}
```

### Step 3: Apply Validation to Routes

Update `src/app/api/connectors/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserId } from '@/lib/auth-helpers'
import { db } from '@/lib/db'
import {
  CreateConnectorSchema,
  UpdateConnectorSchema,
} from '@/lib/validations/connector'
import { validateRequest, validationErrorResponse } from '@/lib/validate'

export async function POST(request: NextRequest) {
  const userId = await getCurrentUserId()
  
  if (!userId) {
    return NextResponse.json(
      { error: 'Authentication required', code: 'AUTH_REQUIRED' },
      { status: 401 }
    )
  }

  // Validate input
  const { data, error } = await validateRequest(CreateConnectorSchema)(request)
  
  if (error) {
    return validationErrorResponse(error)
  }

  try {
    const connector = await db.connector.create({
      data: {
        ...data,
        userId,
      },
    })
    
    return NextResponse.json({ data: connector }, { status: 201 })
  } catch (error) {
    console.error('Failed to create connector:', error)
    return NextResponse.json(
      { error: 'Failed to create connector', code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  const userId = await getCurrentUserId()
  
  if (!userId) {
    return NextResponse.json(
      { error: 'Authentication required', code: 'AUTH_REQUIRED' },
      { status: 401 }
    )
  }

  const body = await request.json()
  const { id } = body
  
  // Remove id from body for validation
  delete body.id
  
  const result = UpdateConnectorSchema.safeParse(body)
  
  if (!result.success) {
    return validationErrorResponse({
      message: 'Validation failed',
      code: 'VALIDATION_ERROR',
      details: result.error.errors.map(e => ({
        path: e.path.join('.'),
        message: e.message,
      })),
    })
  }

  try {
    const connector = await db.connector.update({
      where: { id, userId },
      data: result.data,
    })
    
    return NextResponse.json({ data: connector })
  } catch (error) {
    console.error('Failed to update connector:', error)
    return NextResponse.json(
      { error: 'Failed to update connector', code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}
```

---

## Implementation Guide 1.3: Environment Validation

### Step 1: Create Environment Schema

Create `src/lib/env.ts`:

```typescript
import { z } from 'zod'

const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().url(),
  
  // NextAuth
  NEXTAUTH_SECRET: z.string().min(32),
  NEXTAUTH_URL: z.string().url(),
  
  // OAuth
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GITHUB_CLIENT_ID: z.string().optional(),
  GITHUB_CLIENT_SECRET: z.string().optional(),
  
  // Node
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
})

// Validate and export
export const env = envSchema.parse(process.env)

// Type for environment variables
type Env = z.infer<typeof envSchema>
```

### Step 2: Add Startup Validation

Update `src/lib/db.ts`:

```typescript
import { PrismaClient } from '@prisma/client'
import { env } from './env'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: env.NODE_ENV === 'development'
      ? ['query', 'error', 'warn']
      : ['error', 'warn'],
  })

if (env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = db
}

// Validate database connection on startup
if (env.NODE_ENV === 'production') {
  db.$connect()
    .then(() => {
      console.log('✅ Database connected successfully')
    })
    .catch((error) => {
      console.error('❌ Database connection failed:', error)
      console.error('Check your DATABASE_URL environment variable')
      process.exit(1)
    })
}
```

### Step 3: Fix .env Permissions

```bash
# Run in terminal
chmod 600 .env
```

### Step 4: Update .gitignore

Ensure `.gitignore` includes:

```
# Environment variables
.env
.env.local
.env.production

# But keep .env.example
!.env.example
```

---

## Implementation Guide 1.4: Rate Limiting

### Step 1: Install Dependencies

```bash
npm install @upstash/redis @upstash/ratelimit
```

### Step 2: Create Rate Limiters

Create `src/lib/rate-limit.ts`:

```typescript
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

// Create Redis client
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

// Different rate limits for different endpoint types

// Strict limit for mutations (10 requests per minute)
export const strictRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, '1 m'),
  analytics: true,
  prefix: 'strict-limit',
})

// Lenient limit for queries (100 requests per minute)
export const lenientRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(100, '1 m'),
  analytics: true,
  prefix: 'lenient-limit',
})

// Auth-specific limit (5 requests per minute)
export const authRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, '1 m'),
  analytics: true,
  prefix: 'auth-limit',
})

// IP-based rate limiter for abuse prevention
export const ipRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(20, '1 m'),
  analytics: true,
  prefix: 'ip-limit',
  // Use IP address as identifier
})
```

### Step 3: Create Rate Limit Middleware

Create `src/middleware.ts` (update existing):

```typescript
import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'
import { ipRateLimit } from '@/lib/rate-limit'

export default withAuth(
  async function middleware(req) {
    // Get IP address
    const ip = req.ip || 
      req.headers.get('x-forwarded-for')?.split(',')[0] || 
      'anonymous'
    
    // Apply IP-based rate limiting
    const { success, limit, reset, remaining } = await ipRateLimit.limit(ip)
    
    // Add rate limit headers
    const response = NextResponse.next({
      headers: {
        'X-RateLimit-Limit': limit.toString(),
        'X-RateLimit-Remaining': remaining.toString(),
        'X-RateLimit-Reset': new Date(reset).toISOString(),
      },
    })
    
    if (!success) {
      return NextResponse.json(
        {
          error: 'Too many requests',
          code: 'RATE_LIMIT_EXCEEDED',
          retryAfter: Math.ceil((reset - Date.now()) / 1000),
        },
        { status: 429, headers: response.headers }
      )
    }
    
    // Add user ID to headers
    const requestHeaders = new Headers(req.headers)
    if (req.nextauth.token?.sub) {
      requestHeaders.set('x-user-id', req.nextauth.token.sub)
    }
    
    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    })
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        // Public endpoints
        const publicPaths = ['/api/health', '/api/auth']
        const isPublic = publicPaths.some(path => 
          req.nextUrl.pathname.startsWith(path)
        )
        
        if (isPublic) return true
        
        return !!token
      },
    },
  }
)

export const config = {
  matcher: ['/api/:path*'],
}
```

### Step 4: Apply Route-Specific Limits

Update `src/app/api/connectors/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserId } from '@/lib/auth-helpers'
import { db } from '@/lib/db'
import { strictRateLimit } from '@/lib/rate-limit'

export async function POST(request: NextRequest) {
  const userId = await getCurrentUserId()
  
  if (!userId) {
    return NextResponse.json(
      { error: 'Authentication required', code: 'AUTH_REQUIRED' },
      { status: 401 }
    )
  }

  // Apply strict rate limit for mutations
  const { success } = await strictRateLimit.limit(userId)
  
  if (!success) {
    return NextResponse.json(
      {
        error: 'Too many requests. Please try again later.',
        code: 'RATE_LIMIT_EXCEEDED',
      },
      { status: 429 }
    )
  }

  // ... rest of route logic
}
```

### Step 5: Add Environment Variables

Update `.env.example`:

```bash
# Upstash Redis (Rate Limiting)
UPSTASH_REDIS_REST_URL=https://your-redis-url.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-redis-token
```

---

## Testing Checklist for Each Implementation

### Authentication Testing
- [ ] Sign in with Google works
- [ ] Sign in with GitHub works
- [ ] Session persists across refreshes
- [ ] Protected routes return 401 without auth
- [ ] User can only access their own data
- [ ] Sign out works correctly

### Validation Testing
- [ ] Invalid data returns 400 with details
- [ ] Valid data is accepted
- [ ] Type mismatches are caught
- [ ] Length limits are enforced
- [ ] Required fields are validated

### Rate Limiting Testing
- [ ] Rate limit enforced (use Postman/curl)
- [ ] Correct headers returned
- [ ] 429 response when limit exceeded
- [ ] Retry-after header is accurate

### Environment Testing
- [ ] App crashes on startup if required vars missing
- [ ] Error message lists missing variables
- [ ] .env file has correct permissions

---

## Deployment Order

**Deploy in this order to minimize downtime:**

1. Environment variables (add to Railway first)
2. Database migrations (run manually on Railway)
3. Deploy code with authentication
4. Test authentication flow
5. Deploy validation layer
6. Deploy rate limiting
7. Run full test suite

---

## Rollback Plan

If any step fails:

1. **Revert code**: `git revert <commit>`
2. **Rollback migration**: `npx prisma migrate resolve --rolled-back <migration>`
3. **Redeploy**: Push reverted code
4. **Verify**: Test that app works
5. **Investigate**: Check logs for failure reason
