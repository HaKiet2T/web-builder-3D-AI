import 'server-only';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function getCurrentAdmin() {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return null;

  const { data, error } = await supabase.auth.getUser();
  if (error?.name === 'AuthSessionMissingError') return null;
  if (error) throw new Error(`Could not verify the administrator session: ${error.message}`);

  if (data.user?.app_metadata.role !== 'admin') return null;

  return { supabase, user: data.user };
}

export async function requireAdminSupabaseClient() {
  const admin = await getCurrentAdmin();
  if (!admin) throw new Error('Administrator access is required.');
  return admin.supabase;
}
