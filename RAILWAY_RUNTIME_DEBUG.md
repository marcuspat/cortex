# Railway Runtime Debugging Guide

## Problem
App works locally but shows "Application failed to respond" on Railway.

## Local vs Railway Differences

**Local Environment:**
- Uses SQLite (file:./dev.db) or local PostgreSQL
- NODE_ENV likely 'development'  
- DATABASE_URL format: `file:./dev.db` or `postgresql://localhost:5432/db`

**Railway Environment:**
- Uses Railway's internal PostgreSQL
- NODE_ENV should be 'production'
- DATABASE_URL format: `postgresql://postgres:password@postgres.railway.internal:5432/railway`

## Debugging Steps

### 1. Check Railway Deploy Logs

In Railway dashboard:
1. Go to **Deploy Logs** tab
2. Look for errors after "Starting Container"
3. Check for:
   - ❌ Environment validation errors
   - ❌ Database connection errors  
   - ❌ Prisma client errors
   - ❌ TypeScript runtime errors
   - ❌ Module import errors

### 2. Common Railway Issues

**Issue A: Environment Variables Not Set**
```
Error: Missing DATABASE_URL
```
**Fix:** Add DATABASE_URL in Railway Variables tab

**Issue B: Prisma Schema Not Deployed**
```
Error: Relation "users" does not exist
```
**Fix:** Run `npx prisma db push` manually or add to startup

**Issue C: Database Connection Timeout**
```
Error: Can't reach database server at postgres.railway.internal:5432
```
**Fix:** Database service might not be ready, add retry logic

**Issue D: Validation Exiting Process**
```
Error: Environment validation failed, exiting...
```
**Fix:** We made validation non-blocking in latest commit

### 3. Quick Test Commands

Test if Railway app is at least running:
```bash
# Check if app responds (should get HTML or error, not timeout)
curl -I https://exciting-simplicity-production-278d.up.railway.app/

# Check health endpoint
curl https://exciting-simplicity-production-278d.up.railway.app/api/health

# Check root endpoint  
curl https://exciting-simplicity-production-278d.up.railway.app/
```

### 4. Compare Local vs Railway Config

**Check local .env.local:**
```bash
cat .env.local
```

**Check Railway Variables:**
- Go to Railway project → Settings → Variables
- Compare with local variables
- Make sure all required vars are set

### 5. Next Steps

1. **Share Railway Deploy Logs** - Copy the error logs from Railway
2. **Check Environment Variables** - Verify all vars are set correctly
3. **Test Health Endpoint** - See if `/api/health` gives specific error
4. **Check Container Status** - Is container running or restarting?

## What We Fixed

✅ Build phase database errors (using dynamic rendering)
✅ Environment validation (made non-blocking)
✅ Added authentication state tracking for data refresh

## What Still Needs Investigation

❌ Why Railway runtime fails but local works
❌ Specific error from Railway deploy logs
❌ Whether DATABASE_URL is properly formatted for Railway
