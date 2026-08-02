import { NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/superAdminServer';
import { getServiceClient } from '@/lib/supabase/serviceRole';
import {
  WHATS_NEW_BUCKET,
  extensionForWhatsNewMime,
  isAllowedWhatsNewMime,
  mediaTypeFromMime,
  publicWhatsNewUrl,
} from '@/lib/whatsNew';

const MAX_BYTES = 20 * 1024 * 1024;

export async function POST(request) {
  try {
    await requireSuperAdmin();
    const supabase = getServiceClient();
    if (!supabase) {
      return NextResponse.json({ ok: false, error: 'Serviço indisponível.' }, { status: 503 });
    }

    const form = await request.formData();
    const file = form.get('file');
    if (!file || typeof file === 'string' || !file.size) {
      return NextResponse.json({ ok: false, error: 'Envie um arquivo de imagem ou vídeo.' }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { ok: false, error: 'Arquivo muito grande (máx. 20 MB). Prefira clipes curtos.' },
        { status: 400 }
      );
    }

    const mime = String(file.type || '').trim().toLowerCase();
    if (!isAllowedWhatsNewMime(mime)) {
      return NextResponse.json(
        { ok: false, error: 'Formato inválido. Use JPG, PNG, WebP, GIF, MP4 ou WebM.' },
        { status: 400 }
      );
    }

    const ext = extensionForWhatsNewMime(mime);
    const objectPath = `entries/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const { error } = await supabase.storage.from(WHATS_NEW_BUCKET).upload(objectPath, buffer, {
      contentType: mime,
      cacheControl: '31536000',
      upsert: false,
    });
    if (error) throw error;

    return NextResponse.json({
      ok: true,
      mediaPath: objectPath,
      mediaType: mediaTypeFromMime(mime),
      mediaUrl: publicWhatsNewUrl(objectPath),
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error?.message || 'Erro ao enviar mídia.' },
      { status: error?.status || 500 }
    );
  }
}
