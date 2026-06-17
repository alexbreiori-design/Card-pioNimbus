import { NextResponse } from 'next/server';
import {
  fetchCaixaState,
  getEmpresaBySlug,
  mapTurnoToClient,
} from '@/lib/caixa/caixaServer';
import { normalizeSlug } from '@/lib/normalize';
import { requireStoreAdmin } from '@/lib/supabase/membership';
import { getServiceClient } from '@/lib/supabase/serviceRole';

export async function GET(request) {
  const url = new URL(request.url);
  const slug = normalizeSlug(url.searchParams.get('slug') || '');

  if (!slug) {
    return NextResponse.json({ ok: false, error: 'Slug obrigatório.' }, { status: 400 });
  }

  const supabase = getServiceClient();
  if (!supabase) {
    return NextResponse.json({ ok: false, error: 'Serviço indisponível.' }, { status: 503 });
  }

  try {
    await requireStoreAdmin(slug);
    const empresa = await getEmpresaBySlug(supabase, slug);
    if (!empresa?.id) {
      return NextResponse.json({ ok: false, error: 'Loja não encontrada.' }, { status: 404 });
    }

    const state = await fetchCaixaState(supabase, empresa.id);

    return NextResponse.json({
      ok: true,
      slug,
      isOpen: state.isOpen,
      turno: mapTurnoToClient(state.turno),
      summary: state.summary,
      pendingCount: state.pendingCount,
      canReopen: state.canReopen,
      lastClosedTurno: mapTurnoToClient(state.lastClosedTurno),
      nextTurnoNumber: state.nextTurnoNumber,
    });
  } catch (error) {
    const status = error?.status || 500;
    return NextResponse.json(
      { ok: false, error: error?.message || 'Erro ao carregar caixa.' },
      { status }
    );
  }
}
