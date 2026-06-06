import { NextResponse } from 'next/server';
import { resolveNimbusSupportUrl } from '@/lib/nimbusSupport';
import { loadSystemProfile } from '@/lib/superAdmin/systemProfile';
import { getServiceClient } from '@/lib/supabase/serviceRole';

export async function GET() {
  const supabase = getServiceClient();
  let whatsappSuporte = null;

  if (supabase) {
    try {
      const profile = await loadSystemProfile(supabase);
      whatsappSuporte = profile.whatsapp_suporte;
    } catch {
      whatsappSuporte = null;
    }
  }

  const url = resolveNimbusSupportUrl({ whatsappSuporte });

  return NextResponse.json(
    { ok: true, url, label: 'Suporte' },
    { headers: { 'Cache-Control': 'public, max-age=300' } }
  );
}
