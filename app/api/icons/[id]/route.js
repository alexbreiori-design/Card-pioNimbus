import { NextResponse } from 'next/server';
import { sanitizeCategoryIconId } from '@/lib/categoryIconsShared';
import { readNormalizedCategorySvg } from '@/lib/normalizeCategorySvg';

export async function GET(_request, { params }) {
  const { id } = await params;
  const safeId = sanitizeCategoryIconId(id);
  if (!safeId) {
    return NextResponse.json({ ok: false, error: 'Ícone inválido.' }, { status: 400 });
  }

  try {
    const svg = await readNormalizedCategorySvg(safeId);
    if (!svg) {
      return NextResponse.json({ ok: false, error: 'Ícone não encontrado.' }, { status: 404 });
    }

    return new NextResponse(svg, {
      status: 200,
      headers: {
        'Content-Type': 'image/svg+xml; charset=utf-8',
        'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
      },
    });
  } catch (error) {
    if (error?.code === 'ENOENT') {
      return NextResponse.json({ ok: false, error: 'Ícone não encontrado.' }, { status: 404 });
    }
    return NextResponse.json(
      { ok: false, error: error?.message || 'Erro ao carregar ícone.' },
      { status: 500 }
    );
  }
}
