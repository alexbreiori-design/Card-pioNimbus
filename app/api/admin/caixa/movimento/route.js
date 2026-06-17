import { NextResponse } from 'next/server';
import { addCaixaMovimento, getEmpresaBySlug } from '@/lib/caixa/caixaServer';
import { normalizeSlug } from '@/lib/normalize';
import { requireStoreAdmin } from '@/lib/supabase/membership';
import { getServiceClient } from '@/lib/supabase/serviceRole';

export async function POST(request) {
  const supabase = getServiceClient();
  if (!supabase) {
    return NextResponse.json({ ok: false, error: 'Serviço indisponível.' }, { status: 503 });
  }

  const body = await request.json().catch(() => ({}));
  const slug = normalizeSlug(body.slug || '');
  const turnoId = String(body.turnoId || '');
  const tipo = String(body.tipo || '');
  const valor = Number(body.valor ?? 0);
  const descricao = String(body.descricao || '');

  if (!slug || !turnoId || !['sangria', 'suprimento'].includes(tipo)) {
    return NextResponse.json({ ok: false, error: 'Dados inválidos.' }, { status: 400 });
  }

  try {
    const user = await requireStoreAdmin(slug);
    const empresa = await getEmpresaBySlug(supabase, slug);
    if (!empresa?.id) {
      return NextResponse.json({ ok: false, error: 'Loja não encontrada.' }, { status: 404 });
    }

    const result = await addCaixaMovimento(supabase, {
      empresaId: empresa.id,
      userId: user.id,
      turnoId,
      tipo,
      valor,
      descricao,
    });

    return NextResponse.json({
      ok: true,
      movimento: result.movimento,
      summary: result.summary,
    });
  } catch (error) {
    const status = error?.status || 500;
    return NextResponse.json(
      { ok: false, error: error?.message || 'Erro ao registrar movimento.' },
      { status }
    );
  }
}
