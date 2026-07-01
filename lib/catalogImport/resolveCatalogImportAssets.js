import { access, readFile } from 'fs/promises';
import path from 'path';
import { uploadMenuAssetFromBuffer } from '@/lib/storage/uploadMenuAssetServer';

const MIME_BY_EXT = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
};

function sanitizeAssetFilename(filename) {
  const base = path.basename(String(filename || '').trim());
  if (!base || base === '.' || base === '..') return '';
  if (base.includes('..') || base.includes('/') || base.includes('\\')) return '';
  return base;
}

export function resolveImportAssetsRoot(payload, slug) {
  const assets = payload?.assets && typeof payload.assets === 'object' ? payload.assets : {};
  const folder = String(assets.pasta || assets.folder || `catalog-seed/${slug}`)
    .trim()
    .replace(/\\/g, '/')
    .replace(/^\/+/, '');

  if (!folder || folder.includes('..')) {
    throw Object.assign(new Error('Pasta de imagens inválida em assets.pasta.'), { status: 400 });
  }

  return path.join(process.cwd(), 'public', ...folder.split('/'));
}

async function fileExists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function resolveImageFile(baseDir, subfolder, filename, upload, slug) {
  const safeName = sanitizeAssetFilename(filename);
  if (!safeName) return { url: '', found: false, warning: 'Nome de arquivo inválido.' };

  const candidates = [
    path.join(baseDir, subfolder, safeName),
    path.join(baseDir, safeName),
  ];

  for (const candidate of candidates) {
    if (!(await fileExists(candidate))) continue;
    const buffer = await readFile(candidate);
    const ext = path.extname(safeName).slice(1).toLowerCase();
    const mime = MIME_BY_EXT[ext] || 'image/jpeg';
    const url = await uploadMenuAssetFromBuffer(upload.supabase, slug, buffer, {
      folder: upload.folder,
      mime,
      ext: ext || 'jpg',
    });
    return { url, found: true };
  }

  return {
    url: '',
    found: false,
    warning: `Arquivo não encontrado: ${subfolder}/${safeName}`,
  };
}

async function applyImageRef(entity, subfolder, baseDir, upload, slug, stats) {
  if (!entity || typeof entity !== 'object') return entity;

  const next = { ...entity };
  const hasUrl = String(next.imagemUrl || '').trim();
  const arquivo = String(next.imagemArquivo || '').trim();

  if (!hasUrl && arquivo) {
    const result = await resolveImageFile(baseDir, subfolder, arquivo, upload, slug);
    if (result.url) {
      next.imagemUrl = result.url;
      stats.resolved += 1;
    } else {
      stats.missing += 1;
      if (result.warning) stats.warnings.push(result.warning);
    }
  }

  delete next.imagemArquivo;
  return next;
}

/**
 * Lê imagens de public/catalog-seed/{slug}/… e envia ao Storage.
 * No JSON use "imagemArquivo": "nome.jpg" ou "imagemUrl" com URL já pronta.
 */
export async function resolveCatalogImportAssets(supabase, slug, state, payload) {
  const baseDir = resolveImportAssetsRoot(payload, slug);
  const stats = { resolved: 0, missing: 0, warnings: [] };
  const upload = {
    supabase,
    folder: 'produtos',
  };

  const next = { ...state };

  if (Array.isArray(next.produtos)) {
    const resolved = [];
    for (const item of next.produtos) {
      resolved.push(await applyImageRef(item, 'produtos', baseDir, { ...upload, folder: 'produtos' }, slug, stats));
    }
    next.produtos = resolved;
  }

  if (Array.isArray(next.adicionaisItens)) {
    const resolved = [];
    for (const item of next.adicionaisItens) {
      resolved.push(
        await applyImageRef(item, 'adicionais', baseDir, { ...upload, folder: 'adicionais' }, slug, stats)
      );
    }
    next.adicionaisItens = resolved;
  }

  if (Array.isArray(next.marmitas)) {
    const resolved = [];
    for (const item of next.marmitas) {
      resolved.push(await applyImageRef(item, 'marmitas', baseDir, { ...upload, folder: 'marmitas' }, slug, stats));
    }
    next.marmitas = resolved;
  }

  const pizza = next.pizzaCardapio;
  if (pizza && typeof pizza === 'object') {
    const sabores = [];
    for (const item of pizza.sabores || []) {
      sabores.push(
        await applyImageRef(item, 'pizzas/sabores', baseDir, { ...upload, folder: 'pizza-sabores' }, slug, stats)
      );
    }
    const categorias = [];
    for (const item of pizza.categorias || []) {
      categorias.push(
        await applyImageRef(item, 'pizzas/categorias', baseDir, { ...upload, folder: 'pizza-categorias' }, slug, stats)
      );
    }
    next.pizzaCardapio = { ...pizza, sabores, categorias };
  }

  return { state: next, stats };
}

export function suggestImportImageFilename(nome, imagemUrl = '') {
  const fromUrl = String(imagemUrl || '').trim();
  if (fromUrl) {
    try {
      const pathname = new URL(fromUrl, 'http://local').pathname;
      const base = path.basename(pathname);
      if (base && base !== '/') return base;
    } catch {
      const base = path.basename(fromUrl.split('?')[0]);
      if (base) return base;
    }
  }

  const slug = String(nome || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return slug ? `${slug}.jpg` : '';
}
