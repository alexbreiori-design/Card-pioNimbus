import { NextResponse } from 'next/server';
import { loadAssembledStoreState, persistModularStoreState } from '@/lib/catalog/storeCatalogRepository';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';
import { createPendingReview, validateReviewSubmission } from '@/lib/reviews/storeReviews';
import { getServiceClient } from '@/lib/supabase/serviceRole';

function checkPublicReviewRateLimit(request, slug) {
  const ip = getClientIp(request);
  const windowMs = 60_000;
  const ipCheck = checkRateLimit({ key: `public-review:ip:${ip}`, max: 6, windowMs });
  if (!ipCheck.ok) return ipCheck;
  if (slug) {
    return checkRateLimit({ key: `public-review:slug:${slug}`, max: 30, windowMs });
  }
  return { ok: true };
}

export async function POST(request) {
  const supabase = getServiceClient();
  if (!supabase) {
    return NextResponse.json({ ok: false, error: 'Serviço indisponível.' }, { status: 503 });
  }

  const body = await request.json().catch(() => ({}));
  const slug = String(body.slug || '').trim().toLowerCase();
  const validation = validateReviewSubmission({
    nome: body.nome,
    nota: body.nota,
    comentario: body.comentario,
  });

  if (!slug) {
    return NextResponse.json({ ok: false, error: 'Loja inválida.' }, { status: 400 });
  }
  if (!validation.ok) {
    return NextResponse.json({ ok: false, error: validation.error }, { status: 400 });
  }

  const rateLimit = checkPublicReviewRateLimit(request, slug);
  if (!rateLimit.ok) {
    return NextResponse.json(
      { ok: false, error: 'Muitas tentativas. Aguarde um momento e tente novamente.' },
      {
        status: 429,
        headers: { 'Retry-After': String(rateLimit.retryAfterSec) },
      }
    );
  }

  try {
    const loaded = await loadAssembledStoreState(supabase, slug);
    if (!loaded?.data) {
      return NextResponse.json({ ok: false, error: 'Loja não encontrada.' }, { status: 404 });
    }

    const pendingReview = createPendingReview(validation.value);
    const currentReviews = Array.isArray(loaded.data.loja?.avaliacoes) ? loaded.data.loja.avaliacoes : [];
    const nextState = {
      ...loaded.data,
      loja: {
        ...loaded.data.loja,
        avaliacoes: [pendingReview, ...currentReviews],
      },
    };

    await persistModularStoreState(supabase, slug, nextState);

    return NextResponse.json({
      ok: true,
      message: 'Avaliação enviada com sucesso.',
      reviewId: pendingReview.id,
    });
  } catch (error) {
    console.error('[public-review]', error);
    return NextResponse.json(
      { ok: false, error: 'Não foi possível enviar a avaliação.' },
      { status: 500 }
    );
  }
}
