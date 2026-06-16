import { NextResponse } from 'next/server';
import { updateStoreOwnerContact } from '@/lib/superAdmin/updateOwnerContact';
import { requireSuperAdmin } from '@/lib/superAdminServer';
import { getServiceClient } from '@/lib/supabase/serviceRole';
import { normalizeSlug } from '@/lib/normalize';

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
    await requireSuperAdmin();
    const owner = await updateStoreOwnerContact(supabase, safeSlug, {
      email: body.email,
      telefone: body.telefone,
    });
    return NextResponse.json({ ok: true, owner });
  } catch (error) {
    const status = error?.status || 500;
    return NextResponse.json(
      { ok: false, error: error?.message || 'Erro ao atualizar contato do proprietário.' },
      { status }
    );
  }
}
