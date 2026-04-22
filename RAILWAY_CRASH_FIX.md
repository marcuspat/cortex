# Railway Crash Diagnosis & Fix

**Issue:** Application builds successfully but crashes at runtime on Railway.

## Root Cause Analysis

### Most Likely Issue: Missing Database Tables

The Prisma schema is defined (`postgresql` provider), but database tables haven't been created. Prisma Client generates successfully but fails when trying to query non-existent tables.

### Secondary Issues:
1. **DATABASE_URL Format** - Railway's connection string format
2. **Port Binding** - Standalone server port configuration
3. **Missing Environment Variables** - DATABASE_URL not set at runtime

---

## Diagnostic Steps

### 1. Check Railway Deploy Logs

Look for these specific error messages:
```
PrismaClientInitializationError: Invalid datasource URL
Table 'public.Memory' doesn't exist
Can't reach database server
Connection refused
```

### 2. Verify DATABASE_URL in Railway

Go to Railway → exciting-simplicity → Settings → Variables

Expected format:
```
postgresql://postgres:YOUR_PASSWORD@YOUR_HOST:YOUR_PORT/YOUR_DATABASE
```

Example from Railway:
```
postgresql://postgres:JtseGkMUmPvtxbfzNaognUOjSlIYAVSz@shinkansen.proxy.rlwy.net:48461/railway
```

### 3. Test Database Connection

```bash
# Using the Railway PostgreSQL connection string
psql "postgresql://postgres:JtseGkMUmPvtxbfzNaognUOjSlIYAVSz@shinkansen.proxy.rlwy.net:48461/railway"
```

Then check if tables exist:
```sql
\dt
```

If no tables are listed, the database schema hasn't been pushed.

---

## Fixes

### Fix #1: Add Database Migration to Build (RECOMMENDED)

Update `nixpacks.toml` to automatically push schema on build:

```toml
[phases.setup]
nixPkgs = ["nodejs-20"]

[phases.install]
cmds = ["npm ci"]

[phases.build]
cmds = [
  "npx prisma generate",
  "npx prisma db push --skip-generate",  # ← CRITICAL: Create tables
  "npm run build"
]

[phases.start]
cmd = "node .next/standalone/server.js"
```

**Why this works:**
- `prisma db push` creates tables in the database
- `--skip-generate` avoids regenerating (already did in previous step)
- Runs during build phase, not start phase (faster cold starts)

### Fix #2: Add Health Check & Better Logging

Update `nixpacks.toml` with health check:

```toml
[phases.build]
cmds = [
  "npx prisma generate",
  "npx prisma db push --skip-generate",
  "npm run build"
]

[phases.start]
cmd = "node .next/standalone/server.js"

[deploy]
healthcheckPath = "/api/health"
healthcheckTimeout = 300
restartPolicyType = "on-failure"
```

Add health check endpoint `src/app/api/health/route.ts`:

```typescript
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    // Test database connection
    await db.$queryRaw`SELECT 1`
    return NextResponse.json({ 
      status: 'healthy',
      database: 'connected',
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    return NextResponse.json(
      { 
        status: 'unhealthy',
        database: 'disconnected',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 503 }
    )
  }
}
```

### Fix #3: Improve Error Logging

Update `src/lib/db.ts` to log database errors:

```typescript
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'production' 
    ? ['error', 'warn'] 
    : ['query', 'error', 'warn'],
})

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = db
}

// Test connection on startup
if (process.env.NODE_ENV === 'production') {
  db.$connect()
    .then(() => console.log('✅ Database connected'))
    .catch((error) => {
      console.error('❌ Database connection failed:', error)
      process.exit(1)
    })
}
```

---

## Verification

### After Deploying Fix:

1. **Check Railway logs** for:
   ```
   ✅ Database connected
   Generated Prisma Client
   Server ready on port 8080
   ```

2. **Test health endpoint:**
   ```bash
   curl https://exciting-simplicity.up.railway.app/api/health
   ```
   Expected response:
   ```json
   {
     "status": "healthy",
     "database": "connected",
     "timestamp": "2026-04-22T00:00:00.000Z"
   }
   ```

3. **Test main endpoint:**
   ```bash
   curl https://exciting-simplicity.up.railway.app/
   ```
   Should return HTML (not 502)

---

## Common Railway Issues

### Issue: "relation does not exist"

**Cause:** Tables not created  
**Fix:** Add `npx prisma db push --skip-generate` to build phase

### Issue: "invalid datasource url"

**Cause:** DATABASE_URL format incorrect  
**Fix:** Verify DATABASE_URL in Railway settings matches required format

### Issue: "port already in use"

**Cause:** Multiple instances or port conflict  
**Fix:** Railway automatically assigns ports, check if PORT env var is set

### Issue: "module not found"

**Cause:** Missing dependencies in standalone build  
**Fix:** Check that all dependencies are in `dependencies` (not `devDependencies`)

---

## Next Steps

1. **Apply Fix #1** (add `prisma db push` to build phase)
2. **Commit and push** to trigger Railway rebuild
3. **Monitor Railway logs** for successful table creation
4. **Test health endpoint** to verify database connection
5. **Verify all 7 features** work on deployed instance

---

**Last Updated:** 2026-04-22  
**Status:** Awaiting fix application and verification
