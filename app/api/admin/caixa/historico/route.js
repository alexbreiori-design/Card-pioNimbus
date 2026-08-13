import { NextResponse } from 'next/server';
import { fetchCaixaHistorico, getEmpresaBySlug, mapTurnoToClient } from '@/lib/caixa/caixaServer';
import { normalizeSlug } from '@/lib/normalize';
import { requireStoreAdmin } from '@/lib/supabase/membership';
import { getServiceClient } from '@/lib/supabase/serviceRole';

function jsonError(message, status = 500) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

export async function GET(request) {
  try {
    const url = new URL(request.url);
    const slug = normalizeSlug(url.searchParams.get('slug') || '');
    const days = Number(url.searchParams.get('days') || 30);

    if (!slug) {
      return jsonError('Slug obrigatório.', 400);
    }

    const supabase = getServiceClient();
    if (!supabase) {
      return jsonError('Serviço indisponível.', 503);
    }

    await requireStoreAdmin(slug);
    const empresa = await getEmpresaBySlug(supabase, slug);
    if (!empresa?.id) {
      return jsonError('Loja não encontrada.', 404);
    }

    const historico = await fetchCaixaHistorico(supabase, empresa.id, days);

    return NextResponse.json({
      ok: true,
      historico: (historico || []).map((day) => ({
        date: day.date,
        turnos: (day.turnos || []).map(mapTurnoToClient).filter(Boolean),
      })),
    });
  } catch (error) {
    const status = Number(error?.status) || 500;
    const message =
      typeof error?.message === 'string' && error.message
        ? error.message
        : 'Erro ao carregar histórico.';
    return jsonError(message, status >= 400 && status < 600 ? status : 500);
  }
}
