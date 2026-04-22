# Railway Environment Setup Guide

## Required Environment Variables

Add these to your Railway project settings:

### Database
```
DATABASE_URL=postgresql://postgres:JtseGkMUmPvtxbfzNaognUOjSlIYAVSz@shinkansen.proxy.rlwy.net:48461/railway
```

### NextAuth.js Required
```
NEXTAUTH_SECRET=YOUR_SECURE_RANDOM_STRING_HERE_MIN_32_CHARS
NEXTAUTH_URL=https://your-app.railway.app
```

### OAuth Providers (Optional but Recommended)
```
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
```

### Optional: Rate Limiting
```
UPSTASH_REDIS_REST_URL=your-upstash-redis-url
UPSTASH_REDIS_REST_TOKEN=your-upstash-redis-token
```

### Optional: AI Features
```
ANTHROPIC_API_KEY=your-anthropic-key
OPENAI_API_KEY=your-openai-key
```

### Node Environment
```
NODE_ENV=production
```

---

## Setup Steps

### 1. Generate NEXTAUTH_SECRET

Run this command to generate a secure secret:
```bash
openssl rand -base64 32
```

### 2. Add Variables to Railway

1. Go to your Railway project
2. Click on your service
3. Go to "Variables" tab
4. Add each variable from above

### 3. Configure OAuth Providers

#### Google OAuth
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable Google+ API
4. Create OAuth 2.0 credentials:
   - Application type: Web application
   - Authorized redirect URI: `https://your-app.railway.app/api/auth/callback/google`
5. Copy Client ID and Secret

#### GitHub OAuth
1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Click "New OAuth App"
3. Set:
   - Application name: Cortex
   - Homepage URL: `https://your-app.railway.app`
   - Authorization callback URL: `https://your-app.railway.app/api/auth/callback/github`
4. Copy Client ID and Secret

### 4. Redeploy

After adding variables, Railway will automatically redeploy.

---

## Testing

### Health Check
```bash
curl https://your-app.railway.app/api/health
```

Should return:
```json
{
  "status": "healthy",
  "database": "connected",
  "timestamp": "2026-04-22T..."
}
```

### Test Authentication
Visit `https://your-app.railway.app/auth/signin`

You should see the sign-in page with Google/GitHub buttons.

---

## Current Status

✅ Database schema applied (all models created)
✅ Prisma Client generated
✅ Environment variables documented

⏳ Waiting for:
- Railway environment variables to be set
- OAuth provider credentials
- Testing authentication flow

Once environment variables are set on Railway, the application will be fully functional!
