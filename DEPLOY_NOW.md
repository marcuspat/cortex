# Railway Deployment - Complete Setup

## 🚀 Deploy to Railway Now

### Step 1: Add Environment Variables to Railway

Go to your Railway project → Your Service → Variables tab

Add these variables:

```
DATABASE_URL=postgresql://postgres:JtseGkMUmPvtxbfzNaognUOjSlIYAVSz@shinkansen.proxy.rlwy.net:48461/railway
NEXTAUTH_SECRET=/jSpd8yDnoCRU6TIaOx/z29LaLex14PFttM9R7kIRZE=
NEXTAUTH_URL=https://your-app-name.railway.app
NODE_ENV=production
```

**Replace `your-app-name`** with your actual Railway app URL (check the Railway dashboard).

### Step 2: Trigger Deployment

Railway will auto-deploy when variables change, or you can click "Deploy Now".

### Step 3: Verify Deployment

**Health Check:**
```bash
curl https://your-app-name.railway.app/api/health
```

Expected response:
```json
{
  "status": "healthy",
  "database": "connected",
  "timestamp": "2026-04-22T..."
}
```

**Test Sign-In Page:**
Visit: `https://your-app-name.railway.app/auth/signin`

You should see the sign-in page (even without OAuth providers configured).

---

## Optional: Add OAuth Providers

### Google OAuth (5 minutes)

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new OAuth 2.0 Client ID:
   - Application type: Web application
   - Name: Cortex (Railway)
   - Authorized redirect URI: `https://your-app-name.railway.app/api/auth/callback/google`
3. Add to Railway variables:
```
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
```

### GitHub OAuth (3 minutes)

1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Click "New OAuth App"
3. Fill in:
   - Application name: Cortex (Railway)
   - Homepage URL: `https://your-app-name.railway.app`
   - Authorization callback URL: `https://your-app-name.railway.app/api/auth/callback/github`
4. Add to Railway variables:
```
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
```

After adding OAuth credentials, Railway will auto-redeploy.

---

## Testing Checklist

- [ ] Health check returns 200 OK
- [ ] Sign-in page loads at `/auth/signin`
- [ ] Can sign in with Google/GitHub (if configured)
- [ ] API routes return 401 when not authenticated
- [ ] Can access API routes after signing in
- [ ] Data is isolated per user

---

## Troubleshooting

**Database connection error:**
- Check DATABASE_URL is correct
- Verify Railway PostgreSQL service is running

**NextAuth error:**
- Ensure NEXTAUTH_SECRET is exactly 32+ characters
- Verify NEXTAUTH_URL matches your Railway app URL

**OAuth callback error:**
- Check callback URLs in OAuth provider settings
- Verify CLIENT_ID and CLIENT_SECRET are correct

---

## Current Deployment Status

✅ Database schema applied
✅ Prisma Client generated
✅ Authentication code deployed
✅ API security active
✅ Security headers enabled
✅ Error handling active

⏳ Waiting for:
- NEXTAUTH_SECRET and NEXTAUTH_URL on Railway
- OAuth provider credentials (optional)

---

Once you've added these variables to Railway, the app will be fully functional!
