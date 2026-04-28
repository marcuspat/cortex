/**
 * DATABASE CONNECTIVITY TEST
 *
 * Tests database connection for Railway deployment
 */

import { PrismaClient } from '@prisma/client';

async function testDatabaseConnection() {
  console.log('🔍 Testing database connectivity...\n');

  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.error('❌ DATABASE_URL environment variable is not set');
    console.log('\n💡 Set DATABASE_URL to your PostgreSQL connection string:');
    console.log('   export DATABASE_URL="postgresql://user:password@host:port/database"');
    process.exit(1);
  }

  // Mask sensitive info in logs
  const maskedUrl = databaseUrl.replace(/:[^:@]+@/, ':****@');
  console.log(`📡 DATABASE_URL: ${maskedUrl}`);

  const prisma = new PrismaClient({
    log: ['query', 'error', 'warn'],
  });

  try {
    console.log('\n⏳ Testing database connection...');

    // Test basic connection
    await prisma.$queryRaw`SELECT 1 as result`;
    console.log('✅ Database connection successful!');

    // Test if we can query tables
    console.log('\n⏳ Testing database schema...');
    const tables = await prisma.$queryRaw`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `;
    console.log(`✅ Found ${tables.length} tables in database`);

    if (tables.length === 0) {
      console.log('\n⚠️  No tables found. You may need to run: npx prisma db push');
    } else {
      console.log('   Tables:', (tables as any[]).map(t => t.table_name).join(', '));
    }

    console.log('\n✅ All database tests passed!');
    console.log('\n💡 Your database is ready for Railway deployment.');

  } catch (error) {
    console.error('\n❌ Database connection failed!');
    console.error('Error:', error);

    if (error instanceof Error) {
      if (error.message.includes('connect')) {
        console.log('\n💡 Connection failed. Check:');
        console.log('   1. Database server is running');
        console.log('   2. DATABASE_URL is correct');
        console.log('   3. Network/firewall allows connection');
        console.log('   4. Database credentials are valid');
      } else if (error.message.includes('authentication')) {
        console.log('\n💡 Authentication failed. Check:');
        console.log('   1. Username and password in DATABASE_URL');
        console.log('   2. Database user has proper permissions');
      }
    }

    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

testDatabaseConnection();