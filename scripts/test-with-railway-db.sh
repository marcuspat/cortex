#!/bin/bash

# Test application with Railway PostgreSQL database
# This simulates the exact Railway environment locally

export DATABASE_URL="postgresql://postgres:JtseGkMUmPvtxbfzNaognUOjSlIYAVSz@shinkansen.proxy.rlwy.net:48461/railway"
export NEXTAUTH_SECRET="J/+FdHSiXmF1IQd1iT6VggT+Qr+axV7bRYjyCobA1nE="
export NEXTAUTH_URL="http://localhost:3000"
export NODE_ENV="production"

echo "🚀 Starting application with Railway database..."
echo "Database: Railway PostgreSQL (shinkansen.proxy.rlwy.net:48461)"
echo "Environment: Production"
echo ""

# Test database connection
echo "📡 Testing database connection..."
npx tsx scripts/test-database-connection.ts

if [ $? -ne 0 ]; then
    echo "❌ Database connection failed!"
    exit 1
fi

echo ""
echo "✅ Database connection successful!"
echo ""
echo "🏗️  Building application..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed!"
    exit 1
fi

echo ""
echo "✅ Build successful!"
echo ""
echo "🚀 Starting application server..."
echo "Visit: http://localhost:3000"
echo "Health check: http://localhost:3000/api/health"
echo ""
echo "Press Ctrl+C to stop"
echo ""

# Start the application
NODE_ENV=production npm start