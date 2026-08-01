import { NextResponse } from 'next/server';
import { mapNimbusFeedback } from '@/lib/nimbusFeedback';
import { normalizeSlug } from '@/lib/normalize';
import { requireSuperAdmin } from '@/lib/superAdminServer';
import { getServiceClient } from '@/lib/supabase/serviceRole';

export async function GET(_request, { params }) {
  const supabase = getServiceClient();
  if (!supabase) {
    return NextResponse.json({ ok: false, error: 'Serviço indisponível.' }, { status: 503 });
  }

  const slug = normalizeSlug((await params)?.slug || '');
  if (!slug) {
    return NextResponse.json({ ok: false, error: 'Slug inválido.' }, { status: 400 });
  }

  try {
    await requireSuperAdmin();
    const { data: empresa, error: empresaError } = await supabase
      .from('empresas')
      .select('id')
      .eq('slug', slug)
      .maybeSingle();
    if (empresaError) throw empresaError;
    if (!empresa?.id) {
      return NextResponse.json({ ok: false, error: 'Loja não encontrada.' }, { status: 404 });
    }

    const { data, error } = await supabase
      .from('nimbus_feedback')
      .select('*')
      .eq('empresa_id', empresa.id)
      .order('created_at', { ascending: false })
      .limit(100);
    if (error) throw error;

    const items = (data || []).map(mapNimbusFeedback);
    const abertos = items.filter((item) => item.status === 'aberto').length;

    return NextResponse.json({ ok: true, items, abertos });
  } catch (error) {
    const status = error?.status || 500;
    return NextResponse.json(
      { ok: false, error: error?.message || 'Erro ao carregar feedback.' },
      { status }
    );
  }
}

export async function PATCH(request, { params }) {
  const supabase = getServiceClient();
  if (!supabase) {
    return NextResponse.json({ ok: false, error: 'Serviço indisponível.' }, { status: 503 });
  }

  const slug = normalizeSlug((await params)?.slug || '');
  const body = await request.json().catch(() => ({}));
  const feedbackId = String(body.id || '').trim();
  const status = String(body.status || '').trim();

  if (!slug || !feedbackId || !['aberto', 'lido', 'arquivado'].includes(status)) {
    return NextResponse.json({ ok: false, error: 'Dados inválidos.' }, { status: 400 });
  }

  try {
    const user = await requireSuperAdmin();
    const { data: empresa, error: empresaError } = await supabase
      .from('empresas')
      .select('id')
      .eq('slug', slug)
      .maybeSingle();
    if (empresaError) throw empresaError;
    if (!empresa?.id) {
      return NextResponse.json({ ok: false, error: 'Loja não encontrada.' }, { status: 404 });
    }

    const patch = {
      status,
      lido_em: status === 'aberto' ? null : new Date().toISOString(),
      lido_por: status === 'aberto' ? null : user.id,
    };

    const { data, error } = await supabase
      .from('nimbus_feedback')
      .update(patch)
      .eq('id', feedbackId)
      .eq('empresa_id', empresa.id)
      .select('*')
      .maybeSingle();
    if (error) throw error;
    if (!data) {
      return NextResponse.json({ ok: false, error: 'Feedback não encontrado.' }, { status: 404 });
    }

    return NextResponse.json({ ok: true, feedback: mapNimbusFeedback(data) });
  } catch (error) {
    const statusCode = error?.status || 500;
    return NextResponse.json(
      { ok: false, error: error?.message || 'Erro ao atualizar feedback.' },
      { status: statusCode }
    );
  }
}
