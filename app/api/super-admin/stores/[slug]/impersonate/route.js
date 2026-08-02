import { NextResponse } from 'next/server';
import { normalizeSlug } from '@/lib/normalize';
import { requireSuperAdmin } from '@/lib/superAdminServer';
import { getServiceClient } from '@/lib/supabase/serviceRole';
import { appendTimelineEvent } from '@/lib/stripe/assinaturas';

export async function POST(_request, { params }) {
  const supabase = getServiceClient();
  if (!supabase) {
    return NextResponse.json({ ok: false, error: 'Serviço indisponível.' }, { status: 503 });
  }

  const { slug } = await params;
  const safeSlug = normalizeSlug(slug);
  if (!safeSlug) {
    return NextResponse.json({ ok: false, error: 'Slug inválido.' }, { status: 400 });
  }

  try {
    const admin = await requireSuperAdmin();

    const { data: empresa, error: empresaError } = await supabase
      .from('empresas')
      .select('id, slug, nome')
      .eq('slug', safeSlug)
      .maybeSingle();
    if (empresaError) throw empresaError;
    if (!empresa?.id) {
      return NextResponse.json({ ok: false, error: 'Loja não encontrada.' }, { status: 404 });
    }

    const { data: existing, error: existingError } = await supabase
      .from('empresa_membros')
      .select('id, ativo')
      .eq('empresa_id', empresa.id)
      .eq('usuario_id', admin.id)
      .maybeSingle();
    if (existingError) throw existingError;

    if (existing) {
      if (!existing.ativo) {
        const { error: reactivateError } = await supabase
          .from('empresa_membros')
          .update({ ativo: true })
          .eq('id', existing.id);
        if (reactivateError) throw reactivateError;
      }
    } else {
      const { error: insertError } = await supabase.from('empresa_membros').insert({
        empresa_id: empresa.id,
        usuario_id: admin.id,
        papel: 'gerente',
        ativo: true,
      });
      if (insertError) throw insertError;
    }

    await appendTimelineEvent(supabase, {
      empresaId: empresa.id,
      tipo: 'impersonation',
      titulo: 'Acesso via super-admin',
      detalhe: `${admin.email || 'super-admin'} entrou como operador desta loja para suporte.`,
      autorUserId: admin.id,
    });

    return NextResponse.json({ ok: true, redirect: '/admin/pedidos', slug: empresa.slug });
  } catch (error) {
    const status = error?.status || 500;
    return NextResponse.json(
      { ok: false, error: error?.message || 'Erro ao entrar na loja.' },
      { status }
    );
  }
}
