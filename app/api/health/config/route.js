import { NextResponse } from 'next/server';

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  const defaultSlug = process.env.NEXT_PUBLIC_DEFAULT_STORE_SLUG || '';

  return NextResponse.json({
    ok: true,
    supabasePublic: Boolean(url && anonKey),
    supabaseServiceRole: Boolean(serviceKey),
    defaultStoreSlug: Boolean(defaultSlug),
    supabaseUrlHost: url ? new URL(url).host : null,
  });
}
