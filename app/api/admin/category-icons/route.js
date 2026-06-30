import { readdir } from 'fs/promises';
import path from 'path';
import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase/membership';
import { getCategoryIconServePath } from '@/lib/categoryIconsShared';
import { humanizeIconId } from '@/lib/categoryIconsShared';

const EXCLUDED_FILES = new Set([
  'pix.svg',
  'store.svg',
  'logo-nimbus-light.svg',
]);

function isExcludedFile(filename) {
  if (!filename.endsWith('.svg')) return true;
  if (EXCLUDED_FILES.has(filename)) return true;
  if (filename.startsWith('sistema-')) return true;
  return false;
}

export async function GET() {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: 'Autenticação necessária.' }, { status: 401 });
  }

  try {
    const dir = path.join(process.cwd(), 'public', 'icons');
    const files = await readdir(dir);
    const fromDisk = files
      .filter((file) => !isExcludedFile(file))
      .map((file) => {
        const id = file.replace(/\.svg$/i, '');
        return {
          id,
          label: humanizeIconId(id),
          path: getCategoryIconServePath(id),
        };
      });

    return NextResponse.json({
      ok: true,
      icons: fromDisk.sort((a, b) => a.label.localeCompare(b.label, 'pt-BR')),
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error?.message || 'Erro ao listar ícones.' },
      { status: 500 }
    );
  }
}
