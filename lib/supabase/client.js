import { createBrowserClient } from '@supabase/ssr';
import { isSupabasePublicConfigReady, resolveSupabasePublicConfig } from '@/lib/supabase/runtimeConfig';

export function createClient() {
  const { url, anonKey } = resolveSupabasePublicConfig();

  if (!isSupabasePublicConfigReady({ url, anonKey })) {
    throw new Error('Supabase public config ausente.');
  }

  return createBrowserClient(url, anonKey);
}
