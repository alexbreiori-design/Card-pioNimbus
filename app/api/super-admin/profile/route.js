import { NextResponse } from 'next/server';
import { loadSystemProfile, updateSystemProfile } from '@/lib/superAdmin/systemProfile';
import { requireSuperAdmin } from '@/lib/superAdminServer';
import { getServiceClient } from '@/lib/supabase/serviceRole';

export async function GET() {
  const supabase = getServiceClient();
  if (!supabase) {
    return NextResponse.json({ ok: false, error: 'Serviço indisponível.' }, { status: 503 });
  }

  try {
    await requireSuperAdmin();
    const profile = await loadSystemProfile(supabase);
    return NextResponse.json({ ok: true, profile });
  } catch (error) {
    const status = error?.status || 500;
    return NextResponse.json(
      { ok: false, error: error?.message || 'Erro ao carregar perfil.' },
      { status }
    );
  }
}

export async function PATCH(request) {
  const supabase = getServiceClient();
  if (!supabase) {
    return NextResponse.json({ ok: false, error: 'Serviço indisponível.' }, { status: 503 });
  }

  const body = await request.json().catch(() => ({}));

  try {
    await requireSuperAdmin();
    const profile = await updateSystemProfile(supabase, {
      nome_exibicao: body.nome_exibicao,
      whatsapp_suporte: body.whatsapp_suporte,
      email: body.email,
    });
    return NextResponse.json({ ok: true, profile });
  } catch (error) {
    const status = error?.status || 500;
    return NextResponse.json(
      { ok: false, error: error?.message || 'Erro ao salvar perfil.' },
      { status }
    );
  }
}
