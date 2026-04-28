# Railway Deployment Instructions

## ✅ Database Ready!
Your Railway PostgreSQL database is configured and working:
- **Host**: shinkansen.proxy.rlwy.net:48461
- **Database**: railway
- **Status**: ✅ Connected and tested
- **Schema**: ✅ All 14 tables created

## 🚀 Quick Deployment Steps

### Option 1: Automatic Deployment (Recommended)
The environment is already configured! Just push a change to trigger deployment:

```bash
git commit --allow-empty -m "chore: trigger Railway deployment"
git push origin main
```

### Option 2: Manual Configuration
If you need to configure Railway manually:

1. **Go to Railway Dashboard**
   - Visit: https://railway.app/
   - Select your "exciting-simplicity" project

2. **Add Environment Variables**
   - Go to your app service → "Variables" tab
   - Add these variables:

   ```bash
   DATABASE_URL=postgresql://postgres:JtseGkMUmPvtxbfzNaognUOjSlIYAVSz@shinkansen.proxy.rlwy.net:48461/railway
   NEXTAUTH_SECRET=J/+FdHSiXmF1IQd1iT6VggT+Qr+axV7bRYjyCobA1nE=
   NEXTAUTH_URL=https://exciting-simplicity-production-278d.up.railway.app
   NODE_ENV=production
   ```

3. **Trigger Deployment**
   - Click "New Deployment"
   - Or push a new commit

## 🧪 Test Locally with Railway Database
Use this script to test locally before deploying:

```bash
./scripts/test-with-railway-db.sh
```

## ✅ Verification Steps

After deployment, verify:

1. **Health Check**: https://exciting-simplicity-production-278d.up.railway.app/api/health
   ```json
   {
     "status": "healthy",
     "checks": {
       "database": { "status": "pass" }
     }
   }
   ```

2. **Application**: https://exciting-simplicity-production-278d.up.railway.app/
   - Should show the Cortex app
   - Sign in button should be visible

3. **Database Connection**
   - Check deployment logs for "Database connection successful"
   - No database errors in logs

## 🔧 Troubleshooting

### If deployment fails:
1. Check build logs for errors
2. Verify DATABASE_URL is correct
3. Ensure all environment variables are set

### If app shows 502:
1. Check deploy logs for startup errors
2. Verify database connectivity
3. Ensure health check passes

### If database errors:
1. Verify DATABASE_URL format
2. Check database is accessible
3. Run `npx prisma db push` manually if needed

## 📊 Current Status

- ✅ Database connectivity: **Working**
- ✅ Local build: **Success**
- ✅ Schema: **Applied (14 tables)**
- ✅ Environment config: **Ready**
- ⏳ Railway deployment: **Ready to deploy**

## 🎯 Next Steps

1. Push the empty commit to trigger deployment
2. Monitor Railway build logs
3. Verify health check passes
4. Test application functionality
5. Configure OAuth providers (optional)

The deployment should work immediately since the database is already configured and tested!