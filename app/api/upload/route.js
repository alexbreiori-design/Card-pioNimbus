import { NextResponse } from 'next/server';
import { normalizeSlug } from '@/lib/normalize';
import { requireStoreAdmin } from '@/lib/supabase/membership';
import { getServiceClient } from '@/lib/supabase/serviceRole';

function parseDataUrl(dataUrl) {
  const match = String(dataUrl || '').match(/^data:(image\/[\w+.-]+);base64,(.+)$/);
  if (!match) return null;
  return {
    mime: match[1],
    buffer: Buffer.from(match[2], 'base64'),
  };
}

function extensionForMime(mime) {
  if (mime === 'image/png') return 'png';
  if (mime === 'image/webp') return 'webp';
  if (mime === 'image/gif') return 'gif';
  return 'jpg';
}

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
    const parsed = parseDataUrl(dataUrl);
    if (!parsed || !parsed.buffer.length) {
      return NextResponse.json({ ok: false, error: 'Imagem inválida.' }, { status: 400 });
    }

    const ext = extensionForMime(parsed.mime);
    const objectPath = `${slug}/${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`;

    const { error } = await supabase.storage.from('menu-assets').upload(objectPath, parsed.buffer, {
      contentType: parsed.mime,
      cacheControl: '31536000',
      upsert: false,
    });
    if (error) throw error;

    const {
      data: { publicUrl },
    } = supabase.storage.from('menu-assets').getPublicUrl(objectPath);

    return NextResponse.json({ ok: true, url: publicUrl, path: objectPath });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error?.message || 'Erro ao enviar imagem.' },
      { status: 500 }
    );
  }
}
