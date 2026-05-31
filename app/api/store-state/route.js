import { NextResponse } from 'next/server';
import { createClient as createAnonClient } from '@supabase/supabase-js';
import { withDerivedData } from '@/lib/adminData';
import { stampStoreMeta } from '@/lib/storeStateMerge';
import {
  fetchStoreStateBySlugServer,
  upsertStoreStateServer,
} from '@/lib/supabase/storeStateServer';

const TABLE = 'menu_store_state';

async function fetchStoreStateAnon(slug) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;
  const supabase = createAnonClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await supabase
    .from(TABLE)
    .select('slug,data,updated_at')
    .eq('slug', slug)
    .maybeSingle();
  if (error) throw error;
  return data || null;
}

export async function GET(request) {
  const slug = String(new URL(request.url).searchParams.get('slug') || '')
    .trim()
    .toLowerCase();
  if (!slug) {
    return NextResponse.json({ ok: false, error: 'Slug obrigatório.' }, { status: 400 });
  }

  try {
    let row = await fetchStoreStateBySlugServer(slug);
    if (!row) {
      row = await fetchStoreStateAnon(slug);
    }
    if (!row) {
      return NextResponse.json({ ok: true, slug, data: null, updated_at: null });
    }
    return NextResponse.json({
      ok: true,
      slug: row.slug,
      data: row.data,
      updated_at: row.updated_at,
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error?.message || 'Erro ao carregar estado.' },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const slug = String(body.slug || '').trim().toLowerCase();
  const incoming = body.data;

  if (!slug || !incoming) {
    return NextResponse.json({ ok: false, error: 'Payload inválido.' }, { status: 400 });
  }

  try {
    const stamped = stampStoreMeta(withDerivedData(incoming));
    const saved = await upsertStoreStateServer(slug, stamped);
    return NextResponse.json({
      ok: true,
      slug: saved.slug,
      updated_at: saved.updated_at,
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error?.message || 'Erro ao salvar estado.' },
      { status: error?.message?.includes('SERVICE_ROLE') ? 503 : 500 }
    );
  }
}
