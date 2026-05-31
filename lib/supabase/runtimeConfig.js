let runtimeConfig = {
  url: '',
  anonKey: '',
};

export function setSupabaseRuntimeConfig(config) {
  runtimeConfig = {
    url: String(config?.url || '').trim(),
    anonKey: String(config?.anonKey || '').trim(),
  };
}

export function getSupabaseRuntimeConfig() {
  return runtimeConfig;
}

export function resolveSupabasePublicConfig() {
  const runtime = getSupabaseRuntimeConfig();
  return {
    url: runtime.url || process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    anonKey: runtime.anonKey || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
  };
}

export function isSupabasePublicConfigReady(config = resolveSupabasePublicConfig()) {
  return Boolean(config.url && config.anonKey);
}
