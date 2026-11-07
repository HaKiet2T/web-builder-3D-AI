import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@/lib/supabase/database.types';
import { getSupabaseConfig } from '@/lib/supabase/config';

let browserClient: ReturnType<typeof createBrowserClient<Database>> | null = null;

/**
 * Returns a singleton browser Supabase client for client components.
 * Returns null if executed during SSR or if Supabase environment variables are not set.
 */
export function getBrowserSupabaseClient() {
  if (typeof window === 'undefined') return null;
  const config = getSupabaseConfig();
  if (!config) return null;

  if (!browserClient) {
    browserClient = createBrowserClient<Database>(config.url, config.key);
  }

  return browserClient;
}
