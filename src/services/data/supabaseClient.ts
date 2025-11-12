import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let client: SupabaseClient | null = null;

/**
 * Lazily instantiate the Supabase browser client so we only touch env vars when needed.
 */
export const getSupabaseClient = (): SupabaseClient => {
  if (client) {
    return client;
  }

  const supabaseUrl =
    import.meta.env.VITE_SUPABASE_URL ?? import.meta.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey =
    import.meta.env.VITE_SUPABASE_ANON_KEY ?? import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. Update your .env before using Supabase.'
    );
  }

  client = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false },
    global: {
      headers: {
        'x-client-info': 'dj-xu-web/1.0',
      },
    },
  });

  return client;
};

export type { SupabaseClient } from '@supabase/supabase-js';
