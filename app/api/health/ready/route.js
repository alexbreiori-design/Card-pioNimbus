import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return NextResponse.json(
      { ok: false, reason: 'missing_supabase_config' },
      { status: 503 }
    );
  }

  try {
    const supabase = createClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data, error } = await supabase.rpc('health_ping');

    if (error) {
      return NextResponse.json(
        { ok: false, reason: 'supabase_unreachable', detail: error.message },
        { status: 503 }
      );
    }

    if (data !== true) {
      return NextResponse.json(
        { ok: false, reason: 'supabase_empty' },
        { status: 503 }
      );
    }

    return NextResponse.json({
      ok: true,
      supabase: true,
      ts: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, reason: 'health_check_failed', detail: error?.message || 'unknown' },
      { status: 503 }
    );
  }
}
