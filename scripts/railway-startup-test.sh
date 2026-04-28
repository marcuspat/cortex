#!/bin/bash

# Railway Startup Test Script
# This script runs after Railway deployment to verify everything is working

echo "🚀 Railway Deployment Verification"
echo "=================================="
echo ""

# Test 1: Environment Variables
echo "📋 Checking environment variables..."
if [ -z "$DATABASE_URL" ]; then
    echo "❌ DATABASE_URL is not set!"
    exit 1
else
    echo "✅ DATABASE_URL is set"
fi

if [ -z "$NEXTAUTH_SECRET" ]; then
    echo "❌ NEXTAUTH_URL is not set!"
    exit 1
else
    echo "✅ NEXTAUTH_SECRET is set"
fi

echo ""

# Test 2: Database Connection
echo "🗄️  Testing database connection..."
node -e "
const PrismaClient = require('@prisma/client').PrismaClient;
const prisma = new PrismaClient();

prisma.\$queryRaw\`SELECT 1\`
  .then(() => {
    console.log('✅ Database connection successful!');
    return prisma.\$disconnect();
  })
  .catch(err => {
    console.error('❌ Database connection failed:', err.message);
    process.exit(1);
  });
"

if [ $? -ne 0 ]; then
    echo "❌ Database test failed!"
    exit 1
fi

echo ""

# Test 3: Health Endpoint
echo "🏥 Testing health endpoint..."
if [ -n "$RAILWAY_PUBLIC_DOMAIN" ]; then
    HEALTH_URL="https://$RAILWAY_PUBLIC_DOMAIN/api/health"
    echo "Testing: $HEALTH_URL"

    curl -s -f "$HEALTH_URL" > /dev/null
    if [ $? -eq 0 ]; then
        echo "✅ Health endpoint is responding!"
    else
        echo "⚠️  Health endpoint not ready yet (this is normal during startup)"
    fi
fi

echo ""
echo "✅ Railway deployment verification complete!"
echo ""
echo "📝 Next steps:"
echo "   1. Check application logs: railway logs"
echo "   2. Visit your app: https://$RAILWAY_PUBLIC_DOMAIN"
echo "   3. Test authentication"
echo "   4. Create test data"