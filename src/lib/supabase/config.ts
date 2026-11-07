export function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url && !key) return null;
  if (!url || !key) {
    throw new Error(
      'Configure both NEXT_PUBLIC_SUPABASE_URL and a Supabase anon/publishable key.',
    );
  }

  return { url, key };
}

export function isSupabaseConfigured() {
  return getSupabaseConfig() !== null;
}
