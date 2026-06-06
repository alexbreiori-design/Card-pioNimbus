import { normalizeSlug } from '@/lib/normalize';

export async function buildStoreBackup(supabase, slug) {
  const safeSlug = normalizeSlug(slug);
  if (!safeSlug) {
    throw Object.assign(new Error('Slug inválido.'), { status: 400 });
  }

  const { data: empresa, error: empresaError } = await supabase
    .from('empresas')
    .select(
      'id, slug, nome, telefone, email, segmento, aberta, suspensa, created_at, data_go_live, contrato_inicio, contrato_fim'
    )
    .eq('slug', safeSlug)
    .maybeSingle();
  if (empresaError) throw empresaError;
  if (!empresa?.id) {
    throw Object.assign(new Error('Loja não encontrada.'), { status: 404 });
  }

  const [
    { data: catalogRow },
    { data: clientes, error: clientesError },
    { data: enderecos, error: enderecosError },
    { data: pedidos, error: pedidosError },
  ] = await Promise.all([
    supabase.from('menu_store_state').select('slug, data, updated_at').eq('slug', safeSlug).maybeSingle(),
    supabase
      .from('clientes')
      .select('id, nome, telefone, total_pedidos, total_gasto, ultimo_pedido_em, created_at, updated_at')
      .eq('empresa_id', empresa.id)
      .order('created_at', { ascending: true }),
    supabase
      .from('cliente_enderecos')
      .select('id, cliente_id, cep, rua, numero, bairro, cidade, estado, complemento, referencia, principal')
      .eq('empresa_id', empresa.id)
      .order('created_at', { ascending: true }),
    supabase
      .from('pedidos')
      .select('*')
      .eq('empresa_id', empresa.id)
      .order('created_at', { ascending: true }),
  ]);

  if (clientesError) throw clientesError;
  if (enderecosError) throw enderecosError;
  if (pedidosError) throw pedidosError;

  const catalog = catalogRow?.data || {};
  const exportedAt = new Date().toISOString();

  return {
    meta: {
      version: 1,
      exportedAt,
      slug: empresa.slug,
      empresaId: empresa.id,
    },
    empresa: {
      slug: empresa.slug,
      nome: empresa.nome,
      telefone: empresa.telefone,
      email: empresa.email,
      segmento: empresa.segmento,
      aberta: empresa.aberta,
      suspensa: empresa.suspensa,
      created_at: empresa.created_at,
      data_go_live: empresa.data_go_live,
      contrato_inicio: empresa.contrato_inicio,
      contrato_fim: empresa.contrato_fim,
    },
    catalog: {
      updated_at: catalogRow?.updated_at || null,
      loja: catalog.loja || null,
      categorias: catalog.categorias || [],
      produtos: catalog.produtos || [],
      adicionais: catalog.adicionais || [],
      grupos_adicionais: catalog.grupos_adicionais || catalog.gruposAdicionais || [],
      cupons: catalog.cupons || [],
      zonas_entrega: catalog.zonas_entrega || catalog.zonasEntrega || [],
    },
    clientes: clientes || [],
    cliente_enderecos: enderecos || [],
    pedidos: pedidos || [],
  };
}
