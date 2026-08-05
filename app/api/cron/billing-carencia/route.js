import { NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase/serviceRole';
import { expireDueCarencias } from '@/lib/stripe/carencia';

/**
 * Cron: encerra carências vencidas no espelho local.
 * Auth: Authorization: Bearer $CRON_SECRET (ou x-cron-secret).
 */
export async function GET(request) {
  const secret = String(process.env.CRON_SECRET || '').trim();
  const auth = request.headers.get('authorization') || '';
  const headerSecret = request.headers.get('x-cron-secret') || '';
  const bearer = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
  const provided = headerSecret || bearer;

  if (secret) {
    if (!provided || provided !== secret) {
      return NextResponse.json({ ok: false, error: 'Não autorizado.' }, { status: 401 });
    }
  } else if (process.env.NODE_ENV === 'production') {
    // Em prod sem CRON_SECRET, só aceita chamada do Vercel Cron (header presente).
    const isVercelCron = Boolean(request.headers.get('x-vercel-cron'));
    if (!isVercelCron) {
      return NextResponse.json({ ok: false, error: 'Não autorizado.' }, { status: 401 });
    }
  }

  const supabase = getServiceClient();
  if (!supabase) {
    return NextResponse.json({ ok: false, error: 'Serviço indisponível.' }, { status: 503 });
  }

  try {
    const results = await expireDueCarencias(supabase);
    return NextResponse.json({
      ok: true,
      processed: results.length,
      results,
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error?.message || 'Erro ao processar carências.' },
      { status: 500 }
    );
  }
}

export const POST = GET;
