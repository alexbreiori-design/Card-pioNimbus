import { NextResponse } from 'next/server';
import { runDailyCatalogBackups } from '@/lib/catalog/dailyCatalogBackup';
import { getServiceClient } from '@/lib/supabase/serviceRole';

/**
 * Cron: backup JSON do catálogo de todas as lojas (retenção 7 dias).
 * Auth: Authorization: Bearer $CRON_SECRET (ou x-cron-secret / x-vercel-cron em prod).
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
    const report = await runDailyCatalogBackups(supabase);
    return NextResponse.json({ ok: true, ...report });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error?.message || 'Erro ao gerar backups.' },
      { status: 500 }
    );
  }
}

export const POST = GET;
