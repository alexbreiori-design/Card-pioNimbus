import { NextResponse } from 'next/server';
import { NIMBUS_FEEDBACK_CATEGORIES, mapNimbusFeedback } from '@/lib/nimbusFeedback';
import { normalizeSlug } from '@/lib/normalize';
import { requireStoreAdmin } from '@/lib/supabase/membership';
import { getServiceClient } from '@/lib/supabase/serviceRole';

const INBOX_CATEGORIES = new Set(
  NIMBUS_FEEDBACK_CATEGORIES.filter((item) => item.channel === 'inbox').map((item) => item.id)
);

export async function POST(request) {
  const supabase = getServiceClient();
  if (!supabase) {
    return NextResponse.json({ ok: false, error: 'Serviço indisponível.' }, { status: 503 });
  }

  const body = await request.json().catch(() => ({}));
  const slug = normalizeSlug(body.slug || '');
  const categoria = String(body.categoria || '').trim();
  const mensagem = String(body.mensagem || '').trim();

  if (!slug || !INBOX_CATEGORIES.has(categoria)) {
    return NextResponse.json({ ok: false, error: 'Dados inválidos.' }, { status: 400 });
  }
  if (mensagem.length < 12) {
    return NextResponse.json(
      { ok: false, error: 'Escreva uma mensagem um pouco mais detalhada.' },
      { status: 400 }
    );
  }
  if (mensagem.length > 4000) {
    return NextResponse.json({ ok: false, error: 'Mensagem muito longa.' }, { status: 400 });
  }

  try {
    const user = await requireStoreAdmin(slug);
    const { data: empresa, error: empresaError } = await supabase
      .from('empresas')
      .select('id, nome, slug')
      .eq('slug', slug)
      .maybeSingle();
    if (empresaError) throw empresaError;
    if (!empresa?.id) {
      return NextResponse.json({ ok: false, error: 'Loja não encontrada.' }, { status: 404 });
    }

    const meta = user.user_metadata || {};
    const autorNome =
      String(meta.full_name || meta.name || meta.nome || '').trim() ||
      String(user.email || '').split('@')[0] ||
      'Lojista';

    const { data, error } = await supabase
      .from('nimbus_feedback')
      .insert({
        empresa_id: empresa.id,
        autor_user_id: user.id,
        autor_email: user.email || null,
        autor_nome: autorNome,
        categoria,
        mensagem,
        status: 'aberto',
      })
      .select('*')
      .single();
    if (error) throw error;

    return NextResponse.json({ ok: true, feedback: mapNimbusFeedback(data) });
  } catch (error) {
    const status = error?.status || 500;
    return NextResponse.json(
      { ok: false, error: error?.message || 'Erro ao enviar feedback.' },
      { status }
    );
  }
}
