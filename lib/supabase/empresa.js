import { createClient } from './client';
import { DEFAULT_ADMIN_DATA } from '@/lib/adminData';
import { getConfiguredDefaultSlug } from '@/lib/storeBoot';
import { normalizeSlug } from '@/lib/normalize';

export async function getEmpresaBySlug(slug) {
  const safeSlug = normalizeSlug(slug);
  if (!safeSlug) return null;
  const supabase = createClient();
  const { data, error } = await supabase
    .from('empresas')
    .select(
      'id, slug, nome, cor_marca, meta_pixel_id, chave_pix, descricao_chave_pix, exibir_pix_cardapio, latitude, longitude, telefone, cnpj, segmento, endereco_logradouro, endereco_numero, endereco_bairro, endereco_cidade, endereco_estado, endereco_cep'
    )
    .eq('slug', safeSlug)
    .maybeSingle();
  if (error) throw error;
  return data;
}

/** Resolve empresa_id a partir do slug da loja (Supabase). */
export async function resolveEmpresaIdFromStore(slug) {
  const safeSlug = String(slug || getConfiguredDefaultSlug() || DEFAULT_ADMIN_DATA.loja.slug || '')
    .trim()
    .toLowerCase();
  if (!safeSlug) return null;
  try {
    const empresa = await getEmpresaBySlug(safeSlug);
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
    exibirPixCardapio: empresa.exibir_pix_cardapio !== false && loja.exibirPixCardapio !== false,
    metaPixelId: empresa.meta_pixel_id ?? loja.metaPixelId ?? '',
    segmento: empresa.segmento ?? loja.segmento ?? '',
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
      'id, slug, nome, cor_marca, meta_pixel_id, chave_pix, descricao_chave_pix, exibir_pix_cardapio'
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
    aberta: loja.aberta !== false,
    cor_marca: loja.corMarca,
    chave_pix: loja.chavePix || null,
    descricao_chave_pix: loja.descricaoChavePix || null,
    exibir_pix_cardapio: loja.exibirPixCardapio !== false,
    telefone: loja.telefone || null,
    cnpj: loja.documentoFiscal || null,
    segmento: loja.segmento || null,
    endereco_logradouro: loja.enderecoLogradouro || null,
    endereco_numero: loja.enderecoNumero || null,
    endereco_bairro: loja.enderecoBairro || null,
    endereco_cidade: loja.enderecoCidade || null,
    endereco_estado: loja.enderecoEstado || null,
    endereco_cep: loja.enderecoCep || null,
  };
}
