import 'server-only';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/database.types';
import { getSupabaseConfig } from '@/lib/supabase/config';
import { supabaseFetch } from '@/lib/supabase/node-fetch';

export function createPublicSupabaseClient() {
  const config = getSupabaseConfig();
  if (!config) return null;

  return createClient<Database>(config.url, config.key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: { fetch: supabaseFetch },
  });
}
