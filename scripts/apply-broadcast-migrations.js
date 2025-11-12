#!/usr/bin/env node
/**
 * Apply broadcast migrations to Supabase
 * Usage: node scripts/apply-broadcast-migrations.js
 */

const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('❌ Missing environment variables:');
  console.error('   VITE_SUPABASE_URL or SUPABASE_URL');
  console.error('   SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const migrations = [
  'supabase/migrations/20241112170000_add_broadcast_system.sql',
  'supabase/migrations/20241112180000_enable_broadcast_realtime.sql'
];

async function executeSql(sql) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`
    },
    body: JSON.stringify({ query: sql })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`SQL execution failed: ${error}`);
  }

  return await response.json();
}

async function applyMigration(filePath) {
  console.log(`\n📄 Applying: ${filePath}`);

  const sql = fs.readFileSync(path.join(__dirname, '..', filePath), 'utf8');

  // Split by semicolon and filter out comments/empty lines
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s && !s.startsWith('--'));

  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i];
    if (!statement) continue;

    try {
      await executeSql(statement);
      process.stdout.write('.');
    } catch (error) {
      console.error(`\n❌ Failed on statement ${i + 1}:`);
      console.error(statement.substring(0, 200) + '...');
      console.error(error.message);
      throw error;
    }
  }

  console.log(' ✅');
}

async function main() {
  console.log('🚀 Applying Broadcast Migrations to Supabase\n');
  console.log(`URL: ${SUPABASE_URL}`);

  for (const migration of migrations) {
    try {
      await applyMigration(migration);
    } catch (error) {
      console.error(`\n❌ Migration failed: ${migration}`);
      console.error(error.message);
      process.exit(1);
    }
  }

  console.log('\n✅ All migrations applied successfully!');
  console.log('\n📋 Next steps:');
  console.log('   1. Go to Supabase Dashboard → Database → Replication');
  console.log('   2. Enable realtime for these tables:');
  console.log('      - broadcast_sessions');
  console.log('      - live_captions');
  console.log('      - broadcast_tracks');
  console.log('      - broadcast_viewers');
  console.log('   3. Restart your app and test "Go Live"');
}

main().catch(error => {
  console.error('\n💥 Fatal error:', error.message);
  process.exit(1);
});
