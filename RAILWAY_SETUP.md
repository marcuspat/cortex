# Railway Deployment Setup

## Required Environment Variables

Add these variables in Railway → Settings → Variables:

### Database
```
DATABASE_URL=postgresql://postgres:JtseGkMUmPvtxbfzNaognUOjSlIYAVSz@shinkansen.proxy.rlwy.net:48461/railway
```

### Optional
```
NEXTAUTH_SECRET=(auto-generated if not set)
NEXTAUTH_URL=https://your-app.railway.app
```

## Current 502 Error Fix

The application starts but returns 502 because DATABASE_URL is not set in Railway.

**Solution:** Add DATABASE_URL to Railway environment variables and redeploy.
