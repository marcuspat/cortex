# Railway Deployment Checklist

## Pre-Deployment Checklist

### ✅ Code Fixes Applied
- [x] Created missing `src/components/providers/theme-provider.tsx`
- [x] Made NextAuth env vars optional in `src/lib/env.ts`
- [x] Added database migration to `nixpacks.toml`
- [x] Added health check configuration
- [x] Tested build locally - compiles successfully

### ✅ Railway Configuration
- [x] `DATABASE_URL` - Auto-provided by Railway PostgreSQL
- [x] Build process includes Prisma schema migration
- [x] Health check endpoint configured
- [x] Restart policy set to "on-failure"

## Deployment Steps

### 1. Push Changes to Git
```bash
git add src/components/providers/theme-provider.tsx
git add src/lib/env.ts
git add nixpacks.toml
git commit -m "fix: resolve Railway 502 errors - add theme-provider, fix env validation, add db migration"
git push origin main
```

### 2. Monitor Railway Deployment
1. Go to Railway project dashboard
2. Watch build logs for:
   - ✅ `Environment variables validated successfully`
   - ✅ `Generated Prisma Client`
   - ✅ `Database schema pushed successfully`
   - ✅ `Compiled successfully`
   - ✅ `Server ready on port 8080`

### 3. Verify Deployment
```bash
# Test health endpoint
curl https://your-app.up.railway.app/api/health

# Expected response:
{
  "status": "healthy",
  "database": "connected",
  "timestamp": "2026-04-22T..."
}

# Test main app
curl https://your-app.up.railway.app/

# Expected: HTML response (not 502)
```

### 4. Configure Optional Features

#### OAuth Providers (Optional)
In Railway dashboard → Settings → Variables:
```
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Or GitHub
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
```

#### Rate Limiting (Optional)
```
UPSTASH_REDIS_REST_URL=your-upstash-redis-url
UPSTASH_REDIS_REST_TOKEN=your-upstash-redis-token
```

#### AI Features (Optional)
```
ANTHROPIC_API_KEY=your-anthropic-key
OPENAI_API_KEY=your-openai-key
```

## Troubleshooting

### If deployment fails:
1. **Check Railway logs** - Look for error messages
2. **Check DATABASE_URL** - Should be auto-provided by Railway
3. **Check build logs** - Ensure `npm run build` succeeds
4. **Check database migration** - Ensure tables are created

### Common Issues:

**"relation does not exist"**
- Database tables not created
- Check that `npx prisma db push` runs during build

**"module not found"**
- Missing component files
- Check all imports in layout.tsx exist

**"environment validation failed"**
- Missing required environment variables
- Only DATABASE_URL is strictly required now

**Health check fails**
- Database connection issue
- Check DATABASE_URL format
- Verify PostgreSQL is running

## Success Criteria

Deployment is successful when:
- ✅ Build completes without errors
- ✅ Server starts and logs "Server ready"
- ✅ Health endpoint returns `{"status": "healthy"}`
- ✅ Main app returns HTML (not 502)
- ✅ Database tables exist

## Post-Deployment

1. **Monitor logs** for any runtime errors
2. **Test all features** - memories, connectors, insights
3. **Configure OAuth** if you want social login
4. **Set up rate limiting** for production traffic
5. **Configure monitoring** (optional)

## Rollback Plan

If deployment fails:
```bash
# Revert to previous commit
git revert HEAD
git push origin main

# Railway will automatically redeploy previous version
```

## Support

If issues persist:
1. Check Railway logs: Railway → Project → Deployments → View Logs
2. Check this doc: `/workspaces/cortex/RAILWAY_502_FIX_SUMMARY.md`
3. Check build guide: `/workspaces/cortex/RAILWAY_CRASH_FIX.md`
