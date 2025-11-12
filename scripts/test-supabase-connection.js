#!/usr/bin/env node
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL;
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  process.env.SUPABASE_SECRET_KEY ??
  process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error(
    'Missing Supabase credentials. Set VITE_SUPABASE_URL (or SUPABASE_URL) and at least one service/secret key before running.'
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false },
  global: {
    headers: {
      'x-client-info': 'dj-xu-cli/1.0',
    },
  },
});

async function main() {
  console.log(`Checking Supabase connection to ${supabaseUrl}…`);

  try {
    const { data, error } = await supabase.from('app_users').select('id').limit(1);

    if (error) {
      throw error;
    }

    console.log(
      `Success: Supabase responded with ${Array.isArray(data) ? data.length : 0} row(s) from public.app_users.`
    );
    process.exit(0);
  } catch (error) {
    console.error('Supabase connectivity check failed:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main();
