import { createClient } from './client';
import { ADMIN_STORAGE_KEY } from '@/lib/adminData';

function normalizeSlug(slug) {
  return String(slug || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-');
}

export async function getEmpresaBySlug(slug) {
  const safeSlug = normalizeSlug(slug);
  if (!safeSlug) return null;
  const supabase = createClient();
  const { data, error } = await supabase
    .from('empresas')
    .select(
      'id, slug, nome, cor_marca, meta_pixel_id, chave_pix, descricao_chave_pix, latitude, longitude, telefone, cnpj, endereco_logradouro, endereco_numero, endereco_bairro, endereco_cidade, endereco_estado, endereco_cep'
    )
    .eq('slug', safeSlug)
    .maybeSingle();
  if (error) throw error;
  return data;
}

/** Resolve empresa_id a partir do slug salvo no estado admin (browser). */
export async function resolveEmpresaIdFromStore() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(ADMIN_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const slug = parsed?.loja?.slug;
    if (!slug) return null;
    const empresa = await getEmpresaBySlug(slug);
    return empresa?.id || null;
  } catch {
    return null;
  }
}

export async function resolveEmpresaId(slug) {
  if (slug) {
    const empresa = await getEmpresaBySlug(slug);
    return empresa?.id || null;
  }
  return resolveEmpresaIdFromStore();
}

/** Mescla campos da empresa (Supabase) sobre o objeto loja do admin. */
export function mergeEmpresaIntoLoja(loja, empresa) {
  if (!loja) return loja;
  if (!empresa) return loja;
  return {
    ...loja,
    paletteColors: loja.paletteColors ?? [],
    paletteLogoUrl: loja.paletteLogoUrl ?? '',
    corMarca: empresa.cor_marca || loja.corMarca,
    chavePix: empresa.chave_pix ?? loja.chavePix ?? '',
    descricaoChavePix: empresa.descricao_chave_pix ?? loja.descricaoChavePix ?? '',
    metaPixelId: empresa.meta_pixel_id ?? loja.metaPixelId ?? '',
    telefone: empresa.telefone ?? loja.telefone ?? '',
    documentoFiscal: empresa.cnpj ?? loja.documentoFiscal ?? '',
    enderecoLogradouro: empresa.endereco_logradouro ?? loja.enderecoLogradouro ?? '',
    enderecoNumero: empresa.endereco_numero ?? loja.enderecoNumero ?? '',
    enderecoBairro: empresa.endereco_bairro ?? loja.enderecoBairro ?? '',
    enderecoCidade: empresa.endereco_cidade ?? loja.enderecoCidade ?? '',
    enderecoEstado: empresa.endereco_estado ?? loja.enderecoEstado ?? '',
    enderecoCep: empresa.endereco_cep ?? loja.enderecoCep ?? '',
  };
}

export async function updateEmpresaBySlug(slug, patch) {
  const safeSlug = normalizeSlug(slug);
  if (!safeSlug) throw new Error('Slug invalido.');
  const supabase = createClient();
  const { data, error } = await supabase
    .from('empresas')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('slug', safeSlug)
    .select(
      'id, slug, nome, cor_marca, meta_pixel_id, chave_pix, descricao_chave_pix'
    )
    .single();
  if (error) throw error;
  return data;
}

export async function updateEmpresaCoordinatesBySlug(slug, { latitude, longitude }) {
  const safeSlug = normalizeSlug(slug);
  if (!safeSlug) throw new Error('Slug inválido.');
  const supabase = createClient();
  const { error } = await supabase
    .from('empresas')
    .update({
      latitude,
      longitude,
      updated_at: new Date().toISOString(),
    })
    .eq('slug', safeSlug);
  if (error) throw error;
}

export function lojaPatchToEmpresa(loja) {
  return {
    cor_marca: loja.corMarca,
    chave_pix: loja.chavePix || null,
    descricao_chave_pix: loja.descricaoChavePix || null,
    telefone: loja.telefone || null,
    cnpj: loja.documentoFiscal || null,
    endereco_logradouro: loja.enderecoLogradouro || null,
    endereco_numero: loja.enderecoNumero || null,
    endereco_bairro: loja.enderecoBairro || null,
    endereco_cidade: loja.enderecoCidade || null,
    endereco_estado: loja.enderecoEstado || null,
    endereco_cep: loja.enderecoCep || null,
  };
}
