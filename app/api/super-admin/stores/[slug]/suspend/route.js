import { NextResponse } from 'next/server';
import { setStoreSuspended } from '@/lib/superAdmin/storeSuspend';
import { requireSuperAdmin } from '@/lib/superAdminServer';
import { getServiceClient } from '@/lib/supabase/serviceRole';
import { normalizeSlug } from '@/lib/normalize';
import { appendTimelineEvent } from '@/lib/stripe/assinaturas';

export async function PATCH(request, { params }) {
  const supabase = getServiceClient();
  if (!supabase) {
    return NextResponse.json({ ok: false, error: 'Serviço indisponível.' }, { status: 503 });
  }

  const { slug } = await params;
  const safeSlug = normalizeSlug(slug);
  if (!safeSlug) {
    return NextResponse.json({ ok: false, error: 'Slug inválido.' }, { status: 400 });
  }

  const body = await request.json().catch(() => ({}));

  try {
    const admin = await requireSuperAdmin();
    const nextSuspended = Boolean(body.suspensa);
    const motivo = String(body.motivo || '').trim() || null;

    const store = await setStoreSuspended(supabase, safeSlug, nextSuspended, {
      motivo,
      autorUserId: admin.id,
      autorEmail: admin.email || null,
    });

    await appendTimelineEvent(supabase, {
      empresaId: store.id,
      tipo: nextSuspended ? 'loja_suspensa' : 'loja_reativada',
      titulo: nextSuspended ? 'Loja suspensa' : 'Loja reativada',
      detalhe: motivo || (nextSuspended ? 'Suspensa pelo super-admin.' : 'Reativada pelo super-admin.'),
      autorUserId: admin.id,
    });

    return NextResponse.json({ ok: true, store });
  } catch (error) {
    const status = error?.status || 500;
    return NextResponse.json(
      { ok: false, error: error?.message || 'Erro ao atualizar suspensão.' },
      { status }
    );
  }
}
