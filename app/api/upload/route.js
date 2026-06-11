import { NextResponse } from 'next/server';
import { normalizeSlug } from '@/lib/normalize';
import { requireStoreAdmin } from '@/lib/supabase/membership';
import { uploadMenuAssetFromDataUrl } from '@/lib/storage/uploadMenuAssetServer';
import { getServiceClient } from '@/lib/supabase/serviceRole';

export async function POST(request) {
  const supabase = getServiceClient();
  if (!supabase) {
    return NextResponse.json({ ok: false, error: 'Serviço indisponível.' }, { status: 503 });
  }

  const body = await request.json().catch(() => ({}));
  const slug = normalizeSlug(body.slug);
  const dataUrl = String(body.dataUrl || '');
  const folder = String(body.folder || 'misc').replace(/[^a-z0-9-_]/gi, '');

  if (!slug || !dataUrl.startsWith('data:image/')) {
    return NextResponse.json({ ok: false, error: 'Payload inválido.' }, { status: 400 });
  }

  try {
    await requireStoreAdmin(slug);
    const url = await uploadMenuAssetFromDataUrl(supabase, slug, dataUrl, { folder });
    return NextResponse.json({ ok: true, url });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error?.message || 'Erro ao enviar imagem.' },
      { status: 500 }
    );
  }
}
