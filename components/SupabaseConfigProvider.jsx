'use client';

import { setSupabaseRuntimeConfig } from '@/lib/supabase/runtimeConfig';

export default function SupabaseConfigProvider({ url, anonKey, children }) {
  setSupabaseRuntimeConfig({ url, anonKey });
  return children;
}
